import { describe, it, expect } from "vitest";
import { requireInt, optionalInt, requireString } from "../src/validation.js";
import { HttpError } from "../src/errors.js";

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
