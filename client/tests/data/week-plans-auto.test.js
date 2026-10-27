import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { validateBackup } from "../../src/data/validation.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
const study = (db, extra = {}) => ({ day: 0, start: 1080, end: 1140, kind: "study", subjectId: math(db).id, title: "Konu: Temel Kavramlar", ...extra });

describe("Önerilen hafta blokları (/api/week-plans/auto)", () => {
  it("blokları haftaya ekler ve önerilen diye işaretler", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const res = await api.post("/api/week-plans/auto").send({
      month: "2026-11",
      week: 1,
      blocks: [study(db), study(db, { day: 1, title: "Soru: Temel Kavramlar" })],
    });
    expect(res.status).toBe(201);
    expect(res.body.removed).toBe(0);
    expect(res.body.created).toHaveLength(2);
    const list = (await api.get("/api/week-plans?month=2026-11")).body;
    expect(list.map((b) => [b.week, b.day, b.title, b.auto])).toEqual([
      [1, 0, "Konu: Temel Kavramlar", true],
      [1, 1, "Soru: Temel Kavramlar", true],
    ]);
  });

  it("yeniden çağrılınca yalnızca o haftanın önerilen bloklarını değiştirir; elle eklenenlere ve diğer haftalara dokunmaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/week-plans").send({ month: "2026-11", week: 1, day: 3, start: 600, end: 660, kind: "other", title: "Vize" });
    await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [study(db)] });
    await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 2, blocks: [study(db, { title: "Konu: Faktöriyel" })] });
    const again = await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [study(db, { day: 2, title: "Konu: Yeni" })] });
    expect(again.body.removed).toBe(1);
    const list = (await api.get("/api/week-plans?month=2026-11")).body;
    expect(list.map((b) => [b.week, b.title])).toEqual([
      [1, "Konu: Yeni"],
      [1, "Vize"],
      [2, "Konu: Faktöriyel"],
    ]);
  });

  it("boş liste o haftanın önerilen bloklarını kaldırır", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [study(db)] });
    const res = await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [] });
    expect(res.status).toBe(201);
    expect(res.body.removed).toBe(1);
    expect((await api.get("/api/week-plans?month=2026-11")).body).toEqual([]);
  });

  it("bir blok bile hatalıysa hiçbir şey değişmez (eski önerilenler de silinmez)", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [study(db)] });
    // Ders programındaki derse denk gelen blok
    await api.post("/api/classes").send({ title: "Mobil programlama", days: [3], start: 810, end: 900, place: "", subjectId: null });
    const bad = await api.post("/api/week-plans/auto").send({
      month: "2026-11",
      week: 1,
      blocks: [study(db, { day: 2 }), study(db, { day: 3, start: 840, end: 900, title: "Konu: Çakışan" })],
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/ders programında/);
    const list = (await api.get("/api/week-plans?month=2026-11")).body;
    expect(list.map((b) => [b.day, b.title])).toEqual([[0, "Konu: Temel Kavramlar"]]);
  });

  it("önerilen bloklar birbiriyle çakışamaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const res = await api.post("/api/week-plans/auto").send({
      month: "2026-11",
      week: 1,
      blocks: [study(db), study(db, { start: 1110, end: 1170, title: "Soru: X" })],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/çakışıyor/);
  });

  it("ayı, haftayı ve listeyi doğrular; yalnızca çalışma bloğu kabul eder", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const cases = [
      [{ month: "2026-13", week: 1, blocks: [] }, /ay/i],
      [{ month: "2026-11", week: 5, blocks: [] }, /hafta/i],
      [{ month: "2026-11", week: 1 }, /liste/i],
      [{ month: "2026-11", week: 1, blocks: "x" }, /liste/i],
      [{ month: "2026-11", week: 1, blocks: Array.from({ length: 201 }, () => study(db)) }, /en fazla 200/],
      [{ month: "2026-11", week: 1, blocks: [study(db, { kind: "other", title: "Spor" })] }, /çalışma bloğu/i],
      [{ month: "2026-11", week: 1, blocks: [study(db, { start: 1100, end: 1090 })] }, /bitiş/i],
      [{ month: "2026-11", week: 1, blocks: [null] }, /blok/i],
    ];
    for (const [body, message] of cases) {
      const res = await api.post("/api/week-plans/auto").send(body);
      expect(res.status, JSON.stringify(body).slice(0, 80)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
  });

  it("önerilen blok elle düzenlenince artık önerilen sayılmaz (yeniden öneride silinmez)", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const made = (await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [study(db)] })).body.created[0];
    const edited = await api.put(`/api/week-plans/${made.id}`).send({ ...study(db), week: 1, start: 1200, end: 1260 });
    expect(edited.status).toBe(200);
    expect(edited.body.auto).toBeUndefined();
    const res = await api.post("/api/week-plans/auto").send({ month: "2026-11", week: 1, blocks: [] });
    expect(res.body.removed).toBe(0);
    expect((await api.get("/api/week-plans?month=2026-11")).body).toHaveLength(1);
  });

  it("auto alanı yedekten geri yüklenir, bozuksa reddedilir", () => {
    const row = { id: 1, track: "yks", month: "2026-11", week: 1, day: 0, start: 600, end: 660, kind: "study", title: "Konu: A", subjectId: 3 };
    const ok = validateBackup({ weekPlans: [{ ...row, auto: true }] });
    expect(ok.weekPlans[0].auto).toBe(true);
    expect(() => validateBackup({ weekPlans: [{ ...row, auto: "evet" }] })).toThrow();
  });
});
