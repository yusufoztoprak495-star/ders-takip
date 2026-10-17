// Haftalık rapor kartının verisi (saf). Çizimi lib/reportCanvas.js yapar.
import { netOf } from "../data/stats.js";
import { accuracyOf } from "./charts.js";
import { addDays } from "./insights.js";
import { subjectLabel } from "./tracks.js";

// daily: /api/stats/daily satırları (en az bu hafta + önceki hafta). weekStart: Pazartesi.
// subjects: o haftanın /api/stats/by-subject satırları (en çok çalışılan 3 ders için)
export function weeklyReport(daily, weekStart, subjects) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const days = dates.map((date) => ({ date, seconds: byDate.get(date)?.totalSeconds ?? 0 }));
  const week = dates.map((d) => byDate.get(d)).filter(Boolean);
  const sum = (rows, key) => rows.reduce((n, r) => n + r[key], 0);
  const correct = sum(week, "correct");
  const wrong = sum(week, "wrong");
  const blank = sum(week, "blank");
  const totalSeconds = sum(days, "seconds");
  const previous = Array.from({ length: 7 }, (_, i) => byDate.get(addDays(weekStart, i - 7))?.totalSeconds ?? 0).reduce((a, b) => a + b, 0);
  const best = days.reduce((b, d) => (d.seconds > (b?.seconds ?? 0) ? d : b), null);
  return {
    weekStart,
    weekEnd: dates[6],
    days,
    totalSeconds,
    studiedDays: days.filter((d) => d.seconds > 0).length,
    best,
    questions: correct + wrong + blank,
    net: netOf(correct, wrong),
    accuracy: accuracyOf(correct, wrong, blank),
    change: previous > 0 ? Math.round(((totalSeconds - previous) / previous) * 100) : null,
    topSubjects: subjects
      .filter((s) => s.totalSeconds > 0)
      .sort((a, b) => b.totalSeconds - a.totalSeconds)
      .slice(0, 3)
      .map((s) => ({ label: subjectLabel(s.subjectName, s.examType), seconds: s.totalSeconds })),
  };
}
