import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";
import { validateBackup } from "../../src/data/validation.js";
import { buildDemoState } from "../../src/lib/demoData.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
const physics = (db) => db.subjects.find((s) => s.name === "Fizik" && s.examType === "AYT");

async function add(api, subjectId, title, month = "2026-10", extra = {}) {
  const res = await api.post("/api/month-plans").send({ month, subjectId, title, ...extra });
  expect(res.status, title).toBe(201);
  return res.body;
}

describe("Aylık plan: haftaya dağıtma (/api/month-plans/weeks)", () => {
  it("yeni konu haftasızdır (week: null)", async () => {
    const { app, db } = makeTestApp();
    const a = await add(request(app), math(db).id, "Türev");
    expect(a.week).toBeNull();
    expect((await request(app).get("/api/month-plans?month=2026-10")).body[0].week).toBeNull();
  });

  it("birden çok konunun haftasını tek seferde yazar, listede görünür", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev");
    const b = await add(api, math(db).id, "Limit");
    const res = await api.put("/api/month-plans/weeks").send({
      month: "2026-10",
      weeks: [
        { id: a.id, week: 1 },
        { id: b.id, week: 4 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.map((r) => [r.title, r.week])).toEqual([["Türev", 1], ["Limit", 4]]);
    // null haftayı kaldırır
    const cleared = await api.put("/api/month-plans/weeks").send({ month: "2026-10", weeks: [{ id: a.id, week: null }] });
    expect(cleared.body.find((r) => r.id === a.id).week).toBeNull();
    expect((await api.get("/api/month-plans?month=2026-10")).body.find((r) => r.id === b.id).week).toBe(4);
  });

  it("hatada hiçbir şey değişmez (hepsi ya da hiçbiri)", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev");
    const bad = await api.put("/api/month-plans/weeks").send({ month: "2026-10", weeks: [{ id: a.id, week: 2 }, { id: 9999, week: 1 }] });
    expect(bad.status).toBe(400);
    expect((await api.get("/api/month-plans?month=2026-10")).body[0].week).toBeNull();
  });

  it("geçersiz ay, liste, hafta ve başka aydaki kaydı reddeder", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev");
    const other = await add(api, math(db).id, "İntegral", "2026-11");
    const cases = [
      [{ month: "2026-13", weeks: [{ id: a.id, week: 1 }] }, /ay/i],
      [{ month: "2026-10", weeks: [] }, /en az bir/i],
      [{ month: "2026-10", weeks: "x" }, /en az bir/i],
      [{ month: "2026-10", weeks: [{ id: a.id, week: 0 }] }, /hafta/i],
      [{ month: "2026-10", weeks: [{ id: a.id, week: 5 }] }, /hafta/i],
      [{ month: "2026-10", weeks: [{ id: a.id, week: "1" }] }, /hafta/i],
      [{ month: "2026-10", weeks: [{ id: a.id, week: 1 }, { id: a.id, week: 2 }] }, /aynı/i],
      [{ month: "2026-10", weeks: [{ id: other.id, week: 1 }] }, /bulunamadı/i],
      [{ month: "2026-10", weeks: [{ id: "x", week: 1 }] }, /kimlik|tam sayı/i],
    ];
    for (const [body, message] of cases) {
      const res = await api.put("/api/month-plans/weeks").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("konu adı düzenlenince ve bitti işaretlenince hafta korunur", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev");
    await api.put("/api/month-plans/weeks").send({ month: "2026-10", weeks: [{ id: a.id, week: 3 }] });
    await api.put(`/api/month-plans/${a.id}`).send({ title: "Türev 2", note: "" });
    await api.put(`/api/month-plans/${a.id}/done`).send({ done: true, today: "2026-10-27" });
    expect((await api.get("/api/month-plans?month=2026-10")).body[0]).toMatchObject({ title: "Türev 2", week: 3, doneAt: "2026-10-27" });
  });
});

describe("Aylık plan: aya taşıma ve kopyalama (/api/month-plans/carry)", () => {
  it("taşıma konuyu hedef aya geçirir, haftasını sıfırlar, eski ayda bırakmaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-09");
    await api.put("/api/month-plans/weeks").send({ month: "2026-09", weeks: [{ id: a.id, week: 4 }] });
    const res = await api.post("/api/month-plans/carry").send({ month: "2026-10", ids: [a.id], mode: "move" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 1 });
    expect((await api.get("/api/month-plans?month=2026-09")).body).toEqual([]);
    const moved = (await api.get("/api/month-plans?month=2026-10")).body;
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ id: a.id, title: "Türev", month: "2026-10", week: null });
  });

  it("kopyalama yeni satır açar: bitmemiş, haftasız, nota kaynak ay yazılır; eskisi yerinde kalır", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-09", { note: "kaynak" });
    await api.put(`/api/month-plans/${a.id}/done`).send({ done: true, today: "2026-09-20" });
    const res = await api.post("/api/month-plans/carry").send({ month: "2026-10", ids: [a.id], mode: "copy" });
    expect(res.status).toBe(200);
    const copied = (await api.get("/api/month-plans?month=2026-10")).body;
    expect(copied).toHaveLength(1);
    expect(copied[0]).toMatchObject({ title: "Türev", subjectId: math(db).id, doneAt: null, week: null });
    expect(copied[0].id).not.toBe(a.id);
    expect(copied[0].note).toBe("Tekrar · Eylül 2026");
    expect((await api.get("/api/month-plans?month=2026-09")).body).toHaveLength(1);
  });

  it("hedefte aynı ders ve konu varsa hiçbirini taşımaz (hepsi ya da hiçbiri)", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-09");
    const b = await add(api, physics(db).id, "Vektörler", "2026-09");
    await add(api, physics(db).id, "vektörler", "2026-10");
    const res = await api.post("/api/month-plans/carry").send({ month: "2026-10", ids: [a.id, b.id], mode: "move" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/zaten/);
    expect((await api.get("/api/month-plans?month=2026-09")).body).toHaveLength(2);
    expect((await api.get("/api/month-plans?month=2026-10")).body).toHaveLength(1);
  });

  it("geçersiz ay, tür, liste ve aynı aya taşımayı reddeder", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-09");
    const cases = [
      [{ month: "2026-13", ids: [a.id], mode: "move" }, /ay/i],
      [{ month: "2026-10", ids: [a.id], mode: "sil" }, /taşı|kopyala|move|copy/i],
      [{ month: "2026-10", ids: [], mode: "move" }, /en az bir/i],
      [{ month: "2026-10", ids: [a.id, a.id], mode: "move" }, /aynı/i],
      [{ month: "2026-10", ids: [9999], mode: "move" }, /bulunamadı/i],
      [{ month: "2026-09", ids: [a.id], mode: "move" }, /zaten/i],
    ];
    for (const [body, message] of cases) {
      const res = await api.post("/api/month-plans/carry").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("hedef ayda bir ders için 60 konu sınırı aşılamaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    for (let i = 1; i <= 60; i++) await add(api, math(db).id, `Konu ${i}`, "2026-10");
    const extra = await add(api, math(db).id, "Fazla", "2026-09");
    const res = await api.post("/api/month-plans/carry").send({ month: "2026-10", ids: [extra.id], mode: "move" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/60/);
  });

  it("başka hedefin konusuna dokunamaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-09");
    await api.put("/api/settings").send({ track: "uni" });
    const res = await api.post("/api/month-plans/carry").send({ month: "2026-10", ids: [a.id], mode: "move" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/bulunamadı/i);
  });
});

