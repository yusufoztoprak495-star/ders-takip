import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";
import { validateBackup } from "../../src/data/validation.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");

// Pazartesi 08:30–09:10 matematik dersi
const lesson = (extra = {}) => ({ title: "Matematik", days: [0], start: 510, end: 550, ...extra });

describe("Ders programı (/api/classes)", () => {
  it("başta boş liste döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get("/api/classes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("aynı dersi birden çok güne tek seferde ekler, gün ve saate göre sıralı listeler", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/classes")
      .send(lesson({ days: [3, 0], place: " B-204 " }));
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
    await request(app).post("/api/classes").send(lesson({ title: "Fizik", days: [0], start: 420, end: 460 }));
    const list = (await request(app).get("/api/classes")).body;
    expect(list.map((c) => [c.day, c.start, c.title])).toEqual([
      [0, 420, "Fizik"],
      [0, 510, "Matematik"],
      [3, 510, "Matematik"],
    ]);
    expect(list[1].place).toBe("B-204");
    expect(list[1].subjectId).toBeNull();
  });

  it("geçersiz saat, gün ve adı Türkçe mesajla reddeder", async () => {
    const { app } = makeTestApp();
    const cases = [
      [lesson({ end: 510 }), /bitiş/i],
      [lesson({ start: 512 }), /5 dakika/],
      [lesson({ end: 1445 }), /en fazla/],
      [lesson({ days: [] }), /en az bir gün/i],
      [lesson({ days: [7] }), /gün/i],
      [lesson({ days: [1, 1] }), /aynı gün/i],
      [lesson({ title: "  " }), /boş olamaz/],
    ];
    for (const [body, message] of cases) {
      const res = await request(app).post("/api/classes").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("aynı gün çakışan dersi reddeder, uç uca değeni kabul eder", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/classes").send(lesson());
    const clash = await request(app).post("/api/classes").send(lesson({ title: "Kimya", start: 530, end: 570 }));
    expect(clash.status).toBe(400);
    expect(clash.body.error).toMatch(/Matematik/);
    const touching = await request(app).post("/api/classes").send(lesson({ title: "Kimya", start: 550, end: 590 }));
    expect(touching.status).toBe(201);
  });

  it("ders seçilirse seçili hedefte var olmalı", async () => {
    const { app, db } = makeTestApp();
    const ok = await request(app).post("/api/classes").send(lesson({ subjectId: math(db).id }));
    expect(ok.status).toBe(201);
    expect(ok.body[0].subjectId).toBe(math(db).id);
    const missing = await request(app).post("/api/classes").send(lesson({ days: [1], subjectId: 9999 }));
    expect(missing.status).toBe(400);
  });

  it("düzenleme kendisiyle çakışmaz, başkasıyla çakışırsa reddedilir; silme çalışır", async () => {
    const { app } = makeTestApp();
    const [a] = (await request(app).post("/api/classes").send(lesson())).body;
    await request(app).post("/api/classes").send(lesson({ title: "Fizik", start: 600, end: 640 }));
    const moved = await request(app)
      .put(`/api/classes/${a.id}`)
      .send({ title: "Matematik", day: 0, start: 520, end: 560 });
    expect(moved.status).toBe(200);
    expect(moved.body.start).toBe(520);
    const clash = await request(app)
      .put(`/api/classes/${a.id}`)
      .send({ title: "Matematik", day: 0, start: 590, end: 620 });
    expect(clash.status).toBe(400);
    expect((await request(app).delete(`/api/classes/${a.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/classes/${a.id}`)).status).toBe(404);
  });

  it("her hedefin ders programı ayrıdır", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/classes").send(lesson());
    await request(app).put("/api/settings").send({ track: "uni" });
    expect((await request(app).get("/api/classes")).body).toEqual([]);
    // Başka hedefteki dersle aynı saat çakışma sayılmaz
    expect((await request(app).post("/api/classes").send(lesson({ title: "Algoritma" }))).status).toBe(201);
    await request(app).put("/api/settings").send({ track: "yks" });
    expect((await request(app).get("/api/classes")).body.map((c) => c.title)).toEqual(["Matematik"]);
  });
});

const block = (extra = {}) => ({ day: 0, start: 900, end: 960, kind: "study", title: "Türev tekrarı", ...extra });

describe("Haftalık program (/api/plans)", () => {
  it("çalışma, mola ve diğer bloklarını ekler ve listeler", async () => {
    const { app, db } = makeTestApp();
    const study = await request(app).post("/api/plans").send(block({ title: "", subjectId: math(db).id }));
    expect(study.status).toBe(201);
    await request(app).post("/api/plans").send(block({ kind: "break", title: "", start: 960, end: 975 }));
    await request(app).post("/api/plans").send(block({ kind: "other", title: "Spor", day: 2 }));
    const list = (await request(app).get("/api/plans")).body;
    expect(list.map((p) => [p.day, p.start, p.kind])).toEqual([
      [0, 900, "study"],
      [0, 960, "break"],
      [2, 900, "other"],
    ]);
  });

  it("türü, adı ve dersi doğrular", async () => {
    const { app } = makeTestApp();
    const cases = [
      [block({ kind: "uyku" }), /tür/i],
      [block({ title: "" }), /ders seç ya da/i],
      [block({ kind: "other", title: "" }), /boş olamaz/],
      [block({ day: -1 }), /gün/i],
      [block({ end: 900 }), /bitiş/i],
    ];
    for (const [body, message] of cases) {
      const res = await request(app).post("/api/plans").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("ders programındaki bir dersle ya da başka blokla çakışamaz", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/classes").send(lesson());
    const onClass = await request(app).post("/api/plans").send(block({ start: 520, end: 600 }));
    expect(onClass.status).toBe(400);
    expect(onClass.body.error).toMatch(/ders programı/i);
    await request(app).post("/api/plans").send(block());
    const onPlan = await request(app).post("/api/plans").send(block({ start: 930, end: 1000 }));
    expect(onPlan.status).toBe(400);
    expect(onPlan.body.error).toMatch(/Türev tekrarı/);
  });

  it("düzenler ve siler", async () => {
    const { app } = makeTestApp();
    const created = (await request(app).post("/api/plans").send(block())).body;
    const updated = await request(app).put(`/api/plans/${created.id}`).send(block({ start: 910, end: 980 }));
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ start: 910, end: 980 });
    expect((await request(app).delete(`/api/plans/${created.id}`)).status).toBe(204);
    expect((await request(app).get("/api/plans")).body).toEqual([]);
  });

  it("bir günü başka günlere kopyalar; hedef günün eski bloklarını değiştirir, dersle çakışanı atlar", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/plans").send(block());
    await request(app).post("/api/plans").send(block({ start: 510, end: 540, title: "Sabah tekrarı" }));
    await request(app).post("/api/plans").send(block({ day: 1, start: 1200, end: 1260, title: "Eski blok" }));
    // Çarşamba sabahı ders var: "Sabah tekrarı" oraya kopyalanamaz
    await request(app).post("/api/classes").send(lesson({ days: [2] }));
    const res = await request(app).post("/api/plans/copy").send({ from: 0, to: [1, 2] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ copied: 3, skipped: 1 });
    const list = (await request(app).get("/api/plans")).body;
    expect(list.filter((p) => p.day === 1).map((p) => p.title)).toEqual(["Sabah tekrarı", "Türev tekrarı"]);
    expect(list.filter((p) => p.day === 2).map((p) => p.title)).toEqual(["Türev tekrarı"]);
  });

  it("günü kendisine ya da geçersiz güne kopyalamayı reddeder", async () => {
    const { app } = makeTestApp();
    expect((await request(app).post("/api/plans/copy").send({ from: 0, to: [0] })).status).toBe(400);
    expect((await request(app).post("/api/plans/copy").send({ from: 0, to: [] })).status).toBe(400);
    expect((await request(app).post("/api/plans/copy").send({ from: 9, to: [1] })).status).toBe(400);
  });
});

