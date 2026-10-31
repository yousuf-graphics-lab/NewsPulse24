import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LiveTVPanel({ compact = false }) {
  const { openModal } = useApp();

  return (
    <section aria-labelledby="live-tv-heading" className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-[3px] bg-pulse px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-white">
            <span className="h-1 w-1 animate-pulseDot rounded-full bg-white" />
            Live
          </span>
          <h2
            id="live-tv-heading"
            className="truncate text-[13px] font-bold tracking-[-0.01em] text-bone"
          >
            NewsPulse 24 Live
          </h2>
        </div>
        <button
          type="button"
          onClick={() => openModal('live')}
          className="group flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-pulse transition-colors hover:text-white"
        >
          View All
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => openModal('live')}
        aria-label="Open the NewsPulse 24 live broadcast player"
        className={`group relative block w-full overflow-hidden border-y border-line ${
          compact ? 'aspect-[16/9]' : 'aspect-[16/8.6]'
        }`}
      >
        <img
          src="/images/live-studio.jpg"
          alt="NewsPulse 24 broadcast studio glowing red above a night city skyline"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          style={{ objectPosition: 'center 55%' }}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-ink-950/40" />
        <span className="absolute inset-0 bg-pulse/10 mix-blend-overlay" />

        <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-[3px] border border-white/15 bg-black/55 px-1.5 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-bone/85 backdrop-blur-sm">
          <span className="flex items-end gap-[2px]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="signal-bar h-2 w-[2px] origin-bottom rounded-full bg-pulse"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </span>
          On air · 1080p60
        </span>

        <span className="absolute inset-0 grid place-items-center">
          <span className="relative grid h-[54px] w-[54px] place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-[3px] transition-all duration-300 group-hover:scale-110 group-hover:border-pulse group-hover:bg-pulse">
            <span className="absolute inset-0 animate-ping rounded-full border border-white/20 opacity-40" />
            <Play className="ml-0.5 h-5 w-5 fill-white" />
          </span>
        </span>

        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2.5 pb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-bone/70">
          <span>Studio 01 · London</span>
          <span className="flex items-center gap-1 text-pulse">
            <span className="h-1 w-1 animate-pulseDot rounded-full bg-pulse" /> 38,410 watching
          </span>
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="text-[11px] font-medium text-bone/80">Real-Time News. Anytime. Anywhere.</p>
        <Link
          to="/live"
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-pulse"
        >
          Schedule
        </Link>
      </div>
    </section>
  );
}
