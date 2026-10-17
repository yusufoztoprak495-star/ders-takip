import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { validateBackup } from "../../src/data/validation.js";

// --- Deneme sınavları ---

const tyt = (extra = {}) => ({
  date: "2026-10-10",
  name: "3D Türkiye geneli 1",
  type: "TYT",
  results: {
    turkce: { correct: 32, wrong: 4, blank: 4 },
    sosyal: { correct: 15, wrong: 2, blank: 3 },
    matematik: { correct: 25, wrong: 8, blank: 7 },
    fen: { correct: 12, wrong: 4, blank: 4 },
  },
  ...extra,
});

describe("Denemeler (/api/exams)", () => {
  it("deneme ekler; liste yeniden eskiye sıralı ve toplam netle döner", async () => {
    const { app } = makeTestApp();
    const created = await request(app).post("/api/exams").send(tyt());
    expect(created.status).toBe(201);
    await request(app).post("/api/exams").send(tyt({ date: "2026-10-15", name: "" }));
    const list = (await request(app).get("/api/exams")).body;
    expect(list.map((e) => e.date)).toEqual(["2026-10-15", "2026-10-10"]);
    expect(list[1].totals).toEqual({ correct: 84, wrong: 18, blank: 18, net: 79.5 });
  });

  it("bölümün soru sayısını aşan ya da eksik/yanlış bölümlü denemeyi reddeder", async () => {
    const { app } = makeTestApp();
    const over = tyt();
    over.results.fen = { correct: 15, wrong: 6, blank: 0 };
    const res = await request(app).post("/api/exams").send(over);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Fen Bilimleri.*20/);
    const missing = tyt();
    delete missing.results.fen;
    expect((await request(app).post("/api/exams").send(missing)).status).toBe(400);
    expect((await request(app).post("/api/exams").send(tyt({ type: "KPSS" }))).status).toBe(400);
    expect((await request(app).post("/api/exams").send(tyt({ date: "2026-02-30" }))).status).toBe(400);
  });

  it("DGS hedefinde yalnızca DGS denemesi, üniversitede hiç deneme yok", async () => {
    const { app } = makeTestApp();
    await request(app).put("/api/settings").send({ track: "dgs" });
    expect((await request(app).post("/api/exams").send(tyt())).status).toBe(400);
    const dgs = await request(app)
      .post("/api/exams")
      .send({ date: "2026-10-01", name: "", type: "DGS", results: { sayisal: { correct: 30, wrong: 8, blank: 12 }, sozel: { correct: 35, wrong: 4, blank: 11 } } });
    expect(dgs.status).toBe(201);
    await request(app).put("/api/settings").send({ track: "uni" });
    expect((await request(app).get("/api/exams")).body).toEqual([]);
    const uni = await request(app).post("/api/exams").send(tyt());
    expect(uni.status).toBe(400);
  });

  it("düzenler ve siler", async () => {
    const { app } = makeTestApp();
    const { id } = (await request(app).post("/api/exams").send(tyt())).body;
    const edited = await request(app).put(`/api/exams/${id}`).send(tyt({ name: "Düzeltilmiş" }));
    expect(edited.body.name).toBe("Düzeltilmiş");
    expect((await request(app).delete(`/api/exams/${id}`)).status).toBe(204);
    expect((await request(app).get("/api/exams")).body).toEqual([]);
  });
});

// --- Hedefler: sınav tarihi ve günlük çalışma hedefi ---

describe("Hedefler (/api/goals)", () => {
  it("başta boş; sınav tarihi hedefe göre ayrı, günlük hedef ortak tutulur", async () => {
    const { app } = makeTestApp();
    expect((await request(app).get("/api/goals")).body).toEqual({ examDate: null, dailyGoal: 0 });
    await request(app).put("/api/goals").send({ examDate: "2027-06-19", dailyGoal: 240 });
    expect((await request(app).get("/api/goals")).body).toEqual({ examDate: "2027-06-19", dailyGoal: 240 });
    await request(app).put("/api/settings").send({ track: "dgs" });
    expect((await request(app).get("/api/goals")).body).toEqual({ examDate: null, dailyGoal: 240 });
  });

  it("geçersiz tarih ve hedefi reddeder; tarih silinebilir", async () => {
    const { app } = makeTestApp();
    expect((await request(app).put("/api/goals").send({ examDate: "19.06.2027", dailyGoal: 60 })).status).toBe(400);
    expect((await request(app).put("/api/goals").send({ examDate: null, dailyGoal: 2000 })).status).toBe(400);
    expect((await request(app).put("/api/goals").send({ examDate: null, dailyGoal: 15.5 })).status).toBe(400);
    await request(app).put("/api/goals").send({ examDate: "2027-06-19", dailyGoal: 0 });
    await request(app).put("/api/goals").send({ examDate: null, dailyGoal: 0 });
    expect((await request(app).get("/api/goals")).body.examDate).toBeNull();
  });
});

