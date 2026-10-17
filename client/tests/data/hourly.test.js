import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

async function addSession(app, { subjectId = 1, local, seconds }) {
  const res = await request(app)
    .post("/api/sessions")
    .send({ subjectId, startedAt: new Date(...local).toISOString(), durationSeconds: seconds, entryType: "manual" });
  expect(res.status).toBe(201);
}

const hourOf = (body, h) => body.find((r) => r.hour === h).seconds;

describe("GET /api/stats/hourly", () => {
  it("24 saatin hepsini döner, veri yokken sıfır", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get("/api/stats/hourly?from=2026-10-01&to=2026-10-31");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(24);
    expect(res.body.every((r) => r.seconds === 0)).toBe(true);
  });

  it("saat sınırını aşan çalışmayı saatlere böler (yerel saat)", async () => {
    const { app } = makeTestApp();
    // 20:40'ta başlayan 50 dakika: 20'ye 20 dk, 21'e 30 dk
    await addSession(app, { local: [2026, 9, 12, 20, 40], seconds: 50 * 60 });
    await addSession(app, { local: [2026, 9, 13, 21, 0], seconds: 10 * 60 });
    const res = await request(app).get("/api/stats/hourly?from=2026-10-01&to=2026-10-31");
    expect(hourOf(res.body, 20)).toBe(20 * 60);
    expect(hourOf(res.body, 21)).toBe(40 * 60);
  });

  it("gece yarısını geçen çalışma 0. saate taşar; tarih aralığı ve ders süzgeci uygulanır", async () => {
    const { app } = makeTestApp();
    await addSession(app, { local: [2026, 9, 12, 23, 30], seconds: 60 * 60 });
    await addSession(app, { local: [2026, 8, 1, 10, 0], seconds: 600 }); // aralık dışı
    await addSession(app, { subjectId: 2, local: [2026, 9, 12, 10, 0], seconds: 600 });
    const all = await request(app).get("/api/stats/hourly?from=2026-10-01&to=2026-10-31");
    expect(hourOf(all.body, 23)).toBe(1800);
    expect(hourOf(all.body, 0)).toBe(1800);
    expect(hourOf(all.body, 10)).toBe(600);
    const one = await request(app).get("/api/stats/hourly?from=2026-10-01&to=2026-10-31&subjectId=1");
    expect(hourOf(one.body, 10)).toBe(0);
  });

  it("geçersiz aralığı reddeder", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get("/api/stats/hourly?from=2026-10-31&to=2026-10-01");
    expect(res.status).toBe(400);
  });
});
