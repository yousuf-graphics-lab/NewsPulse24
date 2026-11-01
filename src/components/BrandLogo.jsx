import { Link } from 'react-router-dom';
import GlobeMark from './GlobeMark';

export default function BrandLogo({ size = 'lg', className = '', link = true, spin = true }) {
  const dims = {
    lg: {
      box: 'h-[38px] w-[38px] xs:h-[44px] xs:w-[44px] sm:h-[54px] sm:w-[54px]',
      text: 'text-[19px] xs:text-[22px] sm:text-[32px]',
      tag: 'text-[6px] xs:text-[6.5px] sm:text-[9.5px]',
      gap: 'gap-2 sm:gap-3',
    },
    md: {
      box: 'h-[40px] w-[40px]',
      text: 'text-[22px]',
      tag: 'text-[8px]',
      gap: 'gap-2.5',
    },
    sm: {
      box: 'h-[32px] w-[32px]',
      text: 'text-[18px]',
      tag: 'text-[7px]',
      gap: 'gap-2',
    },
  }[size];

  const content = (
    <>
      {/* rotating globe emblem */}
      <span
        className={`relative grid ${dims.box} shrink-0 place-items-center`}
        style={{ filter: 'drop-shadow(0 0 6px rgba(255,16,36,0.45))' }}
      >
        <GlobeMark className="h-full w-full" spin={spin} />
        {/* orbit ring */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[3px] rounded-full border border-pulse/20 transition-transform duration-700 group-hover:rotate-[28deg] group-hover:border-pulse/40"
        />
      </span>

      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className={`heading-xl ${dims.text} whitespace-nowrap leading-[0.95] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]`}>
          <span className="text-white">News</span>
          <span className="text-pulse">Pulse</span>
          <span className="ml-1 text-pulse">24</span>
        </span>
        <span
          className={`mt-[4px] whitespace-nowrap font-semibold uppercase leading-none tracking-[0.16em] text-muted sm:mt-[6px] sm:tracking-[0.24em] ${dims.tag}`}
        >
          Real News. Global Impact.
        </span>
      </span>
    </>
  );

  const base = `group flex items-center ${dims.gap} ${className}`;

  if (!link) {
    return (
      <span className={base} aria-label="NewsPulse 24">
        {content}
      </span>
    );
  }

  return (
    <Link to="/" aria-label="NewsPulse 24 — home" className={base}>
      {content}
    </Link>
  );
}
