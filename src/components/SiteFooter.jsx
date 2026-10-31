import { Link } from 'react-router-dom';
import { ArrowUpRight, Globe2, Radio, Rss } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { CATEGORIES } from '../data/news';
import { useApp } from '../context/AppContext';

export default function SiteFooter() {
  const { openModal } = useApp();

  return (
    <footer className="relative mt-12 border-t border-line bg-ink-900/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pulse/60 to-transparent" />
      <div className="container-news py-9">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr]">
          <div>
            <BrandLogo size="md" />
            <p className="mt-3 max-w-[280px] text-[11.5px] leading-relaxed text-muted">
              Independent international reporting, live broadcast and data-led analysis from six
              newsrooms across four continents.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => openModal('live')}
                className="flex items-center gap-1.5 rounded-[4px] border border-line bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-bone/85 transition-colors hover:border-pulse/60 hover:text-white"
              >
                <Radio className="h-3 w-3 text-pulse" /> Watch live
              </button>
              <button
                type="button"
                onClick={() => openModal('subscribe')}
                className="flex items-center gap-1.5 rounded-[4px] border border-line bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-bone/85 transition-colors hover:border-pulse/60 hover:text-white"
              >
                <Rss className="h-3 w-3 text-pulse" /> Newsletters
              </button>
            </div>
          </div>

          <nav aria-label="Sections">
            <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-bone/90">
              Sections
            </h2>
            <ul className="grid grid-cols-2 gap-y-1.5 lg:grid-cols-1">
              {CATEGORIES.slice(0, 8).map((c) => (
                <li key={c}>
                  <Link
                    to={`/?category=${encodeURIComponent(c)}`}
                    className="text-[11.5px] text-muted transition-colors hover:text-pulse"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-bone/90">
              The newsroom
            </h2>
            <ul className="space-y-1.5">
              {[
                'About NewsPulse 24',
                'Editorial standards',
                'Corrections',
                'Contact the desk',
                'Careers',
                'Advertise',
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/about"
                    className="text-[11.5px] text-muted transition-colors hover:text-pulse"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-bone/90">
              The Morning Pulse
            </h2>
            <p className="text-[11.5px] leading-relaxed text-muted">
              Six stories, one briefing, delivered at 06:00 in your time zone.
            </p>
            <button
              type="button"
              onClick={() => openModal('subscribe')}
              className="btn-red mt-2.5 h-9 w-full text-[11.5px]"
            >
              Get the briefing
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-muted/70">
              <Globe2 className="h-3 w-3 text-pulse/70" />
              Editions: London · New York · São Paulo · Lagos · Dubai · Singapore
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2.5 border-t border-line pt-4 text-[10.5px] text-muted/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} NewsPulse 24 Media Group. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Link to="/about" className="hover:text-bone">Privacy</Link>
            <Link to="/about" className="hover:text-bone">Terms</Link>
            <Link to="/about" className="hover:text-bone">Cookies</Link>
            <Link to="/about" className="hover:text-bone">Accessibility</Link>
            <span className="flex items-center gap-1.5 text-pulse/80">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" /> Systems nominal
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
