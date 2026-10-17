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

// --- Neon: mor gece, ışıklı şehir silueti, kayan ızgara, yağan matematik sembolleri ---

const NEON = (() => {
  const r = seeded(2077);
  const glyphs = '∑∫π√∞Δθλ∂≈≠01ƒ∇×±';
  const columns = Array.from({ length: 16 }, (_, i) => {
    // Sütunlar iki kenar şeridine dağılır (orta, içerik sütunu)
    const side = i % 2 === 0 ? r() * 20 : 80 + r() * 18;
    return {
      left: side,
      duration: 11 + r() * 14,
      delay: -r() * 20,
      text: Array.from({ length: 14 }, () => glyphs[Math.floor(r() * glyphs.length)]).join(''),
      tone: r() > 0.35 ? 'c' : 'm',
    };
  });
  // Şehir silueti: binalar ve yanan pencereler
  const buildings = [];
  let x = 0;
  while (x < VIEW_W) {
    const w = 34 + r() * 70;
    const h = 60 + r() ** 1.6 * 230;
    const windows = [];
    for (let wy = 14; wy < h - 10; wy += 16) {
      for (let wx = 8; wx < w - 8; wx += 12) {
        if (r() > 0.78) windows.push({ x: x + wx, y: VIEW_H * 0.62 - h + wy, flick: r() > 0.85, d: r() * 5 });
      }
    }
    buildings.push({ x, w, h, windows, antenna: r() > 0.8 });
    x += w + 2 + r() * 10;
  }
  return { columns, buildings };
})();

function NeonBackdrop() {
  const horizon = VIEW_H * 0.62;
  return (
    <>
      <svg className="bd-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="neon-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--bd-sky-top)" }} />
            <stop offset="0.62" style={{ stopColor: "var(--bd-sky-mid)" }} />
            <stop offset="1" style={{ stopColor: "var(--bd-sky-top)" }} />
          </linearGradient>
          <linearGradient id="neon-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd23f" />
            <stop offset="0.55" stopColor="#ff3fa4" />
            <stop offset="1" stopColor="#7b2bff" />
          </linearGradient>
          {/* Güneşin alt yarısındaki yatay yarıklar */}
          <mask id="sun-slits">
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#fff" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} x="0" y={horizon - 120 + i * 18 + i * i * 1.2} width={VIEW_W} height={3 + i * 1.4} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#neon-sky)" />
        <circle cx={VIEW_W / 2} cy={horizon - 40} r="190" fill="url(#neon-sun)" mask="url(#sun-slits)" className="neon-sun" />
        <g className="skyline">
          {NEON.buildings.map((b) => (
            <g key={b.x}>
              <rect x={b.x} y={horizon - b.h} width={b.w} height={b.h} />
              {b.antenna && <line x1={b.x + b.w / 2} y1={horizon - b.h} x2={b.x + b.w / 2} y2={horizon - b.h - 34} />}
              {b.windows.map((w) => (
                <rect
                  key={`${w.x}-${w.y}`}
                  x={w.x}
                  y={w.y}
                  width="5"
                  height="7"
                  className={w.flick ? 'win flick' : 'win'}
                  style={w.flick ? { animationDelay: `${w.d}s` } : undefined}
                />
              ))}
            </g>
          ))}
        </g>
        <line x1="0" y1={horizon} x2={VIEW_W} y2={horizon} className="horizon" />
      </svg>
      {/* Kayan ızgara: perspektifli bir düzlem; çizgiler sonsuza değil izleyiciye doğru akar */}
      <div className="neon-floor">
        <div className="neon-grid" />
      </div>
      <div className="neon-rain">
        {NEON.columns.map((c, i) => (
          <span
            key={i}
            className={`glyphs tone-${c.tone}`}
            style={{ left: `${c.left}%`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
          >
            {c.text}
          </span>
        ))}
      </div>
      <div className="neon-scan" />
      <div className="neon-glitch" />
    </>
  );
}

// --- Pastel: süzülen renk bulutları, kâğıttan kesilmiş gibi yıldızlar, halkalar, kıvrımlar ---

const PASTEL = (() => {
  const r = seeded(314);
  const kinds = ['sparkle', 'ring', 'squiggle', 'dot', 'cloud', 'sparkle', 'ring', 'tri'];
  const tones = ['lav', 'mint', 'peach', 'sky', 'rose'];
  return Array.from({ length: 22 }, (_, i) => {
    const leftSide = i % 2 === 0;
    return {
      kind: kinds[i % kinds.length],
      tone: tones[Math.floor(r() * tones.length)],
      // Sol şerit menü ile içerik arasında, sağ şerit içeriğin sağında
      x: leftSide ? 16.5 + r() * 7 : 84 + r() * 13,
      y: 4 + r() * 88,
      size: 18 + r() * 34,
      rot: Math.round(r() * 60 - 30),
      dur: 7 + r() * 8,
      delay: -r() * 10,
    };
  });
})();

function PastelShape({ kind }) {
  switch (kind) {
    case 'sparkle':
      return <path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" className="fill" />;
    case 'ring':
      return <circle cx="12" cy="12" r="9" className="stroke" />;
    case 'squiggle':
      return <path d="M1 14C5 6 8 6 12 12S19 18 23 10" className="stroke" />;
    case 'dot':
      return <circle cx="12" cy="12" r="5" className="fill" />;
    case 'cloud':
      return (
        <path
          d="M6 18H19A5 5 0 0 0 19 8A6.5 6.5 0 0 0 6.6 9.6A4.3 4.3 0 0 0 6 18Z"
          className="fill"
        />
      );
    default:
      return <path d="M12 3L22 20H2Z" className="stroke" />;
  }
}

function PastelBackdrop() {
  return (
    <>
      <div className="pastel-blobs">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="blob b4" />
      </div>
      <div className="pastel-shapes">
        {PASTEL.map((s, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={`pastel-shape tone-${s.tone}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              '--rot': `${s.rot}deg`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          >
            <PastelShape kind={s.kind} />
          </svg>
        ))}
      </div>
    </>
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
