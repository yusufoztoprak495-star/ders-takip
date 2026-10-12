import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeTestApp } from "./helpers.js";

function valid(overrides = {}) {
  return {
    name: "Hocalara Geldik Matematik",
    publisher: "Hoca Yayınları",
    subjectId: 3,
    totalTests: 120,
    solvedTests: 30,
    status: "elimde",
    ...overrides,
  };
}

describe("/api/resources (test kitapları)", () => {
  it("geçerli kitap eklenir (201) ve progressPercent hesaplanır", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), ...valid(), progressPercent: 25 });

    const list = await request(app).get("/api/resources");
    expect(list.body).toHaveLength(1);
  });

  it("solvedTests verilmezse 0, status verilmezse elimde, yayınevi verilmezse boş olur", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send({ name: "Kitap", subjectId: 3, totalTests: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ solvedTests: 0, status: "elimde", publisher: "", progressPercent: 0 });
  });

  it("eski 'type' alanı gönderilse de yok sayılır", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid({ type: "video" }));
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty("type");
  });

  it.each([
    ["totalTests 0", { totalTests: 0 }],
    ["totalTests metin", { totalTests: "10" }],
    ["totalTests çok büyük", { totalTests: 10001 }],
    ["solvedTests negatif", { solvedTests: -1 }],
    ["solvedTests ondalık", { solvedTests: 1.5 }],
    ["solvedTests > totalTests", { solvedTests: 121 }],
    ["geçersiz durum", { status: "kayip" }],
    ["boş ad", { name: "  " }],
    ["çok uzun yayınevi", { publisher: "x".repeat(101) }],
    ["yayınevi metin değil", { publisher: 5 }],
    ["olmayan ders", { subjectId: 9999 }],
    ["ders eksik", { subjectId: undefined }],
  ])("%s → 400", async (_, overrides) => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid(overrides));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("PUT günceller; solvedTests verilmezse ilerleme korunur", async () => {
    const { app } = makeTestApp();
    const { body: created } = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.id}`)
      .send(valid({ name: "Yeni Ad", solvedTests: undefined }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Yeni Ad", solvedTests: 30 });
  });

  it("PUT ile durum 'bitirdim' yapılabilir", async () => {
    const { app } = makeTestApp();
    const { body: created } = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.id}`)
      .send(valid({ status: "bitirdim", solvedTests: 120 }));
    expect(res.body).toMatchObject({ status: "bitirdim", progressPercent: 100 });
  });

  it("PUT toplam testi mevcut çözülenin altına indirirse 400", async () => {
    const { app } = makeTestApp();
    const { body: created } = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.id}`)
      .send(valid({ totalTests: 10, solvedTests: undefined }));
    expect(res.status).toBe(400);
  });

  it("olmayan kaynak: PUT ve DELETE 404", async () => {
    const { app } = makeTestApp();
    expect((await request(app).put("/api/resources/999").send(valid())).status).toBe(404);
    expect((await request(app).delete("/api/resources/999")).status).toBe(404);
    expect((await request(app).delete("/api/resources/abc")).status).toBe(404);
  });

  it("kitap silinince soru kaydı durur, resource_id boşalır", async () => {
    const { app, db } = makeTestApp();
    const { body: book } = await request(app).post("/api/resources").send(valid());
    await request(app)
      .post("/api/questions")
      .send({ date: "2026-10-12", subjectId: 3, correct: 5, wrong: 1, blank: 0, resourceId: book.id });
    expect((await request(app).delete(`/api/resources/${book.id}`)).status).toBe(204);
    const log = db.prepare("SELECT resource_id FROM question_logs").get();
    expect(log).toEqual({ resource_id: null });
  });
});
