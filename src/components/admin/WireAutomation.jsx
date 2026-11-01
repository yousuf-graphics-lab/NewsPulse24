import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Clock3,
  ExternalLink,
  FlaskConical,
  Info,
  Pencil,
  Play,
  Plus,
  Radar,
  RefreshCw,
  Rss,
  Send,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
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
import { CATEGORIES } from '../../data/news';
import {
  FEED_CATALOG,
  addChannel,
  discoverFeeds,
  fetchFeedDetailed,
  queueStory,
  readAutomation,
  rejectQueueItem,
  removeQueueItem,
  runAutomationCycle,
  sourceHost,
  updateAutomation,
} from '../../lib/automation';
import { formatNumber, relativeClock } from '../../lib/telemetry';

const QUEUE_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'published', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
];

const LOG_TONE = {
  error: 'text-pulse-400',
  warn: 'text-amber-400',
  success: 'text-emerald-400',
  info: 'text-[#9A9CAA]',
};

const blankSource = () => ({
  id: `src-${Date.now().toString(36)}`,
  name: '',
  url: '',
  section: '',
  weight: 1,
  enabled: true,
});

const statusTone = (source) => {
  if (!source.lastFetchedAt) return 'idle';
  if (source.lastStatus === 'failed') return 'error';
  return 'ok';
};

const healthDot = {
  ok: 'bg-emerald-400',
  error: 'bg-pulse',
  idle: 'bg-[#5F616E]',
};

const healthText = {
  ok: 'text-emerald-300/90',
  error: 'text-pulse-400',
  idle: 'text-[#7A7C89]',
};

