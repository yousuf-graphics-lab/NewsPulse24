import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Radio, Signal, Tv, Users } from 'lucide-react';
import { HERO_STORIES, formatRelativeTime } from '../data/news';
import { useApp } from '../context/AppContext';

const SCHEDULE = [
  { time: '06:00', show: 'First Edition', desk: 'London', dur: '60 min' },
  { time: '09:00', show: 'The Global Briefing', desk: 'London', dur: '45 min' },
  { time: '13:00', show: 'Markets Now', desk: 'New York', dur: '60 min' },
  { time: '15:30', show: 'The Data Desk', desk: 'New York', dur: '30 min' },
  { time: '18:00', show: 'Asia Business Hour', desk: 'Singapore', dur: '60 min' },
  { time: '22:00', show: 'The World Tonight', desk: 'London', dur: '45 min' },
];

export default function LivePage() {
  const { openModal, pushToast } = useApp();

  return (
    <main id="main" className="container-news py-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-pulse">
            <Radio className="h-3 w-3" /> Broadcast centre
          </span>
          <h1 className="heading-xl mt-1.5 text-[25px] sm:text-[32px]">NewsPulse 24 Live</h1>
          <p className="mt-1.5 text-[12.5px] text-muted">
            Rolling coverage from our global studios — 24 hours a day, every day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-[4px] border border-line bg-ink-850 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Users className="h-3 w-3 text-pulse" /> 38,410 watching
          </span>
          <span className="flex items-center gap-1.5 rounded-[4px] border border-line bg-ink-850 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Signal className="h-3 w-3 text-pulse" /> 1080p60
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="panel overflow-hidden">
          <button
            type="button"
            onClick={() => openModal('live')}
            className="group relative block aspect-video w-full overflow-hidden"
            aria-label="Open live player"
          >
            <img
              src="/images/live-studio.jpg"
              alt="NewsPulse 24 broadcast studio above a night city skyline"
              className="h-full w-full object-cover brightness-[0.72] transition-transform duration-[1400ms] group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[3px] bg-pulse px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-white" /> On air
            </span>
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-[68px] w-[68px] place-items-center rounded-full border border-white/25 bg-black/45 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-pulse group-hover:bg-pulse">
                <Tv className="h-6 w-6 text-white" />
              </span>
            </span>
            <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 text-left">
              <span>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-bone/60">
                  Studio 01 · London
                </span>
                <span className="mt-1 block text-[15px] font-bold text-bone sm:text-[18px]">
                  The Global Briefing — live from the newsroom floor
                </span>
              </span>
              <span className="hidden shrink-0 items-end gap-[3px] sm:flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="signal-bar h-5 w-[3px] origin-bottom rounded-full bg-pulse"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </span>
            </span>
          </button>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <p className="text-[11.5px] text-muted">
              No stream ingest is connected in this build — the player will show a clear
              unavailable-stream state rather than a simulated feed.
            </p>
            <button
              type="button"
              onClick={() => openModal('live')}
              className="btn-red h-9 px-4 text-[11.5px]"
            >
              Open player <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
            <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-bone">
              <Clock3 className="h-3.5 w-3.5 text-pulse" /> Today’s schedule
            </h2>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted/70">UTC</span>
          </div>
          <ul className="divide-y divide-line/60">
            {SCHEDULE.map((slot, i) => (
              <li
                key={slot.time}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
                  i === 1 ? 'bg-pulse/[0.06]' : ''
                }`}
              >
                <div>
                  <span className="font-mono text-[10px] font-semibold text-pulse">{slot.time}</span>
                  <p className="text-[11.5px] font-semibold text-bone">{slot.show}</p>
                  <span className="text-[9.5px] uppercase tracking-[0.1em] text-muted/70">
                    {slot.desk} · {slot.dur}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => pushToast(`Reminder set for ${slot.show} (demo).`, 'success')}
                  className="shrink-0 rounded-[4px] border border-line px-2 py-1 text-[10px] font-semibold text-bone/75 transition-colors hover:border-pulse/60 hover:text-pulse"
                >
                  Remind
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6">
        <h2 className="red-bar mb-2.5 flex items-center text-[14px] font-bold uppercase tracking-[0.08em] text-bone">
          On the radar today
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HERO_STORIES.map((s) => (
            <Link
              key={s.id}
              to={`/article/${s.slug}`}
              className="group card-hover flex gap-2.5 rounded-[7px] border border-line bg-ink-850 p-2.5"
            >
              <img
                src={s.image}
                alt=""
                className="h-[66px] w-[96px] shrink-0 rounded-[4px] object-cover"
                style={{ objectPosition: s.imagePosition }}
              />
              <span className="min-w-0">
                <span className="eyebrow !text-[9px]">{s.category}</span>
                <span className="line-clamp-2 block text-[12px] font-bold leading-snug text-bone group-hover:text-pulse">
                  {s.title}
                </span>
                <span className="mt-1 block text-[9.5px] text-muted">
                  {formatRelativeTime(s.publishedAt)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
