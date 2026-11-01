/**
 * Generates the dotted world map used behind the footer masthead.
 * Real coastlines (Natural Earth 110m via world-atlas) are sampled on an
 * equirectangular grid and drawn as a single round-capped dot path so the
 * artwork stays a few tens of kilobytes.
 *
 * Run: node scripts/build-footer-art.mjs
 * Output: public/images/footer-world-map.svg (committed, no runtime cost)
 */
import fs from 'node:fs';
import path from 'node:path';
import { geoContains, geoEquirectangular } from 'd3-geo';
import { feature } from 'topojson-client';

const SRC = path.resolve('node_modules/world-atlas/land-110m.json');
const OUT = path.resolve('public/images/footer-world-map.svg');

const W = 1800;
const H = 900;
const STEP = 8; // px between sample points
const R = 3.1; // dot diameter

const topo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const land = feature(topo, topo.objects.land);

const projection = geoEquirectangular()
  .translate([W / 2, H / 2])
  .scale(W / (2 * Math.PI));

const dots = [];
for (let y = STEP / 2; y < H; y += STEP) {
  for (let x = STEP / 2; x < W; x += STEP) {
    const ll = projection.invert([x, y]);
    if (!ll) continue;
    if (geoContains(land, ll)) dots.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
}

// `M x y h.01` with a round cap renders a single dot: far smaller than a circle list.
const d = dots.map((p) => `M${p}h.01`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<path d="${d}" fill="none" stroke="#8A8D9A" stroke-width="${R}" stroke-linecap="round"/>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log(`wrote ${OUT} — ${dots.length} dots, ${(svg.length / 1024).toFixed(1)} kB`);
