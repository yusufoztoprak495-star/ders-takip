import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { accuracyOf } from "../../src/data/stats.js";

// Test verisindeki ilk dersin (Türkçe, id 1) konuları
function topicsOf(db, subjectId) {
  return db.topics
    .filter((t) => t.subjectId === subjectId)
    .map((t) => ({ id: t.id, name: t.name }));
}

async function addSession(app, { subjectId = 1, topicId = null, local, seconds }) {
  const res = await request(app)
    .post("/api/sessions")
    .send({ subjectId, topicId, startedAt: new Date(...local).toISOString(), durationSeconds: seconds, entryType: "manual" });
  expect(res.status).toBe(201);
}

async function addQuestions(app, { subjectId = 1, topicId = null, resourceId = null, date, correct, wrong, blank }) {
  const res = await request(app)
    .post("/api/questions")
    .send({ subjectId, topicId, resourceId, date, correct, wrong, blank });
  expect(res.status).toBe(201);
}

async function addBook(app, overrides = {}) {
  const res = await request(app)
    .post("/api/resources")
    .send({ name: "Kitap", publisher: "Yayın", subjectId: 1, totalTests: 10, ...overrides });
  return res.body;
}

describe("accuracyOf", () => {
  it("doğru / tüm çözülenler, yüzde olarak yuvarlanır", () => {
    expect(accuracyOf(3, 1, 0)).toBe(75);
    expect(accuracyOf(1, 1, 1)).toBe(33);
    expect(accuracyOf(10, 0, 0)).toBe(100);
  });

  it("hiç soru yoksa null döner (sıfıra bölme yok)", () => {
    expect(accuracyOf(0, 0, 0)).toBeNull();
  });
});

describe("GET /api/stats/by-subject doğruluk", () => {
  it("her derse accuracy ekler; verisiz ders null", async () => {
    const { app } = makeTestApp();
    await addQuestions(app, { date: "2026-10-12", correct: 6, wrong: 2, blank: 2 });
    const res = await request(app).get("/api/stats/by-subject?from=2026-10-01&to=2026-10-31");
    expect(res.body.find((s) => s.subjectId === 1).accuracy).toBe(60);
    expect(res.body.find((s) => s.subjectId === 2).accuracy).toBeNull();
  });
});

describe("GET /api/stats/by-topic", () => {
  it("dersin tüm konularını döner; verisiz konu sıfırlarla ve accuracy null", async () => {
    const { app, db } = makeTestApp();
    const [t1, t2] = topicsOf(db, 1);
    await addSession(app, { topicId: t1.id, local: [2026, 9, 12, 10], seconds: 600 });
    await addQuestions(app, { topicId: t1.id, date: "2026-10-12", correct: 8, wrong: 2, blank: 0 });

    const res = await request(app).get("/api/stats/by-topic?subjectId=1&from=2026-10-01&to=2026-10-31");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(topicsOf(db, 1).length);
    expect(res.body.find((t) => t.topicId === t1.id)).toMatchObject({
      topicName: t1.name,
      totalSeconds: 600,
      correct: 8,
      wrong: 2,
      blank: 0,
      net: 7.5,
      accuracy: 80,
    });
    expect(res.body.find((t) => t.topicId === t2.id)).toMatchObject({
      totalSeconds: 0,
      correct: 0,
      accuracy: null,
    });
  });

  it("tarih aralığının dışındaki kayıtları saymaz", async () => {
    const { app, db } = makeTestApp();
    const [t1] = topicsOf(db, 1);
    await addQuestions(app, { topicId: t1.id, date: "2026-09-01", correct: 5, wrong: 0, blank: 0 });
    const res = await request(app).get("/api/stats/by-topic?subjectId=1&from=2026-10-01&to=2026-10-31");
    expect(res.body.find((t) => t.topicId === t1.id).correct).toBe(0);
  });

  it("konusuz kayıtlar hiçbir konuya sayılmaz", async () => {
    const { app } = makeTestApp();
    await addQuestions(app, { topicId: null, date: "2026-10-12", correct: 5, wrong: 0, blank: 0 });
    const res = await request(app).get("/api/stats/by-topic?subjectId=1&from=2026-10-01&to=2026-10-31");
    expect(res.body.every((t) => t.correct === 0)).toBe(true);
  });

  it("subjectId eksik ya da geçersizse 400, olmayan ders 404", async () => {
    const { app } = makeTestApp();
    expect((await request(app).get("/api/stats/by-topic?from=2026-10-01&to=2026-10-31")).status).toBe(400);
    expect((await request(app).get("/api/stats/by-topic?subjectId=abc&from=2026-10-01&to=2026-10-31")).status).toBe(400);
    expect((await request(app).get("/api/stats/by-topic?subjectId=9999&from=2026-10-01&to=2026-10-31")).status).toBe(404);
  });
});

