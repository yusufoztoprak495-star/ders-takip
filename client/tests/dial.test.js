import { describe, it, expect } from "vitest";
import { litTicks, tickPosition } from "../src/lib/dial.js";

describe("litTicks", () => {
  it("başlangıçta tüm çentikler yanar", () => {
    expect(litTicks(1500, 1500)).toBe(60);
  });

  it("süre bitince hiçbiri yanmaz", () => {
    expect(litTicks(0, 1500)).toBe(0);
  });

  it("yarıda yarısı yanar", () => {
    expect(litTicks(750, 1500)).toBe(30);
  });

  it("kısmen geçmiş çentik hâlâ yanık sayılır (yukarı yuvarlanır)", () => {
    // 1499 / 1500 * 60 = 59.96 -> 60
    expect(litTicks(1499, 1500)).toBe(60);
    // 1 sn kala son çentik yanık kalır
    expect(litTicks(1, 1500)).toBe(1);
  });

  it("farklı çentik sayısıyla çalışır", () => {
    expect(litTicks(50, 100, 10)).toBe(5);
  });

  it("geçersiz girdilerde 0 ile 60 arasında kalır", () => {
    expect(litTicks(-5, 1500)).toBe(0);
    expect(litTicks(2000, 1500)).toBe(60);
    expect(litTicks(10, 0)).toBe(0);
  });
});

describe("tickPosition", () => {
  it("0. çentik tam yukarıda (12 yönünde) başlar", () => {
    const p = tickPosition(0, 60, 100, 90);
    expect(p.x1).toBeCloseTo(100);
    expect(p.y1).toBeCloseTo(10);
    expect(p.x2).toBeCloseTo(100);
    // iç uç merkeze doğru, varsayılan uzunluk 12
    expect(p.y2).toBeCloseTo(22);
  });

  it("15. çentik (60 içinde) sağda (3 yönünde)", () => {
    const p = tickPosition(15, 60, 100, 90);
    expect(p.x1).toBeCloseTo(190);
    expect(p.y1).toBeCloseTo(100);
  });

  it("dış ve iç uç arasındaki uzaklık verilen uzunluk kadardır", () => {
    const p = tickPosition(7, 60, 100, 90, 14);
    expect(Math.hypot(p.x2 - p.x1, p.y2 - p.y1)).toBeCloseTo(14);
  });
});
