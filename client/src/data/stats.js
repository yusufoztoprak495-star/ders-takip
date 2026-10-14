import { toLocalDateString } from "../lib/dates.js";
import { activeSubjectIds } from "./seed.js";

// YKS neti: her 4 yanlış 1 doğruyu götürür. Net hiçbir yerde saklanmaz, hep buradan hesaplanır.
export function netOf(correct, wrong) {
  return Math.round((correct - wrong / 4) * 100) / 100;
}

// Doğruluk oranı: doğru / (doğru + yanlış + boş), yüzde olarak yuvarlanır.
// Hiç soru çözülmemişse null (sıfıra bölme olmaz; "veri yok" demektir, "yüzde 0" değil).
export function accuracyOf(correct, wrong, blank) {
  const total = correct + wrong + blank;
  return total === 0 ? null : Math.round((correct / total) * 100);
}

// Çalışma kayıtları UTC saklandığı için gün sınırı yerel güne çevrilir.
// Soru kayıtlarının tarihi zaten yerel bir gündür (YYYY-MM-DD).
export const sessionDay = (session) =>
  toLocalDateString(new Date(session.startedAt));

const inRange = (day, from, to) => day >= from && day <= to;
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const totalsOf = (rows) => ({
  correct: sum(rows, "correct"),
  wrong: sum(rows, "wrong"),
  blank: sum(rows, "blank"),
});

// Gün gün toplamlar: yalnızca verisi olan günler, tarihe göre artan.
// subjectId verilirse yalnızca o ders, verilmezse seçili hedefin tüm dersleri sayılır.
export function dailyStats(state, { from, to, subjectId = null }) {
  const active = activeSubjectIds(state);
  const matchesSubject = (row) =>
    subjectId === null ? active.has(row.subjectId) : row.subjectId === subjectId;

  const days = new Map();
  const entry = (day) => {
    if (!days.has(day)) {
      days.set(day, {
        date: day,
        totalSeconds: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
      });
    }
    return days.get(day);
  };
  for (const s of state.sessions) {
    const day = sessionDay(s);
    if (matchesSubject(s) && inRange(day, from, to))
      entry(day).totalSeconds += s.durationSeconds;
  }
  for (const q of state.questions) {
    if (matchesSubject(q) && inRange(q.date, from, to)) {
      const d = entry(q.date);
      d.correct += q.correct;
      d.wrong += q.wrong;
      d.blank += q.blank;
    }
  }

  return [...days.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, net: netOf(d.correct, d.wrong) }));
}

// Seçili hedefin her dersi için toplamlar; verisi olmayan dersler de sıfırlarla döner
export function subjectStats(state, { from, to }) {
  const active = activeSubjectIds(state);
  return state.subjects
    .filter((s) => active.has(s.id))
    .sort((a, b) => a.id - b.id)
    .map((s) => {
      const seconds = sum(
        state.sessions.filter(
          (x) => x.subjectId === s.id && inRange(sessionDay(x), from, to),
        ),
        "durationSeconds",
      );
      const q = totalsOf(
        state.questions.filter(
          (x) => x.subjectId === s.id && inRange(x.date, from, to),
        ),
      );
      return {
        subjectId: s.id,
        subjectName: s.name,
        examType: s.examType ?? "",
        totalSeconds: seconds,
        ...q,
        net: netOf(q.correct, q.wrong),
        accuracy: accuracyOf(q.correct, q.wrong, q.blank),
      };
    });
}

// Bir dersin her konusu için toplamlar (verisi olmayan konular da sıfırlarla döner).
// Konusuz kayıtlar hiçbir konuya sayılmaz.
export function topicStats(state, { subjectId, from, to }) {
  return state.topics
    .filter((t) => t.subjectId === subjectId)
    .sort((a, b) => a.id - b.id)
    .map((t) => {
      const seconds = sum(
        state.sessions.filter(
          (x) =>
            x.subjectId === subjectId &&
            x.topicId === t.id &&
            inRange(sessionDay(x), from, to),
        ),
        "durationSeconds",
      );
      const q = totalsOf(
        state.questions.filter(
          (x) =>
            x.subjectId === subjectId &&
            x.topicId === t.id &&
            inRange(x.date, from, to),
        ),
      );
      return {
        topicId: t.id,
        topicName: t.name,
        totalSeconds: seconds,
        ...q,
        net: netOf(q.correct, q.wrong),
        accuracy: accuracyOf(q.correct, q.wrong, q.blank),
      };
    });
}

// Tek bir konunun tüm zamanlardaki özeti; konu yoksa null
export function topicDetail(state, topicId) {
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  const subject = state.subjects.find((s) => s.id === topic.subjectId);

  const sessions = state.sessions.filter((s) => s.topicId === topicId);
  const questions = state.questions.filter((q) => q.topicId === topicId);
  const totals = totalsOf(questions);

  // Son çalışılan gün: çalışma kaydı (yerel gün) ve soru kaydı tarihlerinin en yenisi
  const days = [
    ...sessions.map(sessionDay),
    ...questions.map((q) => q.date),
  ].sort();
  const lastStudiedAt = days.length > 0 ? days[days.length - 1] : null;

  // Kitap kırılımı: kitaba göre gruplanır, kitapsız kayıtlar en sonda
  const byResource = new Map();
  for (const q of questions) {
    if (!byResource.has(q.resourceId)) byResource.set(q.resourceId, []);
    byResource.get(q.resourceId).push(q);
  }
  const books = [...byResource.entries()]
    .sort(([a], [b]) => (a === null) - (b === null) || a - b)
    .map(([resourceId, rows]) => {
      const resource = state.resources.find((r) => r.id === resourceId);
      return {
        resourceId,
        name: resource?.name ?? "Kitapsız",
        publisher: resource?.publisher ?? "",
        ...totalsOf(rows),
      };
    });

  const byDate = new Map();
  for (const q of questions) {
    if (!byDate.has(q.date)) byDate.set(q.date, []);
    byDate.get(q.date).push(q);
  }
  const daily = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const t = totalsOf(rows);
      return { date, ...t, accuracy: accuracyOf(t.correct, t.wrong, t.blank) };
    });

  return {
    topicId: topic.id,
    topicName: topic.name,
    subjectId: topic.subjectId,
    subjectName: subject.name,
    examType: subject.examType ?? "",
    totalSeconds: sum(sessions, "durationSeconds"),
    ...totals,
    net: netOf(totals.correct, totals.wrong),
    accuracy: accuracyOf(totals.correct, totals.wrong, totals.blank),
    lastStudiedAt,
    books,
    daily,
  };
}
