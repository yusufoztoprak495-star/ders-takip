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

// --- Ayın dört haftası ---
// Ay her zaman 4 haftaya bölünür: 1–7, 8–14, 15–21 ve 22'den ay sonuna kadar (28, 29, 30 ya da 31).
// Hafta takvimdeki pazartesi–pazar haftası değil, ayın "kaçıncı yedi günü" demektir; böylece her ay
// aynı sayıda hafta olur ve aylık plan dörde bölünebilir. Haftaya özel bloklar gün adıyla tutulur:
// son haftada bir gün adı iki kez geçerse (örn. 22 ve 29 Ekim perşembe) blok ikisine de uygulanır.
export const WEEKS = 4;

export function daysInMonth(month) {
  const [year, number] = month.split('-').map(Number);
  // Bir sonraki ayın 0. günü = bu ayın son günü
  return new Date(Date.UTC(year, number, 0)).getUTCDate();
}

// Ayın günü (1–31) → hafta (1–4)
export function weekOfDay(day) {
  return Math.min(WEEKS, Math.ceil(day / 7));
}

// 'YYYY-AA-GG' → { month, week }
export function weekOfDate(date) {
  return { month: monthOf(date), week: weekOfDay(Number(date.slice(8, 10))) };
}

// Haftanın ilk ve son günü (ayın günü olarak)
export function weekDays(month, week) {
  return { from: (week - 1) * 7 + 1, to: week === WEEKS ? daysInMonth(month) : week * 7 };
}

// '1–7 Ekim'
export function weekLabel(month, week) {
  const { from, to } = weekDays(month, week);
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1];
  return `${from}–${to} ${name}`;
}
