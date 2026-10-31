/**
 * NewsPulse 24 — local editorial database.
 *
 * A tiny, dependency-free document store over `localStorage` with the things a
 * real CMS needs before it can touch a server:
 *
 *  - a versioned schema with forward migrations (v1 content → v2 database)
 *  - one atomic write per mutation, so a failed save cannot half-apply
 *  - collections for posts, takedowns, settings, read telemetry, staff and audit
 *  - quota-aware writes that surface storage errors instead of losing data
 *  - JSON export / import for backup and transfer between browsers
 *  - a change feed the whole app subscribes to
 *
 * SCHEMA (v2)
 *   posts[]     full story documents written in the control room
 *   hidden[]    base story ids taken down
 *   settings    heroPins, tickerPins, override, livePromo, autoRebalance, desks
 *   reads       { [slug]: { count, events: ISO[] } }  — real article opens
 *   staff[]     desk assignments for the staff directory
 *   audit[]     append-only command log
 *
 * This is deliberately a *local* database: it is the durable store for this
 * browser. `exportDatabase()` produces the exact JSON a hosted Postgres would
 * receive, which is the seam a server-side sync would plug into.
 */
import { AUTHORS, STORIES } from '../data/news';

export const DB_KEY = 'newspulse24:db:v2';
export const DB_VERSION = 2;
const LEGACY_CONTENT = 'newspulse24:content:v1';
const LEGACY_READS = 'newspulse24:reads:v1';
const LEGACY_AUDIT = 'newspulse24:admin:audit';

const MAX_EVENTS_PER_SLUG = 400;
const MAX_AUDIT = 200;
const MAX_TOTAL_EVENTS = 6000;

const deskFor = (role) => {
  const value = role.toLowerCase();
  if (/market|business/.test(value)) return 'Business';
  if (/technolog/.test(value)) return 'Technology';
  if (/scien/.test(value)) return 'Science';
  if (/sport/.test(value)) return 'Sports';
  if (/health|medicine/.test(value)) return 'Health';
  if (/chief|editorial/.test(value)) return 'Opinion';
  if (/culture|entertain/.test(value)) return 'Entertainment';
  return 'World';
};

/** Roster seeded from the shipped newsroom directory; seats can be edited after. */
const staffSeed = () =>
  Object.entries(AUTHORS).map(([key, author], index) => ({
    id: `staff-${key}`,
    name: author.name,
    role: author.role,
    initials: author.initials,
    desk: deskFor(author.role),
    access: index === 0 ? 'Editor in chief' : index < 3 ? 'Editor' : 'Correspondent',
    shift:
      index % 3 === 0
        ? 'London · 06:00–14:00'
        : index % 3 === 1
          ? 'New York · 14:00–22:00'
          : 'Singapore · 22:00–06:00',
    active: true,
  }));

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

const emptyState = () => ({
  version: DB_VERSION,
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
  reads: {},
  staff: staffSeed(),
  audit: [],
  createdAt: new Date().toISOString(),
  updatedAt: null,
});

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalise = (raw) => {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;

  const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const reads = {};
  for (const [slug, value] of Object.entries(raw.reads || {})) {
    if (!slug || !value || typeof value !== 'object') continue;
    reads[slug] = {
      count: Number(value.count) || asArray(value.events).length,
      events: asArray(value.events).filter((iso) => typeof iso === 'string').slice(-MAX_EVENTS_PER_SLUG),
    };
  }

  return {
    version: DB_VERSION,
    posts: asArray(raw.posts).filter((post) => post && post.id && post.slug),
    hidden: asArray(raw.hidden).filter((id) => typeof id === 'string'),
    settings: {
      heroPins: asArray(settings.heroPins).slice(0, 3),
      tickerPins: asArray(settings.tickerPins).slice(0, 4),
      override:
        settings.override && settings.override.headline ? { ...settings.override } : null,
      livePromo: settings.livePromo !== false,
      autoRebalance: settings.autoRebalance !== false,
      autoSync: settings.autoSync !== false,
      desks: settings.desks && typeof settings.desks === 'object' ? settings.desks : {},
    },
    reads,
    staff: raw.staff === undefined ? staffSeed() : asArray(raw.staff),
    audit: asArray(raw.audit).slice(0, MAX_AUDIT),
    createdAt: raw.createdAt || base.createdAt,
    updatedAt: raw.updatedAt || null,
  };
};

/* ------------------------------------------------------------------ migrate */

const migrateLegacy = () => {
  if (!hasWindow()) return null;
  let migrated = null;
  try {
    const contentRaw = window.localStorage.getItem(LEGACY_CONTENT);
    const readsRaw = window.localStorage.getItem(LEGACY_READS);
    const auditRaw = window.localStorage.getItem(LEGACY_AUDIT);
    if (!contentRaw && !readsRaw && !auditRaw) return null;

    const content = contentRaw ? JSON.parse(contentRaw) : {};
    const reads = {};
    if (readsRaw) {
      const legacyReads = JSON.parse(readsRaw) || {};
      const now = new Date().toISOString();
      for (const [slug, count] of Object.entries(legacyReads)) {
        reads[slug] = { count: Number(count) || 0, events: Array.from({ length: Math.min(Number(count) || 0, 25) }, () => now) };
      }
    }

    migrated = normalise({
      posts: content.posts || [],
      hidden: content.hidden || [],
      settings: content.settings || {},
      reads,
      audit: auditRaw ? JSON.parse(auditRaw) : [],
      createdAt: content.updatedAt || undefined,
    });
  } catch {
    return null;
  }
  return migrated;
};

