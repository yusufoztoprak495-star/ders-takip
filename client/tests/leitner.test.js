import { describe, it, expect } from "vitest";
import { LEITNER_DAYS, buildQuiz, scheduleCard } from "../src/lib/leitner.js";
import { seeded } from "../src/lib/random.js";

describe("scheduleCard (Leitner kutuları)", () => {
  it("bilinen kart bir üst kutuya çıkar, kutunun aralığı kadar sonra gelir", () => {
    expect(scheduleCard({ box: 1 }, "right", "2026-10-19")).toEqual({ box: 2, nextReview: "2026-10-21" });
    expect(scheduleCard({ box: 4 }, "right", "2026-10-19")).toEqual({ box: 5, nextReview: "2026-11-04" });
  });

  it("en üst kutuda kalır", () => {
    expect(scheduleCard({ box: 5 }, "right", "2026-10-19")).toEqual({ box: 5, nextReview: "2026-11-04" });
  });

  it("bilinmeyen kart ilk kutuya döner ve bugün yine sorulur", () => {
    expect(scheduleCard({ box: 4 }, "wrong", "2026-10-19")).toEqual({ box: 1, nextReview: "2026-10-19" });
  });

  it("aralıklar artan", () => {
    expect(LEITNER_DAYS).toEqual([1, 2, 4, 8, 16]);
  });
});

describe("buildQuiz (mini test)", () => {
  const cards = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, front: `Soru ${i + 1}`, back: `Cevap ${i + 1}` }));

  it("istenen sayıda soru, her birinde 4 farklı şık ve doğru cevabın yeri", () => {
    const quiz = buildQuiz(cards, 5, seeded(1));
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      const card = cards.find((c) => c.id === q.cardId);
      expect(q.question).toBe(card.front);
      expect(q.options[q.answerIndex]).toBe(card.back);
    }
    expect(new Set(quiz.map((q) => q.cardId)).size).toBe(5); // aynı kart iki kez sorulmaz
  });

  it("aynı tohumla aynı test, kart sayısından fazla soru istenirse kart sayısı kadar", () => {
    expect(buildQuiz(cards, 5, seeded(7))).toEqual(buildQuiz(cards, 5, seeded(7)));
    expect(buildQuiz(cards, 20, seeded(7))).toHaveLength(8);
  });

  it("aynı cevaplı kartlar şıklarda tekrar etmez; 4'ten az farklı cevap varsa test kurulmaz", () => {
    const dup = [...cards.slice(0, 3), { id: 9, front: "x", back: "Cevap 1" }];
    expect(buildQuiz(dup, 4, seeded(1))).toEqual([]);
    const ok = [...cards.slice(0, 5), { id: 9, front: "x", back: "Cevap 1" }];
    for (const q of buildQuiz(ok, 6, seeded(2))) expect(new Set(q.options).size).toBe(4);
  });
});