describe("GET /api/stats/topic/:id", () => {
  it("toplamları, son çalışma gününü, kitap kırılımını ve günlük doğruluğu verir", async () => {
    const { app, db } = makeTestApp();
    const [t1] = topicsOf(db, 1);
    const book = await addBook(app, { name: "Çap Paragraf", publisher: "Çap" });
    await addSession(app, { topicId: t1.id, local: [2026, 9, 10, 10], seconds: 600 });
    await addSession(app, { topicId: t1.id, local: [2026, 9, 12, 10], seconds: 900 });
    await addQuestions(app, { topicId: t1.id, resourceId: book.id, date: "2026-10-10", correct: 6, wrong: 2, blank: 2 });
    await addQuestions(app, { topicId: t1.id, resourceId: null, date: "2026-10-11", correct: 4, wrong: 1, blank: 0 });

    const res = await request(app).get(`/api/stats/topic/${t1.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      topicId: t1.id,
      topicName: t1.name,
      subjectId: 1,
      subjectName: "Türkçe",
      examType: "TYT",
      totalSeconds: 1500,
      correct: 10,
      wrong: 3,
      blank: 2,
      net: 9.25,
      accuracy: 67,
      lastStudiedAt: "2026-10-12",
    });
    expect(res.body.books).toEqual(
      expect.arrayContaining([
        { resourceId: book.id, name: "Çap Paragraf", publisher: "Çap", correct: 6, wrong: 2, blank: 2 },
        { resourceId: null, name: "Kitapsız", publisher: "", correct: 4, wrong: 1, blank: 0 },
      ]),
    );
    expect(res.body.books).toHaveLength(2);
    expect(res.body.daily).toEqual([
      { date: "2026-10-10", correct: 6, wrong: 2, blank: 2, accuracy: 60 },
      { date: "2026-10-11", correct: 4, wrong: 1, blank: 0, accuracy: 80 },
    ]);
  });

  it("son çalışma günü, soru kaydı daha yeniyse onu gösterir", async () => {
    const { app, db } = makeTestApp();
    const [t1] = topicsOf(db, 1);
    await addSession(app, { topicId: t1.id, local: [2026, 9, 5, 10], seconds: 600 });
    await addQuestions(app, { topicId: t1.id, date: "2026-10-09", correct: 1, wrong: 0, blank: 0 });
    const res = await request(app).get(`/api/stats/topic/${t1.id}`);
    expect(res.body.lastStudiedAt).toBe("2026-10-09");
  });

  it("hiç kaydı olmayan konu: sıfırlar, accuracy ve lastStudiedAt null, boş listeler", async () => {
    const { app, db } = makeTestApp();
    const [t1] = topicsOf(db, 1);
    const res = await request(app).get(`/api/stats/topic/${t1.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalSeconds: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      net: 0,
      accuracy: null,
      lastStudiedAt: null,
      books: [],
      daily: [],
    });
  });

  it("olmayan ya da geçersiz konu 404", async () => {
    const { app } = makeTestApp();
    expect((await request(app).get("/api/stats/topic/999999")).status).toBe(404);
    expect((await request(app).get("/api/stats/topic/abc")).status).toBe(404);
  });
});
