import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { parseBackupText } from "../../src/data/validation.js";
import { emptyState } from "../../src/data/seed.js";

// Üniversite hedefine geçip bir ders ve ders programı kurar
async function setup() {
  const { app } = makeTestApp();
  await request(app).put("/api/settings").send({ track: "uni" });
  const subject = (await request(app).post("/api/subjects").send({ name: "Veri Yapıları", examType: "3. Dönem" })).body;
  // Pazartesi 09:00–10:40 (2 ders saati) ve Çarşamba 13:00–13:50 (1 ders saati)
  await request(app).post("/api/classes").send({ title: "Veri Yapıları", place: "", days: [0], start: 540, end: 640, subjectId: subject.id });
  await request(app).post("/api/classes").send({ title: "Veri Yapıları Lab", place: "", days: [2], start: 780, end: 830, subjectId: subject.id });
  return { app, subject };
}

describe("Dersler: kredi, not bileşenleri, devamsızlık hakkı (/api/courses)", () => {
  it("varsayılan: Vize %40 + Final %60, haftalık ders saati programdan, hak %30 kuralıyla", async () => {
    const { app, subject } = await setup();
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      subjectId: subject.id,
      name: "Veri Yapıları",
      credits: 0,
      absenceLimit: null,
      weeklyHours: 3,
      allowance: 12,
      absent: 0,
      components: [
        { name: "Vize", weight: 40, score: null },
        { name: "Final", weight: 60, score: null },
      ],
    });
  });

  it("derse bağlanmamış ama adı aynı olan program satırları da sayılır (büyük/küçük harf fark etmez)", async () => {
    const { app } = await setup();
    const other = (await request(app).post("/api/subjects").send({ name: "Olasılık", examType: "" })).body;
    await request(app).post("/api/classes").send({ title: "OLASILIK", place: "", days: [4], start: 600, end: 700, subjectId: null });
    const course = (await request(app).get("/api/courses")).body.find((c) => c.subjectId === other.id);
    expect(course.weeklyHours).toBe(2);
  });

  it("ders bilgisi kaydedilir; ağırlıklar toplamı 100 olmalı, not 0-100", async () => {
    const { app, subject } = await setup();
    const body = { credits: 5, absenceLimit: 10, components: [{ name: "Vize", weight: 30, score: 65.5 }, { name: "Proje", weight: 20, score: null }, { name: "Final", weight: 50, score: null }] };
    const ok = await request(app).put(`/api/courses/${subject.id}`).send(body);
    expect(ok.status).toBe(200);
    const [course] = (await request(app).get("/api/courses")).body;
    expect(course).toMatchObject({ credits: 5, absenceLimit: 10, allowance: 10 });
    expect(course.components[0].score).toBe(65.5);
    const bad = (extra) => request(app).put(`/api/courses/${subject.id}`).send({ ...body, ...extra });
    expect((await bad({ components: [{ name: "Vize", weight: 40, score: null }] })).status).toBe(400);
    expect((await bad({ components: [{ name: "Vize", weight: 100, score: 101 }] })).status).toBe(400);
    expect((await bad({ components: [{ name: "", weight: 100, score: null }] })).status).toBe(400);
    expect((await bad({ credits: 31 })).status).toBe(400);
    expect((await request(app).put("/api/courses/99999").send(body)).status).toBe(404);
  });

  it("devamsızlık eklenir, ders başına toplanır, silinir", async () => {
    const { app, subject } = await setup();
    const a = await request(app).post("/api/absences").send({ subjectId: subject.id, date: "2026-10-19", hours: 2 });
    expect(a.status).toBe(201);
    await request(app).post("/api/absences").send({ subjectId: subject.id, date: "2026-10-21", hours: 1 });
    expect((await request(app).get("/api/courses")).body[0].absent).toBe(3);
    expect((await request(app).get("/api/absences")).body.map((x) => x.date)).toEqual(["2026-10-21", "2026-10-19"]);
    expect((await request(app).post("/api/absences").send({ subjectId: subject.id, date: "2026-10-19", hours: 0 })).status).toBe(400);
    await request(app).delete(`/api/absences/${a.body.id}`);
    expect((await request(app).get("/api/courses")).body[0].absent).toBe(1);
    // Devamsızlığı olan ders silinmez
    expect((await request(app).delete(`/api/subjects/${subject.id}`)).status).toBe(400);
  });
});

describe("Ödevler (/api/assignments)", () => {
  it("eklenir, teslim tarihine göre sıralanır, teslim edildi işaretlenir, silinir", async () => {
    const { app, subject } = await setup();
    const a = (await request(app).post("/api/assignments").send({ subjectId: subject.id, title: "Bağlı liste ödevi", due: "2026-10-25", note: "" })).body;
    await request(app).post("/api/assignments").send({ subjectId: null, title: "Staj formu", due: "2026-10-21", note: "Bölüm sekreterliği" });
    const list = (await request(app).get("/api/assignments")).body;
    expect(list.map((x) => x.title)).toEqual(["Staj formu", "Bağlı liste ödevi"]);
    expect(list[1]).toMatchObject({ subjectName: "Veri Yapıları", doneAt: null });
    const done = await request(app).put(`/api/assignments/${a.id}/done`).send({ done: true, today: "2026-10-24" });
    expect(done.body.doneAt).toBe("2026-10-24");
    const edited = await request(app).put(`/api/assignments/${a.id}`).send({ subjectId: subject.id, title: "Bağlı liste", due: "2026-10-26", note: "x" });
    expect(edited.body).toMatchObject({ title: "Bağlı liste", doneAt: "2026-10-24" });
    expect((await request(app).post("/api/assignments").send({ title: "", due: "2026-10-26" })).status).toBe(400);
    expect((await request(app).delete(`/api/assignments/${a.id}`)).status).toBe(204);
  });
});

describe("Yedek şeması", () => {
  it("courses, absences, assignments geri gelir; bileşenler temizlenir", () => {
    const state = emptyState();
    state.courses = [{ id: 1, subjectId: 3, credits: 5, absenceLimit: null, components: [{ name: "Vize", weight: 40, score: 55, x: 1 }, { name: "Final", weight: 60, score: null }] }];
    state.absences = [{ id: 1, track: "uni", subjectId: 3, date: "2026-10-19", hours: 2 }];
    state.assignments = [{ id: 1, track: "uni", subjectId: null, title: "a", due: "2026-10-20", note: "", doneAt: null }];
    const parsed = parseBackupText(JSON.stringify(state));
    expect(parsed.courses[0].components).toEqual([{ name: "Vize", weight: 40, score: 55 }, { name: "Final", weight: 60, score: null }]);
    expect(parsed.absences[0].hours).toBe(2);
    expect(parsed.assignments[0].title).toBe("a");
    state.courses[0].components = [{ name: "Vize", weight: "40" }];
    expect(() => parseBackupText(JSON.stringify(state))).toThrow(/Yedek dosyası geçersiz/);
  });
});
