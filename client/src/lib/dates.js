// Date nesnesini yerel saate göre 'YYYY-AA-GG' metnine çevirir.
// toISOString() kullanılmaz: o UTC verir, gece 00:30'da bir önceki günü gösterebilir.
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
