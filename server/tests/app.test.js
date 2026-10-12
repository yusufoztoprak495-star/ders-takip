import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("createApp", () => {
  it("GET /api/health 200 ve ok döner", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("bilinmeyen API yolu 404 ve Türkçe mesaj döner", async () => {
    const res = await request(createApp()).get("/api/yok");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Bulunamadı" });
  });

  it("bozuk JSON gövdesi 500 değil 400 döner", async () => {
    const res = await request(createApp())
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Geçersiz JSON" });
  });
});
