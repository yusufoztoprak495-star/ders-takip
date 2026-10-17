import { describe, it, expect } from "vitest";
import { LETTERS, absenceAllowance, courseAverage, gpa, letterOf, lessonHours, neededScore } from "../src/lib/grades.js";

describe("letterOf", () => {
  it("100'lük notu harfe ve katsayıya çevirir (sınırlar dahil)", () => {
    expect(letterOf(95)).toMatchObject({ letter: "AA", points: 4 });
    expect(letterOf(90)).toMatchObject({ letter: "AA" });
    expect(letterOf(89.5)).toMatchObject({ letter: "AA" }); // yuvarlanır
    expect(letterOf(84)).toMatchObject({ letter: "BB", points: 3 });
    expect(letterOf(60)).toMatchObject({ letter: "DD", points: 1 });
    expect(letterOf(49)).toMatchObject({ letter: "FF", points: 0 });
    expect(LETTERS.map((l) => l.letter)).toEqual(["AA", "BA", "BB", "CB", "CC", "DC", "DD", "FD", "FF"]);
  });
});

describe("courseAverage", () => {
  const comps = [
    { name: "Vize", weight: 40, score: 70 },
    { name: "Final", weight: 60, score: 80 },
  ];
  it("ağırlıklı ortalama; eksik not varsa girilenlerle kısmi ortalama ve tamam bilgisi", () => {
    expect(courseAverage(comps)).toEqual({ average: 76, complete: true, weightDone: 100 });
    expect(courseAverage([comps[0], { ...comps[1], score: null }])).toEqual({ average: 70, complete: false, weightDone: 40 });
    expect(courseAverage([{ name: "Vize", weight: 40, score: null }])).toEqual({ average: null, complete: false, weightDone: 0 });
  });
});

describe("neededScore (finalden kaç)", () => {
  const comps = [
    { name: "Vize", weight: 40, score: 50 },
    { name: "Final", weight: 60, score: null },
  ];
  it("hedef ortalama için kalan sınavdan gereken not", () => {
    expect(neededScore(comps, 60)).toEqual({ score: 67, possible: true }); // (60 − 20) / 0,6 = 66,67 → 67
    expect(neededScore(comps, 90)).toEqual({ score: 117, possible: false });
  });

  it("hedef zaten garantiyse 0; eksik not yoksa null", () => {
    expect(neededScore([{ name: "Vize", weight: 40, score: 100 }, { name: "Final", weight: 60, score: null }], 30)).toEqual({ score: 0, possible: true });
    expect(neededScore([{ name: "Vize", weight: 100, score: 70 }], 60)).toBeNull();
  });

  it("birden çok eksik sınav varsa hepsinden aynı not alınacağı varsayılır", () => {
    const three = [
      { name: "Vize", weight: 30, score: 60 },
      { name: "Ödev", weight: 20, score: null },
      { name: "Final", weight: 50, score: null },
    ];
    expect(neededScore(three, 70)).toEqual({ score: 75, possible: true }); // (70 − 18) / 0,7 = 74,3 → 75
  });
});

describe("gpa (AGNO)", () => {
  it("kredi ağırlıklı ortalama; notu tamamlanmamış ders sayılmaz", () => {
    const courses = [
      { credits: 4, components: [{ weight: 100, score: 92 }] }, // AA 4
      { credits: 2, components: [{ weight: 100, score: 72 }] }, // CC 2
      { credits: 3, components: [{ weight: 100, score: null }] },
    ];
    expect(gpa(courses)).toEqual({ gpa: 3.33, credits: 6 });
    expect(gpa([])).toEqual({ gpa: null, credits: 0 });
  });
});

describe("devamsızlık", () => {
  it("ders saatini dakikadan hesaplar (50 dakika = 1 ders saati, en az 1)", () => {
    expect(lessonHours(510, 600)).toBe(2); // 90 dk → 2
    expect(lessonHours(510, 550)).toBe(1);
    expect(lessonHours(540, 720)).toBe(4); // 180 dk → 3,6 → 4
  });

  it("haftalık ders saatinden 14 haftanın %30'u kadar hak", () => {
    expect(absenceAllowance(3)).toBe(12); // 3 × 14 = 42 × 0,3 = 12,6 → 12
    expect(absenceAllowance(0)).toBe(0);
  });
});
