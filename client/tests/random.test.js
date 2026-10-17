import { describe, it, expect } from "vitest";
import { seeded } from "../src/lib/random.js";

describe("seeded", () => {
  it("aynı tohum her açılışta aynı diziyi verir (arka plan çizimi yer değiştirmesin)", () => {
    const a = seeded(42);
    const b = seeded(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
  });

  it("0 ile 1 arasında sayılar üretir", () => {
    const r = seeded(7);
    for (let i = 0; i < 500; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("farklı tohumlar farklı dizi verir", () => {
    expect(seeded(1)()).not.toBe(seeded(2)());
  });
});
