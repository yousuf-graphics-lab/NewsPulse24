import { Link } from 'react-router-dom';

/* Abstract continent strip (tileable) used as the rotating surface of the globe. */
const LAND_TILE = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
  <g fill="#ff2b3c" stroke="rgba(255,150,160,0.7)" stroke-width="0.8">
    <path d="M18 22c14-7 30-6 42 2 7 5 3 15-5 19-9 4-19 2-26-5-6-6-15-11-11-16z"/>
    <path d="M44 52c10-3 19 2 24 11 5 9 1 22-8 29-8 5-18 2-23-6-6-11-4-24 7-34z"/>
    <path d="M86 14c16-4 33 1 46 10 8 6 6 17-4 21-12 4-26 1-36-6-8-6-14-22-6-25z"/>
    <path d="M104 48c12-3 24 2 30 12 5 9 2 20-8 24-11 5-24 0-29-11-4-9-2-21 7-25z"/>
    <path d="M150 20c13-6 29-4 40 5 7 6 3 17-6 21-11 4-24 0-31-8-5-6-10-15-3-18z"/>
    <path d="M156 62c9-4 20-1 26 7 5 8 2 19-7 23-10 4-21-1-25-11-3-8 0-16 6-19z"/>
    <path d="M202 26c10-4 22-1 29 7 5 6 2 15-6 18-10 4-20-1-25-9-3-6-4-13 2-16z"/>
    <path d="M206 66c8-2 17 1 21 8 3 6 0 13-7 15-8 2-16-2-19-9-2-5 0-11 5-14z"/>
  </g>
</svg>`);

export default function BrandLogo({ size = 'lg', className = '' }) {
  const dims = {
    lg: {
      box: 'h-[34px] w-[34px] xs:h-[40px] xs:w-[40px] sm:h-[52px] sm:w-[52px]',
      text: 'text-[19px] xs:text-[22px] sm:text-[32px]',
      tag: 'text-[6px] xs:text-[6.5px] sm:text-[9.5px]',
      gap: 'gap-2 sm:gap-3',
    },
    md: {
      box: 'h-[42px] w-[42px]',
      text: 'text-[22px]',
      tag: 'text-[8px]',
      gap: 'gap-2.5',
    },
    sm: {
      box: 'h-[34px] w-[34px]',
      text: 'text-[18px]',
      tag: 'text-[7px]',
      gap: 'gap-2',
    },
  }[size];

  return (
    <Link
      to="/"
      aria-label="NewsPulse 24 — home"
      className={`group flex items-center ${dims.gap} ${className}`}
    >
      {/* Rotating globe emblem */}
      <span
        aria-hidden="true"
        className={`relative grid ${dims.box} shrink-0 place-items-center rounded-full`}
        style={{
          background:
            'conic-gradient(from 200deg, #ff1024, #ff5563 14%, #d2081c 38%, #ff2a38 62%, #9c0613 84%, #ff1024)',
          boxShadow:
            '0 0 0 1px rgba(255,120,130,0.75), 0 0 20px -2px rgba(255,16,36,0.8), inset 0 0 10px rgba(0,0,0,0.45)',
        }}
      >
        <span className="absolute inset-[4px] overflow-hidden rounded-full bg-[#080910]">
          {/* moving land surface */}
          <span
            className="absolute inset-[-10%] block"
            style={{
              backgroundImage: `url("data:image/svg+xml,${LAND_TILE}")`,
              backgroundSize: '200% 100%',
              backgroundRepeat: 'repeat-x',
              opacity: 1,
              filter: 'drop-shadow(0 0 2px rgba(255,16,36,0.55))',
              animation: 'globe-map 16s linear infinite',
            }}
          />
          {/* meridians */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <defs>
              <clipPath id="globe-clip">
                <circle cx="50" cy="50" r="50" />
              </clipPath>
            </defs>
            <g clipPath="url(#globe-clip)" fill="none" stroke="rgba(255,90,100,0.34)" strokeWidth="0.7">
              <ellipse cx="50" cy="50" rx="16" ry="50" stroke="rgba(255,130,140,0.4)" />
              <ellipse cx="50" cy="50" rx="32" ry="50" stroke="rgba(255,130,140,0.32)" />
              <ellipse cx="50" cy="50" rx="46" ry="50" stroke="rgba(255,130,140,0.28)" />
              <path d="M0 50h100" stroke="rgba(255,130,140,0.38)" />
              <path d="M4 30h92M9 14h82M9 86h82M4 70h92" stroke="rgba(255,120,130,0.16)" />
            </g>
            <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,16,36,0.75)" strokeWidth="1.2" />
          </svg>
          {/* sphere shading */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.22), rgba(255,255,255,0) 40%), radial-gradient(circle at 74% 82%, rgba(0,0,0,0.85), rgba(0,0,0,0) 58%), radial-gradient(circle at 50% 50%, rgba(255,16,36,0.06), rgba(255,16,36,0.28) 80%)',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.8)',
            }}
          />
          {/* scanning sheen */}
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-y-0 w-1/3 animate-scan bg-gradient-to-r from-transparent via-white/25 to-transparent blur-[2px]" />
          </span>
        </span>
        {/* orbit ring */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[5px] rounded-full border border-pulse/25 transition-transform duration-700 group-hover:rotate-[24deg]"
          style={{ borderStyle: 'dashed' }}
        />
      </span>

      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className={`heading-xl ${dims.text} whitespace-nowrap leading-[0.95]`}>
          <span className="text-white">News</span>
          <span className="text-pulse">Pulse</span>
          <span className="ml-1 text-pulse">24</span>
        </span>
        <span className={`mt-[4px] whitespace-nowrap font-semibold uppercase leading-none tracking-[0.16em] text-muted sm:mt-[6px] sm:tracking-[0.24em] ${dims.tag}`}>
          Real News. Global Impact.
        </span>
      </span>
    </Link>
  );
}
