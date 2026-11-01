/**
 * Feed fetcher for the wire agent (Vercel serverless function).
 *
 *   GET /api/wire?url=<encoded absolute feed URL>
 *
 * Returns the upstream feed body (RSS, Atom, RDF or JSON) with a short cache,
 * or `{ error }` with an honest status. The guard rails live in
 * `server/wire-proxy.js` so the same logic can run under `vite preview` and in
 * tests.
 */
import { fetchWire } from '../server/wire-proxy.js';

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

  const result = await fetchWire(raw, { allowLocal: false, timeoutMs: 12_000 });

  if (!result.ok) {
    res.status(result.status || 502).json({ error: result.error || 'fetch failed' });
    return;
  }

  res.setHeader('Content-Type', /json/i.test(result.type || '') ? 'application/json; charset=utf-8' : 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Wire-Source', result.finalUrl || '');
  res.status(200).send(result.body);
}
