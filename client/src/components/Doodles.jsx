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

const Small = ({ size = 72, children }) => (
  <Doodle size={size} viewBox="0 0 64 64">
    {children}
  </Doodle>
);

// Dolma kalem: gövde, tutuş bölgesi, uç (yarık ve nefes deliğiyle), bantlar ve klips
export const FountainPen = ({ size }) => (
  <Small size={size}>
    <g transform="rotate(-40 32 32)">
      <path d="M21 27 L47 27 Q51 27 51 32 Q51 37 47 37 L21 37 Z" />
      <path d="M21 27 Q15.5 28 13.5 30.5 L13.5 33.5 Q15.5 36 21 37" />
      <path d="M14 29.5 Q9 30.2 3.5 32 Q9 33.8 14 34.5" />
      <path d="M3.5 32 L9.5 32" />
      <circle cx="11.2" cy="32" r="1" />
      <path d="M44 27 L44 37" />
      <path d="M46.5 27 L46.5 37" />
      <path d="M31 27 L31 24 Q31 23 32 23 L42 23 L42 27" />
      <path d="M23 35 L41 35" />
      <path d="M25 33.2 L39 33.2" />
      <path d="M23 29.4 L29 29.4" />
    </g>
  </Small>
);

// Kurşun kalem: gövde, uç, silgi, ferrül ve tarama çizgileri
export const Pencil = ({ size }) => (
  <Small size={size}>
    <g transform="rotate(-42 32 32)">
      <path d="M14 26.5 Q30 25 45 26.5 L45 37.5 Q30 39 14 37.5 Z" />
      <path d="M14 26.5 L5.5 32 L14 37.5" />
      <path d="M8.5 30 Q9.2 32 8.5 34" />
      <path d="M41 26.5 Q42 32 41 37.5" />
      <path d="M45 27.5 Q51 26 52 29 L52 35 Q51 38 45 36.5" />
      <path d="M19 32 Q29 31 36 32" />
      <path d="M19 35 Q28 34.2 35 35" />
      <path d="M20 29.4 Q26 28.8 32 29.4" />
    </g>
  </Small>
);

// Kitap yığını: üç kitap, sırt çizgileri ve tarama
export const BookStack = ({ size }) => (
  <Small size={size}>
    <path d="M7 46 Q32 44.5 57 46 L57 54 Q32 55.5 7 54 Z" />
    <path d="M12 46.3 L12 54.4" />
    <path d="M52 46.3 L52 54.4" />
    <path d="M18 50 Q32 49 46 50" />
    <path d="M16 52.4 L28 52.4" />
    <path d="M11 37.5 Q33 36 55 37.5 L55 45.5 Q33 44 11 45.5 Z" />
    <path d="M16 37.6 L16 45.4" />
    <path d="M22 41.5 Q36 40.5 49 41.5" />
    <g transform="rotate(-5 32 32)">
      <path d="M15 27 Q33 25.5 51 27 L51 35 Q33 33.5 15 35 Z" />
      <path d="M20 27.2 L20 34.8" />
      <path d="M24 31 L44 31" />
      <path d="M27 33 L40 33" />
    </g>
  </Small>
);

// Açık defter: iki sayfa, satır çizgileri ve kapak kenarı
export const OpenNotebook = ({ size }) => (
  <Small size={size}>
    <path d="M32 19 Q20 14.5 8 17 L8 49 Q20 46.5 32 51 Z" />
    <path d="M32 19 Q44 14.5 56 17 L56 49 Q44 46.5 32 51 Z" />
    <path d="M32 19 L32 51" />
    <path d="M12.5 24 Q21 22.5 28 26" />
    <path d="M12.5 30 Q21 28.5 28 32" />
    <path d="M12.5 36 Q21 34.5 28 38" />
    <path d="M36 26 Q43 22.5 51.5 24" />
    <path d="M36 32 Q43 28.5 51.5 30" />
    <path d="M36 38 Q43 34.5 51.5 36" />
    <path d="M5.5 18 L5.5 51 Q20 48 32 53.5 Q44 48 58.5 51 L58.5 18" />
  </Small>
);

// Kum saati: çerçeve, cam, üstte kum, akan kum ve altta yığın
export const Hourglass = ({ size }) => (
  <Small size={size}>
    <path d="M14 8 L50 8" />
    <path d="M14 56 L50 56" />
    <path d="M18 8 L18 56" />
    <path d="M46 8 L46 56" />
    <path d="M21 9 Q21 25 32 32 Q21 39 21 55" />
    <path d="M43 9 Q43 25 32 32 Q43 39 43 55" />
    <path d="M24.5 15 Q32 18.5 39.5 15" />
    <path d="M27 19 L37 19" />
    <path d="M32 32 L32 44" strokeDasharray="1.5 2.5" />
    <path d="M24 54.5 Q32 41 40 54.5" />
    <path d="M28 51 L36 51" />
  </Small>
);

