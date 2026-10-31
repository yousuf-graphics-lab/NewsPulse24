import { AnimatePresence, motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import NewsCard from './NewsCard';

export default function NewsGrid({ stories, columns = 4, showViews = false, onReset }) {
  if (!stories.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[7px] border border-dashed border-line bg-ink-850/60 px-6 py-14 text-center">
        <SearchX className="mb-3 h-7 w-7 text-pulse/70" />
        <p className="text-[14px] font-semibold text-bone">No stories in this section yet.</p>
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
          Our desks are filing new reporting continuously. Try another category or return to the
          complete feed.
        </p>
        {onReset && (
          <button type="button" onClick={onReset} className="btn-red mt-4 h-9 text-[12px]">
            Show all news
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
        columns === 4 ? 'xl:grid-cols-4' : columns === 3 ? 'lg:grid-cols-3' : ''
      }`}
    >
      <AnimatePresence mode="popLayout">
        {stories.map((story, i) => (
          <motion.div
            key={story.id}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{
              duration: 0.42,
              delay: Math.min(i * 0.045, 0.24),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <NewsCard story={story} showViews={showViews} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
