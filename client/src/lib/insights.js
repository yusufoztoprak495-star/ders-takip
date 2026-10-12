// Ana sayfadaki özet kartları için saf hesaplar: haftalık değişim, çalışma serisi, günün dersi.
// Günler 'YYYY-AA-GG' metnidir; bugün dışarıdan verilir (testte sabit, uygulamada yerel gün).

// 'YYYY-AA-GG' tarihine n gün ekler (negatif de olur). UTC ile hesaplanır, yaz saati kaymaz.
export function addDays(dateString, delta) {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

const sumSeconds = (days, from, to) =>
  days
    .filter((d) => d.date >= from && d.date <= to)
    .reduce((sum, d) => sum + d.totalSeconds, 0);

// Son 7 günün çalışma süresi (bugün dahil) ile ondan önceki 7 günün karşılaştırması.
// percent: değişim yüzdesi; geçen hafta hiç çalışılmadıysa null (sıfıra bölünmez).
// direction: 'up' | 'down' | 'flat' | 'new' (geçen hafta yoktu, bu hafta var)
export function weeklyChange(days, today) {
  const current = sumSeconds(days, addDays(today, -6), today);
  const previous = sumSeconds(days, addDays(today, -13), addDays(today, -7));
  if (previous === 0) {
    return {
      current,
      previous,
      percent: null,
      direction: current > 0 ? "new" : "flat",
    };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  return {
    current,
    previous,
    percent,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
  };
}

// Üst üste kaç gündür çalışılıyor: süre ya da çözülen soru olan gün "çalışılmış" sayılır.
// Bugün henüz kayıt yoksa seri dünden sayılır; gün bitmeden seri bozulmaz.
export function studyStreak(days, today) {
  const active = new Set(
    days
      .filter((d) => d.totalSeconds > 0 || d.correct + d.wrong + d.blank > 0)
      .map((d) => d.date),
  );
  const activeToday = active.has(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let count = 0;
  while (active.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return { count, activeToday };
}

// Günün en çok çalışılan dersi (ders başına süre satırlarından); hiç çalışılmamışsa null
export function topSubjectOfDay(rows) {
  const worked = rows.filter((r) => r.totalSeconds > 0);
  if (worked.length === 0) return null;
  return worked.reduce((best, r) =>
    r.totalSeconds > best.totalSeconds ? r : best,
  );
}
