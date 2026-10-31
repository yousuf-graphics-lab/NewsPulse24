import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  AudioLines,
  Blocks,
  Edit3,
  Flame,
  Gauge,
  Globe2,
  Layers,
  Megaphone,
  Pencil,
  Pin,
  Play,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Signal,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  Delta,
  Field,
  IconButton,
  MicroLabel,
  Progress,
  SectionHead,
  Segmented,
  Tag,
  TextInput,
  Toggle,
  cx,
} from './ui';
import Sparkline from './charts/Sparkline';
import TrafficChart from './charts/TrafficChart';
import {
  CHART_SERIES,
  RANGES,
  buildDashboard,
  formatCompact,
  formatNumber,
  relativeClock,
  sectionPerformance,
} from '../../lib/telemetry';
import { logEvent, storageReport } from '../../lib/db';
import { getSettings, updateSettings } from '../../lib/contentStore';

const LOG_TABS = [
  { id: 'all', label: 'All' },
  { id: 'content', label: 'Newsroom' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'security', label: 'Security' },
];

const SLOT_LABELS = ['Hero slot 1', 'Top stories', 'Grid 2', 'Grid 3', 'Grid 4'];

function KpiCard({ label, value, delta, hint, spark, children, icon: Icon }) {
  return (
    <Card className="flex flex-col p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <MicroLabel tone="bright">{label}</MicroLabel>
          {Icon ? <Icon className="h-3 w-3 text-[#5F616E]" /> : null}
        </div>
        {delta != null ? (
          <span className="flex items-center gap-1">
            <Delta value={delta} />
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-[26px] font-extrabold leading-none tracking-[-0.03em] text-bone">{value}</p>
        {spark ? (
          <div className="h-[34px] w-[92px] shrink-0 opacity-90">
            <Sparkline values={spark} />
          </div>
        ) : null}
      </div>

      {hint ? <p className="mt-1.5 text-[10px] leading-snug text-[#7A7C89]">{hint}</p> : null}
      {children ? <div className="mt-2.5 border-t border-[#1D1E25] pt-2">{children}</div> : null}
    </Card>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#5F616E]">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold text-bone/85">{value}</p>
    </div>
  );
}

export default function MissionControl({
  version,
  range,
  setRange,
  onGoLedger,
  onEdit,
  onPreview,
  onOverride,
  onAutoBalance,
  notify,
}) {
  const [series, setSeries] = useState('all');
  const [logTab, setLogTab] = useState('all');
  const [note, setNote] = useState('');
  const [tick, setTick] = useState(0);
  const settings = getSettings();
  const storage = storageReport();

  useEffect(() => {
    if (settings.autoSync === false) return undefined;
    const timer = window.setInterval(() => setTick((value) => value + 1), 5000);
    return () => window.clearInterval(timer);
  }, [settings.autoSync]);

  const data = useMemo(
    () => buildDashboard(range),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, version, tick],
  );
  const sections = useMemo(() => sectionPerformance(), [version, tick]);
  const chart = data.series[series];
  const points = chart?.points || [];
  const spark = points.slice(-12).map((point) => point.value);
  const topShare = sections[0]?.reads ? Math.round((sections[0].reads / (sections[0].reads + (sections[1]?.reads || 1))) * 100) : 0;
  const log = data.audit.filter((entry) => logTab === 'all' || entry.type === logTab);
  const peakAnnotation = data.annotations.find((annotation) => annotation.kind === 'peak');
  const chartAnnotations =
    chart === data.series.all
      ? data.annotations.filter(
          (annotation) =>
            annotation.kind === 'peak' ||
            Math.abs(annotation.index - (peakAnnotation?.index ?? -99)) > 2,
        )
      : [];
  const override = settings.override;

  const transmit = () => {
    const text = note.trim();
    if (!text) return;
    logEvent('broadcast', 'Broadcast note transmitted', text);
    setNote('');
    notify('Note added to the command log', 'success');
  };

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={Object.values(RANGES).map((item) => ({ id: item.id, label: item.label }))}
          value={range}
          onChange={setRange}
          size="md"
        />
        <span className="flex items-center gap-1.5 rounded-[4px] border border-[#262832] bg-[#0E0F14] px-2 py-[5px]">
          <span className={cx('h-1.5 w-1.5 rounded-full', settings.autoSync === false ? 'bg-[#5F616E]' : 'bg-pulse')} />
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A8C99]">
            Auto-sync {settings.autoSync === false ? 'off' : '5s'}
          </span>
        </span>
        {override ? (
          <span className="flex items-center gap-1.5 rounded-[4px] border border-pulse/40 bg-pulse/[0.09] px-2 py-[5px]">
            <Megaphone className="h-3 w-3 text-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-pulse">Override live</span>
            <span className="max-w-[220px] truncate text-[9.5px] text-bone/75">{override.headline}</span>
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="md" onClick={onPreview}>
            <ArrowUpRight className="h-3.5 w-3.5" /> View site
          </Button>
          <Button variant="danger" size="md" onClick={onOverride}>
            <ShieldAlert className="h-3.5 w-3.5" /> {override ? 'Edit breaking override' : 'Emergency breaking override'}
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Reads in view"
          value={formatCompact(data.kpis.readsInRange)}
          delta={data.kpis.readsDelta}
          hint={`${data.range.label} · vs previous period`}
          spark={spark}
          icon={Gauge}
        >
          <div className="flex items-center justify-between">
            <MicroLabel>Velocity</MicroLabel>
            <span className="text-[10.5px] font-bold text-bone/85">
              {formatNumber(Math.round(data.kpis.readsInRange / Math.max(data.range.buckets, 1)))} / bucket
            </span>
          </div>
        </KpiCard>

        <KpiCard
          label="Latest bucket"
          value={formatNumber(data.kpis.live)}
          delta={data.kpis.liveDelta}
          hint="Most recent interval in the selected range"
          spark={points.slice(-16).map((point) => point.value)}
          icon={Activity}
        >
          <div className="flex items-center justify-between">
            <MicroLabel>Dominant desk</MicroLabel>
            <span className="truncate text-[10.5px] font-bold text-bone/85">
              {sections[0]?.category || '—'} · {topShare}%
            </span>
          </div>
        </KpiCard>

        <KpiCard
          label="Stories on the wire"
          value={formatNumber(data.kpis.stories)}
          hint={`${formatNumber(data.kpis.words)} words · ${data.kpis.published24h} filed in the last 24h`}
          icon={Layers}
        >
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Breaking" value={data.kpis.breaking} />
            <MiniStat label="Drafts" value={data.kpis.drafts} />
          </div>
        </KpiCard>

        <KpiCard label="Section coverage" value={`${data.kpis.desks}/${data.kpis.desksTotal}`} icon={Globe2} hint="Desks with at least one live story">
          <Progress value={data.kpis.covered} max={data.kpis.desksTotal} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <MiniStat label="Taken down" value={data.kpis.takenDown} />
            <MiniStat label="Reads here" value={data.kpis.loggedReads} />
            <MiniStat label="Wire rate" value={`${data.kpis.published24h}/24h`} />
          </div>
        </KpiCard>
      </div>

      {/* chart + live desk */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 pb-1 pt-3">
            <div className="min-w-0">
              <h2 className="text-[12.5px] font-extrabold uppercase leading-none tracking-[0.1em] text-bone">
                Concurrent readership &amp; breaking surges
              </h2>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#8A8C99]">
                Modelled from publish time and each story&rsquo;s read counter, plus real opens logged on
                this device.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MicroLabel>{data.range.label}</MicroLabel>
              <Segmented
                options={CHART_SERIES}
                value={series}
                onChange={setSeries}
                className="hidden sm:inline-flex"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 pb-1 sm:hidden">
            <Segmented options={CHART_SERIES} value={series} onChange={setSeries} />
          </div>

          <div className="px-2 pb-1 pt-2">
            <TrafficChart
              current={chart}
              previous={data.previous}
              annotations={chartAnnotations}
              range={data.range}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#1D1E25] px-3.5 py-2.5 sm:grid-cols-4">
            {[
              ['Peak interval', `${formatNumber(points[chart?.peakIndex]?.value || 0)}`],
              ['Average', `${formatNumber(Math.round((chart?.total || 0) / Math.max(points.length, 1)))}`],
              ['Top desk', sections[0]?.category || '—'],
              ['Publishes', `${data.kpis.published24h} / 24h`],
            ].map(([label, value]) => (
              <div key={label}>
                <MicroLabel>{label}</MicroLabel>
                <p className="mt-1 text-[11.5px] font-bold text-bone/90">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* live desk */}
        <Card>
          <div className="flex items-center justify-between border-b border-[#22232A] px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-[3px] border border-[#2A2C36] bg-[#15161C]">
                <Play className="ml-[1px] h-2.5 w-2.5 fill-[#9A9CAA] text-[#9A9CAA]" />
              </span>
              <h2 className="text-[12px] font-extrabold uppercase leading-none tracking-[0.1em] text-bone">
                NewsPulse 24 Live TV
              </h2>
            </div>
            <Tag tone="red">
              <span className="h-1 w-1 rounded-full bg-pulse" /> Preview
            </Tag>
          </div>

          <div className="p-3">
            <div className="relative overflow-hidden rounded-[4px] border border-[#2A2C36] bg-black">
              <img
                src="/images/live-studio.jpg"
                alt="NewsPulse 24 broadcast studio"
                loading="lazy"
                className="h-[132px] w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              <div className="absolute inset-x-2 top-2 flex items-center justify-between">
                <span className="rounded-[2px] bg-black/70 px-1.5 py-[2px] font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-bone/80">
                  FEED 1A · MAIN CONTROL
                </span>
                <span className="rounded-[2px] bg-black/70 px-1.5 py-[2px] font-mono text-[8px] text-bone/70">
                  1080p · REC
                </span>
              </div>
              <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/50 backdrop-blur-sm">
                <Play className="ml-[2px] h-3.5 w-3.5 fill-white text-white" />
              </span>
              <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
                <MicroLabel className="text-bone/60">CH1</MicroLabel>
                <div className="flex flex-1 items-end gap-[2px]">
                  {[9, 14, 7, 16, 11, 18, 8, 13, 6, 15, 10, 17].map((height, index) => (
                    <span
                      key={index}
                      className="w-full rounded-[1px] bg-gradient-to-t from-pulse/50 to-pulse"
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[8px] text-bone/60">-3.2 dB</span>
              </div>
            </div>

            <dl className="mt-2.5 space-y-1.5 text-[10.5px]">
              {[
                ['Programme', 'The Global Desk · hour 2'],
                ['Rundown', `${data.kpis.stories} packages queued`],
                ['Studio feed', 'Still frame (no ingest configured)'],
                ['Next up', 'Markets close · 21:00 UTC'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[#7A7C89]">{label}</dt>
                  <dd className="truncate text-right font-semibold text-bone/85">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2.5 border-t border-[#1D1E25] pt-2.5">
              <Toggle
                checked={settings.autoSync !== false}
                onChange={(value) => {
                  updateSettings({ autoSync: value });
                  notify(value ? 'Telemetry auto-sync enabled' : 'Telemetry auto-sync paused', 'success');
                }}
                label="Auto-sync telemetry"
                hint="Recomputes the dashboard every five seconds."
              />
            </div>

            <ul className="mt-2.5 space-y-1 border-t border-[#1D1E25] pt-2.5">
              {data.topStories.slice(0, 3).map(({ story, reads }, index) => (
                <li key={story.id} className="flex items-center gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#2A2C36] text-[7.5px] font-bold text-[#7A7C89]">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[9.5px] text-bone/75">{story.title}</p>
                  <span className="shrink-0 font-mono text-[8.5px] text-[#6F7180]">{formatCompact(reads)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2.5 flex items-center gap-2 rounded-[4px] border border-[#262832] bg-[#0A0B0F] px-2 py-1.5">
              <Signal className="h-3 w-3 shrink-0 text-emerald-400/80" />
              <p className="min-w-0 flex-1 truncate text-[9.5px] text-[#7A7C89]">
                Wire healthy · {data.kpis.breaking} breaking · {data.kpis.drafts} incl. drafts
              </p>
              <Link to="/live" className="text-[9px] font-bold uppercase tracking-[0.1em] text-pulse hover:text-white">
                Open desk
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* trending + command log */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Trending editorial priority & slotting"
            description="Top stories ordered by read velocity and distribution impact."
            action={
              <button
                type="button"
                onClick={onGoLedger}
                className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-pulse hover:text-white"
              >
                View all stories <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <ol className="divide-y divide-[#1B1C22]">
            {data.topStories.map(({ story, slot, reads, perMinute, localReads }) => (
              <li key={story.id} className="group flex items-center gap-2.5 px-3.5 py-2">
                <span className="w-4 shrink-0 font-mono text-[10px] text-[#5F616E]">
                  {String(slot + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <MicroLabel tone="bright">{story.category} desk</MicroLabel>
                    <span className="text-[9px] text-[#5F616E]">{formatCompact(reads)} reads</span>
                    <span className="text-[9px] text-[#3F414C]">·</span>
                    <span className="whitespace-nowrap text-[9px] text-[#7A7C89]">
                      ≈ {perMinute >= 1000 ? formatCompact(perMinute) : perMinute}/min
                    </span>
                    {localReads ? <Tag tone="green">{localReads} here</Tag> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEdit(story.id)}
                    className="mt-0.5 block max-w-full truncate text-left text-[11.5px] font-semibold text-bone/90 transition-colors group-hover:text-white"
                  >
                    {story.title}
                  </button>
                </div>
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  <Tag tone={slot === 0 ? 'live' : slot === 1 ? 'red' : 'muted'}>
                    {override?.slug === story.slug ? 'Override' : SLOT_LABELS[slot] || `Grid ${slot}`}
                  </Tag>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <IconButton label={`Edit ${story.title}`} onClick={() => onEdit(story.id)}>
                    <Pencil className="h-3 w-3" />
                  </IconButton>
                  <IconButton
                    label={`Pin ${story.title} to the hero`}
                    onClick={() => {
                      const pins = [story.slug, ...(settings.heroPins || []).filter((slug) => slug !== story.slug)].slice(0, 3);
                      updateSettings({ heroPins: pins });
                      notify(`Pinned “${story.title}” to hero slot 1`, 'success');
                    }}
                  >
                    <Pin className="h-3 w-3" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1D1E25] px-3.5 py-2.5">
            <p className="text-[10px] text-[#6F7180]">
              Auto-balance pins the three fastest stories to the hero and four to the ticker.
            </p>
            <Button variant="ghost" size="sm" onClick={onAutoBalance}>
              <RefreshCw className="h-3 w-3" /> Auto-rebalance slots
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="space-y-2 border-b border-[#22232A] px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-3.5 w-3.5 text-pulse" />
                <h2 className="text-[12px] font-extrabold uppercase leading-none tracking-[0.1em] text-bone">
                  Command log &amp; alerts
                </h2>
              </div>
              <span className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.12em] text-emerald-400/85">
                <span className="h-1 w-1 rounded-full bg-emerald-400" /> Nominal
              </span>
            </div>
            <Segmented options={LOG_TABS} value={logTab} onChange={setLogTab} />
          </div>

          <ul className="max-h-[252px] flex-1 divide-y divide-[#1B1C22] overflow-y-auto">
            {log.slice(0, 14).map((entry) => (
              <li key={entry.id} className="px-3.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Tag tone={entry.type === 'security' ? 'amber' : entry.type === 'broadcast' ? 'red' : 'muted'}>
                    [{entry.type || 'log'}]
                  </Tag>
                  <span className="font-mono text-[8.5px] uppercase text-[#5F616E]">
                    {new Date(entry.at).toLocaleTimeString('en-GB', { hour12: false })} UTC
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] leading-snug text-bone/85">{entry.action}</p>
                {entry.detail ? (
                  <p className="truncate text-[9.5px] leading-snug text-[#6F7180]">{entry.detail}</p>
                ) : null}
              </li>
            ))}
            {!log.length ? (
              <li className="px-3.5 py-4 text-[10.5px] text-[#6F7180]">Nothing logged in this filter yet.</li>
            ) : null}
            {log.length > 0 && log.length < 5 ? (
              <li className="px-3.5 py-3 text-[9.5px] leading-relaxed text-[#4F5160]">
                New events — publishes, takedowns, overrides and sign-ins — appear here as they happen.
              </li>
            ) : null}
          </ul>

          <ul className="space-y-1 border-t border-[#1D1E25] px-3.5 py-2">
            {[
              ['Override', override ? 'Live on every page' : 'Standby', override ? 'red' : 'muted'],
              ['Wire', `${data.kpis.breaking} breaking · ${data.kpis.drafts} drafts`, 'muted'],
              ['Slots', `${settings.heroPins?.length || 0} hero · ${settings.tickerPins?.length || 0} ticker pinned`, 'muted'],
              ['Storage', `${(storage.kb || 0).toFixed(1)} kB in this browser`, 'muted'],
            ].map(([label, value, tone]) => (
              <li key={label} className="flex items-center justify-between gap-2">
                <MicroLabel>{label}</MicroLabel>
                <span className="flex items-center gap-1 text-[9.5px] text-bone/75">
                  <Tag tone={tone}>{value}</Tag>
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-[#1D1E25] p-2.5">
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                transmit();
              }}
            >
              <TextInput
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Broadcast flash note to the active desk…"
                aria-label="Broadcast note"
                maxLength={140}
                className="h-8"
              />
              <Button type="submit" variant="ghost" size="sm" disabled={!note.trim()}>
                <Send className="h-3 w-3" /> Transmit
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* desk performance strip */}
      <Card>
        <SectionHead
          title="Desk distribution"
          description="Readership split across the nine desks, from the story read counters."
          action={<MicroLabel><Blocks className="mr-1 inline h-3 w-3" /> {formatNumber(data.kpis.readsInRange)} in view</MicroLabel>}
        />
        <div className="grid gap-x-4 gap-y-2 px-3.5 py-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <div key={section.category} className="flex items-center gap-2">
              <span className="w-[76px] shrink-0 truncate text-[10.5px] text-[#9A9CAA]">{section.category}</span>
              <Progress value={section.reads} max={sections[0]?.reads || 1} />
              <span className="w-10 shrink-0 text-right font-mono text-[9.5px] text-[#7A7C89]">
                {formatCompact(section.reads)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
