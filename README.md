# NewsPulse 24

**REAL NEWS. GLOBAL IMPACT.**

A production-quality front-end for the NewsPulse 24 international news platform — a cinematic
dark newsroom interface built to match the supplied design references (black / charcoal surfaces,
vivid red accents, information-dense editorial grid, rotating globe brand mark).

![homepage](public/images/hero-earth.jpg)

## SEO & discoverability

The build ships crawlable HTML, not an empty SPA shell.

- **Static prerendering** — `npm run build` renders every route with React SSR
  (`scripts/ssr-entry.jsx`) and writes real documents: `dist/index.html`,
  `dist/article/<slug>/index.html` (one per story), `latest/`, `live/`, `about/`
  and `404.html`. Article prose, headlines and bylines are in the HTML before any
  JavaScript runs.
- **Per-route `<head>`** via `react-helmet-async` (`src/components/Seo.jsx`): unique
  title, meta description, keywords, canonical URL, robots directives
  (`max-image-preview:large`), Open Graph, Twitter/X card, `article:*` metadata and
  an LCP image preload.
- **Structured data** — a single `@graph` with `NewsMediaOrganization`, `WebSite`
  (+ `SearchAction`), `NewsArticle` (headline, images, dates, author, publisher,
  word count, section, keywords), `BreadcrumbList`, plus `ItemList`,
  `CollectionPage`, `BroadcastService` and `AboutPage` where relevant — the shapes
  Google uses for Top Stories, article rich results and breadcrumbs.
- **Social cards** — `scripts/generate-assets.mjs` generates a branded 1200×630
  `og-image.jpg` **and one card per story** (`public/og/<slug>.jpg`) with the
  category kicker, headline, byline and article artwork.
- **Discovery files** — `sitemap.xml` with Google News + image extensions (generated
  from the dataset), `feed.xml` (RSS 2.0 for aggregators), `robots.txt`, and a PWA
  `site.webmanifest` with the organization logo.
- **Hosting** — `vercel.json` (clean URLs, prerender rewrites, cache headers) and
  `public/_redirects` for Netlify, so deep links resolve to the prerendered pages.

Set your production origin once and every canonical, share URL and sitemap entry
follows:

```bash
VITE_SITE_URL=https://your-domain.com npm run build
```

## Stack

