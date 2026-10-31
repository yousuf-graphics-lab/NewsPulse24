import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Fingerprint,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  ShieldQuestion,
  Unlock,
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
import { auditLog } from '../../lib/auditLog';
import { Badge, Button, Card, Field, PanelHeading, TextInput } from './ui';

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

export default function SecurityPanel({ session, notify, onSignedOut }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockMs, setLockMs] = useState(() => lockRemaining());
  const [fails, setFails] = useState(() => failedAttempts());
  const [custom, setCustom] = useState(() => isUsingCustomPassword());

  useEffect(() => {
    const t = window.setInterval(() => {
      setLockMs(lockRemaining());
      setFails(failedAttempts());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const score = strengths(next);
  const log = useMemo(() => auditLog().slice(0, 8), [busy, error, custom]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (next.length < 12) {
      setError('Use at least 12 characters — longer passphrases are far harder to guess.');
      return;
    }
    if (next !== confirm) {
      setError('The two new passphrases do not match.');
      return;
    }
    if (strengths(next) < 3) {
      setError('Mix upper and lower case with a number or symbol.');
      return;
    }
    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.reason === 'storage'
          ? 'This browser blocked storage, so the new passphrase could not be saved.'
          : 'Your current passphrase is not correct.',
      );
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setCustom(true);
    notify('Passphrase updated for this browser', 'success');
  };

  const expiresIn = session ? Math.max(0, session.expiresAt - Date.now()) : 0;
  const mins = Math.floor(expiresIn / 60000);
  const secs = Math.floor((expiresIn % 60000) / 1000);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
      <div className="space-y-4">
        <Card>
          <PanelHeading
            title="Session"
            description="Sessions are held in this tab only and expire automatically."
            action={
              <Badge tone="live">
                <span className="h-1 w-1 rounded-full bg-emerald-400" /> Active
              </Badge>
            }
          />
          <dl className="divide-y divide-line/70 text-[11.5px]">
            {[
              ['Signed in', session ? new Date(session.issuedAt).toLocaleString('en-GB') : '—'],
              ['Expires after', `${mins}m ${String(secs).padStart(2, '0')}s of inactivity`],
              ['Idle window', `${SESSION_IDLE_MS / 60000} minutes`],
              ['Hard limit', `${SESSION_MAX_MS / 3600000} hours`],
              ['Token', session ? `•••• ${session.token.slice(-8)}` : '—'],
              ['Storage', 'sessionStorage (cleared when the tab closes)'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold text-bone/90">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3 sm:px-5">
            <Button variant="ghost" size="sm" onClick={onSignedOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                endAllSessions();
                onSignedOut();
              }}
            >
              <ShieldQuestion className="h-3.5 w-3.5" /> Sign out & clear lock-out
            </Button>
          </div>
        </Card>

        <Card>
          <PanelHeading
            title="Passphrase"
            description={
              custom
                ? 'A custom passphrase is set for this browser (stored as a PBKDF2 digest only).'
                : 'Using the issued credential. Change it to something only you know.'
            }
            action={<KeyRound className="h-3.5 w-3.5 text-muted" />}
          />
          <form onSubmit={submit} className="space-y-3 px-4 py-4 sm:px-5" noValidate>
            <Field label="Current passphrase" htmlFor="sec-current">
              <TextInput
                id="sec-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••••"
              />
            </Field>
            <Field
              label="New passphrase"
              htmlFor="sec-next"
              hint="12 characters minimum. A four-word phrase beats a short scramble."
            >
              <TextInput
                id="sec-next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="••••••••••"
              />
            </Field>
            {next ? (
              <div className="flex items-center gap-1.5" aria-live="polite">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-[3px] flex-1 rounded-full ${
                      i < score ? (score < 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-ink-750'
                    }`}
                  />
                ))}
                <span className="ml-1 w-[68px] shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {STRENGTH_LABEL[score]}
                </span>
              </div>
            ) : null}
            <Field label="Confirm new passphrase" htmlFor="sec-confirm">
              <TextInput
                id="sec-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••••"
                invalid={!!confirm && confirm !== next}
              />
            </Field>
            {error ? (
              <p role="alert" className="flex items-start gap-1.5 text-[11.5px] font-medium text-pulse-400">
                <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={busy}>
                <Check className="h-3.5 w-3.5" /> {busy ? 'Updating…' : 'Update passphrase'}
              </Button>
              {custom ? (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    resetPasswordToDefault();
                    setCustom(false);
                    notify('Passphrase reset to the issued credential', 'success');
                  }}
                >
                  Reset to issued credential
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <PanelHeading
            title="Brute-force guard"
            description="Failed attempts are counted per browser with exponential back-off."
            action={<Lock className="h-3.5 w-3.5 text-muted" />}
          />
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-muted">Failed attempts</span>
              <span className="text-[13px] font-bold text-bone/90">{fails}</span>
            </div>
            <div className="mt-2 flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < fails ? 'bg-pulse' : 'bg-ink-750'}`}
                />
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
              {lockMs > 0 ? (
                <>
                  <Lock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-pulse" />
                  Locked for another {Math.ceil(lockMs / 1000)}s.
                </>
              ) : (
                <>
                  <Unlock className="mt-[1px] h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
                  Not locked. Five misses trigger a 30-second cool-down that doubles each time.
                </>
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              disabled={!fails && !lockMs}
              onClick={() => {
                clearFailures();
                setFails(0);
                setLockMs(0);
                notify('Lock-out counter cleared', 'success');
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Clear counter
            </Button>
          </div>
        </Card>

        <Card>
          <PanelHeading title="How this is protected" action={<Fingerprint className="h-3.5 w-3.5 text-muted" />} />
          <ul className="space-y-2 px-4 py-4 text-[11px] leading-relaxed text-muted sm:px-5">
            <li>• PBKDF2-SHA-256, 310 000 iterations, salted and peppered — no plaintext anywhere.</li>
            <li>• Constant-time digest comparison, so wrong guesses leak no timing signal.</li>
            <li>• 256-bit random session token, 20-minute idle expiry, 8-hour ceiling.</li>
            <li>• Automatic lock-out after five bad attempts.</li>
            <li>• Every action is written to the audit log below.</li>
          </ul>
          <p className="mx-4 mb-4 flex items-start gap-1.5 rounded-[6px] border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-200/85 sm:mx-5">
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
            Client-side gating cannot stop someone with the bundle from skipping the screen. For
            newsroom-wide publishing, put the panel behind a server or an auth provider.
          </p>
        </Card>

        <Card>
          <PanelHeading title="Recent security events" action={<Clock className="h-3.5 w-3.5 text-muted" />} />
          {log.length ? (
            <ul className="divide-y divide-line/70">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 px-4 py-2 text-[11px] sm:px-5">
                  <span className="min-w-0 flex-1 truncate text-bone/85">{entry.action}</span>
                  <span className="shrink-0 text-muted/70">
                    {new Date(entry.at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-[11.5px] text-muted sm:px-5">No events recorded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
