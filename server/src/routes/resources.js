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

const COLUMNS = "id, name, type, subject_id, total_units, current_unit";

const toResource = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  subjectId: row.subject_id,
  totalUnits: row.total_units,
  currentUnit: row.current_unit,
  // İlerleme yüzdesi saklanmaz, her seferinde hesaplanır
  progressPercent: Math.round((row.current_unit / row.total_units) * 100),
});

export function resourcesRouter(db) {
  const router = Router();

  const findResource = (id) =>
    db.prepare(`SELECT ${COLUMNS} FROM resources WHERE id = ?`).get(id);

  // POST ve PUT aynı kuralları kullanır. `currentUnit` verilmezse `fallbackCurrent` kullanılır:
  // POST'ta 0, PUT'ta mevcut değer (böylece ad değiştirirken ilerleme sıfırlanmaz).
  function parseResourceBody(req, fallbackCurrent) {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    assertSubjectExists(db, subjectId);
    const totalUnits = requireInt(body.totalUnits, "Toplam birim", { min: 1 });
    const currentUnit = requireInt(
      body.currentUnit ?? fallbackCurrent,
      "Kaldığım yer",
      {
        min: 0,
        max: totalUnits,
      },
    );
    return {
      name: requireString(body.name, "Ad", { maxLength: 150 }),
      type: requireOneOf(body.type, "Tür", ["kitap", "video"]),
      subjectId,
      totalUnits,
      currentUnit,
    };
  }

  router.get("/", (req, res) => {
    const rows = db
      .prepare(`SELECT ${COLUMNS} FROM resources ORDER BY id`)
      .all();
    res.json(rows.map(toResource));
  });

  router.post("/", (req, res) => {
    const r = parseResourceBody(req, 0);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO resources (name, type, subject_id, total_units, current_unit)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(r.name, r.type, r.subjectId, r.totalUnits, r.currentUnit);
    res.status(201).json(toResource(findResource(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const existing = findResource(id);
    if (!existing) throw new HttpError(404, "Bulunamadı");
    const r = parseResourceBody(req, existing.current_unit);
    db.prepare(
      `UPDATE resources
       SET name = ?, type = ?, subject_id = ?, total_units = ?, current_unit = ?
       WHERE id = ?`,
    ).run(r.name, r.type, r.subjectId, r.totalUnits, r.currentUnit, id);
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
