import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

describe("/api/topics", () => {
  it("geçerli konu eklenir (201)", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/topics")
      .send({ subjectId: 1, name: "Yeni konu" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      subjectId: 1,
      name: "Yeni konu",
    });
  });

  it("boş ad 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/topics")
      .send({ subjectId: 1, name: "  " });
    expect(res.status).toBe(400);
  });

  it("olmayan ders 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/topics")
      .send({ subjectId: 999, name: "x" });
    expect(res.status).toBe(400);
  });

  it("subjectId metin olarak gelirse 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app)
      .post("/api/topics")
      .send({ subjectId: "1", name: "x" });
    expect(res.status).toBe(400);
  });

  it("gövdesiz POST 500 değil 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/topics");
    expect(res.status).toBe(400);
  });

  it("PUT konuyu yeniden adlandırır, olmayan konu 404 döner", async () => {
    const { app } = makeTestApp();
    const created = await request(app)
      .post("/api/topics")
      .send({ subjectId: 1, name: "Eski" });
    const res = await request(app)
      .put(`/api/topics/${created.body.id}`)
      .send({ name: "Yeni" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Yeni");
    const missing = await request(app)
      .put("/api/topics/99999")
      .send({ name: "x" });
    expect(missing.status).toBe(404);
  });

  it("DELETE 204 döner, tekrar silince 404 döner", async () => {
    const { app } = makeTestApp();
    const created = await request(app)
      .post("/api/topics")
      .send({ subjectId: 1, name: "Silinecek" });
    const first = await request(app).delete(`/api/topics/${created.body.id}`);
    expect(first.status).toBe(204);
    const second = await request(app).delete(`/api/topics/${created.body.id}`);
    expect(second.status).toBe(404);
  });
});