// --- Konu bitirme ve aralıklı tekrar ---

async function firstTopic(app) {
  const subjects = (await request(app).get("/api/subjects")).body;
  return { subject: subjects[0], topic: subjects[0].topics[0] };
}

describe("Konu bitirme ve tekrar (/api/topics/:id/done, /review, /api/reviews)", () => {
  it("bitirilen konu ertesi gün tekrar listesine düşer", async () => {
    const { app } = makeTestApp();
    const { topic } = await firstTopic(app);
    const res = await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "2026-10-17" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ done: true, doneAt: "2026-10-17", nextReview: "2026-10-18", reviewStep: 0 });
    expect((await request(app).get("/api/reviews?date=2026-10-17")).body).toEqual([]);
    const due = (await request(app).get("/api/reviews?date=2026-10-18")).body;
    expect(due.map((d) => d.id)).toEqual([topic.id]);
    expect(due[0].subjectName).toBeTruthy();
  });

  it("tekrar aralıkları 1 → 3 → 7 → 30 gün; dördüncü tekrardan sonra konu kalıcı sayılır", async () => {
    const { app } = makeTestApp();
    const { topic } = await firstTopic(app);
    await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "2026-10-01" });
    const review = (today) => request(app).post(`/api/topics/${topic.id}/review`).send({ today });
    expect((await review("2026-10-02")).body.nextReview).toBe("2026-10-05");
    expect((await review("2026-10-05")).body.nextReview).toBe("2026-10-12");
    expect((await review("2026-10-12")).body.nextReview).toBe("2026-11-11");
    const last = (await review("2026-11-11")).body;
    expect(last.nextReview).toBeNull();
    expect(last.reviewStep).toBe(4);
    expect((await request(app).get("/api/reviews?date=2027-01-01")).body).toEqual([]);
  });

  it("bitmemiş konu tekrar edilemez; bitirme geri alınınca tekrar bilgisi silinir", async () => {
    const { app } = makeTestApp();
    const { topic } = await firstTopic(app);
    expect((await request(app).post(`/api/topics/${topic.id}/review`).send({ today: "2026-10-17" })).status).toBe(400);
    await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "2026-10-17" });
    const undone = await request(app).put(`/api/topics/${topic.id}/done`).send({ done: false, today: "2026-10-17" });
    expect(undone.body.done).toBe(false);
    expect(undone.body.nextReview).toBeUndefined();
    const listed = (await request(app).get("/api/subjects")).body[0].topics[0];
    expect(listed).toEqual({ id: topic.id, name: topic.name });
  });

  it("konu listesinde bitme durumu görünür; geçersiz tarih reddedilir", async () => {
    const { app } = makeTestApp();
    const { topic } = await firstTopic(app);
    expect((await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "yarın" })).status).toBe(400);
    await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "2026-10-17" });
    const listed = (await request(app).get("/api/subjects")).body[0].topics[0];
    expect(listed).toMatchObject({ done: true, nextReview: "2026-10-18" });
  });

  it("tekrar listesi yalnızca seçili hedefin konularını gösterir", async () => {
    const { app } = makeTestApp();
    const { topic } = await firstTopic(app);
    await request(app).put(`/api/topics/${topic.id}/done`).send({ done: true, today: "2026-10-17" });
    await request(app).put("/api/settings").send({ track: "uni" });
    expect((await request(app).get("/api/reviews?date=2026-12-01")).body).toEqual([]);
  });
});

describe("Yedek ve eski veri", () => {
  it("denemeler yedeğe girer; hedefsiz deneme YKS sayılır; hedefler temizlenir", () => {
    expect(validateBackup({ exams: [{ id: 1 }] }).exams).toEqual([{ id: 1 }]);
    const state = emptyState();
    state.exams.push({ id: 1, date: "2026-10-10", name: "", type: "TYT", results: {} });
    state.settings.examDates = { yks: "2027-06-19", dgs: "bozuk", kpss: "2027-01-01" };
    state.settings.dailyGoal = -5;
    prepareState(state);
    expect(state.exams[0].track).toBe("yks");
    expect(state.settings.examDates).toEqual({ yks: "2027-06-19" });
    expect(state.settings.dailyGoal).toBeUndefined();
  });
});
