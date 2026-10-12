import { Router } from "express";
import { HttpError } from "../errors.js";
import {
  assertSubjectExists,
  parseId,
  requireBody,
  requireInt,
  requireOneOf,
  requireString,
} from "../validation.js";

// Makul üst sınır: bir kitapta en fazla 10000 test (yazım hatasına karşı)
const MAX_TOTAL_TESTS = 10000;
const PUBLISHER_MAX = 100;
const STATUSES = ["elimde", "bitirdim"];

const COLUMNS = "id, name, publisher, subject_id, status, total_tests, solved_tests";

const toResource = (row) => ({
  id: row.id,
  name: row.name,
  publisher: row.publisher,
  subjectId: row.subject_id,
  status: row.status,
  totalTests: row.total_tests,
  solvedTests: row.solved_tests,
  // İlerleme yüzdesi saklanmaz, her seferinde hesaplanır
  progressPercent: Math.round((row.solved_tests / row.total_tests) * 100),
});

// Yayınevi isteğe bağlıdır: verilmezse boş metin olur
function parsePublisher(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new HttpError(400, "Yayınevi metin olmalı");
  const trimmed = value.trim();
  if (trimmed.length > PUBLISHER_MAX) {
    throw new HttpError(400, `Yayınevi en fazla ${PUBLISHER_MAX} karakter olabilir`);
  }
  return trimmed;
}

export function resourcesRouter(db) {
  const router = Router();

  const findResource = (id) =>
    db.prepare(`SELECT ${COLUMNS} FROM resources WHERE id = ?`).get(id);

  // POST ve PUT aynı kuralları kullanır. `solvedTests` verilmezse `fallbackSolved` kullanılır:
  // POST'ta 0, PUT'ta mevcut değer (böylece ad değiştirirken ilerleme sıfırlanmaz).
  function parseResourceBody(req, fallbackSolved) {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    assertSubjectExists(db, subjectId);
    const totalTests = requireInt(body.totalTests, "Toplam test sayısı", { min: 1, max: MAX_TOTAL_TESTS });
    const solvedTests = requireInt(body.solvedTests ?? fallbackSolved, "Çözülen test sayısı", {
      min: 0,
      max: totalTests,
    });
    return {
      name: requireString(body.name, "Kitap adı", { maxLength: 150 }),
      publisher: parsePublisher(body.publisher),
      subjectId,
      status: requireOneOf(body.status ?? "elimde", "Durum", STATUSES),
      totalTests,
      solvedTests,
    };
  }

  router.get("/", (req, res) => {
    const rows = db.prepare(`SELECT ${COLUMNS} FROM resources ORDER BY id`).all();
    res.json(rows.map(toResource));
  });

  router.post("/", (req, res) => {
    const r = parseResourceBody(req, 0);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO resources (name, publisher, subject_id, status, total_tests, solved_tests)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(r.name, r.publisher, r.subjectId, r.status, r.totalTests, r.solvedTests);
    res.status(201).json(toResource(findResource(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const existing = findResource(id);
    if (!existing) throw new HttpError(404, "Bulunamadı");
    const r = parseResourceBody(req, existing.solved_tests);
    db.prepare(
      `UPDATE resources
       SET name = ?, publisher = ?, subject_id = ?, status = ?, total_tests = ?, solved_tests = ?
       WHERE id = ?`,
    ).run(r.name, r.publisher, r.subjectId, r.status, r.totalTests, r.solvedTests, id);
    res.json(toResource(findResource(id)));
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const { changes } = db.prepare("DELETE FROM resources WHERE id = ?").run(id);
    if (changes === 0) throw new HttpError(404, "Bulunamadı");
    res.status(204).end();
  });

  return router;
}
