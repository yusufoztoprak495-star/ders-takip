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
      accuracy: accuracyOf(q.correct, q.wrong, q.blank),
    };
  });
}

// Bir dersin her konusu için toplamlar (verisi olmayan konular da sıfırlarla döner).
// Konusuz kayıtlar hiçbir konuya sayılmaz.
export function topicStats(db, { subjectId, from, to }) {
  const topics = db.prepare('SELECT id, name FROM topics WHERE subject_id = ? ORDER BY id').all(subjectId);

  const seconds = new Map(
    db
      .prepare(
        `SELECT topic_id, SUM(duration_seconds) AS seconds
         FROM study_sessions
         WHERE subject_id = ? AND topic_id IS NOT NULL AND ${SESSION_DAY} BETWEEN ? AND ?
         GROUP BY topic_id`,
      )
      .all(subjectId, from, to)
      .map((r) => [r.topic_id, r.seconds]),
  );
  const questions = new Map(
    db
      .prepare(
        `SELECT topic_id, SUM(correct) AS correct, SUM(wrong) AS wrong, SUM(blank) AS blank
         FROM question_logs
         WHERE subject_id = ? AND topic_id IS NOT NULL AND date BETWEEN ? AND ?
         GROUP BY topic_id`,
      )
      .all(subjectId, from, to)
      .map((r) => [r.topic_id, r]),
  );

  return topics.map((t) => {
    const q = questions.get(t.id) ?? { correct: 0, wrong: 0, blank: 0 };
    return {
      topicId: t.id,
      topicName: t.name,
      totalSeconds: seconds.get(t.id) ?? 0,
      correct: q.correct,
      wrong: q.wrong,
      blank: q.blank,
      net: netOf(q.correct, q.wrong),
      accuracy: accuracyOf(q.correct, q.wrong, q.blank),
    };
  });
}

// Tek bir konunun tüm zamanlardaki özeti; konu yoksa null
export function topicDetail(db, topicId) {
  const topic = db
    .prepare(
      `SELECT t.id, t.name, t.subject_id, s.name AS subject_name, s.exam_type
       FROM topics t JOIN subjects s ON s.id = t.subject_id WHERE t.id = ?`,
    )
    .get(topicId);
  if (!topic) return null;

  const { seconds } = db
    .prepare('SELECT COALESCE(SUM(duration_seconds), 0) AS seconds FROM study_sessions WHERE topic_id = ?')
    .get(topicId);
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(correct), 0) AS correct, COALESCE(SUM(wrong), 0) AS wrong, COALESCE(SUM(blank), 0) AS blank
       FROM question_logs WHERE topic_id = ?`,
    )
    .get(topicId);

  // Son çalışılan gün: çalışma kaydı (yerel gün) ve soru kaydı tarihlerinin en yenisi
  const lastSession = db
    .prepare(`SELECT MAX(${SESSION_DAY}) AS day FROM study_sessions WHERE topic_id = ?`)
    .get(topicId).day;
  const lastQuestion = db.prepare('SELECT MAX(date) AS day FROM question_logs WHERE topic_id = ?').get(topicId).day;
  const lastStudiedAt = [lastSession, lastQuestion].filter(Boolean).sort().pop() ?? null;

  const books = db
    .prepare(
      `SELECT q.resource_id, r.name, r.publisher,
              SUM(q.correct) AS correct, SUM(q.wrong) AS wrong, SUM(q.blank) AS blank
       FROM question_logs q LEFT JOIN resources r ON r.id = q.resource_id
       WHERE q.topic_id = ?
       GROUP BY q.resource_id
       ORDER BY q.resource_id IS NULL, q.resource_id`,
    )
    .all(topicId)
    .map((b) => ({
      resourceId: b.resource_id,
      name: b.name ?? 'Kitapsız',
      publisher: b.publisher ?? '',
      correct: b.correct,
      wrong: b.wrong,
      blank: b.blank,
    }));

  const daily = db
    .prepare(
      `SELECT date, SUM(correct) AS correct, SUM(wrong) AS wrong, SUM(blank) AS blank
       FROM question_logs WHERE topic_id = ? GROUP BY date ORDER BY date`,
    )
    .all(topicId)
    .map((d) => ({ ...d, accuracy: accuracyOf(d.correct, d.wrong, d.blank) }));

  return {
    topicId: topic.id,
    topicName: topic.name,
    subjectId: topic.subject_id,
    subjectName: topic.subject_name,
    examType: topic.exam_type,
    totalSeconds: seconds,
    ...totals,
    net: netOf(totals.correct, totals.wrong),
    accuracy: accuracyOf(totals.correct, totals.wrong, totals.blank),
    lastStudiedAt,
    books,
    daily,
  };
}
