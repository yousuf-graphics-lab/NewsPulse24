import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { STORIES } from '../data/news';
import Seo from '../components/Seo';

export default function NotFoundPage() {
  const suggestions = [...STORIES].sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <main id="main" className="container-news py-14">
      <Seo
        title="Page not found"
        description="This page has moved or never existed. Browse the latest NewsPulse 24 reporting instead."
        path="/404"
        noindex
      />
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-pulse/30 bg-pulse/10">
          <Compass className="h-6 w-6 text-pulse" />
        </span>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-pulse">
          Signal lost · 404
        </p>
        <h1 className="heading-xl mt-2 text-[27px] sm:text-[34px]">
          This desk has no story at that address.
        </h1>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
          The page you requested may have moved, or the link may be incomplete. Our live wire is
          still running — here is what the world is reading right now.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn-red h-10 px-5 text-[12.5px]">
            <Home className="h-4 w-4" /> Return home
          </Link>
          <Link to="/latest" className="btn-ghost h-10 px-4 text-[12.5px]">
            Browse all stories
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
        {suggestions.map((s) => (
          <Link
            key={s.id}
            to={`/article/${s.slug}`}
            className="group overflow-hidden rounded-[7px] border border-line bg-ink-850"
          >
            <img src={s.image} alt="" className="aspect-[16/9] w-full object-cover" />
            <span className="block p-2.5">
              <span className="eyebrow !text-[9px]">{s.category}</span>
              <span className="line-clamp-2 text-[12px] font-bold text-bone group-hover:text-pulse">
                {s.title}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