describe("Aylık plan: hafta alanı yedek ve eski veri", () => {
  it("yedek denetimi week alanını korur; yanlış türü reddeder", () => {
    const row = { id: 1, track: "yks", month: "2026-10", subjectId: 3, title: "Türev", note: "", doneAt: null, week: 2 };
    expect(validateBackup({ monthPlans: [row] }).monthPlans[0].week).toBe(2);
    expect(validateBackup({ monthPlans: [{ ...row, week: null }] }).monthPlans[0].week).toBeNull();
    expect(() => validateBackup({ monthPlans: [{ ...row, week: "2" }] })).toThrow(/monthPlans/);
  });

  it("haftası olmayan eski satır listede week: null döner", async () => {
    const app = createDatabase(memoryStorage(null));
    const old = emptyState();
    old.monthPlans.push({ id: 1, track: "yks", month: "2026-10", subjectId: 1, title: "A", note: "", doneAt: null });
    await app.replaceAll(old);
    expect((await request(app).get("/api/month-plans?month=2026-10")).body[0].week).toBeNull();
  });

  it("örnek veride bazı konuların haftası atanmıştır", () => {
    const state = buildDemoState("2026-10-19");
    expect(state.monthPlans.some((p) => p.week >= 1 && p.week <= 4)).toBe(true);
    expect(state.monthPlans.some((p) => p.week === null)).toBe(true);
  });
});