/* -------------------------------------------------------------------- store */

let state = null;
let version = 0;
const listeners = new Set();

const load = () => {
  if (!hasWindow()) return emptyState();
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch {
    /* corrupt payload — fall through to a clean database */
  }
  const migrated = migrateLegacy();
  if (migrated) {
    persist(migrated);
    return migrated;
  }
  return emptyState();
};

function persist(next) {
  if (!hasWindow()) return { ok: true };
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(next));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

const emit = (next) => {
  version += 1;
  listeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      /* a broken subscriber must not block the write */
    }
  });
};

const get = () => {
  if (!state) state = load();
  return state;
};

/**
 * Applies `updater` to a copy of the database and commits it atomically.
 * Returns `{ ok, state, error }` so callers can tell the editor when a save
 * failed instead of silently dropping their work.
 */
export const write = (updater) => {
  const current = get();
  const draft = normalise(updater(JSON.parse(JSON.stringify(current))));
  draft.updatedAt = new Date().toISOString();
  const result = persist(draft);
  state = draft;
  emit(draft);
  return { ok: result.ok, error: result.error, state: draft };
};

export const read = () => get();

export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getVersion = () => version;

/* --------------------------------------------------------------- migrations */

/** Cross-tab sync: another tab wrote, so reload and re-render. */
if (hasWindow()) {
  window.addEventListener('storage', (event) => {
    if (event.key !== DB_KEY) return;
    state = load();
    emit(state);
  });
}

/* ------------------------------------------------------------------ queries */

export const posts = () => get().posts;
export const hiddenIds = () => get().hidden;
export const settings = () => get().settings;
export const staff = () => get().staff;
export const reads = () => get().reads;

export const findPost = (id) => get().posts.find((post) => post.id === id);

export const upsertPost = (post) => {
  const now = new Date().toISOString();
  return write((draft) => {
    const record = {
      ...post,
      status: post.status === 'draft' ? 'draft' : 'published',
      updatedAt: now,
      createdAt: post.createdAt || now,
    };
    const index = draft.posts.findIndex((item) => item.id === post.id);
    if (index === -1) draft.posts.unshift(record);
    else draft.posts[index] = { ...draft.posts[index], ...record };
    return draft;
  });
};

export const patchSettings = (patch) =>
  write((draft) => ({ ...draft, settings: { ...draft.settings, ...patch } }));

export const logEvent = (type, action, detail = '') =>
  write((draft) => ({
    ...draft,
    audit: [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: new Date().toISOString(),
        type,
        action,
        detail,
      },
      ...draft.audit,
    ].slice(0, MAX_AUDIT),
  }));

/* ---------------------------------------------------------------- telemetry */

export const recordRead = (slug) => {
  if (!slug) return;
  const at = new Date().toISOString();
  write((draft) => {
    const entry = draft.reads[slug] || { count: 0, events: [] };
    entry.count += 1;
    entry.events = [...entry.events, at].slice(-MAX_EVENTS_PER_SLUG);

    // Global cap keeps the payload well inside the storage quota.
    const total = Object.values(draft.reads).reduce((sum, item) => sum + item.events.length, 0);
    if (total > MAX_TOTAL_EVENTS) {
      const oldest = Object.entries(draft.reads)
        .sort((a, b) => (a[1].events[0] || '').localeCompare(b[1].events[0] || ''))
        .slice(0, Math.ceil(Object.keys(draft.reads).length / 4));
      oldest.forEach(([key]) => {
        draft.reads[key].events = draft.reads[key].events.slice(-Math.floor(MAX_EVENTS_PER_SLUG / 2));
      });
    }

    draft.reads[slug] = entry;
    return draft;
  });
};

export const clearReads = () => write((draft) => ({ ...draft, reads: {} }));

export const totalLoggedReads = () =>
  Object.values(get().reads).reduce((sum, entry) => sum + (entry.count || 0), 0);

export const readsSince = (timestamp) => {
  const cutoff = new Date(timestamp).getTime();
  let count = 0;
  for (const entry of Object.values(get().reads)) {
    for (const iso of entry.events) {
      if (new Date(iso).getTime() >= cutoff) count += 1;
    }
  }
  return count;
};

/* ------------------------------------------------------------------ backups */

export const exportDatabase = () => ({
  app: 'newspulse24',
  kind: 'editorial-database',
  schema: DB_VERSION,
  exportedAt: new Date().toISOString(),
  stories: STORIES.length,
  data: get(),
});

export const exportFile = (filename) => {
  if (typeof document === 'undefined') return;
  const payload = JSON.stringify(exportDatabase(), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const importDatabase = (json) => {
  let parsed;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  const payload = parsed?.data ?? parsed;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.posts)) {
    return { ok: false, reason: 'not-a-database' };
  }
  if (payload.version > DB_VERSION) {
    return { ok: false, reason: 'newer-schema' };
  }
  const next = normalise(payload);
  next.updatedAt = new Date().toISOString();
  const result = persist(next);
  state = next;
  emit(next);
  return result.ok ? { ok: true, state: next } : { ok: false, reason: 'storage' };
};

export const storageReport = () => {
  const payload = JSON.stringify(get());
  const used = payload.length;
  return {
    bytes: used,
    kb: used / 1024,
    reads: Object.keys(get().reads).length,
    events: Object.values(get().reads).reduce((sum, entry) => sum + entry.events.length, 0),
    posts: get().posts.length,
    audit: get().audit.length,
    updatedAt: get().updatedAt,
    createdAt: get().createdAt,
  };
};
