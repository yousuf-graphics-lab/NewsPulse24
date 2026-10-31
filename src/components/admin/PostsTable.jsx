import { useMemo, useState } from 'react';
import {
  EyeOff,
  FilePlus2,
  Pencil,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { allPosts, restoreBaseStory } from '../../lib/contentStore';
import { formatRelativeTime } from '../../data/news';
import { Badge, Button, Card, EmptyState, PanelHeading, TextInput } from './ui';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'hidden', label: 'Hidden' },
];

const STATUS_TONE = { published: 'live', draft: 'draft', hidden: 'hidden' };

export default function PostsTable({ version, onEdit, onNew, onStatus, onDelete, onRestore, notify }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const posts = useMemo(() => {
    void version;
    const rows = allPosts();
    const q = query.trim().toLowerCase();
    return rows.filter((post) => {
      if (filter !== 'all' && post.status !== filter) return false;
      if (!q) return true;
      return [post.title, post.slug, post.category, post.author?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [filter, query, version]);

  const counts = useMemo(() => {
    void version;
    const rows = allPosts();
    return {
      all: rows.length,
      published: rows.filter((p) => p.status === 'published').length,
      draft: rows.filter((p) => p.status === 'draft').length,
      hidden: rows.filter((p) => p.status === 'hidden').length,
    };
  }, [version]);

  const restore = (post) => {
    restoreBaseStory(post.id);
    notify(`“${post.title}” is back on the wire`, 'success');
    onRestore?.();
  };

  return (
    <Card>
      <PanelHeading
        title="Stories"
        description="Write, publish, edit or take down anything on the site."
        action={
          <Button variant="primary" size="sm" onClick={onNew}>
            <FilePlus2 className="h-3.5 w-3.5" /> New story
          </Button>
        }
      />

      <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          />
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headlines, slugs, sections, reporters…"
            aria-label="Search stories"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={`flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[11px] font-semibold transition-colors ${
                filter === item.id
                  ? 'border-pulse/60 bg-pulse/[0.14] text-white'
                  : 'border-line-soft bg-ink-800 text-muted hover:text-bone'
              }`}
            >
              {item.label}
              <span className="text-[10px] font-bold text-muted/80">{counts[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {posts.length ? (
        <ul className="divide-y divide-line/70">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-3 sm:px-5"
            >
              <img
                src={post.image || '/images/hero-earth.jpg'}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[52px] w-[76px] shrink-0 rounded-[4px] border border-line object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={STATUS_TONE[post.status] || 'muted'}>{post.status}</Badge>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted/80">
                    {post.category}
                  </span>
                  {post.isBase ? null : (
                    <span className="rounded-[3px] border border-pulse/30 px-1 py-[1px] text-[9px] font-bold uppercase tracking-[0.1em] text-pulse/90">
                      New
                    </span>
                  )}
                  {post.hero ? (
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-pulse">
                      Breaking
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[12.5px] font-semibold text-bone/90">{post.title}</p>
                <p className="mt-0.5 truncate text-[10.5px] text-muted/75">
                  /{post.slug} · {post.author?.name || 'Desk'} ·{' '}
                  {formatRelativeTime(post.updatedAt || post.publishedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {post.status === 'published' ? (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => onStatus(post, 'draft')}
                    title="Unpublish (keep as draft)"
                    aria-label={`Unpublish ${post.title}`}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </Button>
                ) : post.status === 'draft' ? (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => onStatus(post, 'published')}
                    title="Publish now"
                    aria-label={`Publish ${post.title}`}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => restore(post)}
                    title="Restore to the site"
                    aria-label={`Restore ${post.title}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(post.id)}
                  aria-label={`Edit ${post.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                {post.status === 'hidden' ? (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(post)}
                    aria-label={`Delete ${post.title} permanently`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => onDelete(post)}
                    aria-label={`Take down ${post.title}`}
                    title={post.isBase ? 'Take down (restorable)' : 'Delete story'}
                  >
                    {post.isBase ? <EyeOff className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Undo2} title="No stories match">
          Try another search term or filter, or write something new.
        </EmptyState>
      )}
    </Card>
  );
}
