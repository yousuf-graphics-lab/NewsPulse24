import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck, User } from 'lucide-react';
import GlobeMark from '../GlobeMark';
import { Button, Field, TextInput } from './ui';
import {
  failedAttempts,
  isCryptoAvailable,
  lockRemaining,
  MAX_ATTEMPTS,
  registerFailure,
  twoFactorEnrolled,
  verifyCredentials,
  verifySecondFactor,
} from '../../lib/adminAuth';

const WAIT_STEPS = [30_000, 60_000, 120_000, 240_000, 480_000, 900_000];

export default function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockRemaining());
  const [fails, setFails] = useState(() => failedAttempts());
  const [stage, setStage] = useState('password');
  const [code, setCode] = useState('');
  const passwordRef = useRef(null);
  const userRef = useRef(null);
  const codeRef = useRef(null);

  const locked = lockMs > 0;
  const cryptoReady = isCryptoAvailable();

  useEffect(() => {
    if (!locked) return undefined;
    const t = window.setInterval(() => setLockMs(lockRemaining()), 500);
    return () => window.clearInterval(t);
  }, [locked]);

  /* Focus once on mount — never while typing, or the cursor would jump fields. */
  useEffect(() => {
    if (!cryptoReady) return;
    userRef.current?.focus();
  }, [cryptoReady]);

  const registerFail = (message) => {
    const { fails: nextFails, lockedUntil } = registerFailure();
    setFails(nextFails);
    setLockMs(Math.max(0, lockedUntil - Date.now()));
    setError(message);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || locked) return;
    setError('');

    if (stage === 'code') {
      setBusy(true);
      try {
        const result = await verifySecondFactor(password, code);
        if (result.ok) {
          setPassword('');
          setCode('');
          onSuccess();
          return;
        }
        registerFail(
          result.reason === 'passphrase'
            ? 'The passphrase could not open the enrolled authenticator. Sign in again.'
            : 'That authenticator code is not valid for this window.',
        );
        setCode('');
        if (result.reason === 'passphrase') {
          setStage('password');
          setPassword('');
          passwordRef.current?.focus();
        } else {
          codeRef.current?.focus();
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const result = await verifyCredentials(username, password);
      if (result.ok) {
        if (twoFactorEnrolled()) {
          setStage('code');
          setCode('');
          setBusy(false);
          window.setTimeout(() => codeRef.current?.focus(), 30);
          return;
        }
        setPassword('');
        onSuccess();
        return;
      }
      registerFail(
        result.reason === 'unsupported'
          ? 'This browser cannot run the secure hashing check. Open the panel over https or on localhost.'
          : 'Those credentials are not valid.',
      );
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      id="main"
      className="relative flex min-h-[calc(100vh-84px)] items-center justify-center px-4 py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,16,36,0.14),transparent_70%)]"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="relative grid h-14 w-14 place-items-center"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,16,36,0.45))' }}
          >
            <GlobeMark className="h-full w-full" spin />
          </span>
          <h1 className="heading-xl mt-4 text-[24px] leading-none">
            News<span className="text-pulse">Pulse</span> <span className="text-pulse">24</span>
          </h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
            Editorial control room
          </p>
        </div>

        <div className="rounded-[10px] border border-line bg-ink-850/90 p-5 shadow-[0_40px_90px_-60px_rgba(0,0,0,1)] backdrop-blur-md sm:p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-pulse" strokeWidth={2} />
            <h2 className="text-[14px] font-bold text-bone">
              {stage === 'code' ? 'Two-factor check' : 'Sign in to continue'}
            </h2>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
            {stage === 'code'
              ? 'Enter the current 6-digit code from your authenticator. The secret stays sealed with your passphrase.'
              : 'Credentials are verified in this browser against a PBKDF2 digest — the password itself is never stored.'}
          </p>

          <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
            {stage === 'code' ? (
              <Field label="Authenticator code" htmlFor="admin-code" hint="Codes rotate every 30 seconds.">
                <TextInput
                  ref={codeRef}
                  id="admin-code"
                  name="one-time-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center font-mono text-[18px] tracking-[0.4em]"
                  disabled={locked || busy}
                  required
                />
              </Field>
            ) : (
              <>
            <Field label="Editorial ID" htmlFor="admin-username">
              <div className="relative">
                <User
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                />
                <TextInput
                  ref={userRef}
                  id="admin-username"
                  name="username"
                  autoComplete="username"
                  spellCheck="false"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Editorial ID"
                  className="pl-9"
                  disabled={locked || busy || !cryptoReady}
                  required
                />
              </div>
            </Field>

            <Field label="Passphrase" htmlFor="admin-password">
              <div className="relative">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                />
                <TextInput
                  ref={passwordRef}
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passphrase"
                  className="px-9"
                  disabled={locked || busy || !cryptoReady}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[4px] text-muted transition-colors hover:text-bone"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </Field>
              </>
            )}

            {error ? (
              <p role="alert" className="flex items-start gap-1.5 text-[11.5px] font-medium text-pulse-400">
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            ) : null}

            {locked ? (
              <p className="flex items-start gap-1.5 rounded-[6px] border border-pulse/30 bg-pulse/[0.08] px-2.5 py-2 text-[11.5px] leading-relaxed text-bone/85">
                <Lock className="mt-[2px] h-3.5 w-3.5 shrink-0 text-pulse" />
                Locked after {MAX_ATTEMPTS} failed attempts. Try again in{' '}
                <span className="font-bold text-white">{Math.ceil(lockMs / 1000)}s</span>.
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={
                locked ||
                busy ||
                !cryptoReady ||
                (stage === 'code' ? code.length !== 6 : !username || !password)
              }
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? 'Verifying…' : stage === 'code' ? 'Verify code' : 'Unlock control room'}
            </Button>

            {stage === 'code' ? (
              <button
                type="button"
                onClick={() => {
                  setStage('password');
                  setCode('');
                  setPassword('');
                  setError('');
                  window.setTimeout(() => passwordRef.current?.focus(), 30);
                }}
                className="w-full text-[10.5px] font-semibold text-muted transition-colors hover:text-bone"
              >
                Start again with the passphrase
              </button>
            ) : null}
          </form>

          <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted/80">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 shrink-0 text-pulse/80" />
              {WAIT_STEPS.length}-step back-off, 20-minute idle sessions, optional TOTP second factor.
            </p>
            {fails > 0 && !locked ? (
              <p className="text-pulse-400/90">
                {fails} of {MAX_ATTEMPTS} attempts used before a lock-out.
              </p>
            ) : null}
            <p>
              Publisher tools are local to this browser. Need newsroom-wide publishing?{' '}
              <Link to="/about" className="font-semibold text-pulse/90 hover:text-pulse">
                Read the setup notes
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted/70">
          <Link to="/" className="hover:text-bone">
            ← Back to NewsPulse 24
          </Link>
        </p>
      </div>
    </main>
  );
}
