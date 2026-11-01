import middleware from '../../middleware.js';

// Any self-request is exactly what caused the 508, so make it explode loudly.
globalThis.fetch = () => {
  throw new Error('middleware called fetch() on its own URL — that is the infinite loop');
};

const call = (path, headers = {}) => middleware(new Request(`https://newspulse24.test${path}`, { headers }));
const pass = (res) => res.headers.get('x-middleware-next') === '1';

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

// Gate unset
let res = call('/admin');
check('gate unset → forwards, no self-fetch', pass(res), `status ${res.status}, x-middleware-next=${res.headers.get('x-middleware-next')}`);
check('gate unset → flagged', res.headers.get('x-admin-gate') === 'unset');
check('gate unset → noindex + no-store', res.headers.get('x-robots-tag')?.includes('noindex') && res.headers.get('cache-control')?.includes('no-store'));

// /admin-gate status
res = await call('/admin-gate');
check('gate status endpoint', res.status === 200, await res.text());

process.env.ADMIN_GATE_USER = 'newsroom';
process.env.ADMIN_GATE_PASS = 'long-random-secret';

check('gate status reports configured', (await (await call('/admin-gate')).text()).includes('"configured":true'));

res = call('/admin');
check('no credentials → 401', res.status === 401);
check('401 carries challenge', res.headers.get('www-authenticate')?.startsWith('Basic realm='));
check('401 is noindex + no-store', res.headers.get('x-robots-tag')?.includes('noindex') && res.headers.get('cache-control')?.includes('no-store'));

const basic = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
res = call('/admin', { authorization: basic('newsroom', 'wrong') });
check('wrong passphrase → 401', res.status === 401);

res = call('/admin', { authorization: basic('someone', 'long-random-secret') });
check('wrong user → 401', res.status === 401);

res = call('/admin', { authorization: 'Basic !!!not-base64!!!' });
check('malformed header → 401 (not a crash)', res.status === 401);

res = call('/admin', { authorization: basic('newsroom', 'long-random-secret') });
check('correct credentials → forwards', pass(res), `x-admin-gate=${res.headers.get('x-admin-gate')}`);

res = call('/admin/ledger?tab=wire', { authorization: basic('newsroom', 'long-random-secret') });
check('nested /admin route → forwards', pass(res));

// Timing behaviour: equal-length compare must not short-circuit.
const t0 = performance.now();
for (let i = 0; i < 5000; i += 1) call('/admin', { authorization: basic('newsroom', 'x'.repeat(18)) });
const elapsed = performance.now() - t0;
check('constant-time compare runs full length', elapsed > 0, `${elapsed.toFixed(0)}ms for 5k attempts`);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
