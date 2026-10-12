import { describe, it, expect } from "vitest";
import { formatDuration, formatNet } from "../src/lib/format.js";

describe("formatDuration", () => {
  it.each([
    [45, "45 sn"],
    [60, "1 dk"],
    [1500, "25 dk"],
    [3600, "1 sa"],
    [3660, "1 sa 1 dk"],
    [5400, "1 sa 30 dk"],
    [0, "0 sn"],
  ])("%i saniye → %s", (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });

  it("dakikanın altındaki farkı dakikaya yuvarlar", () => {
    expect(formatDuration(1529)).toBe("25 dk");
    expect(formatDuration(1531)).toBe("26 dk");
  });
});

describe("formatNet", () => {
  it.each([
    [9, "9"],
    [0, "0"],
    [2.75, "2,75"],
    [-0.25, "-0,25"],
    [12.5, "12,5"],
  ])("%f → %s (Türkçe ondalık virgülü)", (net, text) => {
    expect(formatNet(net)).toBe(text);
  });
});
