/**
 * Feed fetcher for the wire agent.
 *
 * Browsers cannot read most publishers' RSS/Atom feeds directly because the
 * feeds do not send CORS headers. This function proxies a single GET so the
 * editorial agent can read them in the admin panel.
 *
 * Contract:  GET /api/wire?url=<encoded absolute feed URL>
 * Returns:   the upstream body (XML, Atom, RSS or JSON) with a short cache.
 *
 * Guard rails: http(s) only, private/link-local hosts blocked (SSRF), 12 second
 * timeout, 1.5 MB body cap, and only XML/JSON content types are accepted.
 * No cookies or caller-supplied headers are forwarded.
 */

const BLOCKED_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|::1|.*\.local|.*\.internal|.*\.localhost)$/i;

const ACCEPTED_TYPE = /(xml|rss|atom|json|text\/plain)/i;

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  res.setHeader('Vary', 'Origin');
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'GET only' });
    return;
  }

  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'Missing ?url=' });
    return;
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    res.status(400).json({ error: 'Not a valid absolute URL' });
    return;
  }
  if (!/^https?:$/.test(target.protocol) || BLOCKED_HOST.test(target.hostname)) {
    res.status(400).json({ error: 'That host is not allowed' });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept:
          'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5',
        'user-agent': 'NewsPulse24Wire/1.0 (+https://newspulse24.com)',
      },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Upstream responded ${upstream.status}` });
      return;
    }

    const type = upstream.headers.get('content-type') || '';
    if (type && !ACCEPTED_TYPE.test(type)) {
      res.status(415).json({ error: `Unsupported upstream type: ${type}` });
      return;
    }

    const body = await upstream.text();
    if (body.length > 1_500_000) {
      res.status(413).json({ error: 'Feed larger than 1.5 MB' });
      return;
    }

    res.setHeader('Content-Type', type || 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(body);
  } catch (error) {
    const reason = error.name === 'AbortError' ? 'Upstream timed out' : 'Upstream fetch failed';
    res.status(504).json({ error: reason });
  } finally {
    clearTimeout(timeout);
  }
}
