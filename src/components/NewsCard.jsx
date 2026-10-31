import { Link } from 'react-router-dom';
import { Bookmark, Clock, Flame, BookmarkCheck } from 'lucide-react';
import { formatRelativeTime, formatCompactViews } from '../data/news';
import { useApp } from '../context/AppContext';

export default function NewsCard({ story, compact = false, showViews = false }) {
  const { toggleBookmark, isBookmarked } = useApp();
  const saved = isBookmarked(story.id);

  return (
    <article className="group card-hover relative flex flex-col overflow-hidden rounded-[7px] border border-line bg-ink-850">
      <Link
        to={`/article/${story.slug}`}
        className="relative block overflow-hidden"
        aria-label={`Read: ${story.title}`}
      >
        <div className={compact ? 'aspect-[16/9]' : 'aspect-[16/9]'}>
          <img
            src={story.image}
            alt={story.imageAlt}
            loading="lazy"
            className="h-full w-full scale-[1.01] object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
            style={{ objectPosition: story.imagePosition }}
          />
        </div>
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
        <span className="pointer-events-none absolute inset-0 bg-pulse/0 transition-colors duration-300 group-hover:bg-pulse/[0.07]" />
        {showViews && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-[3px] bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-bone/80 backdrop-blur-sm">
            <Flame className="h-2.5 w-2.5 text-pulse" />
            {formatCompactViews(story.views)} reads
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 pt-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="eyebrow">{story.category}</span>
          <span className="flex items-center gap-1 text-[9.5px] font-medium text-muted/80">
            <Clock className="h-2.5 w-2.5" />
            {story.readMinutes} min
          </span>
        </div>

        <h3 className="text-[12.5px] font-bold leading-[1.32] tracking-[-0.01em] text-bone">
          <Link
            to={`/article/${story.slug}`}
            className="line-clamp-3 transition-colors duration-200 hover:text-pulse"
          >
            {story.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-[10.5px] font-medium text-muted">
            {formatRelativeTime(story.publishedAt)}
          </span>
          <button
            type="button"
            onClick={() => toggleBookmark(story)}
            aria-label={saved ? 'Remove from reading list' : 'Save to reading list'}
            aria-pressed={saved}
            className={`grid h-6 w-6 place-items-center rounded-[3px] border transition-all duration-200 ${
              saved
                ? 'border-pulse/60 bg-pulse/15 text-pulse'
                : 'border-transparent text-muted/70 hover:border-line hover:bg-white/5 hover:text-white'
            }`}
          >
            {saved ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </article>
  );
}
