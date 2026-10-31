import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
  changePassword,
  clearFailures,
  endAllSessions,
  failedAttempts,
  isUsingCustomPassword,
  lockRemaining,
  resetPasswordToDefault,
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

export default function SecurityView({ session, version, notify, onSignedOut }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockRemaining());
  const [fails, setFails] = useState(() => failedAttempts());
  const [custom, setCustom] = useState(() => isUsingCustomPassword());

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
    notify('Passphrase rotated — it is stored only as a PBKDF2 digest', 'success');
  };

  const reset = () => {
    if (!window.confirm('Restore the passphrase issued with this build? Every other session is closed.')) return;
    resetPasswordToDefault();
    clearFailures();
    endAllSessions();
    setCustom(false);
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
            description="The browser stores a PBKDF2-SHA-256 digest — 310,000 iterations, per-credential salt, peppered. The passphrase itself is never written anywhere."
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
                <KeyRound className="h-3.5 w-3.5" /> {busy ? 'Rotating…' : 'Rotate passphrase'}
              </Button>
              <Button variant="quiet" size="md" onClick={reset}>
                <RefreshCcw className="h-3.5 w-3.5" /> Reset to issued credential
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-3">
          <Card>
            <SectionHead title="Session" action={<Tag tone="green">Authenticated</Tag>} />
            <div className="space-y-2 px-3.5 py-3">
              <dl className="space-y-1.5 text-[10.5px]">
                {[
                  ['Operator', 'Clash Of Clans · Editor in chief'],
                  ['Session token', `${session?.token?.slice(0, 12) || '—'}…`],
                  ['Issued', session ? new Date(session.issuedAt).toLocaleTimeString('en-GB', { hour12: false }) : '—'],
                  ['Idle expiry', `${Math.round(SESSION_IDLE_MS / 60000)} min after last activity`],
                  ['Absolute expiry', `${Math.round(SESSION_MAX_MS / 3600000)} h after sign-in`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[#7A7C89]">{label}</dt>
                    <dd className="truncate text-right font-mono text-[10px] text-bone/85">{value}</dd>
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
                <Button variant="danger" size="sm" onClick={onSignedOut}>
                  <LogOut className="h-3 w-3" /> Sign out
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead title="How the gate works" />
            <ul className="space-y-1.5 px-3.5 py-3 text-[10px] leading-relaxed text-[#8A8C99]">
              {[
                [Fingerprint, 'Username and passphrase compared as constant-time digests.'],
                [Lock, 'Lock-out state lives in localStorage and survives a reload.'],
                [Clock, 'Sessions sit in sessionStorage and expire on idle or after 8 hours.'],
                [ShieldCheck, 'Client-side gating only — anyone with the bundle can bypass the UI check.'],
              ].map(([Icon, text]) => (
                <li key={text} className="flex items-start gap-1.5">
                  <Icon className="mt-[1px] h-3 w-3 shrink-0 text-pulse/75" />
                  {text}
                </li>
              ))}
            </ul>
          </Card>
        </div>
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
