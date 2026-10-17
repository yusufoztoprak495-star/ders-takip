import { describe, it, expect } from "vitest";
import { examTotals, examTypesFor, findExamType, sectionNet } from "../src/lib/exams.js";

describe("deneme türleri", () => {
  it("YKS'de TYT ve AYT, DGS'de DGS var; üniversitede deneme yok", () => {
    expect(examTypesFor("yks").map((t) => t.id)).toEqual(["TYT", "AYT"]);
    expect(examTypesFor("dgs").map((t) => t.id)).toEqual(["DGS"]);
    expect(examTypesFor("uni")).toEqual([]);
  });

  it("soru sayıları gerçek sınavla aynı: TYT 120, AYT sayısal 80, DGS 100", () => {
    const total = (id) => findExamType(id).sections.reduce((s, x) => s + x.count, 0);
    expect(total("TYT")).toBe(120);
    expect(total("AYT")).toBe(80);
    expect(total("DGS")).toBe(100);
  });
});

describe("net hesabı", () => {
  it("4 yanlış 1 doğruyu götürür", () => {
    expect(sectionNet({ correct: 30, wrong: 8, blank: 2 })).toBe(28);
    expect(sectionNet({ correct: 10, wrong: 3, blank: 0 })).toBe(9.25);
  });

  it("deneme toplamı bölümlerin toplamıdır", () => {
    const exam = {
      type: "TYT",
      results: {
        turkce: { correct: 32, wrong: 4, blank: 4 },
        sosyal: { correct: 15, wrong: 2, blank: 3 },
        matematik: { correct: 25, wrong: 8, blank: 7 },
        fen: { correct: 12, wrong: 4, blank: 4 },
      },
    };
    expect(examTotals(exam)).toEqual({ correct: 84, wrong: 18, blank: 18, net: 79.5 });
  });
});
