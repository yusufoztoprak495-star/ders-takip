import { describe, it, expect } from "vitest";
import { HttpError } from "../../src/data/errors.js";
import { emptyState } from "../../src/data/seed.js";
import { parseBackupText } from "../../src/data/validation.js";
import { makeTestApp } from "./helpers.js";

describe("parseBackupText", () => {
  it.each(["{bozuk", "[]", "{}", '{"subjects":"x"}', "null"])("%s metnini 400 ile reddeder", (text) => {
    try {
      parseBackupText(text);
      throw new Error("reddedilmedi");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error.status).toBe(400);
      expect(error.message).toMatch(/^Yedek dosyası geçersiz/);
    }
  });

  it.each([
    '{"subjects":[null]}',
    '{"sessions":[1,2]}',
    '{"topics":[{"name":"id yok"}]}',
    '{"topics":[{"id":"3"}]}',
  ])("%s: kaydı nesne olmayan ya da tamsayı id'si olmayan yedeği reddeder", (text) => {
    expect(() => parseBackupText(text)).toThrow(/Yedek dosyası geçersiz/);
  });

  it("geçerli yedeği kabul eder", () => {
    const state = emptyState();
    expect(parseBackupText(JSON.stringify(state))).toEqual(state);
  });

  it("bilinmeyen alanları çıktıdan atar", () => {
    const result = parseBackupText('{"subjects":[],"foo":1}');
    expect(result).not.toHaveProperty("foo");
    expect(result.subjects).toEqual([]);
  });
});

describe("replaceAll doğrulaması", () => {
  it("geçersiz veride reddeder ve mevcut veriye dokunmaz", async () => {
    const { app } = makeTestApp();
    const before = await app.snapshot();
    await expect(app.replaceAll({ subjects: "x" })).rejects.toBeInstanceOf(HttpError);
    await expect(app.replaceAll(null)).rejects.toBeInstanceOf(HttpError);
    expect(await app.snapshot()).toEqual(before);
  });

  it("geçerli veriyi uygular", async () => {
    const { app } = makeTestApp();
    await app.replaceAll(emptyState());
    expect((await app.snapshot()).subjects).toEqual([]);
  });
});
