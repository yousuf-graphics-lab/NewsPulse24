import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Flame, Pause, Play, Zap } from 'lucide-react';
import { formatRelativeTime } from '../data/news';
import { getTickerStories } from '../lib/contentStore';

/* 74 px per second reads comfortably without blurring the longer headlines. */
const SPEED_PX_PER_SEC = 82;

const buildItems = () => {
  const { breaking, topRead } = getTickerStories();
  return [
    ...breaking.map((s) => ({ story: s, label: 'Breaking', accent: 'breaking' })),
    ...topRead.map((s, i) => ({ story: s, label: `#${i + 1} Most read`, accent: 'top' })),
  ];
};

function TickerItem({ item, duplicate }) {
  const { story, label, accent } = item;
  return (
    <Link
      to={`/article/${story.slug}`}
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate || undefined}
      className="group flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-[11.5px] transition-colors hover:text-white sm:gap-2.5 sm:px-5 sm:text-[12.5px]"
    >
      <span
        className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
          accent === 'top' ? 'text-pulse' : 'text-pulse/65'
        }`}
      >
        {accent === 'top' ? <Flame className="h-3 w-3" /> : <Zap className="h-2.5 w-2.5" />}
        {label}
      </span>
      <span className="font-medium text-bone/85 group-hover:text-white">{story.title}</span>
      <span className="hidden text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/60 sm:inline">
        {formatRelativeTime(story.publishedAt)}
      </span>
      <ArrowUpRight className="h-3 w-3 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pulse" />
      <span className="ml-1.5 h-1 w-1 shrink-0 rounded-full bg-pulse/40" />
    </Link>
  );
}

export default function BreakingNewsTicker() {
  const items = useMemo(buildItems, []);
  const [now, setNow] = useState(new Date());
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(60);
  const [nudge, setNudge] = useState(0);
  const trackRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* Match the animation duration to the real track width so the ribbon always
     slides at the same pixel speed, however much copy is in it. */
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const half = track.scrollWidth / 2;
      if (half > 0) setDuration(Math.max(18, Math.round(half / SPEED_PX_PER_SEC)));
    };
    measure();
    // re-measure once webfonts have settled so the speed stays constant
    const settle = window.setTimeout(measure, 600);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('resize', measure);
    };
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

  /* Manual skip: jump the ribbon by one viewport width, then let it resume. */
  const skip = (dir) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setPaused(true);
    setNudge((n) => n + (dir * viewport.clientWidth) / 2);
    window.setTimeout(() => setPaused(false), 2600);
  };

  return (
    <div className="relative border-b border-line bg-ink-850/95">
      <div className="flex h-[38px] items-center">
        {/* breaking badge */}
        <div
          aria-label="Breaking news"
          className="relative z-10 flex h-full shrink-0 items-center gap-1 bg-pulse px-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white xs:gap-1.5 xs:px-2.5 xs:text-[10.5px] xs:tracking-[0.12em] sm:px-4">
          <Zap className="h-3.5 w-3.5 shrink-0 fill-white" />
          <span className="hidden xs:inline">Breaking</span>
          <span className="absolute right-0 top-0 h-full w-4 translate-x-full bg-gradient-to-r from-pulse to-transparent" />
        </div>

        {/* sliding ribbon */}
        <div
          ref={viewportRef}
          className="marquee-wrap relative flex-1 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          aria-label="Breaking news headlines, sliding"
        >
          <div
            ref={trackRef}
            className="marquee-track items-center will-change-transform"
            style={{
              animationDuration: `${duration}s`,
              animationPlayState: paused ? 'paused' : 'running',
              transform: nudge ? `translateX(${-nudge}px)` : undefined,
              transition: nudge ? 'transform 900ms cubic-bezier(0.22,1,0.36,1)' : undefined,
            }}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center" aria-hidden={copy === 1 || undefined}>
                {items.map((item) => (
                  <TickerItem
                    key={`${copy}-${item.label}-${item.story.id}`}
                    item={item}
                    duplicate={copy === 1}
                  />
                ))}
              </div>
            ))}
          </div>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-ink-850 to-transparent" />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-850 via-ink-850/90 to-transparent" />
        </div>

        {/* controls: skip back / pause / skip forward */}
        <div className="flex h-full shrink-0 items-center border-l border-line">
          <button
            type="button"
            onClick={() => skip(-1)}
            aria-label="Scroll breaking headlines back"
            className="hidden h-full w-7 place-items-center text-muted transition-colors hover:bg-white/5 hover:text-pulse sm:grid"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume sliding headlines' : 'Pause sliding headlines'}
            aria-pressed={paused}
            className="grid h-full w-8 place-items-center text-muted transition-colors hover:bg-white/5 hover:text-pulse sm:w-7"
          >
            {paused ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => skip(1)}
            aria-label="Scroll breaking headlines forward"
            className="hidden h-full w-7 place-items-center text-muted transition-colors hover:bg-white/5 hover:text-pulse sm:grid"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* clock */}
        <div className="hidden shrink-0 items-center gap-3 border-l border-line px-4 text-[10.5px] font-medium text-muted lg:flex">
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
