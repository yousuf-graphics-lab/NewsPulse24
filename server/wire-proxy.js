/**
 * Shared feed-fetch core for the wire agent.
 *
 * Browsers cannot read most publishers' RSS/Atom feeds (no CORS headers), so
 * the agent asks a proxy for them. This module is that proxy's brain and is
 * used by two hosts:
 *
 *   - `api/wire.js`            Vercel serverless function (production)
 *   - `scripts/vite-wire.mjs`  dev + `vite preview` middleware (local / preview)
 *
 * Contract: one absolute http(s) URL in, one feed body out.
 *
 * Guard rails: http(s) only, private / link-local / loopback hosts blocked
 * (SSRF) unless the caller explicitly allows loops (local development), 12 s
 * timeout, 1.5 MB body cap, XML or JSON only, no caller headers, no cookies.
 */

/** Loopback, link-local, private ranges and friends — never proxied. */
const isPrivateHost = (hostname) => {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === 'localhost.localdomain') return true;
  if (/\.(localhost|local|internal|home\.arpa)$/.test(host)) return true;
  if (host === 'metadata.google.internal') return true;
  if (host === '::1' || host === '::' || host === '0.0.0.0') return true;
  if (/^::ffff:(127\.|10\.|192\.168\.|169\.254\.)/i.test(host)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true; // unique-local IPv6
  if (/^fe80:/i.test(host)) return true; // IPv6 link-local

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a >= 224) return true;
  }
  // A single-label host can only resolve internally in practice.
  if (!host.includes('.') && !host.includes(':')) return true;
  return false;
};

const ACCEPTED_TYPE = /(xml|rss|atom|json|text\/plain|octet-stream)/i;

const FEED_ACCEPT =
  'application/rss+xml, application/atom+xml, application/rdf+xml, application/xml, text/xml, application/feed+json, application/json;q=0.9, text/html;q=0.6, */*;q=0.5';

export const MAX_BYTES = 1_500_000;

/* --------------------------------------------------------------- guardrails */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 90;
const buckets = new Map();

/**
 * Per-caller token bucket. The proxy is public by nature — it has to be, since
 * the browser calls it — so the defence is a ceiling per IP, a hard cap on
 * concurrent work per process, and an optional host allowlist.
 */
export const allowRequest = (ip, { max = RATE_MAX, windowMs = RATE_WINDOW_MS } = {}) => {
  const key = String(ip || 'anon');
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((at) => now - at < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 1000) buckets.clear();
  return recent.length <= max;
};

/** WIRE_ALLOWED_HOSTS=a.example,b.example restricts the proxy to those hosts. */
export const hostAllowed = (hostname) => {
  const list = String(process.env.WIRE_ALLOWED_HOSTS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return true;
  const host = String(hostname || '').toLowerCase();
  return list.some((entry) => host === entry || host.endsWith(`.${entry}`));
};

/** CORS for a same-origin browser client only — no third-party relay use. */
export const applyCors = (req, res) => {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (origin && host) {
    try {
      if (new URL(origin).host === host) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    } catch {
      /* malformed origin — send no CORS header at all */
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
};

export { isPrivateHost };

export const isAllowedUrl = (raw, { allowLocal = false } = {}) => {
  let target;
  try {
    target = new URL(raw);
  } catch {
    return { ok: false, reason: 'not a valid absolute URL' };
  }
  if (!/^https?:$/.test(target.protocol)) {
    return { ok: false, reason: 'only http(s) URLs are allowed' };
  }
  if (!allowLocal && isPrivateHost(target.hostname)) {
    return { ok: false, reason: 'that host is not allowed' };
  }
  return { ok: true, target };
};

/** True when the body looks like a feed rather than an HTML error page. */
export const looksLikeFeed = (body) => {
  const head = String(body || '').slice(0, 400).toLowerCase();
  if (!head) return false;
  if (head.startsWith('{') || head.startsWith('[')) return true;
  return head.includes('<rss') || head.includes('<feed') || head.includes('<rdf:rdf') || head.includes('<?xml');
};

/**
 * Fetch one URL with the guard rails applied.
 * Never throws: always resolves `{ ok, body }` or `{ ok:false, status, error }`.
 */
export const fetchWire = async (
  raw,
  { allowLocal = false, timeoutMs = 12_000, accept = FEED_ACCEPT } = {},
) => {
  if (String(raw).length > 2048) return { ok: false, status: 414, error: 'that URL is too long' };
  const check = isAllowedUrl(raw, { allowLocal });
  if (!check.ok) return { ok: false, status: 400, error: check.reason };
  if (!allowLocal && !hostAllowed(check.target.hostname)) {
    return { ok: false, status: 403, error: 'that publisher is not on the proxy allowlist' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(check.target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        accept,
        'user-agent': 'Mozilla/5.0 (compatible; NewsPulse24Wire/1.0; +https://newspulse24.com)',
      },
    });

    if (!upstream.ok) {
      return {
        ok: false,
        status: 502,
        error: `source responded ${upstream.status}${upstream.status === 403 ? ' (blocked)' : ''}`,
      };
    }

    const type = (upstream.headers.get('content-type') || '').toLowerCase();
    const reader = upstream.body?.getReader?.();
    let body = '';

    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          reader.cancel().catch(() => {});
          return { ok: false, status: 413, error: 'source is too large' };
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } else {
      body = await upstream.text();
      if (body.length > MAX_BYTES) return { ok: false, status: 413, error: 'source is too large' };
    }

    if (type && !ACCEPTED_TYPE.test(type) && !looksLikeFeed(body)) {
      return { ok: false, status: 415, error: `unsupported type ${type.split(';')[0]}` };
    }
    if (!looksLikeFeed(body)) {
      return { ok: false, status: 422, error: 'that URL returned a web page, not a feed' };
    }

    return {
      ok: true,
      body,
      type,
      status: 200,
      finalUrl: upstream.url || check.target.toString(),
    };
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? 'the source timed out' : 'the source could not be reached',
    };
  } finally {
    clearTimeout(timer);
  }
};
