import { describe, it, expect } from "vitest";
import { niceTicks, labelIndexes } from "../src/lib/scale.js";

describe("niceTicks", () => {
  it("0'dan başlar ve en büyük değeri kapsayan yuvarlak bir üst sınır verir", () => {
    const { max, ticks } = niceTicks(87);
    expect(ticks[0]).toBe(0);
    expect(max).toBeGreaterThanOrEqual(87);
    expect(ticks[ticks.length - 1]).toBe(max);
  });

  it("adımlar 1, 2, 5 çarpanlarıdır", () => {
    expect(niceTicks(87).ticks).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(9).ticks).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(4).ticks).toEqual([0, 1, 2, 3, 4]);
  });

  it("küçük ondalık değerlerde de çalışır", () => {
    const { ticks } = niceTicks(0.8);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(0.8);
  });

  it("değer 0 ya da geçersizse yine çizilebilir bir eksen verir", () => {
    expect(niceTicks(0).ticks).toEqual([0, 1]);
    expect(niceTicks(NaN).max).toBe(1);
  });
});

describe("niceTicks (sıfırdan başlamayan)", () => {
  it("min ile max arasını kapsar", () => {
    const { min, max, ticks } = niceTicks(48.5, { min: 31.2 });
    expect(min).toBeLessThanOrEqual(31.2);
    expect(max).toBeGreaterThanOrEqual(48.5);
    expect(ticks[0]).toBe(min);
    expect(ticks[ticks.length - 1]).toBe(max);
  });

  it("min = max ise aralık açılır (bölme hatası olmaz)", () => {
    const { min, max } = niceTicks(10, { min: 10 });
    expect(max).toBeGreaterThan(min);
  });
});

describe("labelIndexes", () => {
  it("az öğe varsa hepsi etiketlenir", () => {
    expect(labelIndexes(5, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("çok öğe varsa eşit aralıkla seyreltir ve son öğeyi korur", () => {
    const idx = labelIndexes(30, 6);
    expect(idx.length).toBeLessThanOrEqual(6);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(29);
  });

  it("boş listede boş döner", () => {
    expect(labelIndexes(0, 5)).toEqual([]);
  });
});
