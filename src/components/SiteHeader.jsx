import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import BrandLogo from './BrandLogo';
import SearchBar from './SearchBar';
import UserActions from './UserActions';
import PrimaryNavigation from './PrimaryNavigation';
import MobileNavigation from './MobileNavigation';
import BreakingNewsTicker from './BreakingNewsTicker';
import { useApp } from '../context/AppContext';

export default function SiteHeader({ ticker = true }) {
  const { searchOpen, setSearchOpen, menuOpen, setMenuOpen } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className="relative z-40">
        <div className="sticky top-0 z-40 isolate bg-ink-950">
        {/* brand row */}
        <div
          className={`relative border-b border-line transition-colors duration-300 ${
            scrolled
              ? 'bg-ink-950/[0.94] backdrop-blur-xl shadow-[0_18px_40px_-30px_rgba(0,0,0,0.95)]'
              : 'bg-ink-950/80 backdrop-blur-md'
          }`}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pulse/70 to-transparent" />
          <div className="container-news flex h-[60px] items-center justify-between gap-2 sm:h-[78px] sm:gap-3 lg:h-[84px] lg:gap-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[5px] border border-line bg-ink-800 text-bone transition-colors hover:border-pulse/50 hover:text-pulse sm:h-9 sm:w-9 lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <BrandLogo size="lg" />
            </div>

            <div className="hidden flex-1 justify-center px-2 md:flex lg:px-6">
              <SearchBar />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-bone/85 transition-colors hover:bg-white/5 hover:text-white md:hidden"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <UserActions />
            </div>
          </div>
        </div>

        {/* navigation row */}
        <PrimaryNavigation />
        </div>
        {ticker && <BreakingNewsTicker />}
      </header>

      {/* mobile search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] bg-ink-950/95 p-4 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Search NewsPulse 24
            </span>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-bone"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SearchBar variant="overlay" />
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Popular searches
            </p>
            <div className="flex flex-wrap gap-2">
              {['AI regulation', 'Markets', 'Mars mission', 'Climate', 'Champions League'].map(
                (term) => (
                  <Link
                    key={term}
                    to={`/search?q=${encodeURIComponent(term)}`}
                    onClick={() => setSearchOpen(false)}
                    className="rounded-full border border-line bg-ink-850 px-3 py-1.5 text-[11.5px] text-bone/85"
                  >
                    {term}
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
