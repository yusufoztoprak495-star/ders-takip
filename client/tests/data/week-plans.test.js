import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";
import { validateBackup } from "../../src/data/validation.js";
import { buildDemoState } from "../../src/lib/demoData.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");

// Ekim 2026'nın 2. haftası, çarşamba (gün 2): 14.10.2026 çarşamba, ayın 2. haftası
const block = (extra = {}) => ({ month: "2026-10", week: 2, day: 2, start: 600, end: 660, kind: "other", title: "Vize", ...extra });

describe("Haftaya özel bloklar (/api/week-plans)", () => {
  it("başta boş; ay verilmezse ya da bozuksa reddeder", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    expect((await api.get("/api/week-plans?month=2026-10")).body).toEqual([]);
    for (const path of ["/api/week-plans", "/api/week-plans?month=2026-13"]) {
      const bad = await api.get(path);
      expect(bad.status, path).toBe(400);
      expect(bad.body.error).toMatch(/ay/i);
    }
  });

  it("ekler; hafta, gün ve saate göre sıralı, yalnızca istenen ayı listeler", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const created = await api.post("/api/week-plans").send(block());
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ month: "2026-10", week: 2, day: 2, start: 600, end: 660, kind: "other", title: "Vize", subjectId: null });
    await api.post("/api/week-plans").send(block({ week: 1, day: 4, title: "Sınav" }));
    await api.post("/api/week-plans").send(block({ start: 480, end: 540, title: "Erken" }));
    await api.post("/api/week-plans").send(block({ month: "2026-11", title: "Kasım" }));
    const list = (await api.get("/api/week-plans?month=2026-10")).body;
    expect(list.map((b) => b.title)).toEqual(["Sınav", "Erken", "Vize"]);
  });

  it("geçersiz hafta, gün, saat, tür ve adı Türkçe mesajla reddeder", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const cases = [
      [block({ week: 0 }), /hafta/i],
      [block({ week: 5 }), /hafta/i],
      [block({ week: "2" }), /hafta/i],
      [block({ month: "2026-13" }), /ay/i],
      [block({ day: 7 }), /gün/i],
      [block({ end: 600 }), /bitiş/i],
      [block({ start: 602 }), /5 dakika/],
      [block({ kind: "tatil" }), /Blok türü/],
      [block({ title: "  " }), /boş olamaz/],
      [block({ kind: "study", title: "", subjectId: null }), /ders seç/i],
    ];
    for (const [body, message] of cases) {
      const res = await api.post("/api/week-plans").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("ders saatiyle ve ortak bloklarla çakışamaz; başka haftada ya da uç uca olabilir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/classes").send({ title: "Matematik", days: [2], start: 540, end: 620 });
    await api.post("/api/plans").send({ kind: "other", day: 2, start: 700, end: 760, title: "Spor" });
    const lesson = await api.post("/api/week-plans").send(block({ start: 600, end: 660 }));
    expect(lesson.status).toBe(400);
    expect(lesson.body.error).toMatch(/Matematik/);
    const common = await api.post("/api/week-plans").send(block({ start: 720, end: 780 }));
    expect(common.status).toBe(400);
    expect(common.body.error).toMatch(/Spor/);
    expect((await api.post("/api/week-plans").send(block({ start: 620, end: 700 }))).status).toBe(201);
    const same = await api.post("/api/week-plans").send(block({ start: 640, end: 690, title: "Başka" }));
    expect(same.status).toBe(400);
    expect(same.body.error).toMatch(/Vize|çakış/);
    expect((await api.post("/api/week-plans").send(block({ week: 3, start: 640, end: 690, title: "Başka" }))).status).toBe(201);
    expect(math(db)).toBeTruthy();
  });

  it("çalışma bloğu için ders seçilebilir, olmayan ders reddedilir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const ok = await api.post("/api/week-plans").send(block({ kind: "study", title: "", subjectId: math(db).id }));
    expect(ok.status).toBe(201);
    expect(ok.body.subjectId).toBe(math(db).id);
    const missing = await api.post("/api/week-plans").send(block({ kind: "study", day: 3, subjectId: 9999 }));
    expect(missing.status).toBe(400);
  });

  it("düzenleme kendisiyle çakışmaz, haftayı ve saati değiştirir; silme çalışır", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/week-plans").send(block())).body;
    const edit = await api.put(`/api/week-plans/${a.id}`).send(block({ start: 620, end: 680, week: 3, title: "Final" }));
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ id: a.id, week: 3, start: 620, end: 680, title: "Final", month: "2026-10" });
    expect((await api.put("/api/week-plans/9999").send(block())).status).toBe(404);
    expect((await api.delete(`/api/week-plans/${a.id}`)).status).toBe(204);
    expect((await api.delete(`/api/week-plans/${a.id}`)).status).toBe(404);
    expect((await api.get("/api/week-plans?month=2026-10")).body).toEqual([]);
  });

  it("her hedefin blokları ayrıdır", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await api.post("/api/week-plans").send(block());
    await api.put("/api/settings").send({ track: "uni" });
    expect((await api.get("/api/week-plans?month=2026-10")).body).toEqual([]);
    await api.put("/api/settings").send({ track: "yks" });
    expect((await api.get("/api/week-plans?month=2026-10")).body).toHaveLength(1);
  });

  it("ders silinince blokta yalnızca ders bağlantısı boşalır", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const subject = (await api.post("/api/subjects").send({ name: "Deneme Dersi", examType: "" })).body;
    const b = (await api.post("/api/week-plans").send(block({ kind: "study", title: "Konu", subjectId: subject.id }))).body;
    expect((await api.delete(`/api/subjects/${subject.id}`)).status).toBe(204);
    const left = (await api.get("/api/week-plans?month=2026-10")).body;
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ id: b.id, subjectId: null });
  });

  it("bugünün programına yalnızca ayın o haftasının o gününde girer, yapıldı işareti taşımaz", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await api.post("/api/plans").send({ kind: "other", day: 2, start: 480, end: 540, title: "Ortak" });
    await api.post("/api/week-plans").send(block());
    const hit = (await api.get("/api/today?date=2026-10-14")).body.items;
    expect(hit.map((i) => i.title)).toEqual(["Ortak", "Vize"]);
    expect(hit[1]).toMatchObject({ weekly: true, type: "other", start: 600, end: 660 });
    // aynı çarşamba ama ayın 3. haftası: yalnızca ortak blok
    expect((await api.get("/api/today?date=2026-10-21")).body.items.map((i) => i.title)).toEqual(["Ortak"]);
    // 2. hafta ama perşembe
    expect((await api.get("/api/today?date=2026-10-15")).body.items).toEqual([]);
    // başka ayın 2. haftasının çarşambası: ortak blok her hafta gelir, haftaya özel gelmez
    expect((await api.get("/api/today?date=2026-11-11")).body.items.map((i) => i.title)).toEqual(["Ortak"]);
  });

  it("ayın son günleri dördüncü haftaya sayılır: 29. günün perşembesi de 4. haftanın perşembesidir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await api.post("/api/week-plans").send(block({ week: 4, day: 3, title: "Son hafta" }));
    expect((await api.get("/api/today?date=2026-10-22")).body.items.map((i) => i.title)).toEqual(["Son hafta"]);
    expect((await api.get("/api/today?date=2026-10-29")).body.items.map((i) => i.title)).toEqual(["Son hafta"]);
  });
});

