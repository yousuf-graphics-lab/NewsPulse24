import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { formatRelativeTime, searchStories } from '../data/news';
import { useApp } from '../context/AppContext';

export default function SearchBar({ variant = 'header' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { setSearchOpen } = useApp();

  const results = useMemo(() => searchStories(query).slice(0, 6), [query]);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => setActive(0), [query]);

  const go = (story) => {
    if (!story) return;
    setOpen(false);
    setQuery('');
    setSearchOpen(false);
    navigate(`/article/${story.slug}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) go(results[active]);
      else if (query.trim()) {
        setOpen(false);
        setSearchOpen(false);
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      if (variant === 'overlay') setSearchOpen(false);
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${variant === 'overlay' ? '' : 'max-w-[560px]'}`}
    >
      <div
        className={`flex items-center gap-2 border bg-ink-800/90 transition-colors duration-200 ${
          showPanel ? 'border-pulse/55' : 'border-line hover:border-white/20'
        } ${variant === 'overlay' ? 'h-[52px] rounded-[8px] px-4' : 'h-[42px] rounded-[7px] px-3.5'}`}
      >
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search news, topics, people..."
          aria-label="Search news, topics and people"
          aria-expanded={showPanel}
          role="combobox"
          aria-controls="search-results"
          className="h-full w-full min-w-0 bg-transparent text-[13px] text-bone placeholder:text-muted/80 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="shrink-0 rounded p-1 text-muted transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-line bg-ink-750 px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">
            /
          </kbd>
        )}
      </div>

      {showPanel && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[8px] border border-line bg-ink-850/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              {results.length} result{results.length === 1 ? '' : 's'} for “{query.trim()}”
            </span>
            <span className="text-[10px] text-muted/70">↑↓ to navigate</span>
          </div>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px] font-semibold text-bone">No stories match that search.</p>
              <p className="mt-1 text-[11.5px] text-muted">
                Try a broader term such as “AI”, “markets”, “climate” or “Mars”.
              </p>
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {results.map((story, i) => (
                <li key={story.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(story)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      i === active ? 'bg-pulse/[0.12]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <img
                      src={story.image}
                      alt=""
                      loading="lazy"
                      className="h-10 w-14 shrink-0 rounded-[3px] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="eyebrow block">{story.category}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[12.5px] font-semibold text-bone">
                        {story.title}
                      </span>
                      <span className="meta block">{formatRelativeTime(story.publishedAt)}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line bg-ink-800/60 px-3.5 py-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearchOpen(false);
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              className="text-[11px] font-semibold text-pulse transition-colors hover:text-white"
            >
              View all results for “{query.trim()}” →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