describe("Gün aralığı (/api/schedule)", () => {
  it("varsayılan 08:00–23:00, değiştirilebilir ve doğrulanır", async () => {
    const { app } = makeTestApp();
    expect((await request(app).get("/api/schedule")).body).toEqual({ dayStart: 480, dayEnd: 1380 });
    const ok = await request(app).put("/api/schedule").send({ dayStart: 420, dayEnd: 1410 });
    expect(ok.status).toBe(200);
    expect((await request(app).get("/api/schedule")).body).toEqual({ dayStart: 420, dayEnd: 1410 });
    const bad = await request(app).put("/api/schedule").send({ dayStart: 900, dayEnd: 930 });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/en az/);
  });
});

describe("Ders silinince program bağlantısı boşalır", () => {
  it("kaydı olmayan ders silinirse ders programı ve plan bloğu silinmez, dersi boşalır", async () => {
    const { app } = makeTestApp();
    const subject = (await request(app).post("/api/subjects").send({ name: "Edebiyat", examType: "AYT" })).body;
    await request(app).post("/api/classes").send(lesson({ subjectId: subject.id }));
    await request(app).post("/api/plans").send(block({ subjectId: subject.id }));
    expect((await request(app).delete(`/api/subjects/${subject.id}`)).status).toBe(204);
    expect((await request(app).get("/api/classes")).body[0].subjectId).toBeNull();
    expect((await request(app).get("/api/plans")).body[0].subjectId).toBeNull();
  });
});

describe("Yedek ve eski veri", () => {
  it("yedek doğrulaması program tablolarını taşır", () => {
    const clean = validateBackup({ subjects: [], classes: [{ id: 1 }], plans: [{ id: 2 }] });
    expect(clean.classes).toEqual([{ id: 1 }]);
    expect(clean.plans).toEqual([{ id: 2 }]);
    expect(() => validateBackup({ classes: "x" })).toThrow(/classes/);
  });

  it("eski veri (program tabloları yok) sorunsuz açılır", async () => {
    const old = emptyState();
    delete old.classes;
    delete old.plans;
    const app = createDatabase(memoryStorage(old));
    expect((await request(app).get("/api/classes")).body).toEqual([]);
    expect((await request(app).get("/api/plans")).body).toEqual([]);
  });

  it("hedefi olmayan program satırları YKS sayılır, geçersiz gün aralığı atılır", () => {
    const state = emptyState();
    state.classes.push({ id: 1, day: 0, start: 480, end: 520, title: "X", subjectId: null, place: "" });
    state.settings.dayStart = 2000;
    state.settings.dayEnd = 100;
    prepareState(state);
    expect(state.classes[0].track).toBe("yks");
    expect(state.settings.dayStart).toBeUndefined();
  });

  it("yedek alınırken program tabloları da gelir", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/classes").send(lesson());
    const snapshot = await app.snapshot();
    expect(snapshot.classes).toHaveLength(1);
    expect(snapshot.plans).toEqual([]);
  });
});
