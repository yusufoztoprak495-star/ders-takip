import { describe, it, expect } from "vitest";
import {
  requireInt,
  optionalInt,
  requireString,
  requireDate,
  requireIsoDateTime,
  requireOneOf,
} from "../../src/data/validation.js";
import { HttpError } from "../../src/data/errors.js";

describe("requireInt", () => {
  it("tam sayıyı kabul eder", () => {
    expect(requireInt(5, "x")).toBe(5);
    expect(requireInt(0, "x", { min: 0 })).toBe(0);
  });

  it.each([
    ['metin "5"', "5"],
    ["ondalık 1.5", 1.5],
    ["NaN", NaN],
    ["undefined", undefined],
    ["null", null],
  ])("%s değerini reddeder", (_, value) => {
    expect(() => requireInt(value, "x")).toThrow(HttpError);
  });

  it("min altını ve max üstünü reddeder", () => {
    expect(() => requireInt(0, "x", { min: 1 })).toThrow(HttpError);
    expect(() => requireInt(11, "x", { max: 10 })).toThrow(HttpError);
  });
});

describe("optionalInt", () => {
  it("null ve undefined için null döner", () => {
    expect(optionalInt(null, "x")).toBeNull();
    expect(optionalInt(undefined, "x")).toBeNull();
  });
  it("verilen değeri requireInt gibi doğrular", () => {
    expect(optionalInt(3, "x")).toBe(3);
    expect(() => optionalInt("3", "x")).toThrow(HttpError);
  });
});

describe("requireString", () => {
  it("kırpılmış metni döner", () => {
    expect(requireString("  merhaba ", "x")).toBe("merhaba");
  });
  it("boş, boşluk ve metin olmayanı reddeder", () => {
    expect(() => requireString("  ", "x")).toThrow(HttpError);
    expect(() => requireString(5, "x")).toThrow(HttpError);
  });
  it("maxLength aşılırsa reddeder", () => {
    expect(() => requireString("abcd", "x", { maxLength: 3 })).toThrow(
      HttpError,
    );
  });
});

describe("requireDate", () => {
  it("geçerli takvim gününü kabul eder", () => {
    expect(requireDate("2026-10-12", "x")).toBe("2026-10-12");
  });
  it.each(["2026-02-30", "2026-13-01", "12.10.2026", "dün", "", 20261012, null])(
    "%s değerini reddeder",
    (value) => {
      expect(() => requireDate(value, "x")).toThrow(HttpError);
    },
  );
});

describe("requireIsoDateTime", () => {
  it("ISO zamanını UTC ISO biçimine çevirip döner", () => {
    expect(requireIsoDateTime("2026-10-12T10:00:00.000Z", "x")).toBe("2026-10-12T10:00:00.000Z");
    expect(requireIsoDateTime("2026-10-12T13:00:00+03:00", "x")).toBe("2026-10-12T10:00:00.000Z");
  });
  it.each(["dün", "2026-10-12", "", 5, null])("%s değerini reddeder", (value) => {
    expect(() => requireIsoDateTime(value, "x")).toThrow(HttpError);
  });
});

describe("requireOneOf", () => {
  it("listedeki değeri kabul eder, diğerlerini reddeder", () => {
    expect(requireOneOf("manual", "x", ["manual", "pomodoro"])).toBe("manual");
    expect(() => requireOneOf("x", "x", ["manual", "pomodoro"])).toThrow(HttpError);
    expect(() => requireOneOf(undefined, "x", ["manual"])).toThrow(HttpError);
  });
});

describe("sınır değerleri (inceleme bulgusu: üst sınırsız sayılar)", () => {
  it("güvenli tam sayı sınırını aşan değerleri reddeder", () => {
    expect(() => requireInt(1e300, "x")).toThrow(HttpError);
    expect(() => requireInt(Number.MAX_SAFE_INTEGER + 1, "x")).toThrow(HttpError);
    expect(requireInt(Number.MAX_SAFE_INTEGER, "x")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("makul olmayan yılları reddeder (tarih ve zaman)", () => {
    expect(() => requireDate("1999-12-31", "x")).toThrow(HttpError);
    expect(() => requireDate("2101-01-01", "x")).toThrow(HttpError);
    expect(requireDate("2000-01-01", "x")).toBe("2000-01-01");
    expect(() => requireIsoDateTime("1900-01-01T00:00:00.000Z", "x")).toThrow(HttpError);
    expect(() => requireIsoDateTime("2200-01-01T00:00:00.000Z", "x")).toThrow(HttpError);
  });
});
