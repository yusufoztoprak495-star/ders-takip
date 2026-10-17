// YKS puan ve sıralama TAHMİNİ. ÖSYM puanları her yıl adayların standart sapmasına göre hesaplar ve
// katsayıları önceden açıklamaz; aşağıdaki katsayılar puan hesaplayıcılarda yaygın kullanılan, geçmiş
// yılların sonuçlarından çıkarılmış yaklaşık değerlerdir. Sonuçlar yalnızca fikir verir, kesin değildir.
//
// Ham puan = 100 + Σ (net × katsayı). Yerleştirme puanı = ham puan + OBP katkısı
// (diploma notu × 5 = OBP; OBP × 0,12, önceki yıl bir programa yerleşenlerde × 0,06).

const TYT_IN_TYT = { turkce: 3.3, sosyal: 3.4, matematik: 3.3, fen: 3.4 };
const TYT_IN_AYT = { turkce: 1.32, sosyal: 1.36, matematik: 1.32, fen: 1.36 };

export const SCORE_TYPES = [
  { id: "TYT", label: "TYT", tyt: TYT_IN_TYT, ayt: {} },
  { id: "SAY", label: "Sayısal (SAY)", tyt: TYT_IN_AYT, ayt: { matematik: 3, fizik: 2.85, kimya: 3.07, biyoloji: 3.07 }, exam: "AYT" },
  { id: "EA", label: "Eşit Ağırlık (EA)", tyt: TYT_IN_AYT, ayt: { matematik: 3, edebiyat: 3, tarih1: 2.8, cografya1: 3.33 }, exam: "AYT-EA" },
  {
    id: "SOZ",
    label: "Sözel (SÖZ)",
    tyt: TYT_IN_AYT,
    ayt: { edebiyat: 3, tarih1: 2.8, cografya1: 3.33, tarih2: 2.91, cografya2: 2.91, felsefe: 3, din: 3.33 },
    exam: "AYT-SOZ",
  },
];

const round2 = (n) => Math.round(n * 100) / 100;

// nets: { tyt: { bölüm: net }, ayt: { bölüm: net } } — eksi net 0 sayılır
export function rawScore(typeId, nets) {
  const type = SCORE_TYPES.find((t) => t.id === typeId);
  const part = (coefs, values = {}) =>
    Object.entries(coefs).reduce((sum, [key, coef]) => sum + Math.max(0, values[key] ?? 0) * coef, 0);
  return round2(100 + part(type.tyt, nets.tyt) + part(type.ayt, nets.ayt));
}

export function obpContribution(diploma, placedLastYear = false) {
  return round2(diploma * 5 * (placedLastYear ? 0.06 : 0.12));
}

export function placementScore(raw, diploma, placedLastYear = false) {
  return round2(raw + obpContribution(diploma, placedLastYear));
}

// 2025-YKS yerleştirme puanlarının yığınsal dağılımı (ÖSYM sayısal bilgiler; "bu puan ve üzeri aday sayısı").
// Kaynak tablo testyurdu.com üzerinden alındı; birkaç üniversitenin açıkladığı taban puan/sıralamayla uyumlu.
const PUANLAR = [550, 530, 510, 490, 470, 450, 430, 410, 390, 370, 350, 330, 310, 290, 270, 250, 230, 210, 190, 170, 150];
const SIRALAR = {
  SAY: [57, 1930, 7081, 16140, 29410, 46142, 65449, 87117, 111498, 139619, 174355, 217778, 274252, 348397, 449880, 596635, 811201, 1052783, 1228141, 1287932, 1291491],
  EA: [4, 58, 261, 742, 1629, 3422, 8145, 20244, 42590, 76959, 125389, 192949, 287630, 418975, 592803, 806796, 1042314, 1262545, 1425544, 1489209, 1494521],
  SOZ: [1, 7, 26, 77, 254, 721, 1926, 5036, 12522, 28323, 57848, 108894, 190203, 309551, 468930, 658973, 849410, 1010174, 1121933, 1168866, 1173955],
  TYT: [14, 601, 3648, 11733, 27141, 52500, 88915, 137133, 201126, 286158, 397823, 545280, 737144, 976188, 1251236, 1542701, 1835041, 2099883, 2270224, 2308495, 2310553],
};
export const RANK_YEAR = 2025;

// Yerleştirme puanından tahmini başarı sırası: tablodaki iki puan arasında logaritmik ara değer
// (sıra puanla üstel değişir). Tablonun üstünde/altında uçlara sabitlenir.
export function estimateRank(typeId, score) {
  const ranks = SIRALAR[typeId];
  if (score >= PUANLAR[0]) {
    // 550 üstü: 550'deki sıranın altına, puan arttıkça 1'e doğru
    return Math.max(1, Math.round(ranks[0] * Math.pow(10, -(score - PUANLAR[0]) / 20)));
  }
  if (score <= PUANLAR[PUANLAR.length - 1]) return ranks[ranks.length - 1];
  const i = PUANLAR.findIndex((p) => p <= score); // score, PUANLAR[i-1] ile PUANLAR[i] arasında
  const t = (PUANLAR[i - 1] - score) / (PUANLAR[i - 1] - PUANLAR[i]);
  const log = Math.log10(ranks[i - 1]) + t * (Math.log10(ranks[i]) - Math.log10(ranks[i - 1]));
  return Math.round(Math.pow(10, log));
}

// Tersi: hedef başarı sırası için gereken yaklaşık yerleştirme puanı (iki ondalık)
export function scoreForRank(typeId, rank) {
  const ranks = SIRALAR[typeId];
  if (rank >= ranks[ranks.length - 1]) return PUANLAR[PUANLAR.length - 1];
  if (rank <= ranks[0]) return round2(PUANLAR[0] + 20 * Math.log10(ranks[0] / Math.max(1, rank)));
  const i = ranks.findIndex((r) => r >= rank); // rank, ranks[i-1] ile ranks[i] arasında
  const t = (Math.log10(rank) - Math.log10(ranks[i - 1])) / (Math.log10(ranks[i]) - Math.log10(ranks[i - 1]));
  return round2(PUANLAR[i - 1] - t * (PUANLAR[i - 1] - PUANLAR[i]));
}
