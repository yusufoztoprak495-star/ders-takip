// Uygulamaya özel gravür / lüks kırtasiye illüstrasyonu tarzı çizgi motifleri (hazır ikon paketi yok).
// Hepsi aynı dili konuşur: tek renk (currentColor, CSS'te altın), her boyutta aynı ince çizgi kalınlığı
// (vector-effect: non-scaling-stroke), yuvarlak uçlar, dolgu yok, hafif yamuk "elle çizilmiş" eğriler
// ve gravür hissi veren kısa tarama (hatch) çizgileri.

function Doodle({ size, width, height, viewBox, children, className = '' }) {
  return (
    <svg
      className={`doodle ${className}`}
      viewBox={viewBox}
      width={width ?? size}
      height={height ?? size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

// vector-effect her çizgiye uygulanır (SVG'de kalıtılmaz), bu yüzden CSS'te `.doodle *` ile verilir.

// --- Boş durumlar için büyük çizimler (aynı çizgi dili, daha çok ayrıntı) ---

const Big = ({ width = 160, children }) => (
  <Doodle viewBox="0 0 160 120" width={width} height={(width * 120) / 160}>
    {children}
  </Doodle>
);

const Sparkle = ({ x, y, r = 5 }) => <path d={`M${x} ${y - r} L${x} ${y + r} M${x - r} ${y} L${x + r} ${y}`} />;

// Açık kitap ve ışıltılar: "henüz kitap yok"
export const EmptyBook = ({ width }) => (
  <Big width={width}>
    <path d="M80 42 Q62 33.5 33 37 Q32 66 34 93 Q62 89 80 97.5 Z" />
    <path d="M80 42 Q98 33.5 127 37 Q128 66 126 93 Q98 89 80 97.5 Z" />
    <path d="M80 42 L80 97.5" />
    <path d="M43 51 Q59 49.5 72 55" />
    <path d="M43 61 Q59 59.5 72 65" />
    <path d="M43 71 Q57 69.5 72 75" />
    <path d="M89 55 Q101 49.5 117 51" />
    <path d="M89 65 Q101 59.5 117 61" />
    <path d="M29 100 Q80 109 131 100" />
    <Sparkle x={139} y={24} r={6} />
    <Sparkle x={24} y={26} r={4} />
    <Sparkle x={120} y={14} r={3} />
  </Big>
);

// Not kâğıdı, ataç ve kalem: "henüz kayıt yok"
export const EmptyNote = ({ width }) => (
  <Big width={width}>
    <path d="M44 24 Q80 21 118 25 Q120 56 118 88 L96 103 Q70 105 46 102 Q42 63 44 24 Z" />
    <path d="M96 103 Q95 92 98 88 Q108 88 118 88" />
    <path d="M56 42 Q82 40 106 42" />
    <path d="M56 54 Q78 52.5 98 54" />
    <path d="M56 66 Q72 64.5 86 66" />
    <path d="M56 78 Q66 77 76 78" />
    <path d="M70 26 L70 12 Q70 6 76 6 Q82 6 82 12 L82 34" />
    <g transform="translate(12 8) rotate(-38 132 84)">
      <path d="M118 78 Q132 77 146 78 L146 90 Q132 91 118 90 Z" />
      <path d="M118 78 L110 84 L118 90" />
    </g>
    <Sparkle x={26} y={40} r={4} />
    <Sparkle x={140} y={30} r={3} />
  </Big>
);

// Eksenler ve kesikli çubuklar: "henüz veri yok"
export const EmptyChart = ({ width }) => (
  <Big width={width}>
    <path d="M30 20 L30 96 Q30 98 32 98 L132 98" />
    <path d="M44 98 L44 74 Q44 72.5 46 72.5 L56 72.5 Q58 72.5 58 74 L58 98" strokeDasharray="3 4" />
    <path d="M70 98 L70 56 Q70 54.5 72 54.5 L82 54.5 Q84 54.5 84 56 L84 98" strokeDasharray="3 4" />
    <path d="M96 98 L96 38 Q96 36.5 98 36.5 L108 36.5 Q110 36.5 110 38 L110 98" strokeDasharray="3 4" />
    <path d="M42 62 Q70 48 110 24" strokeDasharray="1 5" />
    <path d="M102 22 L111 23.5 L108 32" />
    <Sparkle x={128} y={50} r={4} />
  </Big>
);
