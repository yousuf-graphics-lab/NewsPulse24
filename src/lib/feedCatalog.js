/**
 * The channel catalogue.
 *
 * These are public RSS / Atom / JSON feeds the wire agent knows about out of
 * the box: one entry per desk per outlet. Nothing here is scraped, paywalled or
 * private — each URL is the feed the publisher itself advertises.
 *
 * `weight` nudges the 0–100 story score (a flagship desk counts for more than a
 * niche one) and `section` is the desk the item is filed under before the
 * keyword classifier gets a second opinion.
 */

export const FEED_CATALOG = [
  // World -------------------------------------------------------------------
  { id: 'ch-bbc-world', name: 'BBC News · World', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', section: 'World', weight: 1.4 },
  { id: 'ch-guardian-world', name: 'The Guardian · World', publisher: 'The Guardian', url: 'https://www.theguardian.com/world/rss', section: 'World', weight: 1.3 },
  { id: 'ch-aljazeera', name: 'Al Jazeera · All', publisher: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', section: 'World', weight: 1.2 },
  { id: 'ch-npr-world', name: 'NPR · World', publisher: 'NPR', url: 'https://feeds.npr.org/1004/rss.xml', section: 'World', weight: 1.1 },
  { id: 'ch-dw-top', name: 'DW · Top stories', publisher: 'Deutsche Welle', url: 'https://rss.dw.com/rdf/rss-en-top', section: 'World', weight: 1 },

  // Business ----------------------------------------------------------------
  { id: 'ch-bbc-business', name: 'BBC News · Business', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', section: 'Business', weight: 1.3 },
  { id: 'ch-guardian-business', name: 'The Guardian · Business', publisher: 'The Guardian', url: 'https://www.theguardian.com/uk/business/rss', section: 'Business', weight: 1.1 },
  { id: 'ch-cnbc-top', name: 'CNBC · Top news', publisher: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', section: 'Business', weight: 1 },
  { id: 'ch-marketwatch', name: 'MarketWatch · Top stories', publisher: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', section: 'Business', weight: 1 },

  // Technology --------------------------------------------------------------
  { id: 'ch-bbc-tech', name: 'BBC News · Technology', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', section: 'Technology', weight: 1.3 },
  { id: 'ch-verge', name: 'The Verge', publisher: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', section: 'Technology', weight: 1.1 },
  { id: 'ch-arstechnica', name: 'Ars Technica', publisher: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', section: 'Technology', weight: 1 },
  { id: 'ch-techcrunch', name: 'TechCrunch', publisher: 'TechCrunch', url: 'https://techcrunch.com/feed/', section: 'Technology', weight: 1 },
  { id: 'ch-hackernews', name: 'Hacker News · Front page', publisher: 'Hacker News', url: 'https://hnrss.org/frontpage', section: 'Technology', weight: 0.8 },

  // Science -----------------------------------------------------------------
  { id: 'ch-guardian-science', name: 'The Guardian · Science', publisher: 'The Guardian', url: 'https://www.theguardian.com/science/rss', section: 'Science', weight: 1.1 },
  { id: 'ch-nasa', name: 'NASA · Breaking news', publisher: 'NASA', url: 'https://www.nasa.gov/feed/', section: 'Science', weight: 1 },
  { id: 'ch-sciencedaily', name: 'ScienceDaily · Top science', publisher: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/top/science.xml', section: 'Science', weight: 1 },
  { id: 'ch-spacecom', name: 'Space.com', publisher: 'Space.com', url: 'https://www.space.com/feeds/all', section: 'Science', weight: 1 },

  // Health ------------------------------------------------------------------
  { id: 'ch-bbc-health', name: 'BBC News · Health', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', section: 'Health', weight: 1.2 },
  { id: 'ch-guardian-health', name: 'The Guardian · Health', publisher: 'The Guardian', url: 'https://www.theguardian.com/society/health/rss', section: 'Health', weight: 1 },
  { id: 'ch-statnews', name: 'STAT News', publisher: 'STAT', url: 'https://www.statnews.com/feed/', section: 'Health', weight: 1 },

  // Sports ------------------------------------------------------------------
  { id: 'ch-bbc-sport', name: 'BBC Sport · Top', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/sport/rss.xml', section: 'Sports', weight: 1.3 },
  { id: 'ch-espn', name: 'ESPN · Top news', publisher: 'ESPN', url: 'https://www.espn.com/espn/rss/news', section: 'Sports', weight: 1.1 },
  { id: 'ch-guardian-sport', name: 'The Guardian · Sport', publisher: 'The Guardian', url: 'https://www.theguardian.com/uk/sport/rss', section: 'Sports', weight: 1 },

  // Entertainment -----------------------------------------------------------
  { id: 'ch-bbc-entertainment', name: 'BBC News · Entertainment', publisher: 'BBC', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', section: 'Entertainment', weight: 1.2 },
  { id: 'ch-variety', name: 'Variety', publisher: 'Variety', url: 'https://variety.com/feed/', section: 'Entertainment', weight: 1 },
  { id: 'ch-guardian-culture', name: 'The Guardian · Culture', publisher: 'The Guardian', url: 'https://www.theguardian.com/culture/rss', section: 'Entertainment', weight: 1 },

  // Lifestyle ---------------------------------------------------------------
  { id: 'ch-guardian-life', name: 'The Guardian · Life & style', publisher: 'The Guardian', url: 'https://www.theguardian.com/lifeandstyle/rss', section: 'Lifestyle', weight: 1 },
  { id: 'ch-guardian-travel', name: 'The Guardian · Travel', publisher: 'The Guardian', url: 'https://www.theguardian.com/uk/travel/rss', section: 'Lifestyle', weight: 1 },

  // Opinion -----------------------------------------------------------------
  { id: 'ch-guardian-opinion', name: 'The Guardian · Opinion', publisher: 'The Guardian', url: 'https://www.theguardian.com/commentisfree/rss', section: 'Opinion', weight: 1 },
  { id: 'ch-aljazeera-opinion', name: 'Al Jazeera · Opinion', publisher: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', section: 'Opinion', weight: 0.9 },
];

/** Feeds the agent switches on for a new install — two desks from each outlet. */
export const DEFAULT_CHANNEL_IDS = [
  'ch-bbc-world',
  'ch-guardian-world',
  'ch-bbc-business',
  'ch-bbc-tech',
  'ch-verge',
  'ch-guardian-science',
  'ch-bbc-health',
  'ch-bbc-sport',
  'ch-bbc-entertainment',
  'ch-guardian-life',
];

/** A ready-to-store source record for a catalogue entry. */
export const sourceFromChannel = (channel, overrides = {}) => ({
  id: channel.id,
  name: channel.name,
  url: channel.url,
  section: channel.section,
  weight: channel.weight,
  enabled: true,
  lastFetchedAt: null,
  lastStatus: 'queued for its first run',
  lastCount: 0,
  ...overrides,
});

export const defaultSources = () =>
  DEFAULT_CHANNEL_IDS.map((id) => FEED_CATALOG.find((channel) => channel.id === id))
    .filter(Boolean)
    .map((channel) => sourceFromChannel(channel));

/** Public relays used only if the deployed `/api/wire` proxy is unavailable. */
export const PUBLIC_PROXIES = [
  'https://api.allorigins.win/raw?url={url}',
  'https://api.codetabs.com/v1/proxy?quest={url}',
  'https://corsproxy.io/?url={url}',
];
