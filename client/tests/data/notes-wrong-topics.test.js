import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { parseBackupText } from "../../src/data/validation.js";
import { emptyState } from "../../src/data/seed.js";

const tyt = (extra = {}) => ({
  date: "2026-10-10",
  name: "Deneme 1",
  type: "TYT",
  results: {
    turkce: { correct: 32, wrong: 4, blank: 4 },
    sosyal: { correct: 15, wrong: 2, blank: 3 },
    matematik: { correct: 25, wrong: 8, blank: 7 },
    fen: { correct: 12, wrong: 4, blank: 4 },
  },
  ...extra,
});

// Hazır listeden iki dersin ilk konuları
function topicsOf(db) {
  const mat = db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
  const fiz = db.subjects.find((s) => s.name === "Fizik" && s.examType === "TYT");
  const first = (s) => db.topics.find((t) => t.subjectId === s.id);
  return { mat, fiz, t1: first(mat), t2: db.topics.filter((t) => t.subjectId === mat.id)[1], t3: first(fiz) };
}

describe("Konu notları (PUT /api/topics/:id/note)", () => {
  it("not kaydeder, konu ayrıntısında ve ders listesinde görünür; boş not silinir", async () => {
    const { app, db } = makeTestApp();
    const { t1 } = topicsOf(db);
    const res = await request(app).put(`/api/topics/${t1.id}/note`).send({ note: "  Formül: a² − b² = (a−b)(a+b)  " });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe("Formül: a² − b² = (a−b)(a+b)");
    const detail = await request(app).get(`/api/stats/topic/${t1.id}`);
    expect(detail.body.note).toBe("Formül: a² − b² = (a−b)(a+b)");
    const subjects = await request(app).get("/api/subjects");
    const listed = subjects.body.flatMap((s) => s.topics).find((t) => t.id === t1.id);
    expect(listed.hasNote).toBe(true);

    await request(app).put(`/api/topics/${t1.id}/note`).send({ note: "   " });
    expect((await request(app).get(`/api/stats/topic/${t1.id}`)).body.note).toBe("");
    const again = (await request(app).get("/api/subjects")).body.flatMap((s) => s.topics).find((t) => t.id === t1.id);
    expect(again.hasNote).toBeUndefined();
  });

  it("çok uzun ya da metin olmayan notu, olmayan konuyu reddeder", async () => {
    const { app, db } = makeTestApp();
    const { t1 } = topicsOf(db);
    expect((await request(app).put(`/api/topics/${t1.id}/note`).send({ note: "x".repeat(2001) })).status).toBe(400);
    expect((await request(app).put(`/api/topics/${t1.id}/note`).send({ note: 5 })).status).toBe(400);
    expect((await request(app).put(`/api/topics/99999/note`).send({ note: "a" })).status).toBe(404);
  });
});

describe("Denemede yanlış yapılan konular", () => {
  it("denemeye konu ve soru sayısı işler; aynı konu birleşir, 0 olanlar atılır", async () => {
    const { app, db } = makeTestApp();
    const { t1, t3 } = topicsOf(db);
    const exam = (await request(app).post("/api/exams").send(tyt())).body;
    const res = await request(app)
      .put(`/api/exams/${exam.id}/wrong-topics`)
      .send({ items: [{ topicId: t1.id, count: 2 }, { topicId: t3.id, count: 0 }, { topicId: t1.id, count: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.wrongTopics).toEqual([{ topicId: t1.id, count: 3 }]);
    const list = await request(app).get("/api/exams");
    expect(list.body[0].wrongTopics).toEqual([{ topicId: t1.id, count: 3 }]);
  });

  it("toplam, denemedeki yanlış + boş sayısını aşamaz; olmayan konu ya da başka hedefin konusu reddedilir", async () => {
    const { app, db } = makeTestApp();
    const { t1 } = topicsOf(db);
    const exam = (await request(app).post("/api/exams").send(tyt())).body; // 18 yanlış + 18 boş = 36
    const over = await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 37 }] });
    expect(over.status).toBe(400);
    const missing = await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: [{ topicId: 99999, count: 1 }] });
    expect(missing.status).toBe(400);
    expect((await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: "x" })).status).toBe(400);
  });

  it("denemeyi düzenlemek işlenen konuları silmez", async () => {
    const { app, db } = makeTestApp();
    const { t1 } = topicsOf(db);
    const exam = (await request(app).post("/api/exams").send(tyt())).body;
    await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 2 }] });
    const edited = await request(app).put(`/api/exams/${exam.id}`).send(tyt({ name: "Yeni ad" }));
    expect(edited.body.wrongTopics).toEqual([{ topicId: t1.id, count: 2 }]);
  });

  it("GET /api/exams/wrong-topics tüm denemelerden konu başına toplar, çoktan aza sıralar", async () => {
    const { app, db } = makeTestApp();
    const { t1, t2, t3 } = topicsOf(db);
    const a = (await request(app).post("/api/exams").send(tyt())).body;
    const b = (await request(app).post("/api/exams").send(tyt({ date: "2026-10-12" }))).body;
    await request(app).put(`/api/exams/${a.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 2 }, { topicId: t3.id, count: 4 }] });
    await request(app).put(`/api/exams/${b.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 3 }, { topicId: t2.id, count: 1 }] });
    const res = await request(app).get("/api/exams/wrong-topics");
    expect(res.status).toBe(200);
    expect(res.body.map((r) => [r.topicId, r.count, r.exams])).toEqual([
      [t1.id, 5, 2],
      [t3.id, 4, 1],
      [t2.id, 1, 1],
    ]);
    expect(res.body[0]).toMatchObject({ topicName: t1.name, subjectName: "Matematik", examType: "TYT", lastDate: "2026-10-12" });
  });

  it("konu silinince denemelerdeki kaydı da düşer", async () => {
    const { app, db } = makeTestApp();
    const { t1, t3 } = topicsOf(db);
    const exam = (await request(app).post("/api/exams").send(tyt())).body;
    await request(app).put(`/api/exams/${exam.id}/wrong-topics`).send({ items: [{ topicId: t1.id, count: 2 }, { topicId: t3.id, count: 1 }] });
    await request(app).delete(`/api/topics/${t1.id}`);
    expect((await request(app).get("/api/exams")).body[0].wrongTopics).toEqual([{ topicId: t3.id, count: 1 }]);
  });
});

describe("Yedek: not ve yanlış konular", () => {
  it("konu notu ve denemenin yanlış konuları yedekten geri gelir; bozuk liste reddedilir", () => {
    const state = emptyState();
    state.topics.push({ id: 1, subjectId: 1, name: "Türev", note: "zincir kuralı" });
    state.exams.push({ id: 1, track: "yks", date: "2026-10-10", name: "", type: "TYT", results: {}, wrongTopics: [{ topicId: 1, count: 2 }] });
    const parsed = parseBackupText(JSON.stringify(state));
    expect(parsed.topics[0].note).toBe("zincir kuralı");
    expect(parsed.exams[0].wrongTopics).toEqual([{ topicId: 1, count: 2 }]);

    state.exams[0].wrongTopics = [{ topicId: "1", count: 2 }];
    expect(() => parseBackupText(JSON.stringify(state))).toThrow(/Yedek dosyası geçersiz/);
    state.exams[0].wrongTopics = [{ topicId: 1, count: 2, __proto__x: 1 }];
    expect(parseBackupText(JSON.stringify(state)).exams[0].wrongTopics).toEqual([{ topicId: 1, count: 2 }]);
  });
});
