/**
 * Admin credential verification and session handling.
 *
 * The panel is a static front-end, so there is no server to authenticate
 * against. What we can do — and do here — is make sure the browser never holds
 * a usable secret:
 *
 *  - The password is never stored, in any form other than a PBKDF2-SHA-256
 *    digest (310 000 iterations, per-credential salt, pepper).
 *  - The username is stored the same way, as a salted SHA-256 digest.
 *  - Comparisons are constant-time so a wrong guess cannot be timed.
 *  - Five failed attempts lock the form with exponential back-off.
 *  - Sessions live in `sessionStorage`, carry a random 256-bit token, expire
 *    after 20 minutes of inactivity and 8 hours absolute.
 *
 * IMPORTANT: this is client-side gating. Anyone who can read the bundle can
 * bypass the UI check, so the panel is only as private as the machine it runs
 * on. Real multi-user publishing needs a server (or an auth provider) and a
 * database — see "Admin panel" in the README.
 */

import {
  generateSecret,
  newSalt,
  openSecret,
  otpauthUri,
  sealSecret,
  verifyTotp,
} from './totp';

const PW_ITERATIONS = 310_000;
const PW_PEPPER = 'newspulse24:admin:';
const PW_SALT = '42548568006d1b68146fe180e1294876';
const PW_HASH = '67e0b7cd5893df1e00cc23c679f8b9365a5a219cb44dcf26075bbc581259886b';
const USER_SALT = '081c288ee15cdc97a6b35b8238a52448';
const USER_HASH = '2b9242d6fb41583790a02eb53517480d951dfeda74bf550af155de3c7e9d1bb8';

const SESSION_KEY = 'newspulse24:admin:session';
const GUARD_KEY = 'newspulse24:admin:guard';
const CRED_KEY = 'newspulse24:admin:credentials';
const TWOFA_KEY = 'newspulse24:admin:2fa';
const SIGNAL_CHANNEL = 'newspulse24:admin:signal';
const PENDING_KEY = 'newspulse24:admin:2fa:pending';

export const SESSION_IDLE_MS = 20 * 60 * 1000;
export const SESSION_MAX_MS = 8 * 60 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage && !!window.localStorage;
  } catch {
    return false;
  }
};

const safeGet = (store, key) => {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (store, key, value) => {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeRemove = (store, key) => {
  try {
    store.removeItem(key);
  } catch {
    /* storage blocked — nothing to clean up */
  }
};

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/** Length-independent, constant-time string comparison. */
const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
};

export const isCryptoAvailable = () =>
  typeof window !== 'undefined' && !!window.crypto?.subtle && !!window.crypto?.getRandomValues;

const normaliseUsername = (value) => String(value || '').normalize('NFKC').trim();

const pbkdf2Hex = async (password, saltHex, iterations) => {
  const key = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`${PW_PEPPER}${password}`),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex),
      iterations,
      hash: 'SHA-256',
    },
    key,
    256,
  );
  return toHex(bits);
};

const usernameDigest = async (username, saltHex) => {
  const data = new TextEncoder().encode(`${normaliseUsername(username)}:${saltHex}`);
  return toHex(await window.crypto.subtle.digest('SHA-256', data));
};

/* ---------------------------------------------------------------- credentials */

