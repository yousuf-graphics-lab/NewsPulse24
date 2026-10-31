import { motion } from 'framer-motion';
import { EASE_IN_OUT } from '../lib/motion';

const FILTERS = [
  'All',
  'World',
  'Business',
  'Technology',
  'Sports',
  'Entertainment',
  'Health',
  'Science',
];

export default function CategoryFilters({ value, onChange, counts = {} }) {
  return (
    <div
      role="tablist"
      aria-label="Filter latest news by category"
      className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-1"
    >
      {FILTERS.map((filter) => {
        const active = value === filter;
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(filter)}
            className={`relative shrink-0 rounded-full px-3 py-[5px] text-[11px] font-semibold transition-colors duration-200 ${
              active
                ? 'text-white'
                : 'border border-line bg-ink-800/80 text-bone/75 hover:border-pulse/50 hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId="filter-active-pill"
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-pulse shadow-[0_6px_18px_-8px_rgba(255,16,36,1)]"
                transition={{ duration: 0.32, ease: EASE_IN_OUT }}
              />
            )}
            <span className="relative z-10">
              {filter}
              {counts[filter] != null && (
                <span className={`ml-1.5 text-[9.5px] ${active ? 'text-white/70' : 'text-muted/70'}`}>
                  {counts[filter]}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
