/**
 * The wire agent.
 *
 * It pulls published items from real RSS / Atom / JSON feeds, de-duplicates
 * them, scores them, and assembles a publishable story from what the source
 * actually said: headline, standfirst, body blocks, section, tags, SEO fields
 * and a matching image from the newsroom library.
 *
 * What it is NOT: a generative writer. There is no language model in this
 * bundle, so the copy it assembles is extractive — it reuses the source
 * summary and says so, with a link back to the original report. Images come
 * from the local library, not an image model. Everything it publishes is
 * attributed, marked `automated`, and can be queued for approval instead of
 * going live (the default).
 *
 * Runtime: it runs in this browser. A cycle fires every 30 seconds while a tab
 * is open and the agent is enabled, and only when the configured interval has
 * elapsed. An always-on newsroom needs the same logic on a server cron against
 * a hosted database — see the README.
 *
 * Fetching: browsers cannot read most publishers' feeds directly (CORS), so
 * requests go through the proxy template in settings. `/api/wire` ships with
 * this repo and works on Vercel; anything else you deploy can serve the same
 * `?url=` contract.
 */
import { AUTHORS, CATEGORIES } from '../data/news';
import { read, write } from './db';
import { publish, slugTaken } from './contentStore';

/* ------------------------------------------------------------------ presets */

export const AUTOMATION_PRESETS = [
  {
    id: 'preset-bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    section: 'World',
    weight: 1.4,
  },
  {
    id: 'preset-bbc-business',
    name: 'BBC Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    section: 'Business',
    weight: 1.2,
  },
  {
    id: 'preset-bbc-tech',
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    section: 'Technology',
    weight: 1.2,
  },
  {
    id: 'preset-guardian-world',
    name: 'The Guardian · World',
    url: 'https://www.theguardian.com/world/rss',
    section: 'World',
    weight: 1.2,
  },
  {
    id: 'preset-guardian-science',
    name: 'The Guardian · Science',
    url: 'https://www.theguardian.com/science/rss',
    section: 'Science',
    weight: 1,
  },
  {
    id: 'preset-aljazeera',
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    section: 'World',
    weight: 1.1,
  },
  {
    id: 'preset-nasa',
    name: 'NASA',
    url: 'https://www.nasa.gov/feed/',
    section: 'Science',
    weight: 1,
  },
  {
    id: 'preset-espn',
    name: 'ESPN',
    url: 'https://www.espn.com/espn/rss/news',
    section: 'Sports',
    weight: 1,
  },
];

const IMAGE_LIBRARY = [
  { file: 'hero-earth.jpg', alt: 'Planet Earth at night wrapped in glowing data networks', tags: ['world', 'global', 'climate', 'united nations', 'diplomacy', 'summit'] },
  { file: 'capitol.jpg', alt: 'The dome of a national legislature lit at dusk', tags: ['politics', 'election', 'parliament', 'congress', 'senate', 'government', 'policy', 'law'] },
  { file: 'markets.jpg', alt: 'Traders and screens on a busy trading floor', tags: ['markets', 'stocks', 'economy', 'inflation', 'rates', 'bank', 'trade', 'tariff', 'oil', 'currency'] },
  { file: 'ai-robot.jpg', alt: 'A humanoid robot beside a person in a laboratory', tags: ['ai', 'artificial intelligence', 'robot', 'machine learning', 'chip', 'software', 'semiconductor'] },
  { file: 'robot-hand.jpg', alt: 'A robotic hand reaching towards a human hand', tags: ['robot', 'automation', 'research', 'engineering'] },
  { file: 'rocket.jpg', alt: 'A rocket lifting off through a cloud of exhaust', tags: ['space', 'rocket', 'launch', 'satellite', 'mars', 'moon', 'astronomy', 'nasa', 'spacex'] },
  { file: 'medical.jpg', alt: 'A clinician reviewing a scan in a research hospital', tags: ['health', 'hospital', 'vaccine', 'virus', 'disease', 'medicine', 'cancer', 'drug', 'who'] },
  { file: 'football.jpg', alt: 'A footballer striking the ball under stadium lights', tags: ['football', 'soccer', 'sport', 'league', 'cup', 'olympic', 'tennis', 'cricket', 'match'] },
  { file: 'live-studio.jpg', alt: 'The NewsPulse 24 broadcast studio in action', tags: ['media', 'broadcast', 'television', 'streaming', 'film'] },
  { file: 'summit.jpg', alt: 'Delegates gathered in a summit hall', tags: ['summit', 'conference', 'talks', 'treaty', 'agreement', 'cop'] },
];

