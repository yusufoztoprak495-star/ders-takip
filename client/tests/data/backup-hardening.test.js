import { describe, it, expect } from "vitest";
import { parseBackupText, validateBackup, MAX_BACKUP_BYTES } from "../../src/data/validation.js";

// Kötü niyetli ya da bozulmuş bir yedek dosyası uygulamayı çökertmemeli, prototipi kirletmemeli
describe("yedek dosyası sertleştirme", () => {
  it("bilinmeyen alanları atar (__proto__, constructor dahil)", () => {
    const text = '{"subjects":[{"id":1,"name":"Fizik","track":"yks","__proto__":{"hacked":true},"evil":"x"}]}';
    const clean = parseBackupText(text);
    expect(clean.subjects[0]).toEqual({ id: 1, name: "Fizik", track: "yks" });
    expect({}.hacked).toBeUndefined();
    expect(Object.getPrototypeOf(clean.subjects[0])).toBe(Object.prototype);
  });

  it("alanın türü yanlışsa hangi kaydın bozuk olduğunu söyleyerek reddeder", () => {
    expect(() => validateBackup({ sessions: [{ id: 1, durationSeconds: "çok" }] })).toThrow(/sessions.*1\. kayd/);
    expect(() => validateBackup({ classes: [{ id: 1, day: 3, start: "08:30" }] })).toThrow(/classes/);
    expect(() => validateBackup({ topics: [{ id: 1, subjectId: 1, name: { x: 1 } }] })).toThrow(/topics/);
  });

  it("aşırı uzun metni reddeder", () => {
    expect(() => validateBackup({ subjects: [{ id: 1, name: "a".repeat(5000) }] })).toThrow(/çok uzun/);
  });

  it("deneme sonuçlarını iç içe denetler ve temizler", () => {
    const ok = validateBackup({
      exams: [{ id: 1, type: "TYT", results: { turkce: { correct: 30, wrong: 2, blank: 8, extra: 1 } } }],
    });
    expect(ok.exams[0].results).toEqual({ turkce: { correct: 30, wrong: 2, blank: 8 } });
    expect(() => validateBackup({ exams: [{ id: 1, results: { turkce: { correct: "30" } } }] })).toThrow(/exams/);
    expect(() => validateBackup({ exams: [{ id: 1, results: [] }] })).toThrow(/exams/);
  });

  it("çok büyük dosyayı okumadan reddeder", () => {
    expect(MAX_BACKUP_BYTES).toBeGreaterThan(1_000_000);
    expect(() => parseBackupText("x".repeat(MAX_BACKUP_BYTES + 1))).toThrow(/çok büyük/);
  });

  it("eski yedekler (eksik alanlı kayıtlar) hâlâ yüklenir", () => {
    const old = validateBackup({ subjects: [{ id: 1, name: "Matematik" }], sessions: [{ id: 3 }] });
    expect(old.subjects).toHaveLength(1);
    expect(old.sessions).toEqual([{ id: 3 }]);
  });
});
