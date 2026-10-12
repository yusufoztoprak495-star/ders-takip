import { Router } from "express";
import { HttpError } from "../errors.js";
import {
  parseId,
  requireBody,
  requireInt,
  requireString,
} from "../validation.js";

const NAME_MAX = 100;

export function topicsRouter(db) {
  const router = Router();

  const toTopic = (row) => ({
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
  });
  const findTopic = (id) =>
    db.prepare("SELECT id, subject_id, name FROM topics WHERE id = ?").get(id);

  router.post("/", (req, res) => {
    const body = requireBody(req);
    const subjectId = requireInt(body.subjectId, "Ders");
    const name = requireString(body.name, "Konu adı", { maxLength: NAME_MAX });

    const subject = db
      .prepare("SELECT id FROM subjects WHERE id = ?")
      .get(subjectId);
    if (!subject) throw new HttpError(400, "Ders bulunamadı");

    const { lastInsertRowid } = db
      .prepare("INSERT INTO topics (subject_id, name) VALUES (?, ?)")
      .run(subjectId, name);
    res.status(201).json(toTopic(findTopic(lastInsertRowid)));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!findTopic(id)) throw new HttpError(404, "Bulunamadı");
    const name = requireString(requireBody(req).name, "Konu adı", {
      maxLength: NAME_MAX,
    });

    db.prepare("UPDATE topics SET name = ? WHERE id = ?").run(name, id);
    res.json(toTopic(findTopic(id)));
  });

  router.delete("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const { changes } = db.prepare("DELETE FROM topics WHERE id = ?").run(id);
    if (changes === 0) throw new HttpError(404, "Bulunamadı");
    res.status(204).end();
  });

  return router;
}
