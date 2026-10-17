import { seeded } from '../lib/random.js';

// Temaya özel arka plan. Her tema kendi dünyasını çizer; hepsi sabit konumda, içeriğin ARKASINDA durur,
// tıklamayı engellemez ve ekran okuyuculardan gizlidir. Kartlar dolu renkli olduğu için çizimler
// yalnızca boş alanlarda görünür. Hareket eden her şey "hareketi azalt" ayarında durur (backdrop.css).
//
// Çizimlerin yerleri tohumlu rastgele sayılarla bir kez hesaplanır: sayfa yenilense de aynı yerde kalır.

const VIEW_W = 1600;
const VIEW_H = 1000;

// Masaüstünde sol 258 birim (viewBox) menünün arkasında kalır; içerik yaklaşık 440–1350 arasındadır.
// Bu yüzden ayrıntılar sağ sütuna (1350–1600) ve menü ile içerik arasındaki şeride (260–440) yerleşir.

// --- Gece: yıldız haritası. Samanyolu, takımyıldızlar (Türkçe adlarıyla), Ülker kümesi, gezegen
// yörüngeleri (orrery), kenarlarda harita ölçeği, dönen usturlap, ara sıra kayan yıldız ---

const NIGHT = (() => {
  const r = seeded(1946);
  const stars = Array.from({ length: 190 }, (_, i) => ({
    x: r() * VIEW_W,
    y: r() * VIEW_H,
    size: 0.35 + r() ** 3 * 1.5,
    alpha: 0.18 + r() * 0.5,
    twinkle: i % 9 === 0,
    delay: r() * 6,
  }));
  // Samanyolu: sağ üstten sol alta uzanan çapraz bant boyunca sık, küçük yıldızlar
  const milky = Array.from({ length: 420 }, () => {
    const t = r();
    const spread = (r() + r() + r() - 1.5) * 90; // banda dik yönde, ortada yoğun (yaklaşık normal dağılım)
    return {
      x: 1700 - t * 1900 + spread * 0.45,
      y: -80 + t * 1150 + spread * 0.9,
      size: 0.25 + r() * 0.7,
      alpha: 0.1 + r() * 0.35,
    };
  });
  return { stars, milky };
})();

// Takımyıldızlar: [ad, etiket konumu, yıldızlar]
const CONSTELLATIONS = [
  ['Büyük Ayı', [1390, 300], [[1352, 230], [1400, 250], [1446, 248], [1490, 266], [1520, 320], [1580, 310], [1566, 256]]],
  ['Kuğu', [300, 560], [[340, 470], [352, 540], [360, 610], [300, 530], [410, 552]]],
  ['Kraliçe', [1440, 690], [[1380, 640], [1418, 670], [1450, 632], [1488, 664], [1530, 628]]],
];

// Ülker (Pleiades): yedi kardeş yıldız
const PLEIADES = [
  [320, 180], [336, 172], [346, 186], [330, 196], [352, 202], [318, 206], [340, 214],
];

