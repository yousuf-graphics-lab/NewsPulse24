/**
 * Static prerendering: turns the built SPA shell into real HTML documents so
 * search engines, social crawlers and news aggregators get fully-formed
 * <head> metadata and article text without executing JavaScript.
 *
 * dist/index.html               → homepage
 * dist/article/<slug>/index.html → one document per story
 * dist/latest|live|about/index.html
 * dist/404.html
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const SSR_ENTRY = path.resolve('dist-ssr/ssr-entry.js');

if (!fs.existsSync(SSR_ENTRY)) {
  console.error('SSR bundle missing — run `vite build --ssr scripts/ssr-entry.jsx --outDir dist-ssr` first.');
  process.exit(1);
}

const { render } = await import(SSR_ENTRY);
const { STORIES } = await import('../src/data/news.js');

const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

/** Replace the static head tags emitted by index.html with the route's own. */
function applyHead(html, head) {
  let out = html;

  // drop the hand-written defaults that the route overrides
  out = out.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
  out = out.replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  out = out.replace(/<meta\s+name="keywords"[^>]*>\s*/i, '');
  out = out.replace(/<link\s+rel="canonical"[^>]*>\s*/i, '');
  out = out.replace(/<meta\s+name="robots"[^>]*>\s*/i, '');
  out = out.replace(/<meta\s+name="googlebot"[^>]*>\s*/i, '');
  out = out.replace(/<meta\s+name="author"[^>]*>\s*/i, '');
  out = out.replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '');
  out = out.replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');
  out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/i, '');
  out = out.replace(/<link\s+rel="alternate"[^>]*>\s*/gi, '');
  out = out.replace(/<link\s+rel="sitemap"[^>]*>\s*/gi, '');

  const injected = [head.title, head.priority, head.meta, head.link, head.script]
    .filter(Boolean)
    .join('\n    ');
  return out.replace('</head>', `    ${injected}\n  </head>`);
}

const routes = [
  { url: '/', out: 'index.html' },
  { url: '/latest', out: 'latest/index.html' },
  { url: '/live', out: 'live/index.html' },
  { url: '/about', out: 'about/index.html' },
  ...STORIES.map((s) => ({ url: `/article/${s.slug}`, out: `article/${s.slug}/index.html` })),
  { url: '/404', out: '404.html', noindex: true },
];

let count = 0;
for (const route of routes) {
  try {
    const { html, head } = render(route.url);
    const doc = applyHead(shell, head).replace(
      '<div id="root"></div>',
      `<div id="root">${html}</div>`,
    );
    const target = path.join(DIST, route.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, doc);
    count += 1;
  } catch (error) {
    console.error(`prerender failed for ${route.url}:`, error.message);
  }
}

console.log(`prerendered ${count}/${routes.length} routes with per-route head metadata`);
