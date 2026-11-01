import { useEffect, useRef, useState } from 'react';

/** Small vector line for KPI cards. Pure SVG, no layout thrash. */
export default function Sparkline({ values = [], height = 34, tone = 'red' }) {
  const width = 160;
  const data = values.length ? values : [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return [x, y];
  });

  const line = points
    .map(([x, y], index) => {
      if (index === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = points[index - 1];
      const cx = (px + x) / 2;
      return `C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const id = `spark-${tone}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,16,36,0.42)" />
          <stop offset="100%" stopColor="rgba(255,16,36,0)" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={tone === 'grey' ? '#4A4C58' : '#FF3040'}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Measures a container so the chart can be drawn at device pixels. */
export function useElementWidth(ref, fallback = 720) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width;
      if (next) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export function useNow(interval = 5000) {
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef(null);
  useEffect(() => {
    timer.current = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(timer.current);
  }, [interval]);
  return now;
}