const SECTION_KEYWORDS = {
  World: ['world', 'global', 'nation', 'war', 'conflict', 'ceasefire', 'border', 'refugee', 'united nations', 'summit', 'diplomat', 'election', 'sanction', 'government'],
  Business: ['market', 'economy', 'inflation', 'rate', 'stock', 'bank', 'trade', 'tariff', 'company', 'earnings', 'oil', 'currency', 'gdp', 'investor', 'merger'],
  Technology: ['ai', 'artificial intelligence', 'technology', 'software', 'chip', 'semiconductor', 'robot', 'app', 'platform', 'cyber', 'data', 'startup', 'device'],
  Science: ['science', 'space', 'nasa', 'rocket', 'satellite', 'research', 'study', 'climate', 'physics', 'mars', 'moon', 'discovery', 'species'],
  Health: ['health', 'hospital', 'disease', 'virus', 'vaccine', 'medicine', 'cancer', 'who', 'drug', 'mental', 'outbreak', 'patients'],
  Sports: ['football', 'soccer', 'sport', 'league', 'cup', 'match', 'olympic', 'tennis', 'cricket', 'formula', 'nba', 'fifa', 'coach', 'player'],
  Entertainment: ['film', 'movie', 'music', 'album', 'television', 'series', 'actor', 'festival', 'award', 'studio', 'hollywood', 'streaming'],
  Lifestyle: ['travel', 'food', 'design', 'home', 'fashion', 'wellness', 'city', 'culture'],
  Opinion: ['opinion', 'analysis', 'editorial', 'column', 'comment'],
};

const STOPWORDS = new Set(
  'the a an and or but if then than that this these those of in on for to from by with at as is are was were be been being it its his her their our your they we you he she i not no nor so such about into over under after before between during while against among within without up down out off again further once here there when where why how all any both each few more most other some only own same too very can will just should now new says said say also has have had do does did may might must could would one two three first last year years day days week weeks month months time times report reports reported according latest news update updates live'.split(
    ' ',
  ),
);

/* ------------------------------------------------------------------ helpers */

export const readAutomation = () => read().automation;

export const updateAutomation = (patch) =>
  write((draft) => ({
    ...draft,
    automation: { ...draft.automation, ...patch },
  }));

const pushLog = (draft, level, message) => ({
  ...draft,
  automation: {
    ...draft.automation,
    log: [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), level, message },
      ...draft.automation.log,
    ].slice(0, 80),
  },
});

export const agentLog = (level, message) =>
  write((draft) => pushLog(draft, level, String(message).slice(0, 240)));

const hash = (value) => {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const decodeEntities = (value) =>
  String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

export const stripHtml = (value) =>
  decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const sentences = (text) =>
  stripHtml(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);

export const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

export const sourceHost = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'feed';
  }
};

const uniqueSlug = (title) => {
  const base = slugify(title) || `wire-${Date.now().toString(36)}`;
  if (!slugTaken(base)) return base;
  for (let i = 2; i < 40; i += 1) {
    const candidate = `${base.slice(0, 60)}-${i}`;
    if (!slugTaken(candidate)) return candidate;
  }
  return `${base.slice(0, 56)}-${Date.now().toString(36).slice(-4)}`;
};

