import { Router } from "express";
import { HttpError } from "../errors.js";
import { netOf } from "../stats.js";
import {
  assertSubjectExists,
  assertTopicMatchesSubject,
  optionalInt,
  parseId,
  requireBody,
  requireDate,
  requireInt,
} from "../validation.js";

// Makul üst sınır: bir kayıtta en fazla 10000 soru (yazım hatasına karşı)
const MAX_QUESTION_COUNT = 10000;

const COLUMNS =
  "id, date, subject_id, topic_id, correct, wrong, blank, resource_id";

const toQuestionLog = (row) => ({
  id: row.id,
  date: row.date,
  subjectId: row.subject_id,
  topicId: row.topic_id,
  correct: row.correct,
  wrong: row.wrong,
  blank: row.blank,
  resourceId: row.resource_id,
  net: netOf(row.correct, row.wrong),
});

export function questionsRouter(db) {
  const router = Router();

  const findLog = (id) =>
    db.prepare(`SELECT ${COLUMNS} FROM question_logs WHERE id = ?`).get(id);

  // POST ve PUT aynı kuralları kullanır
  function parseLogBody(req) {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    const topicId = optionalInt(body.topicId, "Konu");
    const resourceId = optionalInt(body.resourceId, "Kaynak");
    assertSubjectExists(db, subjectId);
    assertTopicMatchesSubject(db, topicId, subjectId);
    if (
      resourceId !== null &&
      !db.prepare("SELECT 1 FROM resources WHERE id = ?").get(resourceId)
    ) {
      throw new HttpError(400, "Kaynak bulunamadı");
    }

    const correct = requireInt(body.correct, "Doğru sayısı", { min: 0, max: MAX_QUESTION_COUNT });
    const wrong = requireInt(body.wrong, "Yanlış sayısı", { min: 0, max: MAX_QUESTION_COUNT });
    const blank = requireInt(body.blank, "Boş sayısı", { min: 0, max: MAX_QUESTION_COUNT });
    if (correct + wrong + blank === 0) {
      throw new HttpError(400, "En az bir soru girilmeli");
    }
    return {
      date: requireDate(body.date, "Tarih"),
      subjectId,
      topicId,
      resourceId,
      correct,
      wrong,
      blank,
    };
  }

  // İsteğe bağlı from/to (uçlar dahil), yeniden eskiye sıralı
  router.get("/", (req, res) => {
    const conditions = [];
    const params = [];
    if (req.query.from !== undefined) {
      conditions.push("date >= ?");
      params.push(requireDate(req.query.from, "Başlangıç tarihi"));
    }
    if (req.query.to !== undefined) {
      conditions.push("date <= ?");
      params.push(requireDate(req.query.to, "Bitiş tarihi"));
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `SELECT ${COLUMNS} FROM question_logs ${where} ORDER BY date DESC, id DESC`,
      )
      .all(...params);
    res.json(rows.map(toQuestionLog));
  });

  router.post("/", (req, res) => {
    const q = parseLogBody(req);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO question_logs (date, subject_id, topic_id, correct, wrong, blank, resource_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        q.date,
        q.subjectId,
        q.topicId,
        q.correct,
        q.wrong,
        q.blank,
        q.resourceId,
      );
    res.status(201).json(toQuestionLog(findLog(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!findLog(id)) throw new HttpError(404, "Bulunamadı");
    const q = parseLogBody(req);
    db.prepare(
      `UPDATE question_logs
       SET date = ?, subject_id = ?, topic_id = ?, correct = ?, wrong = ?, blank = ?, resource_id = ?
       WHERE id = ?`,
    ).run(
      q.date,
      q.subjectId,
      q.topicId,
      q.correct,
      q.wrong,
      q.blank,
      q.resourceId,
      id,
    );
    res.json(toQuestionLog(findLog(id)));
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const { changes } = db
      .prepare("DELETE FROM question_logs WHERE id = ?")
      .run(id);
    if (changes === 0) throw new HttpError(404, "Bulunamadı");
    res.status(204).end();
  });

  return router;
}
