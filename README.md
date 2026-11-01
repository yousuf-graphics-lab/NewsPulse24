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

## Motion system

A single set of tokens (`src/lib/motion.js`) drives every animation so the whole
interface shares one rhythm:

| Token | Value | Used for |
| --- | --- | --- |
| `EASE` | `cubic-bezier(.22,1,.36,1)` | entrances, layout shifts, hero text |
| `EASE_IN_OUT` | `cubic-bezier(.65,0,.35,1)` | the sliding nav / filter pills |
| `EASE_SOFT` | `cubic-bezier(.4,0,.6,1)` | exits and dismissals |
| `DUR` | 120 – 900 ms | instant → fast → base → slow → cinematic |

Behaviour:

- **Hero carousel** — crossfade (0.75 s) with a slower ken-burns settle (1.15 s),
  staggered text lines, a skewed red light sweep and progress bars; hover, focus
  and tab-visibility all pause autoplay.
- **Sliding pills** — the active nav tab and category filter share a `layoutId`
  pill, so the highlight glides between items instead of snapping.
- **Grid & filters** — Framer Motion `layout` reflow with short staggered
  entrances; exits are 120 ms so the next click is never blocked.
- **Dropdowns & panels** — bell, account menu and search results scale in from
  their anchor corner over 200 ms.
- **Modals & toasts** — 320/300 ms springs with a shared close transition; the
  subscribe flow crossfades from form to confirmation.
- **Route changes** — content fades up 8 px on navigation (skipped on first paint
  so prerendered HTML shows instantly), and the article reading bar tracks scroll
  with no easing lag.
- **Respect & performance** — `MotionConfig reducedMotion="user"` plus a CSS
  `prefers-reduced-motion` block disables all of it cleanly; the ambient glow
  sits on its own composited layer so scrolling never repaints the background,
  the globe re-projects at 14 fps and pauses when scrolled away, and
  below-the-fold bands use `content-visibility: auto`.

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
│                    # TrendingNowPanel, SubscribeModal, SignInModal, LiveTVModal, SiteFooter,
│                    # FooterSkyline…
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
  from a full GeoJSON graticule, and re-projection is throttled to 14 updates/s. The spin pauses
  when the tab is hidden, stops when the mark scrolls off-screen, and follows
  `prefers-reduced-motion`.

Regenerate the land data with:

```bash
node scripts/build-land.mjs
```

### Footer artwork

The closing band is drawn from vectors, so it stays sharp on any display and adds no raster
weight:

- **Dotted world map** — real coastlines sampled on an equirectangular grid and emitted as a single
  round-capped dot path (8,300 dots, 134 kB SVG) by `node scripts/build-footer-art.mjs` into
  `public/images/footer-world-map.svg`. It sits behind the masthead under a radial mask that fades
  the graticule out at every edge.
- **Landmark skyline** — `src/components/FooterSkyline.jsx` draws fourteen world landmarks (Christ
  the Redeemer, pagoda, Colosseum, Pisa, Big Ben, Eiffel, torii gate, Taj Mahal, Burj Khalifa,
  Sydney Opera House, Statue of Liberty, Empire State and more) plus a generated low horizon, all
  inlined SVG with a mask-cut arch arcade.
- **No dead space** — the skyline is pulled up under the last directory row (`-mt` with the
  directory on `z-10`, skyline on `z-0`), so the horizon, its red glow and its haze bleed behind
  the link columns instead of sitting in a separate band below them. The band closes on the red
  rule above the legal bar.
- **Working controls** — the Morning Pulse field validates, stores the address and confirms inline;
  Watch Live and Newsletters open the broadcast and membership dialogs; section links deep-link the
  homepage filters; Privacy, Terms and Cookie links land on real policy sections at `/about`.

## Admin panel — Mission Control

`/admin` is the newsroom console: a full-bleed control room with its own chrome (no site header),
a left rail, a live telemetry dashboard and a working story editor. Everything it shows is derived
from the story dataset or from article opens recorded in this browser, and modelled figures say so.

The panel has **no entry point on the public site** — no footer link, no menu item, no shortcut. It
is reached by navigating to `/admin` directly, and it is `noindex` (meta tag, `robots.txt` and an
`X-Robots-Tag` header) so it never turns up in search.

