import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";

const TODAY = "2026-10-19";
const tyt = {
  date: "2026-10-10",
  name: "",
  type: "TYT",
  results: {
    turkce: { correct: 30, wrong: 6, blank: 4 },
    sosyal: { correct: 15, wrong: 3, blank: 2 },
    matematik: { correct: 25, wrong: 10, blank: 5 },
    fen: { correct: 12, wrong: 4, blank: 4 },
  },
};

function setup() {
  const { app, db } = makeTestApp();
  const mat = db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
  const topics = db.topics.filter((t) => t.subjectId === mat.id);
  return { app, db, mat, topics };
}

describe("GET /api/weak-topics", () => {
  it("denemede soru kaybettiren, doğruluğu düşük ve tekrarı gelen konuları puanlayıp sıralar", async () => {
    const { app, mat, topics } = setup();
    const [t1, t2, t3] = topics;
    const exam = (await request(app).post("/api/exams").send(tyt)).body;
    await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 6 }] });
    await request(app).post("/api/questions").send({ subjectId: mat.id, topicId: t2.id, date: "2026-10-15", correct: 4, wrong: 6, blank: 2 });
    await request(app).put(`/api/topics/${t3.id}/done`).send({ today: "2026-10-17", done: true }); // tekrar 18'inde
    const res = await request(app).get(`/api/weak-topics?date=${TODAY}`);
    expect(res.status).toBe(200);
    const ids = res.body.map((r) => r.topicId);
    expect(ids.slice(0, 3)).toEqual([t1.id, t2.id, t3.id]);
    expect(res.body[0]).toMatchObject({ subjectId: mat.id, subjectName: "Matematik", examType: "TYT", reason: "Denemelerde 6 soru kaybettirdi" });
    expect(res.body[1].reason).toBe("Doğruluk %33 (12 soru)");
    expect(res.body[2].reason).toBe("Tekrar zamanı geldi");
  });

  it("zayıf konu yoksa en az çalışılan derslerin bitmemiş konularını önerir", async () => {
    const { app } = setup();
    const res = await request(app).get(`/api/weak-topics?date=${TODAY}`);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((r) => r.reason === "Henüz bitmedi")).toBe(true);
    // Her dersten en fazla birkaç konu: çeşitlilik
    const perSubject = new Map();
    for (const r of res.body) perSubject.set(r.subjectId, (perSubject.get(r.subjectId) ?? 0) + 1);
    expect(Math.max(...perSubject.values())).toBeLessThanOrEqual(3);
  });

  it("tarih zorunlu", async () => {
    const { app } = setup();
    expect((await request(app).get("/api/weak-topics")).status).toBe(400);
  });
});
