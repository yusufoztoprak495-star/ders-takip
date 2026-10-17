import { seeded } from '../lib/random.js';

// Temaya özel arka plan. Her tema kendi dünyasını çizer; hepsi sabit konumda, içeriğin ARKASINDA durur,
// tıklamayı engellemez ve ekran okuyuculardan gizlidir. Kartlar dolu renkli olduğu için çizimler
// yalnızca boş alanlarda görünür. Hareket eden her şey "hareketi azalt" ayarında durur (backdrop.css).
//
// Çizimlerin yerleri tohumlu rastgele sayılarla bir kez hesaplanır: sayfa yenilense de aynı yerde kalır.

const VIEW_W = 1600;
const VIEW_H = 1000;

// --- Gece: altın yıldız haritası ve yavaş dönen usturlap ---

const NIGHT = (() => {
  const r = seeded(1946);
  const stars = Array.from({ length: 170 }, (_, i) => ({
    x: r() * VIEW_W,
    y: r() * VIEW_H,
    size: 0.35 + r() ** 3 * 1.5,
    alpha: 0.18 + r() * 0.5,
    twinkle: i % 9 === 0,
    delay: r() * 6,
  }));
  // Takımyıldızlar: kenar boşluklarında birkaç yıldızı birleştiren ince çizgiler
  const constellations = [
    [[120, 160], [190, 120], [260, 175], [330, 140], [365, 215]],
    [[1330, 120], [1410, 190], [1480, 150], [1455, 260], [1380, 300]],
    [[90, 640], [170, 700], [140, 790], [230, 840]],
    [[1270, 520], [1340, 560], [1310, 640]],
  ];
  return { stars, constellations };
})();

function Astrolabe() {
  // Derece çentikleri: her 5°'de bir, 15°'lerde uzun, 45°'lerde en uzun
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5;
    const len = deg % 45 === 0 ? 22 : deg % 15 === 0 ? 14 : 7;
    const a = (deg * Math.PI) / 180;
    return { x1: Math.cos(a) * 250, y1: Math.sin(a) * 250, x2: Math.cos(a) * (250 - len), y2: Math.sin(a) * (250 - len) };
  });
  return (
    <g className="astrolabe" transform="translate(1430 900)">
      <g className="astrolabe-ring">
        <circle r="262" />
        <circle r="250" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
        ))}
      </g>
      <circle r="196" className="faint" />
      <ellipse rx="196" ry="96" className="faint" />
      <ellipse rx="96" ry="196" className="faint" />
      <circle r="132" className="faint" strokeDasharray="2 6" />
      <g className="astrolabe-hand">
        <line x1="-210" y1="0" x2="210" y2="0" />
        <circle r="5" />
      </g>
    </g>
  );
}

function NightBackdrop() {
  return (
    <svg className="bd-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
      {/* Gök kubbe yayları: haritanın enlem çizgileri */}
      <g className="meridians">
        <ellipse cx="800" cy="1180" rx="1150" ry="560" />
        <ellipse cx="800" cy="1180" rx="1450" ry="760" />
        <ellipse cx="800" cy="-260" rx="1300" ry="420" />
      </g>
      <g className="constellations">
        {NIGHT.constellations.map((pts, i) => (
          <g key={i}>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} />
            {pts.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
            ))}
          </g>
        ))}
      </g>
      <g className="stars">
        {NIGHT.stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.size}
            opacity={s.alpha}
            className={s.twinkle ? 'twinkle' : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
          />
        ))}
      </g>
      <Astrolabe />
    </svg>
  );
}

// --- Kâğıt: çizim masası; milimetrik kenar, iletki, cetvel, pergel izleri ve kenar notları ---

