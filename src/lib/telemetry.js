/**
 * Mission-control telemetry.
 *
 * Everything here is derived from data the newsroom actually holds: the story
 * dataset (read counters, publish times, sections) plus the real article opens
 * this browser has logged. Distribution over time uses a decay model — a story
 * picks up most of its reads shortly after publication and tapers off — which is
 * what lets one snapshot of counters produce a 24-hour curve. It is labelled as
 * modelled in the UI; nothing here claims to be live network analytics.
 */
import { CATEGORIES, STORIES } from '../data/news';
import { read as readDb } from './db';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const RANGES = {
  '24h': { id: '24h', label: 'Past 24h', buckets: 24, span: DAY, halfLife: 7 * HOUR, step: HOUR },
  '7d': { id: '7d', label: 'Past 7 days', buckets: 28, span: 7 * DAY, halfLife: 42 * HOUR, step: 6 * HOUR },
  '30d': { id: '30d', label: 'Monthly', buckets: 30, span: 30 * DAY, halfLife: 9 * DAY, step: DAY },
};

export const CHART_SERIES = [
  { id: 'all', label: 'All Desks' },
  { id: 'breaking', label: 'Breaking' },
  { id: 'business', label: 'Business' },
  { id: 'technology', label: 'Technology' },
];

const loggedReadsBySlug = () => {
  const map = {};
  for (const [slug, entry] of Object.entries(readDb().reads)) map[slug] = entry.count || 0;
  return map;
};

/** views + this browser's real opens */
export const storyReads = (story, logged) => (story.views || 0) + (logged?.[story.slug] || 0);

const filterForSeries = (series) => {
  if (series === 'breaking') return STORIES.filter((story) => story.hero);
  if (series === 'business') return STORIES.filter((story) => story.category === 'Business');
  if (series === 'technology') return STORIES.filter((story) => story.category === 'Technology');
  return STORIES;
};

