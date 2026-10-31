# NewsPulse 24

**REAL NEWS. GLOBAL IMPACT.**

A production-quality front-end for the NewsPulse 24 international news platform — a cinematic
dark newsroom interface built to match the supplied design references (black / charcoal surfaces,
vivid red accents, information-dense editorial grid, rotating globe brand mark).

![homepage](public/images/hero-earth.jpg)

## Stack

- **React 18 + Vite 5**
- **Tailwind CSS 3** with a custom design-token theme (`tailwind.config.js`)
- **Lucide React** icon set
- **Framer Motion** for the hero crossfade and filter/grid transitions
- **React Router 6** for article, search, archive, live and static routes
- **Inter Variable** self-hosted via `@fontsource-variable/inter`
- All editorial photography stored locally in `public/images` — no external image dependency,
  so a broken image can never appear in the build

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve the production build on :4173
```

The dev and preview servers bind to `0.0.0.0` so the app can be opened through a proxied
preview host.

## What is implemented

### Homepage
- Sticky brand header (rotating globe logo, search, notifications, sign-in, subscribe)
- Separate primary navigation row with a red active tab, overflow-aware mobile scrolling,
  hamburger drawer and Live TV entry
- Breaking-news ticker underneath the navigation: colour-matched signal line, mixed
  *breaking* + *most-read* headlines, live UTC clock; pauses on hover
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
├── components/      # SiteHeader, BrandLogo, SearchBar, UserActions, PrimaryNavigation,
│                    # MobileNavigation, BreakingNewsTicker, HeroCarousel, TopStoriesSidebar,
│                    # SectionHeading, CategoryFilters, NewsGrid, NewsCard, LiveTVPanel,
│                    # TrendingNowPanel, SubscribeModal, SignInModal, LiveTVModal, SiteFooter…
├── context/         # AppContext — modals, search, menu, notifications, bookmarks, toasts
├── data/news.js     # single editorial dataset + helpers (search, related, formatting)
├── pages/           # HomePage, ArticlePage, SearchPage, LatestPage, LivePage, AboutPage, 404
└── index.css        # design tokens, panel/blur/glow utilities, article typography
```

## Assets

Editorial imagery in `public/images` covers the digital-Earth hero, summit diplomacy, markets,
AI systems, robotics, space launch, medicine, broadcast studio and sport. The globe emblem is
drawn with SVG/CSS (rotating land surface + meridians) so it stays crisp at any size.

## Notes on honesty

Nothing in this build pretends to be a live production service: the subscription and sign-in
flows are labelled demonstrations, the live player reports that no stream ingest is configured,
and no data leaves the browser.
