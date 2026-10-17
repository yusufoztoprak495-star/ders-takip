// Yıllık çalışma ısı haritası (GitHub'daki katkı tablosu gibi): her gün bir kare, ne kadar çalışıldıysa
// o kadar koyu. Saf yardımcılar; çizim components/Heatmap.jsx içinde.
import { addDays } from "./insights.js";
import { dayIndexOfDate } from "./schedule.js";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

// Koyuluk: 0 hiç, 1 yarım saatten az, 2 bir buçuk saate kadar, 3 üç saate kadar, 4 üç saat ve üstü
export function heatmapLevel(seconds) {
  const minutes = seconds / 60;
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 90) return 2;
  if (minutes < 180) return 3;
  return 4;
}

// Son `weeks` haftanın günleri, haftalık sütunlar hâlinde. Bugünden sonraki günler "future" işaretlidir.
export function heatmapWeeks(daily, today, weeks = 53) {
  const seconds = new Map(daily.map((d) => [d.date, d.totalSeconds]));
  const thisMonday = addDays(today, -dayIndexOfDate(today));
  const firstMonday = addDays(thisMonday, -(weeks - 1) * 7);
  const out = [];
  let previousMonth = Number(firstMonday.slice(5, 7));
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(firstMonday, w * 7);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const s = seconds.get(date) ?? 0;
      return { date, seconds: s, level: heatmapLevel(s), future: date > today };
    });
    // Ay etiketi: haftanın ilk günü yeni bir aya geçtiyse
    const month = Number(monday.slice(5, 7));
    const label = w > 0 && month !== previousMonth ? MONTHS[month - 1] : null;
    previousMonth = month;
    out.push({ monday, days, month: label });
  }
  return out;
}
