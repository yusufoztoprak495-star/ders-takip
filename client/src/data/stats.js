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

// Günün saatlerine göre toplam çalışma (yerel saat): 24 satır, {hour, seconds}.
// Saat sınırını aşan bir çalışma saatlere bölünür; gece yarısını geçen kısım 0. saate taşar.
export function hourlyStats(state, { from, to, subjectId = null }) {
  const active = activeSubjectIds(state);
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, seconds: 0 }));
  for (const s of state.sessions) {
    const matches = subjectId === null ? active.has(s.subjectId) : s.subjectId === subjectId;
    if (!matches || !inRange(sessionDay(s), from, to)) continue;
    const start = new Date(s.startedAt);
    // Saatin içinde kaçıncı saniyedeyiz; oradan saat saat ilerlenir
    let hour = start.getHours();
    let offset = start.getMinutes() * 60 + start.getSeconds();
    let left = s.durationSeconds;
    while (left > 0) {
      const chunk = Math.min(left, 3600 - offset);
      hours[hour].seconds += chunk;
      left -= chunk;
      offset = 0;
      hour = (hour + 1) % 24;
    }
  }
  return hours;
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
    note: topic.note ?? "",
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

// Başarılar (rozetler) için ham sayılar: seçili hedefin dersleri. Rozet kuralları lib/badges.js'te.
export function achievementFacts(state) {
  const active = activeSubjectIds(state);
  const sessions = state.sessions.filter((s) => active.has(s.subjectId));
  const questions = state.questions.filter((q) => active.has(q.subjectId));
  const track = state.settings.track;

  const perDay = new Map();
  let early = 0;
  let late = 0;
  for (const s of sessions) {
    const day = sessionDay(s);
    perDay.set(day, (perDay.get(day) ?? 0) + s.durationSeconds);
    const hour = new Date(s.startedAt).getHours();
    if (hour < 7 && hour >= 4) early += 1;
    if (hour >= 23 || hour < 4) late += 1;
  }
  // En uzun seri: art arda çalışılan gün sayısı (günler YYYY-MM-DD; UTC öğlesiyle gün farkı hesaplanır)
  const days = [...perDay.keys()].sort();
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    const ms = Date.parse(`${day}T12:00:00Z`);
    run = previous !== null && Math.round((ms - previous) / 86400000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = ms;
  }

  const pomodoros = sessions.filter((s) => s.entryType === "pomodoro");
  return {
    sessions: sessions.length,
    totalSeconds: sum(sessions, "durationSeconds"),
    pomodoros: pomodoros.length,
    focusedPomodoros: pomodoros.filter((s) => s.distractions === 0).length,
    longestStreak: longest,
    bestDaySeconds: Math.max(0, ...perDay.values()),
    questions: questions.reduce((n, q) => n + q.correct + q.wrong + q.blank, 0),
    exams: (state.exams ?? []).filter((e) => e.track === track).length,
    topicsDone: state.topics.filter((t) => t.doneAt && active.has(t.subjectId)).length,
    mistakesLearned: (state.mistakes ?? []).filter((m) => m.track === track && m.learnedAt).length,
    cardReviews: (state.cards ?? []).filter((c) => c.track === track).reduce((n, c) => n + (c.reviews ?? 0), 0),
    earlySessions: early,
    lateSessions: late,
  };
}

