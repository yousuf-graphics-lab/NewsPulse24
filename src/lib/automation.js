/**
 * The wire agent.
 *
 * It pulls published items from real RSS / Atom / RDF / JSON feeds,
 * de-duplicates them, optionally reads the article page for more context,
 * scores them, and assembles a publishable story from what the source actually
 * said: headline, standfirst, body blocks, key points, section, tags, SEO
 * fields and a matching image.
 *
 * What it is NOT: a generative writer. There is no language model in this
 * bundle, so the copy it assembles is extractive — it reuses the source
 * summary (and, when enrichment is on, the opening paragraphs of the linked
 * article) and says so, with a link back to the original report. Images come
 * from the local library, or the publisher's own image when that is enabled.
 *
 * Runtime: it runs in this browser. A tick fires every 20 seconds while a tab
 * is open and the agent is enabled, and starts a cycle once the interval has
 * elapsed. A cross-tab lock stops two tabs running the same cycle twice. An
 * always-on newsroom needs the same logic on a server cron against a hosted
 * database — see the README.
 *
 * Fetching: browsers cannot read most publishers' feeds directly (CORS), so
 * requests go through the proxy chain in settings: the deployed `/api/wire`
 * first, then any fallback relays, then a direct request. Each hop is tried in
 * turn and failures are reported per source in the panel.
 */
import { AUTHORS, CATEGORIES } from '../data/news';
import { read, write } from './db';
import { FEED_CATALOG, PUBLIC_PROXIES, sourceFromChannel } from './feedCatalog';
import { publish, slugTaken } from './contentStore';

/* ------------------------------------------------------------------ presets */

export const AUTOMATION_PRESETS = FEED_CATALOG;
export { FEED_CATALOG, PUBLIC_PROXIES };

const IMAGE_LIBRARY = [
  { file: 'hero-earth.jpg', alt: 'Planet Earth at night wrapped in glowing data networks', tags: ['world', 'global', 'climate', 'united nations', 'diplomacy', 'summit', 'earth', 'planet'] },
  { file: 'capitol.jpg', alt: 'The dome of a national legislature lit at dusk', tags: ['politics', 'election', 'parliament', 'congress', 'senate', 'government', 'policy', 'law', 'minister', 'president'] },
  { file: 'markets.jpg', alt: 'Traders and screens on a busy trading floor', tags: ['markets', 'stocks', 'economy', 'inflation', 'rates', 'bank', 'trade', 'tariff', 'oil', 'currency', 'investors', 'shares'] },
  { file: 'ai-robot.jpg', alt: 'A humanoid robot beside a person in a laboratory', tags: ['ai', 'artificial intelligence', 'robot', 'machine learning', 'chip', 'software', 'semiconductor', 'model', 'openai', 'google'] },
  { file: 'robot-hand.jpg', alt: 'A robotic hand reaching towards a human hand', tags: ['automation', 'research', 'engineering', 'lab', 'scientists'] },
  { file: 'rocket.jpg', alt: 'A rocket lifting off through a cloud of exhaust', tags: ['space', 'rocket', 'launch', 'satellite', 'mars', 'moon', 'astronomy', 'nasa', 'spacex', 'orbit'] },
  { file: 'medical.jpg', alt: 'A clinician reviewing a scan in a research hospital', tags: ['health', 'hospital', 'vaccine', 'virus', 'disease', 'medicine', 'cancer', 'drug', 'who', 'patients', 'mental'] },
  { file: 'football.jpg', alt: 'A footballer striking the ball under stadium lights', tags: ['football', 'soccer', 'sport', 'league', 'cup', 'olympic', 'tennis', 'cricket', 'match', 'coach', 'striker'] },
  { file: 'live-studio.jpg', alt: 'The NewsPulse 24 broadcast studio in action', tags: ['media', 'broadcast', 'television', 'streaming', 'film', 'series', 'music', 'album', 'actor'] },
  { file: 'summit.jpg', alt: 'Delegates gathered in a summit hall', tags: ['summit', 'conference', 'talks', 'treaty', 'agreement', 'cop', 'delegates', 'g20'] },
];

