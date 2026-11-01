import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Eye,
  Flame,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  MicroLabel,
  Progress,
  Segmented,
  Tag,
  TextInput,
  cx,
} from './ui';
import { CATEGORIES, formatCompactViews, formatRelativeTime } from '../../data/news';
import {
  allPosts,
  changeStatus,
  getSettings,
  readCounts,
  restore,
  takeDown,
} from '../../lib/contentStore';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Live' },
  { id: 'draft', label: 'Drafts' },
  { id: 'hidden', label: 'Down' },
  { id: 'breaking', label: 'Breaking' },
];

const SORTS = [
  { id: 'updated', label: 'Last updated' },
  { id: 'published', label: 'Newest first' },
  { id: 'reads', label: 'Most read' },
  { id: 'title', label: 'A–Z' },
];

const statusTone = { published: 'green', draft: 'amber', hidden: 'red' };
const statusLabel = { published: 'Live', draft: 'Draft', hidden: 'Taken down' };

export default function NewsroomLedger({
  version,
  onEdit,
  onNew,
  notify,
  compact = false,
  initialQuery = '',
}) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('updated');
  const [busy, setBusy] = useState(null);

  const settings = getSettings();
  const posts = useMemo(() => allPosts(), [version]);
  const localReads = useMemo(() => readCounts(), [version]);
  const maxReads = Math.max(1, ...posts.map((post) => post.views || 0));

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = posts.filter((post) => {
      if (filter === 'breaking' && !post.hero) return false;
      if (filter !== 'all' && filter !== 'breaking' && post.status !== filter) return false;
      if (category !== 'all' && post.category !== category) return false;
      if (!term) return true;
      return (
        post.title.toLowerCase().includes(term) ||
        post.slug.includes(term) ||
        post.category.toLowerCase().includes(term) ||
        (post.tags || []).some((tag) => tag.includes(term))
      );
    });
    list = [...list].sort((a, b) => {
      if (sort === 'reads') return (b.views || 0) - (a.views || 0);
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'published') return new Date(b.publishedAt) - new Date(a.publishedAt);
      return new Date(b.updatedAt || b.publishedAt) - new Date(a.updatedAt || a.publishedAt);
    });
    return list;
  }, [posts, filter, query, category, sort]);

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      draft: posts.filter((post) => post.status === 'draft').length,
      hidden: posts.filter((post) => post.status === 'hidden').length,
      breaking: posts.filter((post) => post.hero && post.status === 'published').length,
    }),
    [posts],
  );

  const run = (id, action, message, tone = 'success') => {
    setBusy(id);
    action();
    window.setTimeout(() => setBusy(null), 250);
    notify(message, tone);
  };

  const toggleStatus = (post) =>
    run(
      post.id,
      () => changeStatus(post, post.status === 'published' ? 'draft' : 'published'),
      post.status === 'published' ? 'Story unpublished — moved to drafts' : 'Story published to the site',
    );

  const remove = (post) => {
    const message = post.isBase
      ? `Take “${post.title}” off the site? It stays in the ledger and can be restored.`
      : `Delete “${post.title}” permanently? This cannot be undone.`;
    if (!window.confirm(message)) return;
    run(post.id, () => takeDown(post.id), post.isBase ? 'Story taken down' : 'Story deleted');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-[#22232A] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <MicroLabel tone="red">Newsroom ledger</MicroLabel>
          <span className="text-[10.5px] text-[#8A8C99]">
            {rows.length} of {counts.all} stories
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5F616E]">
            {counts.published} live · {counts.draft} drafts
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[#1D1E25] px-3.5 py-2">
        <Segmented
          options={FILTERS.map((item) => ({
            id: item.id,
            label: `${item.label}${counts[item.id] != null ? ` ${counts[item.id]}` : ''}`,
          }))}
          value={filter}
          onChange={setFilter}
        />

        <label className="relative min-w-[160px] flex-1 sm:max-w-[260px]">
          <span className="sr-only">Filter stories</span>
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#6F7180]" />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Headline, slug, tag…"
            className="h-7 pl-7 text-[11px]"
          />
        </label>

        <select
          aria-label="Filter by section"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-7 rounded-[4px] border border-[#262832] bg-[#0A0B0F] px-1.5 text-[10.5px] text-bone focus:border-pulse/70 focus:outline-none"
        >
          <option value="all">All sections</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="relative flex items-center gap-1">
          <ArrowUpDown className="pointer-events-none absolute left-1.5 h-3 w-3 text-[#6F7180]" />
          <span className="sr-only">Sort stories</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-7 rounded-[4px] border border-[#262832] bg-[#0A0B0F] pl-6 pr-1.5 text-[10.5px] text-bone focus:border-pulse/70 focus:outline-none"
          >
            {SORTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#1D1E25] text-[8.5px] uppercase tracking-[0.14em] text-[#6F7180]">
                <th scope="col" className="px-3.5 py-1.5 font-bold">
                  Story
                </th>
                <th scope="col" className="px-2 py-1.5 font-bold">
                  Section
                </th>
                <th scope="col" className="px-2 py-1.5 font-bold">
                  Reads
                </th>
                <th scope="col" className="px-2 py-1.5 font-bold">
                  Filed
                </th>
                <th scope="col" className="px-2 py-1.5 font-bold">
                  Status
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-bold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => {
                const pinned =
                  settings.heroPins.includes(post.slug) ||
                  settings.tickerPins.includes(post.slug);
                const here = localReads[post.slug] || 0;
                return (
                  <tr
                    key={post.id}
                    className={cx(
                      'group border-b border-[#1B1C22] align-middle transition-colors last:border-b-0 hover:bg-white/[0.02]',
                      busy === post.id && 'opacity-60',
                    )}
                  >
                    <td className="max-w-[420px] px-3.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.image}
                          alt=""
                          loading="lazy"
                          className="h-8 w-11 shrink-0 rounded-[2px] border border-[#262832] object-cover"
                          style={{ objectPosition: post.imagePosition }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {post.hero ? <Flame className="h-2.5 w-2.5 shrink-0 text-pulse" /> : null}
                            {pinned ? <Tag tone="live">Pinned</Tag> : null}
                            {post.isBase ? <MicroLabel>Shipped</MicroLabel> : <MicroLabel tone="red">Local</MicroLabel>}
                          </div>
                          <button
                            type="button"
                            onClick={() => onEdit(post.id)}
                            className="mt-0.5 block max-w-full truncate text-left text-[11.5px] font-semibold text-bone/90 hover:text-white"
                            title={post.title}
                          >
                            {post.title}
                          </button>
                          <p className="truncate font-mono text-[9px] text-[#5F616E]">/article/{post.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="text-[10.5px] text-[#9A9CAA]">{post.category}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-[10.5px] font-semibold text-bone/85">{formatCompactViews(post.views || 0)}</p>
                      <div className="mt-1 w-14">
                        <Progress value={post.views || 0} max={maxReads} />
                      </div>
                      {here > 0 ? (
                        <p className="mt-0.5 text-[8.5px] text-emerald-400/80">+{here} here</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="whitespace-nowrap text-[10px] text-[#8A8C99]">
                        {formatRelativeTime(post.publishedAt)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <Tag tone={statusTone[post.status] || 'muted'}>{statusLabel[post.status] || post.status}</Tag>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        {post.status !== 'hidden' ? (
                          <a
                            href={`/article/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${post.title}`}
                            title="Open on the site"
                            className="grid h-6 w-6 place-items-center rounded-[3px] text-[#7A7C89] transition-colors hover:text-bone"
                          >
                            <Eye className="h-3 w-3" />
                          </a>
                        ) : null}
                        <IconButton label={`Edit ${post.title}`} onClick={() => onEdit(post.id)} className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </IconButton>
                        {post.status === 'hidden' ? (
                          <IconButton
                            label={`Restore ${post.title}`}
                            className="h-6 w-6"
                            onClick={() =>
                              run(post.id, () => restore(post), 'Story restored to the site')
                            }
                          >
                            <RotateCcw className="h-3 w-3" />
                          </IconButton>
                        ) : (
                          <IconButton
                            label={post.status === 'published' ? `Unpublish ${post.title}` : `Publish ${post.title}`}
                            className="h-6 w-6"
                            onClick={() => toggleStatus(post)}
                          >
                            <Upload className="h-3 w-3" />
                          </IconButton>
                        )}
                        <IconButton
                          label={`${post.isBase ? 'Take down' : 'Delete'} ${post.title}`}
                          className="h-6 w-6 hover:text-pulse"
                          onClick={() => remove(post)}
                        >
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
        <EmptyState icon={Search} title="No stories match that filter">
          Clear the search or pick another status to see the rest of the ledger.
        </EmptyState>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1D1E25] px-3.5 py-2">
        <p className="text-[9.5px] text-[#5F616E]">
          Shipped stories come from the shipped dataset and can always be restored. Locally written
          stories live in the browser database.
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#5F616E]">
          {compact ? 'ledger · condensed' : 'ledger · full'}
        </span>
      </div>
    </Card>
  );
}
