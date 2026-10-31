import { forwardRef } from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={cx(
        'min-w-0 rounded-[9px] border border-line bg-ink-850/80 shadow-[0_24px_60px_-46px_rgba(0,0,0,1)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.1em] text-bone">{title}</h2>
        {description ? (
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        aria-hidden="true"
        className={cx(
          'absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
          tone === 'alert' ? 'via-pulse/80' : 'via-line-soft',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-muted">
          {label}
        </p>
        {Icon ? (
          <Icon
            aria-hidden="true"
            className={cx('h-4 w-4', tone === 'alert' ? 'text-pulse' : 'text-muted/70')}
            strokeWidth={1.9}
          />
        ) : null}
      </div>
      <p className="mt-3 text-[24px] font-extrabold leading-none tracking-[-0.02em] text-bone">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-muted/85">{hint}</p> : null}
    </Card>
  );
}

export const TextInput = forwardRef(function TextInput(
  { className = '', invalid = false, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-10 w-full rounded-[6px] border bg-ink-950/70 px-3 text-[12.5px] text-bone placeholder:text-muted/60 transition-colors focus:outline-none focus:ring-2',
        invalid
          ? 'border-pulse/70 focus:ring-pulse/25'
          : 'border-line-soft hover:border-[#34353f] focus:border-pulse/70 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    />
  );
});

export function TextArea({ className = '', invalid = false, ...rest }) {
  return (
    <textarea
      className={cx(
        'w-full rounded-[6px] border bg-ink-950/70 px-3 py-2 text-[12.5px] leading-relaxed text-bone placeholder:text-muted/60 transition-colors focus:outline-none focus:ring-2',
        invalid
          ? 'border-pulse/70 focus:ring-pulse/25'
          : 'border-line-soft hover:border-[#34353f] focus:border-pulse/70 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select
      className={cx(
        'h-10 w-full rounded-[6px] border border-line-soft bg-ink-950/70 px-2.5 text-[12.5px] text-bone transition-colors hover:border-[#34353f] focus:border-pulse/70 focus:outline-none focus:ring-2 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-pulse-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted/70">{hint}</p>
      ) : null}
    </div>
  );
}

export function Badge({ tone = 'muted', children }) {
  const tones = {
    muted: 'border-line-soft bg-ink-800 text-muted',
    live: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
    draft: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
    hidden: 'border-line-soft bg-ink-800 text-muted/70',
    red: 'border-pulse/40 bg-pulse/[0.12] text-pulse-400',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.1em]',
        tones[tone] || tones.muted,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const variants = {
    primary:
      'bg-pulse text-white hover:bg-pulse-600 shadow-[0_10px_26px_-14px_rgba(255,16,36,0.95)]',
    ghost:
      'border border-line-soft bg-ink-800 text-bone/85 hover:border-pulse/55 hover:text-white',
    quiet: 'text-muted hover:text-bone',
    danger:
      'border border-pulse/40 bg-pulse/[0.08] text-pulse-400 hover:border-pulse/70 hover:bg-pulse/[0.16]',
  };
  const sizes = {
    sm: 'h-8 px-2.5 text-[11.5px] rounded-[5px]',
    md: 'h-10 px-3.5 text-[12.5px] rounded-[6px]',
  };
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[6px] border border-line-soft bg-ink-950/50 px-3 py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-[1px] h-[18px] w-[32px] shrink-0 rounded-full border transition-colors',
          checked ? 'border-pulse bg-pulse/80' : 'border-line-soft bg-ink-750',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white transition-all',
            checked ? 'left-[17px]' : 'left-[2px]',
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-bone/90">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-snug text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon ? (
        <span className="grid h-10 w-10 place-items-center rounded-full border border-line-soft bg-ink-800">
          <Icon className="h-4 w-4 text-muted" />
        </span>
      ) : null}
      <p className="text-[12.5px] font-semibold text-bone/90">{title}</p>
      {children ? <p className="max-w-sm text-[11.5px] leading-relaxed text-muted">{children}</p> : null}
    </div>
  );
}
