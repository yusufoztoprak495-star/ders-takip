import { describe, it, expect } from "vitest";
import { SCORE_TYPES, estimateRank, obpContribution, placementScore, rawScore } from "../src/lib/yksScore.js";

const fullTyt = { turkce: 40, sosyal: 20, matematik: 40, fen: 20 };

describe("rawScore (tahmini ham puan)", () => {
  it("TYT: hiç net yokken 100, tam nette 500", () => {
    expect(rawScore("TYT", { tyt: {} })).toBe(100);
    expect(rawScore("TYT", { tyt: fullTyt })).toBe(500);
  });

  it("SAY / EA / SÖZ: tam nette yaklaşık 500", () => {
    const say = rawScore("SAY", { tyt: fullTyt, ayt: { matematik: 40, fizik: 14, kimya: 13, biyoloji: 13 } });
    expect(say).toBeGreaterThan(498);
    expect(say).toBeLessThanOrEqual(500);
    const ea = rawScore("EA", { tyt: fullTyt, ayt: { matematik: 40, edebiyat: 24, tarih1: 10, cografya1: 6 } });
    expect(ea).toBeCloseTo(500, 0);
    const soz = rawScore("SOZ", { tyt: fullTyt, ayt: { edebiyat: 24, tarih1: 10, cografya1: 6, tarih2: 11, cografya2: 11, felsefe: 12, din: 6 } });
    expect(soz).toBeCloseTo(500, 0);
  });

  it("eksi netler 0 sayılır, sonuç iki ondalık", () => {
    expect(rawScore("TYT", { tyt: { turkce: -2, matematik: 10.5 } })).toBe(134.65);
  });
});

describe("OBP", () => {
  it("diploma notu × 5 × 0,12; geçen yıl yerleşenlerde 0,06", () => {
    expect(obpContribution(80)).toBe(48);
    expect(obpContribution(80, true)).toBe(24);
    expect(obpContribution(50)).toBe(30);
    expect(placementScore(400, 90)).toBe(454);
  });
});

describe("estimateRank (2025 dağılımından)", () => {
  it("tablodaki puanlarda tablodaki sırayı verir", () => {
    expect(estimateRank("SAY", 450)).toBe(46142);
    expect(estimateRank("EA", 430)).toBe(8145);
  });

  it("aradaki puanlarda araya düşer ve puan arttıkça sıra iyileşir", () => {
    const a = estimateRank("SAY", 455);
    expect(a).toBeLessThan(46142);
    expect(a).toBeGreaterThan(29410);
    const scores = [200, 300, 400, 480, 520, 545];
    const ranks = scores.map((s) => estimateRank("SAY", s));
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeLessThan(ranks[i - 1]);
  });

  it("tablonun dışında uçlara sabitlenir, en iyi sıra 1", () => {
    expect(estimateRank("SAY", 600)).toBeGreaterThanOrEqual(1);
    expect(estimateRank("SAY", 600)).toBeLessThanOrEqual(57);
    expect(estimateRank("TYT", 100)).toBe(2310553);
  });

  it("puan türleri tanımlı", () => {
    expect(SCORE_TYPES.map((t) => t.id)).toEqual(["TYT", "SAY", "EA", "SOZ"]);
  });
});

describe("scoreForRank (hedef sıra için puan)", () => {
  it("estimateRank'in tersi: tablodaki noktalarda aynı puan, arada tutarlı", async () => {
    const { scoreForRank } = await import("../src/lib/yksScore.js");
    expect(scoreForRank("SAY", 46142)).toBe(450);
    const s = scoreForRank("SAY", 1000);
    expect(s).toBeGreaterThan(530);
    expect(s).toBeLessThan(550);
    expect(Math.abs(estimateRank("SAY", s) - 1000)).toBeLessThan(15);
    expect(scoreForRank("SAY", 5_000_000)).toBe(150);
  });
});
