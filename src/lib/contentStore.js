/**
 * Editorial content store — the link between the admin panel and the live site.
 *
 * Base stories ship inside the bundle (`data/news.js`). Everything an editor
 * changes in /admin is layered on top of them from localStorage:
 *
 *   posts    full copies of edited or newly written stories (draft or published)
 *   hidden   base story ids the newsroom has taken down
 *   settings hero pins, ticker pins
 *
 * `applyContent()` rebuilds the exported `STORIES` array in place, so every
 * page (homepage, article, search, latest, ticker, sidebar) picks the change
 * up without any extra plumbing.
 *
 * Scope note: this is a browser-local CMS. Content is visible on the machine
 * that made it — publishing to the world needs a database + server, see
 * "Admin panel" in the README.
 */
import { STORIES } from '../data/news';

const CONTENT_KEY = 'newspulse24:content:v1';
const READS_KEY = 'newspulse24:reads:v1';

const EMPTY = {
  version: 1,
  posts: [],
  hidden: [],
  settings: { heroPins: [], tickerPins: [] },
  updatedAt: null,
};

const BASE_IDS = new Set(STORIES.map((s) => s.id));
const BASELINE = STORIES.map((s) => JSON.parse(JSON.stringify(s)));

let version = 0;
const listeners = new Set();

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

const normalise = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    version: 1,
    posts: Array.isArray(raw.posts) ? raw.posts.filter((p) => p?.id && p?.slug) : [],
    hidden: Array.isArray(raw.hidden) ? raw.hidden.filter((id) => BASE_IDS.has(id)) : [],
    settings: {
      heroPins: Array.isArray(raw.settings?.heroPins) ? raw.settings.heroPins.slice(0, 3) : [],
      tickerPins: Array.isArray(raw.settings?.tickerPins) ? raw.settings.tickerPins.slice(0, 4) : [],
    },
    updatedAt: raw.updatedAt || null,
  };
};

export const readContent = () => {
  if (!hasWindow()) return { ...EMPTY };
  try {
    return normalise(JSON.parse(window.localStorage.getItem(CONTENT_KEY) || 'null'));
  } catch {
    return { ...EMPTY };
  }
};

