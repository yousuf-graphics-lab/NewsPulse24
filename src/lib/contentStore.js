/**
 * Editorial content layer.
 *
 * The shipped dataset in `data/news.js` is the immutable baseline; everything
 * an editor does in the control room lives in `lib/db.js` and is layered on top
 * here. `applyContent()` rebuilds the exported `STORIES` array in place so the
 * hero, ticker, latest, search and article pages all read one live source.
 */
import { STORIES } from '../data/news';
import {
  clearReads as dbClearReads,
  getVersion as dbVersion,
  hiddenIds,
  logEvent,
  posts as dbPosts,
  read as dbRead,
  reads as dbReads,
  recordRead as dbRecordRead,
  settings as dbSettings,
  subscribe as dbSubscribe,
  upsertPost,
  write,
} from './db';

const BASE_IDS = new Set(STORIES.map((s) => s.id));
const BASELINE = STORIES.map((s) => JSON.parse(JSON.stringify(s)));

const clone = (value) => JSON.parse(JSON.stringify(value));

export const subscribe = dbSubscribe;
export const getVersion = dbVersion;

/* ---------------------------------------------------------------- mutation */

export const savePost = (post) => {
  const result = upsertPost(post);
  return result;
};

export const deletePost = (id) => {
  const target = allPosts().find((post) => post.id === id);
  const slug = target?.slug;
  return write((draft) => {
    const withoutPins = {
      ...draft.settings,
      heroPins: draft.settings.heroPins.filter((pin) => pin !== slug),
      tickerPins: draft.settings.tickerPins.filter((pin) => pin !== slug),
      override:
        draft.settings.override && draft.settings.override.slug === slug
          ? null
          : draft.settings.override,
    };
    if (BASE_IDS.has(id)) {
      return {
        ...draft,
        posts: draft.posts.filter((post) => post.id !== id),
        hidden: draft.hidden.includes(id) ? draft.hidden : [...draft.hidden, id],
        settings: withoutPins,
      };
    }
    return {
      ...draft,
      posts: draft.posts.filter((post) => post.id !== id),
      settings: withoutPins,
    };
  });
};

export const restoreBaseStory = (id) =>
  write((draft) => ({ ...draft, hidden: draft.hidden.filter((item) => item !== id) }));

export const setPostStatus = (id, status) =>
  write((draft) => ({
    ...draft,
    posts: draft.posts.some((post) => post.id === id)
      ? draft.posts.map((post) =>
          post.id === id
            ? {
                ...post,
                status,
                publishedAt: status === 'published' ? new Date().toISOString() : post.publishedAt,
                updatedAt: new Date().toISOString(),
              }
            : post,
        )
      : draft.posts,
  }));

export const updateSettings = (patch) =>
  write((draft) => ({ ...draft, settings: { ...draft.settings, ...patch } }));

export const resetAllContent = () =>
  write((draft) => ({
    ...draft,
    posts: [],
    hidden: [],
    settings: {
      heroPins: [],
      tickerPins: [],
      override: null,
      livePromo: true,
      autoRebalance: true,
      autoSync: true,
      desks: {},
    },
  }));

/* -------------------------------------------------------------------- staff */

export const staffList = () => dbRead().staff;

export const upsertStaff = (member) =>
  write((draft) => {
    const index = draft.staff.findIndex((item) => item.id === member.id);
    if (index === -1) draft.staff.unshift(member);
    else draft.staff[index] = { ...draft.staff[index], ...member };
    return draft;
  });

export const removeStaff = (id) =>
  write((draft) => ({ ...draft, staff: draft.staff.filter((item) => item.id !== id) }));

export const getSettings = () => dbSettings();
export const readContent = () => dbRead();
export const readCounts = () =>
  Object.fromEntries(Object.entries(dbReads()).map(([slug, entry]) => [slug, entry.count]));
export const recordRead = (slug) => {
  dbRecordRead(slug);
  applyContent();
};
export const resetReads = () => {
  dbClearReads();
  applyContent();
};

/* ------------------------------------------------------------------- queries */

export const allPosts = () => {
  const state = dbRead();
  const byId = new Map(state.posts.map((post) => [post.id, post]));
  const hidden = new Set(state.hidden);
  const rows = BASELINE.map((base) => {
    const edit = byId.get(base.id);
    return {
      ...base,
      ...(edit || {}),
      isBase: true,
      status: hidden.has(base.id) ? 'hidden' : edit?.status || 'published',
    };
  });
  for (const post of state.posts) {
    if (!BASE_IDS.has(post.id)) rows.push({ ...post, isBase: false });
  }
  return rows.sort(
    (a, b) => new Date(b.updatedAt || b.publishedAt) - new Date(a.updatedAt || a.publishedAt),
  );
};

