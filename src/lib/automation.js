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
import { rewriteQueueItem } from './aiWriter';
import { FEED_CATALOG, PUBLIC_PROXIES, sourceFromChannel } from './feedCatalog';
import { extractArticle, hasFullReport } from './articleExtract';
import { publish, slugTaken } from './contentStore';

/* ------------------------------------------------------------------ presets */

export const AUTOMATION_PRESETS = FEED_CATALOG;
export { FEED_CATALOG, PUBLIC_PROXIES };

const IMAGE_LIBRARY = [
  { file: 'hero-earth.jpg', alt: 'Planet Earth at night wrapped in glowing data networks', tags: ['world', 'global', 'climate', 'united nations', 'diplomacy', 'summit', 'earth', 'planet', 'international'] },
  { file: 'capitol.jpg', alt: 'The dome of a national legislature lit at dusk', tags: ['politics', 'election', 'parliament', 'congress', 'senate', 'government', 'policy', 'law', 'minister', 'president', 'vote', 'budget'] },
  { file: 'press-conference.jpg', alt: 'Microphones on a lectern at a press conference', tags: ['spokesperson', 'briefing', 'press', 'statement', 'announced', 'official', 'ministry', 'talks'] },
  { file: 'markets.jpg', alt: 'Traders and screens on a busy trading floor', tags: ['markets', 'stocks', 'economy', 'inflation', 'rates', 'bank', 'trade', 'tariff', 'oil', 'currency', 'investors', 'shares', 'earnings', 'gdp'] },
  { file: 'city-night.jpg', alt: 'Commuters crossing a rain-soaked city intersection at night', tags: ['city', 'transport', 'commuters', 'traffic', 'urban', 'housing', 'infrastructure', 'strike', 'weather'] },
  { file: 'energy-grid.jpg', alt: 'Wind turbines and power lines against a dusk sky', tags: ['energy', 'power', 'electricity', 'renewable', 'wind', 'grid', 'oil', 'gas', 'emissions', 'carbon', 'climate'] },
  { file: 'ai-robot.jpg', alt: 'A humanoid robot beside a person in a laboratory', tags: ['ai', 'artificial intelligence', 'robot', 'machine learning', 'chip', 'software', 'semiconductor', 'model', 'openai', 'chatbot', 'algorithm'] },
  { file: 'robot-hand.jpg', alt: 'A robotic hand reaching towards a human hand', tags: ['automation', 'research', 'engineering', 'lab', 'scientists', 'robotics', 'innovation'] },
  { file: 'mobile-tech.jpg', alt: 'A smartphone glowing in a dark room with servers behind', tags: ['phone', 'mobile', 'app', 'platform', 'social media', 'data', 'privacy', 'cyber', 'hack', 'online', 'internet', 'digital'] },
  { file: 'rocket.jpg', alt: 'A rocket lifting off through a cloud of exhaust', tags: ['space', 'rocket', 'launch', 'satellite', 'mars', 'moon', 'astronomy', 'nasa', 'spacex', 'orbit', 'mission'] },
  { file: 'lab-research.jpg', alt: 'Scientists examining a sample in a darkened laboratory', tags: ['study', 'research', 'scientists', 'trial', 'laboratory', 'discovery', 'experiment', 'peer-reviewed'] },
  { file: 'medical.jpg', alt: 'A clinician reviewing a scan in a research hospital', tags: ['health', 'hospital', 'vaccine', 'virus', 'disease', 'medicine', 'cancer', 'drug', 'who', 'patients', 'mental', 'outbreak'] },
  { file: 'hospital-ward.jpg', alt: 'Staff walking through a hospital corridor at night', tags: ['hospital', 'nurses', 'doctors', 'ward', 'emergency', 'ambulance', 'patients', 'surgery', 'nhs'] },
  { file: 'flood-street.jpg', alt: 'Residents wading through a flooded coastal street', tags: ['flood', 'storm', 'hurricane', 'typhoon', 'disaster', 'rescue', 'coastal', 'climate', 'evacuation', 'rain'] },
  { file: 'football.jpg', alt: 'A footballer striking the ball under stadium lights', tags: ['football', 'soccer', 'league', 'cup', 'match', 'striker', 'coach', 'premier', 'fifa', 'transfer'] },
  { file: 'stadium-night.jpg', alt: 'A packed stadium under floodlights at night', tags: ['sport', 'stadium', 'olympic', 'tennis', 'cricket', 'crowd', 'final', 'championship', 'athletics', 'nba'] },
  { file: 'live-studio.jpg', alt: 'A television studio lit for broadcast', tags: ['media', 'broadcast', 'television', 'streaming', 'film', 'series', 'music', 'album', 'actor', 'interview'] },
  { file: 'cinema-night.jpg', alt: 'A cinema marquee glowing on a wet street at night', tags: ['cinema', 'movie', 'film', 'premiere', 'box office', 'awards', 'festival', 'hollywood', 'director'] },
  { file: 'summit.jpg', alt: 'Delegates gathered in a summit hall', tags: ['summit', 'conference', 'talks', 'treaty', 'agreement', 'cop', 'delegates', 'g20', 'g7', 'nato', 'negotiations'] },
];

