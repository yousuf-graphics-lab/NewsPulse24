import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Play,
  Rss,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import GlobeMark from './GlobeMark';
import FooterSkyline from './FooterSkyline';
import { CATEGORIES } from '../data/news';
import { useApp } from '../context/AppContext';
import { EASE } from '../lib/motion';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const NEWSROOM = [
  ['About NewsPulse 24', '/about'],
  ['Editorial Standards', '/about'],
  ['Corrections', '/about'],
  ['Contact the Desk', '/about'],
  ['Careers', '/about'],
  ['Advertise', '/about'],
];

/* X (formerly Twitter) is not in lucide's current icon set. */
function XIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.53 3h3.2l-6.99 7.99L22 21h-6.4l-5.02-6.56L4.8 21H1.6l7.44-8.5L1.9 3h6.56l4.62 6.1L17.53 3Zm-1.12 16.05h1.77L7.68 4.85H5.78l10.63 14.2Z" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'NewsPulse 24 on YouTube', href: 'https://www.youtube.com/', Icon: Youtube, brand: 'text-[#FF2E3E]' },
  { label: 'NewsPulse 24 on X', href: 'https://x.com/', Icon: XIcon, brand: 'text-bone' },
  { label: 'NewsPulse 24 on Facebook', href: 'https://www.facebook.com/', Icon: Facebook, brand: 'text-[#4C8DF6]' },
  { label: 'NewsPulse 24 on LinkedIn', href: 'https://www.linkedin.com/', Icon: Linkedin, brand: 'text-[#3C9BF5]' },
  { label: 'NewsPulse 24 on Instagram', href: 'https://www.instagram.com/', Icon: Instagram, brand: 'text-[#F0459B]' },
];

function FooterHeading({ children }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[13px] font-extrabold uppercase leading-none tracking-[0.12em] text-bone sm:text-[14px]">
      <span aria-hidden="true" className="h-[16px] w-[3.5px] shrink-0 rounded-[1px] bg-pulse" />
      {children}
    </h2>
  );
}

function FooterLink({ to, onClick, children }) {
  const inner = (
    <>
      <ChevronRight
        aria-hidden="true"
        strokeWidth={3}
        className="h-3.5 w-3.5 shrink-0 text-pulse transition-transform duration-200 ease-out group-hover:translate-x-[2px]"
      />
      <span className="transition-transform duration-200 ease-out group-hover:translate-x-[2px]">
        {children}
      </span>
    </>
  );
  const className =
    'group flex w-full items-center gap-2 py-[6px] text-left text-[12.5px] leading-snug text-bone/70 transition-colors hover:text-bone xl:gap-2.5 xl:text-[13px]';

  return (
    <li>
      {to ? (
        <Link to={to} className={className}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {inner}
        </button>
      )}
    </li>
  );
}

