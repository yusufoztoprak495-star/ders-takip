import { describe, it, expect } from "vitest";
import { netOf } from "../src/stats.js";

describe("netOf", () => {
  it("net = doğru − yanlış / 4", () => {
    expect(netOf(10, 4)).toBe(9);
    expect(netOf(0, 0)).toBe(0);
  });

  it("2 ondalığa yuvarlar", () => {
    expect(netOf(3, 1)).toBe(2.75);
    expect(netOf(1, 1)).toBe(0.75);
    expect(netOf(0, 1)).toBe(-0.25);
    expect(netOf(1, 2)).toBe(0.5);
  });
});