const SECTION_KEYWORDS = {
  World: ['world', 'global', 'nation', 'war', 'conflict', 'ceasefire', 'border', 'refugees', 'refugee', 'united nations', 'summit', 'diplomat', 'election', 'sanction', 'government', 'military', 'peace', 'coastal', 'authorities', 'flood', 'disaster', 'storm', 'evacuation', 'residents', 'council', 'aid'],
  Business: ['market', 'economy', 'inflation', 'rate', 'stock', 'bank', 'trade', 'tariff', 'company', 'earnings', 'oil', 'currency', 'gdp', 'investor', 'merger', 'jobs', 'retail'],
  Technology: ['ai', 'artificial intelligence', 'technology', 'software', 'chip', 'semiconductor', 'robot', 'app', 'platform', 'cyber', 'data', 'startup', 'device', 'model', 'cloud'],
  Science: ['science', 'space', 'nasa', 'rocket', 'satellite', 'research', 'study', 'climate', 'physics', 'mars', 'moon', 'discovery', 'species', 'scientists', 'orbit'],
  Health: ['health', 'hospital', 'disease', 'virus', 'vaccine', 'medicine', 'cancer', 'clinicians', 'drug', 'mental', 'outbreak', 'patients', 'clinical'],
  Sports: ['football', 'soccer', 'sport', 'league', 'cup', 'match', 'olympic', 'tennis', 'cricket', 'formula', 'nba', 'fifa', 'coach', 'player', 'striker'],
  Entertainment: ['film', 'movie', 'music', 'album', 'television', 'series', 'actor', 'festival', 'award', 'studio', 'hollywood', 'streaming', 'box office'],
  Lifestyle: ['travel', 'food', 'design', 'home', 'fashion', 'wellness', 'culture', 'recipe', 'hotel', 'cooking', 'gardening', 'parenting'],
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

const materialise = (template, url) => {
  // `{url}` on its own means "direct": the feed URL goes out unencoded.
  if (template === '{url}') return url;
  return template.includes('{url}') ? template.replace('{url}', encodeURIComponent(url)) : template;
};

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

/**
 * Pulls one article page and extracts the report itself.
 *
 * This is what separates a headline feed from a newspaper: the publisher's
 * paragraphs, subheadings and quotes become the story body, with the blurb
 * kept as a fallback when the page is paywalled or script-rendered.
 */
export const enrichArticle = async (item, config = readAutomation(), source = null) => {
  if (!/^https?:\/\//i.test(item.url || '')) return item;
  const preferred = source?.preferredVia || '';
  for (const template of proxyChain(config, preferred)) {
    try {
      const html = await requestText(materialise(template, item.url), 11_000);
      if (!/<html|<article|<p/i.test(html)) continue;

      const article = extractArticle(html);
      if (!article.blocks.length) continue;

      return {
        ...item,
        article,
        summary: article.description || item.summary || '',
        image: item.image || article.image,
        enriched: true,
        fullReport: hasFullReport(article),
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

/**
 * Every image in the library, grouped by the desks it suits. The agent picks
 * from the candidate pool rather than one fixed picture per desk, and it
 * prefers whichever candidate is used least across the live site — so a run of
 * World stories never ends up with the same photograph four times.
 */
const SECTION_IMAGE = {
  World: ['hero-earth.jpg', 'summit.jpg', 'press-conference.jpg', 'city-night.jpg'],
  Business: ['markets.jpg', 'press-conference.jpg', 'city-night.jpg', 'energy-grid.jpg'],
  Technology: ['ai-robot.jpg', 'mobile-tech.jpg', 'robot-hand.jpg', 'live-studio.jpg'],
  Science: ['rocket.jpg', 'lab-research.jpg', 'robot-hand.jpg', 'hero-earth.jpg'],
  Health: ['medical.jpg', 'hospital-ward.jpg', 'lab-research.jpg'],
  Sports: ['football.jpg', 'stadium-night.jpg'],
  Entertainment: ['cinema-night.jpg', 'live-studio.jpg', 'city-night.jpg'],
  Lifestyle: ['city-night.jpg', 'live-studio.jpg', 'energy-grid.jpg', 'summit.jpg'],
  Opinion: ['capitol.jpg', 'press-conference.jpg', 'summit.jpg'],
};

/** How many times each library image already appears on the site. */
export const imageUsage = () => {
  const usage = new Map();
  let state;
  try {
    state = read();
  } catch {
    return usage;
  }
  const count = (path) => {
    if (!path || !path.startsWith('/images/')) return;
    usage.set(path, (usage.get(path) || 0) + 1);
  };
  for (const post of state.posts || []) count(post.image);
  for (const entry of state.automation?.queue || []) count(entry.draft?.image);
  return usage;
};

const pickImage = (text, seed = '', section = '', usage = new Map()) => {
  const has = wordMatcher(text);
  const candidateFiles = new Set(SECTION_IMAGE[section] || []);
  const scored = IMAGE_LIBRARY.map((image) => {
    const matches = image.tags.reduce((total, keyword) => total + (has(keyword) ? 1 : 0), 0);
    const path = `/images/${image.file}`;
    const used = usage.get(path) || 0;
    const deskBonus = candidateFiles.has(image.file) ? 2 : 0;
    // Keyword match wins, then desk affinity, then whichever is least used.
    return { image, score: matches * 10 + deskBonus - used * 3 };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const matched = best.score >= 10;
  if (matched) {
    return { path: `/images/${best.image.file}`, alt: best.image.alt, matched: true };
  }

  // No keyword hit: rotate through the desk pool first, least-used first, then
  // widen to the whole library if every desk image is already in play.
  const pool = (SECTION_IMAGE[section] || []).map((file) => IMAGE_LIBRARY.find((image) => image.file === file)).filter(Boolean);
  const ordered = (pool.length ? pool : IMAGE_LIBRARY)
    .map((image) => ({ image, used: usage.get(`/images/${image.file}`) || 0 }))
    .sort((a, b) => a.used - b.used || parseInt(hash(`${seed}${a.image.file}`), 36) - parseInt(hash(`${seed}${b.image.file}`), 36));

  const chosen = ordered[0]?.image || best.image;
  return { path: `/images/${chosen.file}`, alt: chosen.alt, matched: false };
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
const MAX_REPORT_WORDS = 720;
const MAX_REPORT_BLOCKS = 18;

const countWords = (text) => String(text || '').split(/\s+/).filter(Boolean).length;

/** Trims an extracted report to a readable length, keeping its own structure. */
const reportBlocks = (article, leadText = '') => {
  const out = [];
  let words = 0;

  for (const block of article.blocks) {
    if (out.length >= MAX_REPORT_BLOCKS || words >= MAX_REPORT_WORDS) break;
    if (block.type === 'p' && leadText && block.text.startsWith(leadText.slice(0, 60))) continue;
    if (block.type === 'list' && (block.items || []).length < 3) continue;
    if (block.type === 'h2' && out.length === 0) continue;

    const size = countWords(block.text || (block.items || []).join(' '));
    if (words + size > MAX_REPORT_WORDS + 120) continue;
    out.push(block);
    words += size;
  }
  return out;
};

/** Standfirst for an extracted report: the article's own opening sentences. */
const standfirstFrom = (article) => {
  const first = article.paragraphs[0] || '';
  const parts = first.split(/(?<=[.!?])\s+/);
  let out = parts[0] || first;
  if (out.length < 110 && parts[1]) out = `${parts[0]} ${parts[1]}`;
  return out.length > 240 ? `${out.slice(0, 237).trim()}…` : out.trim();
};

/**
 * Turns one feed item into a complete, attributed story draft.
 *
 * With an extracted article the body is the publisher's own report, cut to a
 * readable length and kept in its original order — paragraphs, subheads and
 * quotes. Without one, the body is composed from the feed copy. Neither path
 * adds boilerplate paragraphs, which is what made earlier drafts read like a
 * template.
 */
export const buildDraft = (item, source, { useSourceImages = false, imageUsage } = {}) => {
  const title = cleanTitle(item.title);
  const summary = stripHtml(item.summary);
  const article = item.article;
  // Any page with a couple of real paragraphs is publishable; a "full report"
  // is the label for one long enough to stand alone.
  const articleReady = Boolean(article && article.wordCount >= 40 && article.paragraphs.length >= 2);
  const fullReport = hasFullReport(article);
  if (!title || title.length < 18) return null;
  if (!articleReady && summary.length < 80) return null;

  const sourceText = articleReady ? `${title} ${article.paragraphs.slice(0, 3).join(' ')}` : `${title} ${summary}`;
  const { section, confidence } = classify(sourceText, source.section);
  const image = pickImage(sourceText, item.url || title, section, imageUsage);

  let standfirst;
  let body;

  if (articleReady) {
    standfirst = standfirstFrom(article);
    body = reportBlocks(article, article.paragraphs[0]);
    // A short report still reads better with its own closing section than
    // with an invented one; if it is very short, add the publisher's blurb.
    if (body.filter((block) => block.type === 'p').length < 2 && summary.length > 80) {
      body.push({ type: 'p', text: summary });
    }
  } else {
    const list = sentences(summary);
    const cleaned = list.length ? list : [summary];
    const lead = (cleaned[0] || summary).slice(0, 240);
    standfirst = lead.length >= 30 ? lead : `${title} — the latest from ${source.name}.`.slice(0, 220);
    const rest = cleaned.length > 1 ? cleaned.slice(1) : [];
    body = [];
    for (const chunk of [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 9)]) {
      if (chunk.length) body.push({ type: 'p', text: chunk.join(' ') });
    }
    if (!body.length) {
      const tail = summary.slice(lead.length).trim();
      if (tail.length > 60) body.push({ type: 'p', text: tail });
    }
    // A brief from a page we could not read still gets its opening sentences.
    if (!body.length && article?.paragraphs?.length) {
      body = article.paragraphs.slice(0, 3).map((text) => ({ type: 'p', text }));
    }
  }

  // Never publish an empty story.
  const paragraphCount = body.filter((block) => block.type === 'p').length;
  if (!paragraphCount) return null;

  const keywords = keywordList(`${title} ${summary} ${article?.paragraphs?.slice(0, 2).join(' ') || ''}`).slice(0, 10);
  const tags = [...new Set([section.toLowerCase(), ...keywords.slice(0, 6)])].slice(0, 8);
  const sourceDate = item.publishedAt ? new Date(item.publishedAt) : null;
  const publishedAt =
    sourceDate && !Number.isNaN(sourceDate.getTime())
      ? new Date(Math.min(sourceDate.getTime(), Date.now())).toISOString()
      : new Date().toISOString();

  const host = sourceHost(item.url || source.url);
  const words = body.map((block) => block.text || (block.items || []).join(' ') || '').reduce((total, text) => total + countWords(text), 0);

  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  const freshness = ageHours < 2 ? 15 : ageHours < 6 ? 11 : ageHours < 12 ? 7 : ageHours < 24 ? 3 : 0;

  const score = Math.round(
    Math.min(
      100,
      (fullReport ? 30 : articleReady ? 24 : summary.length >= 380 ? 20 : 14) +
        confidence * 22 +
        (image.matched ? 14 : 5) +
        Math.min(15, source.weight * 8) +
        (words >= 300 ? 14 : words >= 150 ? 9 : 4) +
        freshness +
        (item.enriched ? 3 : 0),
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
    report: fullReport ? 'full' : 'brief',
    wordCount: words,
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
  const usage = imageUsage();
  const accepted = [];
  const rejected = [];

  for (const item of items.slice(0, limit)) {
    const key = dedupeKey(item);
    if (!key || seen.has(key)) continue;
    if (!isRecentEnough(item, config.maxAgeHours ?? 36)) {
      rejected.push({ item, reason: 'older than the freshness window' });
      continue;
    }
    const draft = buildDraft(item, source, { useSourceImages: config.useSourceImages, imageUsage: usage });
    if (draft) usage.set(draft.image, (usage.get(draft.image) || 0) + 1);
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

  // Extraction is the difference between a headline and a report, so it runs
  // on every recent item the run can afford — not just the thin ones.
  const enrichBudget = config.enrich === false ? 0 : 14;

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
        for (const item of items.slice(0, 14)) {
          if (enriched >= enrichBudget) break;
          if (!isRecentEnough(item, config.maxAgeHours ?? 36)) continue;
          if (!item.summary || stripHtml(item.summary).length < 160 || config.enrich !== false) {
            enriched += 1;
            const fuller = await enrichArticle(item, config, source);
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
  let rewritten = 0;

  // Optional: hand the strongest new drafts to the newsroom model so they read
  // like written copy rather than a stitched extract. No key, no problem — the
  // extracted report is already publishable.
  if (nextConfig.ai?.enabled && ingested > 0) {
    const candidates = nextConfig.queue
      .filter((entry) => entry.status === 'pending' && entry.draft.report === 'full')
      .sort((a, b) => b.score - a.score)
      .slice(0, nextConfig.ai.maxPerRun || 2);
    for (const entry of candidates) {
      const result = await rewriteQueueItem(entry.id, { endpoint: nextConfig.ai.endpoint });
      if (result.ok) rewritten += 1;
    }
    nextConfig = read().automation;
    agentLog(
      rewritten ? 'success' : 'warn',
      rewritten
        ? `Rewrote ${rewritten} draft${rewritten === 1 ? '' : 's'} with the newsroom model`
        : 'Rewrite pass found no configured model — published the extracts as they are',
    );
  }

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
        rewritten,
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

  return { ingested, published, rewritten, failures, channels: reports.length };
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