/* -------------------------------------------------------------------- feeds */

const parseXml = (text) => {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('feed did not parse as XML');
  const rssItems = [...doc.querySelectorAll('item')];
  if (rssItems.length) {
    return rssItems.map((item) => {
      const textOf = (selector) => item.querySelector(selector)?.textContent || '';
      const enclosure =
        item.querySelector('enclosure')?.getAttribute('url') ||
        item.querySelector('media\\:content, content')?.getAttribute('url') ||
        item.querySelector('media\\:thumbnail')?.getAttribute('url') ||
        '';
      return {
        title: textOf('title'),
        summary:
          item.getElementsByTagName('content:encoded')[0]?.textContent ||
          textOf('description'),
        url: textOf('link') || item.querySelector('link')?.getAttribute('href') || '',
        publishedAt: textOf('pubDate') || textOf('dc\\:date'),
        image: enclosure,
      };
    });
  }
  const atomItems = [...doc.querySelectorAll('entry')];
  return atomItems.map((entry) => ({
    title: entry.querySelector('title')?.textContent || '',
    summary:
      entry.querySelector('summary')?.textContent ||
      entry.querySelector('content')?.textContent ||
      '',
    url: entry.querySelector('link')?.getAttribute('href') || '',
    publishedAt: entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '',
    image: entry.querySelector('media\\:thumbnail')?.getAttribute('url') || '',
  }));
};

const parseJsonFeed = (text) => {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data.items || data.entries || [];
  return items.map((item) => ({
    title: item.title || item.name || '',
    summary: item.summary || item.description || item.content_text || item.content || '',
    url: item.url || item.link || item.external_url || '',
    publishedAt: item.date_published || item.pubDate || item.published || item.created || '',
    image: item.image || item.thumbnail || item.enclosure?.link || item.enclosure?.url || '',
  }));
};

export const parseFeed = (text) => {
  const body = String(text || '').trim();
  if (!body) throw new Error('the feed returned nothing');
  if (body.startsWith('{') || body.startsWith('[')) return parseJsonFeed(body);
  return parseXml(body);
};

export const fetchFeed = async (source, proxyTemplate = '') => {
  const proxy = String(proxyTemplate || '').trim();
  const target = proxy.includes('{url}')
    ? proxy.replace('{url}', encodeURIComponent(source.url))
    : source.url;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5' },
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 1_500_000) throw new Error('feed too large');
    return parseFeed(text);
  } catch (error) {
    const reason =
      error.name === 'AbortError'
        ? 'request timed out'
        : /Failed to fetch|NetworkError|Load failed/i.test(error.message)
          ? 'blocked by CORS — configure the wire proxy'
          : error.message;
    throw new Error(reason);
  } finally {
    clearTimeout(timeout);
  }
};

/* --------------------------------------------------------------- generation */

const keywordList = (text) => {
  const words = stripHtml(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  const counts = new Map();
  for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word);
};

const classify = (text, sourceSection) => {
  const haystack = ` ${stripHtml(text).toLowerCase()} `;
  const scores = {};
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    scores[section] = keywords.reduce(
      (total, keyword) => total + (haystack.includes(keyword) ? 1 : 0),
      0,
    );
  }
  if (sourceSection && CATEGORIES.includes(sourceSection)) {
    scores[sourceSection] = (scores[sourceSection] || 0) + 1.5;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [section, score] = ranked[0] || ['World', 0];
  const confidence = Math.min(1, Number(score) / 4);
  return { section: score > 0 ? section : 'World', confidence };
};

const pickImage = (text) => {
  const haystack = stripHtml(text).toLowerCase();
  let best = IMAGE_LIBRARY[0];
  let bestScore = 0;
  for (const image of IMAGE_LIBRARY) {
    const score = image.tags.reduce((total, tag) => total + (haystack.includes(tag) ? 1 : 0), 0);
    if (score > bestScore) {
      best = image;
      bestScore = score;
    }
  }
  return { path: `/images/${best.file}`, alt: best.alt, matched: bestScore > 0 };
};

