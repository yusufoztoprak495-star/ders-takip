import { describe, it, expect } from "vitest";
import request from "supertest";
import { makeTestApp } from "./helpers.js";

function fixtures(db) {
  const subjects = db.prepare("SELECT id FROM subjects ORDER BY id").all();
  const topicOf = (subjectId) =>
    db
      .prepare("SELECT id FROM topics WHERE subject_id = ? LIMIT 1")
      .get(subjectId).id;
  return {
    subjectId: subjects[0].id,
    topicId: topicOf(subjects[0].id),
    otherSubjectTopicId: topicOf(subjects[1].id),
  };
}

function valid(f, overrides = {}) {
  return {
    date: "2026-10-12",
    subjectId: f.subjectId,
    topicId: f.topicId,
    correct: 10,
    wrong: 4,
    blank: 6,
    resourceId: null,
    ...overrides,
  };
}

describe("/api/questions", () => {
  it("geçerli kayıt eklenir (201) ve net hesaplanır", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const res = await request(app).post("/api/questions").send(valid(f));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), ...valid(f), net: 9 });

    const list = await request(app).get("/api/questions");
    expect(list.body).toHaveLength(1);
  });

  it("topicId ve resourceId isteğe bağlıdır", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const body = valid(f);
    delete body.topicId;
    delete body.resourceId;
    const res = await request(app).post("/api/questions").send(body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ topicId: null, resourceId: null });
  });

  it.each([
    ["negatif doğru", { correct: -1 }],
    ["negatif yanlış", { wrong: -1 }],
    ["negatif boş", { blank: -1 }],
    ["hepsi 0 (soru yok)", { correct: 0, wrong: 0, blank: 0 }],
    ["doğru metin", { correct: "5" }],
    ["doğru ondalık", { correct: 1.5 }],
    ["boş eksik", { blank: undefined }],
    ["geçersiz tarih", { date: "2026-02-30" }],
    ["tarih eksik", { date: undefined }],
    ["olmayan ders", { subjectId: 9999 }],
    ["olmayan kaynak", { resourceId: 9999 }],
  ])("%s → 400", async (_, overrides) => {
    const { app, db } = makeTestApp();
    const res = await request(app)
      .post("/api/questions")
      .send(valid(fixtures(db), overrides));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("başka derse ait konu 400 döner", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const res = await request(app)
      .post("/api/questions")
      .send(valid(f, { topicId: f.otherSubjectTopicId }));
    expect(res.status).toBe(400);
  });

  it("gövdesiz POST 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/questions");
    expect(res.status).toBe(400);
  });

  it("from/to tarihe göre süzer (uçlar dahil)", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    for (const date of ["2026-10-10", "2026-10-11", "2026-10-12"]) {
      await request(app).post("/api/questions").send(valid(f, { date }));
    }
    const res = await request(app).get(
      "/api/questions?from=2026-10-11&to=2026-10-12",
    );
    expect(res.body.map((q) => q.date)).toEqual(["2026-10-12", "2026-10-11"]);
  });

  it("kaynak silinince soru kaydı durur, resourceId null olur", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const resource = await request(app)
      .post("/api/resources")
      .send({
        name: "Kitap",
        type: "kitap",
        subjectId: f.subjectId,
        totalUnits: 10,
      });
    await request(app)
      .post("/api/questions")
      .send(valid(f, { resourceId: resource.body.id }));

    await request(app).delete(`/api/resources/${resource.body.id}`);

    const list = await request(app).get("/api/questions");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].resourceId).toBeNull();
  });

  it("PUT günceller, geçersiz veriyi reddeder, olmayan kayıt 404 döner", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const created = await request(app).post("/api/questions").send(valid(f));
    const ok = await request(app)
      .put(`/api/questions/${created.body.id}`)
      .send(valid(f, { correct: 20, wrong: 0, blank: 0 }));
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ correct: 20, net: 20 });

    const bad = await request(app)
      .put(`/api/questions/${created.body.id}`)
      .send(valid(f, { correct: -3 }));
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .put("/api/questions/99999")
      .send(valid(f));
    expect(missing.status).toBe(404);
  });

  it("DELETE 204 döner, tekrar silince 404 döner", async () => {
    const { app, db } = makeTestApp();
    const created = await request(app)
      .post("/api/questions")
      .send(valid(fixtures(db)));
    const first = await request(app).delete(
      `/api/questions/${created.body.id}`,
    );
    expect(first.status).toBe(204);
    const second = await request(app).delete(
      `/api/questions/${created.body.id}`,
    );
    expect(second.status).toBe(404);
  });
});

describe("/api/questions sınır değerleri", () => {
  it.each([
    ["doğru 1e300", { correct: 1e300 }],
    ["yanlış 10001", { wrong: 10001 }],
    ["boş 10001", { blank: 10001 }],
    ["1900 tarihi", { date: "1900-01-01" }],
  ])("%s → 400", async (_, overrides) => {
    const { app, db } = makeTestApp();
    const res = await request(app).post("/api/questions").send(valid(fixtures(db), overrides));
    expect(res.status).toBe(400);
  });

  it("tam 10000 soru kabul edilir", async () => {
    const { app, db } = makeTestApp();
    const res = await request(app)
      .post("/api/questions")
      .send(valid(fixtures(db), { correct: 10000, wrong: 0, blank: 0 }));
    expect(res.status).toBe(201);
  });
});
