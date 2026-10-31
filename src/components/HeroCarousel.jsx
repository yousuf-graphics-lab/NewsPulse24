import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { EASE, EASE_SOFT } from '../lib/motion';
import { formatRelativeTime } from '../data/news';
import { getHeroStories } from '../lib/contentStore';
import { useApp } from '../context/AppContext';

const AUTOPLAY_MS = 8000;

const LINES = {
  'a-more-connected-world': [
    { text: 'A More', accent: false },
    { text: 'Connected World', accent: true },
    { text: 'for a Brighter', accent: false },
    { text: 'Tomorrow', accent: false },
  ],
  'ai-breakthrough-promises-a-smarter-future': [
    { text: 'AI Breakthrough', accent: true },
    { text: 'Promises a', accent: false },
    { text: 'Smarter Future', accent: false },
  ],
  'newspulse-24-goes-global': [
    { text: 'NewsPulse 24', accent: false },
    { text: 'Goes Global', accent: true },
    { text: 'Six Continents,', accent: false },
    { text: 'One Newsroom', accent: false },
  ],
};

const fallbackLines = (title) => {
  const words = title.split(' ');
  const mid = Math.ceil(words.length / 2);
  return [
    { text: words.slice(0, Math.min(2, mid)).join(' '), accent: false },
    { text: words.slice(Math.min(2, mid), mid + 1).join(' '), accent: true },
    { text: words.slice(mid + 1).join(' '), accent: false },
  ].filter((l) => l.text);
};

const textVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: EASE_SOFT } },
};

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timer = useRef(null);
  const { openModal } = useApp();
  const slides = getHeroStories();
  const safeIndex = index % Math.max(slides.length, 1);
  const story = slides[safeIndex];
  const lines = LINES[story.slug] || fallbackLines(story.title);

  const goTo = useCallback((next) => {
    setIndex((prev) => {
      const total = Math.max(slides.length, 1);
      return ((next % total) + total) % total;
    });
    setProgressKey((k) => k + 1);
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return undefined;
    timer.current = window.setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer.current);
  }, [index, paused, goTo]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="group relative isolate h-[470px] overflow-hidden rounded-[10px] border border-line bg-ink-900 sm:h-[440px] lg:h-[420px]"
    >
      {/* image stack */}
      <AnimatePresence initial={false}>
        <motion.div
          key={story.id}
          initial={{ opacity: 0, scale: 1.07 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{
            opacity: { duration: 0.75, ease: EASE },
            scale: { duration: 1.15, ease: EASE },
          }}
          style={{ willChange: 'opacity, transform' }}
          className="absolute inset-0"
        >
          <img
            src={story.image}
            alt={story.imageAlt}
            className="h-full w-full object-cover"
            style={{ objectPosition: story.imagePosition }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_46%,rgba(255,16,36,0.22),transparent_58%)]" />
        </motion.div>
      </AnimatePresence>

      {/* readability overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/[0.88] to-ink-950/15" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/95 via-transparent to-ink-950/40" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

      {/* broadcast switch sweep */}
      <AnimatePresence>
        <motion.span
          key={`sweep-${progressKey}`}
          initial={{ x: '-120%', opacity: 0.7 }}
          animate={{ x: '120%', opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE_SOFT }}
          style={{ willChange: 'transform, opacity' }}
          className="pointer-events-none absolute inset-y-0 z-20 w-1/3 skew-x-[-12deg] bg-gradient-to-r from-transparent via-pulse/20 to-transparent"
        />
      </AnimatePresence>

      {/* HUD chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3.5 sm:px-6">
        <span className="flex items-center gap-2 rounded-[3px] border border-white/10 bg-black/40 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.22em] text-bone/70 backdrop-blur-sm">
          <span className="h-1 w-1 animate-pulseDot rounded-full bg-pulse" /> Global desk · Live wire
        </span>
        <span className="hidden items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-[0.2em] text-bone/45 sm:flex">
          {String(index + 1).padStart(2, '0')}
          <span className="text-bone/25">/</span>
          {String(slides.length).padStart(2, '0')}
        </span>
      </div>

      {/* content */}
      <div className="relative z-10 flex h-full flex-col justify-center px-5 pb-14 pt-10 sm:px-8 sm:pb-12 sm:pt-8 lg:px-9 lg:pb-11 lg:pt-7">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={story.id}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.5,
              ease: EASE,
              staggerChildren: 0.055,
              delayChildren: 0.05,
            }}
            style={{ willChange: 'opacity, transform' }}
            className="w-full max-w-[560px]"
          >
            <motion.div variants={textVariants} transition={{ duration: 0.42, ease: EASE }} className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-pulse px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-white shadow-[0_6px_20px_-8px_rgba(255,16,36,1)]">
                <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-white" />
                {story.heroKicker || story.category}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bone/55">
                {(story.heroKicker || '').toLowerCase() === story.category.toLowerCase()
                  ? `Top story · ${formatRelativeTime(story.publishedAt)}`
                  : `${story.category} · ${formatRelativeTime(story.publishedAt)}`}
              </span>
            </motion.div>

            <motion.h1
              variants={textVariants}
              transition={{ duration: 0.52, ease: EASE }}
              className="heading-xl text-[30px] leading-[1.04] sm:text-[38px] sm:leading-[1.02] lg:text-[44px]"
            >
              {lines.map((line, i) => (
                <span key={`${line.text}-${i}`} className="block">
                  <span className={line.accent ? 'text-pulse' : 'text-white'}>{line.text}</span>
                </span>
              ))}
            </motion.h1>

            <motion.p
              variants={textVariants}
              transition={{ duration: 0.48, ease: EASE }}
              className="mt-3.5 max-w-[430px] text-[12.5px] leading-relaxed text-bone/70 sm:text-[13.5px]"
            >
              {story.excerpt}
            </motion.p>

            <motion.div
              variants={textVariants}
              transition={{ duration: 0.48, ease: EASE }}
              className="mt-5 flex flex-wrap items-center gap-2.5"
            >
              <Link
                to={`/article/${story.slug}`}
                className="btn-red h-[42px] w-[176px] text-[13px]"
              >
                Read Full Story
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={() => openModal('live')}
                className="hidden items-center gap-1.5 rounded-[5px] border border-white/15 bg-black/35 px-3.5 py-2.5 text-[12px] font-semibold text-bone/85 backdrop-blur-sm transition-colors hover:border-pulse/60 hover:text-white sm:flex"
              >
                <Radio className="h-3.5 w-3.5 text-pulse" /> Watch coverage
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="absolute inset-x-4 bottom-3.5 z-20 flex items-center justify-between sm:inset-x-6">
        <div className="flex items-center gap-2" role="tablist" aria-label="Choose featured story">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Featured story ${i + 1}: ${s.title}`}
              onClick={() => goTo(i)}
              className="group/dot relative h-1.5 overflow-hidden rounded-full transition-all duration-500"
              style={{ width: i === index ? 46 : 16 }}
            >
              <span
                className={`absolute inset-0 rounded-full ${
                  i === index ? 'bg-white/20' : 'bg-white/25 group-hover/dot:bg-white/45'
                }`}
              />
              {i === index && (
                <motion.span
                  key={`bar-${progressKey}-${index}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: paused ? 0.35 : 1 }}
                  transition={{ duration: paused ? 0.3 : AUTOPLAY_MS / 1000, ease: 'linear' }}
                  style={{ originX: 0 }}
                  className="absolute inset-0 rounded-full bg-pulse shadow-[0_0_10px_rgba(255,16,36,0.9)]"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous featured story"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/45 text-bone/80 backdrop-blur-sm transition-all hover:border-pulse hover:bg-pulse hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next featured story"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/45 text-bone/80 backdrop-blur-sm transition-all hover:border-pulse hover:bg-pulse hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