**Sign in** with the editorial ID and passphrase issued for the newsroom. The credential is verified
in the browser — the password is only ever a PBKDF2-SHA-256 digest (310 000 iterations, salted and
peppered), never plaintext, and comparisons are constant-time. Five bad attempts lock the form with
exponential back-off; sessions live in `sessionStorage` with a 256-bit token, a 20-minute idle
window and an 8-hour ceiling.

**Second factor (optional, recommended).** `Security & access` enrols a TOTP authenticator
(RFC 6238, 30-second step, ±1 window, WebCrypto only). The base32 secret is sealed with AES-GCM-256
under a PBKDF2-SHA-256 key derived from your passphrase (150 000 iterations) and stored as
`{salt, iv, cipher}`; the pending secret expires after 15 minutes. Once enrolled, the sign-in form
asks for the passphrase *and* the current 6-digit code, and the passphrase cannot be rotated without
it. Sessions also broadcast a sign-out over `BroadcastChannel`, so signing out in one tab closes the
console in every other tab, and the panel can optionally lock itself when the tab is hidden for more
than two minutes.

| Panel | Capability |
| --- | --- |
| Dashboard | KPI cards with sparklines and period deltas, concurrent-readership chart with 24 h / 7 d / monthly ranges and All Desks · Breaking · Business · Technology series, peak and publish annotations, Live TV desk card, trending editorial priority with `HERO SLOT` / `TOP STORIES` / `GRID` slots and one-click pinning, Command Log & Alerts with a broadcast transmitter, desk distribution |
| Newsroom ledger | Search, section and status filters (live / drafts / taken down / breaking), sort by recency, reads or title; edit, publish, unpublish, take down, restore and preview any story |
| Drafting room | Story editor: headline with auto slug, standfirst, tags, block body (paragraph, subheading, quote, list), lead-image library with focal point and alt text, reporter, read time, read counter, publish timestamp, breaking flag + kicker, live front-page preview, publish-readiness gates, ⌘S / ⌘↵ shortcuts |
| Live TV & breaking | Site-wide breaking override bar (headline, kicker, tone, target story), live-rail promotion, ticker rundown and pinning |
| Analytics & heatmaps | Readership heatmap (hour × weekday), desk performance table with share, story leaderboard by reads/minute, storage report |
| Staff & permissions | Roster seeded from the newsroom directory, add / edit / suspend / remove seats, access tiers, shift coverage across the 24-hour cycle |
| Wire agent | Always-on ingest: source feeds, publishing mode, cadence and caps, section allow-list, per-source trust, a review queue with expandable drafts and a run log |
| Settings | Hero and ticker pins in order, auto-rebalance, desk weights that bias the automatic selectors, JSON backup export / import, destructive resets |
| Security & access | Security posture checklist, passphrase rotation with a strength meter, TOTP second-factor enrolment, lock-on-tab-hide, session details, brute-force guard, sign-out everywhere, security trail |

### The wire agent

`src/lib/automation.js` is the always-on half of the newsroom. It runs inside the app (first tick
3 s after load, then every 20 s, honouring whatever cadence the operator set), can be started by hand
from **Wire agent → Run now**, and is **on by default**: a new install arrives with ten live
channels and auto-publish selected, so the front page fills itself. Nothing is hard-coded once it
has run — every switch below belongs to the operator.

1. **Collect** — reads the enabled public feeds in `src/lib/feedCatalog.js` (31 channels across
   nine desks: BBC, Guardian, Al Jazeera, NPR, DW, CNBC, MarketWatch, The Verge, Ars Technica,
   TechCrunch, Hacker News, NASA, ScienceDaily, Space.com, STAT, ESPN, Variety and more), plus any
   feed you add. A channel can be **discovered** instead of typed: paste a news site into *Find a
   channel* and the agent reads the `<link rel="alternate">` tags and common feed paths, then
   verifies each candidate before offering it.
   Requests go through a proxy chain — the deployed `api/wire.js` first, then public relays
   (allorigins, codetabs, corsproxy), then a direct request — and each hop's failure is recorded. The proxy
   only speaks http(s), refuses private and link-local addresses, caps the response at 1.5 MB,
   times out after 12 s and only passes XML or JSON back with `s-maxage=300`. `vite dev` and
   `vite preview` serve the same endpoint from `scripts/vite-wire.mjs`.
2. **Enrich** — for thin feed items (under 160 characters of summary) the agent fetches the linked
   article, if the **Read the linked article** rule is on, and folds its description and opening
   paragraphs into the source copy. Six articles per run, 9 s each, skipped on failure.
