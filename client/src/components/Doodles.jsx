// Uygulamaya özel el çizimi tarzı çizgi motifleri (hazır ikon paketi yok).
// Hepsi aynı dili konuşur: tek renk (currentColor), her boyutta aynı 1.5px çizgi kalınlığı
// (vector-effect: non-scaling-stroke), yuvarlak uçlar, dolgu yok, hafif yamuk "elle çizilmiş" eğriler.

function Doodle({ size, width, height, viewBox, children, className = '' }) {
  return (
    <svg
      className={`doodle ${className}`}
      viewBox={viewBox}
      width={width ?? size}
      height={height ?? size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

const Small = ({ size = 72, children }) => (
  <Doodle size={size} viewBox="0 0 64 64">
    {children}
  </Doodle>
);

// Kitap: kapak, sırt, sayfa kenarı, başlık çizgileri ve ayraç
export const Book = ({ size }) => (
  <Small size={size}>
    <path d="M14 12 Q13 10.5 16 10 L44 9 Q48.5 9 48.5 13.5 L49 46 Q49 49.5 45 49.5 L16 50.5 Q12 50.5 12 46.5 Z" />
    <path d="M19.5 10.5 Q18.5 30 19.5 50" />
    <path d="M16 50.5 Q16.5 55 21 54.5 L47 53.5 Q51 53 50 49.5" />
    <path d="M26 21 Q34 19.5 42 21" />
    <path d="M26 27.5 Q32 26.5 38 27.5" />
    <path d="M37.5 9.5 L37.5 18 L40.5 15.5 L43.5 18 L43.5 9" />
  </Small>
);

// Kurşun kalem: gövde, uç, silgi ve gövde çizgisi (çapraz duruyor)
export const Pencil = ({ size }) => (
  <Small size={size}>
    <g transform="rotate(-42 32 32)">
      <path d="M14 26.5 Q30 25 45 26.5 L45 37.5 Q30 39 14 37.5 Z" />
      <path d="M14 26.5 L5.5 32 L14 37.5" />
      <path d="M8.5 30 Q9.2 32 8.5 34" />
      <path d="M41 26.5 Q42 32 41 37.5" />
      <path d="M45 27.5 Q51 26 52 29 L52 35 Q51 38 45 36.5" />
      <path d="M19 32 Q29 31 36 32" />
    </g>
  </Small>
);

// Cetvel: gövde ve uzun/kısa çentikler
export const Ruler = ({ size }) => (
  <Small size={size}>
    <g transform="rotate(-14 32 32)">
      <path d="M6 22 Q32 20 58 22.5 L58.5 40 Q32 42 5.5 40 Z" />
      <path d="M13 22 L13 31" />
      <path d="M19 21.7 L19 27" />
      <path d="M25 21.5 L25 27.5" />
      <path d="M31 21.3 L31 31" />
      <path d="M37 21.3 L37 27" />
      <path d="M43 21.5 L43 27.5" />
      <path d="M49 21.8 L49 31" />
      <path d="M54 22 L54 26.5" />
    </g>
  </Small>
);

// Kahve fincanı: fincan, kulp, tabak ve iki buhar kıvrımı
export const Coffee = ({ size }) => (
  <Small size={size}>
    <path d="M14.5 27 Q31 23 47.5 27 Q31 31 14.5 27" />
    <path d="M14.5 27 L17.5 46 Q18.5 52.5 25 52.5 L37 52.5 Q43.5 52.5 44.5 46 L47.5 27" />
    <path d="M46.5 31 Q56 30 55 38 Q54 45.5 44.5 44.5" />
    <path d="M9 57 Q31 60.5 53 57" />
    <path d="M24 19 Q20.5 15 24.5 12 Q28 9 25 4.5" />
    <path d="M34 19.5 Q30.5 15.5 34.5 12.5 Q38 9.5 35 5" />
  </Small>
);

// Ataç: iç içe iki kıvrım
export const Paperclip = ({ size }) => (
  <Small size={size}>
    <g transform="rotate(18 32 32)">
      <path d="M27 42 L27 21 Q27 14.5 32.5 14.5 Q38 14.5 38 21 L38 43.5 Q38 50 32 50 Q26 50 26 43.5 L26 19 Q26 8 33 8 Q40.5 8 40.5 19 L40.5 45 Q40.5 55 31.5 55 Q22.5 55 22.5 45 L22.5 29" />
    </g>
  </Small>
);

// Not kâğıdı: katlanmış köşe ve satır çizgileri
export const Note = ({ size }) => (
  <Small size={size}>
    <path d="M12 11.5 Q31 9.5 51.5 12 Q52.5 28 51.5 39.5 L39.5 52 Q26 53 13 51.5 Q11 31 12 11.5 Z" />
    <path d="M39.5 52 Q39 45 40.5 40.5 Q46 40.5 51.5 39.5" />
    <path d="M18.5 20.5 Q30 19 44 20.5" />
    <path d="M18.5 28 Q28 27 40 28" />
    <path d="M18.5 35.5 Q25 34.5 31 35.5" />
  </Small>
);

// --- Boş durumlar için büyük çizimler (aynı çizgi kalınlığı, daha çok ayrıntı) ---

const Big = ({ width = 160, children }) => (
  <Doodle viewBox="0 0 160 120" width={width} height={(width * 120) / 160}>
    {children}
  </Doodle>
);

const Sparkle = ({ x, y, r = 5 }) => (
  <path d={`M${x} ${y - r} L${x} ${y + r} M${x - r} ${y} L${x + r} ${y}`} />
);

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
