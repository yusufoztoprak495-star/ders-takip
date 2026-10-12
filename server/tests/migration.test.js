import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openDb as openDbRaw } from "../src/db.js";

// Eski (video destekli) şemayla bir veritabanı dosyası kurar ve örnek veri koyar
function makeLegacyDb(dir) {
  const file = path.join(dir, "calisma.db");
  const old = new Database(file);
  old.pragma("foreign_keys = ON");
  old.exec(`
    CREATE TABLE subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, exam_type TEXT NOT NULL);
    CREATE TABLE topics (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER NOT NULL REFERENCES subjects(id), name TEXT NOT NULL);
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('kitap', 'video')),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      total_units INTEGER NOT NULL CHECK (total_units > 0),
      current_unit INTEGER NOT NULL DEFAULT 0 CHECK (current_unit >= 0)
    );
    CREATE TABLE study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER NOT NULL REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL, started_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
      entry_type TEXT NOT NULL CHECK (entry_type IN ('pomodoro', 'manual'))
    );
    CREATE TABLE question_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      correct INTEGER NOT NULL, wrong INTEGER NOT NULL, blank INTEGER NOT NULL,
      resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL
    );
    INSERT INTO subjects (name, exam_type) VALUES ('Matematik', 'TYT');
    INSERT INTO resources (name, type, subject_id, total_units, current_unit) VALUES
      ('Kitap A', 'kitap', 1, 40, 12),
      ('Kitap B', 'kitap', 1, 30, 30),
      ('Video Seti', 'video', 1, 100, 20);
    INSERT INTO question_logs (date, subject_id, correct, wrong, blank, resource_id) VALUES
      ('2026-10-01', 1, 10, 2, 1, 1),
      ('2026-10-02', 1, 8, 3, 0, 3),
      ('2026-10-03', 1, 5, 5, 5, NULL);
  `);
  old.close();
  return file;
}

const dirs = [];
const opened = [];

// Açılan veritabanları, Windows'ta geçici klasör silinebilsin diye test sonunda kapatılır
function openDb(file) {
  const db = openDbRaw(file);
  opened.push(db);
  return db;
}

function tempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ders-takip-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (opened.length) opened.pop().close();
  while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true });
});

describe("kaynaklar geçişi (video kalktı, kitap alanları yenilendi)", () => {
  it("eski kitap yeni sütunlara taşınır", () => {
    const dir = tempDir();
    const db = openDb(makeLegacyDb(dir));
    const a = db.prepare("SELECT * FROM resources WHERE name = 'Kitap A'").get();
    expect(a).toMatchObject({ solved_tests: 12, status: "elimde", publisher: "", last_solved_at: null });
    expect(a).not.toHaveProperty("total_tests");
  });

  it("tamamlanmış kitap 'bitirdim' olur", () => {
    const db = openDb(makeLegacyDb(tempDir()));
    const b = db.prepare("SELECT status FROM resources WHERE name = 'Kitap B'").get();
    expect(b.status).toBe("bitirdim");
  });

  it("video silinir, bağlı soru kaydı kalır ve bağlantısı boşalır", () => {
    const db = openDb(makeLegacyDb(tempDir()));
    expect(db.prepare("SELECT COUNT(*) AS n FROM resources WHERE name = 'Video Seti'").get().n).toBe(0);
    const log = db.prepare("SELECT resource_id FROM question_logs WHERE date = '2026-10-02'").get();
    expect(log.resource_id).toBeNull();
    expect(db.prepare("SELECT COUNT(*) AS n FROM question_logs").get().n).toBe(3);
  });

  it("kitaba bağlı soru kaydı aynı kitaba bağlı kalır", () => {
    const db = openDb(makeLegacyDb(tempDir()));
    const log = db
      .prepare(
        `SELECT r.name FROM question_logs q JOIN resources r ON r.id = q.resource_id WHERE q.date = '2026-10-01'`,
      )
      .get();
    expect(log.name).toBe("Kitap A");
  });

  it("ikinci açılışta veri değişmez", () => {
    const file = makeLegacyDb(tempDir());
    openDb(file);
    const before = openDb(file).prepare("SELECT * FROM resources ORDER BY id").all();
    const again = openDb(file).prepare("SELECT * FROM resources ORDER BY id").all();
    expect(again).toEqual(before);
    expect(before).toHaveLength(2);
  });

  it("geçişten önce yedek dosyası oluşur ve eski veriyi taşır", () => {
    const dir = tempDir();
    openDb(makeLegacyDb(dir)).close();
    const backups = fs.readdirSync(dir).filter((f) => f.includes(".yedek-"));
    expect(backups).toHaveLength(1);
    const old = new Database(path.join(dir, backups[0]), { readonly: true });
    opened.push(old);
    expect(old.prepare("SELECT COUNT(*) AS n FROM resources").get().n).toBe(3);
  });

  it("ikinci açılışta yeni yedek oluşmaz", () => {
    const dir = tempDir();
    const file = makeLegacyDb(dir);
    openDb(file).close();
    openDb(file).close();
    expect(fs.readdirSync(dir).filter((f) => f.includes(".yedek-"))).toHaveLength(1);
  });

  it("yeni bellek içi veritabanı doğrudan yeni şemayla kurulur", () => {
    const db = openDb(":memory:");
    const cols = db.prepare("PRAGMA table_info(resources)").all().map((c) => c.name);
    expect(cols).toEqual(["id", "name", "publisher", "subject_id", "status", "solved_tests", "last_solved_at"]);
    expect(db.pragma("user_version", { simple: true })).toBe(2);
  });

  it("geçişten sonra yabancı anahtarlar yine açıktır", () => {
    const db = openDb(makeLegacyDb(tempDir()));
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });
});