export const slugTaken = (slug, exceptId) =>
  allPosts().some((post) => post.slug === slug && post.id !== exceptId);

/* ---------------------------------------------------------- derived editorial */

const dedupe = (list) => list.filter((story, index) => story && list.indexOf(story) === index);
const newestFirst = (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt);

/** Desk weights from Settings bias the automatic order, newest breaks ties. */
const weighted = (list) => {
  const desks = getSettings().desks || {};
  const weight = (story) => Number(desks[story.category] ?? 1);
  return [...list].sort((a, b) => weight(b) - weight(a) || newestFirst(a, b));
};

export const getHeroStories = () => {
  const pins = getSettings().heroPins;
  const pinned = pins.map((slug) => STORIES.find((story) => story.slug === slug)).filter(Boolean);
  const flagged = weighted(STORIES.filter((story) => story.hero && !pinned.includes(story)));
  const rest = weighted(STORIES.filter((story) => !story.hero && !pinned.includes(story)));
  const auto = getSettings().autoRebalance !== false;
  const ordered = dedupe(auto ? [...pinned, ...flagged, ...rest] : [...pinned, ...flagged]).slice(0, 5);
  const kickers = ['Breaking News', 'Technology', 'Inside NewsPulse'];
  return ordered.map((story, index) => ({
    ...story,
    heroKicker: story.heroKicker || kickers[index] || story.category,
  }));
};

export const getTickerStories = () => {
  const pins = getSettings().tickerPins;
  const pinned = pins.map((slug) => STORIES.find((story) => story.slug === slug));
  const breakingNewest = weighted(STORIES.filter((story) => story.hero));
  const newest = weighted(STORIES);
  const byViews = [...STORIES].sort((a, b) => (b.views || 0) - (a.views || 0));
  const auto = getSettings().autoRebalance !== false;
  const lead = dedupe(auto ? [...pinned, ...breakingNewest, ...newest] : [...pinned, ...breakingNewest]).slice(0, 4);
  const topRead = dedupe(byViews).filter((story) => !lead.includes(story)).slice(0, 4);
  return { breaking: lead, topRead: topRead.length ? topRead : byViews.slice(0, 4) };
};

export const getOverride = () => getSettings().override;

/* --------------------------------------------------------------------- apply */

export function applyContent() {
  const state = dbRead();
  const edits = new Map(state.posts.map((post) => [post.id, post]));
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

  next.sort(newestFirst);
  STORIES.length = 0;
  STORIES.push(...next);
  return next;
}

/* ---------------------------------------------------------------- utilities */

const alreadyStored = (id) =>
  BASE_IDS.has(id) || dbRead().posts.some((post) => post.id === id);

export const publish = (post, { breaking = false } = {}) => {
  const existed = alreadyStored(post.id);
  const record = { ...post, status: 'published', hero: breaking || post.hero };
  const result = savePost(record);
  applyContent();
  logEvent(
    'content',
    existed ? 'Story updated' : 'Story published',
    `${record.title}${breaking ? ' · breaking' : ''}`,
  );
  return result;
};

export const draftSave = (post) => {
  const existed = alreadyStored(post.id);
  const result = savePost({ ...post, status: 'draft' });
  applyContent();
  logEvent('content', existed ? 'Draft updated' : 'Draft created', post.title || 'Untitled');
  return result;
};

export const takeDown = (id) => {
  const post = allPosts().find((item) => item.id === id);
  const result = deletePost(id);
  applyContent();
  if (post) logEvent('content', post.isBase ? 'Story taken down' : 'Story deleted', post.title);
  return result;
};

export const restore = (post) => {
  const result = restoreBaseStory(post.id);
  applyContent();
  logEvent('content', 'Story restored', post.title);
  return result;
};

export const changeStatus = (post, status) => {
  const result = setPostStatus(post.id, status);
  applyContent();
  logEvent('content', status === 'published' ? 'Story published' : 'Story unpublished', post.title);
  return result;
};

export const clonePost = (post) => clone(post);

if (typeof window !== 'undefined') applyContent();
