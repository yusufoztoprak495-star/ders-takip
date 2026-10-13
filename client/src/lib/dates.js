// Date nesnesini yerel saate göre 'YYYY-AA-GG' metnine çevirir.
// toISOString() kullanılmaz: o UTC verir, gece 00:30'da bir önceki günü gösterebilir.
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 'YYYY-AA-GG' yerel gününün saat 12:00'sini UTC ISO metni olarak verir.
// Geçersiz ya da boş tarihte null döner (sunucu bunu kendi mesajıyla reddeder).
// Öğlen seçilir ki saat dilimi farkı kaydı yan güne kaydırmasın.
export function noonOfLocalDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString ?? '');
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(y, m - 1, d, 12);
  // 30 Şubat gibi tarihler Date tarafından sonraki aya kaydırılır; öyleyse geçersizdir
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date.toISOString();
}

// `from` gününden n gün öncesinin yerel tarihi (varsayılan: bugün). `from` değiştirilmez.
export function daysAgo(n, from = new Date()) {
  const date = new Date(from);
  // setDate ay/yıl sınırlarını ve yaz saati geçişlerini kendisi doğru yönetir
  date.setDate(date.getDate() - n);
  return toLocalDateString(date);
}

// Bugünün yerel günü 'YYYY-AA-GG' olarak. `now` testlerde sabit bir an vermek içindir.
export function todayLocal(now = new Date()) {
  return toLocalDateString(now);
}
