import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Sparkles, X } from 'lucide-react';
import { STORIES, searchStories } from '../data/news';
import NewsGrid from '../components/NewsGrid';
import TrendingNowPanel from '../components/TrendingNowPanel';
import Seo from '../components/Seo';

const SUGGESTIONS = ['Artificial intelligence', 'Markets', 'Mars', 'Climate', 'Football', 'Quantum'];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [term, setTerm] = useState(q);

  useEffect(() => setTerm(q), [q]);

  const results = useMemo(() => (q ? searchStories(q) : []), [q]);
  const fallback = useMemo(
    () => [...STORIES].sort((a, b) => b.views - a.views).slice(0, 4),
    [],
  );

  const submit = (e) => {
    e.preventDefault();
    setParams(term.trim() ? { q: term.trim() } : {});
  };

  return (
    <main id="main" className="container-news py-5">
      <Seo
        title={q ? `Search results for “${q}”` : 'Search the newsroom'}
        description={
          q
            ? `${results.length} NewsPulse 24 stories matching “${q}”, including headlines, analysis, reporters and topics.`
            : 'Search NewsPulse 24 across headlines, sections, reporters and topics.'
        }
        path={q ? `/search?q=${encodeURIComponent(q)}` : '/search'}
        keywords={['news search', q].filter(Boolean)}
        noindex
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'SearchResultsPage',
            name: q ? `Search results for ${q}` : 'Search the newsroom',
            about: q || undefined,
          },
        ]}
      />
      <div className="mb-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-pulse">
          NewsPulse Search
        </span>
        <h1 className="heading-xl mt-1.5 text-[25px] sm:text-[32px]">Find the story behind the story</h1>
        <form onSubmit={submit} className="mt-3 flex max-w-2xl items-center gap-2">
          <div className="flex h-[46px] flex-1 items-center gap-2 rounded-[7px] border border-line bg-ink-850 px-3.5 focus-within:border-pulse/60">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search headlines, topics and reporters..."
              aria-label="Search stories"
              className="h-full w-full min-w-0 bg-transparent text-[13px] text-bone placeholder:text-muted/70 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm('')}
                aria-label="Clear search"
                className="text-muted hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" className="btn-red h-[46px] px-5 text-[12.5px]">
            Search
          </button>
        </form>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            <Sparkles className="h-3 w-3 text-pulse" /> Try
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setParams({ q: s })}
              className="rounded-full border border-line bg-ink-800 px-2.5 py-1 text-[10.5px] text-bone/80 transition-colors hover:border-pulse/60 hover:text-pulse"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="mb-2.5 flex items-center justify-between border-b border-line pb-2">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-bone">
              {q ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Start typing'}
            </h2>
            {q && (
              <span className="text-[10.5px] text-muted">
                for “<span className="font-semibold text-pulse">{q}</span>”
              </span>
            )}
          </div>

          {q ? (
            <NewsGrid stories={results} columns={3} />
          ) : (
            <div className="rounded-[8px] border border-dashed border-line bg-ink-850/60 p-6">
              <p className="text-[13px] font-semibold text-bone">Search across the entire newsroom.</p>
              <p className="mt-1 max-w-lg text-[11.5px] leading-relaxed text-muted">
                Results are matched against headlines, categories, summaries, reporters and topic
                tags. Press <kbd className="rounded border border-line px-1 text-[10px]">/</kbd> anywhere
                on the site to open search instantly.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {fallback.map((s) => (
                  <Link
                    key={s.id}
                    to={`/article/${s.slug}`}
                    className="group flex items-center gap-2.5 rounded-[5px] border border-line bg-ink-800/60 p-2 transition-colors hover:border-pulse/50"
                  >
                    <img src={s.image} alt="" className="h-10 w-14 rounded-[3px] object-cover" />
                    <span className="min-w-0">
                      <span className="eyebrow !text-[9px]">{s.category}</span>
                      <span className="line-clamp-1 block text-[11.5px] font-semibold text-bone">
                        {s.title}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          <TrendingNowPanel />
        </aside>
      </div>
    </main>
  );
}
