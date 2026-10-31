import { useState } from 'react';
import {
  BellRing,
  Clock3,
  Maximize2,
  Play,
  Radio,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';

const QUALITIES = ['Auto', '1080p60', '720p', '480p'];

const SCHEDULE = [
  { time: '09:00 UTC', show: 'The Global Briefing', desk: 'London' },
  { time: '13:00 UTC', show: 'Markets Now', desk: 'New York' },
  { time: '18:00 UTC', show: 'Asia Business Hour', desk: 'Singapore' },
  { time: '22:00 UTC', show: 'The World Tonight', desk: 'London' },
];

export default function LiveTVModal() {
  const { modal, closeModal, pushToast } = useApp();
  const open = modal === 'live';
  const [muted, setMuted] = useState(true);
  const [quality, setQuality] = useState('Auto');
  const [attempted, setAttempted] = useState(false);

  return (
    <Modal open={open} onClose={closeModal} labelledBy="live-title" maxWidth="max-w-[820px]">
      <div className="border-b border-line px-4 py-3 pr-16 sm:px-5 sm:pr-16">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-[3px] bg-pulse px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white">
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-white" /> Live
          </span>
          <h2 id="live-title" className="text-[14px] font-bold tracking-[-0.01em] text-bone">
            NewsPulse 24 Live — Global Desk
          </h2>
          <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted xl:flex">
            <Radio className="h-3 w-3 text-pulse" /> Studio 01 · London · 1080p60
          </span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.55fr_1fr]">
        <div className="border-line lg:border-r">
          <div className="relative aspect-video overflow-hidden bg-black">
            <img
              src="/images/live-studio.jpg"
              alt="NewsPulse 24 broadcast studio, currently off air in this demonstration build"
              className={`h-full w-full object-cover transition-all duration-700 ${
                attempted ? 'scale-105 blur-[3px] brightness-[0.45] grayscale' : 'brightness-[0.75]'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45" />

            {attempted && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-pulse/40 bg-pulse/10">
                  <WifiOff className="h-5 w-5 text-pulse" />
                </span>
                <p className="mt-3 text-[13px] font-bold text-bone">Stream not connected</p>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-bone/60">
                  This build has no broadcast ingest configured. Point the player at an HLS or RTMP
                  feed in <code className="rounded bg-white/10 px-1 py-px text-[10px]">src/config/stream.js</code>{' '}
                  to go live.
                </p>
              </div>
            )}

            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[3px] border border-white/15 bg-black/60 px-1.5 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] text-bone/85 backdrop-blur-sm">
              <span className="flex items-end gap-[2px]">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="signal-bar h-2.5 w-[2px] origin-bottom rounded-full bg-pulse"
                    style={{ animationDelay: `${i * 0.14}s` }}
                  />
                ))}
              </span>
              Signal · standby
            </div>

            {!attempted && (
              <button
                type="button"
                onClick={() => {
                  setAttempted(true);
                  pushToast('No live stream is configured in this build.', 'info');
                }}
                aria-label="Start live playback"
                className="absolute inset-0 z-10 grid place-items-center"
              >
                <span className="grid h-[62px] w-[62px] place-items-center rounded-full border border-white/25 bg-black/40 backdrop-blur-[3px] transition-all duration-300 hover:scale-110 hover:border-pulse hover:bg-pulse">
                  <Play className="ml-1 h-6 w-6 fill-white text-white" />
                </span>
              </button>
            )}

            {/* player chrome */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2.5 pt-6">
              <div className="mb-2 h-[3px] w-full overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[18%] rounded-full bg-pulse" />
              </div>
              <div className="flex items-center gap-2.5 text-bone/85">
                <button
                  type="button"
                  onClick={() => {
                    setAttempted(true);
                    pushToast('No live stream is configured in this build.', 'info');
                  }}
                  aria-label="Play"
                  className="hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  className="hover:text-white"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <span className="text-[10px] font-semibold tracking-[0.08em]">STANDBY · 00:00</span>
                <div className="ml-auto flex items-center gap-2">
                  <select
                    aria-label="Video quality"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="rounded border border-white/15 bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-bone/85 focus:outline-none"
                  >
                    {QUALITIES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Fullscreen"
                    onClick={() => pushToast('Fullscreen needs an active stream.')}
                    className="hover:text-white"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-line px-4 py-3">
            <h3 className="text-[12.5px] font-bold text-bone">
              A More Connected World: live coverage continues
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Anchor desk coverage of the AI regulation vote, with correspondents in Brussels,
              Singapore and New York. Rolling updates every fifteen minutes.
            </p>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-bone">
              <Clock3 className="h-3.5 w-3.5 text-pulse" /> Today’s schedule
            </h3>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted/70">UTC</span>
          </div>
          <ul className="mt-3 space-y-2">
            {SCHEDULE.map((slot, i) => (
              <li
                key={slot.time}
                className={`rounded-[5px] border px-2.5 py-2 transition-colors ${
                  i === 1 ? 'border-pulse/40 bg-pulse/[0.07]' : 'border-line bg-ink-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold text-pulse">{slot.time}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {slot.desk}
                  </span>
                </div>
                <p className="mt-0.5 text-[11.5px] font-semibold text-bone/90">{slot.show}</p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => pushToast('Reminder saved for the next broadcast (demo).', 'success')}
            className="btn-ghost mt-3 w-full justify-center py-2 text-[11.5px]"
          >
            <BellRing className="h-3.5 w-3.5 text-pulse" /> Remind me before air
          </button>

          <p className="mt-3 text-[10px] leading-relaxed text-muted/70">
            Broadcast availability varies by region. All times shown in UTC.
          </p>
        </div>
      </div>
    </Modal>
  );
}