// Bir önceki sürümün (toplam test sayılı) şemasıyla veritabanı dosyası kurar
function makeV1Db(dir) {
  const file = path.join(dir, "calisma.db");
  const old = new Database(file);
  old.pragma("foreign_keys = ON");
  old.exec(`
    CREATE TABLE subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, exam_type TEXT NOT NULL);
    CREATE TABLE topics (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER NOT NULL REFERENCES subjects(id), name TEXT NOT NULL);
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, publisher TEXT NOT NULL DEFAULT '',
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      status TEXT NOT NULL DEFAULT 'elimde' CHECK (status IN ('elimde', 'bitirdim')),
      total_tests INTEGER NOT NULL CHECK (total_tests > 0),
      solved_tests INTEGER NOT NULL DEFAULT 0 CHECK (solved_tests >= 0)
    );
    CREATE TABLE study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER NOT NULL REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL, started_at TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
      entry_type TEXT NOT NULL CHECK (entry_type IN ('pomodoro', 'manual'))
    );
    CREATE TABLE question_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      topic_id INTEGER REFERENCES topics(id) ON DELETE SET NULL,
      correct INTEGER NOT NULL, wrong INTEGER NOT NULL, blank INTEGER NOT NULL,
      resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL
    );
    INSERT INTO subjects (name, exam_type) VALUES ('Matematik', 'TYT');
    INSERT INTO resources (name, publisher, subject_id, status, total_tests, solved_tests) VALUES
      ('Kitap A', 'Hoca', 1, 'elimde', 40, 12),
      ('Kitap B', '', 1, 'bitirdim', 30, 30);
    INSERT INTO question_logs (date, subject_id, correct, wrong, blank, resource_id) VALUES
      ('2026-10-01', 1, 10, 2, 1, 1),
      ('2026-10-02', 1, 8, 3, 0, 2);
    PRAGMA user_version = 1;
  `);
  old.close();
  return file;
}

describe("toplam test sayısının kaldırılması (sürüm 1 → 2)", () => {
  it("kitaplar, yayınevi, durum ve çözülen test korunur; total_tests kalkar", () => {
    const db = openDb(makeV1Db(tempDir()));
    const rows = db.prepare("SELECT * FROM resources ORDER BY id").all();
    expect(rows).toEqual([
      { id: 1, name: "Kitap A", publisher: "Hoca", subject_id: 1, status: "elimde", solved_tests: 12, last_solved_at: null },
      { id: 2, name: "Kitap B", publisher: "", subject_id: 1, status: "bitirdim", solved_tests: 30, last_solved_at: null },
    ]);
  });

  it("soru kayıtlarının kitap bağlantıları bozulmaz", () => {
    const db = openDb(makeV1Db(tempDir()));
    const links = db.prepare("SELECT resource_id FROM question_logs ORDER BY id").all().map((r) => r.resource_id);
    expect(links).toEqual([1, 2]);
    expect(db.pragma("foreign_key_check")).toEqual([]);
    expect(db.pragma("user_version", { simple: true })).toBe(2);
  });

  it("geçişten önce yedek alınır, ikinci açılışta yenisi oluşmaz", () => {
    const dir = tempDir();
    const file = makeV1Db(dir);
    openDb(file);
    openDb(file);
    expect(fs.readdirSync(dir).filter((f) => f.includes(".yedek-"))).toHaveLength(1);
  });
});
