import { SEED_SUBJECTS } from "./seedData.js";

// Ders tablosu boşsa hazır ders ve konu listesini yükler; doluysa dokunmaz
export function seedIfEmpty(db) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM subjects").get();
  if (n > 0) return;

  const insertSubject = db.prepare(
    "INSERT INTO subjects (name, exam_type) VALUES (?, ?)",
  );
  const insertTopic = db.prepare(
    "INSERT INTO topics (subject_id, name) VALUES (?, ?)",
  );

  // Hepsi tek işlemde yapılır: yarıda hata olursa yarım liste kalmaz
  const load = db.transaction(() => {
    for (const subject of SEED_SUBJECTS) {
      const { lastInsertRowid } = insertSubject.run(
        subject.name,
        subject.examType,
      );
      for (const topic of subject.topics) {
        insertTopic.run(lastInsertRowid, topic);
      }
    }
  });
  load();
}
