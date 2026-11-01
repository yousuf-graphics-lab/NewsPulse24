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
 */

const REALM = 'NewsPulse 24 editorial control room';

const constantTimeEqual = (a, b) => {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
};

const lockHeaders = (headers = new Headers()) => {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'no-referrer');
  return headers;
};

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/admin-gate') {
    const configured = Boolean(process.env.ADMIN_GATE_USER && process.env.ADMIN_GATE_PASS);
    return new Response(JSON.stringify({ configured }), {
      status: 200,
      headers: lockHeaders(new Headers({ 'content-type': 'application/json' })),
    });
  }

  const user = process.env.ADMIN_GATE_USER;
  const pass = process.env.ADMIN_GATE_PASS;

  if (!user || !pass) {
    const headers = lockHeaders();
    headers.set('X-Admin-Gate', 'unset');
    return fetch(request).then((response) => {
      const merged = new Headers(response.headers);
      for (const [key, value] of headers.entries()) merged.set(key, value);
      return new Response(response.body, { status: response.status, headers: merged });
    });
  }

  const header = request.headers.get('authorization') || '';
  if (header.toLowerCase().startsWith('basic ')) {
    let decoded = '';
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = '';
    }
    const index = decoded.indexOf(':');
    const givenUser = index >= 0 ? decoded.slice(0, index) : '';
    const givenPass = index >= 0 ? decoded.slice(index + 1) : '';
    if (constantTimeEqual(givenUser, user) && constantTimeEqual(givenPass, pass)) {
      const response = await fetch(request);
      const merged = new Headers(response.headers);
      for (const [key, value] of lockHeaders().entries()) merged.set(key, value);
      merged.set('X-Admin-Gate', 'passed');
      return new Response(response.body, { status: response.status, headers: merged });
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: lockHeaders(new Headers({ 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` })),
  });
}

export const config = {
  matcher: ['/admin', '/admin/', '/admin/:path*', '/admin-gate'],
};
