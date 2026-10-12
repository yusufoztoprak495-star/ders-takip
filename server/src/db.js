import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// Tablolar yoksa oluşturulur. Net hiçbir tabloda saklanmaz, istendiğinde hesaplanır.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('TYT', 'AYT'))
  );

  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('kitap', 'video')),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    total_units INTEGER NOT NULL CHECK (total_units > 0),
    current_unit INTEGER NOT NULL DEFAULT 0 CHECK (current_unit >= 0)
  );

  CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    started_at TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('pomodoro', 'manual'))
  );

  CREATE TABLE IF NOT EXISTS question_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
    correct INTEGER NOT NULL CHECK (correct >= 0),
    wrong INTEGER NOT NULL CHECK (wrong >= 0),
    blank INTEGER NOT NULL CHECK (blank >= 0),
    resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL
  );
`;

// SQLite dosyasını açar (':memory:' bellek içi veritabanı verir) ve şemayı kurar
export function openDb(filePath) {
  if (filePath !== ":memory:") {
    // data/ klasörü ilk çalıştırmada yoktur
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  // SQLite'ta yabancı anahtar kontrolü varsayılan olarak kapalıdır, açıkça açılır
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}