3. **Filter** — parses RSS 2.0, RSS 1.0/RDF, Atom and JSON Feed; drops anything outside the
   freshness window (36 h by default), under 18 characters of headline or 80 of summary; dedupes by
   canonical URL (tracking parameters stripped) against the last 400 seen items and the live queue;
   then scores each candidate 0–100 on recency, copy depth, section confidence, image match and
   channel trust.
4. **Compose** — cleans the headline (drops the outlet suffix, tames SHOUTING, caps the length),
   writes the standfirst from the lead sentence, builds a multi-paragraph extractive body with a
   **Key points** list, files the story by whole-word keyword scoring (so `ai` never matches
   “said”), adds tags, picks a lead image from the newsroom library (or the publisher's own image
   when that rule is on), and caps SEO title/description at 60 / 155 characters. Every draft carries
   `attribution { name, url, host, automated: true }` and a visible “assembled by the wire agent”
   line.
5. **Publish** — in **Approval** mode drafts wait in the queue for *Publish*, *Edit* or *Reject*;
   in **Auto-publish** mode they go live immediately, rate-limited to N stories per hour (3 by
   default) and bounded by the desk allow-list.

**Diagnostics.** Every run stores a report: which channels were read, how many items each returned,
how many were queued or skipped and why, which route answered, and the failure text when a channel
could not be reached — shown under *Last run* with a **Check route** button. When every channel
fails before the parser sees a feed, the panel says so plainly: that is a transport problem (a
hosted preview sandbox with no outbound internet), not a parsing one, and it resolves on a host that
can reach publishers.

From the panel you control: master switch, publishing mode, cadence, hourly cap, score floor,
freshness window, desk allow-list, article enrichment, source images, proxy template, per-channel
on/off and per-channel test, plus catalogue/discovery, and per-item edit, publish, reject and remove.

There is no language model in this bundle, so the copy is extractive and attributed — the agent
never invents prose and never claims to. A wire story on the public site shows a **Wire report**
strip naming the original outlet and linking to it (`rel="noreferrer nofollow"`).

Like the rest of the panel, the agent runs in the browser: it works while any tab is open, with a
cross-tab lock so two tabs never run the same cycle twice. An always-on newsroom wants the same
`automation.js` running on a server cron with a shared database — the module is framework-free and
takes a fetch implementation, so it drops in front of `api/wire.js` unchanged.

### The database

`src/lib/db.js` is a small versioned document store over `localStorage` (`newspulse24:db:v3`,
schema v3):

- collections for `posts`, `hidden` takedowns, `settings`, `reads`, `staff`, `audit` and the
  `automation` state (channels, queue, seen hashes, log, stats, last-run diagnostics);
- forward migration from the v2 and v1 keys (`newspulse24:db:v2`, `newspulse24:content:v1`,
  `reads:v1`, `admin:audit`) the first time the app loads;
- one atomic write per mutation with quota-aware errors returned to the editor;
- a change feed the app subscribes to, plus cross-tab `storage` sync;
- read telemetry capped at 400 events per story and 6 000 in total, audit at 200 rows;
- JSON export / import so the whole database can be backed up or moved.

`src/lib/contentStore.js` layers that database over the shipped dataset in `src/data/news.js` and
rebuilds the exported `STORIES` array in place, so the homepage, article pages, search, latest,
ticker and hero all read one live source. `src/lib/telemetry.js` turns publish times and read
counters into the dashboard curves, heatmap and leaderboards — modelled distributions are labelled
as such in the UI, and locally recorded opens are shown separately.

**Scope, stated plainly.** This is a browser-local publisher: content written in the panel is served
to the browser that wrote it. Publishing to every visitor needs a database and an authenticated API
(Vercel Postgres/Supabase + a serverless handler is the natural next step for this stack). The
client-side gate can also be bypassed by anyone with the bundle, which is why the panel is
`noindex`, disallowed in `robots.txt`, sent `X-Robots-Tag: noindex` and `Cache-Control: no-store`
from `vercel.json`, and never surfaces credentials in the UI beyond the editorial ID.

## Notes on honesty


Nothing in this build pretends to be a live production service: the subscription and sign-in
flows are labelled demonstrations, the live player reports that no stream ingest is configured,
and no data leaves the browser.
