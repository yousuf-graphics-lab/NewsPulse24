import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, LogOut, Radio, Search, X } from 'lucide-react';
import { CATEGORIES } from '../data/news';
import { getHeroStories } from '../lib/contentStore';
import { useApp } from '../context/AppContext';
import BrandLogo from './BrandLogo';

export default function MobileNavigation({ open, onClose }) {
  const { openModal, setSearchOpen, user, signOut } = useApp();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[70] lg:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={`absolute right-0 top-0 flex h-full w-[86%] max-w-[360px] flex-col border-l border-line bg-ink-900 shadow-[-20px_0_60px_-30px_rgba(0,0,0,1)] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <BrandLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-bone transition-colors hover:border-pulse/60 hover:text-pulse"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              setSearchOpen(true);
            }}
            className="mb-4 flex w-full items-center gap-2 rounded-[6px] border border-line bg-ink-800 px-3 py-2.5 text-left text-[12.5px] text-muted"
          >
            <Search className="h-4 w-4" /> Search news, topics, people...
          </button>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Sections
          </p>
          <AnimatePresence>
            {open && (
              <motion.ul
                className="mb-5 space-y-0.5"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.022, delayChildren: 0.08 } },
                }}
              >
            <li>
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center justify-between rounded-[5px] bg-pulse px-3 py-2.5 text-[13px] font-semibold text-white"
              >
                Home <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </li>
            {CATEGORIES.map((c) => (
              <motion.li
                key={c}
                variants={{
                  hidden: { opacity: 0, x: 10 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <Link
                  to={`/?category=${encodeURIComponent(c)}`}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-[5px] px-3 py-2.5 text-[13px] font-medium text-bone/85 transition-colors hover:bg-white/5 hover:text-pulse"
                >
                  {c}
                  <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
                </Link>
              </motion.li>
            ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            Top stories
          </p>
          <ul className="mb-5 space-y-2.5">
            {getHeroStories().map((s) => (
              <li key={s.id}>
                <Link
                  to={`/article/${s.slug}`}
                  onClick={onClose}
                  className="flex gap-2.5"
                >
                  <img
                    src={s.image}
                    alt=""
                    loading="lazy"
                    className="h-11 w-16 shrink-0 rounded-[3px] object-cover"
                  />
                  <span>
                    <span className="eyebrow block !text-[9px]">{s.category}</span>
                    <span className="line-clamp-2 text-[11.5px] font-semibold leading-snug text-bone/90">
                      {s.title}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                openModal('live');
              }}
              className="flex items-center justify-center gap-1.5 rounded-[5px] border border-line bg-ink-800 py-2.5 text-[12px] font-semibold text-bone"
            >
              <Radio className="h-3.5 w-3.5 text-pulse" /> Live TV
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                openModal('subscribe');
              }}
              className="btn-red py-2.5 text-[12px]"
            >
              Subscribe
            </button>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => {
                signOut();
                onClose();
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[5px] border border-line py-2.5 text-[12px] font-semibold text-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out ({user.name})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                openModal('signin');
              }}
              className="mt-2 w-full rounded-[5px] border border-line py-2.5 text-[12px] font-semibold text-bone/85"
            >
              Sign In
            </button>
          )}
        </div>

        <div className="border-t border-line px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-muted/70">
          Real News. Global Impact.
        </div>
      </aside>
    </div>
  );
}
