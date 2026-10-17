import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { parseBackupText } from "../../src/data/validation.js";
import { emptyState } from "../../src/data/seed.js";

const TODAY = "2026-10-19";

function setup() {
  const { app, db } = makeTestApp();
  const mat = db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
  const topic = db.topics.find((t) => t.subjectId === mat.id);
  const add = (extra = {}) =>
    request(app)
      .post("/api/mistakes")
      .send({ subjectId: mat.id, topicId: topic.id, source: "3D TYT 4", note: "Payda eşitlemeyi unuttum", answer: "C", imageId: "abc12345-img", today: TODAY, ...extra });
  return { app, db, mat, topic, add };
}

describe("Hata defteri (/api/mistakes)", () => {
  it("soru ekler: ertesi gün tekrar listesine düşer, ders/konu adıyla listelenir", async () => {
    const { app, add, topic } = setup();
    const res = await add();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ createdAt: TODAY, reviewStep: 0, nextReview: "2026-10-20", track: "yks", imageId: "abc12345-img" });
    const list = await request(app).get("/api/mistakes");
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ subjectName: "Matematik", examType: "TYT", topicName: topic.name });
  });

  it("fotoğraf ya da not olmadan, geçersiz görsel kimliğiyle ya da başka dersin konusuyla eklenmez", async () => {
    const { add, db, mat } = setup();
    expect((await add({ note: "", imageId: null })).status).toBe(400);
    expect((await add({ imageId: "../../etc" })).status).toBe(400);
    const other = db.topics.find((t) => t.subjectId !== mat.id);
    expect((await add({ topicId: other.id })).status).toBe(400);
    expect((await add({ answer: "x".repeat(41) })).status).toBe(400);
    expect((await add({ note: "", imageId: null, topicId: null })).status).toBe(400);
    expect((await add({ imageId: null })).status).toBe(201); // yalnızca not da olur
  });

  it("doğru çözdükçe 1-3-7-30 gün aralıklarla ilerler, 4. doğrudan sonra öğrenilmiş sayılır", async () => {
    const { app, add } = setup();
    const { id } = (await add()).body;
    const review = (today, result) => request(app).post(`/api/mistakes/${id}/review`).send({ today, result });
    expect((await review("2026-10-20", "right")).body).toMatchObject({ reviewStep: 1, nextReview: "2026-10-23" });
    expect((await review("2026-10-23", "right")).body).toMatchObject({ reviewStep: 2, nextReview: "2026-10-30" });
    expect((await review("2026-10-30", "right")).body).toMatchObject({ reviewStep: 3, nextReview: "2026-11-29" });
    const done = (await review("2026-11-29", "right")).body;
    expect(done).toMatchObject({ reviewStep: 4, nextReview: null, learnedAt: "2026-11-29" });
  });

  it("yine yanlış yapılırsa başa döner (ertesi gün)", async () => {
    const { app, add } = setup();
    const { id } = (await add()).body;
    await request(app).post(`/api/mistakes/${id}/review`).send({ today: "2026-10-20", result: "right" });
    const res = await request(app).post(`/api/mistakes/${id}/review`).send({ today: "2026-10-23", result: "wrong" });
    expect(res.body).toMatchObject({ reviewStep: 0, nextReview: "2026-10-24", wrongCount: 1 });
    expect((await request(app).post(`/api/mistakes/${id}/review`).send({ today: "2026-10-23", result: "belki" })).status).toBe(400);
  });

  it("düzenlenir; tekrar bilgisi korunur", async () => {
    const { app, add } = setup();
    const { id } = (await add()).body;
    await request(app).post(`/api/mistakes/${id}/review`).send({ today: "2026-10-20", result: "right" });
    const res = await request(app).put(`/api/mistakes/${id}`).send({ subjectId: (await add()).body.subjectId, topicId: null, source: "", note: "yeni", answer: "", imageId: "abc12345-img" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ note: "yeni", topicId: null, reviewStep: 1, nextReview: "2026-10-23" });
  });

  it("silinince görsel kimliğini döner (görsel deposundan da silinsin diye)", async () => {
    const { app, add } = setup();
    const { id } = (await add()).body;
    const res = await request(app).delete(`/api/mistakes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imageId: "abc12345-img" });
    expect((await request(app).get("/api/mistakes")).body).toEqual([]);
  });

  it("konu silinince bağlantı boşalır; hata defterinde sorusu olan ders silinmez", async () => {
    const { app, add, topic, mat } = setup();
    await add();
    await request(app).delete(`/api/topics/${topic.id}`);
    expect((await request(app).get("/api/mistakes")).body[0].topicId).toBeNull();
    expect((await request(app).delete(`/api/subjects/${mat.id}`)).status).toBe(400);
  });

  it("yalnızca seçili hedefin soruları listelenir", async () => {
    const { app, add } = setup();
    await add();
    await request(app).put("/api/settings").send({ track: "dgs" });
    expect((await request(app).get("/api/mistakes")).body).toEqual([]);
  });

  it("yedek şemasında: alanlar geri gelir, bilinmeyenler atılır", () => {
    const state = emptyState();
    state.mistakes = [{ id: 1, track: "yks", subjectId: 1, topicId: null, source: "", note: "n", answer: "A", imageId: "abc12345-img", createdAt: TODAY, reviewStep: 0, nextReview: "2026-10-20", learnedAt: null, wrongCount: 0, kotu: 1 }];
    const parsed = parseBackupText(JSON.stringify(state));
    expect(parsed.mistakes[0]).not.toHaveProperty("kotu");
    expect(parsed.mistakes[0]).toMatchObject({ imageId: "abc12345-img", answer: "A" });
  });
});
