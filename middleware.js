/**
 * Edge gate for the control room.
 *
 * The admin UI checks a passphrase in the browser, which is fine for a single
 * operator on a laptop and not enough on a public domain: anyone can load the
 * bundle and take their time with it. This middleware puts a server-side door
 * in front of `/admin` before a single byte of the app is served.
 *
 * Set both environment variables in the hosting project and the door closes:
 *
 *   ADMIN_GATE_USER   e.g. newsroom
 *   ADMIN_GATE_PASS   a long random string (not the panel passphrase)
 *
 * Without them the route still resolves — the panel's own passphrase and
 * second factor still apply — but the edge gate reports itself as unset at
 * `GET /admin-gate` so the operator can see the difference.
 *
 * ── Why this file never calls fetch() ────────────────────────────────────────
 * Routing Middleware runs *before* routing. `fetch(request)` on the same URL
 * sends the request back through the matcher, which runs this function again,
 * which fetches again — until Vercel's proxy gives up with a 508
 * INFINITE_LOOP_DETECTED. To pass a request through, return `next()` (from
 * `@vercel/functions`): it hands the request to the rest of the pipeline
 * without leaving the edge handler, and it can still attach response headers.
 */

import { next } from '@vercel/functions';

const REALM = 'NewsPulse 24 editorial control room';

const constantTimeEqual = (a, b) => {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
};

/** Headers every /admin response carries, including the 401. */
const lockHeaders = (extra = {}) => ({
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store, max-age=0',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  ...extra,
});

const deny = (extra = {}) =>
  new Response('Authentication required', {
    status: 401,
    headers: lockHeaders({
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      ...extra,
    }),
  });

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // The panel reads this to show whether the server-side door is armed.
  if (pathname === '/admin-gate') {
    const configured = Boolean(process.env.ADMIN_GATE_USER && process.env.ADMIN_GATE_PASS);
    return new Response(JSON.stringify({ configured }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        ...lockHeaders(),
      },
    });
  }

  const user = process.env.ADMIN_GATE_USER;
  const pass = process.env.ADMIN_GATE_PASS;

  // Not configured: let the request continue to the app. Explicitly flagged so
  // the response says why the door is open.
  if (!user || !pass) {
    return next({ headers: lockHeaders({ 'X-Admin-Gate': 'unset' }) });
  }

  const header = request.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('basic ')) {
    let decoded = '';
    try {
      decoded = atob(header.slice(6));
    } catch {
      // Malformed base64 is just a failed attempt, not an error.
      return deny({ 'X-Admin-Gate': 'malformed' });
    }
    const index = decoded.indexOf(':');
    const givenUser = index >= 0 ? decoded.slice(0, index) : '';
    const givenPass = index >= 0 ? decoded.slice(index + 1) : '';

    if (constantTimeEqual(givenUser, user) && constantTimeEqual(givenPass, pass)) {
      // Continue the pipeline — this is the line that used to be `fetch(request)`.
      return next({ headers: lockHeaders({ 'X-Admin-Gate': 'passed' }) });
    }
    return deny({ 'X-Admin-Gate': 'rejected' });
  }

  return deny({ 'X-Admin-Gate': 'missing' });
}

export const config = {
  // `/admin` and everything under it, plus the status endpoint the panel polls.
  matcher: ['/admin', '/admin/:path*', '/admin-gate'],
};
