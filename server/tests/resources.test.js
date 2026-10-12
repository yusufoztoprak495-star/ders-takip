import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeTestApp } from "./helpers.js";

function valid(overrides = {}) {
  return {
    name: "Hocalara Geldik Matematik",
    type: "kitap",
    subjectId: 3,
    totalUnits: 120,
    currentUnit: 30,
    ...overrides,
  };
}

describe("/api/resources", () => {
  it("geçerli kaynak eklenir (201) ve progressPercent hesaplanır", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      ...valid(),
      progressPercent: 25,
    });

    const list = await request(app).get("/api/resources");
    expect(list.body).toHaveLength(1);
  });

  it("POST'ta currentUnit verilmezse 0 olur", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send(valid({ currentUnit: undefined }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ currentUnit: 0, progressPercent: 0 });
  });

  it.each([
    ["totalUnits 0", { totalUnits: 0 }],
    ["totalUnits metin", { totalUnits: "10" }],
    ["currentUnit negatif", { currentUnit: -1 }],
    ["currentUnit ondalık", { currentUnit: 1.5 }],
    ["currentUnit > totalUnits", { currentUnit: 121 }],
    ["geçersiz tür", { type: "dergi" }],
    ["boş ad", { name: "  " }],
    ["olmayan ders", { subjectId: 9999 }],
    ["ders eksik", { subjectId: undefined }],
  ])("%s → 400", async (_, overrides) => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/resources")
      .send(valid(overrides));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("gövdesiz POST 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources");
    expect(res.status).toBe(400);
  });

  it("PUT ile 'kaldığım yer' güncellenir", async () => {
    const { app } = makeTestApp();
    const created = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.body.id}`)
      .send(valid({ currentUnit: 60 }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currentUnit: 60, progressPercent: 50 });
  });

  it("PUT'ta currentUnit verilmezse mevcut değer korunur", async () => {
    const { app } = makeTestApp();
    const created = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.body.id}`)
      .send(valid({ name: "Yeni ad", currentUnit: undefined }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Yeni ad", currentUnit: 30 });
  });

  it("PUT'ta totalUnits mevcut currentUnit'in altına düşürülürse 400 döner", async () => {
    const { app } = makeTestApp();
    const created = await request(app).post("/api/resources").send(valid());
    const res = await request(app)
      .put(`/api/resources/${created.body.id}`)
      .send(valid({ totalUnits: 20, currentUnit: undefined }));
    expect(res.status).toBe(400);
  });

  it("olmayan kaynak için PUT 404 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).put("/api/resources/99999").send(valid());
    expect(res.status).toBe(404);
  });

  it("DELETE 204 döner, tekrar silince 404 döner", async () => {
    const { app } = makeTestApp();
    const created = await request(app).post("/api/resources").send(valid());
    const first = await request(app).delete(
      `/api/resources/${created.body.id}`,
    );
    expect(first.status).toBe(204);
    const second = await request(app).delete(
      `/api/resources/${created.body.id}`,
    );
    expect(second.status).toBe(404);
  });
});

describe("/api/resources sınır değerleri", () => {
  it.each([
    ["totalUnits 1e300", { totalUnits: 1e300, currentUnit: 0 }],
    ["totalUnits 100001", { totalUnits: 100001, currentUnit: 0 }],
  ])("%s → 400", async (_, overrides) => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid(overrides));
    expect(res.status).toBe(400);
  });

  it("tam 100000 birim kabul edilir", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/resources").send(valid({ totalUnits: 100000, currentUnit: 0 }));
    expect(res.status).toBe(201);
  });
});
