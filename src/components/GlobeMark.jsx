import { useEffect, useId, useRef } from 'react';
import { geoOrthographic, geoPath } from 'd3-geo';
import { WORLD_LAND } from '../data/worldLand';

const ROTATION_SECONDS = 30;
const FRAME_MS = 1000 / 14; // a slow 30s rotation reads smoothly at 14 updates/s
const TILT = -12;
const START_LAMBDA = -62;

const RAD = Math.PI / 180;
const MERIDIANS = Array.from({ length: 8 }, (_, i) => -180 + i * 45);
const PARALLELS = [-60, -30, 0, 30, 60];

/**
 * Cheap analytic graticule: the orthographic rotation is closed-form, so we can
 * project a handful of sampled points per line instead of walking a full
 * GeoJSON graticule every frame. Cuts animation cost roughly in half.
 */
const makeGraticulePath = (lambda) => {
  const l0 = lambda * RAD;
  const p0 = TILT * RAD;
  const sinP0 = Math.sin(p0);
  const cosP0 = Math.cos(p0);
  let d = '';

  const line = (points) => {
    let open = false;
    for (const [lonDeg, latDeg] of points) {
      const lam = lonDeg * RAD - l0;
      const phi = latDeg * RAD;
      const cosPhi = Math.cos(phi);
      const z = sinP0 * Math.sin(phi) + cosP0 * cosPhi * Math.cos(lam);
      if (z <= 0.02) {
        open = false;
        continue;
      }
      const x = cosPhi * Math.sin(lam);
      const y = cosP0 * Math.sin(phi) - sinP0 * cosPhi * Math.cos(lam);
      d += `${open ? 'L' : 'M'}${(50 + 48 * x).toFixed(2)} ${(50 - 48 * y).toFixed(2)}`;
      open = true;
    }
  };

  for (const meridian of MERIDIANS) {
    const pts = [];
    for (let lat = -80; lat <= 80; lat += 6) pts.push([meridian, lat]);
    line(pts);
  }
  for (const parallel of PARALLELS) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 5) pts.push([lon, parallel]);
    line(pts);
  }
  return d;
};

/* One projection per instance; scale/translate match the 100×100 viewBox sphere. */
const makeProjection = () =>
  geoOrthographic().scale(48).translate([50, 50]).clipAngle(90).precision(0.8);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A real, rotating globe: Natural Earth coastlines clipped by an orthographic
 * projection, with graticule, terminator shading and a specular highlight.
 */
export default function GlobeMark({
  className = '',
  spin = true,
  title = 'The NewsPulse 24 globe',
}) {
  const uid = useId().replace(/:/g, '');
  const landRef = useRef(null);
  const gridRef = useRef(null);
  const projectionRef = useRef(null);
  const pathRef = useRef(null);

  if (!projectionRef.current) {
    projectionRef.current = makeProjection().rotate([START_LAMBDA, TILT, 0]);
    pathRef.current = geoPath(projectionRef.current);
  }

  useEffect(() => {
    const host = landRef.current?.closest('svg');
    const projection = projectionRef.current;
    const path = pathRef.current;
    const apply = (lambda) => {
      projection.rotate([lambda, TILT, 0]);
      if (landRef.current) landRef.current.setAttribute('d', path(WORLD_LAND) || '');
      if (gridRef.current) gridRef.current.setAttribute('d', makeGraticulePath(lambda));
    };

    apply(START_LAMBDA);
    if (!spin || reducedMotion()) return undefined;

    let frame = 0;
    let lambda = START_LAMBDA;
    let last = performance.now();
    let sinceDraw = 0;
    let paused = document.hidden;
    let offscreen = false;

    const onVisibility = () => {
      paused = document.hidden;
      last = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    // stop re-projecting when the mark is scrolled out of view
    let io;
    if (host && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([entry]) => {
          offscreen = !entry.isIntersecting;
          last = performance.now();
        },
        { rootMargin: '80px' },
      );
      io.observe(host);
    }

    const tick = (now) => {
      const delta = Math.min(now - last, 120);
      last = now;
      if (!paused && !offscreen) {
        lambda -= (360 / (ROTATION_SECONDS * 1000)) * delta;
        if (lambda <= -360) lambda += 360;
        sinceDraw += delta;
        // throttled path re-projection keeps the main thread light
        if (sinceDraw >= FRAME_MS) {
          sinceDraw = 0;
          apply(lambda);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
    };
  }, [spin]);

  const oceanId = `ocean-${uid}`;
  const shadeId = `shade-${uid}`;
  const glossId = `gloss-${uid}`;
  const landId = `land-${uid}`;
  const clipId = `clip-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* deep ocean */}
        <radialGradient id={oceanId} cx="34%" cy="27%" r="80%">
          <stop offset="0%" stopColor="#3c0812" />
          <stop offset="34%" stopColor="#220611" />
          <stop offset="68%" stopColor="#12040b" />
          <stop offset="100%" stopColor="#06030a" />
        </radialGradient>

        {/* red-lit land */}
        <linearGradient id={landId} x1="18%" y1="8%" x2="86%" y2="96%">
          <stop offset="0%" stopColor="#ff929b" />
          <stop offset="26%" stopColor="#ff3646" />
          <stop offset="62%" stopColor="#f0101f" />
          <stop offset="100%" stopColor="#8f0512" />
        </linearGradient>

        {/* spherical shading: gentle highlight upper-left, terminator lower-right */}
        <radialGradient id={shadeId} cx="33%" cy="26%" r="76%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="24%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="50%" stopColor="#000000" stopOpacity="0" />
          <stop offset="74%" stopColor="#000000" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
        </radialGradient>

        {/* narrow specular hotspot */}
        <radialGradient id={glossId} cx="28%" cy="19%" r="22%">
          <stop offset="0%" stopColor="#fff4f5" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>

      {/* outer atmosphere halo */}
      <circle cx="50" cy="50" r="49.2" fill="none" stroke="#ff1024" strokeOpacity="0.3" strokeWidth="1.6">
        <animate attributeName="stroke-opacity" values="0.18;0.46;0.18" dur="6s" repeatCount="indefinite" />
      </circle>

      {/* ocean sphere */}
      <circle cx="50" cy="50" r="48" fill={`url(#${oceanId})`} />

      <g clipPath={`url(#${clipId})`}>
        {/* graticule over the ocean */}
        <path ref={gridRef} fill="none" stroke="#ff8a94" strokeOpacity="0.24" strokeWidth="0.32" />
        {/* continents */}
        <path
          ref={landRef}
          fill={`url(#${landId})`}
          stroke="#ffc4c9"
          strokeOpacity="0.55"
          strokeWidth="0.34"
          strokeLinejoin="round"
        />
        {/* spherical shading */}
        <circle cx="50" cy="50" r="48" fill={`url(#${shadeId})`} />
        <circle cx="50" cy="50" r="48" fill={`url(#${glossId})`} />
        {/* limb brightening */}
        <circle cx="50" cy="50" r="47.4" fill="none" stroke="#ffb0b8" strokeOpacity="0.22" strokeWidth="1.4" />
      </g>

      {/* crisp rim */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ffd0d4" strokeOpacity="0.6" strokeWidth="0.55" />
    </svg>
  );
}