describe("Haftaya özel bloklar: yedek ve eski veri", () => {
  it("yedek denetimi bilinen alanları korur, bilinmeyenleri atar", () => {
    const row = { id: 1, track: "yks", month: "2026-10", week: 2, day: 2, start: 600, end: 660, kind: "other", title: "Vize", subjectId: null, hack: 1 };
    expect(validateBackup({ weekPlans: [row] }).weekPlans).toEqual([
      { id: 1, track: "yks", month: "2026-10", week: 2, day: 2, start: 600, end: 660, kind: "other", title: "Vize", subjectId: null },
    ]);
    expect(() => validateBackup({ weekPlans: [{ ...row, week: "2" }] })).toThrow(/weekPlans/);
  });

  it("haftaya özel blok tablosu olmayan eski yedek yüklenir", async () => {
    const app = createDatabase(memoryStorage(null));
    const old = emptyState();
    delete old.weekPlans;
    await app.replaceAll(old);
    expect((await request(app).get("/api/week-plans?month=2026-10")).body).toEqual([]);
    expect((await app.snapshot()).weekPlans).toEqual([]);
  });

  it("hedefi olmayan satır YKS sayılır", () => {
    const state = emptyState();
    state.weekPlans.push({ id: 1, month: "2026-10", week: 1, day: 0, start: 480, end: 540, kind: "other", title: "A", subjectId: null });
    prepareState(state, { seed: false });
    expect(state.weekPlans[0].track).toBe("yks");
  });

  it("örnek veride haftaya özel blok bulunur ve yedek denetiminden geçer", async () => {
    const state = buildDemoState("2026-10-19");
    expect(state.weekPlans.length).toBeGreaterThan(0);
    const app = createDatabase(memoryStorage(null));
    await app.replaceAll(state);
    expect((await request(app).get("/api/week-plans?month=2026-10")).body.length).toBeGreaterThan(0);
  });
});
