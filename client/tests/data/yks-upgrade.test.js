import { describe, it, expect } from "vitest";
import request, { makeTestApp } from "./helpers.js";
import { createDatabase } from "../../src/data/database.js";
import { emptyState, prepareState } from "../../src/data/seed.js";
import { memoryStorage } from "../../src/data/storage.js";
import { SEED_SUBJECTS, YKS_LIST_VERSION } from "../../src/data/seedData.js";

const label = (s) => `${s.name} (${s.examType})`;

// 1. sürüm listesinin bir parçasıyla kurulmuş eski veri (Fen ve Sosyal birleşik)
function legacyState() {
  return {
    subjects: [
      { id: 1, name: "Türkçe", examType: "TYT", track: "yks" },
      { id: 2, name: "Sosyal Bilimler", examType: "TYT", track: "yks" },
      { id: 3, name: "Matematik", examType: "TYT", track: "yks" },
      { id: 4, name: "Fen Bilimleri", examType: "TYT", track: "yks" },
    ],
    topics: [
      { id: 1, subjectId: 1, name: "Paragraf" },
      { id: 2, subjectId: 1, name: "Ses Bilgisi" },
      { id: 3, subjectId: 1, name: "Benim Konum" },
      { id: 4, subjectId: 2, name: "Tarih: Osmanlı Devleti" },
      { id: 5, subjectId: 2, name: "Felsefe" },
      { id: 6, subjectId: 3, name: "Problemler" },
      { id: 7, subjectId: 3, name: "Geometri: Üçgenler" },
      { id: 8, subjectId: 4, name: "Fizik: Madde ve Özellikleri" },
      { id: 9, subjectId: 4, name: "Kimya: Maddenin Halleri" },
      { id: 10, subjectId: 4, name: "Biyoloji: Kalıtım" },
    ],
    sessions: [
      { id: 1, subjectId: 4, topicId: 8, durationMinutes: 25, startedAt: "2026-10-01T10:00:00.000Z" },
      { id: 2, subjectId: 1, topicId: 1, durationMinutes: 25, startedAt: "2026-10-01T11:00:00.000Z" },
    ],
    questions: [
      { id: 1, subjectId: 3, topicId: 7, correct: 5, wrong: 1, blank: 0, date: "2026-10-01" },
      { id: 2, subjectId: 2, topicId: 4, correct: 3, wrong: 0, blank: 1, date: "2026-10-01" },
    ],
    resources: [],
    settings: { track: "yks", seededTracks: ["yks"] },
  };
}

const subjectOf = (state, name, group) =>
  state.subjects.find((s) => s.name === name && s.examType === group);
const topicNames = (state, subject) =>
  state.topics.filter((t) => t.subjectId === subject.id).map((t) => t.name);

describe("hazır YKS listesi", () => {
  it("her ders ayrıdır; birleşik Fen/Sosyal dersi yoktur", () => {
    const names = SEED_SUBJECTS.map(label);
    expect(names).not.toContain("Fen Bilimleri (TYT)");
    expect(names).not.toContain("Sosyal Bilimler (TYT)");
    for (const n of ["Fizik (TYT)", "Kimya (TYT)", "Biyoloji (TYT)", "Tarih (TYT)", "Coğrafya (TYT)",
      "Felsefe (TYT)", "Din Kültürü ve Ahlak Bilgisi (TYT)", "Geometri (TYT)", "Geometri (AYT)"]) {
      expect(names).toContain(n);
    }
    expect(new Set(names).size).toBe(names.length);
  });

  it("konu adlarında 'Fizik:' gibi ders öneki ve yineleme yoktur", () => {
    for (const s of SEED_SUBJECTS) {
      expect(new Set(s.topics).size).toBe(s.topics.length);
      for (const t of s.topics) expect(t).not.toMatch(/^[^:]+: /);
    }
  });

  it("yeni kurulumda liste sürümü yazılır, güncelleme tekrar çalışmaz", () => {
    const state = emptyState();
    prepareState(state);
    expect(state.settings.yksListVersion).toBe(YKS_LIST_VERSION);
    expect(prepareState(state)).toBe(false);
  });

  it("dersler ve konular müfredat sırasıyla listelenir", async () => {
    const { app } = makeTestApp();
    const { body } = await request(app).get("/api/subjects");
    expect(body.map(label)).toEqual(SEED_SUBJECTS.map(label));
    expect(body[0].topics.map((t) => t.name)).toEqual(SEED_SUBJECTS[0].topics);
  });
});

