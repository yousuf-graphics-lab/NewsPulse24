import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Ban,
  Radio,
  RadioTower,
  SignalHigh,
  TriangleAlert,
} from 'lucide-react';
import {
  Button,
  Card,
  Field,
  MicroLabel,
  SectionHead,
  Select,
  Tag,
  TextArea,
  TextInput,
  Toggle,
  cx,
} from './ui';
import { CATEGORIES, formatRelativeTime } from '../../data/news';
import {
  allPosts,
  getSettings,
  getTickerStories,
  updateSettings,
} from '../../lib/contentStore';
import { logEvent } from '../../lib/db';

const TONES = [
  { id: 'alert', label: 'Alert — red bar' },
  { id: 'developing', label: 'Developing — amber bar' },
  { id: 'update', label: 'Update — neutral bar' },
];

export default function LiveDesk({ version, notify }) {
  const settings = getSettings();
  const [headline, setHeadline] = useState(settings.override?.headline || '');
  const [kicker, setKicker] = useState(settings.override?.kicker || 'Breaking');
  const [slug, setSlug] = useState(settings.override?.slug || '');
  const [tone, setTone] = useState(settings.override?.tone || 'alert');

  const posts = useMemo(() => allPosts().filter((post) => post.status === 'published'), [version]);
  const ticker = useMemo(() => getTickerStories(), [version]);
  const pinnedTicker = settings.tickerPins || [];
  const pinnedHero = settings.heroPins || [];

  const transmit = () => {
    const text = headline.trim();
    if (text.length < 8) {
      notify('Override headline needs at least 8 characters', 'error');
      return;
    }
    updateSettings({
      override: {
        headline: text,
        kicker: kicker.trim() || 'Breaking',
        slug: slug || (posts[0]?.slug ?? ''),
        tone,
        at: new Date().toISOString(),
      },
    });
    logEvent('broadcast', 'Breaking override transmitted', text);
    notify('Breaking override is live on every page', 'success');
  };

  const clear = () => {
    if (!window.confirm('Clear the breaking override from the site?')) return;
    updateSettings({ override: null });
    logEvent('broadcast', 'Breaking override cleared', settings.override?.headline || '');
    setHeadline('');
    setSlug('');
    notify('Override cleared', 'success');
  };

  const pinTicker = (post) => {
    const next = pinnedTicker.includes(post.slug)
      ? pinnedTicker.filter((item) => item !== post.slug)
      : [...pinnedTicker, post.slug].slice(0, 4);
    updateSettings({ tickerPins: next });
    logEvent(
      'broadcast',
      pinnedTicker.includes(post.slug) ? 'Ticker pin removed' : 'Ticker pin added',
      post.title,
    );
    notify(pinnedTicker.includes(post.slug) ? 'Removed from the ticker' : 'Pinned to the ticker', 'success');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionHead
            title="Emergency breaking override"
            description="Publishes a red alert bar across the site, independent of the story dataset."
            action={
              settings.override ? (
                <Tag tone="live">
                  <span className="h-1 w-1 animate-pulseDot rounded-full bg-white" /> On air
                </Tag>
              ) : (
                <Tag>Standby</Tag>
              )
            }
          />
          <div className="space-y-2.5 px-3.5 py-3">
            <Field label="Alert headline" htmlFor="override-headline" hint={`${headline.length}/120`}>
              <TextArea
                id="override-headline"
                rows={2}
                maxLength={120}
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Markets halt after flash crash in overnight futures"
                className="text-[13px] font-semibold"
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="Kicker" htmlFor="override-kicker">
                <TextInput
                  id="override-kicker"
                  value={kicker}
                  maxLength={24}
                  onChange={(event) => setKicker(event.target.value)}
                  placeholder="Breaking"
                />
              </Field>
              <Field label="Alert tone" htmlFor="override-tone">
                <Select id="override-tone" value={tone} onChange={(event) => setTone(event.target.value)}>
                  {TONES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Links to story" htmlFor="override-slug" hint="The alert bar opens this article.">
              <Select id="override-slug" value={slug} onChange={(event) => setSlug(event.target.value)}>
                <option value="">Latest story on the wire</option>
                {posts.slice(0, 20).map((post) => (
                  <option key={post.id} value={post.slug}>
                    {post.category} — {post.title.slice(0, 62)}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="rounded-[4px] border border-[#3A1E22] bg-[#150E11] px-2.5 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-pulse">
                  {kicker || 'Breaking'}
                </span>
                <span className="ml-auto font-mono text-[8.5px] text-[#7A6A70]">site-wide bar</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] font-semibold leading-snug text-bone/90">
                {headline || 'Your alert headline renders here, above the header, on every page.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button variant="primary" size="md" onClick={transmit} disabled={!headline.trim()}>
                <RadioTower className="h-3.5 w-3.5" /> Transmit override
              </Button>
              <Button variant="danger" size="md" onClick={clear} disabled={!settings.override}>
                <Ban className="h-3.5 w-3.5" /> Clear override
              </Button>
              {settings.override ? (
                <span className="text-[9.5px] text-[#6F7180]">
                  Live since {formatRelativeTime(settings.override.at || new Date().toISOString())}
                </span>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHead
            title="Live desk state"
            description="Controls the Live TV rail on the front page and the /live desk."
            action={<Tag tone={settings.livePromo === false ? 'muted' : 'green'}>
              {settings.livePromo === false ? 'Rail hidden' : 'On air'}
            </Tag>}
          />
          <div className="space-y-3 px-3.5 py-3">
            <div className="relative overflow-hidden rounded-[4px] border border-[#262832] bg-black">
              <img
                src="/images/live-studio.jpg"
                alt="NewsPulse 24 live studio"
                className="h-[150px] w-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
              <div className="absolute inset-x-2 top-2 flex items-center justify-between">
                <Tag tone="live">
                  <span className="h-1 w-1 rounded-full bg-white" /> Live
                </Tag>
                <span className="rounded-[2px] bg-black/70 px-1.5 py-[2px] font-mono text-[8px] text-bone/75">
                  CH1 · 1080p
                </span>
              </div>
              <p className="absolute inset-x-2 bottom-2 text-[11px] font-semibold text-bone/90">
                The Global Desk · rolling coverage
              </p>
            </div>

            <Toggle
              checked={settings.livePromo !== false}
              onChange={(value) => {
                updateSettings({ livePromo: value });
                logEvent('broadcast', value ? 'Live rail shown' : 'Live rail hidden');
                notify(value ? 'Live TV rail is back on the front page' : 'Live TV rail hidden', 'success');
              }}
              label="Promote the live desk"
              hint="Adds the Live TV card to the front page rail and the header nav."
            />

            <div className="rounded-[4px] border border-[#262832] bg-[#0A0B0F] p-2.5">
              <div className="flex items-center justify-between">
                <MicroLabel>Signal health</MicroLabel>
                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-400/85">
                  <SignalHigh className="h-3 w-3" /> Nominal
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-[10px]">
                {[
                  ['Feed', 'Still frame · no ingest configured'],
                  ['Rundown', `${posts.filter((post) => post.hero).length} breaking packages`],
                  ['Last override', settings.override ? formatRelativeTime(settings.override.at) : 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2">
                    <dt className="text-[#6F7180]">{label}</dt>
                    <dd className="truncate text-right text-bone/80">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Link
              to="/live"
              className="flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[#2A2C36] bg-[#15161C] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-bone/85 transition-colors hover:border-pulse/55 hover:text-white"
            >
              Open the live desk <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHead
          title="Ticker rundown"
          description="The lead four headlines that slide under the navigation. Pins take priority, newest breaking fills the rest."
          action={<MicroLabel>{pinnedTicker.length}/4 pinned</MicroLabel>}
        />
        <div className="grid gap-3 px-3.5 py-3 lg:grid-cols-2">
          <div>
            <MicroLabel tone="red">On the wire now</MicroLabel>
            <ol className="mt-1.5 space-y-1">
              {ticker.breaking.map((story, index) => (
                <li
                  key={story.id}
                  className="flex items-center gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5"
                >
                  <span className="font-mono text-[9px] text-[#5F616E]">0{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold text-bone/85">{story.title}</p>
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-[#6F7180]">
                      {story.category} · {formatRelativeTime(story.publishedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => pinTicker(story)}
                    aria-pressed={pinnedTicker.includes(story.slug)}
                    className={cx(
                      'rounded-[3px] border px-1.5 py-[2px] text-[8.5px] font-bold uppercase tracking-[0.1em] transition-colors',
                      pinnedTicker.includes(story.slug)
                        ? 'border-pulse/50 bg-pulse/[0.14] text-pulse-400'
                        : 'border-[#2A2C36] text-[#8A8C99] hover:border-[#3A3C46] hover:text-bone',
                    )}
                  >
                    {pinnedTicker.includes(story.slug) ? 'Pinned' : 'Pin'}
                  </button>
                </li>
              ))}
              {!ticker.breaking.length ? (
                <li className="text-[10px] text-[#6F7180]">No stories on the wire yet.</li>
              ) : null}
            </ol>
          </div>

          <div>
            <MicroLabel>Top read · second pass</MicroLabel>
            <ol className="mt-1.5 space-y-1">
              {ticker.topRead.slice(0, 4).map((story, index) => (
                <li
                  key={story.id}
                  className="flex items-center gap-2 rounded-[3px] border border-[#22232A] bg-[#0A0B0F] px-2 py-1.5"
                >
                  <Radio className="h-3 w-3 shrink-0 text-[#5F616E]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold text-bone/85">{story.title}</p>
                    <p className="text-[8.5px] uppercase tracking-[0.1em] text-[#6F7180]">
                      {story.category} · {Math.round((story.views || 0) / 1000)}k reads
                    </p>
                  </div>
                  <span className="font-mono text-[9px] text-[#5F616E]">#{index + 1}</span>
                </li>
              ))}
            </ol>
            {pinnedHero.length ? (
              <div className="mt-2.5 rounded-[3px] border border-[#22232A] bg-[#0E0F14] px-2 py-1.5">
                <MicroLabel>Hero pins</MicroLabel>
                <p className="mt-1 text-[9.5px] leading-snug text-[#7A7C89]">
                  {pinnedHero.length} story{pinnedHero.length === 1 ? '' : 'ies'} held in the carousel
                  from the dashboard. Reorder them in Settings.
                </p>
              </div>
            ) : null}
          </div>
        </div>
        <p className="flex items-center gap-1.5 border-t border-[#1D1E25] px-3.5 py-2 text-[9.5px] text-[#5F616E]">
          <TriangleAlert className="h-3 w-3" />
          Pins survive restarts; clearing content in Settings resets them. {CATEGORIES.length} desks
          feed the wire.
        </p>
      </Card>

    </div>
  );
}
