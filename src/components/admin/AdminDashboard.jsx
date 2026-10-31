import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  Flame,
  Layers,
  Radio,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { CATEGORIES, STORIES, formatCompactViews, formatRelativeTime } from '../../data/news';
import { allPosts, readContent, readCounts } from '../../lib/contentStore';
import { auditLog } from '../../lib/auditLog';
import { Badge, Card, EmptyState, PanelHeading, StatCard } from './ui';

const bodyText = (story) =>
  (story.body || [])
    .map((block) => (block.type === 'list' ? (block.items || []).join(' ') : block.text || ''))
    .join(' ');

export default function AdminDashboard({ onEdit, onClearAudit, version }) {
  const stats = useMemo(() => {
    void version;
    const posts = allPosts();
    const content = readContent();
    const reads = readCounts();
    const published = STORIES;
    const words = published.reduce(
      (sum, story) => sum + bodyText(story).split(/\s+/).filter(Boolean).length,
      0,
    );
    const totalViews = published.reduce((sum, story) => sum + (story.views || 0), 0);
    const localReads = Object.values(reads).reduce((sum, n) => sum + n, 0);
    const byCategory = CATEGORIES.map((category) => ({
      category,
      count: published.filter((story) => story.category === category).length,
    })).sort((a, b) => b.count - a.count);

    const health = [];
    for (const story of published) {
      if (!story.image) health.push({ story, issue: 'No lead image' });
      if (!story.excerpt || story.excerpt.length < 40) health.push({ story, issue: 'Thin excerpt' });
      if (!story.tags?.length) health.push({ story, issue: 'No tags' });
      if (!bodyText(story).trim()) health.push({ story, issue: 'Empty body' });
    }
    const slugSeen = new Set();
    for (const story of posts) {
      if (slugSeen.has(story.slug)) health.push({ story, issue: 'Duplicate slug' });
      slugSeen.add(story.slug);
    }

    return {
      posts,
      published,
      drafts: posts.filter((p) => p.status === 'draft'),
      hidden: posts.filter((p) => p.status === 'hidden'),
      breaking: published.filter((p) => p.hero).length,
      words,
      totalViews,
      localReads,
      byCategory,
      reads,
      health,
      settings: content.settings,
      updatedAt: content.updatedAt,
      topStories: [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
      recentlyUpdated: [...posts]
        .sort((a, b) => new Date(b.updatedAt || b.publishedAt) - new Date(a.updatedAt || a.publishedAt))
        .slice(0, 5),
    };
  }, [version]);

  const log = auditLog();
  const maxCategory = Math.max(1, ...stats.byCategory.map((c) => c.count));
  const maxViews = Math.max(1, ...stats.topStories.map((s) => s.views || 0));
  const localReads = Object.entries(stats.reads)
    .map(([slug, count]) => ({ slug, count, story: STORIES.find((s) => s.slug === slug) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
        <StatCard
          label="Published stories"
          value={stats.published.length}
          hint={`${stats.words.toLocaleString('en-GB')} words on the wire`}
          icon={FileText}
        />
        <StatCard
          label="Total reads"
          value={formatCompactViews(stats.totalViews)}
          hint={`${stats.localReads} logged in this browser`}
          icon={Eye}
        />
        <StatCard
          label="Drafts in progress"
          value={stats.drafts.length}
          hint={stats.drafts.length ? 'Not visible on the site' : 'Every draft is published'}
          icon={Layers}
        />
        <StatCard
          label="Breaking now"
          value={stats.breaking}
          hint={`${stats.hidden.length} taken down`}
          icon={Flame}
          tone={stats.breaking ? 'alert' : 'default'}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.55fr_1fr] [&>*]:min-w-0">
        <Card>
          <PanelHeading
            title="Most read on the wire"
            description="Ranked by the read counter stored on each story."
            action={
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                <TrendingUp className="h-3 w-3 text-pulse" /> Live
              </span>
            }
          />
          <ul className="divide-y divide-line/70">
            {stats.topStories.map((story, i) => (
              <li key={story.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-4 shrink-0 text-[11px] font-bold text-muted/70">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onEdit(story.id)}
                    className="block max-w-full truncate text-left text-[12.5px] font-semibold text-bone/90 hover:text-pulse"
                  >
                    {story.title}
                  </button>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted/80">
                      {story.category}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-line-soft" />
                    <span className="text-[10px] text-muted/70">{formatRelativeTime(story.publishedAt)}</span>
                  </div>
                  <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-ink-750">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pulse/60 to-pulse"
                      style={{ width: `${Math.max(4, ((story.views || 0) / maxViews) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-[11.5px] font-bold text-bone/85">
                  {formatCompactViews(story.views || 0)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <PanelHeading title="Section balance" description="Published stories per desk." />
            <ul className="space-y-2 px-4 py-3.5 sm:px-5">
              {stats.byCategory.map(({ category, count }) => (
                <li key={category} className="flex items-center gap-2.5">
                  <span className="w-[74px] shrink-0 text-[11px] text-muted">{category}</span>
                  <span className="h-[6px] flex-1 overflow-hidden rounded-full bg-ink-750">
                    <span
                      className={`block h-full rounded-full ${
                        count ? 'bg-gradient-to-r from-pulse/45 to-pulse' : 'bg-transparent'
                      }`}
                      style={{ width: `${(count / maxCategory) * 100}%` }}
                    />
                  </span>
                  <span className="w-4 text-right text-[11px] font-bold text-bone/85">{count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <PanelHeading
              title="This browser"
              description={`${stats.localReads} ${stats.localReads === 1 ? 'read' : 'reads'} logged by article pages on this device.`}
              action={<Activity className="h-3.5 w-3.5 text-muted" />}
            />
            {localReads.length ? (
              <ul className="divide-y divide-line/70">
                {localReads.map(({ slug, count, story }) => (
                  <li key={slug} className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
                    <span className="min-w-0 truncate text-[11.5px] text-bone/85">
                      {story ? story.title : slug}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold text-pulse/90">{count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={BarChart3} title="No reads logged yet">
                Open an article on the site and it will show up here.
              </EmptyState>
            )}
          </Card>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr] [&>*]:min-w-0">
        <Card>
          <PanelHeading
            title="Content health"
            description="Checks that run against every published story."
            action={
              <Badge tone={stats.health.length ? 'draft' : 'live'}>
                {stats.health.length ? `${stats.health.length} flags` : 'All clear'}
              </Badge>
            }
          />
          {stats.health.length ? (
            <ul className="divide-y divide-line/70">
              {stats.health.slice(0, 8).map(({ story, issue }, i) => (
                <li key={`${story.id}-${issue}-${i}`} className="flex items-center gap-2 px-4 py-2 sm:px-5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-bone/85">{story.title}</span>
                  <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-muted">
                    {issue}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CheckCircle2} title="Nothing to fix">
              Every story has an image, excerpt, tags and body text.
            </EmptyState>
          )}
        </Card>

        <Card>
          <PanelHeading
            title="Activity log"
            description="Every action taken in this control room."
            action={
              log.length ? (
                <button
                  type="button"
                  onClick={onClearAudit}
                  className="flex items-center gap-1 text-[10.5px] font-semibold text-muted transition-colors hover:text-pulse"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              ) : null
            }
          />
          {log.length ? (
            <ul className="max-h-[248px] divide-y divide-line/70 overflow-y-auto">
              {log.slice(0, 20).map((entry) => (
                <li key={entry.id} className="px-4 py-2 sm:px-5">
                  <p className="text-[11.5px] font-semibold text-bone/85">{entry.action}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted/80">
                    {entry.detail ? <span className="truncate">{entry.detail}</span> : null}
                    <span className="ml-auto shrink-0">{formatRelativeTime(entry.at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Radio} title="No activity yet">
              Publishing, editing and settings changes are recorded here.
            </EmptyState>
          )}
        </Card>
      </div>

      <Card>
        <PanelHeading
          title="Editorial pins"
          description="What the homepage hero and the breaking ticker lead with."
          action={
            <Link
              to="/admin?tab=settings"
              className="text-[10.5px] font-semibold text-pulse/90 hover:text-pulse"
            >
              Manage pins →
            </Link>
          }
        />
        <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-2 sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Hero</p>
            <ol className="mt-1.5 space-y-1">
              {(stats.settings.heroPins.length
                ? stats.settings.heroPins.map((slug) => STORIES.find((s) => s.slug === slug))
                : []
              )
                .filter(Boolean)
                .map((story) => (
                  <li key={story.id} className="truncate text-[11.5px] text-bone/85">
                    • {story.title}
                  </li>
                ))}
              {!stats.settings.heroPins.length ? (
                <li className="text-[11.5px] text-muted/75">Automatic — newest breaking stories.</li>
              ) : null}
            </ol>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Ticker</p>
            <ol className="mt-1.5 space-y-1">
              {(stats.settings.tickerPins.length
                ? stats.settings.tickerPins.map((slug) => STORIES.find((s) => s.slug === slug))
                : []
              )
                .filter(Boolean)
                .map((story) => (
                  <li key={story.id} className="truncate text-[11.5px] text-bone/85">
                    • {story.title}
                  </li>
                ))}
              {!stats.settings.tickerPins.length ? (
                <li className="text-[11.5px] text-muted/75">Automatic — breaking, then most read.</li>
              ) : null}
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