describe("eski listenin yeni listeye taşınması", () => {
  it("birleşik dersler ayrılır, kayıtlı konular taşınır, kayıtlar yeni derse geçer", () => {
    const state = legacyState();
    expect(prepareState(state)).toBe(true);

    expect(subjectOf(state, "Fen Bilimleri", "TYT")).toBeUndefined();
    expect(subjectOf(state, "Sosyal Bilimler", "TYT")).toBeUndefined();

    const fizik = subjectOf(state, "Fizik", "TYT");
    const topic8 = state.topics.find((t) => t.id === 8);
    expect(topic8).toEqual({ id: 8, subjectId: fizik.id, name: "Madde ve Özellikleri" });
    expect(state.sessions[0]).toMatchObject({ subjectId: fizik.id, topicId: 8 });

    const geometri = subjectOf(state, "Geometri", "TYT");
    expect(state.topics.find((t) => t.id === 7)).toMatchObject({ subjectId: geometri.id, name: "Üçgenler" });
    expect(state.questions[0]).toMatchObject({ subjectId: geometri.id, topicId: 7 });

    const tarih = subjectOf(state, "Tarih", "TYT");
    expect(state.questions[1]).toMatchObject({ subjectId: tarih.id, topicId: 4 });

    // Kaydı olmayan eski önekli konular (Kimya: Maddenin Halleri) silinir, yerine yeni liste gelir
    expect(state.topics.some((t) => t.name.startsWith("Kimya:"))).toBe(false);
    expect(topicNames(state, subjectOf(state, "Kimya", "TYT"))).toContain("Maddenin Halleri");
  });

  it("eksik konular eklenir; kaydı olan ya da kullanıcının eklediği konu kalır", () => {
    const state = legacyState();
    prepareState(state);
    const turkce = subjectOf(state, "Türkçe", "TYT");
    const names = topicNames(state, turkce);
    for (const t of SEED_SUBJECTS[0].topics) expect(names).toContain(t);
    expect(names).toContain("Paragraf"); // kaydı var
    expect(names).toContain("Benim Konum"); // kullanıcının
    // Kaydı olmayan eski genel konu silinir
    const mat = subjectOf(state, "Matematik", "TYT");
    expect(topicNames(state, mat)).not.toContain("Problemler");
    expect(topicNames(state, mat)).toContain("Sayı Problemleri");
  });

  it("kayıtsız kalan konusuz birleşik ders kaydı varsa silinmez", () => {
    const state = legacyState();
    state.resources.push({ id: 1, subjectId: 4, name: "TYT Fen Deneme" });
    prepareState(state);
    expect(subjectOf(state, "Fen Bilimleri", "TYT")).toBeDefined();
  });

  it("silinmiş hazır ders geri gelmez, güncelleme bir kez çalışır", () => {
    const state = legacyState();
    prepareState(state);
    expect(subjectOf(state, "Biyoloji", "AYT")).toBeUndefined();
    const count = state.topics.length;
    expect(prepareState(state)).toBe(false);
    expect(state.topics.length).toBe(count);
  });

  it("eski veri açılınca taşınır ve kaydedilir; ders listesi sıralı gelir", async () => {
    const storage = memoryStorage(legacyState());
    const db = createDatabase(storage);
    const { body } = await db.request("GET", "/api/subjects");
    expect(body.map(label).slice(0, 3)).toEqual(["Türkçe (TYT)", "Matematik (TYT)", "Geometri (TYT)"]);
    const saved = await storage.load();
    expect(saved.settings.yksListVersion).toBe(YKS_LIST_VERSION);
  });

  it("eski yedek yüklenince de taşınır", async () => {
    const { app } = makeTestApp();
    await app.replaceAll(legacyState());
    const { body } = await request(app).get("/api/subjects");
    expect(body.map(label)).not.toContain("Fen Bilimleri (TYT)");
  });
});
