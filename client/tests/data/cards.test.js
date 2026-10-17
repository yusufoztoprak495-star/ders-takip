import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { parseBackupText } from "../../src/data/validation.js";
import { emptyState } from "../../src/data/seed.js";

const TODAY = "2026-10-19";

function setup() {
  const { app, db } = makeTestApp();
  const fiz = db.subjects.find((s) => s.name === "Fizik" && s.examType === "AYT");
  const topic = db.topics.find((t) => t.subjectId === fiz.id);
  const add = (extra = {}) =>
    request(app).post("/api/cards").send({ subjectId: fiz.id, topicId: topic.id, front: "F = ?", back: "m·a", today: TODAY, ...extra });
  return { app, db, fiz, topic, add };
}

describe("Bilgi kartları (/api/cards)", () => {
  it("kart ekler: ilk kutuda, bugün çalışılacaklar arasında; adlarıyla listelenir", async () => {
    const { app, add, topic } = setup();
    const res = await add();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ box: 1, nextReview: TODAY, createdAt: TODAY, reviews: 0, lapses: 0, track: "yks" });
    const list = await request(app).get("/api/cards");
    expect(list.body[0]).toMatchObject({ subjectName: "Fizik", examType: "AYT", topicName: topic.name, front: "F = ?" });
  });

  it("boş ya da çok uzun yüzü, başka dersin konusunu reddeder", async () => {
    const { add, db, fiz } = setup();
    expect((await add({ front: "  " })).status).toBe(400);
    expect((await add({ back: "" })).status).toBe(400);
    expect((await add({ front: "x".repeat(501) })).status).toBe(400);
    const other = db.topics.find((t) => t.subjectId !== fiz.id);
    expect((await add({ topicId: other.id })).status).toBe(400);
  });

  it("çalışma: bildim üst kutuya, bilemedim ilk kutuya; sayaçlar artar", async () => {
    const { app, add } = setup();
    const { id } = (await add()).body;
    const right = await request(app).post(`/api/cards/${id}/review`).send({ today: TODAY, result: "right" });
    expect(right.body).toMatchObject({ box: 2, nextReview: "2026-10-21", reviews: 1, lapses: 0 });
    const wrong = await request(app).post(`/api/cards/${id}/review`).send({ today: "2026-10-21", result: "wrong" });
    expect(wrong.body).toMatchObject({ box: 1, nextReview: "2026-10-21", reviews: 2, lapses: 1 });
    expect((await request(app).post(`/api/cards/${id}/review`).send({ today: TODAY, result: "x" })).status).toBe(400);
  });

  it("düzenlenir (kutu korunur), silinir", async () => {
    const { app, add } = setup();
    const { id, subjectId } = (await add()).body;
    await request(app).post(`/api/cards/${id}/review`).send({ today: TODAY, result: "right" });
    const edited = await request(app).put(`/api/cards/${id}`).send({ subjectId, topicId: null, front: "Newton 2", back: "F = m·a" });
    expect(edited.body).toMatchObject({ front: "Newton 2", topicId: null, box: 2 });
    expect((await request(app).delete(`/api/cards/${id}`)).status).toBe(204);
    expect((await request(app).get("/api/cards")).body).toEqual([]);
  });

  it("konu silinince bağlantı boşalır; kartı olan ders silinmez; hedef değişince görünmez", async () => {
    const { app, add, topic, fiz } = setup();
    await add();
    await request(app).delete(`/api/topics/${topic.id}`);
    expect((await request(app).get("/api/cards")).body[0].topicId).toBeNull();
    expect((await request(app).delete(`/api/subjects/${fiz.id}`)).status).toBe(400);
    await request(app).put("/api/settings").send({ track: "dgs" });
    expect((await request(app).get("/api/cards")).body).toEqual([]);
  });

  it("yedek şemasında", () => {
    const state = emptyState();
    state.cards = [{ id: 1, track: "yks", subjectId: 1, topicId: null, front: "a", back: "b", createdAt: TODAY, box: 2, nextReview: TODAY, reviews: 1, lapses: 0, x: 1 }];
    const parsed = parseBackupText(JSON.stringify(state));
    expect(parsed.cards[0]).toEqual({ id: 1, track: "yks", subjectId: 1, topicId: null, front: "a", back: "b", createdAt: TODAY, box: 2, nextReview: TODAY, reviews: 1, lapses: 0 });
  });
});
