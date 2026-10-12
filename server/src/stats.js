// YKS neti: her 4 yanlış 1 doğruyu götürür. Net hiçbir yerde saklanmaz, hep buradan hesaplanır.
export function netOf(correct, wrong) {
  return Math.round((correct - wrong / 4) * 100) / 100;
}

// Çalışma kayıtları UTC saklandığı için gün sınırı 'localtime' ile yerel güne çevrilir.
// Soru kayıtlarının tarihi zaten yerel bir gündür (YYYY-MM-DD).
const SESSION_DAY = "date(started_at, 'localtime')";

// Gün gün toplamlar: yalnızca verisi olan günler, tarihe göre artan.
// subjectId verilirse yalnızca o ders sayılır.
export function dailyStats(db, { from, to, subjectId = null }) {
  const subjectFilter = subjectId === null ? '' : 'AND subject_id = ?';
  const extra = subjectId === null ? [] : [subjectId];

  const sessions = db
    .prepare(
      `SELECT ${SESSION_DAY} AS day, SUM(duration_seconds) AS seconds
       FROM study_sessions
       WHERE ${SESSION_DAY} BETWEEN ? AND ? ${subjectFilter}
       GROUP BY day`,
    )
    .all(from, to, ...extra);

  const questions = db
    .prepare(
      `SELECT date AS day, SUM(correct) AS correct, SUM(wrong) AS wrong, SUM(blank) AS blank
       FROM question_logs
       WHERE date BETWEEN ? AND ? ${subjectFilter}
       GROUP BY day`,
    )
    .all(from, to, ...extra);

  // İki kaynağı gün anahtarıyla birleştir
  const days = new Map();
  const entry = (day) => {
    if (!days.has(day)) {
      days.set(day, { date: day, totalSeconds: 0, correct: 0, wrong: 0, blank: 0 });
    }
    return days.get(day);
  };
  for (const s of sessions) entry(s.day).totalSeconds = s.seconds;
  for (const q of questions) Object.assign(entry(q.day), { correct: q.correct, wrong: q.wrong, blank: q.blank });

  return [...days.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, net: netOf(d.correct, d.wrong) }));
}

// Her ders için toplamlar; verisi olmayan dersler de sıfırlarla döner
export function subjectStats(db, { from, to }) {
  const subjects = db.prepare('SELECT id, name, exam_type FROM subjects ORDER BY id').all();

  const seconds = new Map(
    db
      .prepare(
        `SELECT subject_id, SUM(duration_seconds) AS seconds
         FROM study_sessions
         WHERE ${SESSION_DAY} BETWEEN ? AND ?
         GROUP BY subject_id`,
      )
      .all(from, to)
      .map((r) => [r.subject_id, r.seconds]),
  );
  const questions = new Map(
    db
      .prepare(
        `SELECT subject_id, SUM(correct) AS correct, SUM(wrong) AS wrong, SUM(blank) AS blank
         FROM question_logs
         WHERE date BETWEEN ? AND ?
         GROUP BY subject_id`,
      )
      .all(from, to)
      .map((r) => [r.subject_id, r]),
  );

  return subjects.map((s) => {
    const q = questions.get(s.id) ?? { correct: 0, wrong: 0, blank: 0 };
    return {
      subjectId: s.id,
      subjectName: s.name,
      examType: s.exam_type,
      totalSeconds: seconds.get(s.id) ?? 0,
      correct: q.correct,
      wrong: q.wrong,
      blank: q.blank,
      net: netOf(q.correct, q.wrong),
    };
  });
}