const bucketLabel = (iso, range) => {
  const date = new Date(iso);
  if (range.id === '24h') return `${String(date.getHours()).padStart(2, '0')}:00`;
  if (range.id === '7d') {
    const day = date.toLocaleDateString('en-GB', { weekday: 'short' });
    return `${day} ${String(date.getHours()).padStart(2, '0')}h`;
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

/**
 * Distributes each story's read counter across the window with an exponential
 * taper, so the area under the curve equals the total reads in view.
 */
const buildSeries = (rangeId, seriesId, { now = Date.now(), offset = 0 } = {}) => {
  const range = RANGES[rangeId] || RANGES['24h'];
  const logged = loggedReadsBySlug();
  const stories = filterForSeries(seriesId);
  const start = now - range.span - offset * range.span;
  const values = new Array(range.buckets).fill(0);
  const centres = [];
  const weights = [];

  for (let i = 0; i < range.buckets; i += 1) {
    const centre = start + (i + 0.5) * range.step;
    centres.push(centre);
    weights.push(new Array(stories.length).fill(0));
  }

  stories.forEach((story, sIndex) => {
    const published = new Date(story.publishedAt).getTime();
    const total = storyReads(story, logged);
    if (!total) return;
    let sum = 0;
    for (let i = 0; i < range.buckets; i += 1) {
      const since = (centres[i] - published) / range.halfLife;
      const weight = since < -0.2 ? 0 : Math.exp(-Math.max(since, 0));
      weights[i][sIndex] = weight;
      sum += weight;
    }
    if (!sum) {
      // Published inside a future bucket: assign it to the last bucket.
      values[range.buckets - 1] += total;
      return;
    }
    for (let i = 0; i < range.buckets; i += 1) {
      values[i] += (total * weights[i][sIndex]) / sum;
    }
  });

  return {
    range,
    points: values.map((value, index) => ({
      value: Math.round(value),
      at: new Date(centres[index]).toISOString(),
      label: bucketLabel(new Date(centres[index]).toISOString(), range),
      index,
    })),
    total: Math.round(values.reduce((sum, value) => sum + value, 0)),
    peakIndex: values.reduce((best, value, index) => (value > values[best] ? index : best), 0),
  };
};

const pct = (current, previous) => {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(value || 0);

export const formatCompact = (value) =>
  new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const relativeClock = (iso) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** Everything the Mission Control dashboard needs, in one pass. */
export const buildDashboard = (rangeId = '24h') => {
  const now = Date.now();
  const logged = loggedReadsBySlug();
  const db = readDb();
  const range = RANGES[rangeId] || RANGES['24h'];

  const current = buildSeries(rangeId, 'all');
  const previous = buildSeries(rangeId, 'all', { offset: 1 });
  const series = Object.fromEntries(
    CHART_SERIES.map((item) => [item.id, buildSeries(rangeId, item.id)]),
  );

  const lastBucket = current.points[current.points.length - 1]?.value || 0;
  const prevBucket = previous.points[previous.points.length - 1]?.value || 0;

  const published24h = STORIES.filter((story) => now - new Date(story.publishedAt).getTime() < DAY);
  const totalWords = STORIES.reduce((sum, story) => {
    const text = (story.body || [])
      .map((block) => (block.type === 'list' ? (block.items || []).join(' ') : block.text || ''))
      .join(' ');
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);

  const desks = CATEGORIES.map((category) => ({
    category,
    stories: STORIES.filter((story) => story.category === category).length,
    reads: STORIES.filter((story) => story.category === category).reduce(
      (sum, story) => sum + storyReads(story, logged),
      0,
    ),
  }));
  const covered = desks.filter((desk) => desk.stories > 0).length;

  const drafts = db.posts.filter((post) => post.status === 'draft');
  const takenDown = db.hidden.length;
  const breaking = STORIES.filter((story) => story.hero).length;

  const ranked = [...STORIES].sort(
    (a, b) => storyReads(b, logged) - storyReads(a, logged),
  );
  const topStories = ranked.slice(0, 5).map((story, index) => {
    const minutes = Math.max(1, (now - new Date(story.publishedAt).getTime()) / 60000);
    const reads = storyReads(story, logged);
    return {
      story,
      slot: index,
      reads,
      perMinute: Math.round(reads / minutes),
      localReads: logged[story.slug] || 0,
    };
  });

  const newest = [...STORIES].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  )[0];

  const peak = current.points[current.peakIndex];

  return {
    range,
    now,
    series,
    current,
    previous,
    kpis: {
      readsInRange: current.total,
      readsDelta: pct(current.total, previous.total),
      live: lastBucket,
      liveDelta: pct(lastBucket, prevBucket),
      stories: STORIES.length,
      published24h: published24h.length,
      words: totalWords,
      desks: desks.filter((desk) => desk.stories > 0).length,
      desksTotal: CATEGORIES.length,
      covered,
      drafts: drafts.length,
      takenDown,
      breaking,
      loggedReads: Object.values(logged).reduce((sum, value) => sum + value, 0),
    },
    desks: [...desks].sort((a, b) => b.reads - a.reads),
    topStories,
    newest,
    annotations: [
      peak
        ? { id: 'peak', index: current.peakIndex, label: `Peak · ${peak.label}`, value: peak.value, kind: 'peak' }
        : null,
      newest
        ? {
            id: 'latest',
            index: current.points.reduce(
              (best, point, index) =>
                Math.abs(new Date(point.at).getTime() - new Date(newest.publishedAt).getTime()) <
                Math.abs(new Date(current.points[best].at).getTime() - new Date(newest.publishedAt).getTime())
                  ? index
                  : best,
              0,
            ),
            label: `Latest · ${newest.category}`,
            value: 0,
            kind: 'publish',
          }
        : null,
    ].filter(Boolean),
    audit: db.audit,
    settings: db.settings,
  };
};

/** Hour-of-day × weekday matrix from real logged reads (falls back to publish times). */
export const buildHeatmap = () => {
  const db = readDb();
  const matrix = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let source = 'reads';

  for (const entry of Object.values(db.reads)) {
    for (const iso of entry.events) {
      const date = new Date(iso);
      matrix[date.getDay()][date.getHours()] += 1;
    }
  }

  const total = matrix.flat().reduce((sum, value) => sum + value, 0);
  // A handful of opens make a misleadingly empty grid; below the threshold the
  // publish-time model gives an honest shape instead.
  if (total < 25) {
    source = 'publish';
    for (const story of STORIES) {
      const date = new Date(story.publishedAt);
      matrix[date.getDay()][date.getHours()] += Math.max(1, Math.round((story.views || 0) / 40000));
    }
  }

  const max = Math.max(1, ...matrix.flat());
  return { matrix, max, source };
};

export const sectionPerformance = () => {
  const logged = loggedReadsBySlug();
  return CATEGORIES.map((category) => {
    const stories = STORIES.filter((story) => story.category === category);
    return {
      category,
      stories: stories.length,
      reads: stories.reduce((sum, story) => sum + storyReads(story, logged), 0),
      average: stories.length
        ? Math.round(stories.reduce((sum, story) => sum + storyReads(story, logged), 0) / stories.length)
        : 0,
    };
  }).sort((a, b) => b.reads - a.reads);
};