function Astrolabe() {
  // Derece çentikleri: her 5°'de bir, 15°'lerde uzun, 45°'lerde en uzun
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const deg = i * 5;
    const len = deg % 45 === 0 ? 22 : deg % 15 === 0 ? 14 : 7;
    const a = (deg * Math.PI) / 180;
    return { x1: Math.cos(a) * 250, y1: Math.sin(a) * 250, x2: Math.cos(a) * (250 - len), y2: Math.sin(a) * (250 - len) };
  });
  return (
    <g className="astrolabe" transform="translate(1520 930)">
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

// Gezegen yörüngeleri: güneş ve üç gezegen, her biri kendi hızıyla döner
function Orrery() {
  const orbits = [
    { r: 36, size: 3, dur: 24 },
    { r: 62, size: 4.5, dur: 52 },
    { r: 94, size: 3.5, dur: 96, moon: true },
  ];
  return (
    <g className="orrery" transform="translate(1480 110)">
      <circle r="7" className="sun" />
      {orbits.map((o) => (
        <g key={o.r}>
          <ellipse rx={o.r} ry={o.r * 0.42} className="orbit" />
          {/* Gezegen elips üzerinde değil, eğik çember üzerinde döner: grup y'de basık */}
          <g transform="scale(1 0.42)">
            <g className="planet-arm" style={{ animationDuration: `${o.dur}s` }}>
              <circle cx={o.r} cy="0" r={o.size} className="planet" />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

// Harita kenarı ölçeği: üstte sağ açıklık (0s–24s), sağda yükselim (−90°…+90°)
function ChartScale() {
  const top = Array.from({ length: 25 }, (_, h) => ({ x: 260 + h * 55, h }));
  const right = Array.from({ length: 19 }, (_, i) => ({ y: 40 + i * 50, d: 90 - i * 10 }));
  return (
    <g className="chart-scale">
      <line x1="260" y1="14" x2="1580" y2="14" />
      {top.map((t) => (
        <g key={t.h}>
          <line x1={t.x} y1="14" x2={t.x} y2={t.h % 6 === 0 ? 26 : 20} />
          {t.h % 3 === 0 && (
            <text x={t.x + 3} y="36">
              {t.h}s
            </text>
          )}
        </g>
      ))}
      <line x1="1586" y1="14" x2="1586" y2="990" />
      {right.map((t) => (
        <g key={t.d}>
          <line x1="1586" y1={t.y} x2={t.d % 30 === 0 ? 1572 : 1578} y2={t.y} />
          {t.d % 30 === 0 && (
            <text x="1566" y={t.y + 4} textAnchor="end">
              {t.d > 0 ? `+${t.d}` : t.d}°
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function NightBackdrop() {
  return (
    <>
      <svg className="bd-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="milky-glow">
            <stop offset="0" stopColor="#e9dfc4" stopOpacity="0.07" />
            <stop offset="0.6" stopColor="#e9dfc4" stopOpacity="0.03" />
            <stop offset="1" stopColor="#e9dfc4" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-a">
            <stop offset="0" stopColor="#5fa89e" stopOpacity="0.12" />
            <stop offset="1" stopColor="#5fa89e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-b">
            <stop offset="0" stopColor="#cdb07a" stopOpacity="0.1" />
            <stop offset="1" stopColor="#cdb07a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Bulutsular ve Samanyolu'nun yumuşak ışığı */}
        <ellipse cx="1450" cy="520" rx="260" ry="200" fill="url(#nebula-a)" />
        <ellipse cx="330" cy="820" rx="220" ry="180" fill="url(#nebula-b)" />
        <ellipse cx="750" cy="495" rx="1150" ry="130" transform="rotate(-31.2 750 495)" fill="url(#milky-glow)" />
        <g className="milky">
          {NIGHT.milky.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.size} opacity={s.alpha} />
          ))}
        </g>
        <g className="meridians">
          <ellipse cx="800" cy="1180" rx="1150" ry="560" />
          <ellipse cx="800" cy="1180" rx="1450" ry="760" />
          <ellipse cx="800" cy="-260" rx="1300" ry="420" />
        </g>
        <ChartScale />
        <g className="constellations">
          {CONSTELLATIONS.map(([name, [lx, ly], pts]) => (
            <g key={name}>
              <polyline points={pts.map((p) => p.join(',')).join(' ')} />
              {pts.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" />
              ))}
              <text x={lx} y={ly} className="star-label">
                {name}
              </text>
            </g>
          ))}
          <g className="pleiades">
            {PLEIADES.map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
            ))}
            <circle cx="335" cy="193" r="30" className="ring" />
            <text x="300" y="246" className="star-label">
              Ülker
            </text>
          </g>
          <g className="polaris">
            <path d="M1300 70l4 12 12 4-12 4-4 12-4-12-12-4 12-4z" />
            <text x="1322" y="104" className="star-label">
              Kutup Yıldızı
            </text>
          </g>
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
        <Orrery />
        <Astrolabe />
      </svg>
      {/* Kayan yıldızlar: birkaç saniyede bir, farklı yerlerden */}
      <span className="shooting s1" />
      <span className="shooting s2" />
      <span className="shooting s3" />
    </>
  );
}

// --- Kâğıt: teknik çizim paftası. Milimetrik kenarlar, iletki, gönye, fonksiyon grafiği, iç teğet
// çemberli üçgen, ölçü çizgisi, antet (başlık kutusu), köşelerde hizalama işaretleri ve kenar notları.
// Açılışta her şey sırayla kurşun kalemle çiziliyormuş gibi belirir. ---

function PaperBackdrop() {
  const protractor = Array.from({ length: 37 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / 36;
    const len = i % 9 === 0 ? 18 : i % 3 === 0 ? 11 : 6;
    return { x1: Math.cos(a) * 150, y1: Math.sin(a) * 150, x2: Math.cos(a) * (150 - len), y2: Math.sin(a) * (150 - len) };
  });
  // y = x² ve y = sin x eğrileri (küçük eksen takımında)
  const parabola = Array.from({ length: 41 }, (_, i) => {
    const x = -2 + i * 0.1;
    return `${i ? 'L' : 'M'}${(x * 34).toFixed(1)} ${(-x * x * 26).toFixed(1)}`;
  }).join(' ');
  const sine = Array.from({ length: 61 }, (_, i) => {
    const x = -Math.PI + (i * 2 * Math.PI) / 60;
    return `${i ? 'L' : 'M'}${(x * 21.6).toFixed(1)} ${(-Math.sin(x) * 34).toFixed(1)}`;
  }).join(' ');
  const corner = (x, y) => (
    <g transform={`translate(${x} ${y})`} className="reg-mark">
      <circle r="9" />
      <line x1="-16" y1="0" x2="16" y2="0" />
      <line x1="0" y1="-16" x2="0" y2="16" />
    </g>
  );
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
          <stop offset="0.28" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.82" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.9" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="edges">
          <rect width={VIEW_W} height={VIEW_H} fill="url(#edge-fade)" />
        </mask>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#mm-major)" mask="url(#edges)" />
      {/* Pafta çerçevesi */}
      <rect x="268" y="16" width="1316" height="968" className="frame" />

      <g className="drafting">
        {/* İletki, sağ üst */}
        <g transform="translate(1460 210)" className="draw-in d1">
          <path d="M-150 0A150 150 0 0 1 150 0Z" />
          <path d="M-105 0A105 105 0 0 1 105 0" className="faint" />
          {protractor.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
          <line x1="0" y1="0" x2="-92" y2="-116" className="pencil" />
          <path d="M-32 0A32 32 0 0 1 -20 -25" className="pencil" />
        </g>
        <text x="1396" y="176" className="note">∠ 51°</text>

        {/* Gönye (45° üçgen cetvel), sağ orta */}
        <g transform="translate(1400 400)" className="draw-in d2">
          <path d="M0 0L170 0L0 170Z" />
          <path d="M28 28L118 28L28 118Z" className="faint" />
          {Array.from({ length: 17 }, (_, i) => (
            <line key={i} x1={i * 10} y1="0" x2={i * 10} y2={i % 5 === 0 ? 12 : 6} />
          ))}
        </g>

        {/* Ölçü çizgisi */}
        <g className="draw-in d3" transform="translate(1390 690)">
          <line x1="0" y1="0" x2="180" y2="0" />
          <path d="M0 0l10 -5M0 0l10 5M180 0l-10 -5M180 0l-10 5" />
          <line x1="0" y1="-14" x2="0" y2="14" />
          <line x1="180" y1="-14" x2="180" y2="14" />
          <text x="66" y="-10" className="note small">
            12 cm
          </text>
        </g>

        {/* Antet: teknik çizimin başlık kutusu, sağ alt */}
        <g className="draw-in d4 title-block" transform="translate(1360 810)">
          <rect width="224" height="174" />
          <line x1="0" y1="44" x2="224" y2="44" />
          <line x1="0" y1="88" x2="224" y2="88" />
          <line x1="0" y1="130" x2="224" y2="130" />
          <line x1="112" y1="88" x2="112" y2="174" />
          <text x="12" y="30" className="tb-big">DERS TAKİP</text>
          <text x="12" y="72" className="tb">Çalışma paftası</text>
          <text x="12" y="114" className="tb">ÖLÇEK 1:1</text>
          <text x="124" y="114" className="tb">PAFTA 01</text>
          <text x="12" y="158" className="tb">ÇİZEN: sen</text>
          <text x="124" y="158" className="tb">KONTROL: ✓</text>
        </g>

        {/* Fonksiyon grafiği, sol şerit üstte: y = x² ve y = sin x */}
        <g className="draw-in d2" transform="translate(352 210)">
          <line x1="-80" y1="0" x2="80" y2="0" />
          <line x1="0" y1="-110" x2="0" y2="40" />
          <path d="M80 0l-7 -4M80 0l-7 4M0 -110l-4 7M0 -110l4 7" />
          {[-2, -1, 1, 2].map((t) => (
            <line key={t} x1={t * 34} y1="-3" x2={t * 34} y2="3" />
          ))}
          <path d={parabola} className="curve" />
          <path d={sine} className="pencil" />
          <text x="20" y="-90" className="note small">y = x²</text>
          <text x="40" y="30" className="note small">sin x</text>
        </g>

        {/* İç teğet çemberli üçgen, sol şerit ortada */}
        <g className="draw-in d3" transform="translate(362 520)">
          <path d="M-70 60L80 60L-10 -80Z" />
          <circle cx="-2" cy="15" r="45" className="pencil" />
          <circle cx="-2" cy="15" r="2.5" />
          <line x1="-2" y1="15" x2="-2" y2="60" className="faint" />
          <path d="M-52 60A20 20 0 0 0 -58 44" />
          <text x="-84" y="78" className="note small">A</text>
          <text x="78" y="80" className="note small">B</text>
          <text x="-16" y="-88" className="note small">C</text>
          <text x="6" y="44" className="note small">r</text>
        </g>

        {/* Cetvel, sol şerit altta */}
        <g transform="translate(286 940) rotate(-90)" className="draw-in d4">
          <rect x="-8" y="-4" width="250" height="40" />
          {Array.from({ length: 21 }, (_, i) => (
            <line key={i} x1={i * 12} y1="-4" x2={i * 12} y2={-4 + (i % 10 === 0 ? 18 : i % 5 === 0 ? 12 : 6)} />
          ))}
        </g>

        {corner(282, 30)}
        {corner(1570, 30)}
        {corner(282, 970)}
      </g>
      <g className="notes">
        <text x="300" y="380" className="note">a² + b² = c²</text>
        <text x="300" y="640" className="note">Δ = b² − 4ac</text>
        <text x="1380" y="618" className="note">sin²α + cos²α = 1</text>
        <text x="1410" y="770" className="note">∫₀¹ x dx = ½</text>
      </g>
    </svg>
  );
}

// --- Neon: yağmurlu neon gece. Odak dışı şehir ışıkları (bokeh), çapraz yağmur, ıslak zeminde ışık
// yansımaları ve kenarlarda yanıp sönen neon tabelalar: dikey "ODAK" yazısı, halka, oklar. ---

const NEON = (() => {
  const r = seeded(2077);
  const colors = ['#ff3fa4', '#2fe6ff', '#ffb03f', '#9b5cff'];
  // Işıklar ağırlıkla iki kenarda ve altta; ortaya az
  const bokeh = Array.from({ length: 30 }, (_, i) => {
    const side = i % 3;
    const x = side === 0 ? r() * 24 : side === 1 ? 78 + r() * 22 : 20 + r() * 60;
    const y = side === 2 ? 70 + r() * 30 : r() * 100;
    return {
      x,
      y,
      size: 30 + r() ** 2 * 140,
      color: colors[Math.floor(r() * colors.length)],
      alpha: 0.12 + r() * 0.22,
      dur: 6 + r() * 10,
      delay: -r() * 10,
    };
  });
  return { bokeh };
})();

function NeonBackdrop() {
  return (
    <>
      <div className="neon-sky" />
      <div className="neon-bokeh">
        {NEON.bokeh.map((b, i) => (
          <span
            key={i}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              '--c': b.color,
              '--a': b.alpha,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>
      {/* Neon tabelalar: önce geniş, soluk bir hâle (ışık taşması), üstünde ince parlak tüp */}
      <svg className="bd-svg neon-signs" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        <g className="sign sign-odak" transform="translate(1480 150)">
          <rect x="-46" y="-34" width="92" height="420" rx="14" className="frame" />
          {['O', 'D', 'A', 'K'].map((ch, i) => (
            <g key={ch}>
              <text x="0" y={40 + i * 96} className="halo">
                {ch}
              </text>
              <text x="0" y={40 + i * 96} className={i === 2 ? 'tube flicker' : 'tube'}>
                {ch}
              </text>
            </g>
          ))}
        </g>
        <g className="sign sign-ring" transform="translate(350 220)">
          <circle r="62" className="halo" />
          <circle r="62" className="tube" />
          <circle r="40" className="tube thin flicker-slow" />
        </g>
        <g className="sign sign-arrows" transform="translate(300 600)">
          {[0, 1, 2].map((i) => (
            <g key={i} style={{ animationDelay: `${i * 0.25}s` }} className="chevron">
              <path d={`M${i * 46} 0l30 36l-30 36`} className="halo" />
              <path d={`M${i * 46} 0l30 36l-30 36`} className="tube" />
            </g>
          ))}
        </g>
        <g className="sign sign-bars" transform="translate(1400 760)">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={i * 30} y1="0" x2={i * 30} y2={-30 - ((i * 37) % 70)} className="halo" />
              <line x1={i * 30} y1="0" x2={i * 30} y2={-30 - ((i * 37) % 70)} className="tube eq" style={{ animationDelay: `${i * 0.3}s` }} />
            </g>
          ))}
        </g>
      </svg>
      <div className="neon-rain">
        <span className="rain r1" />
        <span className="rain r2" />
      </div>
      <div className="neon-floor-glow" />
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
