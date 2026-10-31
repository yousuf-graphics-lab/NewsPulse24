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
            className={`shrink-0 rounded-full px-3 py-[5px] text-[11px] font-semibold transition-all duration-200 ${
              active
                ? 'bg-pulse text-white shadow-[0_6px_18px_-8px_rgba(255,16,36,1)]'
                : 'border border-line bg-ink-800/80 text-bone/75 hover:border-pulse/50 hover:text-white'
            }`}
          >
            {filter}
            {counts[filter] != null && (
              <span className={`ml-1.5 text-[9.5px] ${active ? 'text-white/70' : 'text-muted/70'}`}>
                {counts[filter]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
