import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";
import { validateBackup } from "../../src/data/validation.js";
import { buildDemoState } from "../../src/lib/demoData.js";

const math = (db) => db.subjects.find((s) => s.name === "Matematik" && s.examType === "TYT");
const physics = (db) => db.subjects.find((s) => s.name === "Fizik" && s.examType === "AYT");

const item = (subjectId, extra = {}) => ({ month: "2026-10", subjectId, title: "Türev", note: "", ...extra });

describe("Aylık plan (/api/month-plans)", () => {
  it("başta boş liste döner; ay verilmezse ya da bozuksa reddeder", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const res = await api.get("/api/month-plans?month=2026-10");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    for (const path of ["/api/month-plans", "/api/month-plans?month=2026-13", "/api/month-plans?month=ekim"]) {
      const bad = await api.get(path);
      expect(bad.status, path).toBe(400);
      expect(bad.body.error).toMatch(/ay/i);
    }
  });

  it("konuyu ekler: boşlukları kırpar, notu isteğe bağlıdır, bitmemiş başlar", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const res = await api.post("/api/month-plans").send(item(math(db).id, { title: "  Türev  ", note: " 2 kaynak " }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ month: "2026-10", subjectId: math(db).id, title: "Türev", note: "2 kaynak", doneAt: null });
    expect(typeof res.body.id).toBe("number");
    const noNote = await api.post("/api/month-plans").send({ month: "2026-10", subjectId: math(db).id, title: "Limit" });
    expect(noNote.status).toBe(201);
    expect(noNote.body.note).toBe("");
  });

  it("yalnızca istenen ayın kayıtlarını, eklenme sırasıyla listeler", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/month-plans").send(item(math(db).id, { title: "Türev" }));
    await api.post("/api/month-plans").send(item(physics(db).id, { title: "Vektörler" }));
    await api.post("/api/month-plans").send(item(math(db).id, { title: "İntegral", month: "2026-11" }));
    const october = (await api.get("/api/month-plans?month=2026-10")).body;
    expect(october.map((p) => p.title)).toEqual(["Türev", "Vektörler"]);
    const november = (await api.get("/api/month-plans?month=2026-11")).body;
    expect(november.map((p) => p.title)).toEqual(["İntegral"]);
  });

  it("geçersiz ay, ders, başlık ve notu Türkçe mesajla reddeder", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const id = math(db).id;
    const cases = [
      [item(id, { month: "2026-13" }), /ay/i],
      [item(id, { month: undefined }), /ay/i],
      [item(id, { title: "   " }), /boş olamaz/],
      [item(id, { title: "x".repeat(101) }), /en fazla 100/],
      [item(id, { note: "x".repeat(101) }), /en fazla 100/],
      [item(id, { note: 5 }), /metin/],
      [item(9999), /Ders bulunamadı/],
      [item(null), /Ders/],
      [item("1"), /Ders/],
    ];
    for (const [body, message] of cases) {
      const res = await api.post("/api/month-plans").send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error).toMatch(message);
    }
    expect((await api.post("/api/month-plans").send("metin")).status).toBe(400);
  });

  it("aynı ayda aynı derse aynı konu iki kez eklenemez (büyük/küçük harf fark etmez), başka ayda eklenir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/month-plans").send(item(math(db).id, { title: "Işık" }));
    const again = await api.post("/api/month-plans").send(item(math(db).id, { title: "IŞIK" }));
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/zaten/);
    expect((await api.post("/api/month-plans").send(item(physics(db).id, { title: "Işık" }))).status).toBe(201);
    expect((await api.post("/api/month-plans").send(item(math(db).id, { title: "Işık", month: "2026-11" }))).status).toBe(201);
  });

  it("bir ders ayda en fazla 60 konu alır", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    for (let i = 1; i <= 60; i++) {
      const ok = await api.post("/api/month-plans").send(item(math(db).id, { title: `Konu ${i}` }));
      expect(ok.status).toBe(201);
    }
    const over = await api.post("/api/month-plans").send(item(math(db).id, { title: "Konu 61" }));
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/60/);
  });

  it("düzenleme başlık ve notu değiştirir; ay ve ders sabit kalır; kendisiyle çakışmaz", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/month-plans").send(item(math(db).id, { title: "Türev" }))).body;
    await api.post("/api/month-plans").send(item(math(db).id, { title: "Limit" }));
    const same = await api.put(`/api/month-plans/${a.id}`).send({ title: "Türev", note: "bitirmek şart" });
    expect(same.status).toBe(200);
    expect(same.body).toMatchObject({ id: a.id, title: "Türev", note: "bitirmek şart", month: "2026-10", subjectId: math(db).id });
    const clash = await api.put(`/api/month-plans/${a.id}`).send({ title: "limit", note: "" });
    expect(clash.status).toBe(400);
    expect(clash.body.error).toMatch(/zaten/);
    expect((await api.put(`/api/month-plans/${a.id}`).send({ title: " ", note: "" })).status).toBe(400);
    expect((await api.put("/api/month-plans/9999").send({ title: "X", note: "" })).status).toBe(404);
    expect((await api.put("/api/month-plans/abc").send({ title: "X", note: "" })).status).toBe(404);
  });

  it("bitti işareti tarihle kaydedilir ve geri alınabilir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/month-plans").send(item(math(db).id))).body;
    const done = await api.put(`/api/month-plans/${a.id}/done`).send({ done: true, today: "2026-10-27" });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ id: a.id, doneAt: "2026-10-27" });
    expect((await api.get("/api/month-plans?month=2026-10")).body[0].doneAt).toBe("2026-10-27");
    const undone = await api.put(`/api/month-plans/${a.id}/done`).send({ done: false, today: "2026-10-28" });
    expect(undone.body.doneAt).toBeNull();
    expect((await api.get("/api/month-plans?month=2026-10")).body[0].doneAt).toBeNull();
  });

  it("bitti işaretinde geçersiz tarih, tür ve olmayan kayıt reddedilir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/month-plans").send(item(math(db).id))).body;
    expect((await api.put(`/api/month-plans/${a.id}/done`).send({ done: true, today: "2026-02-30" })).status).toBe(400);
    expect((await api.put(`/api/month-plans/${a.id}/done`).send({ done: "evet", today: "2026-10-27" })).status).toBe(400);
    expect((await api.put("/api/month-plans/9999/done").send({ done: true, today: "2026-10-27" })).status).toBe(404);
  });

  it("silme çalışır; olmayan kayıt 404 verir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/month-plans").send(item(math(db).id))).body;
    expect((await api.delete(`/api/month-plans/${a.id}`)).status).toBe(204);
    expect((await api.get("/api/month-plans?month=2026-10")).body).toEqual([]);
    expect((await api.delete(`/api/month-plans/${a.id}`)).status).toBe(404);
  });

  it("her hedefin planı ayrıdır: üniversiteye geçince YKS planı görünmez, yalnızca o hedefin dersi seçilebilir", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/month-plans").send(item(math(db).id));
    await api.put("/api/settings").send({ track: "uni" });
    expect((await api.get("/api/month-plans?month=2026-10")).body).toEqual([]);
    const crossTrack = await api.post("/api/month-plans").send(item(math(db).id, { title: "Başka" }));
    expect(crossTrack.status).toBe(400);
    expect(crossTrack.body.error).toMatch(/Ders bulunamadı/);
    const uniSubject = (await api.post("/api/subjects").send({ name: "Veri Yapıları", examType: "3. Dönem" })).body;
    expect((await api.post("/api/month-plans").send(item(uniSubject.id, { title: "Bağlı liste" }))).status).toBe(201);
    await api.put("/api/settings").send({ track: "yks" });
    expect((await api.get("/api/month-plans?month=2026-10")).body.map((p) => p.title)).toEqual(["Türev"]);
  });

  it("ders silinince o dersin aylık plan satırları da gider, diğerleri kalır", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const subject = (await api.post("/api/subjects").send({ name: "Deneme Dersi", examType: "" })).body;
    const keep = (await api.post("/api/subjects").send({ name: "Kalan Ders", examType: "" })).body;
    await api.post("/api/month-plans").send(item(subject.id, { title: "A" }));
    await api.post("/api/month-plans").send(item(keep.id, { title: "B" }));
    expect((await api.delete(`/api/subjects/${subject.id}`)).status).toBe(204);
    expect((await api.get("/api/month-plans?month=2026-10")).body.map((p) => p.title)).toEqual(["B"]);
  });

  it("kimlikler birbirine karışmaz: silinen satırın kimliği ile yenisi başka bir satırı ezmez", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    const a = (await api.post("/api/month-plans").send(item(math(db).id, { title: "A" }))).body;
    const b = (await api.post("/api/month-plans").send(item(math(db).id, { title: "B" }))).body;
    expect(b.id).not.toBe(a.id);
    await api.delete(`/api/month-plans/${a.id}`);
    const c = (await api.post("/api/month-plans").send(item(math(db).id, { title: "C" }))).body;
    expect([b.id, c.id]).not.toContain(a.id);
    expect(c.id).not.toBe(b.id);
  });
});

