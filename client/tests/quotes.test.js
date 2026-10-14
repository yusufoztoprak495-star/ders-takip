import { describe, it, expect } from "vitest";
import { QUOTES, quoteIndexForDate, quoteOfDay } from "../src/lib/quotes.js";

describe("QUOTES", () => {
  it("her sözün metni ve sahibi var", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(30);
    for (const q of QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.author.trim().length).toBeGreaterThan(0);
    }
  });

  it("aynı söz iki kez yazılmamış", () => {
    const texts = QUOTES.map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe("quoteIndexForDate", () => {
  it("aynı gün hep aynı sözü verir", () => {
    expect(quoteIndexForDate("2026-10-14", 40)).toBe(quoteIndexForDate("2026-10-14", 40));
  });

  it("art arda iki gün farklı söz verir", () => {
    expect(quoteIndexForDate("2026-10-14", 40)).not.toBe(quoteIndexForDate("2026-10-15", 40));
  });

  it("her zaman listenin içinde kalır", () => {
    for (let d = 1; d <= 28; d++) {
      const i = quoteIndexForDate(`2026-02-${String(d).padStart(2, "0")}`, 7);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(7);
    }
  });

  it("liste uzunluğu kadar gün boyunca hiçbir söz tekrar etmez", () => {
    const n = QUOTES.length;
    const seen = new Set();
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < n; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      seen.add(quoteIndexForDate(s, n));
    }
    expect(seen.size).toBe(n);
  });
});

describe("quoteOfDay", () => {
  it("kaydırma (offset) ile sıradaki sözü verir, sona gelince başa döner", () => {
    const base = quoteIndexForDate("2026-10-14", QUOTES.length);
    expect(quoteOfDay("2026-10-14", 0)).toBe(QUOTES[base]);
    expect(quoteOfDay("2026-10-14", 1)).toBe(QUOTES[(base + 1) % QUOTES.length]);
    expect(quoteOfDay("2026-10-14", QUOTES.length)).toBe(QUOTES[base]);
  });
});
