import { describe, it, expect } from "vitest";
import { QUOTES, drawQuote, shuffledOrder } from "../src/lib/quotes.js";
import { seeded } from "../src/lib/random.js";

describe("QUOTES", () => {
  it("her sözün metni ve sahibi var", () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(80);
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

describe("shuffledOrder", () => {
  it("her sözü tam bir kez içeren karışık bir sıra verir", () => {
    const order = shuffledOrder(50, seeded(3));
    expect(order).toHaveLength(50);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(50).keys()]);
    expect(order).not.toEqual([...Array(50).keys()]);
  });
});

describe("drawQuote (karıştırılmış deste)", () => {
  // Uygulamadaki gibi: her çekişte deste saklanır, bir sonrakinde aynı desteden devam edilir
  function drawMany(times, count, rng, deck = null) {
    const seen = [];
    for (let i = 0; i < times; i++) {
      const res = drawQuote(deck, count, rng);
      seen.push(res.index);
      deck = res.deck;
    }
    return { seen, deck };
  }

  it("deste bitene kadar hiçbir söz tekrar etmez", () => {
    const { seen } = drawMany(40, 40, seeded(7));
    expect(new Set(seen).size).toBe(40);
  });

  it("sırayla değil, rastgele gelir", () => {
    const { seen } = drawMany(20, 40, seeded(11));
    const sequential = seen.every((v, i) => i === 0 || v === (seen[i - 1] + 1) % 40);
    expect(sequential).toBe(false);
  });

  it("deste yenilenince bir öncekiyle aynı söz art arda gelmez", () => {
    const rng = seeded(5);
    let deck = null;
    let last = null;
    for (let i = 0; i < 400; i++) {
      const res = drawQuote(deck, 6, rng);
      expect(res.index).not.toBe(last);
      last = res.index;
      deck = res.deck;
    }
  });

  it("bozuk ya da eski bir deste (liste uzunluğu değişmiş) baştan kurulur", () => {
    const rng = seeded(9);
    for (const broken of [null, "x", { order: [0, 1], pos: 0 }, { order: [0, 0, 1], pos: 1 }, { order: [0, 1, 2], pos: 99 }]) {
      const res = drawQuote(broken, 3, rng);
      expect(res.index).toBeGreaterThanOrEqual(0);
      expect(res.index).toBeLessThan(3);
      expect(res.deck.order).toHaveLength(3);
    }
  });

  it("aynı rastgelelikle iki farklı açılış farklı söz gösterir", () => {
    const rng = seeded(21);
    const first = drawQuote(null, 40, rng);
    const second = drawQuote(first.deck, 40, rng);
    expect(second.index).not.toBe(first.index);
  });
});
