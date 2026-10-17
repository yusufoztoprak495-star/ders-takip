import { describe, it, expect } from "vitest";
import { BADGES, badgeList, collectionLayout, newlyEarned } from "../src/lib/badges.js";

const zero = {
  sessions: 0,
  totalSeconds: 0,
  pomodoros: 0,
  focusedPomodoros: 0,
  longestStreak: 0,
  bestDaySeconds: 0,
  questions: 0,
  exams: 0,
  topicsDone: 0,
  mistakesLearned: 0,
  cardReviews: 0,
  earlySessions: 0,
  lateSessions: 0,
};

describe("badgeList", () => {
  it("hiç veri yokken hepsi kilitli, ilerleme 0", () => {
    const list = badgeList(zero);
    expect(list).toHaveLength(BADGES.length);
    expect(list.every((b) => !b.earned && b.progress === 0)).toBe(true);
  });

  it("hedefe ulaşan rozet kazanılır; ilerleme 0..1 arasında", () => {
    const list = badgeList({ ...zero, sessions: 1, pomodoros: 50, totalSeconds: 12 * 3600 });
    const byId = Object.fromEntries(list.map((b) => [b.id, b]));
    expect(byId["ilk-adim"].earned).toBe(true);
    expect(byId["pomodoro-10"].earned).toBe(true);
    expect(byId["pomodoro-100"]).toMatchObject({ earned: false, progress: 0.5, value: 50, target: 100 });
    expect(byId["saat-10"].earned).toBe(true);
    expect(list.every((b) => b.progress >= 0 && b.progress <= 1)).toBe(true);
  });

  it("rozet kimlikleri benzersiz", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});

describe("newlyEarned", () => {
  it("daha önce görülmemiş kazanılmış rozetleri verir", () => {
    const list = badgeList({ ...zero, sessions: 1, pomodoros: 10 });
    expect(newlyEarned(list, ["ilk-adim"]).map((b) => b.id)).toEqual(["pomodoro-10"]);
    expect(newlyEarned(list, ["ilk-adim", "pomodoro-10"])).toEqual([]);
  });
});

describe("collectionLayout", () => {
  it("istenen sayıda, alan içinde, aynı tohumla aynı yerleşim", () => {
    const a = collectionLayout(120, { width: 800, height: 300, seed: 3 });
    expect(a).toHaveLength(120);
    expect(a.every((p) => p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 300 && p.size > 0)).toBe(true);
    expect(collectionLayout(120, { width: 800, height: 300, seed: 3 })).toEqual(a);
  });

  it("öğeler ızgara hücrelerine dağılır: iki öğe aynı hücreye düşmez", () => {
    const a = collectionLayout(200, { width: 800, height: 300, seed: 1 });
    expect(new Set(a.map((p) => p.cell)).size).toBe(200);
  });

  it("sınırı aşan sayıda yalnızca sınır kadar öğe", () => {
    expect(collectionLayout(5000, { width: 800, height: 300, seed: 1, max: 600 })).toHaveLength(600);
  });
});
