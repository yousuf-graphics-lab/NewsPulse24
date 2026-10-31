import { useState } from 'react';
import { Check, CreditCard, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';

const PLANS = [
  {
    id: 'digital',
    name: 'Digital',
    price: '$1',
    period: '/week',
    blurb: 'Unlimited reporting, newsletters and the live blog.',
    perks: ['Unlimited articles', 'Morning & evening briefings', 'Reading list sync'],
  },
  {
    id: 'all-access',
    name: 'All Access',
    price: '$8',
    period: '/month',
    blurb: 'Everything in Digital plus full broadcast access.',
    perks: ['Everything in Digital', '24/7 live broadcast', 'Ad-free reading', 'Weekly data desk'],
    featured: true,
  },
  {
    id: 'newsroom',
    name: 'Newsroom',
    price: '$24',
    period: '/month',
    blurb: 'For teams who need the wire before it publishes.',
    perks: ['Five seats', 'Editorial API access', 'Priority briefings'],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export default function SubscribeModal() {
  const { modal, closeModal, subscribe, subscriber } = useApp();
  const open = modal === 'subscribe';
  const [plan, setPlan] = useState('all-access');
  const [email, setEmail] = useState(subscriber?.email || '');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address, for example editor@newspulse24.com');
      return;
    }
    setError('');
    subscribe(email.trim(), plan);
    setDone(true);
  };

  return (
    <Modal open={open} onClose={closeModal} labelledBy="subscribe-title" maxWidth="max-w-[620px]">
      <div className="max-h-[88vh] overflow-y-auto">
        <div className="border-b border-line bg-[radial-gradient(600px_180px_at_20%_-40%,rgba(255,16,36,0.22),transparent_70%)] px-5 pb-4 pt-5 sm:px-7">
          <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-pulse px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
            <Sparkles className="h-2.5 w-2.5" /> Membership
          </span>
          <h2 id="subscribe-title" className="mt-2.5 text-[21px] font-extrabold tracking-[-0.02em] text-bone sm:text-[24px]">
            Read the world without a paywall pause.
          </h2>
          <p className="mt-1.5 max-w-md text-[12.5px] leading-relaxed text-muted">
            Independent international reporting, live broadcasts and the data desk — supported
            directly by readers like you.
          </p>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center sm:px-7">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pulse/15 ring-1 ring-pulse/40">
              <Check className="h-6 w-6 text-pulse" />
            </span>
            <h3 className="mt-3 text-[16px] font-bold text-bone">Demo subscription confirmed</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">
              This is a front-end demonstration — no payment was taken and no email was sent to{' '}
              <span className="font-semibold text-bone">{email}</span>. Connect a billing provider
              to enable real subscriptions.
            </p>
            <button type="button" onClick={closeModal} className="btn-red mt-5 h-10 px-6 text-[12.5px]">
              Continue reading
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-4 sm:px-7 sm:py-5">
            <fieldset>
              <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                Choose a plan
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLANS.map((p) => {
                  const active = plan === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      aria-pressed={active}
                      className={`relative rounded-[7px] border p-3 text-left transition-all duration-200 ${
                        active
                          ? 'border-pulse bg-pulse/[0.08] shadow-[0_0_0_1px_rgba(255,16,36,0.4)]'
                          : 'border-line bg-ink-800/70 hover:border-white/25'
                      }`}
                    >
                      {p.featured && (
                        <span className="absolute -top-2 right-2 rounded-full bg-pulse px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] text-white">
                          Popular
                        </span>
                      )}
                      <span className="flex items-baseline gap-0.5">
                        <span className="text-[16px] font-extrabold text-bone">{p.price}</span>
                        <span className="text-[10px] font-medium text-muted">{p.period}</span>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] font-bold uppercase tracking-[0.08em] text-bone/90">
                        {p.name}
                      </span>
                      <span className="mt-1 block text-[10.5px] leading-snug text-muted">{p.blurb}</span>
                      <ul className="mt-2 space-y-1">
                        {p.perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-1 text-[10px] leading-snug text-bone/70">
                            <Check className="mt-[1px] h-2.5 w-2.5 shrink-0 text-pulse" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-4">
              <label
                htmlFor="subscribe-email"
                className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted"
              >
                <Mail className="h-3 w-3" /> Email address
              </label>
              <input
                id="subscribe-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'subscribe-error' : undefined}
                placeholder="you@example.com"
                className={`h-[42px] w-full rounded-[6px] border bg-ink-900 px-3 text-[13px] text-bone placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-pulse/50 ${
                  error ? 'border-pulse' : 'border-line'
                }`}
              />
              {error && (
                <p id="subscribe-error" role="alert" className="mt-1.5 text-[11px] font-medium text-pulse-400">
                  {error}
                </p>
              )}
            </div>

            <button type="submit" className="btn-red mt-4 h-[42px] w-full text-[13px]">
              <CreditCard className="h-4 w-4" /> Subscribe — demo checkout
            </button>

            <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted/80">
              <ShieldCheck className="mt-[1px] h-3 w-3 shrink-0 text-pulse/80" />
              Demonstration checkout. No card details are collected, stored or charged.
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}