const SECTION_KEYWORDS = {
  World: ['world', 'global', 'nation', 'war', 'conflict', 'ceasefire', 'border', 'refugees', 'refugee', 'united nations', 'summit', 'diplomat', 'election', 'sanction', 'government', 'military', 'peace'],
  Business: ['market', 'economy', 'inflation', 'rate', 'stock', 'bank', 'trade', 'tariff', 'company', 'earnings', 'oil', 'currency', 'gdp', 'investor', 'merger', 'jobs', 'retail'],
  Technology: ['ai', 'artificial intelligence', 'technology', 'software', 'chip', 'semiconductor', 'robot', 'app', 'platform', 'cyber', 'data', 'startup', 'device', 'model', 'cloud'],
  Science: ['science', 'space', 'nasa', 'rocket', 'satellite', 'research', 'study', 'climate', 'physics', 'mars', 'moon', 'discovery', 'species', 'scientists', 'orbit'],
  Health: ['health', 'hospital', 'disease', 'virus', 'vaccine', 'medicine', 'cancer', 'clinicians', 'drug', 'mental', 'outbreak', 'patients', 'clinical'],
  Sports: ['football', 'soccer', 'sport', 'league', 'cup', 'match', 'olympic', 'tennis', 'cricket', 'formula', 'nba', 'fifa', 'coach', 'player', 'striker'],
  Entertainment: ['film', 'movie', 'music', 'album', 'television', 'series', 'actor', 'festival', 'award', 'studio', 'hollywood', 'streaming', 'box office'],
  Lifestyle: ['travel', 'food', 'design', 'home', 'fashion', 'wellness', 'city', 'culture', 'recipe', 'hotel'],
  Opinion: ['opinion', 'analysis', 'editorial', 'column', 'comment', 'why we', 'the case for'],
};

const STOPWORDS = new Set(
  'the a an and or but if then than that this these those of in on for to from by with at as is are was were be been being it its his her their our your they we you he she i not no nor so such about into over under after before between during while against among within without up down out off again further once here there when where why how all any both each few more most other some only own same too very can will just should now new says said say also has have had do does did may might must could would one two three first last year years day days week weeks month months time times report reports reported according latest news update updates live told added said'.split(
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
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), level, message: String(message).slice(0, 240) },
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
  decodeEntities(String(value || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' '))
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

