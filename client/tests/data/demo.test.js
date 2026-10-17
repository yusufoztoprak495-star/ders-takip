import { describe, it, expect } from "vitest";
import request from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { memoryStorage } from "../../src/data/storage.js";
import { buildDemoState } from "../../src/lib/demoData.js";

describe("Örnek veriler", () => {
  it("aynı tarih için hep aynı veriyi üretir", () => {
    expect(JSON.stringify(buildDemoState("2026-10-19"))).toBe(JSON.stringify(buildDemoState("2026-10-19")));
  });

  it("yedek denetiminden geçer ve uygulama onunla çalışır", async () => {
    const app = createDatabase(memoryStorage(null));
    await app.replaceAll(buildDemoState("2026-10-19"));
    const snap = await app.snapshot();
    expect(snap.sessions.length).toBeGreaterThan(150);
    expect(snap.exams.filter((e) => e.type === "BRANS").length).toBe(9);
    expect((await request(app).get("/api/exams")).status).toBe(200);
    expect((await request(app).get("/api/today?date=2026-10-19")).body.items.length).toBeGreaterThan(5);
    expect((await request(app).get("/api/reviews?date=2026-10-19")).body.length).toBeGreaterThan(0);
    expect((await request(app).get("/api/goals")).body).toEqual({ examDate: "2027-06-19", dailyGoal: 240 });
  });
});
