import { forwardRef } from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ surfaces */

export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={cx(
        'relative min-w-0 rounded-[6px] border border-[#22232A] bg-[#0E0F14] shadow-[0_28px_60px_-48px_rgba(0,0,0,1)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function MicroLabel({ children, className = '', tone = 'muted' }) {
  return (
    <span
      className={cx(
        'text-[9px] font-bold uppercase leading-none tracking-[0.18em]',
        tone === 'red' ? 'text-pulse' : tone === 'bright' ? 'text-bone/80' : 'text-[#7A7C89]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({ title, description, action, className = '' }) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[#22232A] px-3.5 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[12.5px] font-extrabold uppercase leading-none tracking-[0.1em] text-bone">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-[52ch] text-[11px] leading-relaxed text-[#8A8C99]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------- inputs */

export const TextInput = forwardRef(function TextInput(
  { className = '', invalid = false, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        'h-9 w-full rounded-[4px] border bg-[#0A0B0F] px-2.5 text-[12px] text-bone placeholder:text-[#6A6C78] transition-colors focus:outline-none focus:ring-2',
        invalid
          ? 'border-pulse/70 focus:ring-pulse/25'
          : 'border-[#262832] hover:border-[#34363F] focus:border-pulse/70 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    />
  );
});

export const TextArea = forwardRef(function TextArea({ className = '', invalid = false, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full rounded-[4px] border bg-[#0A0B0F] px-2.5 py-2 text-[12px] leading-relaxed text-bone placeholder:text-[#6A6C78] transition-colors focus:outline-none focus:ring-2',
        invalid
          ? 'border-pulse/70 focus:ring-pulse/25'
          : 'border-[#262832] hover:border-[#34363F] focus:border-pulse/70 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    />
  );
});

export function Select({ className = '', children, ...rest }) {
  return (
    <select
      className={cx(
        'h-9 w-full rounded-[4px] border border-[#262832] bg-[#0A0B0F] px-2 text-[12px] text-bone transition-colors hover:border-[#34363F] focus:border-pulse/70 focus:outline-none focus:ring-2 focus:ring-pulse/20',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, error, htmlFor, children, className = '', action }) {
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label
            htmlFor={htmlFor}
            className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#7A7C89]"
          >
            {label}
          </label>
          {action}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-[10.5px] font-medium text-pulse-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[10.5px] leading-snug text-[#6F7180]">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ controls */

export function Button({ variant = 'ghost', size = 'md', className = '', children, type = 'button', ...rest }) {
  const variants = {
    primary:
      'bg-pulse text-white hover:bg-pulse-600 shadow-[0_10px_24px_-14px_rgba(255,16,36,0.95)]',
    ghost:
      'border border-[#2A2C36] bg-[#15161C] text-bone/85 hover:border-pulse/55 hover:text-white',
    quiet: 'text-[#8A8C99] hover:text-bone',
    danger:
      'border border-pulse/40 bg-pulse/[0.07] text-pulse-400 hover:border-pulse/70 hover:bg-pulse/[0.14]',
    dark: 'border border-[#22232A] bg-[#0A0B0F] text-bone/80 hover:border-[#34363F] hover:text-white',
  };
  const sizes = {
    xs: 'h-6 px-2 text-[10px] rounded-[3px] gap-1',
    sm: 'h-7 px-2.5 text-[10.5px] rounded-[4px] gap-1.5',
    md: 'h-9 px-3.5 text-[11.5px] rounded-[4px] gap-1.5',
  };
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center font-semibold uppercase tracking-[0.06em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45',
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

export function IconButton({ label, className = '', children, active = false, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border transition-colors',
        active
          ? 'border-pulse/60 bg-pulse/[0.14] text-pulse'
          : 'border-[#262832] bg-[#101116] text-[#8A8C99] hover:border-[#3A3C46] hover:text-bone',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tag({ tone = 'muted', children, className = '' }) {
  const tones = {
    muted: 'border-[#2A2C36] bg-[#15161C] text-[#9A9CAA]',
    red: 'border-pulse/45 bg-pulse/[0.12] text-pulse-400',
    green: 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-300/90',
    amber: 'border-amber-500/35 bg-amber-500/[0.08] text-amber-300/90',
    ghost: 'border-transparent bg-transparent text-[#6F7180]',
    live: 'border-pulse/50 bg-pulse/[0.16] text-white',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-[2px] border px-1.5 py-[2px] text-[8.5px] font-bold uppercase leading-none tracking-[0.12em]',
        tones[tone] || tones.muted,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Delta({ value, className = '' }) {
  const up = value >= 0;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-0.5 text-[10px] font-bold',
        up ? 'text-emerald-400' : 'text-pulse-400',
        className,
      )}
    >
      {up ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function Segmented({ options, value, onChange, size = 'sm', className = '' }) {
  return (
    <div
      role="tablist"
      className={cx(
        'inline-flex items-center gap-0.5 rounded-[4px] border border-[#262832] bg-[#0A0B0F] p-[2px]',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cx(
              'rounded-[3px] font-semibold uppercase tracking-[0.06em] transition-colors',
              size === 'sm' ? 'h-6 px-2 text-[9.5px]' : 'h-7 px-2.5 text-[10.5px]',
              active
                ? 'bg-pulse text-white'
                : 'text-[#8A8C99] hover:bg-white/[0.04] hover:text-bone',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-[1px] h-[16px] w-[30px] shrink-0 rounded-full border transition-colors',
          checked ? 'border-pulse bg-pulse/80' : 'border-[#2A2C36] bg-[#1A1B22]',
        )}
      >
        <span
          className={cx(
            'absolute top-[2px] h-[10px] w-[10px] rounded-full transition-all',
            checked ? 'left-[16px] bg-white' : 'left-[2px] bg-[#8A8C99]',
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-[11.5px] font-semibold text-bone/90">{label}</span>
        {hint ? <span className="mt-0.5 block text-[10.5px] leading-snug text-[#7A7C89]">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Progress({ value, max = 100, tone = 'red', className = '' }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div className={cx('h-[5px] w-full overflow-hidden rounded-full bg-[#1B1C23]', className)}>
      <div
        className={cx(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'red'
            ? 'bg-gradient-to-r from-pulse/55 to-pulse'
            : tone === 'green'
              ? 'bg-gradient-to-r from-emerald-500/50 to-emerald-400'
              : tone === 'amber'
                ? 'bg-gradient-to-r from-amber-500/50 to-amber-400'
                : 'bg-gradient-to-r from-[#4A4C58] to-[#6A6C78]',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={cx('flex flex-col items-center gap-1.5 px-4 py-8 text-center', className)}>
      {Icon ? (
        <span className="grid h-9 w-9 place-items-center rounded-full border border-[#262832] bg-[#12131A]">
          <Icon className="h-4 w-4 text-[#7A7C89]" />
        </span>
      ) : null}
      <p className="text-[11.5px] font-semibold text-bone/85">{title}</p>
      {children ? <p className="max-w-[36ch] text-[10.5px] leading-relaxed text-[#7A7C89]">{children}</p> : null}
    </div>
  );
}