function PaperBackdrop() {
  const protractor = Array.from({ length: 37 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / 36;
    const len = i % 9 === 0 ? 18 : i % 3 === 0 ? 11 : 6;
    return { x1: Math.cos(a) * 170, y1: Math.sin(a) * 170, x2: Math.cos(a) * (170 - len), y2: Math.sin(a) * (170 - len) };
  });
  const ruler = Array.from({ length: 41 }, (_, i) => ({ x: i * 12, len: i % 10 === 0 ? 18 : i % 5 === 0 ? 12 : 6 }));
  return (
    <svg className="bd-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="mm" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" className="mm-line" />
        </pattern>
        <pattern id="mm-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#mm)" />
          <path d="M100 0H0V100" className="mm-major" />
        </pattern>
        {/* Milimetrik kâğıt yalnızca kenarlarda: ortaya doğru silinir */}
        <linearGradient id="edge-fade" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.24" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.76" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="edges">
          <rect width={VIEW_W} height={VIEW_H} fill="url(#edge-fade)" />
        </mask>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#mm-major)" mask="url(#edges)" />

      <g className="drafting">
        {/* İletki, sağ üst */}
        <g transform="translate(1420 250)" className="draw-in">
          <path d="M-170 0A170 170 0 0 1 170 0Z" />
          <path d="M-120 0A120 120 0 0 1 120 0" className="faint" />
          {protractor.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
          <line x1="0" y1="0" x2="-104" y2="-130" className="pencil" />
          <path d="M-36 0A36 36 0 0 1 -22 -28" className="pencil" />
        </g>
        <text x="1352" y="212" className="note">∠ 51°</text>

        {/* Cetvel, sol alt */}
        <g transform="translate(70 905) rotate(-8)" className="draw-in">
          <rect x="-8" y="-4" width="500" height="44" />
          {ruler.map((t) => (
            <line key={t.x} x1={t.x} y1="-4" x2={t.x} y2={-4 + t.len} />
          ))}
        </g>

        {/* Pergel izi ve teğet doğrusu, sol üst */}
        <g className="draw-in">
          <circle cx="210" cy="250" r="110" className="pencil" strokeDasharray="1 0" />
          <circle cx="210" cy="250" r="3" />
          <line x1="210" y1="250" x2="300" y2="187" className="pencil" />
          <line x1="40" y1="70" x2="420" y2="330" className="faint" />
          <text x="252" y="208" className="note small">r</text>
        </g>
        <text x="96" y="430" className="note">x² + y² = r²</text>

        {/* Ölçü çizgisi, sağ alt */}
        <g className="draw-in" transform="translate(1210 820)">
          <line x1="0" y1="0" x2="300" y2="0" />
          <path d="M0 0l10 -5M0 0l10 5M300 0l-10 -5M300 0l-10 5" />
          <line x1="0" y1="-14" x2="0" y2="14" />
          <line x1="300" y1="-14" x2="300" y2="14" />
          <text x="132" y="-10" className="note small">
            12 cm
          </text>
        </g>
        <text x="1290" y="690" className="note">f′(x) = 2x</text>
      </g>
    </svg>
  );
}

// --- Neon: devre kartı. Kenarlardan içeri uzanan iletken yollar, yollar boyunca akan ışık paketleri,
// yanıp sönen lehim noktaları, bir köşede yavaş tarayan HUD radarı ---

const NEON = (() => {
  const r = seeded(2077);
  const traces = [];
  // Yollar dört kenardan başlar, içeriye doğru 45° kırılarak ilerler; ortadaki içerik sütununa girmez
  const fromEdge = (edge, i) => {
    let x;
    let y;
    let dx;
    let dy;
    if (edge === 'left') [x, y, dx, dy] = [0, 60 + r() * 880, 1, 0];
    else if (edge === 'right') [x, y, dx, dy] = [VIEW_W, 60 + r() * 880, -1, 0];
    else if (edge === 'top') [x, y, dx, dy] = [r() < 0.5 ? 40 + r() * 300 : 1260 + r() * 300, 0, 0, 1];
    else [x, y, dx, dy] = [r() < 0.5 ? 40 + r() * 300 : 1260 + r() * 300, VIEW_H, 0, -1];
    const pts = [[x, y]];
    const segments = 2 + Math.floor(r() * 3);
    for (let k = 0; k < segments; k++) {
      const len = 50 + r() * 150;
      x += dx * len;
      y += dy * len;
      // İçerik sütununa (yaklaşık %24–%76) girmesin
      x = Math.min(Math.max(x, 0), VIEW_W);
      if (x > VIEW_W * 0.24 && x < VIEW_W * 0.76) x = dx > 0 ? VIEW_W * 0.24 : VIEW_W * 0.76;
      pts.push([x, y]);
      // 45° kırılma ya da düz devam
      const turn = r();
      if (dx !== 0 && dy === 0) dy = turn < 0.5 ? (r() < 0.5 ? 1 : -1) : 0;
      else if (dy !== 0 && dx === 0) dx = turn < 0.5 ? (x < VIEW_W / 2 ? 1 : -1) : 0;
      else if (turn < 0.5) dy = 0;
      else dx = 0;
    }
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const length = pts.slice(1).reduce((sum, p, j) => sum + Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]), 0);
    return {
      d,
      end: pts[pts.length - 1],
      length,
      tone: i % 3 === 0 ? 'm' : 'c',
      pulse: r() > 0.35,
      dur: 3 + r() * 5,
      delay: -r() * 8,
      blink: r() * 4,
    };
  };
  const edges = ['left', 'right', 'left', 'right', 'top', 'bottom'];
  for (let i = 0; i < 34; i++) traces.push(fromEdge(edges[i % edges.length], i));
  // Küçük çipler: kenar boşluklarında birkaç dikdörtgen, bacaklarıyla
  const chips = Array.from({ length: 6 }, (_, i) => ({
    x: (i % 2 === 0 ? 60 + r() * 220 : 1320 + r() * 200),
    y: 120 + r() * 760,
    w: 44 + r() * 40,
    h: 28 + r() * 20,
  }));
  return { traces, chips };
})();

