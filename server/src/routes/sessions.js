import { Router } from "express";
import { HttpError } from "../errors.js";
import {
  assertSubjectExists,
  assertTopicMatchesSubject,
  optionalInt,
  parseId,
  requireBody,
  requireDate,
  requireInt,
  requireIsoDateTime,
  requireOneOf,
} from "../validation.js";

// Makul üst sınır: bir kayıt en fazla 24 saat (yazım hatası ve dev sayılar istatistikleri bozmasın)
const MAX_SESSION_SECONDS = 24 * 60 * 60;

const COLUMNS =
  "id, subject_id, topic_id, started_at, duration_seconds, entry_type";

const toSession = (row) => ({
  id: row.id,
  subjectId: row.subject_id,
  topicId: row.topic_id,
  startedAt: row.started_at,
  durationSeconds: row.duration_seconds,
  entryType: row.entry_type,
});

export function sessionsRouter(db) {
  const router = Router();

  const findSession = (id) =>
    db.prepare(`SELECT ${COLUMNS} FROM study_sessions WHERE id = ?`).get(id);

  // POST ve PUT aynı kuralları kullanır
  function parseSessionBody(req) {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    const topicId = optionalInt(body.topicId, "Konu");
    assertSubjectExists(db, subjectId);
    assertTopicMatchesSubject(db, topicId, subjectId);
    // Süre ekranda dakika olarak girilir; üst sınır mesajı saniye değil saat diliyle verilir
    const durationSeconds = requireInt(body.durationSeconds, "Süre", {
      min: 1,
    });
    if (durationSeconds > MAX_SESSION_SECONDS) {
      throw new HttpError(400, "Bir çalışma kaydı en fazla 24 saat olabilir");
    }
    return {
      subjectId,
      topicId,
      startedAt: requireIsoDateTime(body.startedAt, "Başlangıç zamanı"),
      durationSeconds,
      entryType: requireOneOf(body.entryType, "Giriş türü", [
        "pomodoro",
        "manual",
      ]),
    };
  }

  // İsteğe bağlı from/to (yerel tarih, uçlar dahil)
  router.get("/", (req, res) => {
    const conditions = [];
    const params = [];
    if (req.query.from !== undefined) {
      conditions.push("date(started_at, 'localtime') >= ?");
      params.push(requireDate(req.query.from, "Başlangıç tarihi"));
    }
    if (req.query.to !== undefined) {
      conditions.push("date(started_at, 'localtime') <= ?");
      params.push(requireDate(req.query.to, "Bitiş tarihi"));
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `SELECT ${COLUMNS} FROM study_sessions ${where} ORDER BY started_at DESC`,
      )
      .all(...params);
    res.json(rows.map(toSession));
  });

  router.post("/", (req, res) => {
    const s = parseSessionBody(req);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO study_sessions (subject_id, topic_id, started_at, duration_seconds, entry_type)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(s.subjectId, s.topicId, s.startedAt, s.durationSeconds, s.entryType);
    res.status(201).json(toSession(findSession(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!findSession(id)) throw new HttpError(404, "Bulunamadı");
    const s = parseSessionBody(req);
    db.prepare(
      `UPDATE study_sessions
       SET subject_id = ?, topic_id = ?, started_at = ?, duration_seconds = ?, entry_type = ?
       WHERE id = ?`,
    ).run(
      s.subjectId,
      s.topicId,
      s.startedAt,
      s.durationSeconds,
      s.entryType,
      id,
    );
    res.json(toSession(findSession(id)));
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const { changes } = db
      .prepare("DELETE FROM study_sessions WHERE id = ?")
      .run(id);
    if (changes === 0) throw new HttpError(404, "Bulunamadı");
    res.status(204).end();
  });

  return router;
}
