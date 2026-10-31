/**
 * Decorative skyline of world landmarks that closes the footer.
 * Drawn as vectors (no raster asset) so it stays crisp at any width and costs
 * nothing to load. Landmarks, left to right: skyline cluster, Christ the
 * Redeemer, pagoda, Colosseum, Leaning Tower, Big Ben, Eiffel Tower, torii
 * gate, Taj Mahal, Burj Khalifa, Sydney Opera House, Statue of Liberty,
 * Empire State Building, skyline cluster.
 */
const BASE = 250;

/* Generic towers keep the horizon dense between landmarks. [x, width, height] */
const TOWERS = [
  // left cluster
  [4, 34, 96], [42, 22, 132], [66, 40, 74], [110, 26, 158], [138, 18, 108],
  [160, 44, 88], [206, 24, 142], [232, 36, 64], [272, 20, 118], [294, 30, 84],
  // background fill between landmarks
  [318, 18, 46], [398, 22, 38], [488, 20, 44], [604, 18, 36], [694, 22, 42],
  [780, 20, 34], [900, 24, 40], [982, 18, 32], [1140, 24, 44], [1226, 18, 36],
  [1360, 22, 42], [1440, 18, 34], [1480, 20, 40],
  // right cluster
  [1520, 30, 128], [1554, 22, 96], [1580, 38, 152], [1620, 24, 110], [1648, 16, 168],
  [1668, 42, 92], [1714, 26, 134], [1744, 34, 78], [1780, 20, 116],
];

/* A continuous low horizon behind the landmarks, sized from a stable scatter
   so the silhouette never shows empty gaps. */
const BACKDROP = Array.from({ length: 72 }, (_, i) => {
  const x = i * 25 + ((i * 37) % 11);
  const w = 15 + ((i * 29) % 13);
  const h = 20 + ((i * 53) % 9) * 8 + (i % 5 === 0 ? 18 : 0);
  return [x, w, h];
});

const ANTENNAS = [
  [113, 158, 26], [1648, 168, 34], [1611, 152, 22], [235, 64, 18], [1588, 152, 26],
];