const authorFor = (section) =>
  ({
    World: AUTHORS.marcus,
    Business: AUTHORS.priya,
    Technology: AUTHORS.elena,
    Science: AUTHORS.tariq,
    Sports: AUTHORS.sofia,
    Health: AUTHORS.naomi,
    Opinion: AUTHORS.james,
    Entertainment: AUTHORS.amara,
    Lifestyle: AUTHORS.amara,
  })[section] || AUTHORS.marcus;

const titleCase = (value) => {
  const cleaned = stripHtml(value).replace(/\s+[|–—-]\s+[^|–—-]{2,30}$/, '').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

/** Turns one feed item into a complete, attributed story draft. */
export const buildDraft = (item, source, { useSourceImages = false } = {}) => {
  const title = titleCase(item.title);
  const summary = stripHtml(item.summary);
  if (!title || title.length < 18) return null;
  if (summary.length < 80) return null;

  const { section, confidence } = classify(`${title} ${summary}`, source.section);
  const image = pickImage(`${title} ${summary}`);
  const sentencesList = sentences(summary);
  const lead = (sentencesList[0] || summary).slice(0, 240);
  const standfirst =
    lead.length >= 30 ? lead : `${title} — the latest from ${source.name}.`.slice(0, 220);
  const bodySentences = sentencesList.slice(0, 5);
  const body = [];

  const firstParagraph = bodySentences.slice(0, 2).join(' ');
  const secondParagraph = bodySentences.slice(2, 5).join(' ');
  if (firstParagraph) body.push({ type: 'p', text: firstParagraph });
  if (secondParagraph) {
    body.push({ type: 'h2', text: 'What else we know' });
    body.push({ type: 'p', text: secondParagraph });
  }
  body.push({
    type: 'p',
    text: `This dispatch was assembled by the NewsPulse 24 wire agent from a report published by ${source.name}. Read the original for the full account.`,
  });

  const keywords = keywordList(`${title} ${summary}`).slice(0, 8);
  const tags = [...new Set([section.toLowerCase(), ...keywords.slice(0, 5)])].slice(0, 8);
  const publishedAt = item.publishedAt && !Number.isNaN(new Date(item.publishedAt).getTime())
    ? new Date(item.publishedAt).toISOString()
    : new Date().toISOString();

  const host = sourceHost(source.url);
  const words = body
    .map((block) => block.text || '')
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const score = Math.round(
    Math.min(
      100,
      (summary.length >= 400 ? 30 : summary.length >= 200 ? 22 : 14) +
        confidence * 25 +
        (image.matched ? 15 : 5) +
        Math.min(15, source.weight * 8) +
        (bodySentences.length >= 3 ? 12 : 6),
    ),
  );

  const sourceImage =
    useSourceImages && item.image && /^https:\/\//i.test(item.image) ? item.image : null;

  const seoTitle = (title.length > 60 ? `${title.slice(0, 57)}…` : title).trim();
  const seoDescription = (standfirst.length > 155 ? `${standfirst.slice(0, 152)}…` : standfirst).trim();

  return {
    id: `wire-${hash(`${item.url}|${title}`)}`,
    slug: uniqueSlug(title),
    category: section,
    title,
    excerpt: standfirst,
    image: sourceImage || image.path,
    imageAlt: sourceImage ? `${title} — image via ${source.name}` : image.alt,
    imagePosition: 'center 45%',
    publishedAt,
    author: authorFor(section),
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    views: 0,
    tags,
    hero: false,
    heroKicker: section,
    status: 'draft',
    body,
    seo: { title: seoTitle, description: seoDescription, keywords },
    attribution: { name: source.name, url: item.url, host, automated: true },
    score,
    automated: true,
  };
};

/* ----------------------------------------------------------------- ingestion */

const dedupeKey = (item) => hash(`${(item.url || item.title || '').trim().toLowerCase()}`);

const withinQueue = (queue, key) =>
  queue.some((entry) => entry.key === key || entry.draft?.attribution?.url === key);

export const ingestItems = (items, source, config) => {
  const state = read();
  const agent = state.automation;
  const seen = new Set(agent.seen);
  const accepted = [];
  const rejected = [];

  for (const item of items.slice(0, 25)) {
    const key = dedupeKey(item);
    if (!key || seen.has(key)) continue;
    const draft = buildDraft(item, source, { useSourceImages: config.useSourceImages });
    if (!draft) {
      rejected.push({ item, reason: 'not enough source copy' });
      continue;
    }
    if (withinQueue(agent.queue, key)) continue;
    const allowed =
      !config.sections?.length || config.sections.includes(draft.category);
    if (!allowed) {
      rejected.push({ item, reason: `section ${draft.category} is switched off` });
      continue;
    }
    accepted.push({
      key,
      id: draft.id,
      sourceId: source.id,
      sourceName: source.name,
      fetchedAt: new Date().toISOString(),
      publishedAt: draft.publishedAt,
      score: draft.score,
      status: 'pending',
      draft,
      reason: '',
    });
    seen.add(key);
  }

  write((draftState) => ({
    ...draftState,
    automation: {
      ...draftState.automation,
      queue: [...accepted, ...draftState.automation.queue].slice(0, 60),
      seen: [...seen].slice(-400),
    },
  }));

  return { accepted: accepted.length, rejected: rejected.length, rejectedSample: rejected.slice(0, 3) };
};

/* -------------------------------------------------------------------- queue */

export const rejectQueueItem = (id, reason = 'rejected by the editor') =>
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      queue: draft.automation.queue.map((entry) =>
        entry.id === id ? { ...entry, status: 'rejected', reason } : entry,
      ),
      stats: { ...draft.automation.stats, rejected: draft.automation.stats.rejected + 1 },
    },
  }));

