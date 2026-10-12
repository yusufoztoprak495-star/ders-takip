import { Router } from "express";
import { todayLocal } from "../dates.js";
import { HttpError } from "../errors.js";
import {
  assertSubjectExists,
  parseId,
  requireBody,
  requireInt,
  requireOneOf,
  requireString,
} from "../validation.js";

// Makul üst sınır: bir kitaptan en fazla 10000 test çözülmüş sayılır (yazım hatasına karşı)
const MAX_SOLVED_TESTS = 10000;
const PUBLISHER_MAX = 100;
const STATUSES = ["elimde", "bitirdim"];

// last_solved_at: elle (çözülen test artınca) yazılan gün. Kitaba bağlı soru kayıtlarının en yeni
// tarihi de hesaba katılır; ikisinden yeni olanı "son çözüm tarihi" sayılır.
const SELECT = `
  SELECT r.id, r.name, r.publisher, r.subject_id, r.status, r.solved_tests,
         MAX(COALESCE(r.last_solved_at, ''), COALESCE((SELECT MAX(q.date) FROM question_logs q WHERE q.resource_id = r.id), '')) AS last_solved
  FROM resources r`;

const toResource = (row) => ({
  id: row.id,
  name: row.name,
  publisher: row.publisher,
  subjectId: row.subject_id,
  status: row.status,
  solvedTests: row.solved_tests,
  lastSolvedAt: row.last_solved || null,
});

// Yayınevi isteğe bağlıdır: verilmezse boş metin olur
function parsePublisher(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string")
    throw new HttpError(400, "Yayınevi metin olmalı");
  const trimmed = value.trim();
  if (trimmed.length > PUBLISHER_MAX) {
    throw new HttpError(
      400,
      `Yayınevi en fazla ${PUBLISHER_MAX} karakter olabilir`,
    );
  }
  return trimmed;
}

export function resourcesRouter(db) {
  const router = Router();

  const findResource = (id) => db.prepare(`${SELECT} WHERE r.id = ?`).get(id);

  // POST ve PUT aynı kuralları kullanır. `solvedTests` verilmezse `fallbackSolved` kullanılır:
  // POST'ta 0, PUT'ta mevcut değer (böylece ad değiştirirken sayaç sıfırlanmaz).
  function parseResourceBody(req, fallbackSolved) {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    assertSubjectExists(db, subjectId);
    return {
      name: requireString(body.name, "Kitap adı", { maxLength: 150 }),
      publisher: parsePublisher(body.publisher),
      subjectId,
      status: requireOneOf(body.status ?? "elimde", "Durum", STATUSES),
      solvedTests: requireInt(
        body.solvedTests ?? fallbackSolved,
        "Çözülen test sayısı",
        {
          min: 0,
          max: MAX_SOLVED_TESTS,
        },
      ),
    };
  }

  router.get("/", (req, res) => {
    res.json(db.prepare(`${SELECT} ORDER BY r.id`).all().map(toResource));
  });

  router.post("/", (req, res) => {
    const r = parseResourceBody(req, 0);
    // İlk kayıtta zaten test çözülmüşse son çözüm tarihi bugün olur
    const lastSolvedAt = r.solvedTests > 0 ? todayLocal() : null;
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO resources (name, publisher, subject_id, status, solved_tests, last_solved_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        r.name,
        r.publisher,
        r.subjectId,
        r.status,
        r.solvedTests,
        lastSolvedAt,
      );
    res.status(201).json(toResource(findResource(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const existing = findResource(id);
    if (!existing) throw new HttpError(404, "Bulunamadı");
    const r = parseResourceBody(req, existing.solved_tests);
    // Çözülen test arttıysa bugün çözülmüş demektir; aynı kalır ya da azalırsa tarih değişmez
    const raised = r.solvedTests > existing.solved_tests;
    db.prepare(
      `UPDATE resources
       SET name = ?, publisher = ?, subject_id = ?, status = ?, solved_tests = ?,
           last_solved_at = CASE WHEN ? THEN ? ELSE last_solved_at END
       WHERE id = ?`,
    ).run(
      r.name,
      r.publisher,
      r.subjectId,
      r.status,
      r.solvedTests,
      raised ? 1 : 0,
      todayLocal(),
      id,
    );
    res.json(toResource(findResource(id)));
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const { changes } = db
      .prepare("DELETE FROM resources WHERE id = ?")
      .run(id);
    if (changes === 0) throw new HttpError(404, "Bulunamadı");
    res.status(204).end();
  });

  return router;
}
