import { Router } from "express";

export function subjectsRouter(db) {
  const router = Router();

  // Tüm dersler, her birinin konularıyla birlikte
  router.get("/", (req, res) => {
    const subjects = db
      .prepare("SELECT id, name, exam_type FROM subjects ORDER BY id")
      .all();
    const topics = db
      .prepare("SELECT id, subject_id, name FROM topics ORDER BY id")
      .all();

    res.json(
      subjects.map((s) => ({
        id: s.id,
        name: s.name,
        examType: s.exam_type,
        topics: topics
          .filter((t) => t.subject_id === s.id)
          .map((t) => ({ id: t.id, name: t.name })),
      })),
    );
  });

  return router;
}