export default function SiteFooter() {
  const { openModal, subscribe } = useApp();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  const join = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError('Enter a valid email address, for example editor@newspulse24.com');
      return;
    }
    setError('');
    subscribe(value, 'newsletter');
    setJoined(true);
  };

  return (
    <footer className="relative mt-14 overflow-hidden border-t border-line bg-ink-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-pulse/70 to-transparent"
      />

      {/* ───────────────────────── masthead band ───────────────────────── */}
      <div className="relative overflow-hidden border-b border-line bg-ink-900">
        {/* dotted world map */}
        <img
          src="/images/footer-world-map.svg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="footer-map pointer-events-none absolute inset-x-0 top-0 w-full select-none"
        />
        {/* diagonal light panels + red horizon glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-0 h-full w-[44%] -skew-x-[16deg] bg-white/[0.022]" />
          <div className="absolute -right-10 top-0 h-full w-[34%] -skew-x-[16deg] bg-white/[0.014]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-900 to-transparent" />
        </div>

        <div className="container-news relative py-10 lg:py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-0">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-6 lg:contents">
            {/* rotating globe emblem */}
            <div className="shrink-0 lg:pr-8 xl:pr-10">
              <div className="relative h-[96px] w-[96px] sm:h-[112px] sm:w-[112px] lg:h-[136px] lg:w-[136px] xl:h-[152px] xl:w-[152px]">
                <span
                  aria-hidden="true"
                  className="absolute inset-[-16%] rounded-full bg-[radial-gradient(circle,rgba(255,16,36,0.32),transparent_66%)]"
                />
                <GlobeMark className="relative h-full w-full" spin />
                <span
                  aria-hidden="true"
                  className="absolute -inset-x-[14%] inset-y-[38%] -rotate-[14deg] rounded-[50%] border border-pulse/30"
                />
              </div>
            </div>

            {/* wordmark + description */}
            <div className="min-w-0 flex-1 lg:border-l lg:border-line-soft lg:px-8 xl:px-10">
              <Link to="/" aria-label="NewsPulse 24 — home" className="group inline-block">
                <span className="heading-xl block whitespace-nowrap text-[30px] leading-[0.95] drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)] xs:text-[36px] sm:text-[42px] xl:text-[50px]">
                  <span className="text-white">News</span>
                  <span className="text-pulse">Pulse</span>
                  <span className="ml-[0.18em] text-pulse">24</span>
                </span>
                <span className="mt-2.5 block whitespace-nowrap text-[9px] font-semibold uppercase leading-none tracking-[0.28em] text-muted xs:text-[10.5px] sm:text-[12px] xl:text-[13.5px] sm:tracking-[0.3em]">
                  Real News. Global Impact.
                </span>
              </Link>

              <p className="mt-4 max-w-[440px] text-[12px] leading-[1.7] text-muted sm:text-[13.5px]">
                Independent international reporting, live broadcast and data-led analysis from six
                newsrooms across four continents.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => openModal('live')}
                  className="group flex h-10 items-center gap-2 rounded-[7px] border border-line-soft bg-gradient-to-b from-ink-750 to-ink-850 px-4 text-[12px] font-semibold text-bone/90 transition-colors hover:border-pulse/60 hover:text-white"
                >
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-pulse transition-transform duration-200 group-hover:scale-110">
                    <Play className="ml-[1px] h-2.5 w-2.5 fill-white text-white" />
                  </span>
                  Watch Live
                </button>
                <button
                  type="button"
                  onClick={() => openModal('subscribe')}
                  className="group flex h-10 items-center gap-2 rounded-[7px] border border-line-soft bg-gradient-to-b from-ink-750 to-ink-850 px-4 text-[12px] font-semibold text-bone/90 transition-colors hover:border-pulse/60 hover:text-white"
                >
                  <Rss className="h-3.5 w-3.5 text-pulse" strokeWidth={2.4} />
                  Newsletters
                </button>
              </div>
            </div>
            </div>

            {/* newsletter */}
            <div className="w-full lg:w-[46%] lg:max-w-[580px] lg:border-l lg:border-line-soft lg:pl-8 xl:pl-10">
              <div className="flex items-center gap-3">
                <Mail aria-hidden="true" className="h-[26px] w-[26px] shrink-0 text-pulse sm:h-[30px] sm:w-[30px]" strokeWidth={1.6} />
                <h2 className="text-[17px] font-extrabold uppercase leading-none tracking-[0.06em] text-bone sm:text-[21px]">
                  The Morning Pulse
                </h2>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-muted sm:text-[12.5px]">
                Start your day with the latest global news.
              </p>

              <AnimatePresence mode="wait" initial={false}>
                {joined ? (
                  <motion.div
                    key="joined"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="mt-4 flex h-[52px] items-center gap-2.5 rounded-[8px] border border-pulse/35 bg-pulse/[0.08] px-3.5"
                    role="status"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pulse">
                      <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
                    </span>
                    <p className="text-[12px] leading-snug text-bone/90">
                      You’re on the list — tomorrow’s briefing lands at 06:00.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={join}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="mt-4"
                    noValidate
                  >
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative min-w-0 flex-1">
                        <label htmlFor="footer-newsletter-email" className="sr-only">
                          Email address for The Morning Pulse
                        </label>
                        <Mail
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted/80"
                          strokeWidth={1.8}
                        />
                        <input
                          id="footer-newsletter-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="Enter your email address"
                          aria-invalid={error ? 'true' : 'false'}
                          aria-describedby={error ? 'footer-newsletter-error' : undefined}
                          className="h-[52px] w-full rounded-[8px] border border-line-soft bg-ink-800/80 pl-10 pr-3 text-[12.5px] text-bone placeholder:text-muted/70 transition-colors hover:border-[#333440] focus:border-pulse/70 focus:outline-none focus:ring-2 focus:ring-pulse/20"
                        />
                      </div>
                      <button type="submit" className="btn-red group h-[52px] shrink-0 rounded-[8px] px-6 text-[13px]">
                        Subscribe
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-[2px]" />
                      </button>
                    </div>
                    {error ? (
                      <p
                        id="footer-newsletter-error"
                        role="alert"
                        className="mt-1.5 text-[11px] font-medium text-pulse-400"
                      >
                        {error}
                      </p>
                    ) : null}
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-pulse" strokeWidth={2.2} />
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────── directory band ───────────────────────── */}
      <div aria-hidden="true" className="h-[2px] bg-gradient-to-r from-pulse via-pulse/85 to-pulse/25" />
      <div className="relative bg-ink-900/60">
        <div className="container-news pb-4 pt-10 xl:pb-11">
          <div className="grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 xl:grid-cols-[1fr_1.16fr_0.78fr_1.06fr] xl:gap-0">
            <nav aria-labelledby="footer-sections" className="xl:pr-8">
              <FooterHeading>
                <span id="footer-sections">Sections</span>
              </FooterHeading>
              <div className="mt-3.5 grid grid-cols-2 gap-x-4">
                <ul>
                  {CATEGORIES.slice(0, 4).map((category) => (
                    <FooterLink key={category} to={`/?category=${encodeURIComponent(category)}`}>
                      {category}
                    </FooterLink>
                  ))}
                </ul>
                <ul>
                  {CATEGORIES.slice(4, 8).map((category) => (
                    <FooterLink key={category} to={`/?category=${encodeURIComponent(category)}`}>
                      {category}
                    </FooterLink>
                  ))}
                </ul>
              </div>
            </nav>

            <nav
              aria-labelledby="footer-newsroom"
              className="xl:border-l xl:border-line-soft xl:px-8"
            >
              <FooterHeading>
                <span id="footer-newsroom">The Newsroom</span>
              </FooterHeading>
              <div className="mt-3.5 grid gap-x-4 md:grid-cols-2">
                <ul>
                  {NEWSROOM.slice(0, 3).map(([label, to]) => (
                    <FooterLink key={label} to={to}>
                      {label}
                    </FooterLink>
                  ))}
                </ul>
                <ul>
                  {NEWSROOM.slice(3).map(([label, to]) => (
                    <FooterLink key={label} to={to}>
                      {label}
                    </FooterLink>
                  ))}
                </ul>
              </div>
            </nav>

            <nav aria-labelledby="footer-watch" className="xl:border-l xl:border-line-soft xl:px-8">
              <FooterHeading>
                <span id="footer-watch">Watch &amp; Listen</span>
              </FooterHeading>
              <ul className="mt-3.5">
                <FooterLink onClick={() => openModal('live')}>Watch Live</FooterLink>
                <FooterLink onClick={() => openModal('live')}>Latest Videos</FooterLink>
                <FooterLink onClick={() => openModal('subscribe')}>Podcasts</FooterLink>
                <FooterLink onClick={() => openModal('subscribe')}>Newsletters</FooterLink>
              </ul>
            </nav>

            <div className="xl:border-l xl:border-line-soft xl:pl-8">
              <FooterHeading>Follow News Pulse</FooterHeading>
              <ul className="mt-4 flex items-center gap-2.5">
                {SOCIALS.map(({ label, href, Icon, brand }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={label}
                      className="group grid h-[50px] w-[50px] place-items-center rounded-full xl:h-[52px] xl:w-[52px] border border-line-soft bg-gradient-to-b from-ink-750 to-ink-850 transition-all duration-200 hover:-translate-y-0.5 hover:border-pulse/60 hover:bg-pulse/[0.12] hover:shadow-[0_10px_24px_-14px_rgba(255,16,36,0.9)]"
                    >
                      <Icon className={`h-[20px] w-[20px] transition-colors ${brand}`} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────── skyline + legal ───────────────────────── */}
      <div className="relative">
        <div className="relative h-[128px] overflow-hidden sm:h-[144px] lg:h-[164px]">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(46%_118%_at_50%_116%,rgba(255,16,36,0.26),rgba(255,16,36,0.09)_44%,rgba(255,16,36,0.02)_68%,transparent_80%),linear-gradient(180deg,#060709_0%,#0A0B11_44%,#15131B_100%)]"
          />
          <FooterSkyline className="absolute inset-x-0 bottom-0 h-full w-full" />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-pulse/10 via-pulse to-pulse/10"
          />
        </div>

        <div className="relative bg-ink-950">
          <div className="container-news flex flex-col gap-2.5 py-5 text-[11.5px] sm:flex-row sm:items-center sm:justify-between sm:text-[12px]">
            <p className="text-muted">
              © {new Date().getFullYear()}{' '}
              <span className="font-semibold text-pulse">NewsPulse 24</span>. All rights reserved.
            </p>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted">
              <Link to="/about#privacy" className="transition-colors hover:text-bone">
                Privacy Policy
              </Link>
              <span aria-hidden="true" className="h-3 w-px bg-line-soft" />
              <Link to="/about#terms" className="transition-colors hover:text-bone">
                Terms of Service
              </Link>
              <span aria-hidden="true" className="h-3 w-px bg-line-soft" />
              <Link to="/about#cookies" className="transition-colors hover:text-bone">
                Cookie Settings
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
