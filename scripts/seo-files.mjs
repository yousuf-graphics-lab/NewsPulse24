/**
 * Emits dist/sitemap.xml (with Google News extensions) and dist/feed.xml.
 * Runs after the production build, so routes stay in sync with the dataset.
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = process.env.VITE_SITE_URL?.replace(/\/$/, '') || 'https://newspulse24.com';
const DIST = path.resolve('dist');

const { STORIES, CATEGORIES } = await import('../src/data/news.js');
const SITE_NAME = 'NewsPulse 24';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const iso = (d) => new Date(d).toISOString();

const published = [...STORIES].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const newest = published[0];
const buildTime = new Date().toISOString();

/* ---------------- sitemap.xml ---------------- */
const staticRoutes = [
  { loc: '/', priority: '1.0', changefreq: 'hourly', lastmod: newest.publishedAt },
  { loc: '/latest', priority: '0.9', changefreq: 'hourly', lastmod: newest.publishedAt },
  { loc: '/live', priority: '0.8', changefreq: 'daily', lastmod: buildTime },
  { loc: '/about', priority: '0.4', changefreq: 'monthly', lastmod: buildTime },
];

const categoryRoutes = CATEGORIES.map((c) => ({
  loc: `/?category=${encodeURIComponent(c)}`,
  priority: '0.7',
  changefreq: 'daily',
  lastmod:
    published.find((s) => s.category === c)?.publishedAt || newest.publishedAt,
}));

const articleUrls = published.map((story) => `
  <url>
    <loc>${ORIGIN}/article/${story.slug}</loc>
    <lastmod>${iso(story.publishedAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${iso(story.publishedAt)}</news:publication_date>
      <news:title>${esc(story.title)}</news:title>
      <news:keywords>${esc(story.tags.join(', '))}</news:keywords>
    </news:news>
    <image:image>
      <image:loc>${ORIGIN}${story.image}</image:loc>
      <image:title>${esc(story.title)}</image:title>
    </image:image>
  </url>`).join('');

const simpleUrls = [...staticRoutes, ...categoryRoutes]
  .map(
    (r) => `
  <url>
    <loc>${ORIGIN}${r.loc}</loc>
    <lastmod>${iso(r.lastmod)}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${simpleUrls}${articleUrls}
</urlset>
`;

/* ---------------- feed.xml ---------------- */
const feedItems = published.slice(0, 20).map((story) => `
    <item>
      <title>${esc(story.title)}</title>
      <link>${ORIGIN}/article/${story.slug}</link>
      <guid isPermaLink="true">${ORIGIN}/article/${story.slug}</guid>
      <pubDate>${new Date(story.publishedAt).toUTCString()}</pubDate>
      <category>${esc(story.category)}</category>
      <dc:creator>${esc(story.author.name)}</dc:creator>
      <description>${esc(story.excerpt)}</description>
      <content:encoded><![CDATA[<img src="${ORIGIN}${story.image}" alt="${esc(story.imageAlt)}" width="1200" height="675" /><p>${esc(story.excerpt)}</p>]]></content:encoded>
      <media:content url="${ORIGIN}${story.image}" medium="image" />
    </item>`).join('');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:media="http://search.yahoo.com/mrss/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)} — Real News. Global Impact.</title>
    <link>${ORIGIN}/</link>
    <description>Breaking world news, business, technology, science, health and sport from six bureaux across four continents.</description>
    <language>en-gb</language>
    <copyright>© ${new Date().getFullYear()} ${esc(SITE_NAME)} Media Group</copyright>
    <lastBuildDate>${new Date(buildTime).toUTCString()}</lastBuildDate>
    <atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${ORIGIN}/logo-512.png</url>
      <title>${esc(SITE_NAME)}</title>
      <link>${ORIGIN}/</link>
    </image>${feedItems}
  </channel>
</rss>
`;

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `vite build` first.');
  process.exit(1);
}
const robots = `# ${SITE_NAME} — ${ORIGIN}
User-agent: *
Allow: /
Disallow: /search
Disallow: /*?q=

# News aggregators and search crawlers
User-agent: Googlebot-News
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

# RSS readers / feed fetchers
User-agent: Feedly
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`;

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(DIST, 'feed.xml'), feed);
fs.writeFileSync(path.join(DIST, 'robots.txt'), robots);
console.log(
  `sitemap.xml (${1 + categoryRoutes.length + published.length} urls) and feed.xml (${published.slice(0, 20).length} items) written to dist/`,
);
