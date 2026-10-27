import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");

async function add(api, subjectId, title, month) {
  const res = await api.post("/api/month-plans").send({ month, subjectId, title });
  expect(res.status, title).toBe(201);
  return res.body;
}

describe("Aylık planı ileri/geri kaydırma (/api/month-plans/shift)", () => {
  it("verilen aydan itibaren bütün ayları aynı miktarda kaydırır, haftalar ve notlar korunur", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = await add(api, math(db).id, "Türev", "2026-10");
    const b = await add(api, math(db).id, "Limit", "2026-11");
    const c = await add(api, math(db).id, "Eski", "2026-09");
    await api.put("/api/month-plans/weeks").send({ month: "2026-10", weeks: [{ id: a.id, week: 3 }] });

    const res = await api.post("/api/month-plans/shift").send({ from: "2026-10", by: 1 });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);

    expect((await api.get("/api/month-plans?month=2026-10")).body).toEqual([]);
    const nov = (await api.get("/api/month-plans?month=2026-11")).body;
    expect(nov.map((r) => r.title)).toEqual(["Türev"]);
    expect(nov[0].week).toBe(3);
    expect((await api.get("/api/month-plans?month=2026-12")).body.map((r) => r.title)).toEqual(["Limit"]);
    // from'dan önceki ay yerinde kalır
    expect((await api.get("/api/month-plans?month=2026-09")).body.map((r) => r.id)).toEqual([c.id]);
    expect(b.id).toBeGreaterThan(0);
  });

  it("haftaya özel blokları da aynı kaydırır", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const made = await api.post("/api/week-plans").send({ month: "2026-10", week: 2, day: 2, start: 600, end: 660, kind: "other", title: "Kurs" });
    expect(made.status).toBe(201);
    await api.post("/api/month-plans/shift").send({ from: "2026-10", by: 1 });
    expect((await api.get("/api/week-plans?month=2026-10")).body).toEqual([]);
    expect((await api.get("/api/week-plans?month=2026-11")).body.map((r) => r.title)).toEqual(["Kurs"]);
  });

  it("geri kaydırma başka bir ayın aynı konusuyla çakışırsa hiçbir şey değişmez", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await add(api, math(db).id, "Türev", "2026-10");
    await add(api, math(db).id, "Türev", "2026-11");
    const res = await api.post("/api/month-plans/shift").send({ from: "2026-11", by: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("zaten");
    expect((await api.get("/api/month-plans?month=2026-11")).body).toHaveLength(1);
  });

  it("geçersiz girdiyi Türkçe mesajla reddeder", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    expect((await api.post("/api/month-plans/shift").send({ from: "bozuk", by: 1 })).status).toBe(400);
    expect((await api.post("/api/month-plans/shift").send({ from: "2026-10", by: 0 })).status).toBe(400);
    expect((await api.post("/api/month-plans/shift").send({ from: "2026-10", by: 99 })).status).toBe(400);
    expect((await api.post("/api/month-plans/shift").send({ from: "2100-12", by: 1 })).status).toBe(400);
  });
});
