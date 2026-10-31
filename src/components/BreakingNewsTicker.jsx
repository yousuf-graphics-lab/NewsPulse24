import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Flame, Zap } from 'lucide-react';
import { BREAKING_HEADLINES, STORIES } from '../data/news';

const topRead = [...STORIES].sort((a, b) => b.views - a.views).slice(0, 4);

const ITEMS = [
  ...BREAKING_HEADLINES.slice(0, 4).map((s) => ({
    story: s,
    label: s.category,
    accent: 'pulse',
  })),
  ...topRead.map((s, i) => ({
    story: s,
    label: `#${i + 1} Most read`,
    accent: 'top',
  })),
];

function TickerItem({ item, duplicate }) {
  const { story, label, accent } = item;
  return (
    <Link
      to={`/article/${story.slug}`}
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate || undefined}
      className="group flex shrink-0 items-center gap-2.5 px-5 text-[12.5px] transition-colors hover:text-white"
    >
      <span
        className={`flex items-center gap-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] ${
          accent === 'top' ? 'text-pulse' : 'text-pulse/70'
        }`}
      >
        {accent === 'top' && <Flame className="h-3 w-3" />}
        {label}
      </span>
      <span className="whitespace-nowrap font-medium text-bone/85 group-hover:text-white">
        {story.title}
      </span>
      <ArrowUpRight className="h-3 w-3 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pulse" />
      <span className="ml-1 h-1 w-1 shrink-0 rounded-full bg-line-soft" />
    </Link>
  );
}

export default function BreakingNewsTicker() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(now),
    [now],
  );

  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }).format(now),
    [now],
  );

  return (
    <div className="relative border-b border-line bg-ink-850/95">
      <div className="flex h-[38px] items-center">
        <div className="relative z-10 flex h-full shrink-0 items-center gap-1.5 bg-pulse px-3 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-white sm:px-4">
          <Zap className="h-3.5 w-3.5 fill-white" />
          <span className="hidden xs:inline sm:inline">Breaking</span>
          <span className="absolute right-0 top-0 h-full w-3 translate-x-full bg-gradient-to-r from-pulse to-transparent" />
        </div>

        <div className="marquee-wrap relative hidden flex-1 overflow-hidden sm:block">
          <div className="marquee-track items-center">
            {[0, 1].map((copy) => (
              <div className="flex items-center" key={copy} aria-hidden={copy === 1 || undefined}>
                {ITEMS.map((item) => (
                  <TickerItem
                    key={`${copy}-${item.label}-${item.story.id}`}
                    item={item}
                    duplicate={copy === 1}
                  />
                ))}
              </div>
            ))}
          </div>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-ink-850 to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ink-850 via-ink-850/90 to-transparent" />
        </div>

        <Link
          to={`/article/${BREAKING_HEADLINES[0].slug}`}
          className="flex min-w-0 flex-1 items-center gap-1.5 px-3 text-[11.5px] font-medium text-bone/85 sm:hidden"
        >
          <span className="truncate">{BREAKING_HEADLINES[0].title}</span>
          <ArrowUpRight className="h-3 w-3 shrink-0 text-pulse" />
        </Link>

        <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-4 pr-4 text-[10.5px] font-medium text-muted lg:flex">
          <span>{dateLabel}</span>
          <span className="h-3 w-px bg-line" />
          <span className="flex items-center gap-1.5 font-mono text-bone/90">
            {timeLabel}
            <span className="text-[8.5px] font-sans font-bold uppercase tracking-[0.12em] text-muted">
              UTC
            </span>
          </span>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-pulse">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" /> Live
          </span>
        </div>
      </div>

      {/* colour-matched signal line */}
      <div className="relative h-[2px] w-full overflow-hidden bg-ink-750">
        <div className="absolute inset-0 glow-line opacity-70" />
        <div className="signal-scan absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-pulse/0 via-pulse/25 to-pulse/0" />
      </div>
    </div>
  );
}
