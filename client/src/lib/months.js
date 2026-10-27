// Aylık plan için saf ay yardımcıları. Ay, 'YYYY-AA' metni olarak tutulur (örn. '2026-10').

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// 'YYYY-AA' biçiminde ve gerçek bir ay mı? (13. ay, 00. ay, eksik sıfır reddedilir)
export function isMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

// 'YYYY-AA-GG' gününün ayı
export function monthOf(date) {
  return date.slice(0, 7);
}

// Ayı n ay ileri (negatifse geri) taşır; yıl sınırlarını kendisi geçer
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  // Ayı 0'dan başlayan tek bir sayıya çevirip tekrar yıl/aya böleriz: yıl geçişi ayrıca düşünülmez
  const index = year * 12 + (number - 1) + delta;
  const nextYear = Math.floor(index / 12);
  const nextMonth = (index % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// 'Ekim 2026'
export function monthLabel(month) {
  const [year, number] = month.split('-').map(Number);
  return `${MONTH_NAMES[number - 1]} ${year}`;
}

// Konu listesinin ilerlemesi: kaç konu var, kaçı bitti, yüzde kaç (yuvarlanır)
export function progressOf(items) {
  const total = items.length;
  const done = items.filter((item) => item.doneAt).length;
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
