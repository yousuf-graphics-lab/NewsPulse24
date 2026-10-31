import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Menu, Radio } from 'lucide-react';
import { CATEGORIES } from '../data/news';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = ['Home', ...CATEGORIES];

export default function PrimaryNavigation() {
  const { openModal, setMenuOpen } = useApp();
  const location = useLocation();
  const [params] = useSearchParams();
  const activeCategory = params.get('category');

  const isActive = (item) => {
    if (location.pathname !== '/') return false;
    if (item === 'Home') return !activeCategory;
    return activeCategory === item;
  };

  const href = (item) => (item === 'Home' ? '/' : `/?category=${encodeURIComponent(item)}`);

  return (
    <nav
      aria-label="Primary"
      className="border-b border-line bg-ink-900/92 backdrop-blur-xl"
    >
      <div className="container-news flex h-[46px] items-center justify-between gap-2 sm:gap-4 lg:h-[52px]">
        <ul className="nav-fade no-scrollbar flex flex-1 items-center gap-0.5 overflow-x-auto pr-8 lg:gap-0.5 lg:overflow-visible lg:pr-0">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <li key={item} className="shrink-0">
                <Link
                  to={href(item)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-[30px] items-center rounded-[4px] px-2.5 text-[12.5px] font-semibold tracking-[-0.01em] transition-all duration-200 lg:px-3.5 ${
                    active
                      ? 'bg-pulse text-white shadow-[0_6px_18px_-8px_rgba(255,16,36,0.9)]'
                      : 'text-bone/80 hover:bg-white/[0.055] hover:text-pulse'
                  }`}
                >
                  {item}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5 bg-gradient-to-l from-ink-900 via-ink-900 to-transparent pl-3 lg:gap-3 lg:bg-none lg:pl-0">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open all sections"
            className="hidden h-[30px] w-[34px] place-items-center rounded-[4px] border border-line bg-ink-800 text-bone/80 transition-colors hover:border-pulse/60 hover:text-pulse lg:grid"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openModal('live')}
            className="group flex h-[29px] items-center gap-1.5 rounded-[4px] border border-line bg-ink-800 px-2 text-[11.5px] font-semibold text-bone transition-colors hover:border-pulse/70 hover:text-white sm:h-[30px] sm:gap-2 sm:px-3 sm:text-[12px]"
          >
            <Radio className="h-3.5 w-3.5 text-pulse" />
            <span className="hidden xs:inline">Live TV</span>
            <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" />
          </button>
        </div>
      </div>
    </nav>
  );
}
