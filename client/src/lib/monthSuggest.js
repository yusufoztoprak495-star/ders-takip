// Akıllı öneri: bu ayın konuları bittiğinde ne yapılacağını önerir. Saf fonksiyon; veriyi sayfa getirir.
// Üç öneri grubu vardır (sırayla):
//  carry  Önceki aydan bitmeyenler: yetişmeyen konular bu aya TAŞINIR.
//  review Önceki ayı tekrar: geçen ay bitirdiğin konular, baştan sırayla, tekrar için bu aya KOPYALANIR.
//  pull   Sonraki ayı öne çek: gelecek ayın bitmemiş konuları bu aya TAŞINIR.
// Bu ayda zaten olan konu (aynı ders, aynı ad) tekrar önerilmez. Konular ders sırasına, sonra kimliğe göre dizilir.
// "Önce ilk kısmı sor": her grupta sıradaki ilk FIRST_PART konu önceden işaretlenir; gerisini kullanıcı seçer.

export const FIRST_PART = 5;

const lower = (text) => text.toLocaleLowerCase("tr");
const keyOf = (r) => `${r.subjectId}|${lower(r.title)}`;

const META = {
  carry: {
    mode: "move",
    title: "Önceki aydan bitmeyenler",
    hint: "Geçen ay yetişmeyen konular. Seçtiklerin bu aya taşınır.",
  },
  review: {
    mode: "copy",
    title: "Önceki ayı tekrar",
    hint: "Geçen ay bitirdiğin konular, baştan sırayla. Seçtiklerin tekrar için bu aya eklenir; eski kayıt kalır.",
  },
  pull: {
    mode: "move",
    title: "Sonraki ayı öne çek",
    hint: "Gelecek ayın planındaki bitmemiş konular. Seçtiklerin bu aya taşınır.",
  },
};

export function buildSuggestions({ current, previous, next, subjectOrder }) {
  const open = current.filter((r) => !r.doneAt);
  if (open.length > 0) return { monthDone: false, openCount: open.length, empty: false, groups: [] };

  const rank = new Map(subjectOrder.map((id, i) => [id, i]));
  const rankOf = (r) => rank.get(r.subjectId) ?? Infinity;
  const have = new Set(current.map(keyOf));
  const pick = (rows) =>
    rows
      .filter((r) => !have.has(keyOf(r)))
      .sort((a, b) => rankOf(a) - rankOf(b) || a.id - b.id)
      .map((r) => ({ ...r }));

  const lists = {
    carry: pick(previous.filter((r) => !r.doneAt)),
    review: pick(previous.filter((r) => r.doneAt)),
    pull: pick(next.filter((r) => !r.doneAt)),
  };
  const groups = Object.entries(lists)
    .filter(([, items]) => items.length > 0)
    .map(([id, items]) => ({ id, ...META[id], items }));
  return { monthDone: true, openCount: 0, empty: current.length === 0, groups };
}

// Önceden işaretlenecek ilk kısım: sıradaki ilk n konunun kimlikleri
export function firstPart(items, n = FIRST_PART) {
  return items.slice(0, n).map((r) => r.id);
}
