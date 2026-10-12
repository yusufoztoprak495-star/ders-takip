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

  -- Kaynaklar yalnızca test kitaplarıdır
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    publisher TEXT NOT NULL DEFAULT '',
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    status TEXT NOT NULL DEFAULT 'elimde' CHECK (status IN ('elimde', 'bitirdim')),
    total_tests INTEGER NOT NULL CHECK (total_tests > 0),
    solved_tests INTEGER NOT NULL DEFAULT 0 CHECK (solved_tests >= 0)
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

// Şema sürümü (PRAGMA user_version). 1: kaynaklar yalnızca test kitabı (video kalktı).
const SCHEMA_VERSION = 1;

// Eski şemada resources tablosunda 'type' sütunu vardı
function hasLegacyResources(db) {
  return db.prepare("PRAGMA table_info(resources)").all().some((c) => c.name === "type");
}

// Eski kaynaklar tablosunu yeni şemaya çevirir; veri kaybolmasın diye önce dosyanın yedeği alınır.
// Kitaplar korunur (id'leri aynı kalır, soru kayıtlarının kitap bağlantısı bozulmaz), videolar silinir
// ve onlara bağlı soru kayıtları kalır, yalnızca bağlantıları boşalır.
function migrateResources(db, filePath) {
  if (filePath !== ":memory:") {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    fs.copyFileSync(filePath, `${filePath}.yedek-${stamp.slice(0, 8)}-${stamp.slice(8)}`);
  }
  // Tabloyu silip yeniden kurarken ON DELETE SET NULL tetiklenip soru kayıtlarının kitap
  // bağlantısını silmesin diye yabancı anahtar kontrolü geçişin süresince kapatılır.
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE resources_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          publisher TEXT NOT NULL DEFAULT '',
          subject_id INTEGER NOT NULL REFERENCES subjects(id),
          status TEXT NOT NULL DEFAULT 'elimde' CHECK (status IN ('elimde', 'bitirdim')),
          total_tests INTEGER NOT NULL CHECK (total_tests > 0),
          solved_tests INTEGER NOT NULL DEFAULT 0 CHECK (solved_tests >= 0)
        );
        INSERT INTO resources_new (id, name, subject_id, status, total_tests, solved_tests)
          SELECT id, name, subject_id,
                 CASE WHEN current_unit >= total_units THEN 'bitirdim' ELSE 'elimde' END,
                 total_units, current_unit
          FROM resources WHERE type = 'kitap';
        UPDATE question_logs SET resource_id = NULL
          WHERE resource_id IS NOT NULL AND resource_id NOT IN (SELECT id FROM resources_new);
        DROP TABLE resources;
        ALTER TABLE resources_new RENAME TO resources;
      `);
      if (db.pragma("foreign_key_check").length > 0) {
        throw new Error("Geçiş sonrası yabancı anahtar hatası");
      }
    })();
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

// SQLite dosyasını açar (':memory:' bellek içi veritabanı verir) ve şemayı kurar
export function openDb(filePath) {
  if (filePath !== ":memory:") {
    // data/ klasörü ilk çalıştırmada yoktur
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  // SQLite'ta yabancı anahtar kontrolü varsayılan olarak kapalıdır, açıkça açılır
  db.pragma("foreign_keys = ON");
  if (hasLegacyResources(db)) migrateResources(db, filePath);
  db.exec(SCHEMA);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
  return db;
}