describe("Aylık plan: yedek ve eski veri", () => {
  it("yedek denetimi bilinen alanları korur, bilinmeyenleri atar", () => {
    const row = { id: 1, track: "yks", month: "2026-10", subjectId: 3, title: "Türev", note: "", doneAt: null, hack: "x" };
    const clean = validateBackup({ monthPlans: [row] });
    expect(clean.monthPlans).toEqual([{ id: 1, track: "yks", month: "2026-10", subjectId: 3, title: "Türev", note: "", doneAt: null }]);
  });

  it("yedekte türü yanlış alanı reddeder", () => {
    const bad = { id: 1, track: "yks", month: "2026-10", subjectId: "3", title: "Türev", note: "", doneAt: null };
    expect(() => validateBackup({ monthPlans: [bad] })).toThrow(/monthPlans/);
    expect(() => validateBackup({ monthPlans: [{ ...bad, subjectId: 3, doneAt: 5 }] })).toThrow(/monthPlans/);
  });

  it("aylık planı olmayan eski yedek yüklenir ve uygulama çalışır", async () => {
    const app = createDatabase(memoryStorage(null));
    const old = emptyState();
    delete old.monthPlans;
    await app.replaceAll(old);
    expect((await request(app).get("/api/month-plans?month=2026-10")).body).toEqual([]);
    expect((await app.snapshot()).monthPlans).toEqual([]);
  });

  it("yedek yükleyip geri alınca aylık plan aynen döner", async () => {
    const { app, db } = makeTestApp();
    const api = request(app);
    await api.post("/api/month-plans").send(item(math(db).id, { note: "kaynak: Karekök" }));
    const snapshot = await app.snapshot();
    const other = createDatabase(memoryStorage(null));
    await other.replaceAll(JSON.parse(JSON.stringify(snapshot)));
    expect((await request(other).get("/api/month-plans?month=2026-10")).body).toEqual(
      (await api.get("/api/month-plans?month=2026-10")).body,
    );
  });

  it("hedefi olmayan (elle düzenlenmiş) satır YKS sayılır", () => {
    const state = emptyState();
    state.monthPlans.push({ id: 1, month: "2026-10", subjectId: 1, title: "A", note: "", doneAt: null });
    prepareState(state, { seed: false });
    expect(state.monthPlans[0].track).toBe("yks");
  });

  it("örnek veride bu ayın ve gelecek ayın planı bulunur ve yedek denetiminden geçer", async () => {
    const state = buildDemoState("2026-10-19");
    const months = new Set(state.monthPlans.map((p) => p.month));
    expect(months.has("2026-10")).toBe(true);
    expect(months.has("2026-11")).toBe(true);
    expect(state.monthPlans.some((p) => p.doneAt)).toBe(true);
    expect(state.monthPlans.some((p) => !p.doneAt)).toBe(true);
    const app = createDatabase(memoryStorage(null));
    await app.replaceAll(state);
    const october = (await request(app).get("/api/month-plans?month=2026-10")).body;
    expect(october.length).toBeGreaterThan(5);
    const ids = october.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