// Pergel: menteşe, iki bacak, uçlar ve yay
export const Compass = ({ size }) => (
  <Small size={size}>
    <circle cx="32" cy="11" r="3.2" />
    <path d="M32 7.8 L32 3" />
    <path d="M29.5 3 L34.5 3" />
    <path d="M30.5 13.8 L18 55.5" />
    <path d="M32.5 14.2 L21 55.5" />
    <path d="M18 55.5 L21 55.5" />
    <path d="M19.5 55.5 L19.5 60.5" />
    <path d="M33.5 13.8 L46 55.5" />
    <path d="M31.5 14.2 L43 55.5" />
    <path d="M43 55.5 L46 55.5" />
    <path d="M44.5 55.5 L44.5 60.5" />
    <path d="M23.2 40 Q32 35.5 40.8 40" />
    <path d="M27 24 Q32 27.5 37 24" />
  </Small>
);

// Cetvel: gövde, uzun ve kısa çentikler, tarama
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
      <path d="M10 36.5 Q30 35.5 52 36.5" />
    </g>
  </Small>
);

// Masa lambası: kaide, gövde, eklemler, abajur ve ışık çizgileri
export const DeskLamp = ({ size }) => (
  <Small size={size}>
    <path d="M17 56 Q32 58.5 47 56 L45 53 Q32 51 19 53 Z" />
    <path d="M32 51.5 L32 37" />
    <circle cx="32" cy="35" r="2.2" />
    <path d="M33.5 33.2 L45 17.5" />
    <circle cx="46" cy="15.8" r="2" />
    <path d="M42 11.5 L56 19.5 L51.5 27.5 L37.5 19.5 Z" />
    <path d="M44 16.5 L50 20" />
    <path d="M42 31 L43.5 36" />
    <path d="M47.5 30.5 L50.5 35" />
    <path d="M52.5 29 L56 32.5" />
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
    <path d="M21 41 L27 41" />
    <path d="M22 44 L26 44" />
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

// Mühür: noktalı dış halka, iç halkalar, yıldız ve iki kurdele ucu
export const Seal = ({ size }) => (
  <Small size={size}>
    <circle cx="32" cy="27" r="16" strokeDasharray="1.6 2.6" />
    <circle cx="32" cy="27" r="13" />
    <circle cx="32" cy="27" r="9.5" />
    <path d="M32 19.5 L34 25 L39.8 25.3 L35.2 28.8 L36.8 34.4 L32 31.2 L27.2 34.4 L28.8 28.8 L24.2 25.3 L30 25 Z" />
    <path d="M27 40.5 L23 58 L29.5 53.5 L32 59.5" />
    <path d="M37 40.5 L41 58 L34.5 53.5 L32 59.5" />
  </Small>
);

// Küre: dünya, meridyen, paraleller, kaide ve dış yay
export const Globe = ({ size }) => (
  <Small size={size}>
    <circle cx="32" cy="29" r="17" />
    <path d="M32 12 Q43 29 32 46 Q21 29 32 12" />
    <path d="M15 29 Q32 34 49 29" />
    <path d="M17.5 20 Q32 24 46.5 20" />
    <path d="M17.5 38 Q32 42 46.5 38" />
    <path d="M13 17 Q4 36 20 52" />
    <path d="M32 46 L32 57" />
    <path d="M22 57.5 L42 57.5" />
    <path d="M44 22 L46.5 25" />
    <path d="M45.5 28.5 L48 31.5" />
  </Small>
);

// Mektup zarfı: gövde, kapak, yan kıvrımlar ve tarama
export const Envelope = ({ size }) => (
  <Small size={size}>
    <path d="M8 18 Q32 16.5 56 18 L56 46 Q32 47.5 8 46 Z" />
    <path d="M8 18 L32 36 L56 18" />
    <path d="M8 46 L26 31" />
    <path d="M56 46 L38 31" />
    <path d="M16 43 L28 42.5" />
    <path d="M36 42.5 L48 43" />
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

// Köşe ornamenti: çift çizgili köşe, kıvrım, çentikler ve elmas. Sol üst köşe için çizilir;
// diğer köşeler CSS ile aynalanır.
export const CornerOrnament = ({ size = 84 }) => (
  <Doodle size={size} viewBox="0 0 96 96" className="doodle-corner">
    <path d="M4 94 L4 14 Q4 4 14 4 L94 4" />
    <path d="M11 78 L11 22 Q11 11 22 11 L78 11" />
    <path d="M22 22 Q36 22 36 34 Q36 44 27 44 Q20 44 20 37 Q20 32 25 32" />
    <path d="M44 4 L44 11" />
    <path d="M58 4 L58 11" />
    <path d="M4 44 L11 44" />
    <path d="M4 58 L11 58" />
    <path d="M51 7.5 L54 10.5 L51 13.5 L48 10.5 Z" />
    <circle cx="4" cy="94" r="1.6" />
    <circle cx="94" cy="4" r="1.6" />
  </Doodle>
);

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
