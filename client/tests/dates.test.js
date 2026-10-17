import { describe, it, expect } from "vitest";
import { toLocalDateString, noonOfLocalDate, daysAgo } from "../src/lib/dates.js";

describe("noonOfLocalDate", () => {
  it("yerel günün 12:00'sini UTC ISO olarak verir", () => {
    expect(noonOfLocalDate("2026-10-12")).toBe(
      new Date(2026, 9, 12, 12).toISOString(),
    );
  });

  it("döndürdüğü an, yerel takvimde aynı güne denk gelir", () => {
    const back = toLocalDateString(new Date(noonOfLocalDate("2026-10-12")));
    expect(back).toBe("2026-10-12");
  });

  it.each(["", "2026-02-30", "dün", null, undefined])(
    "%s için null döner",
    (value) => {
      expect(noonOfLocalDate(value)).toBeNull();
    },
  );
});

describe("toLocalDateString", () => {
  it("yerel tarihi YYYY-AA-GG olarak verir (gece 00:30 de o günün sayılır)", () => {
    expect(toLocalDateString(new Date(2026, 9, 12, 0, 30))).toBe("2026-10-12");
  });

  it("tek haneli ay ve günü sıfırla doldurur", () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("daysAgo", () => {
  const base = new Date(2026, 9, 12, 0, 30);

  it("0 gün önce bugünün tarihidir", () => {
    expect(daysAgo(0, base)).toBe("2026-10-12");
  });

  it("ay sınırını doğru geçer", () => {
    expect(daysAgo(29, base)).toBe("2026-09-13");
    expect(daysAgo(12, base)).toBe("2026-09-30");
  });

  it("yıl sınırını doğru geçer", () => {
    expect(daysAgo(1, new Date(2026, 0, 1, 10))).toBe("2025-12-31");
  });

  it("verilen Date nesnesini değiştirmez", () => {
    const d = new Date(2026, 9, 12);
    daysAgo(5, d);
    expect(toLocalDateString(d)).toBe("2026-10-12");
  });
});

import { daysBetween } from "../src/lib/dates.js";

describe("daysBetween", () => {
  it("iki yerel gün arasındaki gün sayısı (geri sayım için)", () => {
    expect(daysBetween("2026-10-17", "2026-10-17")).toBe(0);
    expect(daysBetween("2026-10-17", "2027-06-19")).toBe(245);
    expect(daysBetween("2026-10-17", "2026-10-10")).toBe(-7);
  });

  it("yaz saati geçişinde de tam gün sayar", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("dueLabel", () => {
  it("teslime kalan günü yazar", async () => {
    const { dueLabel } = await import("../src/lib/dates.js");
    expect(dueLabel("2026-10-19", "2026-10-19")).toBe("bugün");
    expect(dueLabel("2026-10-20", "2026-10-19")).toBe("yarın");
    expect(dueLabel("2026-10-24", "2026-10-19")).toBe("5 gün kaldı");
    expect(dueLabel("2026-10-17", "2026-10-19")).toBe("2 gün geçti");
  });
});
