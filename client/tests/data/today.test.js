import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { dayIndexOfDate } from "../../src/lib/schedule.js";

describe("dayIndexOfDate", () => {
  it("'YYYY-AA-GG' gününün haftadaki yeri (pazartesi 0)", () => {
    expect(dayIndexOfDate("2026-10-12")).toBe(0);
    expect(dayIndexOfDate("2026-10-18")).toBe(6);
  });
});

// 2026-10-19 pazartesi
const MONDAY = "2026-10-19";

describe("Bugünün programı (/api/today)", () => {
  it("o günün dersleri ve blokları saat sırasıyla, yapıldı bilgisiyle gelir", async () => {
    const { app } = makeTestApp();
    await request(app).post("/api/classes").send({ title: "Fizik", days: [0], start: 510, end: 550 });
    const plan = (await request(app).post("/api/plans").send({ day: 0, start: 900, end: 960, kind: "study", title: "Türev" })).body;
    await request(app).post("/api/plans").send({ day: 1, start: 900, end: 960, kind: "study", title: "Salı bloğu" });
    const res = await request(app).get(`/api/today?date=${MONDAY}`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => [i.type, i.title])).toEqual([
      ["class", "Fizik"],
      ["study", "Türev"],
    ]);
    expect(res.body.items[1]).toMatchObject({ id: plan.id, done: false });
  });

  it("blok o gün için yapıldı işaretlenir; başka günü etkilemez; geri alınabilir", async () => {
    const { app } = makeTestApp();
    const plan = (await request(app).post("/api/plans").send({ day: 0, start: 900, end: 960, kind: "study", title: "Türev" })).body;
    const done = await request(app).put(`/api/plans/${plan.id}/done`).send({ date: MONDAY, done: true });
    expect(done.status).toBe(200);
    expect((await request(app).get(`/api/today?date=${MONDAY}`)).body.items[0].done).toBe(true);
    expect((await request(app).get("/api/today?date=2026-10-26")).body.items[0].done).toBe(false);
    await request(app).put(`/api/plans/${plan.id}/done`).send({ date: MONDAY, done: true });
    await request(app).put(`/api/plans/${plan.id}/done`).send({ date: MONDAY, done: false });
    expect((await request(app).get(`/api/today?date=${MONDAY}`)).body.items[0].done).toBe(false);
  });

  it("bloğun günü olmayan bir tarihte işaretlenemez; silinen bloğun işaretleri de silinir", async () => {
    const { app } = makeTestApp();
    const plan = (await request(app).post("/api/plans").send({ day: 0, start: 900, end: 960, kind: "study", title: "Türev" })).body;
    expect((await request(app).put(`/api/plans/${plan.id}/done`).send({ date: "2026-10-20", done: true })).status).toBe(400);
    await request(app).put(`/api/plans/${plan.id}/done`).send({ date: MONDAY, done: true });
    await request(app).delete(`/api/plans/${plan.id}`);
    const snap = await app.snapshot();
    expect(snap.planChecks).toEqual([]);
  });
});