export const removeQueueItem = (id) =>
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      queue: draft.automation.queue.filter((entry) => entry.id !== id),
    },
  }));

export const queueStory = (id) => {
  const entry = read().automation.queue.find((item) => item.id === id);
  if (!entry) return { ok: false, reason: 'missing' };
  const post = { ...entry.draft, status: 'published' };
  const result = publish(post, { breaking: false });
  if (result?.ok === false) return { ok: false, reason: 'storage' };
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      queue: draft.automation.queue.map((item) =>
        item.id === id
          ? { ...item, status: 'published', publishedAt: new Date().toISOString(), slug: post.slug }
          : item,
      ),
      stats: {
        ...draft.automation.stats,
        published: draft.automation.stats.published + 1,
      },
    },
  }));
  agentLog('success', `Published “${entry.draft.title}” from ${entry.sourceName}`);
  return { ok: true, slug: post.slug };
};

export const markQueuePublished = (id, slug) =>
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      queue: draft.automation.queue.map((entry) =>
        entry.id === id
          ? { ...entry, status: 'published', publishedAt: new Date().toISOString(), slug }
          : entry,
      ),
    },
  }));

/* --------------------------------------------------------------------- runs */

const withinLastHour = (queue) =>
  queue.filter(
    (entry) =>
      entry.status === 'published' &&
      entry.publishedAt &&
      Date.now() - new Date(entry.publishedAt).getTime() < 3_600_000,
  ).length;

