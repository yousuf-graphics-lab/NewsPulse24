import { useMemo } from 'react';
import { Database, Flame, Grid3x3, Info, TrendingUp } from 'lucide-react';
import {
  Card,
  MicroLabel,
  Progress,
  SectionHead,
  Segmented,
  Tag,
  cx,
} from './ui';
import {
  RANGES,
  buildDashboard,
  buildHeatmap,
  formatCompact,
  formatNumber,
  sectionPerformance,
} from '../../lib/telemetry';
import { DB_KEY, storageReport } from '../../lib/db';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, index) => index);

const heatTone = (value, max) => {
  const ratio = value / Math.max(max, 1);
  if (!value) return 'bg-[#14151B] border-[#1D1E25]';
  if (ratio > 0.75) return 'bg-pulse border-pulse/70';
  if (ratio > 0.5) return 'bg-pulse/70 border-pulse/50';
  if (ratio > 0.3) return 'bg-pulse/45 border-pulse/35';
  if (ratio > 0.15) return 'bg-pulse/25 border-pulse/25';
  return 'bg-pulse/[0.12] border-pulse/20';
};

export default function AnalyticsView({ version, range, setRange }) {
  const data = useMemo(() => buildDashboard(range), [range, version]);
  const heat = useMemo(() => buildHeatmap(), [version]);
  const sections = useMemo(() => sectionPerformance(), [version]);
  const storage = useMemo(() => storageReport(), [version]);
  const maxSection = sections[0]?.reads || 1;
  const totalSectionReads = sections.reduce((sum, item) => sum + item.reads, 0) || 1;
  const heatTotal = heat.matrix.flat().reduce((sum, value) => sum + value, 0);
  const peakCell = heat.matrix
    .flatMap((row, day) => row.map((value, hour) => ({ value, day, hour })))
    .sort((a, b) => b.value - a.value)[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={Object.values(RANGES).map((item) => ({ id: item.id, label: item.label }))}
          value={range}
          onChange={setRange}
          size="md"
        />
        <p className="text-[10px] leading-snug text-[#6F7180]">
          Curves are modelled from publish times and read counters; heatmap uses real opens where this
          browser has them.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Reads in range', formatCompact(data.kpis.readsInRange), `${data.range.label} · modelled spread`, TrendingUp],
          ['Opens on this device', formatNumber(data.kpis.loggedReads), 'Real article opens, stored locally', Flame],
          ['Average per story', formatCompact(Math.round(data.kpis.readsInRange / Math.max(data.kpis.stories, 1))), `${data.kpis.stories} live stories`, Grid3x3],
          ['Database size', `${storage.kb.toFixed(1)} kB`, `${storage.posts} local posts · ${storage.events} events`, Database],
        ].map(([label, value, hint, Icon]) => (
          <Card key={label} className="p-3">
            <div className="flex items-center justify-between">
              <MicroLabel tone="bright">{label}</MicroLabel>
              <Icon className="h-3 w-3 text-[#5F616E]" />
            </div>
            <p className="mt-2 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-bone">{value}</p>
            <p className="mt-1.5 text-[10px] leading-snug text-[#7A7C89]">{hint}</p>
          </Card>
        ))}
      </div>

      <Card>
        <SectionHead
          title="Readership heatmap"
          description="Hour of day by weekday. Darker cells carry more opens."
          action={
            <Tag tone={heat.source === 'reads' ? 'green' : 'amber'}>
              {heat.source === 'reads' ? 'Real opens' : 'Publish-time model'}
            </Tag>
          }
        />
        <div className="overflow-x-auto px-3.5 py-3">
          <div className="min-w-[520px]">
            <div className="mb-1 flex items-center gap-[3px] pl-8">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="flex-1 text-center font-mono text-[7.5px] leading-none text-[#5F616E]"
                >
                  {hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}
                </span>
              ))}
            </div>
            {heat.matrix.map((row, day) => (
              <div key={DAYS[day]} className="mb-[3px] flex items-center gap-[3px]">
                <span className="w-8 shrink-0 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#6F7180]">
                  {DAYS[day]}
                </span>
                {row.map((value, hour) => (
                  <div
                    key={hour}
                    title={`${DAYS[day]} ${String(hour).padStart(2, '0')}:00 — ${value} ${
                      heat.source === 'reads' ? 'opens' : 'weighted publishes'
                    }`}
                    className={cx(
                      'h-5 flex-1 rounded-[2px] border transition-colors',
                      heatTone(value, heat.max),
                    )}
                  />
                ))}
              </div>
            ))}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[9.5px] text-[#6F7180]">
                <Info className="h-3 w-3" />
                Peak window · {DAYS[peakCell?.day ?? 0]} {String(peakCell?.hour ?? 0).padStart(2, '0')}:00
                <span className="text-[#3F414C]">·</span>
                {heatTotal} {heat.source === 'reads' ? 'opens' : 'data points'}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[8.5px] uppercase tracking-[0.1em] text-[#5F616E]">Low</span>
                {[0.08, 0.2, 0.4, 0.65, 1].map((step) => (
                  <span
                    key={step}
                    className="h-2.5 w-4 rounded-[1px] border border-pulse/20"
                    style={{ background: `rgba(255,16,36,${step})` }}
                  />
                ))}
                <span className="text-[8.5px] uppercase tracking-[0.1em] text-[#5F616E]">High</span>
              </div>
            </div>
            <p className="mt-2 rounded-[3px] border border-[#262832] bg-[#0A0B0F] px-2 py-1.5 font-mono text-[9.5px] text-[#8A8C99]">
              {DAYS[peakCell?.day ?? 0]} peak · {peakCell?.value ?? 0} weight ·{' '}
              {formatNumber(data.kpis.loggedReads)} device opens · {formatNumber(data.kpis.readsInRange)}{' '}
              reads in {data.range.label.toLowerCase()}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead title="Section performance" description="Ranked by total reads across live stories." />
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1D1E25] text-[8.5px] uppercase tracking-[0.14em] text-[#6F7180]">
                <th className="px-3.5 py-1.5 font-bold">Desk</th>
                <th className="px-2 py-1.5 font-bold">Stories</th>
                <th className="px-2 py-1.5 font-bold">Reads</th>
                <th className="px-2 py-1.5 font-bold">Avg</th>
                <th className="px-3.5 py-1.5 font-bold">Share</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.category} className="border-b border-[#1B1C22] last:border-b-0">
                  <td className="px-3.5 py-1.5 text-[10.5px] font-semibold text-bone/85">{section.category}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-[#8A8C99]">{section.stories}</td>
                  <td className="px-2 py-1.5 text-[10.5px] text-bone/80">{formatCompact(section.reads)}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px] text-[#7A7C89]">
                    {formatCompact(section.average)}
                  </td>
                  <td className="px-3.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16">
                        <Progress value={section.reads} max={maxSection} />
                      </div>
                      <span className="w-8 text-right font-mono text-[9px] text-[#6F7180]">
                        {Math.round((section.reads / totalSectionReads) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionHead
            title="Story leaderboard"
            description="Reads per minute since publication."
            action={<MicroLabel>{data.range.label}</MicroLabel>}
          />
          <ol className="divide-y divide-[#1B1C22]">
            {data.topStories.map(({ story, reads, perMinute, localReads }) => (
              <li key={story.id} className="px-3.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <MicroLabel tone="bright">{story.category}</MicroLabel>
                  <span className="font-mono text-[9px] text-[#6F7180]">
                    {perMinute >= 1000 ? formatCompact(perMinute) : perMinute}/min
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[10.5px] font-semibold text-bone/85">{story.title}</p>
                <p className="text-[9px] text-[#5F616E]">
                  {formatCompact(reads)} reads
                  {localReads ? <span className="text-emerald-400/80"> · {localReads} here</span> : null}
                </p>
              </li>
            ))}
          </ol>
          <div className="border-t border-[#1D1E25] px-3.5 py-2">
            <div className="flex items-center justify-between text-[9.5px] text-[#6F7180]">
              <span>Audit entries retained</span>
              <span className="font-mono text-bone/70">{storage.audit} / 200</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[9.5px] text-[#6F7180]">
              <span>Read events retained</span>
              <span className="font-mono text-bone/70">{formatNumber(storage.events)} / 6,000</span>
            </div>
            <p className="mt-1.5 text-[9px] leading-snug text-[#4F5160]">
              Stored in this browser under <span className="font-mono">{DB_KEY}</span>. Export a
              backup from Settings before clearing site data.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