function NeonBackdrop() {
  return (
    <>
      <svg className="bd-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Altıgen mikro ızgara: kartın baskı deseni */}
          <pattern id="hex" width="28" height="48.5" patternUnits="userSpaceOnUse" patternTransform="scale(1.1)">
            <path d="M14 0L28 8.08V24.25L14 32.33L0 24.25V8.08Z M14 32.33V48.5" className="hex" />
          </pattern>
          <radialGradient id="neon-haze" cx="50%" cy="40%" r="75%">
            <stop offset="0" style={{ stopColor: 'var(--bd-sky-mid)' }} />
            <stop offset="1" style={{ stopColor: 'var(--bd-sky-top)' }} />
          </radialGradient>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#neon-haze)" />
        <rect width={VIEW_W} height={VIEW_H} fill="url(#hex)" className="hex-field" />
        <g className="traces">
          {NEON.traces.map((t, i) => (
            <path key={i} d={t.d} className={`trace tone-${t.tone}`} />
          ))}
        </g>
        {/* Işık paketleri: aynı yolun üstünde kısa, parlak bir çizgi; yol boyunca akar */}
        <g className="pulses">
          {NEON.traces
            .filter((t) => t.pulse)
            .map((t, i) => (
              <path
                key={i}
                d={t.d}
                className={`pulse tone-${t.tone}`}
                style={{
                  strokeDasharray: `18 ${Math.ceil(t.length) + 40}`,
                  '--len': Math.ceil(t.length) + 58,
                  animationDuration: `${t.dur}s`,
                  animationDelay: `${t.delay}s`,
                }}
              />
            ))}
        </g>
        <g className="pads">
          {NEON.traces.map((t, i) => (
            <circle
              key={i}
              cx={t.end[0]}
              cy={t.end[1]}
              r="3.2"
              className={`pad tone-${t.tone}`}
              style={{ animationDelay: `${t.blink}s` }}
            />
          ))}
        </g>
        <g className="chips">
          {NEON.chips.map((c, i) => (
            <g key={i} transform={`translate(${c.x} ${c.y})`}>
              <rect width={c.w} height={c.h} rx="2" />
              {Array.from({ length: Math.floor(c.w / 9) }, (_, k) => (
                <g key={k}>
                  <line x1={6 + k * 9} y1="-6" x2={6 + k * 9} y2="0" />
                  <line x1={6 + k * 9} y1={c.h} x2={6 + k * 9} y2={c.h + 6} />
                </g>
              ))}
            </g>
          ))}
        </g>
      </svg>
      {/* HUD radarı: sağ altta, yarısı ekran dışında; tarama ışını yavaşça döner */}
      <div className="neon-radar">
        <svg viewBox="-200 -200 400 400" className="radar-rings">
          <circle r="190" />
          <circle r="140" />
          <circle r="90" />
          <circle r="40" />
          <line x1="-200" y1="0" x2="200" y2="0" />
          <line x1="0" y1="-200" x2="0" y2="200" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const inner = i % 9 === 0 ? 172 : 182;
            return <line key={i} x1={Math.cos(a) * inner} y1={Math.sin(a) * inner} x2={Math.cos(a) * 190} y2={Math.sin(a) * 190} />;
          })}
        </svg>
        <div className="radar-sweep" />
        <span className="radar-blip b1" />
        <span className="radar-blip b2" />
      </div>
      <div className="neon-scan" />
    </>
  );
}

// --- Pastel: çıkartma defteri. Kenarlarda kalın mürekkep çizgili, düz gölgeli geometrik çıkartmalar:
// gökkuşağı kemeri, yarım güneş, zikzak, yıldız, nokta kümesi. Yavaşça sallanır ya da döner. ---

