import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { HttpError, errorHandler } from "../src/errors.js";

// İçinde verilen hatayı fırlatan küçük bir uygulama kurar
function appThrowing(error) {
  const app = express();
  app.get("/boom", () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("HttpError durum kodunu ve mesajını aynen döner", async () => {
    const res = await request(appThrowing(new HttpError(400, "x"))).get(
      "/boom",
    );
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "x" });
  });

  it("beklenmeyen hatada 500 ve genel mesaj döner, iç ayrıntı sızmaz", async () => {
    // Hata konsola yazılır; test çıktısı kirlenmesin diye sustur
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(new Error("gizli"))).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Bir şeyler ters gitti" });
    expect(JSON.stringify(res.body)).not.toContain("gizli");
    expect(JSON.stringify(res.body)).not.toContain("stack");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
