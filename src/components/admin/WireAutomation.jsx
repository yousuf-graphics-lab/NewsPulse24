import { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Clock3,
  ExternalLink,
  Info,
  Pencil,
  Play,
  Plus,
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
  Select,
  Tag,
  TextInput,
  Toggle,
  cx,
} from './ui';
import { CATEGORIES } from '../../data/news';
import {
  AUTOMATION_PRESETS,
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

export default function WireAutomation({ version, notify, onEditDraft }) {
  const agent = useMemo(() => readAutomation(), [version]);
  const [queueTab, setQueueTab] = useState('pending');
  const [expanded, setExpanded] = useState(null);
  const [draftSource, setDraftSource] = useState(null);
  const [running, setRunning] = useState(false);
  const [rules, setRules] = useState(() => ({
    mode: agent.mode,
    intervalMinutes: agent.intervalMinutes,
    maxPerHour: agent.maxPerHour,
    minScore: agent.minScore,
    proxy: agent.proxy,
    useSourceImages: agent.useSourceImages,
    sections: agent.sections,
  }));

  const queue = agent.queue.filter((item) => item.status === queueTab);
  const pending = agent.queue.filter((item) => item.status === 'pending').length;
  const nextRun =
    agent.enabled && agent.lastRunAt
      ? new Date(new Date(agent.lastRunAt).getTime() + agent.intervalMinutes * 60_000)
      : null;

  const addSource = (source) => {
    if (!/^https?:\/\/.+/i.test(source.url)) {
      notify('Feed URL must start with http:// or https://', 'error');
      return;
    }
    const name = source.name.trim() || sourceHost(source.url);
    updateAutomation({
      sources: [
        ...agent.sources.filter((item) => item.url !== source.url),
        { ...source, name, lastStatus: 'not fetched yet' },
      ].slice(0, 30),
    });
    setDraftSource(null);
    notify(`${name} added to the wire`, 'success');
  };

  const addPresets = () => {
    const existing = new Set(agent.sources.map((item) => item.url));
    const additions = AUTOMATION_PRESETS.filter((preset) => !existing.has(preset.url)).map(
      (preset) => ({ ...preset, enabled: true, lastStatus: 'not fetched yet' }),
    );
    if (!additions.length) {
      notify('Every starter feed is already on the wire', 'default');
      return;
    }
    updateAutomation({ sources: [...agent.sources, ...additions].slice(0, 30) });
    notify(`${additions.length} starter feeds added`, 'success');
  };

  const toggleSource = (source) =>
    updateAutomation({
      sources: agent.sources.map((item) =>
        item.id === source.id ? { ...item, enabled: !item.enabled } : item,
      ),
    });

  const removeSource = (source) => {
    if (!window.confirm(`Remove ${source.name} from the wire?`)) return;
    updateAutomation({ sources: agent.sources.filter((item) => item.id !== source.id) });
    notify(`${source.name} removed`, 'success');
  };

  const saveRules = () => {
    updateAutomation({
      ...rules,
      intervalMinutes: Number(rules.intervalMinutes) || 20,
      maxPerHour: Number(rules.maxPerHour) || 3,
      minScore: Number(rules.minScore) || 0,
    });
    notify('Agent rules saved', 'success');
  };

  const runNow = async () => {
    if (running) return;
    setRunning(true);
    try {
      const result = await runAutomationCycle({ manual: true });
      if (result.skipped) {
        notify(`Nothing ran: ${result.reason}`, 'error');
      } else {
        notify(
          `Run complete · ${result.ingested} new · ${result.published} published${
            result.failures ? ` · ${result.failures} source failed` : ''
          }`,
          result.failures ? 'error' : 'success',
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

  const editItem = (item) => {
    onEditDraft(item.draft, item.id);
  };

  return (
    <div className="space-y-3">
      {/* agent state */}
      <Card className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
        <span className="flex items-center gap-2">
          <span
            className={cx(
              'grid h-7 w-7 place-items-center rounded-[4px] border',
              agent.enabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-[#2A2C36] bg-[#15161C] text-[#7A7C89]',
            )}
          >
            <Bot className="h-4 w-4" />
          </span>
          <span className="leading-none">
            <span className="block text-[11.5px] font-bold text-bone">
              Wire agent {agent.enabled ? 'running' : 'paused'}
            </span>
            <span className="mt-[3px] flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-[#6F7180]">
              <span
                className={cx(
                  'h-1 w-1 rounded-full',
                  agent.enabled ? 'bg-emerald-400' : 'bg-[#5F616E]',
                )}
              />
              {agent.mode === 'auto' ? 'auto-publish' : 'approval queue'} · every{' '}
              {agent.intervalMinutes} min
            </span>
          </span>
        </span>

        <span className="hidden items-center gap-1.5 rounded-[3px] border border-[#262832] bg-[#0A0B0F] px-2 py-[4px] sm:flex">
          <Clock3 className="h-3 w-3 text-[#6F7180]" />
          <span className="text-[9.5px] text-[#8A8C99]">
            {agent.lastRunAt ? `Last run ${relativeClock(agent.lastRunAt)}` : 'Never run'}
            {nextRun ? ` · next ${nextRun.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
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
            {running ? 'Running…' : 'Run now'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Awaiting approval', formatNumber(pending), `${agent.queue.length} in the queue`, Sparkles],
          ['Published by agent', formatNumber(agent.stats.published), `${agent.stats.ingested} items ingested`, Send],
          ['Runs', formatNumber(agent.stats.runs), agent.stats.lastRunAt ? `last ${relativeClock(agent.stats.lastRunAt)}` : 'not started', Play],
          ['Feeds on the wire', `${agent.sources.filter((item) => item.enabled).length}/${agent.sources.length}`, 'enabled / configured', Rss],
        ].map(([label, value, hint, Icon]) => (
          <Card key={label} className="p-3">
            <div className="flex items-center justify-between">
              <MicroLabel tone="bright">{label}</MicroLabel>
              <Icon className="h-3 w-3 text-[#5F616E]" />
            </div>
            <p className="mt-2 text-[24px] font-extrabold leading-none tracking-[-0.03em] text-bone">{value}</p>
            <p className="mt-1.5 text-[10px] text-[#7A7C89]">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {/* sources */}
          <Card>
            <SectionHead
              title="Sources"
              description="Public RSS, Atom or JSON feeds. The agent reads the newest items from each enabled source."
              action={
                <div className="flex items-center gap-1.5">
                  <Button variant="quiet" size="xs" onClick={addPresets}>
                    <Sparkles className="h-3 w-3" /> Starter set
                  </Button>
                  <Button variant="ghost" size="xs" onClick={() => setDraftSource(blankSource())}>
                    <Plus className="h-3 w-3" /> Add feed
                  </Button>
                </div>
              }
            />

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
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#1D1E25] text-[8.5px] uppercase tracking-[0.14em] text-[#6F7180]">
                      <th className="px-3.5 py-1.5 font-bold">Feed</th>
                      <th className="px-2 py-1.5 font-bold">Desk</th>
                      <th className="px-2 py-1.5 font-bold">Weight</th>
                      <th className="px-2 py-1.5 font-bold">Last fetch</th>
                      <th className="px-3 py-1.5 text-right font-bold">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agent.sources.map((source) => (
                      <tr key={source.id} className="border-b border-[#1B1C22] last:border-b-0">
                        <td className="px-3.5 py-1.5">
                          <p className="max-w-[240px] truncate text-[11px] font-semibold text-bone/90">
                            {source.name}
                          </p>
                          <p className="max-w-[240px] truncate font-mono text-[9px] text-[#5F616E]">
                            {sourceHost(source.url)}
                          </p>
                        </td>
                        <td className="px-2 py-1.5">
                          <Tag>{source.section || 'auto'}</Tag>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-[#8A8C99]">×{source.weight}</td>
                        <td className="px-2 py-1.5">
                          <p className="text-[9.5px] text-[#8A8C99]">
                            {source.lastFetchedAt ? relativeClock(source.lastFetchedAt) : 'never'}
                          </p>
                          <p className="max-w-[190px] truncate text-[9px] text-[#5F616E]">
                            {source.lastStatus || '—'}
                          </p>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-1">
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
                            <IconButton
                              label={`Remove ${source.name}`}
                              onClick={() => removeSource(source)}
                              className="h-6 w-6 hover:text-pulse"
                            >
                              <Trash2 className="h-3 w-3" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Rss} title="No feeds on the wire yet">
                Add the starter set (BBC, Guardian, Al Jazeera, NASA, ESPN) or paste any public RSS,
                Atom or JSON feed URL.
              </EmptyState>
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
                      <img
                        src={item.draft.image}
                        alt=""
                        loading="lazy"
                        className="h-10 w-14 shrink-0 rounded-[2px] border border-[#262832] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Tag tone={item.status === 'published' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>
                            {item.status}
                          </Tag>
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
                        <p className="mt-0.5 max-w-full truncate text-[9.5px] text-[#6F7180]">
                          {item.draft.excerpt}
                        </p>
                      </div>

                      <div className="hidden w-16 shrink-0 sm:block">
                        <p className="text-right font-mono text-[9px] text-[#7A7C89]">{item.score}</p>
                        <div className="mt-1">
                          <Progress value={item.score} max={100} tone={item.score >= 70 ? 'green' : item.score >= 45 ? 'amber' : 'red'} />
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        {item.status === 'pending' ? (
                          <>
                            <IconButton label={`Publish ${item.draft.title}`} onClick={() => publishItem(item)}>
                              <Send className="h-3 w-3" />
                            </IconButton>
                            <IconButton label={`Edit ${item.draft.title}`} onClick={() => editItem(item)}>
                              <Pencil className="h-3 w-3" />
                            </IconButton>
                            <IconButton
                              label={`Reject ${item.draft.title}`}
                              className="hover:text-pulse"
                              onClick={() => {
                                rejectQueueItem(item.id);
                                notify('Draft rejected', 'success');
                              }}
                            >
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
                        <IconButton
                          label={`Remove ${item.draft.title} from the queue`}
                          className="hover:text-pulse"
                          onClick={() => removeQueueItem(item.id)}
                        >
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
                              className={cx(
                                'text-[10.5px] leading-relaxed text-[#9A9CAA]',
                                block.type === 'h2' && 'font-bold uppercase tracking-[0.08em] text-bone/80',
                              )}
                            >
                              {block.type === 'list' ? (block.items || []).join(' · ') : block.text}
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#1D1E25] pt-2 text-[9px] text-[#6F7180]">
                          <Info className="h-3 w-3" />
                          SEO title “{item.draft.seo?.title}” · {item.draft.seo?.keywords?.length || 0} keywords ·
                          source <span className="font-mono text-[#8A8C99]">{item.draft.attribution?.host}</span>
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
                      ? 'Run the agent to pull fresh items, or add more feeds.'
                      : 'Items move here once they are published or rejected.'}
                  </EmptyState>
                </li>
              ) : null}
            </ul>
          </Card>

          <Card>
            <SectionHead
              title="How the agent works"
              action={<ShieldAlert className="h-3.5 w-3.5 text-[#6F7180]" />}
            />
            <ul className="space-y-1.5 px-3.5 py-3 text-[10px] leading-relaxed text-[#8A8C99]">
              {[
                'Reads public RSS / Atom / JSON feeds through the proxy — no paywalled or private pages.',
                'Assembles headline, standfirst, body, section, tags and SEO fields from what the source published. Extractive, not generated.',
                'Picks the closest image from the newsroom library, unless source images are switched on.',
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

        {/* rules + log */}
        <div className="space-y-3">
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

              <div className="grid grid-cols-3 gap-2">
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
                            sections: active
                              ? rules.sections.filter((item) => item !== category)
                              : [...rules.sections, category],
                          })
                        }
                        className={cx(
                          'rounded-[3px] border px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.1em] transition-colors',
                          active
                            ? 'border-pulse/50 bg-pulse/[0.12] text-pulse-400'
                            : 'border-[#2A2C36] text-[#7A7C89] hover:text-bone',
                        )}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field
                label="Fetch proxy"
                hint="Use {url} where the encoded feed URL goes. /api/wire ships with this site."
              >
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
            <ul className="max-h-[260px] divide-y divide-[#1B1C22] overflow-y-auto">
              {agent.log.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 px-3.5 py-1.5">
                  <span className="mt-[3px] shrink-0 font-mono text-[8.5px] text-[#5F616E]">
                    {new Date(entry.at).toLocaleTimeString('en-GB', { hour12: false })}
                  </span>
                  <span className={cx('text-[10px] leading-snug', LOG_TONE[entry.level] || 'text-[#9A9CAA]')}>
                    {entry.message}
                  </span>
                </li>
              ))}
              {!agent.log.length ? (
                <li className="px-3.5 py-3 text-[10px] text-[#6F7180]">
                  No runs yet. Enable the agent or press Run now.
                </li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