// Her çıkartma: şekil, renk, ekrandaki yer (yüzde), boyut, açı ve hareket
const STICKERS = [
  { kind: 'arch', fill: ['--peach', '--lilac', '--mint'], x: 89, y: 78, size: 260, rot: 0, move: 'none' },
  { kind: 'sun', fill: ['--butter'], x: 93, y: 6, size: 190, rot: 180, move: 'spin' },
  { kind: 'star', fill: ['--lilac'], x: 20, y: 18, size: 54, rot: -12, move: 'bob' },
  { kind: 'zigzag', fill: ['--accent-2'], x: 19.5, y: 58, size: 90, rot: 8, move: 'bob' },
  { kind: 'dots', fill: ['--ink'], x: 87, y: 40, size: 70, rot: 0, move: 'none' },
  { kind: 'blob', fill: ['--mint'], x: 21, y: 84, size: 80, rot: 20, move: 'bob' },
  { kind: 'star', fill: ['--peach'], x: 83, y: 58, size: 40, rot: 14, move: 'bob' },
  { kind: 'ring', fill: ['--sky'], x: 22, y: 36, size: 46, rot: 0, move: 'bob' },
];

function Sticker({ kind, fill }) {
  const c = (i) => `var(${fill[i] ?? fill[0]})`;
  switch (kind) {
    case 'arch':
      // Üç bantlı kemer (alt kısmı ekran dışında kalır)
      return (
        <g>
          <path d="M10 100A90 90 0 0 1 190 100H160A60 60 0 0 0 40 100Z" style={{ fill: c(0) }} />
          <path d="M40 100A60 60 0 0 1 160 100H130A30 30 0 0 0 70 100Z" style={{ fill: c(1) }} />
          <path d="M70 100A30 30 0 0 1 130 100Z" style={{ fill: c(2) }} />
        </g>
      );
    case 'sun':
      return (
        <g>
          <circle cx="100" cy="100" r="46" style={{ fill: c(0) }} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x="96"
              y="22"
              width="8"
              height="26"
              rx="4"
              style={{ fill: c(0) }}
              transform={`rotate(${i * 30} 100 100)`}
            />
          ))}
        </g>
      );
    case 'star':
      return (
        <path
          d="M100 14L124 72L186 76L138 116L154 178L100 144L46 178L62 116L14 76L76 72Z"
          style={{ fill: c(0) }}
          strokeLinejoin="round"
        />
      );
    case 'zigzag':
      return <path d="M10 120L50 70L90 120L130 70L170 120L190 95" className="line" style={{ stroke: c(0) }} />;
    case 'dots':
      return (
        <g className="nostroke">
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={30 + (i % 4) * 46} cy={30 + Math.floor(i / 4) * 46} r="7" style={{ fill: c(0) }} />
          ))}
        </g>
      );
    case 'ring':
      return <circle cx="100" cy="100" r="64" className="line" style={{ stroke: c(0) }} />;
    default:
      return (
        <path
          d="M60 30C110 0 180 40 170 100S120 190 70 170S10 60 60 30Z"
          style={{ fill: c(0) }}
        />
      );
  }
}

function PastelBackdrop() {
  return (
    <div className="stickers">
      {STICKERS.map((st, i) => (
        <svg
          key={i}
          viewBox="0 0 200 200"
          className={`sticker move-${st.move} kind-${st.kind} ${st.x < 50 ? 'left' : 'right'}`}
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: `${st.size}px`,
            height: `${st.size}px`,
            '--rot': `${st.rot}deg`,
            animationDelay: `${-i * 1.7}s`,
          }}
        >
          {/* Düz gölge: aynı şeklin mürekkep renkli kopyası, sağa-aşağı kaydırılmış */}
          <g className="sticker-shadow" transform="translate(7 7)">
            <Sticker kind={st.kind} fill={['--ink']} />
          </g>
          <Sticker kind={st.kind} fill={st.fill} />
        </svg>
      ))}
    </div>
  );
}

const BY_THEME = {
  dark: NightBackdrop,
  light: PaperBackdrop,
  neon: NeonBackdrop,
  pastel: PastelBackdrop,
};

export default function Backdrop({ theme }) {
  const Scene = BY_THEME[theme] ?? NightBackdrop;
  return (
    <div className={`backdrop backdrop-${theme}`} aria-hidden="true">
      <Scene />
    </div>
  );
}
