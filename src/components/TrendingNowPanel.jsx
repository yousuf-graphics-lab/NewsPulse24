import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { formatCompactViews, getTrendingStories } from '../data/news';

export default function TrendingNowPanel() {
  return (
    <section aria-labelledby="trending-heading" className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <h2
          id="trending-heading"
          className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-bone"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-pulse/15">
            <Flame className="h-3 w-3 text-pulse" />
          </span>
          Trending Now
        </h2>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted/70">
          Live rank
        </span>
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
        {getTrendingStories().map((story, i) => (
          <li key={story.id} className="border-b border-line/60 last:border-b-0">
            <Link
              to={`/article/${story.slug}`}
              className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/[0.035]"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] bg-pulse/[0.12] text-[10px] font-extrabold text-pulse ring-1 ring-pulse/25 transition-colors group-hover:bg-pulse group-hover:text-white group-hover:ring-pulse">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-[11.5px] font-semibold leading-snug text-bone/90 transition-colors group-hover:text-white">
                  {story.title}
                </span>
                <span className="mt-0.5 block text-[9.5px] font-medium uppercase tracking-[0.1em] text-muted/70">
                  {story.category} · {formatCompactViews(story.views)} reads
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