export const runAutomationCycle = async ({ manual = false } = {}) => {
  const state = read();
  const config = state.automation;
  if (!config.enabled && !manual) return { skipped: true, reason: 'agent disabled' };
  const sources = config.sources.filter((source) => source.enabled);
  if (!sources.length) {
    agentLog('warn', 'Run skipped: no sources enabled');
    return { skipped: true, reason: 'no sources' };
  }

  agentLog('info', `Run started · ${sources.length} source${sources.length === 1 ? '' : 's'}`);
  let ingested = 0;
  let failures = 0;
  let published = 0;

  for (const source of sources) {
    try {
      const items = await fetchFeed(source, config.proxy);
      const result = ingestItems(items, source, config);
      ingested += result.accepted;
      write((draft) => ({
        ...draft,
        automation: {
          ...draft.automation,
          sources: draft.automation.sources.map((entry) =>
            entry.id === source.id
              ? {
                  ...entry,
                  lastFetchedAt: new Date().toISOString(),
                  lastStatus: result.accepted
                    ? `${result.accepted} new`
                    : items.length
                      ? 'no new items'
                      : 'empty feed',
                  lastCount: items.length,
                }
              : entry,
          ),
        },
      }));
    } catch (error) {
      failures += 1;
      write((draft) => ({
        ...draft,
        automation: {
          ...draft.automation,
          sources: draft.automation.sources.map((entry) =>
            entry.id === source.id
              ? {
                  ...entry,
                  lastFetchedAt: new Date().toISOString(),
                  lastStatus: String(error.message || 'fetch failed').slice(0, 120),
                }
              : entry,
          ),
        },
      }));
      agentLog('error', `${source.name}: ${error.message}`);
    }
  }

  let nextConfig = read().automation;

  if (nextConfig.mode === 'auto' && ingested > 0) {
    const pending = nextConfig.queue
      .filter((entry) => entry.status === 'pending' && entry.score >= nextConfig.minScore)
      .sort((a, b) => b.score - a.score);
    const slots = Math.max(0, nextConfig.maxPerHour - withinLastHour(nextConfig.queue));
    for (const entry of pending.slice(0, slots)) {
      const result = queueStory(entry.id);
      if (result.ok) {
        published += 1;
        nextConfig = read().automation;
      }
    }
    if (slots === 0) agentLog('warn', 'Auto-publish paused: hourly cap reached');
  }

  const finished = new Date().toISOString();
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      lastRunAt: finished,
      stats: {
        ...draft.automation.stats,
        runs: draft.automation.stats.runs + 1,
        ingested: draft.automation.stats.ingested + ingested,
        lastRunAt: finished,
      },
    },
  }));
  agentLog(
    'info',
    `Run finished · ${ingested} new · ${published} published${failures ? ` · ${failures} failed source${failures === 1 ? '' : 's'}` : ''}`,
  );

  return { ingested, published, failures };
};

/* ----------------------------------------------------------------- scheduler */

export const startAutomationLoop = () => {
  if (typeof window === 'undefined') return () => {};
  let busy = false;
  let disposed = false;

  const tick = async () => {
    if (busy || disposed) return;
    const config = read().automation;
    if (!config.enabled) return;
    const due =
      !config.lastRunAt ||
      Date.now() - new Date(config.lastRunAt).getTime() >= config.intervalMinutes * 60_000;
    if (!due) return;
    busy = true;
    try {
      await runAutomationCycle();
    } catch (error) {
      agentLog('error', `Cycle crashed: ${error.message}`);
    } finally {
      busy = false;
    }
  };

  const first = window.setTimeout(tick, 4_000);
  const timer = window.setInterval(tick, 30_000);
  return () => {
    disposed = true;
    window.clearTimeout(first);
    window.clearInterval(timer);
  };
};

export const nextRunAt = () => {
  const config = read().automation;
  if (!config.enabled || !config.lastRunAt) return null;
  return new Date(new Date(config.lastRunAt).getTime() + config.intervalMinutes * 60_000);
};

export const queueCounts = () => {
  const queue = read().automation.queue;
  return {
    pending: queue.filter((item) => item.status === 'pending').length,
    published: queue.filter((item) => item.status === 'published').length,
    rejected: queue.filter((item) => item.status === 'rejected').length,
  };
};

export const agentEnabled = () => read().automation.enabled;