/** Trims tracking parameters so the same story from two feeds dedupes. */
const canonicalUrl = (url) => {
  try {
    const parsed = new URL(String(url));
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref|source|at_)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.hash = '';
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${path}${parsed.search}`;
  } catch {
    return String(url || '').trim();
  }
};

/* -------------------------------------------------------------------- feeds */

const tag = (node) => String(node?.tagName || '').split(':').pop().toLowerCase();

const childText = (element, names) => {
  if (!element) return '';
  const wanted = names.map((name) => name.toLowerCase());
  for (const child of element.children || []) {
    if (wanted.includes(tag(child))) return child.textContent || '';
  }
  return '';
};

const firstAttribute = (element, names, attribute) => {
  if (!element) return '';
  const wanted = names.map((name) => name.toLowerCase());
  for (const node of element.getElementsByTagName('*')) {
    if (wanted.includes(tag(node))) {
      const value = node.getAttribute(attribute);
      if (value) return value;
    }
  }
  return '';
};

const IMAGE_IN_HTML = [
  /<img[^>]+src=["']([^"']+)["']/i,
  /<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i,
  /<enclosure[^>]+url=["']([^"']+)["']/i,
];

const imageFromHtml = (html) => {
  for (const pattern of IMAGE_IN_HTML) {
    const match = String(html || '').match(pattern);
    if (match && /^https?:\/\//i.test(match[1])) return match[1];
  }
  return '';
};

/** Reads one <item> / <entry> node into the flat shape the agent understands. */
const readItem = (node) => {
  const description =
    childText(node, ['description', 'summary', 'content', 'content:encoded', 'encoded']) || '';
  const image =
    firstAttribute(node, ['enclosure', 'content', 'thumbnail'], 'url') ||
    imageFromHtml(description) ||
    firstAttribute(node, ['image'], 'href');

  const linkNode = [...(node.children || [])].find((child) => tag(child) === 'link');

  return {
    title: childText(node, ['title']) || '',
    summary: description,
    url:
      linkNode?.getAttribute('href') ||
      childText(node, ['link', 'guid', 'id']) ||
      node.getAttribute('rdf:about') ||
      '',
    publishedAt:
      childText(node, ['pubdate', 'published', 'updated', 'date', 'dc:date', 'issued', 'created']) || '',
    image,
  };
};

const parseXml = (text) => {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('the feed is not valid XML');

  const nodes = [
    ...doc.getElementsByTagName('item'),
    ...doc.getElementsByTagName('entry'),
  ];
  if (!nodes.length) throw new Error('the feed contains no items');

  const feedTitle =
    doc.querySelector('channel > title')?.textContent || doc.querySelector('feed > title')?.textContent || '';

  return {
    feedTitle: stripHtml(feedTitle),
    items: nodes.map(readItem).filter((item) => item.title && item.url),
  };
};

const parseJsonFeed = (text) => {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data.items || data.entries || data.results || [];
  if (!Array.isArray(items)) throw new Error('the JSON feed has no items');
  return {
    feedTitle: data.title || data.name || '',
    items: items
      .map((item) => ({
        title: item.title || item.name || item.headline || '',
        summary: item.summary || item.description || item.content_text || stripHtml(item.content_html) || item.content || '',
        url: item.url || item.link || item.external_url || item.permalink || '',
        publishedAt: item.date_published || item.pubDate || item.published || item.created || item.date || '',
        image: item.image || item.banner_image || item.thumbnail || item.enclosure?.link || item.enclosure?.url || '',
      }))
      .filter((item) => item.title && item.url),
  };
};

export const parseFeedDocument = (text) => {
  const body = String(text || '').trim();
  if (!body) throw new Error('the source returned an empty response');
  if (/^<(!doctype|html)/i.test(body.slice(0, 200))) {
    throw new Error('that URL returned a web page, not a feed');
  }
  if (body.startsWith('{') || body.startsWith('[')) return parseJsonFeed(body);
  return parseXml(body);
};

export const parseFeed = (text) => parseFeedDocument(text).items;

/* ---------------------------------------------------------------- transport */

const FEED_HEADERS = {
  accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json;q=0.9, */*;q=0.5',
};

const proxyChain = (config, preferred = '') => {
  const templates = [config.proxy, ...(config.proxyFallbacks || [])]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim());
  const unique = [...new Set(templates)];
  // A direct request goes last: some feeds do send CORS headers.
  const chain = [...unique, '{url}'];
  if (!preferred) return chain;
  // Start with whatever route answered last time for this channel.
  const index = chain.findIndex((template) => hopLabel(template) === preferred);
  return index > 0 ? [chain[index], ...chain.filter((_, i) => i !== index)] : chain;
};

const materialise = (template, url) =>
  template.includes('{url}') ? template.replace('{url}', encodeURIComponent(url)) : template;

const hopLabel = (template) => {
  if (template === '{url}') return 'direct';
  try {
    if (template.startsWith('/')) return 'site proxy';
    return sourceHost(template.split('{url}')[0]);
  } catch {
    return 'relay';
  }
};

const hopTimeout = (template) => (template === '{url}' ? 10_000 : template.startsWith('/') ? 12_000 : 9_000);

const requestText = async (target, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      signal: controller.signal,
      headers: FEED_HEADERS,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.clone().json();
        detail = payload?.error ? ` — ${payload.error}` : '';
      } catch {
        /* not JSON */
      }
      throw new Error(`HTTP ${response.status}${detail}`);
    }
    const text = await response.text();
    if (!text) throw new Error('empty response');
    if (text.length > 3_000_000) throw new Error('response too large');
    return text;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetches one source through the proxy chain.
 * Returns `{ document, via }` or throws an Error with every attempt spelled out.
 */
export const fetchFeedDetailed = async (source, config = readAutomation()) => {
  const chain = proxyChain(config, source.preferredVia);
  const failures = [];

  for (const template of chain) {
    const label = hopLabel(template);
    try {
      const text = await requestText(materialise(template, source.url), hopTimeout(template));
      const document = parseFeedDocument(text);
      if (!document.items.length) throw new Error('the feed listed no items');
      return { ...document, via: label };
    } catch (error) {
      const reason =
        error.name === 'AbortError'
          ? 'timed out'
          : /Failed to fetch|NetworkError|Load failed/i.test(error.message)
            ? 'blocked (CORS or network)'
            : error.message;
      failures.push(`${label}: ${reason}`);
    }
  }

  throw new Error(failures.join(' · ') || 'no route to the source');
};

export const fetchFeed = async (source, config = readAutomation()) => {
  const { items } = await fetchFeedDetailed(source, config);
  return items;
};

/** Pulls one article page and lifts its lead image and opening paragraphs. */
export const enrichArticle = async (item, config = readAutomation()) => {
  if (!/^https?:\/\//i.test(item.url || '')) return item;
  for (const template of proxyChain(config)) {
    try {
      const html = await requestText(materialise(template, item.url), 9_000);
      if (!/<html|<article|<p/i.test(html)) continue;

      const ogDescription = html.match(/property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] || '';
      const ogImage = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] || '';
      const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((match) => stripHtml(match[1]))
        .filter((text) => text.length > 70 && !/cookie|subscribe|newsletter|sign up|advertisement/i.test(text))
        .slice(0, 6)
        .join(' ');

      const extra = stripHtml(ogDescription);
      const summary = [stripHtml(item.summary), extra, paragraphs]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .slice(0, 6_000);

      return {
        ...item,
        summary: summary.length > (item.summary || '').length ? summary : item.summary,
        image: item.image || ogImage,
        enriched: true,
      };
    } catch {
      /* try the next hop */
    }
  }
  return item;
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

/** Matches a keyword as whole words, so `ai` never fires inside “said”. */
const wordMatcher = (text) => {
  const haystack = ` ${stripHtml(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')} `;
  return (keyword) => {
    const needle = keyword.toLowerCase();
    return needle.includes(' ')
      ? haystack.includes(` ${needle} `)
      : haystack.includes(` ${needle} `) || haystack.includes(` ${needle}s `) || haystack.includes(` ${needle}-`);
  };
};

const classify = (text, sourceSection) => {
  const has = wordMatcher(text);
  const scores = {};
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    scores[section] = keywords.reduce((total, keyword) => total + (has(keyword) ? 1 : 0), 0);
  }
  if (sourceSection && CATEGORIES.includes(sourceSection)) {
    scores[sourceSection] = (scores[sourceSection] || 0) + 2;
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [section, score] = ranked[0] || ['World', 0];
  return { section: score > 0 ? section : 'World', confidence: Math.min(1, Number(score) / 4) };
};

const SECTION_IMAGE = {
  World: 'hero-earth.jpg',
  Business: 'markets.jpg',
  Technology: 'ai-robot.jpg',
  Science: 'rocket.jpg',
  Health: 'medical.jpg',
  Sports: 'football.jpg',
  Entertainment: 'live-studio.jpg',
  Lifestyle: 'live-studio.jpg',
  Opinion: 'capitol.jpg',
};

const pickImage = (text, seed = '', section = '') => {
  const has = wordMatcher(text);
  let best = IMAGE_LIBRARY[0];
  let bestScore = 0;
  for (const image of IMAGE_LIBRARY) {
    const score = image.tags.reduce((total, keyword) => total + (has(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = image;
      bestScore = score;
    }
  }
  if (bestScore === 0) {
    // No keyword match: fall back to the desk's own picture, then rotate
    // through the library so the front page does not repeat one image.
    const deskFile = SECTION_IMAGE[section];
    const byDesk = deskFile && IMAGE_LIBRARY.find((image) => image.file === deskFile);
    const index = parseInt(hash(seed), 36) % IMAGE_LIBRARY.length;
    best = byDesk || IMAGE_LIBRARY[index];
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

const MINOR_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/** Cleans a feed headline: drops the outlet suffix, tames SHOUTING. */
export const cleanTitle = (value) => {
  let title = stripHtml(value)
    .replace(/\s+[|·–—]\s+[^|·–—]{2,32}$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  const letters = title.replace(/[^A-Za-z]/g, '');
  const upperRatio = letters ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;
  if (title.length > 12 && upperRatio > 0.75) {
    const acronyms = new Set(title.split(/\s+/).filter((word) => /^[A-Z]{2,5}$/.test(word)));
    title = title
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (acronyms.has(word.toUpperCase()) && word.length <= 5) return word.toUpperCase();
        if (index === 0 || !MINOR_WORDS.has(word)) return word.charAt(0).toUpperCase() + word.slice(1);
        return word;
      })
      .join(' ');
  }
  if (title.length > 132) {
    const cut = title.slice(0, 128);
    title = `${cut.slice(0, cut.lastIndexOf(' ') > 90 ? cut.lastIndexOf(' ') : 128).trim()}…`;
  }
  return title.charAt(0).toUpperCase() + title.slice(1);
};

/** Turns one feed item into a complete, attributed story draft. */
export const buildDraft = (item, source, { useSourceImages = false } = {}) => {
  const title = cleanTitle(item.title);
  const summary = stripHtml(item.summary);
  if (!title || title.length < 18) return null;
  if (summary.length < 80) return null;

  const { section, confidence } = classify(`${title} ${summary}`, source.section);
  const image = pickImage(`${title} ${summary}`, item.url || title, section);
  const list = sentences(summary);
  const cleaned = list.length ? list : [summary];
  const lead = (cleaned[0] || summary).slice(0, 240);
  const standfirst = lead.length >= 30 ? lead : `${title} — the latest from ${source.name}.`.slice(0, 220);

  // The standfirst already carries sentence one, so the body continues from
  // sentence two — no repeat, and the paragraphs follow the source's order.
  const rest = cleaned.length > 1 ? cleaned.slice(1) : [];
  if (!rest.length) {
    // One-sentence source copy: continue the story after the standfirst
    // instead of repeating the standfirst as the first paragraph.
    const tail = summary.slice(lead.length).trim();
    if (tail.length > 60) {
      rest.push(tail);
    } else {
      const parts = summary.split(/(?<=,)\s+/);
      if (parts.length > 2) rest.push(parts.slice(1).join(' '));
    }
  }
  const body = [];
  const chunks = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)].filter((chunk) => chunk.length);
  for (const chunk of chunks) body.push({ type: 'p', text: chunk.join(' ') });

  // Key points only when there is copy left over that the body did not use.
  const spare = rest.slice(9, 13).map((sentence) => sentence.replace(/\s+/g, ' ').slice(0, 160));
  if (spare.length >= 3) {
    body.push({ type: 'h2', text: 'Key points' });
    body.push({ type: 'list', items: spare });
  }

  if (!body.some((block) => block.type === 'p')) {
    body.push({
      type: 'p',
      text: `This is a brief dispatch. ${source.name} has published the full report, including the context behind this headline.`,
    });
  }

  body.push({
    type: 'p',
    text: `This dispatch was assembled by the NewsPulse 24 wire agent from a report published by ${source.name}. Read the original for the full account.`,
  });

  const keywords = keywordList(`${title} ${summary}`).slice(0, 10);
  const tags = [...new Set([section.toLowerCase(), ...keywords.slice(0, 6)])].slice(0, 8);
  const sourceDate = item.publishedAt ? new Date(item.publishedAt) : null;
  const publishedAt =
    sourceDate && !Number.isNaN(sourceDate.getTime())
      ? new Date(Math.min(sourceDate.getTime(), Date.now())).toISOString()
      : new Date().toISOString();

  const host = sourceHost(item.url || source.url);
  const words = body
    .map((block) => block.text || (block.items || []).join(' ') || '')
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  const freshness = ageHours < 2 ? 15 : ageHours < 6 ? 11 : ageHours < 12 ? 7 : ageHours < 24 ? 3 : 0;

  const score = Math.round(
    Math.min(
      100,
      (summary.length >= 700 ? 30 : summary.length >= 380 ? 24 : summary.length >= 180 ? 17 : 10) +
        confidence * 25 +
        (image.matched ? 15 : 5) +
        Math.min(15, source.weight * 8) +
        (cleaned.length >= 4 ? 12 : cleaned.length >= 2 ? 8 : 3) +
        freshness +
        (item.enriched ? 4 : 0),
    ),
  );

  const sourceImage = useSourceImages && item.image && /^https:\/\//i.test(item.image) ? item.image : null;

  const seoTitle = (title.length > 60 ? `${title.slice(0, 57)}…` : title).trim();
  const seoDescription = (standfirst.length > 155 ? `${standfirst.slice(0, 152)}…` : standfirst).trim();

  return {
    id: `wire-${hash(`${canonicalUrl(item.url)}|${title}`)}`,
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

const dedupeKey = (item) => hash(canonicalUrl(item.url || item.title || '').trim().toLowerCase());

const withinQueue = (queue, key) =>
  queue.some((entry) => entry.key === key || entry.draft?.attribution?.url === key);

const isRecentEnough = (item, maxAgeHours) => {
  if (!item.publishedAt) return true;
  const time = new Date(item.publishedAt).getTime();
  if (Number.isNaN(time)) return true;
  return Date.now() - time <= maxAgeHours * 3_600_000;
};

/**
 * Turns parsed items into queue entries.
 * `items` may be pre-enriched; everything here is synchronous and pure apart
 * from the single write at the end.
 */
export const ingestItems = (items, source, config, { limit = 20 } = {}) => {
  const state = read();
  const agent = state.automation;
  const seen = new Set(agent.seen);
  const accepted = [];
  const rejected = [];

  for (const item of items.slice(0, limit)) {
    const key = dedupeKey(item);
    if (!key || seen.has(key)) continue;
    if (!isRecentEnough(item, config.maxAgeHours ?? 36)) {
      rejected.push({ item, reason: 'older than the freshness window' });
      continue;
    }
    const draft = buildDraft(item, source, { useSourceImages: config.useSourceImages });
    if (!draft) {
      rejected.push({ item, reason: 'not enough copy in the feed item' });
      continue;
    }
    if (withinQueue(agent.queue, key)) continue;
    const allowed = !config.sections?.length || config.sections.includes(draft.category);
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

  if (accepted.length) {
    write((draftState) => ({
      ...draftState,
      automation: {
        ...draftState.automation,
        queue: [...accepted, ...draftState.automation.queue].slice(0, 60),
        seen: [...seen].slice(-400),
      },
    }));
  }

  return { accepted: accepted.length, rejected: rejected.length, rejectedSample: rejected.slice(0, 3) };
};

/* -------------------------------------------------------------------- queue */

export const rejectQueueItem = (id, reason = 'rejected by the editor') =>
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      queue: draft.automation.queue.map((entry) => (entry.id === id ? { ...entry, status: 'rejected', reason } : entry)),
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
        item.id === id ? { ...item, status: 'published', publishedAt: new Date().toISOString(), slug: post.slug } : item,
      ),
      stats: { ...draft.automation.stats, published: draft.automation.stats.published + 1 },
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
        entry.id === id ? { ...entry, status: 'published', publishedAt: new Date().toISOString(), slug } : entry,
      ),
    },
  }));