- **React 18 + Vite 5**
- **Tailwind CSS 3** with a custom design-token theme (`tailwind.config.js`)
- **Lucide React** icon set
- **Framer Motion** for the hero crossfade and filter/grid transitions
- **React Router 6** for article, search, archive, live and static routes
- **d3-geo** for the rotating globe mark (true orthographic projection)
- **Inter Variable** self-hosted via `@fontsource-variable/inter`
- All editorial photography stored locally in `public/images` — no external image dependency,
  so a broken image can never appear in the build

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # assets → bundle → SSR prerender → sitemap/feed/robots
npm run preview    # serve the production build on :4173
```

Individual build steps: `build:assets`, `build:ssr`, `build:prerender`, `build:seo`,
`build:land` (regenerates the globe's land polygons).

The dev and preview servers bind to `0.0.0.0` so the app can be opened through a proxied
preview host.

## What is implemented

### Homepage
- Sticky brand header (rotating globe logo, search, notifications, sign-in, subscribe)
- Separate primary navigation row with a red active tab, overflow-aware mobile scrolling,
  hamburger drawer and Live TV entry
- **Sliding breaking-news ribbon**: mixed *breaking* + *most-read* headlines with per-item
  timestamps and a live UTC clock. The ribbon slides continuously at a constant 82 px/second
  (duration is derived from the measured track width, so it never speeds up or gaps at the loop
  seam), pauses on hover or keyboard focus, and has pause / skip-back / skip-forward controls.
  It keeps sliding on phones too, with a compact layout at small widths.
- Cinematic hero carousel: 8s autoplay, progress bars, prev/next, keyboard- and
  screen-reader-labelled controls, film-style crossfade + light sweep, and a synced
  headline / description / category / image / destination swap
- Top Stories thumbnail rail, Latest News grid with working category filters and animated
  layout changes, Live TV panel, Trending Now ranking, Most Read rail, editor's desk and
  newsletter band

### Content & routes
| Route | Purpose |
| --- | --- |
| `/` | Homepage (category filter via `?category=`) |
| `/article/:slug` | Full article page with breadcrumbs, reading progress, share tools, author box, related coverage |
| `/latest` | Full archive with category filter + sorting |
| `/search?q=` | Search results with suggestion chips |
| `/live` | Live broadcast centre and schedule |
| `/about` | Editorial standards / about the build |
| `*` | Designed 404 with story suggestions |

All content is rendered from one dataset in `src/data/news.js` (18 stories, each with its own
byline, tags, view count and long-form body). Category filters, search, the ticker, trending
and related-story links all read from that same source — no card markup is duplicated.

### Interactions
- Live search with keyboard navigation (↑ ↓ ⏎), empty state, and `/` shortcut
- Subscribe modal with plan selection + email validation and an explicit **demo** confirmation
- Sign-in modal with field validation and a clearly labelled demo session
- Notification panel (mark-all-read, unread badges)
- Bookmark/reading list persisted to `localStorage`
- Live TV modal with player chrome and an honest *stream not configured* state instead of a
  fake feed
- Mobile search overlay, mobile navigation drawer, toasts, accessible focus rings,
  skip-to-content link and reduced-motion support

## Structure

```
src/
├── components/      # Seo, SiteHeader, BrandLogo, GlobeMark, SearchBar, UserActions, PrimaryNavigation,
│                    # MobileNavigation, BreakingNewsTicker, HeroCarousel, TopStoriesSidebar,
│                    # SectionHeading, CategoryFilters, NewsGrid, NewsCard, LiveTVPanel,
│                    # TrendingNowPanel, SubscribeModal, SignInModal, LiveTVModal, SiteFooter…
├── context/         # AppContext — modals, search, menu, notifications, bookmarks, toasts
├── data/news.js     # single editorial dataset + helpers (search, related, formatting)
│   data/worldLand.js# generated Natural Earth land polygons for the globe mark
├── config/site.js   # canonical origin, SEO defaults, JSON-LD builders
├── pages/           # HomePage, ArticlePage, SearchPage, LatestPage, LivePage, AboutPage, 404
└── index.css        # design tokens, panel/blur/glow utilities, article typography
```

## Assets

Editorial imagery in `public/images` covers the digital-Earth hero, summit diplomacy, markets,
AI systems, robotics, space launch, medicine, broadcast studio and sport.

### The globe mark

The brand emblem is a genuine globe, not a decorative swirl:

- **Real geography** — Natural Earth 110m land polygons (`public domain`), simplified with
  Douglas–Peucker and rounded to 0.2° by `node scripts/build-land.mjs` into
  `src/data/worldLand.js` (13 kB).
- **True projection** — `d3-geo`'s orthographic projection with a 12° axial tilt, so continents
  foreshorten correctly towards the limb and rotate through the visible hemisphere.
- **Legible at brand size** — the ocean stays near-black and the land is lit in vivid red, so the
  silhouette reads clearly even at 38 px in the header and 32 px in the footer.
- **Performance** — the graticule is drawn analytically (a few sampled points per line) instead of
  from a full GeoJSON graticule, and re-projection is throttled to 30 fps. The whole page still
  renders at 60 fps with the globe spinning, and the spin pauses when the tab is hidden and is
  disabled entirely under `prefers-reduced-motion`.

Regenerate the land data with:

```bash
node scripts/build-land.mjs
```

## Notes on honesty

Nothing in this build pretends to be a live production service: the subscription and sign-in
flows are labelled demonstrations, the live player reports that no stream ingest is configured,
and no data leaves the browser.
