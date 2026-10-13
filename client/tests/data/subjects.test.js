import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { emptyState, seedIfEmpty } from "../../src/data/seed.js";

describe("seedIfEmpty", () => {
  it("iki kez çağrılınca ders sayısı değişmez", () => {
    const state = emptyState();
    expect(seedIfEmpty(state)).toBe(true);
    const first = state.subjects.length;
    expect(seedIfEmpty(state)).toBe(false);
    expect(state.subjects.length).toBe(first);
    expect(first).toBe(8);
  });
});

describe("GET /api/subjects", () => {
  it("8 dersi sınav türü ve konularıyla döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).get("/api/subjects");
    expect(res.status).toBe(200);
    const label = (s) => `${s.name} (${s.examType})`;
    expect(res.body.map(label).sort()).toEqual(
      [
        "Türkçe (TYT)",
        "Sosyal Bilimler (TYT)",
        "Matematik (TYT)",
        "Fen Bilimleri (TYT)",
        "Matematik (AYT)",
        "Fizik (AYT)",
        "Kimya (AYT)",
        "Biyoloji (AYT)",
      ].sort(),
    );
    for (const subject of res.body) {
      expect(subject.topics.length).toBeGreaterThanOrEqual(5);
      expect(subject.topics[0]).toEqual({
        id: expect.any(Number),
        name: expect.any(String),
      });
    }
  });
});
