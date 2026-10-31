import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { getVersion, subscribe } from './lib/contentStore';
import SiteHeader from './components/SiteHeader';
import BreakingOverrideBar from './components/BreakingOverrideBar';
import SiteFooter from './components/SiteFooter';
import SubscribeModal from './components/SubscribeModal';
import SignInModal from './components/SignInModal';
import LiveTVModal from './components/LiveTVModal';
import ToastHost from './components/ToastHost';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import SearchPage from './pages/SearchPage';
import LatestPage from './pages/LatestPage';
import LivePage from './pages/LivePage';
import AboutPage from './pages/AboutPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import { DUR, EASE } from './lib/motion';

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Deep links (e.g. /about#privacy) land on the section, below the sticky header.
      const t = window.setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    return undefined;
  }, [pathname, hash]);
  return null;
}

/**
 * Fades the routed content in on navigation. Skipped on the very first paint so
 * prerendered HTML is visible immediately (no flash of invisible content).
 */
function FooterGate() {
  const { pathname } = useLocation();
  return pathname === '/admin' ? null : <SiteFooter />;
}

/** The control room is a full-bleed console — it supplies its own chrome. */
function HeaderGate() {
  const { pathname } = useLocation();
  return pathname === '/admin' ? null : <SiteHeader />;
}

function RouteTransition({ children }) {
  const { pathname } = useLocation();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div key={pathname} className={armed ? 'route-enter' : undefined}>
      {children}
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const [contentVersion, setContentVersion] = useState(() => getVersion());

  /* Repaint the public site whenever the editorial database changes. */
  useEffect(() => subscribe(() => setContentVersion(getVersion())), []);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE }}>
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-pulse focus:px-3 focus:py-2 focus:text-[12px] focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <div aria-hidden="true" className="ambient-glow" />
      <ScrollManager />
      <div className="relative z-10 flex min-h-screen flex-col">
        <BreakingOverrideBar />
        <HeaderGate />
        <div className="flex-1">
          <RouteTransition key={pathname === '/admin' ? pathname : `${pathname}:${contentVersion}`}>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/latest" element={<LatestPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </RouteTransition>
        </div>
        <FooterGate />
      </div>

      <SubscribeModal />
      <SignInModal />
      <LiveTVModal />
      <ToastHost />
    </>
    </MotionConfig>
  );
}
