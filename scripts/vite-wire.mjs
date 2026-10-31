/**
 * Serves `/api/wire` during `vite dev` and `vite preview`.
 *
 * In production that route is the serverless function in `api/wire.js`; this
 * plugin gives local runs (and the hosted preview) the same endpoint so the
 * wire agent can actually collect feeds without a deploy. It talks to the same
 * `server/wire-proxy.js` core, and because it is a local development tool it
 * also permits loopback hosts so fixtures served from `http://127.0.0.1` work.
 */
import { fetchWire } from '../server/wire-proxy.js';

const handle = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const target = url.searchParams.get('url');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (!target) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Missing ?url=' }));
    return;
  }

  const result = await fetchWire(target, { allowLocal: true, timeoutMs: 12_000 });
  if (!result.ok) {
    res.statusCode = result.status || 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: result.error || 'fetch failed' }));
    return;
  }

  res.statusCode = 200;
  res.setHeader(
    'Content-Type',
    /json/i.test(result.type || '') ? 'application/json; charset=utf-8' : 'application/rss+xml; charset=utf-8',
  );
  res.end(result.body);
};

const middleware = () => (req, res, next) => {
  if (!req.url || !req.url.startsWith('/api/wire')) return next();
  handle(req, res).catch((error) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: String(error?.message || error) }));
  });
};

export default function wireProxy() {
  return {
    name: 'newspulse24-wire-proxy',
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}
