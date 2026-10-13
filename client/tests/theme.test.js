import { describe, it, expect } from "vitest";
import { resolveTheme, nextTheme } from "../src/lib/theme.js";

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

describe("nextTheme", () => {
  it("temayı tersine çevirir", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
