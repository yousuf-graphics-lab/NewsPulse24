import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import SiteHeader from './components/SiteHeader';
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
import NotFoundPage from './pages/NotFoundPage';

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-pulse focus:px-3 focus:py-2 focus:text-[12px] focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>
      <ScrollManager />
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/latest" element={<LatestPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <SiteFooter />
      </div>

      <SubscribeModal />
      <SignInModal />
      <LiveTVModal />
      <ToastHost />
    </>
  );
}
