import { describe, it, expect } from "vitest";
import { THEMES, THEME_BAR_COLORS, isDarkTheme, isTheme, resolveTheme, isForcedDarkCanvas } from "../src/lib/theme.js";

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

describe("dört tema", () => {
  it("Gece, Kâğıt, Neon ve Pastel temaları tanınır", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["dark", "light", "neon", "pastel"]);
    for (const id of ["dark", "light", "neon", "pastel"]) expect(isTheme(id)).toBe(true);
    expect(isTheme("mavi")).toBe(false);
  });

  it("kayıtlı yeni temalar olduğu gibi açılır", () => {
    expect(resolveTheme("neon", false)).toBe("neon");
    expect(resolveTheme("pastel", true)).toBe("pastel");
  });

  it("zorla karartmada koyu temalar (Gece, Neon) korunur, açık olanlar Gece'ye döner", () => {
    expect(resolveTheme("neon", false, true)).toBe("neon");
    expect(resolveTheme("pastel", false, true)).toBe("dark");
  });

  it("her temanın koyu/açık bilgisi ve tarayıcı çubuğu rengi var", () => {
    expect(isDarkTheme("neon")).toBe(true);
    expect(isDarkTheme("pastel")).toBe(false);
    for (const t of THEMES) expect(THEME_BAR_COLORS[t.id]).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
