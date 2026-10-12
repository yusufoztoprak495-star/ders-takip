import { daysAgo, toLocalDateString } from "./dates.js";

// 'YYYY-AA-GG' metnini yerel saatle Date nesnesine çevirir
function parseLocalDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Sunucudaki net hesabıyla aynı formül: doğru − yanlış / 4 (2 ondalık)
function netOf(correct, wrong) {
  return Math.round((correct - wrong / 4) * 100) / 100;
}

// Doğruluk oranı (sunucudaki accuracyOf ile aynı): doğru / tüm çözülenler, yüzde; soru yoksa null
export function accuracyOf(correct, wrong, blank) {
  const total = correct + wrong + blank;
  return total === 0 ? null : Math.round((correct / total) * 100);
}

const emptyDay = (date) => ({
  date,
  totalSeconds: 0,
  correct: 0,
  wrong: 0,
  blank: 0,
  net: 0,
});

// Sunucu yalnızca verisi olan günleri döner; grafikte boşluk kalmasın diye
// from..to arasındaki her gün için bir satır üretir (verisiz günler sıfır).
export function fillMissingDays(daily, from, to) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const result = [];
  const cursor = parseLocalDate(from);
  const end = parseLocalDate(to);
  while (cursor <= end) {
    const key = toLocalDateString(cursor);
    result.push(byDate.get(key) ?? emptyDay(key));
    // setDate ay sınırlarını ve yaz saati geçişini kendisi yönetir
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

// Günün ait olduğu haftanın Pazartesisi (hafta Pazartesi başlar)
export function weekStartOf(dateString) {
  const date = parseLocalDate(dateString);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return toLocalDateString(date);
}

// Günlük verileri Pazartesi başlangıçlı haftalara toplar, haftaları artan sıralar.
// Net, haftalık toplam doğru/yanlıştan yeniden hesaplanır (günlük netlerin toplamı değil).
export function groupByWeek(daily) {
  const weeks = new Map();
  for (const day of daily) {
    const weekStart = weekStartOf(day.date);
    const week = weeks.get(weekStart) ?? {
      weekStart,
      totalSeconds: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
    };
    week.totalSeconds += day.totalSeconds;
    week.correct += day.correct;
    week.wrong += day.wrong;
    week.blank += day.blank;
    weeks.set(weekStart, week);
  }
  return [...weeks.values()]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((w) => ({ ...w, net: netOf(w.correct, w.wrong) }));
}

// Haftalık grafiğin başlangıç günü: seçilen aralığı (en az 4 hafta) kapsayan ilk haftanın
// Pazartesisi. Böylece ilk hafta eksik kalmaz ve yanıltıcı kısa bir çubuk çıkmaz.
export function weeklyFrom(rangeDays, today = new Date()) {
  return weekStartOf(daysAgo(Math.max(rangeDays, 28) - 1, today));
}

// Günlük satırlardan özet (üstteki sayı kutuları için)
export function summarize(daily) {
  const total = daily.reduce(
    (sum, d) => ({
      totalSeconds: sum.totalSeconds + d.totalSeconds,
      correct: sum.correct + d.correct,
      wrong: sum.wrong + d.wrong,
      blank: sum.blank + d.blank,
    }),
    { totalSeconds: 0, correct: 0, wrong: 0, blank: 0 },
  );
  return {
    ...total,
    questions: total.correct + total.wrong + total.blank,
    net: netOf(total.correct, total.wrong),
    accuracy: accuracyOf(total.correct, total.wrong, total.blank),
  };
}