export default function WireAutomation({ version, notify, onEditDraft }) {
  const agent = useMemo(() => readAutomation(), [version]);
  const [queueTab, setQueueTab] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const [draftSource, setDraftSource] = useState(null);
  const [running, setRunning] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [discoverUrl, setDiscoverUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState([]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [route, setRoute] = useState(null);
  const [checking, setChecking] = useState(false);
  const [rules, setRules] = useState(() => ({
    mode: agent.mode,
    intervalMinutes: agent.intervalMinutes,
    maxPerHour: agent.maxPerHour,
    minScore: agent.minScore,
    maxAgeHours: agent.maxAgeHours,
    enrich: agent.enrich,
    proxy: agent.proxy,
    useSourceImages: agent.useSourceImages,
    sections: agent.sections,
  }));
  const [, setClock] = useState(0);

  // Keeps the "next run" countdown honest without re-reading the database.
  useEffect(() => {
    const timer = window.setInterval(() => setClock((value) => value + 1), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const queue = agent.queue.filter((item) => item.status === queueTab);
  const pending = agent.queue.filter((item) => item.status === 'pending').length;
  const enabledSources = agent.sources.filter((source) => source.enabled);
  const failing = enabledSources.filter((source) => statusTone(source) === 'error').length;
  const nextRun = agent.enabled
    ? agent.lastRunAt
      ? new Date(new Date(agent.lastRunAt).getTime() + agent.intervalMinutes * 60_000)
      : new Date()
    : null;
  const diagnostics = agent.diagnostics;
  const allFailed = Boolean(
    diagnostics?.channels?.length && diagnostics.channels.every((channel) => !channel.ok),
  );
  const firstError = diagnostics?.channels?.find((channel) => !channel.ok)?.error || '';

  const addSource = (source) => {
    if (!/^https?:\/\/.+/i.test(source.url)) {
      notify('Feed URL must start with http:// or https://', 'error');
      return;
    }
    const name = source.name.trim() || sourceHost(source.url);
    updateAutomation({
      sources: [...agent.sources.filter((item) => item.url !== source.url), { ...source, name, lastStatus: 'queued for its first run' }].slice(0, 30),
    });
    setDraftSource(null);
    notify(`${name} added to the wire`, 'success');
  };

  const addChannels = (channels) => {
    let next = agent.sources;
    for (const channel of channels) next = addChannel(channel, next);
    if (next.length === agent.sources.length) {
      notify('Those channels are already on the wire', 'default');
      return;
    }
    updateAutomation({ sources: next });
    notify(`${next.length - agent.sources.length} channel${next.length - agent.sources.length === 1 ? '' : 's'} added`, 'success');
  };

  const toggleSource = (source) =>
    updateAutomation({
      sources: agent.sources.map((item) => (item.id === source.id ? { ...item, enabled: !item.enabled } : item)),
    });

  const removeSource = (source) => {
    if (!window.confirm(`Remove ${source.name} from the wire?`)) return;
    updateAutomation({ sources: agent.sources.filter((item) => item.id !== source.id) });
    notify(`${source.name} removed`, 'success');
  };

  const testSource = async (source) => {
    if (testingId) return;
    setTestingId(source.id);
    try {
      const { items, via } = await fetchFeedDetailed(source, agent);
      updateAutomation({
        sources: agent.sources.map((item) =>
          item.id === source.id
            ? {
                ...item,
                lastFetchedAt: new Date().toISOString(),
                lastStatus: `${items.length} items reachable`,
                lastCount: items.length,
                lastVia: via,
                lastError: '',
              }
            : item,
        ),
      });
      notify(`${source.name}: ${items.length} items via ${via}`, 'success');
    } catch (error) {
      updateAutomation({
        sources: agent.sources.map((item) =>
          item.id === source.id ? { ...item, lastFetchedAt: new Date().toISOString(), lastStatus: 'failed', lastError: error.message } : item,
        ),
      });
      notify(`${source.name}: ${error.message}`.slice(0, 200), 'error');
    } finally {
      setTestingId(null);
    }
  };

  const checkRoute = async () => {
    if (checking) return;
    setChecking(true);
    const probe = enabledSources[0] || agent.sources[0];
    try {
      if (!probe) throw new Error('add a channel first');
      const { items, via } = await fetchFeedDetailed(probe, agent);
      setRoute({ ok: true, text: `${probe.name} answered with ${items.length} items via ${via}` });
      notify('Route to publishers is open', 'success');
    } catch (error) {
      setRoute({ ok: false, text: error.message });
      notify('Route check failed — see the note in Last run', 'error');
    } finally {
      setChecking(false);
    }
  };

  const runDiscover = async () => {
    if (!discoverUrl.trim() || discovering) return;
    setDiscovering(true);
    setDiscovered([]);
    try {
      const found = await discoverFeeds(discoverUrl.trim(), agent);
      setDiscovered(found);
      notify(`${found.length} feed${found.length === 1 ? '' : 's'} found on that site`, 'success');
    } catch (error) {
      notify(`Discovery failed: ${error.message}`, 'error');
    } finally {
      setDiscovering(false);
    }
  };

  const saveRules = () => {
    updateAutomation({
      ...rules,
      intervalMinutes: Number(rules.intervalMinutes) || 20,
      maxPerHour: Number(rules.maxPerHour) || 3,
      minScore: Number(rules.minScore) || 0,
      maxAgeHours: Number(rules.maxAgeHours) || 36,
    });
    notify('Agent rules saved', 'success');
  };

  const runNow = async () => {
    if (running) return;
    setRunning(true);
    notify('Reading the wire…', 'default');
    try {
      const result = await runAutomationCycle({ manual: true });
      if (result.skipped) {
        notify(`Nothing ran: ${result.reason}`, 'error');
      } else {
        notify(
          `Run complete · ${result.ingested} new · ${result.published} published${
            result.failures ? ` · ${result.failures} channel${result.failures === 1 ? '' : 's'} failed` : ''
          }`,
          result.ingested || !result.failures ? 'success' : 'error',
        );
      }
    } catch (error) {
      notify(`Run failed: ${error.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  const publishItem = (item) => {
    const result = queueStory(item.id);
    if (!result.ok) {
      notify('Could not publish that draft — check storage', 'error');
      return;
    }
    notify('Published with source attribution', 'success');
  };

  const catalogueBySection = useMemo(() => {
    const groups = new Map();
    for (const channel of FEED_CATALOG) {
      if (!groups.has(channel.section)) groups.set(channel.section, []);
      groups.get(channel.section).push(channel);
    }
    return [...groups.entries()];
  }, []);

  const wired = new Set(agent.sources.map((source) => source.url));

  return (
    <div className="space-y-3">
      {/* agent state */}
      <Card className="flex min-w-0 flex-wrap items-center gap-3 px-3.5 py-2.5">
        <span className="flex items-center gap-2">
          <span
            className={cx(
              'grid h-7 w-7 place-items-center rounded-[4px] border',
              agent.enabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-[#2A2C36] bg-[#15161C] text-[#7A7C89]',
            )}
          >
            <Bot className="h-4 w-4" />
          </span>
          <span className="leading-none">
            <span className="block text-[11.5px] font-bold text-bone">Wire agent {agent.enabled ? 'running' : 'paused'}</span>
            <span className="mt-[3px] flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-[#6F7180]">
              <span className={cx('h-1 w-1 rounded-full', agent.enabled ? 'bg-emerald-400' : 'bg-[#5F616E]')} />
              {agent.mode === 'auto' ? 'auto-publish' : 'approval queue'} · every {agent.intervalMinutes} min ·{' '}
              {enabledSources.length} live channel{enabledSources.length === 1 ? '' : 's'}
              {failing ? ` · ${failing} failing` : ''}
            </span>
          </span>
        </span>

        <span className="hidden items-center gap-1.5 rounded-[3px] border border-[#262832] bg-[#0A0B0F] px-2 py-[4px] sm:flex">
          <Clock3 className="h-3 w-3 text-[#6F7180]" />
          <span className="text-[9.5px] text-[#8A8C99]">
            {agent.lastRunAt ? `Last run ${relativeClock(agent.lastRunAt)}` : 'Waiting for its first run'}
            {nextRun && nextRun > new Date() ? ` · next ${nextRun.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Toggle
            checked={agent.enabled}
            onChange={(value) => {
              updateAutomation({ enabled: value });
              notify(value ? 'Wire agent enabled' : 'Wire agent paused', 'success');
            }}
            label={agent.enabled ? 'Agent on' : 'Agent off'}
          />
          <Button variant="ghost" size="sm" onClick={runNow} disabled={running}>
            <RefreshCw className={cx('h-3 w-3', running && 'animate-spin')} />
            {running ? 'Reading…' : 'Run now'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Awaiting approval', formatNumber(pending), `${agent.queue.length} in the queue`, Sparkles],
          ['Published by agent', formatNumber(agent.stats.published), `${agent.stats.ingested} items ingested`, Send],
          ['Runs', formatNumber(agent.stats.runs), agent.stats.lastRunAt ? `last ${relativeClock(agent.stats.lastRunAt)}` : 'not started', Play],
          [
            'Channels live',
            `${enabledSources.length}/${agent.sources.length}`,
            failing ? `${failing} failing — open the row for the reason` : 'enabled / configured',
            Rss,
          ],
        ].map(([label, value, hint, Icon]) => (
          <Card key={label} className="p-3">
            <div className="flex items-center justify-between">
              <MicroLabel tone="bright">{label}</MicroLabel>
              <Icon className="h-3 w-3 text-[#5F616E]" />
            </div>
            <p className="mt-2 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-bone">{value}</p>
            <p className="mt-1.5 truncate text-[10px] text-[#7A7C89]">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          {/* channels */}
          <Card>
            <SectionHead
              title="News channels"
              description="Public RSS, Atom or JSON feeds. The agent reads the newest item from every enabled channel on each run."
              action={
                <div className="flex items-center gap-1.5">
                  <Button variant="quiet" size="xs" onClick={() => setCatalogueOpen((open) => !open)}>
                    <Sparkles className="h-3 w-3" /> Catalogue
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setDraftSource(blankSource())}>
                    <Plus className="h-3 w-3" /> Add feed
                  </Button>
                </div>
              }
            />

            {/* auto-discovery */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#1D1E25] bg-[#0A0B0F] px-3.5 py-2.5">
              <Field label="Find a channel" hint="Paste any news site — the agent reads its advertised feeds and verifies them." className="min-w-[220px] flex-1">
                <div className="flex gap-1.5">
                  <TextInput
                    id="wire-discover"
                    value={discoverUrl}
                    onChange={(event) => setDiscoverUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runDiscover();
                    }}
                    placeholder="reuters.com, apnews.com, bbc.com/sport…"
                    className="h-8 font-mono text-[10.5px]"
                  />
                  <Button variant="primary" size="sm" onClick={runDiscover} disabled={discovering || !discoverUrl.trim()}>
                    <Radar className={cx('h-3 w-3', discovering && 'animate-spin')} />
                    {discovering ? 'Scanning' : 'Scan'}
                  </Button>
                </div>
              </Field>
            </div>

            {discovered.length ? (
              <div className="border-b border-[#1D1E25] bg-[#0B0C10] px-3.5 py-2.5">
                <MicroLabel tone="red">Found {discovered.length} working feed{discovered.length === 1 ? '' : 's'}</MicroLabel>
                <ul className="mt-1.5 space-y-1">
                  {discovered.map((feed) => (
                    <li key={feed.url} className="flex items-center gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-bone/90">{feed.name}</span>
                        <span className="block truncate font-mono text-[9px] text-[#5F616E]">{feed.url}</span>
                        {feed.samples?.[0] ? (
                          <span className="mt-0.5 block truncate text-[9px] italic text-[#7A7C89]">“{feed.samples[0]}”</span>
                        ) : null}
                      </span>
                      <Button
                        variant={wired.has(feed.url) ? 'quiet' : 'primary'}
                        size="xs"
                        disabled={wired.has(feed.url)}
                        onClick={() => {
                          updateAutomation({ sources: [...agent.sources, { ...feed, lastStatus: 'queued for its first run' }].slice(0, 30) });
                          setDiscovered((list) => list.filter((item) => item.url !== feed.url));
                          notify(`${feed.name} added`, 'success');
                        }}
                      >
                        {wired.has(feed.url) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        {wired.has(feed.url) ? 'On wire' : 'Add'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* catalogue */}
            {catalogueOpen ? (
              <div className="max-h-[290px] overflow-y-auto border-b border-[#1D1E25] bg-[#0A0B0F] px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <MicroLabel tone="bright">Channel catalogue · {FEED_CATALOG.length} feeds</MicroLabel>
                  <Button
                    variant="quiet"
                    size="xs"
                    onClick={() => addChannels(FEED_CATALOG.filter((channel) => channel.weight >= 1.2))}
                  >
                    <Plus className="h-3 w-3" /> Add {FEED_CATALOG.filter((channel) => channel.weight >= 1.2).length} flagships
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {catalogueBySection.map(([section, channels]) => (
                    <div key={section}>
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#6F7180]">{section}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {channels.map((channel) => {
                          const on = wired.has(channel.url);
                          return (
                            <button
                              key={channel.id}
                              type="button"
                              disabled={on}
                              onClick={() => addChannels([channel])}
                              title={channel.url}
                              className={cx(
                                'rounded-[3px] border px-1.5 py-[3px] text-[9px] font-semibold transition-colors',
                                on
                                  ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300/70'
                                  : 'border-[#2A2C36] text-[#9A9CAA] hover:border-pulse/40 hover:text-bone',
                              )}
                            >
                              {on ? '✓ ' : '+ '}
                              {channel.publisher} · {channel.name.split('·').pop().trim()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {draftSource ? (
              <div className="grid gap-2 border-b border-[#1D1E25] bg-[#0A0B0F] px-3.5 py-2.5 sm:grid-cols-[1fr_1.6fr_auto]">
                <Field label="Name">
                  <TextInput
                    value={draftSource.name}
                    onChange={(event) => setDraftSource({ ...draftSource, name: event.target.value })}
                    placeholder="The Guardian · World"
                    className="h-8"
                  />
                </Field>
                <Field label="Feed URL">
                  <TextInput
                    value={draftSource.url}
                    onChange={(event) => setDraftSource({ ...draftSource, url: event.target.value })}
                    placeholder="https://www.theguardian.com/world/rss"
                    className="h-8 font-mono text-[10.5px]"
                  />
                </Field>
                <div className="flex items-end gap-1.5 pb-[1px]">
                  <Button variant="primary" size="sm" onClick={() => addSource(draftSource)}>
                    <Check className="h-3 w-3" /> Save
                  </Button>
                  <Button variant="quiet" size="sm" onClick={() => setDraftSource(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : null}

            {agent.sources.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[660px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#1D1E25] text-[8.5px] uppercase tracking-[0.14em] text-[#6F7180]">
                      <th className="px-3.5 py-1.5 font-bold">Channel</th>
                      <th className="px-2 py-1.5 font-bold">Desk</th>
                      <th className="px-2 py-1.5 font-bold">Last fetch</th>
                      <th className="px-2 py-1.5 font-bold">Items</th>
                      <th className="px-3 py-1.5 text-right font-bold">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agent.sources.map((source) => {
                      const tone = statusTone(source);
                      return (
                        <tr key={source.id} className="border-b border-[#1B1C22] last:border-b-0">
                          <td className="px-3.5 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', healthDot[tone])} />
                              <p className="max-w-[210px] truncate text-[11px] font-semibold text-bone/90">{source.name}</p>
                            </div>
                            <p className="max-w-[230px] truncate font-mono text-[9px] text-[#5F616E]">{sourceHost(source.url)}</p>
                          </td>
                          <td className="px-2 py-1.5">
                            <Tag>{source.section || 'auto'}</Tag>
                          </td>
                          <td className="px-2 py-1.5">
                            <p className="text-[9.5px] text-[#8A8C99]">{source.lastFetchedAt ? relativeClock(source.lastFetchedAt) : 'never'}</p>
                            <p className={cx('max-w-[210px] truncate text-[9px]', healthText[tone])} title={source.lastError || source.lastStatus}>
                              {source.lastError || source.lastStatus || '—'}
                            </p>
                          </td>
                          <td className="px-2 py-1.5 font-mono text-[10px] text-[#8A8C99]">{source.lastCount || 0}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-1">
                              <IconButton
                                label={`Test ${source.name}`}
                                onClick={() => testSource(source)}
                                className={cx('h-6 w-6', testingId === source.id && 'text-pulse')}
                              >
                                <FlaskConical className={cx('h-3 w-3', testingId === source.id && 'animate-pulse')} />
                              </IconButton>
                              <button
                                type="button"
                                onClick={() => toggleSource(source)}
                                aria-pressed={source.enabled}
                                className={cx(
                                  'rounded-[3px] border px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-[0.1em] transition-colors',
                                  source.enabled
                                    ? 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-300/90'
                                    : 'border-[#2A2C36] text-[#7A7C89] hover:text-bone',
                                )}
                              >
                                {source.enabled ? 'On' : 'Off'}
                              </button>
                              <IconButton label={`Remove ${source.name}`} onClick={() => removeSource(source)} className="h-6 w-6 hover:text-pulse">
                                <Trash2 className="h-3 w-3" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Rss} title="No channels on the wire yet">
                Press Catalogue to add outlets, paste a site into “Find a channel”, or add any public feed URL by hand.
              </EmptyState>
            )}
          </Card>

          {/* last run diagnosis */}
          <Card>
            <SectionHead
              title="Last run"
              description="What each channel returned, so a quiet run is easy to explain."
              action={
                <div className="flex items-center gap-1.5">
                  <Button variant="quiet" size="xs" onClick={checkRoute} disabled={checking}>
                    <Radar className={cx('h-3 w-3', checking && 'animate-spin')} /> Check route
                  </Button>
                  <Tag tone={diagnostics ? (diagnostics.failures ? 'red' : 'green') : undefined}>
                    {diagnostics ? (diagnostics.failures ? `${diagnostics.failures} failed` : 'clean') : 'not run'}
                  </Tag>
                </div>
              }
            />
            {allFailed ? (
              <div className="border-b border-[#3A2A18] bg-[#150F0A] px-3.5 py-2.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> No route to publishers from this runtime
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[#B5A79A]">
                  Every channel failed before a feed reached the parser, so this is transport, not parsing. Hosted
                  preview sandboxes usually have no outbound internet: deploy the site (Vercel runs{' '}
                  <span className="font-mono text-[9.5px]">api/wire.js</span>) or run it locally, and the same channels fill
                  the queue. First error: <span className="font-mono text-[9px] text-amber-300/90">{firstError.slice(0, 120)}</span>
                </p>
              </div>
            ) : null}

            {route ? (
              <div className={cx('border-b px-3.5 py-2 text-[10px]', route.ok ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-200' : 'border-pulse/25 bg-pulse/[0.06] text-pulse-400')}>
                {route.ok ? <Check className="mr-1 inline h-3 w-3" /> : <AlertTriangle className="mr-1 inline h-3 w-3" />}
                {route.text}
              </div>
            ) : null}

            {diagnostics ? (
              <>
                <div className="flex flex-wrap items-center gap-3 border-b border-[#1D1E25] px-3.5 py-2 text-[10px] text-[#8A8C99]">
                  <span className="font-mono text-[9px] text-[#5F616E]">{new Date(diagnostics.at).toLocaleString('en-GB', { hour12: false })}</span>
                  <span>{diagnostics.channels?.length || 0} channels read</span>
                  <span className="text-emerald-300/90">{diagnostics.ingested} queued</span>
                  <span className="text-emerald-300/90">{diagnostics.published} published</span>
                  <span className={diagnostics.failures ? 'text-pulse-400' : 'text-[#6F7180]'}>{diagnostics.failures} failed</span>
                </div>
                <ul className="max-h-[190px] divide-y divide-[#1B1C22] overflow-y-auto">
                  {(diagnostics.channels || []).map((channel) => (
                    <li key={channel.id} className="flex items-start gap-2 px-3.5 py-1.5">
                      <span className={cx('mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full', channel.ok ? 'bg-emerald-400' : 'bg-pulse')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-semibold text-bone/85">{channel.name}</span>
                        <span className={cx('block truncate text-[9px]', channel.ok ? 'text-[#7A7C89]' : 'text-pulse-400/90')} title={channel.error || channel.reason}>
                          {channel.ok
                            ? `${channel.items} items read${channel.accepted ? ` · ${channel.accepted} queued` : ''}${channel.reason ? ` · ${channel.reason}` : ''}${channel.via ? ` · via ${channel.via}` : ''}`
                            : 'no route — hover for every attempt'}
                        </span>
                      </span>
                    </li>
                  ))}
                  {!diagnostics.channels?.length ? (
                    <li className="px-3.5 py-2 text-[10px] text-[#6F7180]">The run stopped before reading any channel.</li>
                  ) : null}
                </ul>
              </>
            ) : (
              <p className="px-3.5 py-3 text-[10px] text-[#6F7180]">
                No run recorded yet. The agent starts one a few seconds after the site loads, or press Run now.
              </p>
            )}
          </Card>

          {/* queue */}
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-[#22232A] px-3.5 py-2.5">
              <MicroLabel tone="red">Approval queue</MicroLabel>
              <Segmented options={QUEUE_TABS} value={queueTab} onChange={setQueueTab} className="ml-auto" />
            </div>
            <ul className="divide-y divide-[#1B1C22]">
              {queue.map((item) => {
                const open = expanded === item.id;
                return (
                  <li key={item.id} className="px-3.5 py-2">
                    <div className="flex items-start gap-2">
                      <img src={item.draft.image} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded-[2px] border border-[#262832] object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag tone={item.status === 'published' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>{item.status}</Tag>
                          <Tag>{item.draft.category}</Tag>
                          <span className="text-[9px] text-[#6F7180]">
                            {item.sourceName} · {relativeClock(item.publishedAt || item.fetchedAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : item.id)}
                          className="mt-0.5 block max-w-full truncate text-left text-[11.5px] font-semibold text-bone/90 hover:text-white"
                        >
                          {item.draft.title}
                        </button>
                        <p className="mt-0.5 max-w-full truncate text-[9.5px] text-[#6F7180]">{item.draft.excerpt}</p>
                      </div>

                      <div className="hidden w-16 shrink-0 sm:block">
                        <p className="text-right font-mono text-[9px] text-[#7A7C89]">{item.score}</p>
                        <div className="mt-1">
                          <Progress value={item.score} max={100} tone={item.score >= 70 ? 'green' : item.score >= 45 ? 'amber' : 'red'} />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {item.status === 'pending' ? (
                          <>
                            <IconButton label={`Publish ${item.draft.title}`} onClick={() => publishItem(item)} className="hover:text-emerald-300">
                              <Send className="h-3 w-3" />
                            </IconButton>
                            <IconButton label={`Edit ${item.draft.title}`} onClick={() => onEditDraft(item.draft, item.id)}>
                              <Pencil className="h-3 w-3" />
                            </IconButton>
                            <IconButton label={`Reject ${item.draft.title}`} onClick={() => rejectQueueItem(item.id)} className="hover:text-pulse">
                              <X className="h-3 w-3" />
                            </IconButton>
                          </>
                        ) : item.status === 'published' ? (
                          <a
                            href={`/article/${item.slug || item.draft.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="grid h-7 w-7 place-items-center rounded-[4px] border border-[#262832] text-[#8A8C99] hover:text-bone"
                            aria-label={`Open ${item.draft.title}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                        <IconButton label={`Remove ${item.draft.title} from the queue`} className="hover:text-pulse" onClick={() => removeQueueItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </IconButton>
                      </div>
                    </div>

                    {open ? (
                      <div className="mt-2 rounded-[4px] border border-[#22232A] bg-[#0A0B0F] p-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.draft.tags.map((tag) => (
                            <Tag key={tag}>{tag}</Tag>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {item.draft.body.map((block, index) => (
                            <p
                              key={index}
                              className={cx('text-[10.5px] leading-relaxed text-[#9A9CAA]', block.type === 'h2' && 'font-bold uppercase tracking-[0.08em] text-bone/80')}
                            >
                              {block.type === 'list' ? (block.items || []).join(' · ') : block.text}
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#1D1E25] pt-2 text-[9px] text-[#6F7180]">
                          <Info className="h-3 w-3" />
                          SEO title “{item.draft.seo?.title}” · {item.draft.seo?.keywords?.length || 0} keywords · source{' '}
                          <span className="font-mono text-[#8A8C99]">{item.draft.attribution?.host}</span>
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {!queue.length ? (
                <li>
                  <EmptyState icon={Bot} title={`Nothing ${queueTab} right now`}>
                    {queueTab === 'pending'
                      ? 'Run the agent to read the channels, or add more feeds.'
                      : 'Items move here once they are published or rejected.'}
                  </EmptyState>
                </li>
              ) : null}
            </ul>
          </Card>
        </div>

        {/* rules + log */}
        <div className="min-w-0 space-y-3">
          <Card>
            <SectionHead
              title="Agent rules"
              description="What it is allowed to publish, how often, and through which proxy."
              action={<Settings2 className="h-3.5 w-3.5 text-[#6F7180]" />}
            />
            <div className="space-y-3 px-3.5 py-3">
              <Field label="Publishing mode" hint="Approval keeps every draft in the queue until you release it.">
                <Segmented
                  options={[
                    { id: 'approval', label: 'Approval' },
                    { id: 'auto', label: 'Auto-publish' },
                  ]}
                  value={rules.mode}
                  onChange={(mode) => setRules({ ...rules, mode })}
                  size="md"
                  className="w-full justify-between"
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Every" hint="minutes">
                  <TextInput
                    type="number"
                    min="5"
                    max="720"
                    value={rules.intervalMinutes}
                    onChange={(event) => setRules({ ...rules, intervalMinutes: event.target.value })}
                  />
                </Field>
                <Field label="Max / hour" hint="cap">
                  <TextInput
                    type="number"
                    min="1"
                    max="20"
                    value={rules.maxPerHour}
                    onChange={(event) => setRules({ ...rules, maxPerHour: event.target.value })}
                  />
                </Field>
                <Field label="Min score" hint="0–100">
                  <TextInput
                    type="number"
                    min="0"
                    max="100"
                    value={rules.minScore}
                    onChange={(event) => setRules({ ...rules, minScore: event.target.value })}
                  />
                </Field>
                <Field label="Freshness" hint="hours">
                  <TextInput
                    type="number"
                    min="1"
                    max="168"
                    value={rules.maxAgeHours}
                    onChange={(event) => setRules({ ...rules, maxAgeHours: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="Desks the agent may file to">
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((category) => {
                    const active = rules.sections.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setRules({
                            ...rules,
                            sections: active ? rules.sections.filter((item) => item !== category) : [...rules.sections, category],
                          })
                        }
                        className={cx(
                          'rounded-[3px] border px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.1em] transition-colors',
                          active ? 'border-pulse/50 bg-pulse/[0.12] text-pulse-400' : 'border-[#2A2C36] text-[#7A7C89] hover:text-bone',
                        )}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Toggle
                checked={rules.enrich}
                onChange={(enrich) => setRules({ ...rules, enrich })}
                label="Read the linked article for context"
                hint="Fetches up to six articles per run so thin feed summaries become a full standfirst and body. Slower, better copy."
              />

              <Field label="Fetch proxy" hint="Use {url} where the encoded feed URL goes. /api/wire ships with this site; public relays are tried after it.">
                <TextInput
                  value={rules.proxy}
                  onChange={(event) => setRules({ ...rules, proxy: event.target.value })}
                  placeholder="/api/wire?url={url}"
                  className="font-mono text-[10.5px]"
                />
              </Field>

              <Toggle
                checked={rules.useSourceImages}
                onChange={(useSourceImages) => setRules({ ...rules, useSourceImages })}
                label="Use the source's image when provided"
                hint="Off: picks the closest image from the NewsPulse library. On: hotlinks the feed's own image."
              />

              <Button variant="primary" size="md" className="w-full" onClick={saveRules}>
                <Check className="h-3.5 w-3.5" /> Save agent rules
              </Button>
            </div>
          </Card>

          <Card>
            <SectionHead title="Agent log" action={<MicroLabel>{agent.log.length}</MicroLabel>} />
            <ul className="max-h-[240px] divide-y divide-[#1B1C22] overflow-y-auto">
              {agent.log.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 px-3.5 py-1.5">
                  <span className="mt-[3px] shrink-0 font-mono text-[8.5px] text-[#5F616E]">
                    {new Date(entry.at).toLocaleTimeString('en-GB', { hour12: false })}
                  </span>
                  <span className={cx('text-[10px] leading-snug', LOG_TONE[entry.level] || 'text-[#9A9CAA]')}>{entry.message}</span>
                </li>
              ))}
              {!agent.log.length ? (
                <li className="px-3.5 py-3 text-[10px] text-[#6F7180]">No runs yet. The agent starts on its own, or press Run now.</li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <SectionHead title="How the agent works" action={<ShieldAlert className="h-3.5 w-3.5 text-[#6F7180]" />} />
            <ul className="space-y-1.5 px-3.5 py-3 text-[10px] leading-relaxed text-[#8A8C99]">
              {[
                'Reads the newest items from each enabled channel through /api/wire, then public relays, then direct.',
                'Reads the linked article (optional) for a fuller standfirst, body and key points. Extractive, not generated.',
                'Files each story by keyword and desk, adds tags, SEO title/description and a matching lead image.',
                'Every automated story carries a source link and is marked as a wire report.',
                'Runs in this browser while a tab is open. An always-on newsroom needs the same logic on a server cron.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-pulse" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