export default function FooterSkyline({ className = '' }) {
  return (
    <svg
      viewBox="0 40 1800 210"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="skyline-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101118" />
          <stop offset="100%" stopColor="#0A0B10" />
        </linearGradient>
        <linearGradient id="skyline-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08090E" />
          <stop offset="100%" stopColor="#030408" />
        </linearGradient>
        <mask id="colosseum-arches" maskUnits="userSpaceOnUse" x="490" y="150" width="150" height="110">
          <rect x="490" y="150" width="150" height="110" fill="#fff" />
          {[510, 536, 562, 588, 614].map((x) => (
            <path key={`arch-lo-${x}`} d={`M${x} 252v-20a8 8 0 0 1 16 0v20z`} fill="#000" />
          ))}
          {[518, 548, 578].map((x) => (
            <path key={`arch-hi-${x}`} d={`M${x} 216v-12a6 6 0 0 1 12 0v12z`} fill="#000" />
          ))}
        </mask>
      </defs>

      {/* far skyline — low contrast, sits behind everything */}
      <g fill="#0D0E14">
        {TOWERS.map(([x, w, h]) => (
          <rect key={`f-${x}`} x={x} y={BASE - h} width={w} height={h} />
        ))}
      </g>

      <g fill="url(#skyline-far)">
        {BACKDROP.map(([x, w, h]) => (
          <rect key={`bg-${x}`} x={x} y={BASE - h} width={w} height={h} />
        ))}
      </g>

      <g fill="url(#skyline-near)">
        {/* generic towers + roof details */}
        {TOWERS.map(([x, w, h]) => (
          <g key={`n-${x}`}>
            <rect x={x} y={BASE - h} width={w} height={h} />
            <rect x={x + w * 0.35} y={BASE - h - 5} width={w * 0.3} height={5} />
          </g>
        ))}
        {ANTENNAS.map(([x, y, h]) => (
          <rect key={`a-${x}`} x={x} y={y - h} width="2" height={h} />
        ))}

        {/* Christ the Redeemer — Rio de Janeiro */}
        <g>
          <rect x="336" y="236" width="28" height="14" />
          <rect x="342" y="226" width="16" height="10" />
          <path d="M345 226l1-30h8l1 30z" />
          <rect x="313" y="192" width="74" height="5" rx="2" />
          <path d="M344 197h14l-2 12h-10z" />
          <circle cx="351" cy="188" r="5.4" />
        </g>

        {/* Pagoda — East Asia */}
        <g>
          <rect x="432" y="228" width="56" height="22" />
          <path d="M424 228h72l-8-9h-56z" />
          <rect x="438" y="203" width="44" height="16" />
          <path d="M430 203h60l-7-9h-46z" />
          <rect x="442" y="180" width="36" height="14" />
          <path d="M434 180h52l-6-9h-40z" />
          <rect x="458" y="158" width="4" height="14" />
          <circle cx="460" cy="156" r="3" />
        </g>

        {/* Colosseum — Rome */}
        <g mask="url(#colosseum-arches)">
          <path d="M498 250V176h8v-14h14v14h14v-14h14v14h14v-14h14v14h14v-14h14v14h8v74z" />
        </g>

        {/* Leaning Tower — Pisa */}
        <g transform="rotate(-5 660 250)">
          <rect x="646" y="150" width="28" height="100" />
          {[158, 172, 186, 200, 214, 228].map((y) => (
            <rect key={`tier-${y}`} x="642" y={y} width="36" height="4" fill="#111219" />
          ))}
          <rect x="650" y="138" width="20" height="12" />
          <path d="M650 138c0-9 4-13 10-13s10 4 10 13z" />
        </g>

        {/* Big Ben — London */}
        <g>
          <rect x="726" y="132" width="28" height="118" />
          <rect x="720" y="104" width="40" height="28" />
          <circle cx="740" cy="118" r="9" fill="#15161d" />
          <path d="M722 104 740 58l18 46z" />
          <rect x="739" y="40" width="2" height="18" />
        </g>

        {/* Eiffel Tower — Paris */}
        <g>
          <path d="M764 250c34-62 54-114 66-158h20c12 44 32 96 66 158h-28c-10-36-18-66-26-92h-44c-8 26-16 56-26 92z" />
          <rect x="780" y="196" width="120" height="7" />
          <rect x="806" y="150" width="68" height="3" />
          <rect x="808" y="130" width="64" height="6" />
          <rect x="820" y="108" width="40" height="3" />
          <rect x="824" y="88" width="32" height="5" />
          <path d="M834 90 840 62l6 28z" />
          <rect x="839" y="44" width="2" height="20" />
        </g>

        {/* Torii gate — Japan */}
        <g>
          <rect x="924" y="190" width="10" height="60" />
          <rect x="966" y="190" width="10" height="60" />
          <path d="M910 196c26-14 52-14 80 0v-12c-28-13-52-13-80 0z" />
          <rect x="926" y="204" width="48" height="7" />
          <rect x="944" y="211" width="12" height="18" />
        </g>

        {/* Taj Mahal — Agra */}
        <g>
          <rect x="1012" y="242" width="96" height="8" />
          <rect x="1028" y="204" width="64" height="38" />
          <path d="M1026 204c2-30 66-30 68 0z" />
          <rect x="1058" y="166" width="3" height="14" />
          <circle cx="1014" cy="196" r="8" />
          <circle cx="1106" cy="196" r="8" />
          <rect x="1009" y="178" width="8" height="64" />
          <rect x="1103" y="178" width="8" height="64" />
          <circle cx="1013" cy="174" r="5" />
          <circle cx="1107" cy="174" r="5" />
        </g>

        {/* Burj Khalifa — Dubai */}
        <g>
          <rect x="1172" y="196" width="56" height="54" />
          <rect x="1178" y="166" width="44" height="30" />
          <rect x="1184" y="138" width="32" height="28" />
          <rect x="1189" y="110" width="22" height="28" />
          <rect x="1193" y="86" width="14" height="24" />
          <rect x="1196" y="64" width="8" height="22" />
          <rect x="1198" y="52" width="3" height="16" />
        </g>

        {/* Sydney Opera House */}
        <g>
          <rect x="1252" y="242" width="104" height="8" />
          <path d="M1256 242c2-32 20-48 42-56-16 18-22 36-22 56z" />
          <path d="M1288 242c2-38 22-56 44-64-16 22-22 42-22 64z" />
          <path d="M1322 242c2-26 16-40 32-46-12 16-16 30-16 46z" />
        </g>

        {/* Statue of Liberty — New York */}
        <g>
          <rect x="1380" y="226" width="40" height="24" />
          <rect x="1386" y="212" width="28" height="14" />
          <path d="M1390 212c1-14 3-26 7-34h6c4 8 6 20 7 34z" />
          <path d="M1384 208l-10 22 5 3 10-21zM1392 190h18v5h-18z" />
          <rect x="1399" y="176" width="4" height="16" />
          <circle cx="1401" cy="172" r="5.5" />
          <path d="M1397 165l-4-7 6 3zM1405 165l4-7-6 3zM1401 162v-7z" />
          <rect x="1398" y="138" width="6" height="32" />
          <circle cx="1401" cy="134" r="4" />
          <path d="M1398 132l-3-5h12l-3 5z" />
        </g>

        {/* Empire State Building */}
        <g>
          <rect x="1458" y="190" width="64" height="60" />
          <rect x="1468" y="158" width="44" height="32" />
          <rect x="1478" y="134" width="24" height="24" />
          <rect x="1486" y="114" width="8" height="20" />
          <rect x="1489" y="82" width="2" height="32" />
        </g>
      </g>
    </svg>
  );
}