/* --------------------------------------------------------------------- runs */

const withinLastHour = (queue) =>
  queue.filter(
    (entry) =>
      entry.status === 'published' && entry.publishedAt && Date.now() - new Date(entry.publishedAt).getTime() < 3_600_000,
  ).length;

const patchSource = (sourceId, patch) =>
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      sources: draft.automation.sources.map((entry) => (entry.id === sourceId ? { ...entry, ...patch } : entry)),
    },
  }));

const LOCK_KEY = 'newspulse24:automation:lock';
const LOCK_TTL = 90_000;

const acquireLock = () => {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const at = Number(window.localStorage.getItem(LOCK_KEY) || 0);
    if (at && Date.now() - at < LOCK_TTL) return false;
    window.localStorage.setItem(LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
};

const releaseLock = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(LOCK_KEY);
  } catch {
    /* storage unavailable */
  }
};

/**
 * One full cycle: fetch every enabled feed, enrich a few promising items,
 * queue the drafts, publish what the rules allow, and record a diagnosis the
 * panel can show when a run produces nothing.
 */
export const runAutomationCycle = async ({ manual = false, sourceId = null } = {}) => {
  const state = read();
  const config = state.automation;
  if (!config.enabled && !manual) return { skipped: true, reason: 'the agent is switched off' };

  const sources = config.sources
    .filter((source) => source.enabled && (!sourceId || source.id === sourceId))
    .sort((a, b) => new Date(a.lastFetchedAt || 0) - new Date(b.lastFetchedAt || 0));

  if (!sources.length) {
    agentLog('warn', 'Run skipped: no channels are switched on');
    return { skipped: true, reason: 'no channels enabled' };
  }
  if (!manual && !acquireLock()) return { skipped: true, reason: 'another tab is running a cycle' };

  write((draft) => ({
    ...draft,
    automation: { ...draft.automation, lastRunAt: new Date().toISOString() },
  }));
  agentLog('info', `Run started · ${sources.length} channel${sources.length === 1 ? '' : 's'}`);

  let ingested = 0;
  let failures = 0;
  let published = 0;
  let enriched = 0;
  const reports = [];

  const enrichBudget = config.enrich === false ? 0 : 6;

  // Four channels at a time: fast enough to feel instant, polite to publishers.
  const queueOfSources = [...sources];
  const workers = Array.from({ length: Math.min(4, queueOfSources.length) }, async () => {
    for (;;) {
      const source = queueOfSources.shift();
      if (!source) return;
      try {
        const { items, via, feedTitle } = await fetchFeedDetailed(source, config);

        // Spend the enrichment budget on recent, thin items only.
        const enrichedByUrl = new Map();
        for (const item of items.slice(0, 12)) {
          if (enriched >= enrichBudget) break;
          if (!isRecentEnough(item, config.maxAgeHours ?? 36)) continue;
          if (!item.summary || stripHtml(item.summary).length < 160) {
            enriched += 1;
            const fuller = await enrichArticle(item, config);
            enrichedByUrl.set(item.url, fuller);
          }
        }
        const merged = items.map((item) => enrichedByUrl.get(item.url) || item);
        const result = ingestItems(merged, source, config, { limit: 20 });
        const rejection = result.rejectedSample?.[0]?.reason || '';

        ingested += result.accepted;
        patchSource(source.id, {
          lastFetchedAt: new Date().toISOString(),
          lastStatus: result.accepted
            ? `${result.accepted} new${result.accepted === 1 ? ' story' : ' stories'}`
            : items.length
              ? `${items.length} read · none usable${rejection ? ` (${rejection})` : ''}`
              : 'empty feed',
          lastCount: items.length,
          lastVia: via,
          preferredVia: via,
          lastError: '',
          name: source.name || feedTitle || source.name,
        });
        reports.push({
          id: source.id,
          name: source.name,
          ok: true,
          items: items.length,
          accepted: result.accepted,
          skipped: result.rejected,
          reason: result.accepted ? '' : rejection,
          via,
        });
      } catch (error) {
        failures += 1;
        const message = String(error.message || 'fetch failed').slice(0, 160);
        patchSource(source.id, {
          lastFetchedAt: new Date().toISOString(),
          lastStatus: 'failed',
          lastError: message,
        });
        reports.push({ id: source.id, name: source.name, ok: false, error: message });
        agentLog('error', `${source.name}: ${message}`);
      }
    }
  });
  await Promise.all(workers);

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
    if (slots === 0) agentLog('warn', 'Auto-publish paused: the hourly cap is reached');
  }

  const finished = new Date().toISOString();
  write((draft) => ({
    ...draft,
    automation: {
      ...draft.automation,
      lastRunAt: finished,
      diagnostics: {
        at: finished,
        ingested,
        published,
        failures,
        channels: reports.slice(0, 20),
      },
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
    `Run finished · ${ingested} new · ${published} published${failures ? ` · ${failures} channel${failures === 1 ? '' : 's'} failed` : ''}`,
  );
  if (!manual) releaseLock();

  return { ingested, published, failures, channels: reports.length };
};

/** Reads a site's HTML and finds the feeds it advertises. */
export const discoverFeeds = async (siteUrl, config = readAutomation()) => {
  const base = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`;
  let html = '';
  let used = '';

  for (const template of proxyChain(config)) {
    try {
      html = await requestText(materialise(template, base), 10_000);
      used = template === '{url}' ? 'direct' : 'proxy';
      if (/<html/i.test(html)) break;
    } catch {
      /* next hop */
    }
  }
  if (!html || !/<html/i.test(html)) throw new Error('could not read that site');

  const found = new Map();
  const add = (url, title = '') => {
    try {
      const absolute = new URL(url, base).toString();
      if (!/^https?:/i.test(absolute) || found.has(absolute)) return;
      found.set(absolute, stripHtml(title) || sourceHost(absolute));
    } catch {
      /* malformed */
    }
  };

  for (const match of html.matchAll(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi)) {
    const href = match[0].match(/href=["']([^"']+)["']/i)?.[1];
    const title = match[0].match(/title=["']([^"']+)["']/i)?.[1] || '';
    if (href) add(href, title);
  }
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi)) {
    add(match[1]);
  }
  for (const guess of ['/feed', '/rss', '/rss.xml', '/feed.xml', '/atom.xml', '/index.xml']) {
    add(guess);
  }

  const results = [];
  for (const [url, title] of [...found.entries()].slice(0, 8)) {
    try {
      const { items, feedTitle } = await fetchFeedDetailed({ id: 'probe', name: title, url, section: '' }, config);
      if (!items.length) continue;
      results.push({
        id: `src-${hash(url).slice(0, 8)}`,
        name: stripHtml(feedTitle) || title,
        url,
        section: '',
        weight: 1,
        enabled: true,
        lastStatus: `verified · ${items.length} items`,
        lastCount: items.length,
        samples: items.slice(0, 2).map((item) => item.title),
      });
    } catch {
      /* not a usable feed */
    }
    if (results.length >= 4) break;
  }

  if (!results.length) throw new Error(`no working feed found on that site (${used || 'no route'})`);
  return results;
};

export const addChannel = (channel, existing = []) => {
  if (existing.some((source) => source.url === channel.url)) return existing;
  return [...existing, sourceFromChannel(channel, { lastStatus: 'queued for its first run' })].slice(0, 30);
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
      !config.lastRunAt || Date.now() - new Date(config.lastRunAt).getTime() >= config.intervalMinutes * 60_000;
    if (!due) return;
    busy = true;
    try {
      await runAutomationCycle();
    } catch (error) {
      agentLog('error', `Cycle crashed: ${error.message}`);
      releaseLock();
    } finally {
      busy = false;
    }
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') tick();
  };

  const first = window.setTimeout(tick, 3_000);
  const timer = window.setInterval(tick, 20_000);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onVisible);

  return () => {
    disposed = true;
    window.clearTimeout(first);
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onVisible);
  };
};

export const nextRunAt = () => {
  const config = read().automation;
  if (!config.enabled) return null;
  if (!config.lastRunAt) return new Date();
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
