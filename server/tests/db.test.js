import { describe, it, expect } from "vitest";
import { openDb } from "../src/db.js";
import { seedIfEmpty } from "../src/seed.js";

describe("openDb", () => {
  it("5 tabloyu oluşturur", () => {
    const db = openDb(":memory:");
    const names = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .all()
      .map((r) => r.name)
      .sort();
    expect(names).toEqual([
      "question_logs",
      "resources",
      "study_sessions",
      "subjects",
      "topics",
    ]);
  });

  it("olmayan derse bağlı konu eklemeyi reddeder (yabancı anahtar açık)", () => {
    const db = openDb(":memory:");
    expect(() =>
      db
        .prepare("INSERT INTO topics (subject_id, name) VALUES (999, ?)")
        .run("x"),
    ).toThrow();
  });

  it("konu silinince çalışma kaydı durur, topic_id NULL olur", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    const topic = db.prepare("SELECT id, subject_id FROM topics LIMIT 1").get();
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO study_sessions (subject_id, topic_id, started_at, duration_seconds, entry_type)
         VALUES (?, ?, '2026-10-12T10:00:00.000Z', 600, 'manual')`,
      )
      .run(topic.subject_id, topic.id);
    db.prepare("DELETE FROM topics WHERE id = ?").run(topic.id);
    const row = db
      .prepare("SELECT topic_id FROM study_sessions WHERE id = ?")
      .get(lastInsertRowid);
    expect(row).toEqual({ topic_id: null });
  });
});
