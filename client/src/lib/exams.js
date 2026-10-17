// Deneme sınavları: türler, bölümler ve net hesabı (saf yardımcılar; veri katmanı ve sayfalar kullanır).
// Bölümlerin soru sayıları ÖSYM'nin güncel sınav yapısıyla aynıdır: TYT 120, AYT sayısal 80, DGS 100 soru.

export const EXAM_TYPES = [
  {
    id: "TYT",
    track: "yks",
    sections: [
      { id: "turkce", label: "Türkçe", count: 40 },
      { id: "sosyal", label: "Sosyal Bilimler", count: 20 },
      { id: "matematik", label: "Temel Matematik", count: 40 },
      { id: "fen", label: "Fen Bilimleri", count: 20 },
    ],
  },
  {
    id: "AYT",
    track: "yks",
    sections: [
      { id: "matematik", label: "Matematik", count: 40 },
      { id: "fizik", label: "Fizik", count: 14 },
      { id: "kimya", label: "Kimya", count: 13 },
      { id: "biyoloji", label: "Biyoloji", count: 13 },
    ],
  },
  {
    id: "DGS",
    track: "dgs",
    sections: [
      { id: "sayisal", label: "Sayısal", count: 50 },
      { id: "sozel", label: "Sözel", count: 50 },
    ],
  },
];

// Seçili hedefin deneme türleri (üniversitede deneme yok: boş liste)
export function examTypesFor(track) {
  return EXAM_TYPES.filter((t) => t.track === track);
}

export function findExamType(id) {
  return EXAM_TYPES.find((t) => t.id === id) ?? null;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Bir bölümün neti: doğru − yanlış / 4
export function sectionNet({ correct, wrong }) {
  return round2(correct - wrong / 4);
}

// Denemenin toplam doğru/yanlış/boş ve neti
export function examTotals(exam) {
  const rows = Object.values(exam.results ?? {});
  const sum = (key) => rows.reduce((s, r) => s + (r[key] ?? 0), 0);
  const correct = sum("correct");
  const wrong = sum("wrong");
  return { correct, wrong, blank: sum("blank"), net: round2(correct - wrong / 4) };
}
