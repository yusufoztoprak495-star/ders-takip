import { describe, it, expect } from "vitest";
import { suggestBlocks } from "../src/lib/planSuggest.js";

const topics = [
  { topicId: 1, topicName: "Türev", subjectId: 10, reason: "a" },
  { topicId: 2, topicName: "İntegral", subjectId: 10, reason: "b" },
  { topicId: 3, topicName: "Optik", subjectId: 20, reason: "c" },
];
const window = { dayStart: 480, dayEnd: 1380 };

describe("suggestBlocks", () => {
  it("boş saatlere blok koyar: derslerle ve mevcut bloklarla çakışmaz, 5 dakikaya hizalı", () => {
    const classes = [{ day: 0, start: 480, end: 900 }];
    const plans = [{ day: 0, start: 1200, end: 1260 }];
    const out = suggestBlocks({ classes, plans, window, topics, days: [0], blockMinutes: 50, breakMinutes: 10, perDay: 3 });
    expect(out.length).toBeGreaterThan(0);
    for (const b of out) {
      expect(b.day).toBe(0);
      expect(b.start % 5).toBe(0);
      expect(b.end - b.start).toBe(50);
      for (const busy of [...classes, ...plans]) expect(b.start < busy.end && busy.start < b.end).toBe(false);
      expect(b.end).toBeLessThanOrEqual(1380);
    }
    // Aynı günde iki blok arasında en az mola süresi kadar boşluk
    const sorted = out.slice().sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].start - sorted[i - 1].end).toBeGreaterThanOrEqual(10);
    expect(out).toHaveLength(3);
  });

  it("günde en fazla perDay blok; konular sırayla dağılır ve art arda aynı ders gelmez", () => {
    const out = suggestBlocks({ classes: [], plans: [], window, topics, days: [0, 1], blockMinutes: 50, breakMinutes: 10, perDay: 2 });
    expect(out.filter((b) => b.day === 0)).toHaveLength(2);
    expect(out.filter((b) => b.day === 1)).toHaveLength(2);
    const day0 = out.filter((b) => b.day === 0);
    expect(day0[0].subjectId).not.toBe(day0[1].subjectId);
    expect(out[0]).toMatchObject({ kind: "study", topicId: 1, title: "Türev", reason: "a" });
  });

  it("konu yoksa ya da boş yer yoksa öneri yok", () => {
    expect(suggestBlocks({ classes: [], plans: [], window, topics: [], days: [0], blockMinutes: 50, breakMinutes: 10, perDay: 2 })).toEqual([]);
    const full = [{ day: 0, start: 480, end: 1380 }];
    expect(suggestBlocks({ classes: full, plans: [], window, topics, days: [0], blockMinutes: 50, breakMinutes: 10, perDay: 2 })).toEqual([]);
  });

  it("öneriler akşamdan önce değil gün içindeki ilk uygun boşluktan başlar ama ders bitiminden hemen sonra değil (10 dk pay)", () => {
    const classes = [{ day: 2, start: 480, end: 900 }];
    const out = suggestBlocks({ classes, plans: [], window, topics, days: [2], blockMinutes: 50, breakMinutes: 10, perDay: 1 });
    expect(out[0].start).toBe(910);
  });
});
