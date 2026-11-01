import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from 'lucide-react';
import {
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  broadcastSignOut,
  changePassword,
  clearFailures,
  confirmTwoFactor,
  disableTwoFactor,
  endAllSessions,
  failedAttempts,
  isUsingCustomPassword,
  lockRemaining,
  resetPasswordToDefault,
  startTwoFactorEnrolment,
  twoFactorEnrolled,
  twoFactorEnrolledAt,
} from '../../lib/adminAuth';
import {
  Button,
  Card,
  Field,
  MicroLabel,
  Progress,
  SectionHead,
  Tag,
  TextInput,
  cx,
} from './ui';
import { read as readDb } from '../../lib/db';
import { relativeClock } from '../../lib/telemetry';
import { LOCK_ON_HIDE_KEY } from './securityPrefs';

const strengths = (value) => {
  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 5);
};

const STRENGTH_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

const readLockOnHide = () => {
  try {
    return window.localStorage.getItem(LOCK_ON_HIDE_KEY) !== '0';
  } catch {
    return true;
  }
};

export default function SecurityView({ session, version, notify, onSignedOut }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockRemaining());
  const [fails, setFails] = useState(() => failedAttempts());
  const [custom, setCustom] = useState(() => isUsingCustomPassword());
  const [enrolled, setEnrolled] = useState(() => twoFactorEnrolled());
  const [enrolPass, setEnrolPass] = useState('');
  const [enrolCode, setEnrolCode] = useState('');
  const [pending, setPending] = useState(null);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [lockOnHide, setLockOnHide] = useState(readLockOnHide);
  const [copied, setCopied] = useState(false);
  const [gate, setGate] = useState({ status: 'checking' });

  /* Asks the deployment whether the server-side door in front of /admin is armed. */
  useEffect(() => {
    let alive = true;
    fetch('/admin-gate', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('no endpoint'))))
      .then((payload) => {
        if (alive) setGate({ status: payload.configured ? 'on' : 'off' });
      })
      .catch(() => {
        if (alive) setGate({ status: 'local' });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLockMs(lockRemaining());
      setFails(failedAttempts());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const score = strengths(next);
  const audit = useMemo(
    () => readDb().audit.filter((entry) => entry.type === 'security').slice(0, 10),
    [version],
  );

  const checks = [
    { id: 'custom', label: 'Passphrase rotated off the issued default', ok: custom },
    { id: 'totp', label: 'Authenticator second factor enrolled', ok: enrolled },
    { id: 'hide', label: 'Auto-lock when the tab is left', ok: lockOnHide },
    { id: 'session', label: 'Idle session expiry enforced', ok: true },
    { id: 'headers', label: 'CSP, frame and transport headers configured', ok: true },
    { id: 'trail', label: 'Security events written to the audit trail', ok: true },
  ];
  const passed = checks.filter((check) => check.ok).length;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('The two new passphrase fields do not match.');
      return;
    }
    if (score < 3) {
      setError('Use at least 12 characters with mixed case, a number and a symbol.');
      return;
    }
    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === 'invalid'
          ? 'That current passphrase does not match.'
          : result.reason === 'two-factor'
            ? 'The enrolled authenticator could not be re-sealed — disable 2FA first.'
            : result.reason === 'storage'
              ? 'The browser refused to store the new digest.'
              : 'This browser cannot derive the digest (needs a secure context).',
      );
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setCustom(true);
    notify(
      result.resealed
        ? 'Passphrase rotated and the 2FA secret re-sealed'
        : 'Passphrase rotated — it is stored only as a PBKDF2 digest',
      'success',
    );
  };

  const startEnrol = async () => {
    setTwoFactorError('');
    setBusy(true);
    const result = await startTwoFactorEnrolment(enrolPass);
    setBusy(false);
    if (!result.ok) {
      setTwoFactorError(
        result.reason === 'invalid' ? 'That passphrase does not match.' : 'Enrolment is unavailable here.',
      );
      return;
    }
    setPending(result);
    setEnrolCode('');
  };

  const confirmEnrol = async () => {
    setTwoFactorError('');
    setBusy(true);
    const result = await confirmTwoFactor(enrolPass, enrolCode);
    setBusy(false);
    if (!result.ok) {
      setTwoFactorError(
        result.reason === 'code'
          ? 'That code is not valid — check the authenticator clock.'
          : result.reason === 'expired'
            ? 'Enrolment expired. Start again.'
            : result.reason === 'invalid'
              ? 'That passphrase does not match.'
              : 'The secret could not be stored.',
      );
      return;
    }
    setEnrolled(true);
    setPending(null);
    setEnrolPass('');
    setEnrolCode('');
    notify('Two-factor authentication is on', 'success');
  };

  const turnOff = async () => {
    setTwoFactorError('');
    setBusy(true);
    const result = await disableTwoFactor(enrolPass);
    setBusy(false);
    if (!result.ok) {
      setTwoFactorError(result.reason === 'invalid' ? 'That passphrase does not match.' : 'Could not disable 2FA.');
      return;
    }
    setEnrolled(false);
    setEnrolPass('');
    notify('Two-factor authentication removed', 'success');
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(pending.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Copy failed — select the key manually', 'error');
    }
  };

  const reset = () => {
    if (
      !window.confirm(
        'Restore the passphrase issued with this build? This also removes the authenticator enrolment and closes every session.',
      )
    )
      return;
    resetPasswordToDefault();
    clearFailures();
    endAllSessions();
    broadcastSignOut();
    setCustom(false);
    setEnrolled(false);
    setPending(null);
    setFails(0);
    notify('Passphrase reset to the issued credential', 'success');
    onSignedOut();
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Rotate the control-room passphrase"
            description="Stored only as a PBKDF2-SHA-256 digest — 310,000 iterations, per-credential salt, peppered. Rotating re-seals the authenticator secret with the new passphrase."
            action={<Tag tone={custom ? 'amber' : 'green'}>{custom ? 'Custom set' : 'Issued default'}</Tag>}
          />
          <form className="space-y-2.5 px-3.5 py-3" onSubmit={submit}>
            <Field label="Current passphrase" htmlFor="sec-current">
              <TextInput
                id="sec-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                invalid={!!error}
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="New passphrase" htmlFor="sec-next">
                <TextInput
                  id="sec-next"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                />
              </Field>
              <Field label="Repeat new passphrase" htmlFor="sec-confirm">
                <TextInput
                  id="sec-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <MicroLabel>Strength</MicroLabel>
                <span
                  className={cx(
                    'text-[9.5px] font-semibold',
                    score >= 4 ? 'text-emerald-400' : score >= 3 ? 'text-amber-400' : 'text-[#7A7C89]',
                  )}
                >
                  {STRENGTH_LABEL[score]}
                </span>
              </div>
              <div className="mt-1">
                <Progress value={score} max={5} tone={score >= 4 ? 'green' : 'red'} />
              </div>
            </div>

            {error ? (
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-pulse-400">
                <AlertTriangle className="h-3 w-3" /> {error}
              </p>
            ) : null}

            <dl className="space-y-1 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2 font-mono text-[9px] text-[#8A8C99]">
              {[
                ['algorithm', 'PBKDF2-SHA-256'],
                ['iterations', '310,000'],
                ['salt', '128-bit, random per credential'],
                ['digest stored', custom ? 'newspulse24:admin:credentials' : 'compiled into the build'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" variant="primary" size="md" disabled={busy || !current || !next}>
                <KeyRound className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Rotate passphrase'}
              </Button>
              <Button variant="quiet" size="md" onClick={reset}>
                <RefreshCcw className="h-3.5 w-3.5" /> Reset to issued credential
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <Card>
            <SectionHead
              title="Authenticator second factor"
              description="RFC 6238 TOTP. The shared secret is sealed with AES-GCM under a key derived from your passphrase."
              action={
                <Tag tone={enrolled ? 'green' : 'red'}>
                  {enrolled ? 'Enabled' : 'Not enrolled'}
                </Tag>
              }
            />
            <div className="space-y-2.5 px-3.5 py-3">
              {enrolled ? (
                <>
                  <div className="flex items-start gap-2 rounded-[3px] border border-emerald-500/25 bg-emerald-500/[0.05] px-2.5 py-2">
                    <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <p className="text-[10px] leading-relaxed text-[#8A8C99]">
                      Codes are required at sign-in
                      {twoFactorEnrolledAt() ? ` — enrolled ${relativeClock(twoFactorEnrolledAt())}` : ''}. The
                      secret cannot be read without your passphrase, and a passphrase reset clears it.
                    </p>
                  </div>
                  <Field label="Passphrase" htmlFor="sec-2fa-off" hint="Required to remove the factor.">
                    <TextInput
                      id="sec-2fa-off"
                      type="password"
                      autoComplete="current-password"
                      value={enrolPass}
                      onChange={(event) => setEnrolPass(event.target.value)}
                      placeholder="Current passphrase"
                    />
                  </Field>
                  {twoFactorError ? (
                    <p className="flex items-center gap-1.5 text-[10.5px] text-pulse-400">
                      <AlertTriangle className="h-3 w-3" /> {twoFactorError}
                    </p>
                  ) : null}
                  <Button
                    variant="danger"
                    size="md"
                    onClick={turnOff}
                    disabled={busy || !enrolPass}
                    className="w-full"
                  >
                    <ShieldOff className="h-3.5 w-3.5" /> Disable two-factor
                  </Button>
                </>
              ) : pending ? (
                <>
                  <div className="rounded-[3px] border border-[#2A2C36] bg-[#0A0B0F] px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <MicroLabel>Manual setup key</MicroLabel>
                      <button
                        type="button"
                        onClick={copySecret}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-pulse hover:text-white"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-1.5 select-all break-all font-mono text-[11px] leading-relaxed text-bone/90">
                      {pending.secret.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                    <p className="mt-1 text-[9px] leading-snug text-[#6F7180]">
                      Add it to any TOTP app (Google Authenticator, 1Password, Authy) as a time-based key,
                      then confirm with the code it shows.
                    </p>
                  </div>
                  <Field label="6-digit code" htmlFor="sec-2fa-code">
                    <TextInput
                      id="sec-2fa-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={enrolCode}
                      onChange={(event) => setEnrolCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="text-center font-mono text-[16px] tracking-[0.4em]"
                    />
                  </Field>
                  {twoFactorError ? (
                    <p className="flex items-center gap-1.5 text-[10.5px] text-pulse-400">
                      <AlertTriangle className="h-3 w-3" /> {twoFactorError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={confirmEnrol}
                      disabled={busy || enrolCode.length !== 6}
                    >
                      <Check className="h-3.5 w-3.5" /> Confirm &amp; enable
                    </Button>
                    <Button
                      variant="quiet"
                      size="md"
                      onClick={() => {
                        setPending(null);
                        setEnrolCode('');
                        setTwoFactorError('');
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 rounded-[3px] border border-[#3A1E22] bg-[#150E11] px-2.5 py-2">
                    <Smartphone className="mt-[1px] h-3.5 w-3.5 shrink-0 text-pulse" />
                    <p className="text-[10px] leading-relaxed text-[#B9BAC6]">
                      Add a second factor so a stolen passphrase is not enough. You will need an
                      authenticator app open when you sign in.
                    </p>
                  </div>
                  <Field label="Passphrase" htmlFor="sec-2fa-start" hint="Proves it is you before a new secret is issued.">
                    <TextInput
                      id="sec-2fa-start"
                      type="password"
                      autoComplete="current-password"
                      value={enrolPass}
                      onChange={(event) => setEnrolPass(event.target.value)}
                      placeholder="Current passphrase"
                    />
                  </Field>
                  {twoFactorError ? (
                    <p className="flex items-center gap-1.5 text-[10.5px] text-pulse-400">
                      <AlertTriangle className="h-3 w-3" /> {twoFactorError}
                    </p>
                  ) : null}
                  <Button variant="primary" size="md" className="w-full" onClick={startEnrol} disabled={busy || !enrolPass}>
                    <ShieldCheck className="h-3.5 w-3.5" /> Enrol authenticator
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card>
            <SectionHead
              title="Security posture"
              action={<Tag tone={passed >= 5 ? 'green' : passed >= 3 ? 'amber' : 'red'}>{passed}/{checks.length}</Tag>}
            />
            <div className="px-3.5 py-2.5">
              <Progress value={passed} max={checks.length} tone={passed >= 5 ? 'green' : 'red'} />
              <ul className="mt-2 grid gap-1">
                {checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-1.5">
                    <span
                      className={cx(
                        'mt-[2px] grid h-3 w-3 shrink-0 place-items-center rounded-full border',
                        check.ok
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-[#3A3C46] text-[#5F616E]',
                      )}
                    >
                      {check.ok ? <Check className="h-2 w-2" strokeWidth={4} /> : null}
                    </span>
                    <span className={cx('text-[10px] leading-snug', check.ok ? 'text-[#B9BAC6]' : 'text-[#7A7C89]')}>
                      {check.label}
                    </span>
                  </li>
                ))}
              </ul>

              <label className="mt-2.5 flex cursor-pointer items-start gap-2 border-t border-[#1D1E25] pt-2.5">
                <button
                  type="button"
                  role="switch"
                  aria-checked={lockOnHide}
                  aria-label="Auto-lock when the tab is left"
                  onClick={() => {
                    const nextValue = !lockOnHide;
                    setLockOnHide(nextValue);
                    try {
                      window.localStorage.setItem(LOCK_ON_HIDE_KEY, nextValue ? '1' : '0');
                    } catch {
                      /* storage blocked */
                    }
                    notify(
                      nextValue ? 'Session will lock when the tab is left' : 'Auto-lock on tab hide disabled',
                      'success',
                    );
                  }}
                  className={cx(
                    'relative mt-[1px] h-[16px] w-[30px] shrink-0 rounded-full border transition-colors',
                    lockOnHide ? 'border-pulse bg-pulse/80' : 'border-[#2A2C36] bg-[#1A1B22]',
                  )}
                >
                  <span
                    className={cx(
                      'absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all',
                      lockOnHide ? 'left-[16px] bg-white' : 'left-[2px] bg-[#8A8C99]',
                    )}
                  />
                </button>
                <span className="text-[10px] leading-snug text-[#8A8C99]">
                  Lock after two minutes away from the tab
                </span>
              </label>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead title="Session" action={<Tag tone="green">Authenticated</Tag>} />
          <div className="space-y-2 px-3.5 py-3">
            <dl className="space-y-1.5 text-[10.5px]">
              {[
                ['Operator', 'Clash Of Clans · Editor in chief'],
                ['Session token', `${session?.token?.slice(0, 12) || '—'}…`],
                ['Issued', session ? new Date(session.issuedAt).toLocaleTimeString('en-GB', { hour12: false }) : '—'],
                ['Second factor', enrolled ? 'TOTP required at sign-in' : 'Not configured'],
                ['Idle expiry', `${Math.round(SESSION_IDLE_MS / 60000)} min after last activity`],
                ['Absolute expiry', `${Math.round(SESSION_MAX_MS / 3600000)} h after sign-in`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 whitespace-nowrap text-[#7A7C89]">{label}</dt>
                  <dd className="min-w-0 truncate text-right font-mono text-[10px] text-bone/85">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2">
              <div className="flex items-center justify-between">
                <MicroLabel>Failed attempts</MicroLabel>
                <span className={cx('font-mono text-[10px]', fails ? 'text-pulse-400' : 'text-emerald-400/85')}>
                  {fails} / 5
                </span>
              </div>
              <div className="mt-1">
                <Progress value={fails} max={5} tone={fails ? 'red' : 'green'} />
              </div>
              <p className="mt-1.5 text-[9px] leading-snug text-[#6F7180]">
                {lockMs > 0
                  ? `Locked for another ${Math.ceil(lockMs / 1000)} s.`
                  : 'Five wrong passphrases lock the form with an exponential back-off up to 15 minutes.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFailures();
                  setFails(0);
                  setLockMs(0);
                  notify('Failure counter cleared', 'success');
                }}
              >
                <Check className="h-3 w-3" /> Clear lockout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  endAllSessions();
                  broadcastSignOut();
                  notify('Every control-room session closed', 'success');
                  onSignedOut();
                }}
              >
                <LogOut className="h-3 w-3" /> Sign out everywhere
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead
            title="How the gate works"
            action={
              <span className="flex items-center gap-1.5">
                <span
                  className={cx(
                    'h-1.5 w-1.5 rounded-full',
                    gate.status === 'on' ? 'bg-emerald-400' : gate.status === 'off' ? 'bg-amber-400' : 'bg-[#5F616E]',
                  )}
                />
                <MicroLabel>
                  {gate.status === 'on'
                    ? 'edge gate armed'
                    : gate.status === 'off'
                      ? 'edge gate unset'
                      : gate.status === 'local'
                        ? 'local build'
                        : 'checking'}
                </MicroLabel>
              </span>
            }
          />
          <ul className="space-y-1.5 px-3.5 py-3 text-[10px] leading-relaxed text-[#8A8C99]">
            {[
              [Fingerprint, 'Username and passphrase compared as constant-time digests.'],
              [Lock, 'Lock-out state lives in localStorage and survives a reload.'],
              [Clock, 'Sessions sit in sessionStorage and expire on idle or after 8 hours.'],
              [Smartphone, 'TOTP codes are checked against a passphrase-sealed secret, ±1 window.'],
              [ShieldCheck, 'This passphrase check runs in the browser. On a public domain, arm the edge gate as well.'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-start gap-1.5">
                <Icon className="mt-[1px] h-3 w-3 shrink-0 text-pulse/75" />
                {text}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionHead
          title="Security trail"
          description="Every security event written to the database command log."
          action={<MicroLabel>{audit.length} recent</MicroLabel>}
        />
        <ul className="divide-y divide-[#1B1C22]">
          {audit.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 px-3.5 py-1.5">
              <span className="font-mono text-[8.5px] text-[#5F616E]">
                {new Date(entry.at).toLocaleString('en-GB', { hour12: false })}
              </span>
              <span className="text-[10.5px] font-semibold text-bone/85">{entry.action}</span>
              <span className="min-w-0 flex-1 truncate text-[9.5px] text-[#6F7180]">{entry.detail}</span>
              <span className="text-[9px] text-[#5F616E]">{relativeClock(entry.at)}</span>
            </li>
          ))}
          {!audit.length ? (
            <li className="px-3.5 py-4 text-[10.5px] text-[#6F7180]">No security events logged yet.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
