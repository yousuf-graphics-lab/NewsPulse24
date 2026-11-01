/**
 * Second factor for the control room: RFC 6238 TOTP, plus AES-GCM sealing of
 * the shared secret so it is never sitting in localStorage in the clear.
 *
 * The 2FA secret is encrypted with a key derived from the passphrase
 * (PBKDF2-SHA-256, 150 000 iterations, per-enrolment salt). Unlocking the code
 * therefore needs both the passphrase and the current 6-digit code from the
 * authenticator — a database dump alone is not enough.
 *
 * WebCrypto only, no dependencies.
 */

const encoder = new TextEncoder();
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export const toBase64 = (bytes) => {
  let binary = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
};

export const fromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const base32Encode = (bytes) => {
  const view = new Uint8Array(bytes);
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < view.length; i += 1) {
    value = (value << 8) | view[i];
    bits += 8;
    while (bits >= 5) {
      output += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += B32[(value << (5 - bits)) & 31];
  return output;
};

export const base32Decode = (input) => {
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (const character of clean) {
    const index = B32.indexOf(character);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
};

export const generateSecret = () => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
};

const counterBytes = (counter) => {
  const buffer = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buffer[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return buffer;
};

export const hotp = async (secret, counter, digits = 6) => {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes(counter)));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
};

export const totp = async (secret, { step = 30, at = Date.now() } = {}) =>
  hotp(secret, Math.floor(at / 1000 / step));

const safeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/** Accepts the previous, current and next 30-second window. */
export const verifyTotp = async (secret, code, { step = 30, window = 1, at = Date.now() } = {}) => {
  const clean = String(code || '').replace(/\D/g, '');
  if (clean.length !== 6) return false;
  const counter = Math.floor(at / 1000 / step);
  for (let offset = -window; offset <= window; offset += 1) {
    // eslint-disable-next-line no-await-in-loop
    const candidate = await hotp(secret, counter + offset);
    if (safeEqual(candidate, clean)) return true;
  }
  return false;
};

export const otpauthUri = ({ secret, account = 'control-room', issuer = 'NewsPulse 24' }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(
    issuer,
  )}&algorithm=SHA1&digits=6&period=30`;

export const newSalt = () => toBase64(crypto.getRandomValues(new Uint8Array(16)));

const deriveKey = async (passphrase, saltB64, iterations = 150_000) => {
  const base = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`newspulse24:2fa:${passphrase}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const sealSecret = async (passphrase, secret, salt) => {
  const key = await deriveKey(passphrase, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(secret),
  );
  return { salt, iv: toBase64(iv), cipher: toBase64(cipher), iterations: 150_000, version: 1 };
};

export const openSecret = async (passphrase, sealed) => {
  const key = await deriveKey(passphrase, sealed.salt, sealed.iterations || 150_000);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(sealed.iv) },
    key,
    fromBase64(sealed.cipher),
  );
  return new TextDecoder().decode(plain);
};
