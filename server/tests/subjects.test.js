import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeTestApp } from "./helpers.js";
import { openDb } from "../src/db.js";
import { seedIfEmpty } from "../src/seed.js";

describe("seedIfEmpty", () => {
  it("iki kez çağrılınca ders sayısı değişmez", () => {
    const db = openDb(":memory:");
    seedIfEmpty(db);
    const first = db.prepare("SELECT COUNT(*) AS n FROM subjects").get().n;
    seedIfEmpty(db);
    const second = db.prepare("SELECT COUNT(*) AS n FROM subjects").get().n;
    expect(first).toBe(8);
    expect(second).toBe(8);
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
