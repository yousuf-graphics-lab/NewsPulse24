import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { STORIES, formatCompactViews, formatRelativeTime, storiesByCategory } from '../data/news';
import CategoryFilters from '../components/CategoryFilters';
import NewsGrid from '../components/NewsGrid';
import LiveTVPanel from '../components/LiveTVPanel';

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'read', label: 'Most read' },
  { id: 'oldest', label: 'Oldest first' },
];

export default function LatestPage() {
  const [params, setParams] = useSearchParams();
  const filterParam = params.get('filter');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState(filterParam === 'top' ? 'read' : 'newest');

  const stories = useMemo(() => {
    const base = [...storiesByCategory(category)];
    if (sort === 'read') return base.sort((a, b) => b.views - a.views);
    if (sort === 'oldest')
      return base.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
    return base.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [category, sort]);

  return (
    <main id="main" className="container-news py-5">
      <div className="mb-4">
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-[10.5px] text-muted">
          <Link to="/" className="hover:text-pulse">Home</Link>
          <span className="text-line-soft">/</span>
          <span className="text-bone/60">All stories</span>
        </nav>
        <h1 className="heading-xl text-[25px] sm:text-[32px]">The Full Newsroom Archive</h1>
        <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
          Every dispatch from our six bureaux, ordered by newsroom publication time. Filter by
          section or sort by what the world is reading.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="mb-3 flex flex-col gap-2 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
            <CategoryFilters value={category} onChange={setCategory} />
            <label className="flex shrink-0 items-center gap-1.5 text-[10.5px] text-muted">
              <SlidersHorizontal className="h-3 w-3" />
              <span className="sr-only">Sort stories</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setParams({});
                }}
                className="rounded-[4px] border border-line bg-ink-800 px-2 py-1 text-[11px] font-semibold text-bone focus:outline-none focus:ring-2 focus:ring-pulse/40"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <NewsGrid stories={stories} showViews onReset={() => setCategory('All')} />

          <div className="mt-5">
            <h2 className="red-bar mb-2 flex items-center text-[13px] font-bold uppercase tracking-[0.1em] text-bone">
              Trending in the archive
            </h2>
            <ul className="divide-y divide-line/60 rounded-[7px] border border-line bg-ink-850/70">
              {[...STORIES]
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/article/${s.slug}`}
                      className="group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="min-w-0">
                        <span className="eyebrow !text-[9px]">{s.category}</span>
                        <span className="block text-[12px] font-semibold text-bone group-hover:text-pulse">
                          {s.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[9.5px] text-muted">
                        {formatCompactViews(s.views)} reads
                        <span className="block text-muted/60">{formatRelativeTime(s.publishedAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </section>

        <aside>
          <LiveTVPanel />
        </aside>
      </div>
    </main>
  );
}