const writeContent = (state) => {
  if (!hasWindow()) return state;
  try {
    window.localStorage.setItem(CONTENT_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — the in-memory copy still renders for this session */
  }
  return state;
};

const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

/* --------------------------------------------------------------------- reads */

/** Real per-browser article reads, tracked from the article page. */
export const readCounts = () => {
  if (!hasWindow()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(READS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const recordRead = (slug) => {
  if (!hasWindow() || !slug) return;
  const counts = readCounts();
  counts[slug] = (counts[slug] || 0) + 1;
  try {
    window.localStorage.setItem(READS_KEY, JSON.stringify(counts));
  } catch {
    /* ignore */
  }
};

export const resetReads = () => {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(READS_KEY);
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ mutation */

export const updateContent = (updater) => {
  const current = readContent();
  const next = normalise({ ...updater(current), version: 1, updatedAt: new Date().toISOString() });
  writeContent(next);
  applyContent();
  return next;
};

export const savePost = (post) => {
  const now = new Date().toISOString();
  return updateContent((state) => {
    const exists = state.posts.some((p) => p.id === post.id);
    const record = {
      ...post,
      status: post.status === 'draft' ? 'draft' : 'published',
      updatedAt: now,
      createdAt: post.createdAt || now,
    };
    return {
      ...state,
      posts: exists
        ? state.posts.map((p) => (p.id === post.id ? record : p))
        : [record, ...state.posts],
    };
  });
};

export const deletePost = (id) =>
  updateContent((state) => {
    if (BASE_IDS.has(id)) {
      return {
        ...state,
        posts: state.posts.filter((p) => p.id !== id),
        hidden: state.hidden.includes(id) ? state.hidden : [...state.hidden, id],
        settings: {
          heroPins: state.settings.heroPins.filter((s) => s !== id),
          tickerPins: state.settings.tickerPins.filter((s) => s !== id),
        },
      };
    }
    return { ...state, posts: state.posts.filter((p) => p.id !== id) };
  });

export const restoreBaseStory = (id) =>
  updateContent((state) => ({ ...state, hidden: state.hidden.filter((h) => h !== id) }));

export const setPostStatus = (id, status) =>
  updateContent((state) => ({
    ...state,
    posts: state.posts.map((p) =>
      p.id === id
        ? {
            ...p,
            status,
            publishedAt:
              status === 'published' ? new Date().toISOString() : p.publishedAt,
            updatedAt: new Date().toISOString(),
          }
        : p,
    ),
  }));

export const updateSettings = (patch) =>
  updateContent((state) => ({
    ...state,
    settings: { ...state.settings, ...patch },
  }));

export const resetAllContent = () => {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(CONTENT_KEY);
    } catch {
      /* ignore */
    }
  }
  applyContent();
};

/* ------------------------------------------------------------------- queries */

/** Every story an editor can see: published ones plus drafts and hidden base stories. */
export const allPosts = () => {
  const state = readContent();
  const byId = new Map(state.posts.map((p) => [p.id, p]));
  const rows = BASELINE.map((base) => {
    const edit = byId.get(base.id);
    return {
      ...base,
      ...(edit || {}),
      isBase: true,
      status: state.hidden.includes(base.id) ? 'hidden' : edit?.status || 'published',
    };
  });
  for (const post of state.posts) {
    if (!BASE_IDS.has(post.id)) rows.push({ ...post, isBase: false });
  }
  return rows.sort((a, b) => new Date(b.updatedAt || b.publishedAt) - new Date(a.updatedAt || a.publishedAt));
};

export const getSettings = () => readContent().settings;

export const publishedSlugs = () => STORIES.map((s) => s.slug);

export const slugTaken = (slug, exceptId) =>
  STORIES.some((s) => s.slug === slug && s.id !== exceptId) ||
  allPosts().some((p) => p.slug === slug && p.id !== exceptId && !BASE_IDS.has(p.id));

/* ---------------------------------------------------------- derived editorial */

const HERO_KICKERS = ['Breaking News', 'Technology', 'Inside NewsPulse'];

/** Hero slides, honouring the editor's pin order. */
export const getHeroStories = () => {
  const pins = getSettings().heroPins;
  const pinned = pins.map((slug) => STORIES.find((s) => s.slug === slug)).filter(Boolean);
  const flagged = STORIES.filter((s) => s.hero && !pinned.includes(s));
  const rest = STORIES.filter((s) => !s.hero && !pinned.includes(s));
  return [...pinned, ...flagged, ...rest]
    .slice(0, Math.max(3, Math.min(pinned.length + flagged.length, 5)))
    .map((story, i) => ({ ...story, heroKicker: story.heroKicker || HERO_KICKERS[i] || story.category }));
};

/** Breaking ticker entries, pins first. */
export const getTickerStories = () => {
  const pins = getSettings().tickerPins;
  const dedupe = (list) => list.filter((story, i) => story && list.indexOf(story) === i);
  const pinned = pins.map((slug) => STORIES.find((s) => s.slug === slug));
  const breakingNewest = [...STORIES]
    .filter((s) => s.hero)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const newest = [...STORIES].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const byViews = [...STORIES].sort((a, b) => (b.views || 0) - (a.views || 0));

  // Pins lead, then breaking, then the freshest copy, then most-read.
  const lead = dedupe([...pinned, ...breakingNewest, ...newest]).slice(0, 4);
  const topRead = dedupe([...byViews]).filter((s) => !lead.includes(s)).slice(0, 4);
  return { breaking: lead, topRead: topRead.length ? topRead : byViews.slice(0, 4) };
};

/* --------------------------------------------------------------- publication */

export function applyContent() {
  let state = readContent();
  const edits = new Map(state.posts.map((p) => [p.id, p]));
  const hidden = new Set(state.hidden);
  const next = [];

  for (const base of BASELINE) {
    if (hidden.has(base.id)) continue;
    const edit = edits.get(base.id);
    if (edit && edit.status === 'draft') continue;
    next.push(edit ? { ...base, ...edit, status: 'published' } : { ...base });
  }

  for (const post of state.posts) {
    if (BASE_IDS.has(post.id)) continue;
    if (post.status !== 'published') continue;
    next.push({ ...post, status: 'published' });
  }

  next.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  STORIES.length = 0;
  STORIES.push(...next);
  emit();
  return next;
}

/* ---------------------------------------------------------------- react glue */

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getVersion = () => version;

if (hasWindow()) applyContent();
