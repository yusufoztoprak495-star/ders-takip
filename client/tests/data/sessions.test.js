import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

// İlk dersin (TYT Türkçe) id'si ve bir konusu; ikinci dersin bir konusu
function fixtures(db) {
  const topicOf = (subjectId) => db.topics.find((t) => t.subjectId === subjectId).id;
  return {
    subjectId: db.subjects[0].id,
    topicId: topicOf(db.subjects[0].id),
    otherSubjectTopicId: topicOf(db.subjects[1].id),
  };
}

function valid(f, overrides = {}) {
  return {
    subjectId: f.subjectId,
    topicId: f.topicId,
    startedAt: "2026-10-12T10:00:00.000Z",
    durationSeconds: 1500,
    entryType: "pomodoro",
    ...overrides,
  };
}

describe("/api/sessions", () => {
  it("geçerli kayıt eklenir (201) ve listede görünür", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const res = await request(app).post("/api/sessions").send(valid(f));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), ...valid(f) });

    const list = await request(app).get("/api/sessions");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it("konu isteğe bağlıdır (null kabul)", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const res = await request(app).post("/api/sessions").send(valid(f, { topicId: null }));
    expect(res.status).toBe(201);
    expect(res.body.topicId).toBeNull();
  });

  it.each([
    ["süre 0", { durationSeconds: 0 }],
    ["süre negatif", { durationSeconds: -5 }],
    ["süre metin", { durationSeconds: "60" }],
    ["süre ondalık", { durationSeconds: 1.5 }],
    ["ders eksik", { subjectId: undefined }],
    ["olmayan ders", { subjectId: 9999 }],
    ["geçersiz entryType", { entryType: "x" }],
    ["geçersiz startedAt", { startedAt: "dün" }],
  ])("%s → 400", async (_, overrides) => {
    const { app, db } = makeTestApp();
    const res = await request(app).post("/api/sessions").send(valid(fixtures(db), overrides));
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("başka derse ait konu 400 döner", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const res = await request(app)
      .post("/api/sessions")
      .send(valid(f, { topicId: f.otherSubjectTopicId }));
    expect(res.status).toBe(400);
  });

  it("olmayan konu 400 döner", async () => {
    const { app, db } = makeTestApp();
    const res = await request(app)
      .post("/api/sessions")
      .send(valid(fixtures(db), { topicId: 99999 }));
    expect(res.status).toBe(400);
  });

  it("gövdesiz POST 400 döner", async () => {
    const { app } = makeTestApp();
    const res = await request(app).post("/api/sessions");
    expect(res.status).toBe(400);
  });

  it("from/to yerel tarihe göre süzer: gece 00:30 kaydı o günün sayılır", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    // Yerel saatle 12 Ekim 00:30; saat diliminden bağımsız olarak yerel gün 12 Ekim
    const startedAt = new Date(2026, 9, 12, 0, 30).toISOString();
    await request(app).post("/api/sessions").send(valid(f, { startedAt }));

    const same = await request(app).get("/api/sessions?from=2026-10-12&to=2026-10-12");
    expect(same.body).toHaveLength(1);
    const previous = await request(app).get("/api/sessions?from=2026-10-11&to=2026-10-11");
    expect(previous.body).toHaveLength(0);
  });

  it("from/to uçları dahildir ve bozuk tarih 400 döner", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    await request(app)
      .post("/api/sessions")
      .send(valid(f, { startedAt: new Date(2026, 9, 10, 12).toISOString() }));
    await request(app)
      .post("/api/sessions")
      .send(valid(f, { startedAt: new Date(2026, 9, 12, 12).toISOString() }));

    const range = await request(app).get("/api/sessions?from=2026-10-10&to=2026-10-12");
    expect(range.body).toHaveLength(2);
    const bad = await request(app).get("/api/sessions?from=abc");
    expect(bad.status).toBe(400);
  });

  it("PUT kaydı günceller, olmayan kayıt 404 döner", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const created = await request(app).post("/api/sessions").send(valid(f));
    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send(valid(f, { durationSeconds: 600, entryType: "manual" }));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.body.id, durationSeconds: 600, entryType: "manual" });

    const missing = await request(app).put("/api/sessions/99999").send(valid(f));
    expect(missing.status).toBe(404);
  });

  it("PUT geçersiz veriyi 400 ile reddeder", async () => {
    const { app, db } = makeTestApp();
    const f = fixtures(db);
    const created = await request(app).post("/api/sessions").send(valid(f));
    const res = await request(app)
      .put(`/api/sessions/${created.body.id}`)
      .send(valid(f, { durationSeconds: 0 }));
    expect(res.status).toBe(400);
  });

  it("DELETE 204 döner, tekrar silince 404 döner", async () => {
    const { app, db } = makeTestApp();
    const created = await request(app).post("/api/sessions").send(valid(fixtures(db)));
    const first = await request(app).delete(`/api/sessions/${created.body.id}`);
    expect(first.status).toBe(204);
    const second = await request(app).delete(`/api/sessions/${created.body.id}`);
    expect(second.status).toBe(404);
  });
});

describe("/api/sessions sınır değerleri", () => {
  it.each([
    ["1e300 saniye", { durationSeconds: 1e300 }],
    ["24 saatten uzun (86401 sn)", { durationSeconds: 86401 }],
    ["1900 yılı", { startedAt: "1900-01-01T10:00:00.000Z" }],
  ])("%s → 400", async (_, overrides) => {
    const { app, db } = makeTestApp();
    const res = await request(app).post("/api/sessions").send(valid(fixtures(db), overrides));
    expect(res.status).toBe(400);
  });

  it("tam 24 saat (86400 sn) kabul edilir", async () => {
    const { app, db } = makeTestApp();
    const res = await request(app).post("/api/sessions").send(valid(fixtures(db), { durationSeconds: 86400 }));
    expect(res.status).toBe(201);
  });
});
