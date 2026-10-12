import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { openDb } from "../src/db.js";
import { createApp } from "../src/app.js";

let clientDist;

beforeAll(() => {
  clientDist = fs.mkdtempSync(path.join(os.tmpdir(), "ders-takip-dist-"));
  fs.writeFileSync(
    path.join(clientDist, "index.html"),
    "<html><body>Merhaba arayüz</body></html>",
  );
});

afterAll(() => {
  fs.rmSync(clientDist, { recursive: true, force: true });
});

describe("derlenmiş arayüzün servis edilmesi", () => {
  it("clientDist verilince / yolu index.html'i döner", async () => {
    const app = createApp(openDb(":memory:"), { clientDist });
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Merhaba arayüz");
  });

  it("API yolları statik dosyadan etkilenmez: bilinmeyen /api yolu JSON 404 döner", async () => {
    const app = createApp(openDb(":memory:"), { clientDist });
    const res = await request(app).get("/api/yok");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Bulunamadı" });
  });

  it("clientDist verilmezse uygulama yine çalışır (testler böyle kurar)", async () => {
    const app = createApp(openDb(":memory:"));
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });
});
