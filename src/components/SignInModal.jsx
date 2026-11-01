import { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export default function SignInModal() {
  const { modal, closeModal, signIn, openModal } = useApp();
  const open = modal === 'signin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;
    signIn(email.trim());
    closeModal();
    setEmail('');
    setPassword('');
  };

  return (
    <Modal open={open} onClose={closeModal} labelledBy="signin-title" maxWidth="max-w-[420px]">
      <div className="px-5 pb-5 pt-6 sm:px-7">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pulse">
          Reader account
        </span>
        <h2 id="signin-title" className="mt-1.5 text-[21px] font-extrabold tracking-[-0.02em] text-bone">
          Sign in to NewsPulse 24
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
          Sync your reading list and briefing preferences across devices.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
          <div>
            <label htmlFor="signin-email" className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <Mail className="h-3 w-3" /> Email
            </label>
            <input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: null }));
              }}
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              className={`h-[42px] w-full rounded-[6px] border bg-ink-900 px-3 text-[13px] text-bone placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-pulse/50 ${
                errors.email ? 'border-pulse' : 'border-line'
              }`}
            />
            {errors.email && <p role="alert" className="mt-1 text-[11px] text-pulse-400">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="signin-password" className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Password
              </span>
              <button type="button" className="text-[9.5px] font-semibold normal-case tracking-normal text-pulse hover:text-white">
                Forgot?
              </button>
            </label>
            <div className="relative">
              <input
                id="signin-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: null }));
                }}
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                className={`h-[42px] w-full rounded-[6px] border bg-ink-900 pl-3 pr-10 text-[13px] text-bone placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-pulse/50 ${
                  errors.password ? 'border-pulse' : 'border-line'
                }`}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-white"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p role="alert" className="mt-1 text-[11px] text-pulse-400">{errors.password}</p>
            )}
          </div>

          <button type="submit" className="btn-red h-[42px] w-full text-[13px]">
            <LogIn className="h-4 w-4" /> Sign in
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted/60">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={() => openModal('subscribe')}
          className="btn-ghost mt-3 h-[40px] w-full text-[12px]"
        >
          Create a reader account
        </button>

        <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted/80">
          <ShieldCheck className="mt-[1px] h-3 w-3 shrink-0 text-pulse/80" />
          Demo session only — credentials are not transmitted or stored on a server.
        </p>
      </div>
    </Modal>
  );
}
