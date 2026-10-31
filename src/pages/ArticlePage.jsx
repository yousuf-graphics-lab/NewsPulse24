import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Clock,
  Eye,
  Link2,
  Share2,
} from 'lucide-react';
import {
  formatAbsoluteDate,
  formatCompactViews,
  formatRelativeTime,
  getStoryBySlug,
  relatedStories,
} from '../data/news';
import { useApp } from '../context/AppContext';
import NewsCard from '../components/NewsCard';
import SectionHeading from '../components/SectionHeading';
import NotFoundPage from './NotFoundPage';

export default function ArticlePage() {
  const { slug } = useParams();
  const story = getStoryBySlug(slug);
  const { toggleBookmark, isBookmarked, pushToast } = useApp();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('article-body');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.5;
      const scrolled = Math.min(Math.max(-rect.top + 120, 0), Math.max(total, 1));
      setProgress(Math.round((scrolled / Math.max(total, 1)) * 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  const related = useMemo(() => (story ? relatedStories(story, 3) : []), [story]);

  if (!story) return <NotFoundPage />;

  const saved = isBookmarked(story.id);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = encodeURIComponent(story.title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      pushToast('Article link copied to clipboard.', 'success');
    } catch {
      pushToast('Copy failed — your browser blocked clipboard access.', 'error');
    }
  };

  const shares = [
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${shareText}`,
      short: 'X',
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      short: 'f',
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      short: 'in',
    },
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`,
      short: 'wa',
    },
  ];

  return (
    <main id="main" className="container-news py-4">
      {/* reading progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent">
        <div
          className="h-full bg-pulse shadow-[0_0_12px_rgba(255,16,36,0.9)] transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[10.5px] text-muted">
        <Link to="/" className="flex items-center gap-1 transition-colors hover:text-pulse">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-line-soft" />
        <Link
          to={`/?category=${encodeURIComponent(story.category)}`}
          className="transition-colors hover:text-pulse"
        >
          {story.category}
        </Link>
        <ChevronRight className="h-3 w-3 text-line-soft" />
        <span className="line-clamp-1 max-w-[60vw] text-bone/60">{story.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_312px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/?category=${encodeURIComponent(story.category)}`}
                className="rounded-[3px] bg-pulse px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-pulse-600"
              >
                {story.category}
              </Link>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {formatRelativeTime(story.publishedAt)} · {story.readMinutes} min read
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="heading-xl mt-2.5 text-[27px] leading-[1.06] sm:text-[36px] lg:text-[42px]"
            >
              {story.title}
            </motion.h1>

            <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-muted sm:text-[15px]">
              {story.excerpt}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-pulse to-pulse-600 text-[11px] font-bold text-white ring-1 ring-white/10">
                  {story.author.initials}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-bone">{story.author.name}</p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                    {story.author.role}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatAbsoluteDate(story.publishedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {formatCompactViews(story.views)} reads
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label="Copy article link"
                    className="grid h-7 w-7 place-items-center rounded border border-line text-muted transition-colors hover:border-pulse/60 hover:text-pulse"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(story)}
                    aria-pressed={saved}
                    aria-label={saved ? 'Remove bookmark' : 'Bookmark article'}
                    className={`grid h-7 w-7 place-items-center rounded border transition-colors ${
                      saved
                        ? 'border-pulse/60 bg-pulse/15 text-pulse'
                        : 'border-line text-muted hover:border-pulse/60 hover:text-pulse'
                    }`}
                  >
                    {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </header>

          <figure className="mt-4 overflow-hidden rounded-[8px] border border-line">
            <img
              src={story.image}
              alt={story.imageAlt}
              className="aspect-[16/8.6] w-full object-cover"
              style={{ objectPosition: story.imagePosition }}
            />
            <figcaption className="flex items-center justify-between gap-3 border-t border-line bg-ink-850 px-3 py-2 text-[10px] text-muted">
              <span>{story.imageAlt}.</span>
              <span className="shrink-0 uppercase tracking-[0.1em]">NewsPulse 24 Picture Desk</span>
            </figcaption>
          </figure>

          <div className="mt-6 grid gap-6 lg:grid-cols-[44px_minmax(0,1fr)]">
            <div className="hidden lg:block">
              <div className="sticky top-[190px] flex flex-col items-center gap-1.5">
                <span className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-muted/60">
                  Share
                </span>
                {shares.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line bg-ink-800 text-[10px] font-bold text-bone/70 transition-colors hover:border-pulse/60 hover:bg-pulse hover:text-white"
                  >
                    {s.short}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-ink-800 text-bone/70 transition-colors hover:border-pulse/60 hover:text-pulse"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div>
              <div id="article-body" className="article-body max-w-[760px]">
                {story.body.map((block, i) => {
                  if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
                  if (block.type === 'quote')
                    return (
                      <blockquote key={i}>
                        “{block.text}”
                        <cite>— {block.cite}</cite>
                      </blockquote>
                    );
                  if (block.type === 'list')
                    return (
                      <ul key={i}>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    );
                  return <p key={i}>{block.text}</p>;
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Topics
                </span>
                {story.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/search?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-line bg-ink-800 px-2.5 py-1 text-[10.5px] font-medium text-bone/80 transition-colors hover:border-pulse/60 hover:text-pulse"
                  >
                    {tag}
                  </Link>
                ))}
              </div>

              {/* mobile share row */}
              <div className="mt-4 flex items-center gap-2 lg:hidden">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Share
                </span>
                {shares.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line bg-ink-800 text-[10px] font-bold text-bone/70"
                  >
                    {s.short}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="grid h-8 w-8 place-items-center rounded-full border border-line bg-ink-800 text-bone/70"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* author box */}
              <div className="mt-5 rounded-[8px] border border-line bg-ink-850 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pulse to-pulse-600 text-[13px] font-bold text-white ring-1 ring-white/10">
                    {story.author.initials}
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-bone">{story.author.name}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pulse">
                      {story.author.role}
                    </p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                      {story.author.bio}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/?category=${encodeURIComponent(story.category)}`}
                  className="group flex items-center gap-1.5 text-[11.5px] font-semibold text-pulse transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  More in {story.category}
                </Link>
                <Link
                  to="/"
                  className="rounded-[4px] border border-line px-3 py-1.5 text-[11px] font-semibold text-bone/80 transition-colors hover:border-pulse/60 hover:text-white"
                >
                  Return to homepage
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* sidebar */}
        <aside className="flex flex-col gap-3">
          <div className="panel overflow-hidden">
            <div className="border-b border-line px-3.5 py-2.5">
              <h2 className="red-bar flex items-center text-[12px] font-bold uppercase tracking-[0.1em] text-bone">
                Related Coverage
              </h2>
            </div>
            <ul className="divide-y divide-line/70">
              {related.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/article/${s.slug}`}
                    className="group flex gap-2.5 p-2.5 transition-colors hover:bg-white/[0.035]"
                  >
                    <img
                      src={s.image}
                      alt={s.imageAlt}
                      loading="lazy"
                      className="h-[62px] w-[92px] shrink-0 rounded-[4px] object-cover"
                      style={{ objectPosition: s.imagePosition }}
                    />
                    <span className="min-w-0">
                      <span className="eyebrow !text-[9px]">{s.category}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] font-bold leading-snug text-bone group-hover:text-pulse">
                        {s.title}
                      </span>
                      <span className="mt-1 block text-[9.5px] text-muted">
                        {formatRelativeTime(s.publishedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel overflow-hidden p-4">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-pulse">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" /> Live now
            </span>
            <h2 className="mt-1.5 text-[13.5px] font-bold leading-snug text-bone">
              Follow this story on the live desk
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Continuous broadcast coverage with correspondents in the field.
            </p>
            <Link to="/live" className="btn-red mt-3 h-9 w-full text-[11.5px]">
              Open live player
            </Link>
          </div>
        </aside>
      </div>

      <section className="mt-8">
        <SectionHeading title="Keep Reading" action="All stories" actionTo="/latest" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((s) => (
            <NewsCard key={s.id} story={s} />
          ))}
        </div>
      </section>
    </main>
  );
}
