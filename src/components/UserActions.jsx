import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, LogOut, Bell, Radio } from 'lucide-react';
import { EASE } from '../lib/motion';
import { useApp } from '../context/AppContext';
import NotificationPanel from './NotificationPanel';

export default function UserActions({ compact = false }) {
  const {
    unreadCount,
    openModal,
    user,
    signOut,
    bookmarks,
    subscriber,
  } = useApp();
  const [showBell, setShowBell] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setShowBell(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="flex items-center gap-0.5 sm:gap-3">
      {!compact && (
        <button
          type="button"
          onClick={() => openModal('live')}
          className="hidden items-center gap-1.5 rounded-[5px] border border-line bg-ink-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-bone/90 transition-colors hover:border-pulse/60 hover:text-white xl:flex"
        >
          <Radio className="h-3.5 w-3.5 text-pulse" />
          Live
          <span className="ml-0.5 h-1.5 w-1.5 animate-pulseDot rounded-full bg-pulse" />
        </button>
      )}

      <div className="relative" ref={bellRef}>
        <button
          type="button"
          onClick={() => {
            setShowBell((v) => !v);
            setShowUser(false);
          }}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={showBell}
          className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-bone/85 transition-colors hover:bg-white/5 hover:text-white sm:h-9 sm:w-9"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-[13px] min-w-[13px] place-items-center rounded-full bg-pulse px-[3px] text-[8px] font-bold leading-none text-white ring-2 ring-ink-950 sm:right-1.5 sm:top-1.5">
              {unreadCount}
            </span>
          )}
        </button>
        <AnimatePresence>
          {showBell && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 top-[calc(100%+10px)] z-50"
            >
              <NotificationPanel onClose={() => setShowBell(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {user ? (
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setShowUser((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-line bg-ink-800 py-1 pl-1 pr-2.5 transition-colors hover:border-pulse/50"
            aria-label="Account menu"
            aria-expanded={showUser}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-pulse text-[11px] font-bold text-white">
              {user.name.slice(0, 1)}
            </span>
            <span className="hidden max-w-[80px] truncate text-[12px] font-semibold text-bone sm:block">
              {user.name}
            </span>
          </button>
          <AnimatePresence>
          {showUser && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{ transformOrigin: 'top right' }}
              className="absolute right-0 top-[calc(100%+10px)] z-50 w-[230px] overflow-hidden rounded-[8px] border border-line bg-ink-850/95 shadow-2xl backdrop-blur-xl"
            >
              <div className="border-b border-line px-4 py-3">
                <p className="text-[12.5px] font-semibold text-bone">{user.name}</p>
                <p className="truncate text-[11px] text-muted">{user.email}</p>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 text-[11.5px] text-muted">
                <span className="flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5" /> Reading list
                </span>
                <span className="font-semibold text-bone">{bookmarks.length}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  signOut();
                  setShowUser(false);
                }}
                className="flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-[11.5px] font-semibold text-bone/85 transition-colors hover:bg-white/5 hover:text-pulse"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openModal('signin')}
          className="hidden px-1 text-[12.5px] font-semibold text-bone/90 transition-colors hover:text-pulse sm:block"
        >
          Sign In
        </button>
      )}

      <button
        type="button"
        onClick={() => openModal('subscribe')}
        className="btn-red h-[30px] px-2.5 text-[10.5px] xs:text-[11px] sm:h-[36px] sm:px-5 sm:text-[13px]"
      >
        {subscriber ? 'Manage' : 'Subscribe'}
      </button>
    </div>
  );
}
