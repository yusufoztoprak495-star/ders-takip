import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";

const session = (subjectId) => ({
  subjectId,
  topicId: null,
  startedAt: "2026-10-12T10:00:00.000Z",
  durationSeconds: 600,
  entryType: "manual",
});

async function switchTo(api, track) {
  const res = await api.put("/api/settings").send({ track });
  expect(res.status).toBe(200);
  return res;
}

describe("çalışma hedefi (YKS / DGS / Üniversite)", () => {
  it("varsayılan hedef YKS'dir ve yalnızca YKS dersleri listelenir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    expect((await api.get("/api/settings")).body).toEqual({ track: "yks" });
    const subjects = (await api.get("/api/subjects")).body;
    expect(subjects).toHaveLength(8);
    expect(subjects.every((s) => s.track === "yks")).toBe(true);
  });

  it("DGS'ye geçince DGS dersleri bir kez yüklenir ve listelenir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "dgs");
    const subjects = (await api.get("/api/subjects")).body;
    expect(subjects.map((s) => `${s.name} (${s.examType})`)).toEqual([
      "Matematik (Sayısal)",
      "Geometri (Sayısal)",
      "Türkçe (Sözel)",
    ]);
    expect(subjects.every((s) => s.topics.length >= 5)).toBe(true);
    // Geri gidip tekrar gelince ikinci kez yüklenmez
    await switchTo(api, "yks");
    await switchTo(api, "dgs");
    expect((await api.get("/api/subjects")).body).toHaveLength(3);
  });

  it("üniversite hedefi boş başlar; ders eklenir, konusu eklenir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    expect((await api.get("/api/subjects")).body).toEqual([]);
    const created = await api
      .post("/api/subjects")
      .send({ name: "  Veri Yapıları ", examType: "3. Dönem" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Veri Yapıları", examType: "3. Dönem", track: "uni" });
    const topic = await api
      .post("/api/topics")
      .send({ subjectId: created.body.id, name: "Bağlı Listeler" });
    expect(topic.status).toBe(201);
    const list = (await api.get("/api/subjects")).body;
    expect(list).toHaveLength(1);
    expect(list[0].topics).toEqual([{ id: topic.body.id, name: "Bağlı Listeler" }]);
  });

  it("dönem/grup boş bırakılabilir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    const res = await api.post("/api/subjects").send({ name: "Algoritmalar" });
    expect(res.status).toBe(201);
    expect(res.body.examType).toBe("");
  });

  it("aynı hedefte aynı adlı ders iki kez eklenemez", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    await api.post("/api/subjects").send({ name: "Fizik 1" });
    const again = await api.post("/api/subjects").send({ name: "fizik 1" });
    expect(again.status).toBe(400);
  });

  it("geçersiz hedef ve geçersiz ders adı reddedilir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    expect((await api.put("/api/settings").send({ track: "kpss" })).status).toBe(400);
    expect((await api.post("/api/subjects").send({ name: "" })).status).toBe(400);
    expect((await api.post("/api/subjects").send({ name: "x".repeat(101) })).status).toBe(400);
    expect(
      (await api.post("/api/subjects").send({ name: "Ders", examType: 5 })).status,
    ).toBe(400);
  });

  it("kayıtlar ve istatistikler yalnızca seçili hedefin derslerinden gelir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const yksSubject = (await api.get("/api/subjects")).body[0];
    await api.post("/api/sessions").send(session(yksSubject.id));

    await switchTo(api, "uni");
    const course = (await api.post("/api/subjects").send({ name: "Veritabanı" })).body;
    await api.post("/api/sessions").send({ ...session(course.id), durationSeconds: 1200 });

    const sessions = (await api.get("/api/sessions")).body;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].subjectId).toBe(course.id);

    const range = "from=2026-10-01&to=2026-10-31";
    const daily = (await api.get(`/api/stats/daily?${range}`)).body;
    expect(daily.reduce((t, d) => t + d.totalSeconds, 0)).toBe(1200);
    const bySubject = (await api.get(`/api/stats/by-subject?${range}`)).body;
    expect(bySubject.map((r) => r.subjectId)).toEqual([course.id]);

    // YKS'ye dönünce eski kayıt yerinde, yenisi görünmez
    await switchTo(api, "yks");
    const back = (await api.get("/api/sessions")).body;
    expect(back).toHaveLength(1);
    expect(back[0].subjectId).toBe(yksSubject.id);
  });

  it("kaynaklar ve soru kayıtları da hedefe göre süzülür", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    const yksSubject = (await api.get("/api/subjects")).body[0];
    await api.post("/api/resources").send({ name: "TYT Türkçe", subjectId: yksSubject.id });
    await api.post("/api/questions").send({
      subjectId: yksSubject.id,
      topicId: null,
      resourceId: null,
      date: "2026-10-12",
      correct: 10,
      wrong: 2,
      blank: 1,
    });
    await switchTo(api, "dgs");
    expect((await api.get("/api/resources")).body).toEqual([]);
    expect((await api.get("/api/questions")).body).toEqual([]);
  });

  it("ders adı ve grubu değiştirilebilir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    const course = (await api.post("/api/subjects").send({ name: "Mat 1" })).body;
    const res = await api
      .put(`/api/subjects/${course.id}`)
      .send({ name: "Matematik 1", examType: "1. Dönem" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Matematik 1", examType: "1. Dönem", track: "uni" });
    expect((await api.put("/api/subjects/999").send({ name: "x" })).status).toBe(404);
  });

  it("kaydı olmayan ders konularıyla silinir; kaydı olan ders silinmez", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    const empty = (await api.post("/api/subjects").send({ name: "Boş Ders" })).body;
    await api.post("/api/topics").send({ subjectId: empty.id, name: "Konu" });
    expect((await api.delete(`/api/subjects/${empty.id}`)).status).toBe(204);
    expect((await api.get("/api/subjects")).body).toEqual([]);

    const used = (await api.post("/api/subjects").send({ name: "Dolu Ders" })).body;
    await api.post("/api/sessions").send(session(used.id));
    const res = await api.delete(`/api/subjects/${used.id}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/kayıt/);
    expect((await api.get("/api/subjects")).body).toHaveLength(1);
  });

  it("hazır ders silinip hedefe geri dönülünce tekrar yüklenmez", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "dgs");
    const [first] = (await api.get("/api/subjects")).body;
    await api.delete(`/api/subjects/${first.id}`);
    await switchTo(api, "yks");
    await switchTo(api, "dgs");
    expect((await api.get("/api/subjects")).body).toHaveLength(2);
  });
});

describe("üniversite hedefi: yalnızca süre takibi", () => {
  it("üniversite dersine soru kaydı ve kitap eklenemez, çalışma kaydı eklenir", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    const course = (await api.post("/api/subjects").send({ name: "Fizik 1" })).body;
    const q = await api.post("/api/questions").send({
      subjectId: course.id, topicId: null, resourceId: null, date: "2026-10-12", correct: 1, wrong: 0, blank: 0,
    });
    expect(q.status).toBe(400);
    expect(q.body.error).toMatch(/üniversite/i);
    const r = await api.post("/api/resources").send({ name: "Kitap", subjectId: course.id });
    expect(r.status).toBe(400);
    expect((await api.post("/api/sessions").send(session(course.id))).status).toBe(201);
  });
});

describe("eski verinin yeni şekle getirilmesi", () => {
  it("hedefi olmayan eski dersler YKS sayılır, ayar eklenir, DGS kendiliğinden yüklenmez", () => {
    const old = emptyState();
    delete old.settings;
    old.subjects.push({ id: 1, name: "Türkçe", examType: "TYT" });
    expect(prepareState(old)).toBe(true);
    expect(old.subjects).toEqual([{ id: 1, name: "Türkçe", examType: "TYT", track: "yks" }]);
    expect(old.settings).toEqual({ track: "yks", seededTracks: ["yks"] });
    // Hazır YKS listesi kullanıcı dersinin yanına tekrar eklenmez
    expect(old.subjects).toHaveLength(1);
  });

  it("zaten güncel veride değişiklik yapmaz", () => {
    const state = emptyState();
    prepareState(state);
    expect(prepareState(state)).toBe(false);
  });

  it("eski depodaki veri açılınca dersler kaybolmaz ve kaydedilir", async () => {
    const storage = memoryStorage({
      subjects: [{ id: 1, name: "Türkçe", examType: "TYT" }],
      topics: [],
      sessions: [],
      questions: [],
      resources: [],
    });
    const db = createDatabase(storage);
    const { body } = await db.request("GET", "/api/subjects");
    expect(body).toHaveLength(1);
    const saved = await storage.load();
    expect(saved.settings.track).toBe("yks");
    expect(saved.subjects[0].track).toBe("yks");
  });

  it("yedek dosyasındaki ayar geri yüklenir; bozuk ayar varsayılana döner", async () => {
    const { app } = makeTestApp();
    const api = request(app);
    await switchTo(api, "uni");
    const snapshot = await app.snapshot();
    expect(snapshot.settings.track).toBe("uni");

    await app.replaceAll({ ...snapshot, settings: { track: "yks", seededTracks: ["yks", "uni"] } });
    expect((await api.get("/api/settings")).body).toEqual({ track: "yks" });

    await app.replaceAll({ ...snapshot, settings: { track: "<script>" } });
    expect((await api.get("/api/settings")).body).toEqual({ track: "yks" });

    await expect(app.replaceAll({ ...snapshot, settings: "uni" })).rejects.toThrow(/ayar/i);
  });
});
