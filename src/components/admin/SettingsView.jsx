import { useMemo, useRef, useState } from 'react';
import {
  Database as DatabaseIcon,
  Download,
  HardDriveDownload,
  Pin,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  MicroLabel,
  Progress,
  SectionHead,
  Select,
  Tag,
  Toggle,
  cx,
} from './ui';
import {
  allPosts,
  applyContent,
  getSettings,
  resetAllContent,
  resetReads,
  updateSettings,
} from '../../lib/contentStore';
import {
  DB_KEY,
  DB_VERSION,
  exportDatabase,
  exportFile,
  importDatabase,
  logEvent,
  storageReport,
} from '../../lib/db';
import { formatNumber } from '../../lib/telemetry';

const SLOTS = [
  ['heroPins', 'Hero carousel', 3],
  ['tickerPins', 'Ticker lead', 4],
];

export default function SettingsView({ version, notify }) {
  const settings = getSettings();
  const [report, setReport] = useState(() => storageReport());
  const [importState, setImportState] = useState(null);
  const fileRef = useRef(null);
  const posts = useMemo(
    () => allPosts().filter((post) => post.status === 'published'),
    [version],
  );

  const refresh = () => setReport(storageReport());

  const setPin = (key, index, slug) => {
    const current = [...(settings[key] || [])];
    if (!slug) current.splice(index, 1);
    else current[index] = slug;
    const deduped = [...new Set(current.filter(Boolean))].slice(0, key === 'heroPins' ? 3 : 4);
    updateSettings({ [key]: deduped });
    refresh();
  };

  const removePin = (key, slug) => {
    updateSettings({ [key]: (settings[key] || []).filter((item) => item !== slug) });
    refresh();
  };

  const doExport = () => {
    exportFile(`newspulse24-database-${new Date().toISOString().slice(0, 10)}.json`);
    logEvent('security', 'Database exported', `${report.posts} local posts · ${report.kb.toFixed(1)} kB`);
    notify('Database exported as JSON', 'success');
  };

  const doImport = async (file) => {
    if (!file) return;
    setImportState('reading');
    const text = await file.text();
    const result = importDatabase(text);
    if (!result.ok) {
      setImportState(result.reason);
      notify(
        result.reason === 'newer-schema'
          ? 'That backup was written by a newer schema'
          : 'That file is not a NewsPulse 24 database',
        'error',
      );
      return;
    }
    applyContent();
    setImportState('ok');
    refresh();
    logEvent('security', 'Database imported', file.name);
    notify('Database restored from backup', 'success');
  };

  const resetContent = () => {
    if (!window.confirm('Restore every shipped story and remove all local posts, pins and the override?')) return;
    resetAllContent();
    applyContent();
    refresh();
    logEvent('security', 'Content reset to shipped dataset');
    notify('Content restored to the shipped dataset', 'success');
  };

  const clearTelemetry = () => {
    if (!window.confirm('Delete all locally recorded read telemetry? Story read counters are unchanged.')) return;
    resetReads();
    refresh();
    logEvent('security', 'Read telemetry cleared');
    notify('Read telemetry cleared', 'success');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Front page slots"
            description="These pins override the automatic editorial order for the hero carousel and ticker."
            action={<Tag tone="red">Editorial</Tag>}
          />
          <div className="space-y-3 px-3.5 py-3">
            {SLOTS.map(([key, label, max]) => {
              const pins = settings[key] || [];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <MicroLabel tone="bright">{label}</MicroLabel>
                    <span className="font-mono text-[9px] text-[#6F7180]">
                      {pins.length}/{max} pinned
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {Array.from({ length: max }, (_, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <span className="w-4 font-mono text-[9px] text-[#5F616E]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <Select
                          aria-label={`${label} slot ${index + 1}`}
                          value={pins[index] || ''}
                          onChange={(event) => setPin(key, index, event.target.value)}
                          className="h-7 text-[10.5px]"
                        >
                          <option value="">— automatic —</option>
                          {posts.map((post) => (
                            <option key={post.id} value={post.slug}>
                              {post.category} · {post.title.slice(0, 54)}
                            </option>
                          ))}
                        </Select>
                        {pins[index] ? (
                          <button
                            type="button"
                            onClick={() => removePin(key, pins[index])}
                            aria-label={`Clear ${label} slot ${index + 1}`}
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] border border-[#262832] text-[#7A7C89] hover:text-pulse"
                          >
                            <Pin className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="h-7 w-7 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border-t border-[#1D1E25] pt-2.5">
              <Toggle
                checked={settings.autoRebalance !== false}
                onChange={(value) => {
                  updateSettings({ autoRebalance: value });
                  logEvent('content', value ? 'Auto-rebalance on' : 'Auto-rebalance off');
                  notify(value ? 'Slots rebalance automatically' : 'Slots stay as pinned', 'success');
                }}
                label="Auto-rebalance empty slots"
                hint="On: unpinned slots fill with the newest breaking, then the most read. Off: only pinned and breaking stories take slots."
              />
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead
            title="Backup & restore"
            description="The whole database as portable JSON — posts, pins, telemetry, staff and the audit trail."
            action={
              <Tag tone={report.bytes > 900_000 ? 'amber' : 'green'}>
                {report.bytes > 900_000 ? 'Filling up' : 'Healthy'}
              </Tag>
            }
          />
          <div className="space-y-3 px-3.5 py-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Size', `${report.kb.toFixed(1)} kB`],
                ['Local posts', report.posts],
                ['Read events', formatNumber(report.events)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5">
                  <MicroLabel>{label}</MicroLabel>
                  <p className="mt-1 text-[12px] font-bold text-bone/90">{value}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between text-[9.5px] text-[#6F7180]">
                <span>Browser storage estimate</span>
                <span className="font-mono">{Math.min(100, Math.round((report.bytes / 1_000_000) * 100))}% of 1 MB</span>
              </div>
              <div className="mt-1">
                <Progress value={report.bytes} max={1_000_000} tone={report.bytes > 900_000 ? 'red' : 'green'} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="md" onClick={doExport}>
                <Download className="h-3.5 w-3.5" /> Export database
              </Button>
              <Button variant="ghost" size="md" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Import backup
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  doImport(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              {importState === 'ok' ? <Tag tone="green">Restored</Tag> : null}
              {importState && importState !== 'ok' && importState !== 'reading' ? (
                <Tag tone="red">{importState}</Tag>
              ) : null}
            </div>

            <div className="rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <DatabaseIcon className="h-3 w-3 text-[#6F7180]" />
                <MicroLabel>Storage document</MicroLabel>
              </div>
              <dl className="mt-1.5 space-y-1 font-mono text-[9px] text-[#8A8C99]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">key</dt>
                  <dd className="truncate">{DB_KEY}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">schema</dt>
                  <dd>v{DB_VERSION}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">created</dt>
                  <dd>{report.createdAt ? new Date(report.createdAt).toISOString().slice(0, 19) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">updated</dt>
                  <dd>{report.updatedAt ? new Date(report.updatedAt).toISOString().slice(0, 19) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5F616E]">stories</dt>
                  <dd>{exportDatabase().stories} on the wire</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Desk weights"
            description="How strongly each desk is preferred in the automatic hero and ticker order. Newest breaks ties."
            action={<Tag>{Object.keys(settings.desks || {}).length} tuned</Tag>}
          />
          <div className="space-y-2 px-3.5 py-3">
            {['World', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'Science', 'Lifestyle', 'Opinion'].map(
              (desk) => {
                const weight = Number(settings.desks?.[desk] ?? 1);
                return (
                  <div key={desk} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-[10.5px] text-[#9A9CAA]">{desk}</span>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.5"
                      value={weight}
                      aria-label={`${desk} weight`}
                      onChange={(event) =>
                        updateSettings({
                          desks: { ...(settings.desks || {}), [desk]: Number(event.target.value) },
                        })
                      }
                      className="h-1 flex-1 accent-[#FF1024]"
                    />
                    <span className="w-7 text-right font-mono text-[9.5px] text-[#7A7C89]">×{weight}</span>
                  </div>
                );
              },
            )}
            <p className="pt-1 text-[9px] leading-snug text-[#4F5160]">
              Weights are applied live by the editorial selectors and stored with the database, so they
              survive a reload and an export/import round trip.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHead
            title="Danger zone"
            description="Irreversible resets. Export a backup first."
            action={<Tag tone="red">Destructive</Tag>}
          />
          <div className="space-y-2 px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-bone/85">Restore shipped dataset</p>
                <p className="text-[9.5px] leading-snug text-[#6F7180]">
                  Removes local posts, pins, desk weights and the override.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={resetContent}>
                <RotateCcw className="h-3 w-3" /> Reset content
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-bone/85">Clear read telemetry</p>
                <p className="text-[9.5px] leading-snug text-[#6F7180]">
                  Wipes the {formatNumber(report.events)} locally recorded opens and the heatmap.
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={clearTelemetry}>
                <Trash2 className="h-3 w-3" /> Clear telemetry
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[3px] border border-pulse/25 bg-pulse/[0.05] px-2.5 py-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-pulse-400">
                  <ShieldAlert className="h-3 w-3" /> Storage self-check
                </p>
                <p className="text-[9.5px] leading-snug text-[#8A8C99]">
                  Writes are atomic; this verifies the document round-trips through JSON.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    JSON.parse(JSON.stringify(exportDatabase()));
                    notify('Database round-trip verified', 'success');
                  } catch {
                    notify('Database could not be serialised', 'error');
                  }
                }}
              >
                <HardDriveDownload className="h-3 w-3" /> Verify
              </Button>
            </div>
            <Field label="Retention">
              <div className={cx('flex items-center gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5', 'text-[9.5px] text-[#7A7C89]')}>
                Capped at 400 events per story, 6,000 in total and 200 audit rows.
              </div>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
