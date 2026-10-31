import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TOP_STORIES, formatRelativeTime } from '../data/news';

export default function TopStoriesSidebar({ className = '' }) {
  return (
    <section
      aria-labelledby="top-stories-heading"
      className={`panel flex flex-col overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <h2
          id="top-stories-heading"
          className="red-bar flex items-center text-[12.5px] font-bold uppercase tracking-[0.1em] text-bone"
        >
          Top Stories
        </h2>
        <Link
          to="/latest?filter=top"
          className="group flex items-center gap-1 text-[10.5px] font-semibold text-pulse transition-colors hover:text-white"
        >
          View All
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ul className="grid flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
        {TOP_STORIES.map((story) => (
          <li key={story.id} className="border-b border-line/70 last:border-b-0">
            <Link
              to={`/article/${story.slug}`}
              className="group flex h-full items-center gap-3 px-2.5 py-2.5 transition-colors duration-200 hover:bg-white/[0.035]"
            >
              <div className="relative h-[74px] w-[104px] shrink-0 overflow-hidden rounded-[4px] border border-line/70">
                <img
                  src={story.image}
                  alt={story.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  style={{ objectPosition: story.imagePosition }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink-950/50 to-transparent" />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <span className="eyebrow">{story.category}</span>
                <h3 className="mt-0.5 line-clamp-2 text-[12.5px] font-bold leading-[1.3] text-bone transition-colors group-hover:text-pulse">
                  {story.title}
                </h3>
                <p className="mt-1 text-[10.5px] font-medium text-muted">
                  {formatRelativeTime(story.publishedAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
