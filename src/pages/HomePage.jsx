import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Flame, Radar, TrendingUp, Zap } from 'lucide-react';
import HeroCarousel from '../components/HeroCarousel';
import TopStoriesSidebar from '../components/TopStoriesSidebar';
import CategoryFilters from '../components/CategoryFilters';
import NewsGrid from '../components/NewsGrid';
import LiveTVPanel from '../components/LiveTVPanel';
import TrendingNowPanel from '../components/TrendingNowPanel';
import SectionHeading from '../components/SectionHeading';
import {
  CATEGORIES,
  STORIES,
  formatCompactViews,
  formatRelativeTime,
  storiesByCategory,
} from '../data/news';
import { useApp } from '../context/AppContext';
import { getHeroStories } from '../lib/contentStore';
import Seo from '../components/Seo';
import { absoluteUrl, SITE } from '../config/site';

const FILTERS = ['All', 'World', 'Business', 'Technology', 'Sports', 'Entertainment', 'Health', 'Science'];

export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const { openModal } = useApp();
  const category = params.get('category') || 'All';

  const latest = useMemo(() => {
    const heroIds = new Set(getHeroStories().map((s) => s.id));
    const list = storiesByCategory(category).filter(
      (s) => category !== 'All' || !heroIds.has(s.id),
    );
    const sorted = [...list].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );
    return category === 'All' ? sorted.slice(0, 8) : sorted;
  }, [category]);

  const counts = useMemo(() => {
    const base = { All: STORIES.length };
    CATEGORIES.forEach((c) => {
      base[c] = STORIES.filter((s) => s.category === c).length;
    });
    return base;
  }, []);

  const mostRead = useMemo(
    () => [...STORIES].sort((a, b) => b.views - a.views).slice(0, 4),
    [],
  );

  const editorPicks = useMemo(
    () => [STORIES[13], STORIES[12], STORIES[15]],
    [],
  );

  const setCategory = (next) => {
    if (next === 'All') setParams({}, { replace: true });
    else setParams({ category: next }, { replace: true });
    const anchor = document.getElementById('latest-news');
    if (anchor && window.scrollY > 300) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <main id="main">
      <Seo
        title={category === 'All' ? undefined : `${category} News`}
        description={
          category === 'All'
            ? SITE.description
            : `The latest ${category.toLowerCase()} reporting from NewsPulse 24 — breaking stories, live updates and analysis from six bureaux worldwide.`
        }
        path={category === 'All' ? '/' : `/?category=${encodeURIComponent(category)}`}
        image="/og-image.jpg"
        imageAlt="NewsPulse 24 — real news, global impact"
        keywords={[category === 'All' ? 'top stories' : `${category.toLowerCase()} news`]}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: category === 'All' ? 'Latest news' : `${category} news`,
            itemListElement: latest.slice(0, 8).map((story, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: absoluteUrl(`/article/${story.slug}`),
              name: story.title,
            })),
          },
        ]}
      />
      <div className="container-news pt-3 sm:pt-4">
        {/* ---------- HERO + TOP STORIES ---------- */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_326px]">
          <div className="min-w-0">
            <HeroCarousel />
          </div>
          <div className="min-w-0">
            <TopStoriesSidebar className="h-full" />
          </div>
        </div>

        {/* ---------- LATEST NEWS + LIVE TV ---------- */}
        <div
          id="latest-news"
          className="mt-5 grid scroll-mt-[150px] gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_326px]"
        >
          <section aria-labelledby="latest-heading" className="min-w-0">
            <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2
                id="latest-heading"
                className="red-bar flex shrink-0 items-center text-[15px] font-bold uppercase tracking-[0.08em] text-bone"
              >
                {category === 'All' ? 'Latest News' : `${category} News`}
              </h2>
              <CategoryFilters value={category} onChange={setCategory} counts={counts} />
            </div>
            <NewsGrid stories={latest} onReset={() => setCategory('All')} showViews />
            <div className="mt-3 flex items-center justify-between rounded-[6px] border border-line bg-ink-850/60 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <Zap className="h-3 w-3 text-pulse" />
                Feed updating continuously · {latest.length} stories in view
              </p>
              <Link
                to="/latest"
                className="group flex items-center gap-1 text-[11px] font-semibold text-pulse transition-colors hover:text-white"
              >
                Full archive
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <LiveTVPanel />
            <TrendingNowPanel />
          </div>
        </div>

        {/* ---------- MOST READ RAIL ---------- */}
        <section aria-labelledby="most-read-heading" className="defer-paint mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2
              id="most-read-heading"
              className="red-bar flex items-center text-[15px] font-bold uppercase tracking-[0.08em] text-bone"
            >
              Most Read Across NewsPulse
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <TrendingUp className="h-3 w-3 text-pulse" /> Ranked by real-time reads
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mostRead.map((story, i) => (
              <Link
                key={story.id}
                to={`/article/${story.slug}`}
                className="group relative overflow-hidden rounded-[7px] border border-line bg-ink-850 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-pulse/50 hover:shadow-[0_20px_40px_-28px_rgba(255,16,36,0.6)]"
              >
                <span className="pointer-events-none absolute -right-2 -top-3 text-[54px] font-extrabold leading-none text-white/[0.045] transition-colors group-hover:text-pulse/10">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="eyebrow">{story.category}</span>
                  <span className="h-2.5 w-px bg-line" />
                  <span className="flex items-center gap-1 text-[9.5px] font-medium text-muted">
                    <Flame className="h-2.5 w-2.5 text-pulse" />
                    {formatCompactViews(story.views)}
                  </span>
                </div>
                <h3 className="mt-1.5 line-clamp-2 text-[12.5px] font-bold leading-snug text-bone transition-colors group-hover:text-white">
                  {story.title}
                </h3>
                <p className="mt-2 text-[10px] font-medium text-muted">
                  {formatRelativeTime(story.publishedAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- EDITOR'S DESK ---------- */}
        <section aria-labelledby="editors-heading" className="defer-paint mt-6">
          <SectionHeading
            title="From the Editor’s Desk"
            action="All opinion"
            actionTo="/latest?filter=opinion"
          />
          <div className="grid gap-3 md:grid-cols-3">
            {editorPicks.map((story) => (
              <Link
                key={story.id}
                to={`/article/${story.slug}`}
                className="group card-hover overflow-hidden rounded-[7px] border border-line bg-ink-850"
              >
                <div className="relative aspect-[16/8] overflow-hidden">
                  <img
                    src={story.image}
                    alt={story.imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ objectPosition: story.imagePosition }}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                    <span className="rounded-[3px] bg-pulse px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-white">
                      {story.category}
                    </span>
                    <span className="text-[9.5px] font-medium text-bone/70">
                      {story.author.name}
                    </span>
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-bone transition-colors group-hover:text-pulse">
                    {story.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                    {story.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- PULSE REPORT BAND ---------- */}
        <section className="defer-paint relative mt-6 overflow-hidden rounded-[9px] border border-line bg-ink-850">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-pulse/15 blur-[70px]" />
          <div className="relative flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="max-w-xl">
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-pulse">
                <Radar className="h-3 w-3" /> The Pulse Report
              </span>
              <h2 className="mt-1.5 text-[19px] font-extrabold tracking-[-0.02em] text-bone sm:text-[22px]">
                Six stories. One briefing. Before the world wakes up.
              </h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                Our editors compress the overnight wire into a five-minute read, delivered at 06:00
                local time — every weekday, free.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => openModal('subscribe')}
                className="btn-red h-[42px] px-5 text-[12.5px]"
              >
                Join the briefing <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-center text-[10px] text-muted/70">
                184,000 readers · unsubscribe anytime
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
