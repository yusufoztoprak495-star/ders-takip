import { describe, it, expect } from "vitest";
import { toLocalDateString } from "../src/lib/dates.js";

describe("toLocalDateString", () => {
  it("yerel tarihi YYYY-AA-GG olarak verir (gece 00:30 de o günün sayılır)", () => {
    expect(toLocalDateString(new Date(2026, 9, 12, 0, 30))).toBe("2026-10-12");
  });

  it("tek haneli ay ve günü sıfırla doldurur", () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
