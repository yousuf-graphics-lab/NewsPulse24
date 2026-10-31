import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import GlobeMark from '../GlobeMark';
import { Button, MicroLabel, Tag, cx } from './ui';
import { EASE } from '../../lib/motion';
import { relativeClock } from '../../lib/telemetry';

function StatusDot({ tone = 'red' }) {
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      <span
        className={cx(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
          tone === 'green' ? 'bg-emerald-400' : 'bg-pulse',
        )}
      />
      <span
        className={cx(
          'relative inline-flex h-1.5 w-1.5 rounded-full',
          tone === 'green' ? 'bg-emerald-400' : 'bg-pulse',
        )}
      />
    </span>
  );
}

export default function AdminShell({
  nav,
  activeTab,
  onNavigate,
  title,
  subtitle,
  headEyebrow,
  headAction,
  onQuickDispatch,
  onSearch,
  preview,
  audit,
  sessionLeft,
  clock,
  onSignOut,
  children,
  statusLine,
}) {
  const [drawer, setDrawer] = useState(false);
  const [bell, setBell] = useState(false);
  const [term, setTerm] = useState('');
  const bellRef = useRef(null);

  useEffect(() => {
    const onClick = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) setBell(false);
    };
    window.addEventListener('pointerdown', onClick);
    return () => window.removeEventListener('pointerdown', onClick);
  }, []);

  const mins = Math.floor(Math.max(0, sessionLeft) / 60000);
  const secs = String(Math.floor((Math.max(0, sessionLeft) % 60000) / 1000)).padStart(2, '0');
  const urgent = sessionLeft < 120000;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <MicroLabel className="tracking-[0.22em]">Mission control</MicroLabel>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="grid h-6 w-6 place-items-center rounded text-[#7A7C89] lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav aria-label="Control room" className="flex-1 px-2">
        <ul className="space-y-[3px]">
          {nav.map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(id);
                    setDrawer(false);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'group relative flex w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left text-[12px] font-semibold transition-colors',
                    active
                      ? 'bg-pulse/[0.1] text-white'
                      : 'text-[#9A9CAA] hover:bg-white/[0.035] hover:text-bone',
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-pulse" />
                  ) : null}
                  <Icon
                    className={cx('h-[15px] w-[15px]', active ? 'text-pulse' : 'text-[#7A7C89]')}
                    strokeWidth={1.9}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  {badge ? (
                    <span className="rounded-[2px] bg-pulse px-1 text-[8.5px] font-bold text-white">
                      {badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-2 mb-2 rounded-[4px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2">
        <div className="flex items-center justify-between">
          <MicroLabel>Stream state</MicroLabel>
          <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400/90">
            <span className="h-1 w-1 rounded-full bg-emerald-400" /> Stable
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[10px] leading-none text-[#8A8C99]">
          {statusLine.date} <span className="text-[#4A4C58]">·</span> {statusLine.latency}
        </p>
        <p className="mt-1 font-mono text-[9px] leading-none text-[#5F616E]">{statusLine.build}</p>
      </div>

      <div className="border-t border-[#22232A] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#2A2C36] bg-[#15161C] text-[9px] font-bold text-pulse">
            CO
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold text-bone/90">Clash Of Clans</p>
            <p className="truncate text-[9.5px] text-[#6F7180]">Editor in chief</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="grid h-6 w-6 place-items-center rounded text-[#7A7C89] transition-colors hover:text-pulse"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08090C]">
      {/* sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[218px] flex-col border-r border-[#1D1E25] bg-[#0B0C10] lg:flex">
        {sidebar}
      </aside>

      {/* sidebar — drawer */}
      <AnimatePresence>
        {drawer ? (
          <motion.div
            className="fixed inset-0 z-[70] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: EASE }}
              className="absolute inset-y-0 left-0 flex h-full max-h-[100dvh] w-[248px] flex-col overflow-y-auto overscroll-contain border-r border-[#1D1E25] bg-[#0B0C10]"
            >
              {sidebar}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-[218px]">
        {/* top bar */}
        <div className="sticky top-0 z-30 border-b border-[#1D1E25] bg-[#0B0C10]/95 backdrop-blur-md">
          <div className="flex h-[52px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#262832] bg-[#101116] text-[#9A9CAA] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <Link to="/admin" className="flex shrink-0 items-center gap-2">
              <span className="relative grid h-7 w-7 place-items-center">
                <GlobeMark className="h-full w-full" spin />
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="text-[11.5px] font-extrabold tracking-[-0.02em] text-bone">
                  News<span className="text-pulse">Pulse</span>
                  <span className="ml-1 text-pulse">24</span>
                </span>
                <span className="mt-[3px] text-[7px] font-bold uppercase tracking-[0.2em] text-[#6F7180]">
                  Editorial ops
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-1.5 border-l border-[#22232A] pl-3 xl:flex">
              <StatusDot />
              <MicroLabel tone="bright">Global telemetry</MicroLabel>
              <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-emerald-400/85">
                System optimal
              </span>
              <span className="text-[9px] text-[#3F414C]">·</span>
              <span className="font-mono text-[9px] text-[#6F7180]">NODE_DC_EAST</span>
            </div>

            <form
              className="ml-auto hidden min-w-0 flex-1 justify-end md:flex"
              onSubmit={(event) => {
                event.preventDefault();
                onSearch(term.trim());
              }}
            >
              <label className="relative w-full max-w-[240px]">
                <span className="sr-only">Search stories and sections</span>
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F7180]" />
                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search stories, live wire…"
                  className="h-7 w-full rounded-[4px] border border-[#262832] bg-[#0A0B0F] pl-7 pr-8 text-[11px] text-bone placeholder:text-[#5F616E] focus:border-pulse/60 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[2px] border border-[#2A2C36] px-1 font-mono text-[8.5px] text-[#6F7180]">
                  ⌘K
                </kbd>
              </label>
            </form>

            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <div className="hidden items-center gap-1.5 rounded-[4px] border border-[#3A1E22] bg-[#150E11] px-2 py-[3px] lg:flex">
                <Radio className="h-3 w-3 text-pulse" />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-pulse">
                  Ticker live
                </span>
                <span className="max-w-[190px] truncate text-[9.5px] text-[#B9BAC6]">
                  {preview || 'The wire is quiet — publish a story'}
                </span>
              </div>

              <div className="hidden items-center gap-1.5 rounded-[4px] border border-[#262832] bg-[#101116] px-2 py-[3px] sm:flex">
                <ShieldCheck className="h-3 w-3 text-emerald-400/90" />
                <div className="leading-none">
                  <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#8A8C99]">
                    {urgent ? 'Session expiring' : 'Session valid'}
                  </p>
                  <p className={cx('mt-[2px] font-mono text-[9px]', urgent ? 'text-pulse' : 'text-[#B9BAC6]')}>
                    {mins}:{secs}
                  </p>
                </div>
              </div>

              <div className="relative" ref={bellRef}>
                <button
                  type="button"
                  onClick={() => setBell((value) => !value)}
                  aria-label="Command log notifications"
                  aria-expanded={bell}
                  className="relative grid h-7 w-7 place-items-center rounded-[4px] border border-[#262832] bg-[#101116] text-[#9A9CAA] transition-colors hover:text-bone"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-pulse ring-2 ring-[#101116]" />
                </button>
                <AnimatePresence>
                  {bell ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: EASE }}
                      className="absolute right-0 top-9 z-50 w-[300px] overflow-hidden rounded-[5px] border border-[#2A2C36] bg-[#0E0F14] shadow-[0_30px_70px_-30px_rgba(0,0,0,1)]"
                    >
                      <div className="flex items-center justify-between border-b border-[#22232A] px-3 py-2">
                        <MicroLabel tone="bright">Command log</MicroLabel>
                        <Tag tone="red">{audit.length}</Tag>
                      </div>
                      <ul className="max-h-[260px] overflow-y-auto">
                        {audit.slice(0, 6).map((entry) => (
                          <li key={entry.id} className="border-b border-[#1B1C22] px-3 py-2 last:border-b-0">
                            <p className="text-[10.5px] font-semibold text-bone/85">{entry.action}</p>
                            <p className="mt-0.5 truncate text-[9.5px] text-[#6F7180]">
                              {entry.detail || '—'} · {relativeClock(entry.at)}
                            </p>
                          </li>
                        ))}
                        {!audit.length ? (
                          <li className="px-3 py-4 text-[10.5px] text-[#6F7180]">No events yet.</li>
                        ) : null}
                      </ul>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="hidden items-center gap-1.5 border-l border-[#22232A] pl-2 sm:flex">
                <span className="grid h-6 w-6 place-items-center rounded-full border border-[#2A2C36] bg-[#15161C] text-[8px] font-bold text-pulse">
                  CO
                </span>
                <div className="hidden leading-none xl:block">
                  <p className="text-[10px] font-semibold text-bone/90">Clash Of Clans</p>
                  <p className="mt-[2px] text-[8.5px] text-[#6F7180]">Editor in chief</p>
                </div>
              </div>

              <Button variant="primary" size="sm" className="shrink-0" onClick={onQuickDispatch}>
                <Zap className="h-3 w-3" />
                <span className="hidden sm:inline">Quick dispatch</span>
                <span className="sr-only sm:hidden">Quick dispatch</span>
              </Button>
            </div>
          </div>
        </div>

        <main id="main" className="px-3 pb-8 pt-4 sm:px-4">
          <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <StatusDot />
                <MicroLabel tone="red">{headEyebrow || 'Mission control'}</MicroLabel>
                <ChevronRight className="h-2.5 w-2.5 text-[#3F414C]" />
                <MicroLabel>{title}</MicroLabel>
              </div>
              <h1 className="mt-1.5 text-[26px] font-extrabold leading-none tracking-[-0.025em] text-bone sm:text-[30px]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 max-w-[60ch] text-[11.5px] leading-relaxed text-[#8A8C99]">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {headAction}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
