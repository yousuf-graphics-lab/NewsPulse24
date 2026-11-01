import { useMemo, useRef, useState } from 'react';
import { formatCompact, formatNumber } from '../../../lib/telemetry';
import { useElementWidth } from './Sparkline';

const PAD = { top: 18, right: 12, bottom: 24, left: 44 };
const HEIGHT = 268;

const buildPath = (points, width, max) => {
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = innerW / Math.max(points.length - 1, 1);
  return points.map((point, index) => {
    const x = PAD.left + index * step;
    const y = PAD.top + innerH - (point.value / max) * innerH;
    return [x, y];
  });
};

const smooth = (coords) =>
  coords
    .map(([x, y], index) => {
      if (index === 0) return `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const [px, py] = coords[index - 1];
      const cx = (px + x) / 2;
      return `C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

export default function TrafficChart({ current, previous, annotations = [], range }) {
  const wrapRef = useRef(null);
  const width = useElementWidth(wrapRef, 760);
  const [hover, setHover] = useState(null);

  const points = current?.points || [];
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const max = useMemo(() => {
    const values = [...points.map((p) => p.value), ...(previous?.points || []).map((p) => p.value)];
    return Math.max(...values, 1) * 1.18;
  }, [points, previous]);

  const coords = buildPath(points, width, max);
  const prevCoords = previous ? buildPath(previous.points, width, max) : [];
  const line = smooth(coords);
  const area = coords.length
    ? `${line} L${coords[coords.length - 1][0].toFixed(1)} ${HEIGHT - PAD.bottom} L${PAD.left} ${
        HEIGHT - PAD.bottom
      } Z`
    : '';

  const gridValues = [0.25, 0.5, 0.75, 1].map((fraction) => max * fraction);
  const step = innerW / Math.max(points.length - 1, 1);
  const tickEvery = Math.max(1, Math.ceil(points.length / 6));

  const onMove = (event) => {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - PAD.left;
    const index = Math.round(x / step);
    if (index < 0 || index >= points.length) {
      setHover(null);
      return;
    }
    setHover(index);
  };

  const hoverPoint = hover != null ? points[hover] : null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label={`Readership chart for ${range?.label || 'the selected range'}. Peak ${formatNumber(
        points[current?.peakIndex]?.value || 0,
      )} reads.`}
    >
      <svg width={width} height={HEIGHT} className="block">
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,16,36,0.34)" />
            <stop offset="62%" stopColor="rgba(255,16,36,0.08)" />
            <stop offset="100%" stopColor="rgba(255,16,36,0)" />
          </linearGradient>
          <linearGradient id="traffic-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B00E1D" />
            <stop offset="55%" stopColor="#FF1024" />
            <stop offset="100%" stopColor="#FF4A56" />
          </linearGradient>
        </defs>

        {/* y grid + labels */}
        {gridValues.map((value, index) => {
          const y = PAD.top + innerH - (value / max) * innerH;
          return (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y}
                y2={y}
                stroke="#1D1E25"
                strokeDasharray={index === gridValues.length - 1 ? undefined : '2 4'}
              />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end" className="fill-[#5F616E] text-[9px]">
                {formatCompact(Math.round(value))}
              </text>
            </g>
          );
        })}
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          stroke="#22232A"
        />

        {/* previous period */}
        {prevCoords.length ? (
          <path
            d={smooth(prevCoords)}
            fill="none"
            stroke="#3A3C46"
            strokeWidth="1.3"
            strokeDasharray="4 4"
          />
        ) : null}

        {/* current */}
        {area ? <path d={area} fill="url(#traffic-fill)" /> : null}
        {line ? (
          <path d={line} fill="none" stroke="url(#traffic-line)" strokeWidth="2" strokeLinejoin="round" />
        ) : null}

        {/* x labels */}
        {points.map((point, index) =>
          index % tickEvery === 0 ? (
            <text
              key={`${point.label}-${index}`}
              x={PAD.left + index * step}
              y={HEIGHT - 6}
              textAnchor={index === 0 ? 'start' : 'middle'}
              className="fill-[#5F616E] text-[9px]"
            >
              {point.label}
            </text>
          ) : null,
        )}

        {/* annotations */}
        {annotations.map((annotation) => {
          const index = Math.min(Math.max(annotation.index, 0), points.length - 1);
          const [x, y] = coords[index] || [PAD.left, HEIGHT - PAD.bottom];
          return (
            <g key={annotation.id}>
              <line
                x1={x}
                x2={x}
                y1={y}
                y2={HEIGHT - PAD.bottom}
                stroke={annotation.kind === 'peak' ? '#FF3040' : '#7A7C89'}
                strokeDasharray="3 3"
                opacity="0.7"
              />
              <circle cx={x} cy={y} r="3.5" fill="#0E0F14" stroke="#FF3040" strokeWidth="1.6" />
            </g>
          );
        })}

        {/* hover */}
        {hover != null && coords[hover] ? (
          <g>
            <line
              x1={coords[hover][0]}
              x2={coords[hover][0]}
              y1={PAD.top - 6}
              y2={HEIGHT - PAD.bottom}
              stroke="#4A4C58"
              strokeDasharray="2 3"
            />
            <circle cx={coords[hover][0]} cy={coords[hover][1]} r="4" fill="#FF1024" stroke="#0E0F14" strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      {/* annotation pills positioned over the plot */}
      {annotations.map((annotation) => {
        const index = Math.min(Math.max(annotation.index, 0), points.length - 1);
        const [x, y] = coords[index] || [PAD.left, HEIGHT / 2];
        const left = Math.min(Math.max(x, 70), width - 70);
        return (
          <div
            key={`pill-${annotation.id}`}
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-[3px] border border-[#3A1E22] bg-[#160E11]/95 px-1.5 py-[3px] text-[9px] font-semibold text-bone/85"
            style={{ left, top: Math.max(2, y - 26) }}
          >
            <span className="mr-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#8A8C99]">
              {annotation.label}
            </span>
            {annotation.value ? (
              <span className="text-pulse-400">{formatCompact(annotation.value)}</span>
            ) : null}
          </div>
        );
      })}

      {/* hover readout */}
      {hoverPoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[3px] border border-[#2A2C36] bg-[#0A0B0F] px-2 py-1 shadow-[0_10px_30px_-16px_rgba(0,0,0,1)]"
          style={{
            left: Math.min(Math.max(PAD.left + hover * step, 54), width - 54),
            top: PAD.top - 4,
          }}
        >
          <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[#7A7C89]">
            {hoverPoint.label}
          </p>
          <p className="text-[11px] font-bold text-bone">{formatNumber(hoverPoint.value)}</p>
        </div>
      ) : null}
    </div>
  );
}