/** A password changed from the Security tab is stored locally, hash-only. */
const readLocalCredentials = () => {
  if (!canUseStorage()) return null;
  const raw = safeGet(window.localStorage, CRED_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.salt || !parsed?.hash || !parsed?.iterations) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const isUsingCustomPassword = () => !!readLocalCredentials();

const activePasswordSource = () =>
  readLocalCredentials() || { salt: PW_SALT, hash: PW_HASH, iterations: PW_ITERATIONS };

export const verifyCredentials = async (username, password) => {
  if (!isCryptoAvailable()) {
    return { ok: false, reason: 'unsupported' };
  }
  const [userHash, { salt, hash, iterations }] = await Promise.all([
    usernameDigest(username, USER_SALT),
    Promise.resolve(activePasswordSource()),
  ]);
  const pwHash = await pbkdf2Hex(String(password || ''), salt, iterations);

  // Evaluate both halves even when the username is wrong.
  const userOk = timingSafeEqual(userHash, USER_HASH);
  const passOk = timingSafeEqual(pwHash, hash);
  if (!userOk || !passOk) return { ok: false, reason: 'invalid' };
  return { ok: true };
};

/** Re-checks a passphrase without touching the session — used to gate risky actions. */
export const verifyPassword = async (password) => {
  if (!isCryptoAvailable()) return false;
  const source = activePasswordSource();
  const candidate = await pbkdf2Hex(String(password || ''), source.salt, source.iterations);
  return timingSafeEqual(candidate, source.hash);
};

export const changePassword = async (currentPassword, nextPassword) => {
  if (!isCryptoAvailable()) return { ok: false, reason: 'unsupported' };
  const source = activePasswordSource();
  const currentHash = await pbkdf2Hex(String(currentPassword || ''), source.salt, source.iterations);
  if (!timingSafeEqual(currentHash, source.hash)) return { ok: false, reason: 'invalid' };

  // The TOTP secret is sealed with the passphrase: re-seal it, or 2FA dies with
  // the rotation. Requires the old passphrase, which the caller has just proved.
  let resealed = null;
  const sealed = readTwoFactor();
  if (sealed) {
    try {
      const secret = await openSecret(String(currentPassword), sealed);
      resealed = await sealSecret(String(nextPassword), secret, newSalt());
    } catch {
      return { ok: false, reason: 'two-factor' };
    }
  }

  const salt = toHex(window.crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2Hex(String(nextPassword), salt, PW_ITERATIONS);
  const saved = safeSet(
    window.localStorage,
    CRED_KEY,
    JSON.stringify({ salt, hash, iterations: PW_ITERATIONS, updatedAt: new Date().toISOString() }),
  );
  if (!saved) return { ok: false, reason: 'storage' };
  if (resealed) safeSet(window.localStorage, TWOFA_KEY, JSON.stringify(resealed));
  return { ok: true, resealed: !!resealed };
};

export const resetPasswordToDefault = () => {
  if (!canUseStorage()) return;
  safeRemove(window.localStorage, CRED_KEY);
  // Without the passphrase the sealed 2FA secret is unrecoverable, so the
  // authenticator enrolment is cleared with the reset.
  safeRemove(window.localStorage, TWOFA_KEY);
  safeRemove(window.sessionStorage, PENDING_KEY);
};

/* --------------------------------------------------------------- two-factor */

export const twoFactorAvailable = () =>
  typeof window !== 'undefined' && !!window.crypto?.subtle;

const readTwoFactor = () => {
  if (!canUseStorage()) return null;
  const raw = safeGet(window.localStorage, TWOFA_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.cipher && parsed?.salt && parsed?.iv ? parsed : null;
  } catch {
    return null;
  }
};

export const twoFactorEnrolled = () => !!readTwoFactor();

export const twoFactorEnrolledAt = () => {
  try {
    return JSON.parse(safeGet(window.localStorage, TWOFA_KEY) || '{}').createdAt || null;
  } catch {
    return null;
  }
};

/**
 * Step one of enrolment: prove the passphrase, then hand back a fresh secret
 * and its otpauth URI. Nothing is stored until a code has been verified.
 */
export const startTwoFactorEnrolment = async (password) => {
  if (!isCryptoAvailable()) return { ok: false, reason: 'unsupported' };
  if (!(await verifyPassword(password))) return { ok: false, reason: 'invalid' };
  const secret = generateSecret();
  const salt = newSalt();
  safeSet(
    window.sessionStorage,
    PENDING_KEY,
    JSON.stringify({ secret, salt, createdAt: Date.now() }),
  );
  return { ok: true, secret, uri: otpauthUri({ secret }) };
};

export const pendingTwoFactor = () => {
  try {
    const parsed = JSON.parse(safeGet(window.sessionStorage, PENDING_KEY) || 'null');
    if (!parsed?.secret) return null;
    if (Date.now() - parsed.createdAt > 15 * 60_000) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const confirmTwoFactor = async (password, code) => {
  const pending = pendingTwoFactor();
  if (!pending) return { ok: false, reason: 'expired' };
  if (!(await verifyPassword(password))) return { ok: false, reason: 'invalid' };
  if (!(await verifyTotp(pending.secret, code))) return { ok: false, reason: 'code' };
  const sealed = await sealSecret(String(password), pending.secret, pending.salt);
  const saved = safeSet(
    window.localStorage,
    TWOFA_KEY,
    JSON.stringify({ ...sealed, createdAt: new Date().toISOString() }),
  );
  safeRemove(window.sessionStorage, PENDING_KEY);
  return saved ? { ok: true } : { ok: false, reason: 'storage' };
};

/** Second step of sign-in: passphrase opens the secret, the code proves possession. */
export const verifySecondFactor = async (password, code) => {
  const sealed = readTwoFactor();
  if (!sealed) return { ok: true, skipped: true };
  try {
    const secret = await openSecret(String(password), sealed);
    if (!(await verifyTotp(secret, code))) return { ok: false, reason: 'code' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'passphrase' };
  }
};

export const disableTwoFactor = async (password) => {
  if (!(await verifyPassword(password))) return { ok: false, reason: 'invalid' };
  safeRemove(window.localStorage, TWOFA_KEY);
  safeRemove(window.sessionStorage, PENDING_KEY);
  return { ok: true };
};

/* ------------------------------------------------------------------- signals */

const TAB_ID = `tab-${Math.random().toString(36).slice(2, 10)}`;

/** Tells every other open control-room tab to drop its session. */
export const broadcastSignOut = () => {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SIGNAL_CHANNEL);
    channel.postMessage({ type: 'sign-out', from: TAB_ID, at: Date.now() });
    channel.close();
  } catch {
    /* no channel support — sessions still expire on their own */
  }
};

export const onRemoteSignOut = (handler) => {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(SIGNAL_CHANNEL);
  channel.onmessage = (event) => {
    // Other channels in this same document also receive the message — ignore ours.
    if (event.data?.type === 'sign-out' && event.data.from !== TAB_ID) handler();
  };
  return () => channel.close();
};

/* -------------------------------------------------------------------- guard */

const readGuard = () => {
  if (!canUseStorage()) return { fails: 0, lockedUntil: 0 };
  try {
    const parsed = JSON.parse(safeGet(window.localStorage, GUARD_KEY) || '{}');
    return {
      fails: Number(parsed.fails) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { fails: 0, lockedUntil: 0 };
  }
};

const writeGuard = (next) => {
  if (!canUseStorage()) return;
  safeSet(window.localStorage, GUARD_KEY, JSON.stringify(next));
};

/** Remaining lock time in milliseconds. */
export const lockRemaining = () => Math.max(0, readGuard().lockedUntil - Date.now());

export const failedAttempts = () => readGuard().fails;

export const registerFailure = () => {
  const guard = readGuard();
  const fails = guard.fails + 1;
  let lockedUntil = guard.lockedUntil;
  if (fails >= MAX_ATTEMPTS) {
    // 30s, 60s, 2m, 4m … capped at 15 minutes.
    const penalty = Math.min(30_000 * 2 ** (fails - MAX_ATTEMPTS), 15 * 60_000);
    lockedUntil = Date.now() + penalty;
  }
  writeGuard({ fails, lockedUntil });
  return { fails, lockedUntil };
};

export const clearFailures = () => writeGuard({ fails: 0, lockedUntil: 0 });

/* ------------------------------------------------------------------ session */

const newToken = () =>
  toHex(window.crypto.getRandomValues(new Uint8Array(32)));

export const createSession = () => {
  if (!canUseStorage() || !isCryptoAvailable()) return null;
  const now = Date.now();
  const session = {
    token: newToken(),
    issuedAt: now,
    lastActive: now,
    expiresAt: Math.min(now + SESSION_IDLE_MS, now + SESSION_MAX_MS),
    absoluteExpiry: now + SESSION_MAX_MS,
  };
  safeSet(window.sessionStorage, SESSION_KEY, JSON.stringify(session));
  clearFailures();
  return session;
};

export const readSession = () => {
  if (!canUseStorage()) return null;
  const raw = safeGet(window.sessionStorage, SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    const now = Date.now();
    if (!session?.token || now > session.expiresAt || now > session.absoluteExpiry) {
      safeRemove(window.sessionStorage, SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

/** Sliding idle expiry with a hard ceiling. Returns the refreshed session. */
export const touchSession = () => {
  const session = readSession();
  if (!session) return null;
  const now = Date.now();
  const next = {
    ...session,
    lastActive: now,
    expiresAt: Math.min(now + SESSION_IDLE_MS, session.absoluteExpiry),
  };
  safeSet(window.sessionStorage, SESSION_KEY, JSON.stringify(next));
  return next;
};

export const endSession = () => {
  if (!canUseStorage()) return;
  safeRemove(window.sessionStorage, SESSION_KEY);
};

/** Drops every session token this browser can reach, plus the guard. */
export const endAllSessions = () => {
  if (!canUseStorage()) return;
  safeRemove(window.sessionStorage, SESSION_KEY);
  clearFailures();
};
