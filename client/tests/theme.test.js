import { describe, it, expect } from "vitest";
import { resolveTheme, nextTheme, isForcedDarkCanvas } from "../src/lib/theme.js";

describe("resolveTheme", () => {
  it("kayıtlı seçim varsa sistem temasını yok sayar", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("kayıt yoksa sistem temasına uyar", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });

  it.each(["", "mavi", undefined, 5])(
    "geçersiz kayıt (%s) sistem temasına düşer",
    (stored) => {
      expect(resolveTheme(stored, true)).toBe("dark");
      expect(resolveTheme(stored, false)).toBe("light");
    },
  );
});

describe("resolveTheme: tarayıcı sayfayı zorla karartıyorsa", () => {
  it("kayıtlı seçim açık olsa bile koyu temayı açar (açık tema zorla karartılınca bozuk görünür)", () => {
    expect(resolveTheme("light", false, true)).toBe("dark");
    expect(resolveTheme(null, false, true)).toBe("dark");
    expect(resolveTheme("dark", false, true)).toBe("dark");
  });

  it("zorla karartma yoksa eski davranış aynen sürer", () => {
    expect(resolveTheme("light", true, false)).toBe("light");
    expect(resolveTheme(null, false, false)).toBe("light");
  });
});

describe("isForcedDarkCanvas", () => {
  it("açık şemada Canvas rengi koyu çıkıyorsa tarayıcı sayfayı zorla karartıyordur", () => {
    expect(isForcedDarkCanvas("rgb(18, 18, 18)")).toBe(true);
    expect(isForcedDarkCanvas("rgb(255, 255, 255)")).toBe(false);
    expect(isForcedDarkCanvas("rgba(0, 0, 0, 0)")).toBe(false);
    expect(isForcedDarkCanvas("")).toBe(false);
  });
});

describe("nextTheme", () => {
  it("temayı tersine çevirir", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
