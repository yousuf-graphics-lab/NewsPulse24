import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const AppContext = createContext(null);

const BOOKMARK_KEY = 'newspulse24:bookmarks';
const SUBSCRIBER_KEY = 'newspulse24:subscriber';

const loadBookmarks = () => {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'Breaking',
    title: 'Global markets react to new AI regulations',
    body: 'Live coverage from our Brussels and New York desks continues.',
    time: '4 min ago',
    unread: true,
  },
  {
    id: 'n2',
    type: 'Live',
    title: 'NewsPulse 24 Live: Asia business hour',
    body: 'Singapore studio takes air with regional markets coverage.',
    time: '22 min ago',
    unread: true,
  },
  {
    id: 'n3',
    type: 'Editor’s pick',
    title: 'A More Connected World for a Brighter Tomorrow',
    body: 'Our lead investigation on the new geography of connection.',
    time: '1 hour ago',
    unread: false,
  },
  {
    id: 'n4',
    type: 'Science',
    title: 'Odyssey-2 returns first calibration data',
    body: 'Spectrometer readings exceed mission targets, team says.',
    time: '3 hours ago',
    unread: false,
  },
];

export function AppProvider({ children }) {
  const [modal, setModal] = useState(null);
  const [modalPayload, setModalPayload] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  const [toasts, setToasts] = useState([]);
  const [subscriber, setSubscriber] = useState(() => {
    try {
      return localStorage.getItem(SUBSCRIBER_KEY) || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const toastId = useRef(0);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks));
    } catch {
      /* storage unavailable — bookmarks stay in memory */
    }
  }, [bookmarks]);

  const pushToast = useCallback((message, tone = 'default') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const openModal = useCallback((name, payload = null) => {
    setModal(name);
    setModalPayload(payload);
    setMenuOpen(false);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setModalPayload(null);
  }, []);

  const toggleBookmark = useCallback(
    (story) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === story.id);
        if (exists) {
          pushToast('Removed from your reading list');
          return prev.filter((b) => b.id !== story.id);
        }
        pushToast('Saved to your reading list');
        return [...prev, { id: story.id, title: story.title, slug: story.slug }];
      });
    },
    [pushToast],
  );

  const isBookmarked = useCallback(
    (id) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const subscribe = useCallback(
    (email, plan) => {
      try {
        localStorage.setItem(SUBSCRIBER_KEY, JSON.stringify({ email, plan }));
      } catch {
        /* ignore */
      }
      setSubscriber({ email, plan });
      pushToast('Demo subscription confirmed — no payment was processed.', 'success');
    },
    [pushToast],
  );

  const signIn = useCallback(
    (email) => {
      const name = email.split('@')[0].replace(/[._-]+/g, ' ');
      const display = name.replace(/\b\w/g, (c) => c.toUpperCase());
      setUser({ email, name: display || 'Reader' });
      pushToast(`Welcome back, ${display || 'reader'} — demo session started.`, 'success');
    },
    [pushToast],
  );

  const signOut = useCallback(() => {
    setUser(null);
    pushToast('Signed out of your demo session');
  }, [pushToast]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setModal(null);
        setSearchOpen(false);
        setMenuOpen(false);
      }
      const target = e.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modal || menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modal, menuOpen]);

  const value = useMemo(
    () => ({
      modal,
      modalPayload,
      openModal,
      closeModal,
      searchOpen,
      setSearchOpen,
      menuOpen,
      setMenuOpen,
      notifications,
      unreadCount,
      markAllRead,
      bookmarks,
      toggleBookmark,
      isBookmarked,
      toasts,
      pushToast,
      subscriber,
      subscribe,
      user,
      signIn,
      signOut,
    }),
    [
      modal,
      modalPayload,
      openModal,
      closeModal,
      searchOpen,
      menuOpen,
      notifications,
      unreadCount,
      markAllRead,
      bookmarks,
      toggleBookmark,
      isBookmarked,
      toasts,
      pushToast,
      subscriber,
      subscribe,
      user,
      signIn,
      signOut,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
