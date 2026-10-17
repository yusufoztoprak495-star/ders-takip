// Deneme sınavları: türler, bölümler ve net hesabı (saf yardımcılar; veri katmanı ve sayfalar kullanır).
// Bölümlerin soru sayıları ÖSYM'nin güncel sınav yapısıyla aynıdır: TYT 120, DGS 100 soru.
// AYT dört testten oluşur (Edebiyat-Sosyal 1: 40, Sosyal 2: 40, Matematik: 40, Fen: 40); öğrenci alanının
// testlerini çözer: Sayısal = Matematik + Fen, Eşit Ağırlık = Matematik + Edebiyat-Sosyal 1,
// Sözel = Edebiyat-Sosyal 1 + Sosyal 2. Her alan ayrı bir deneme türüdür (netler birbiriyle karışmasın).

export const EXAM_TYPES = [
  {
    id: "TYT",
    label: "TYT",
    track: "yks",
    sections: [
      { id: "turkce", label: "Türkçe", count: 40 },
      { id: "sosyal", label: "Sosyal Bilimler", count: 20 },
      { id: "matematik", label: "Temel Matematik", count: 40 },
      { id: "fen", label: "Fen Bilimleri", count: 20 },
    ],
  },
  {
    // Kimlik "AYT" kalır: önceki sürümde girilen sayısal AYT denemeleri aynen geçerli
    id: "AYT",
    label: "AYT Sayısal",
    short: "AYT SAY",
    track: "yks",
    sections: [
      { id: "matematik", label: "Matematik", count: 40 },
      { id: "fizik", label: "Fizik", count: 14 },
      { id: "kimya", label: "Kimya", count: 13 },
      { id: "biyoloji", label: "Biyoloji", count: 13 },
    ],
  },
  {
    id: "AYT-EA",
    label: "AYT Eşit Ağırlık",
    short: "AYT EA",
    track: "yks",
    sections: [
      { id: "matematik", label: "Matematik", count: 40 },
      { id: "edebiyat", label: "Türk Dili ve Edebiyatı", count: 24 },
      { id: "tarih1", label: "Tarih-1", count: 10 },
      { id: "cografya1", label: "Coğrafya-1", count: 6 },
    ],
  },
  {
    id: "AYT-SOZ",
    label: "AYT Sözel",
    short: "AYT SÖZ",
    track: "yks",
    sections: [
      { id: "edebiyat", label: "Türk Dili ve Edebiyatı", count: 24 },
      { id: "tarih1", label: "Tarih-1", count: 10 },
      { id: "cografya1", label: "Coğrafya-1", count: 6 },
      { id: "tarih2", label: "Tarih-2", count: 11 },
      { id: "cografya2", label: "Coğrafya-2", count: 11 },
      { id: "felsefe", label: "Felsefe Grubu", count: 12 },
      { id: "din", label: "Din Kültürü", count: 6 },
    ],
  },
  {
    id: "DGS",
    label: "DGS",
    track: "dgs",
    sections: [
      { id: "sayisal", label: "Sayısal", count: 50 },
      { id: "sozel", label: "Sözel", count: 50 },
    ],
  },
];

// Branş denemesi: tek bir dersin denemesi (Paragraf, Fizik, Problemler...). Soru sayısını kullanıcı girer.
export const BRANCH_TYPE = "BRANS";
export const BRANCH_MAX_QUESTIONS = 200;

// Bir deneme türünün kısa adı (rozet ve grafik düğmeleri için)
export function examShortLabel(id) {
  if (id === BRANCH_TYPE) return "Branş";
  const t = findExamType(id);
  return t ? (t.short ?? t.label) : id;
}

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
