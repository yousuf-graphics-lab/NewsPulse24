/**
 * Build-time social/PWA assets:
 *  - public/og-image.jpg           1200×630 site card
 *  - public/og/<slug>.jpg          1200×630 card per story (title + category + artwork)
 *  - public/logo-512.png / -192.png
 *
 * Run: node scripts/generate-assets.mjs  (part of `npm run build`)
 * The per-story cards are generated artefacts and are gitignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { STORIES } from '../src/data/news.js';

const OUT = path.resolve('public');
const OG_DIR = path.join(OUT, 'og');
const HERO = path.join(OUT, 'images/hero-earth.jpg');
const SITE_URL = (process.env.VITE_SITE_URL || 'https://newspulse24.com').replace(/\/$/, '');

const W = 1200;
const H = 630;

const escapeXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/* Simple greedy wrap that keeps headlines inside the card. */
const wrap = (text, maxChars) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length > 3) {
    const kept = lines.slice(0, 3);
    kept[2] = `${kept[2].replace(/[,;:.]$/, '')}…`;
    return kept;
  }
  return lines;
};

const globeSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="o" cx="33%" cy="26%" r="80%">
      <stop offset="0%" stop-color="#3c0812"/><stop offset="34%" stop-color="#220611"/>
      <stop offset="68%" stop-color="#12040b"/><stop offset="100%" stop-color="#06030a"/>
    </radialGradient>
    <linearGradient id="l" x1="18%" y1="8%" x2="86%" y2="96%">
      <stop offset="0%" stop-color="#ff929b"/><stop offset="26%" stop-color="#ff3646"/>
      <stop offset="62%" stop-color="#f0101f"/><stop offset="100%" stop-color="#8f0512"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="50" fill="#ff1024"/>
  <circle cx="50" cy="50" r="46" fill="url(#o)"/>
  <g stroke="#ff8a94" stroke-opacity="0.35" fill="none" stroke-width="0.6">
    <ellipse cx="50" cy="50" rx="15" ry="46"/><ellipse cx="50" cy="50" rx="30" ry="46"/>
    <path d="M4 50h92M8 30h84M8 70h84M14 16h72M14 84h72"/>
  </g>
  <g fill="url(#l)" stroke="#ffc4c9" stroke-opacity="0.5" stroke-width="0.7">
    <path d="M26 24c6-4 14-3 18 2 2 3-1 6-5 7-6 1-11-1-14-4-1-2-1-4 1-5z"/>
    <path d="M30 38c5-1 9 2 10 7 1 6-3 11-8 11-5 0-8-5-7-10 0-4 2-7 5-8z"/>
    <path d="M52 20c7-2 15 0 19 4 3 3 0 7-5 8-6 1-13-1-16-4-2-2-1-7 2-8z"/>
    <path d="M56 36c6-2 12 1 14 5 2 4-1 8-6 9-6 1-11-2-12-7-1-3 1-6 4-7z"/>
    <path d="M72 26c5-2 11 0 13 4 2 3-1 6-5 7-5 1-10-1-12-4-1-3 0-6 4-7z"/>
    <path d="M64 52c5-1 9 1 10 5 1 4-2 7-7 7s-8-3-7-7c0-3 1-4 4-5z"/>
  </g>
  <circle cx="50" cy="50" r="46" fill="none" stroke="#ffd0d4" stroke-opacity="0.6" stroke-width="1.6"/>
</svg>`;

const FONT = 'Inter, Helvetica, Arial, sans-serif';

/** Shared chrome: top bar, gradient, logo lockup, footer. */
const chrome = ({ kicker, lines, lineSize, lead }) => {
  const startY = 300;
  const lineHeight = Math.round(lineSize * 1.12);
  const titleTspans = lines
    .map(
      (l, i) =>
        `<text x="72" y="${startY + i * lineHeight}" fill="${i === 0 ? '#ffffff' : '#f5f5f7'}" font-size="${lineSize}" font-weight="800" font-family="${FONT}" letter-spacing="-2">${escapeXml(l)}</text>`,
    )
    .join('');
  const leadY = startY + lines.length * lineHeight + 22;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#050608" stop-opacity="0.98"/>
      <stop offset="44%" stop-color="#050608" stop-opacity="0.92"/>
      <stop offset="72%" stop-color="#050608" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0.2"/>
    </linearGradient>
    <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#050608" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  <rect y="${H - 200}" width="${W}" height="200" fill="url(#bottom)"/>
  <rect width="${W}" height="6" fill="#ff1024"/>

  <text x="72" y="112" fill="#ffffff" font-size="46" font-weight="800" font-family="${FONT}" letter-spacing="-1.5">News<tspan fill="#ff1024">Pulse</tspan><tspan fill="#ff1024"> 24</tspan></text>
  <text x="74" y="142" fill="#a1a1aa" font-size="14" font-weight="600" font-family="${FONT}" letter-spacing="4.4">REAL NEWS. GLOBAL IMPACT.</text>

  <rect x="72" y="196" width="${Math.max(96, kicker.length * 9 + 28)}" height="30" rx="3" fill="#ff1024"/>
  <text x="${72 + Math.max(96, kicker.length * 9 + 28) / 2}" y="216" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="800" font-family="${FONT}" letter-spacing="2">${escapeXml(kicker.toUpperCase())}</text>

  ${titleTspans}
  ${lead ? `<text x="72" y="${leadY}" fill="#a1a1aa" font-size="21" font-family="${FONT}">${escapeXml(lead)}</text>` : ''}

  <text x="${W - 48}" y="${H - 26}" text-anchor="end" fill="#71717a" font-size="15" font-weight="600" font-family="${FONT}">${escapeXml(SITE_URL.replace(/^https?:\/\//, ''))}</text>
</svg>`;
};

fs.mkdirSync(OG_DIR, { recursive: true });

/* ---------- logos ---------- */
for (const size of [512, 192]) {
  await sharp(Buffer.from(globeSvg(size)))
    .resize(size, size)
    .png()
    .toFile(path.join(OUT, `logo-${size}.png`));
}

/* ---------- site card ---------- */
const siteOverlay = chrome({
  kicker: 'Top story',
  lines: ['A More', 'Connected World', 'for a Brighter Tomorrow'],
  lineSize: 60,
  lead: 'Breaking world news, markets, technology and live coverage.',
});

await sharp(HERO)
  .resize(W, H, { fit: 'cover', position: 'right' })
  .composite([{ input: Buffer.from(siteOverlay), top: 0, left: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));

/* ---------- per-story cards ---------- */
let made = 0;
for (const story of STORIES) {
  const artPath = path.join(OUT, story.image.replace(/^\//, ''));
  const size = story.title.length > 62 ? 44 : story.title.length > 44 ? 50 : 58;
  const overlay = chrome({
    kicker: story.category,
    lines: wrap(story.title, story.title.length > 62 ? 34 : 30),
    lineSize: size,
    lead: `${story.author.name} · ${story.author.role}`,
  });
  try {
    await sharp(fs.existsSync(artPath) ? artPath : HERO)
      .resize(W, H, { fit: 'cover', position: 'right' })
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OG_DIR, `${story.slug}.jpg`));
    made += 1;
  } catch (error) {
    console.warn(`og card failed for ${story.slug}:`, error.message);
  }
}

const kb = (f) => `${(fs.statSync(f).size / 1024).toFixed(0)} kB`;
console.log(
  `og-image.jpg ${kb(path.join(OUT, 'og-image.jpg'))} · ${made} story cards · logo-512.png ${kb(path.join(OUT, 'logo-512.png'))}`,
);