// Akıllı plan önerisi için zayıf konular (en zayıf önce). Puan kaynakları:
// denemelerde kaybettirdiği soru (son 90 gün), hata defterinde öğrenilmemiş soru, son 60 günde doğruluğu
// %70'in altında kalan (en az 8 soru) ve tekrarı bu hafta gelen konular. Hiçbiri yoksa (ya da azsa)
// son 14 günde en az çalışılan derslerin bitmemiş konuları eklenir (ders başına en fazla 3).
export function weakTopics(state, today) {
  const active = activeSubjectIds(state);
  const track = state.settings.track;
  const topicsById = new Map(state.topics.filter((t) => active.has(t.subjectId)).map((t) => [t.id, t]));
  const score = new Map(); // topicId → { points, reasons: [{points, text}] }
  const add = (topicId, points, text) => {
    if (!topicsById.has(topicId) || points <= 0) return;
    const row = score.get(topicId) ?? { points: 0, reasons: [] };
    row.points += points;
    row.reasons.push({ points, text });
    score.set(topicId, row);
  };
  const daysAgoDate = (n) => {
    const [y, m, d] = today.split("-").map(Number);
    return toLocalDateString(new Date(y, m - 1, d - n));
  };

  const examLost = new Map();
  for (const exam of state.exams ?? []) {
    if (exam.track !== track || exam.date < daysAgoDate(90)) continue;
    for (const w of exam.wrongTopics ?? []) examLost.set(w.topicId, (examLost.get(w.topicId) ?? 0) + w.count);
  }
  for (const [id, lost] of examLost) add(id, lost * 3, `Denemelerde ${lost} soru kaybettirdi`);

  const mistakes = new Map();
  for (const m of state.mistakes ?? []) {
    if (m.track === track && !m.learnedAt && m.topicId !== null) mistakes.set(m.topicId, (mistakes.get(m.topicId) ?? 0) + 1);
  }
  for (const [id, n] of mistakes) add(id, n * 4, `Hata defterinde ${n} soru`);

  const recent = new Map();
  for (const q of state.questions) {
    if (q.topicId === null || q.date < daysAgoDate(60)) continue;
    const t = recent.get(q.topicId) ?? { correct: 0, wrong: 0, blank: 0 };
    t.correct += q.correct;
    t.wrong += q.wrong;
    t.blank += q.blank;
    recent.set(q.topicId, t);
  }
  for (const [id, t] of recent) {
    const total = t.correct + t.wrong + t.blank;
    const accuracy = accuracyOf(t.correct, t.wrong, t.blank);
    if (total >= 8 && accuracy < 70) add(id, ((70 - accuracy) / 10) * 2, `Doğruluk %${accuracy} (${total} soru)`);
  }

  const weekEnd = (() => {
    const [y, m, d] = today.split("-").map(Number);
    return toLocalDateString(new Date(y, m - 1, d + 6));
  })();
  for (const t of topicsById.values()) if (t.nextReview && t.nextReview <= weekEnd) add(t.id, 5, "Tekrar zamanı geldi");

  const describe = (topic, reason) => {
    const subject = state.subjects.find((s) => s.id === topic.subjectId);
    return { topicId: topic.id, topicName: topic.name, subjectId: subject.id, subjectName: subject.name, examType: subject.examType ?? "", reason };
  };
  const ranked = [...score]
    .sort((a, b) => b[1].points - a[1].points || a[0] - b[0])
    .map(([id, row]) => describe(topicsById.get(id), row.reasons.sort((a, b) => b.points - a.points)[0].text));

  // Tamamlayıcı: az çalışılan derslerin bitmemiş konuları (müfredat sırasıyla)
  if (ranked.length < 12) {
    const studied = new Map();
    const since = daysAgoDate(13);
    for (const s of state.sessions) {
      if (active.has(s.subjectId) && sessionDay(s) >= since) studied.set(s.subjectId, (studied.get(s.subjectId) ?? 0) + s.durationSeconds);
    }
    const taken = new Set(ranked.map((r) => r.topicId));
    const subjects = state.subjects
      .filter((s) => active.has(s.id))
      .sort((a, b) => (studied.get(a.id) ?? 0) - (studied.get(b.id) ?? 0) || a.id - b.id);
    for (const subject of subjects) {
      const open = state.topics.filter((t) => t.subjectId === subject.id && !t.doneAt && !taken.has(t.id)).slice(0, 3);
      for (const t of open) ranked.push(describe(t, "Henüz bitmedi"));
      if (ranked.length >= 30) break;
    }
  }
  return ranked.slice(0, 30);
}
