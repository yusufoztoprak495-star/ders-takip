import { describe, it, expect } from "vitest";
import { formatDuration, formatNet, formatDate, formatShortDate, addedNotice } from "../src/lib/format.js";

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

describe("formatDate / formatShortDate", () => {
  it("YYYY-AA-GG metnini GG.AA.YYYY yapar", () => {
    expect(formatDate("2026-10-12")).toBe("12.10.2026");
    expect(formatDate("2026-01-05")).toBe("05.01.2026");
  });

  it("kısa biçim yıl içermez (grafik ekseni için)", () => {
    expect(formatShortDate("2026-10-12")).toBe("12.10");
  });
});

describe("addedNotice", () => {
  it("bugüne eklenen kayıt için kısa mesaj verir", () => {
    expect(addedNotice("2026-10-12", "2026-10-12")).toBe("Kayıt eklendi.");
  });

  it("başka güne eklenen kayıtta tarihi söyler ve bugün listesinde görünmeyeceğini belirtir", () => {
    const text = addedNotice("2026-10-11", "2026-10-12");
    expect(text).toContain("11.10.2026");
    expect(text).toContain("Bugün");
  });
});
