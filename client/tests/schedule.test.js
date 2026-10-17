import { describe, it, expect } from "vitest";
import {
  DAYS,
  DEFAULT_DAY_WINDOW,
  busyMinutes,
  dayIndexOf,
  formatClock,
  freeWindows,
  gridRange,
  minutesLabel,
  overlaps,
  parseClock,
  weekDates,
} from "../src/lib/schedule.js";

describe("DAYS", () => {
  it("haftayı pazartesiden başlatır, 7 gündür", () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0].name).toBe("Pazartesi");
    expect(DAYS[6].short).toBe("Paz");
  });
});

describe("parseClock / formatClock", () => {
  it("'08:30' -> 510, 510 -> '08:30'", () => {
    expect(parseClock("08:30")).toBe(510);
    expect(formatClock(510)).toBe("08:30");
  });

  it("gün sonu 24:00 kabul edilir", () => {
    expect(parseClock("24:00")).toBe(1440);
    expect(formatClock(1440)).toBe("24:00");
  });

  it("geçersiz saatlerde null döner", () => {
    for (const bad of ["", "8:3", "25:00", "12:60", "24:30", "ab:cd", null, undefined]) {
      expect(parseClock(bad)).toBeNull();
    }
  });

  it("tek haneli saati de kabul eder ('9:05')", () => {
    expect(parseClock("9:05")).toBe(545);
  });
});

describe("minutesLabel", () => {
  it("dakikayı okunur süreye çevirir", () => {
    expect(minutesLabel(0)).toBe("0 dk");
    expect(minutesLabel(45)).toBe("45 dk");
    expect(minutesLabel(60)).toBe("1 sa");
    expect(minutesLabel(135)).toBe("2 sa 15 dk");
  });
});

describe("overlaps", () => {
  it("uç uca değen bloklar çakışmaz", () => {
    expect(overlaps({ start: 480, end: 540 }, { start: 540, end: 600 })).toBe(false);
  });

  it("iç içe ya da kesişen bloklar çakışır", () => {
    expect(overlaps({ start: 480, end: 600 }, { start: 500, end: 520 })).toBe(true);
    expect(overlaps({ start: 480, end: 540 }, { start: 530, end: 600 })).toBe(true);
  });
});

describe("freeWindows", () => {
  it("dersler arasındaki ve çevresindeki boşlukları sıralı verir", () => {
    const blocks = [
      { start: 600, end: 660 },
      { start: 480, end: 540 },
    ];
    expect(freeWindows(blocks, 420, 720)).toEqual([
      { start: 420, end: 480 },
      { start: 540, end: 600 },
      { start: 660, end: 720 },
    ]);
  });

  it("aralık dışındaki ve üst üste binen blokları doğru kırpar", () => {
    const blocks = [
      { start: 300, end: 500 },
      { start: 450, end: 520 },
      { start: 900, end: 1000 },
    ];
    expect(freeWindows(blocks, 480, 600)).toEqual([{ start: 520, end: 600 }]);
  });

  it("en kısa boşluk sınırının altındakileri atar", () => {
    const blocks = [{ start: 500, end: 600 }];
    expect(freeWindows(blocks, 480, 700, 30)).toEqual([{ start: 600, end: 700 }]);
  });

  it("hiç blok yoksa tüm aralık boştur", () => {
    expect(freeWindows([], 480, 1380)).toEqual([{ start: 480, end: 1380 }]);
  });
});

describe("busyMinutes", () => {
  it("aralık içinde kalan dolu süreyi üst üste saymadan toplar", () => {
    const blocks = [
      { start: 450, end: 540 },
      { start: 500, end: 560 },
    ];
    expect(busyMinutes(blocks, 480, 1380)).toBe(80);
  });
});

describe("dayIndexOf / weekDates", () => {
  it("pazartesi 0, pazar 6", () => {
    expect(dayIndexOf(new Date(2026, 9, 12))).toBe(0); // 12 Ekim 2026 pazartesi
    expect(dayIndexOf(new Date(2026, 9, 18))).toBe(6); // pazar
  });

  it("içinde bulunulan haftanın 7 gününü pazartesiden verir", () => {
    const dates = weekDates(new Date(2026, 9, 17, 23, 30)); // cumartesi gece
    expect(dates[0]).toBe("2026-10-12");
    expect(dates[6]).toBe("2026-10-18");
  });

  it("ay sınırını doğru geçer", () => {
    expect(weekDates(new Date(2026, 10, 1))).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });
});

describe("gridRange", () => {
  it("gün aralığını tam saate yuvarlar", () => {
    expect(gridRange([], { dayStart: 485, dayEnd: 1370 })).toEqual({ start: 480, end: 1380 });
  });

  it("aralık dışına taşan blokları da kapsar", () => {
    const blocks = [{ start: 400, end: 430 }, { start: 1390, end: 1430 }];
    expect(gridRange(blocks, DEFAULT_DAY_WINDOW)).toEqual({ start: 360, end: 1440 });
  });
});

import { slotAt, spanFromInputs, STUDY_GAP_MIN } from "../src/lib/schedule.js";

describe("spanFromInputs", () => {
  it("saat kutularındaki metni dakikaya çevirir", () => {
    expect(spanFromInputs("08:30", "09:10")).toEqual({ start: 510, end: 550 });
  });

  it("bitiş 00:00 ise gece yarısı (24:00) sayılır", () => {
    expect(spanFromInputs("22:00", "00:00")).toEqual({ start: 1320, end: 1440 });
  });

  it("eksik saatte null döner", () => {
    expect(spanFromInputs("", "09:00")).toBeNull();
  });
});

describe("slotAt", () => {
  const range = { start: 480, end: 1380 };
  const blocks = [{ start: 600, end: 660 }];

  it("tıklanan yarım saatten başlayan bir saatlik boş yer önerir", () => {
    expect(slotAt(blocks, 520, range)).toEqual({ start: 510, end: 570 });
  });

  it("sonraki bloğa kadar kısaltır", () => {
    expect(slotAt(blocks, 575, range)).toEqual({ start: 570, end: 600 });
  });

  it("dolu bir yere tıklanırsa null", () => {
    expect(slotAt(blocks, 610, range)).toBeNull();
  });

  it("aralığın sonunu geçmez", () => {
    expect(slotAt([], 1370, range)).toEqual({ start: 1350, end: 1380 });
  });
});

describe("STUDY_GAP_MIN", () => {
  it("çalışmaya yetecek en kısa boşluk 45 dakikadır", () => {
    expect(STUDY_GAP_MIN).toBe(45);
  });
});
