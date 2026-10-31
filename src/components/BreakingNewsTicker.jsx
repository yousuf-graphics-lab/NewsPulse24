import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Flame, GripHorizontal, MoveVertical, Zap } from 'lucide-react';
import { BREAKING_HEADLINES, STORIES } from '../data/news';
import { useApp } from '../context/AppContext';

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

const DOCKS = ['below-nav', 'above-nav', 'bottom'];

const DOCK_LABEL = {
  'below-nav': 'under the navigation bar',
  'above-nav': 'above the navigation bar',
  bottom: 'to the bottom of the screen',
};

function TickerItem({ item, duplicate }) {
  const { story, label, accent } = item;
  return (
    <Link
      to={`/article/${story.slug}`}
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate || undefined}
      className="group flex shrink-0 items-center gap-2 px-3.5 text-[11.5px] transition-colors hover:text-white sm:gap-2.5 sm:px-5 sm:text-[12.5px]"
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

/** Visual drop targets shown only while the bar is being dragged. */
function DropZones({ active, dragging }) {
  if (!dragging) return null;
  const zones = [
    { id: 'above-nav', label: 'Move above navigation', className: 'top-2' },
    { id: 'below-nav', label: 'Keep under navigation', className: 'top-[104px]' },
    { id: 'bottom', label: 'Dock to bottom of screen', className: 'bottom-2' },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[78]">
      {zones.map((zone) => {
        const isActive = active === zone.id;
        return (
          <div
            key={zone.id}
            className={`absolute inset-x-2 flex h-[42px] items-center justify-center rounded-[6px] border border-dashed transition-all duration-200 sm:inset-x-6 ${
              zone.className
            } ${
              isActive
                ? 'border-pulse bg-pulse/15 text-white shadow-[0_0_30px_-8px_rgba(255,16,36,0.8)]'
                : 'border-white/15 bg-black/30 text-transparent'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {zone.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function BreakingNewsTicker({ variant = 'inline' }) {
  const { tickerDock, setTickerDock, pushToast } = useApp();
  const [now, setNow] = useState(new Date());
  const [dragging, setDragging] = useState(false);
  const [offsetY, setOffsetY] = useState(0);
  const [hint, setHint] = useState(tickerDock);
  const dragRef = useRef({ startY: 0, pointerId: null, moved: false, active: false });
  const docked = variant === 'bottom';

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

  const zoneFor = useCallback((clientY) => {
    const h = window.innerHeight;
    if (clientY < 190) return 'above-nav';
    if (clientY > h - 170) return 'bottom';
    return 'below-nav';
  }, []);

  const commitDock = useCallback(
    (dock) => {
      setTickerDock(dock);
      if (dock !== tickerDock) {
        pushToast(`Breaking-news bar moved ${DOCK_LABEL[dock]}.`, 'success');
      }
    },
    [pushToast, setTickerDock, tickerDock],
  );

  const endDrag = useCallback(
    (clientY) => {
      const dock = zoneFor(clientY);
      setDragging(false);
      setOffsetY(0);
      commitDock(dock);
    },
    [commitDock, zoneFor],
  );

  // pointer cancellation (e.g. touch interrupted) should never leave us stuck
  useEffect(() => {
    const cancel = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragging(false);
      setOffsetY(0);
    };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
      moved: false,
      active: true,
      dock: tickerDock,
    };
    setHint(tickerDock);
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 4) drag.moved = true;
    setOffsetY(dy);
    setHint(zoneFor(e.clientY));
  };

  const onPointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    const { moved, dock } = drag;
    setDragging(false);
    setOffsetY(0);
    // a tap (not a drag) cycles through the dock positions
    if (!moved) {
      commitDock(DOCKS[(DOCKS.indexOf(dock) + 1) % DOCKS.length]);
      return;
    }
    endDrag(e.clientY);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commitDock(DOCKS[(DOCKS.indexOf(tickerDock) + 1) % DOCKS.length]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commitDock('above-nav');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      commitDock('below-nav');
    }
  };

  return (
    <>
      <DropZones active={hint} dragging={dragging} />
      <div
        className={
          docked
            ? `fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-850/97 backdrop-blur-md ticker-dock-bottom ${
                dragging ? 'z-[80] cursor-grabbing shadow-[0_-20px_50px_-20px_rgba(0,0,0,1)]' : ''
              }`
            : `relative border-b border-line bg-ink-850/95 ${
                dragging ? 'z-[80] shadow-[0_22px_50px_-18px_rgba(0,0,0,1)]' : ''
              }`
        }
        style={
          dragging
            ? {
                transform: `translateY(${offsetY}px)`,
                transition: 'none',
                willChange: 'transform',
              }
            : { transform: 'translateY(0)', transition: 'transform 260ms cubic-bezier(0.22,1,0.36,1)' }
        }
      >
        <div className={`flex h-[38px] items-center ${dragging ? 'ring-1 ring-inset ring-pulse/70' : ''}`}>
          <div className="relative z-10 flex h-full shrink-0 items-center gap-1 bg-pulse px-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white xs:gap-1.5 xs:px-2.5 xs:text-[10.5px] xs:tracking-[0.12em] sm:px-4">
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>Breaking</span>
            <span className="absolute right-0 top-0 h-full w-3 translate-x-full bg-gradient-to-r from-pulse to-transparent" />
          </div>

          <div className="marquee-wrap relative flex-1 overflow-hidden">
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

          <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-4 text-[10.5px] font-medium text-muted lg:flex">
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

          {/* drag / move handle */}
          <button
            type="button"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            title="Drag to reposition · click or press Enter to cycle"
            aria-label={`Move breaking-news bar. Currently ${DOCK_LABEL[tickerDock]}. Drag, or press Enter to cycle position.`}
            className={`flex h-full shrink-0 cursor-grab items-center gap-1 border-l border-line px-2.5 text-muted transition-colors hover:bg-white/5 hover:text-pulse focus-visible:bg-white/5 active:cursor-grabbing sm:px-3 ${
              dragging ? 'text-pulse' : ''
            }`}
            style={{ touchAction: 'none' }}
          >
            <GripHorizontal className="h-4 w-4" />
            <MoveVertical className="hidden h-3 w-3 sm:block" />
            <span className="sr-only">Drag to move</span>
          </button>
        </div>

        {/* colour-matched signal line */}
        <div className="relative h-[2px] w-full overflow-hidden bg-ink-750">
          <div className="absolute inset-0 glow-line opacity-70" />
          <div className="signal-scan absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white to-transparent opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-pulse/0 via-pulse/25 to-pulse/0" />
        </div>
      </div>
    </>
  );
}
