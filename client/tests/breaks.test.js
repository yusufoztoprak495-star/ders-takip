import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BREAK_TIPS,
  DEFAULT_BREAK_SETTINGS,
  breakAfter,
  breakTip,
  eyeReminderIndex,
  loadBreakSettings,
  nextStreak,
  saveBreakSettings,
} from "../src/lib/breaks.js";

const MIN = 60_000;

describe("breakAfter (uzun mola)", () => {
  const s = { longBreakMinutes: 15, longEvery: 4 };
  it("her 4. turdan sonra uzun mola, diğerlerinde kısa", () => {
    expect(breakAfter(1, 5, s)).toEqual({ minutes: 5, long: false });
    expect(breakAfter(3, 5, s)).toEqual({ minutes: 5, long: false });
    expect(breakAfter(4, 5, s)).toEqual({ minutes: 15, long: true });
    expect(breakAfter(8, 5, s)).toEqual({ minutes: 15, long: true });
  });

  it("uzun mola kapalıysa (longEvery 0) hep kısa", () => {
    expect(breakAfter(4, 5, { longBreakMinutes: 15, longEvery: 0 })).toEqual({ minutes: 5, long: false });
  });
});

describe("nextStreak (art arda turlar)", () => {
  it("mola bittikten sonra 30 dakika içinde başlanan tur seriyi sürdürür", () => {
    expect(nextStreak({ count: 2, lastEndedAtMs: 0 }, 10 * MIN)).toBe(2);
  });
  it("uzun aradan sonra ya da ilk turda seri sıfırdan başlar", () => {
    expect(nextStreak({ count: 3, lastEndedAtMs: 0 }, 31 * MIN)).toBe(0);
    expect(nextStreak(null, 5 * MIN)).toBe(0);
  });
});

describe("eyeReminderIndex (20-20-20)", () => {
  it("her 20 dakikada bir hatırlatma sırası artar; bitişe 1 dakikadan az kala hatırlatılmaz", () => {
    expect(eyeReminderIndex(19 * 60, 50 * 60)).toBe(0);
    expect(eyeReminderIndex(20 * 60, 50 * 60)).toBe(1);
    expect(eyeReminderIndex(41 * 60, 50 * 60)).toBe(2);
    expect(eyeReminderIndex(24 * 60 + 30, 25 * 60)).toBe(1); // 25 dk'lık turda 20. dakikada hatırlatılır
    expect(eyeReminderIndex(20 * 60, 20 * 60 + 30)).toBe(0);
  });
});

describe("breakTip", () => {
  it("mola önerileri döner, uzun molada hareket önerilir", () => {
    expect(BREAK_TIPS.short.length).toBeGreaterThan(3);
    expect(BREAK_TIPS.short).toContain(breakTip(false, 2));
    expect(BREAK_TIPS.long).toContain(breakTip(true, 7));
  });
});

describe("mola ayarları", () => {
  // Basit sahte localStorage (testler Node'da çalışır)
  beforeEach(() => {
    const data = {};
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => {
        data[k] = String(v);
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("kayıt yoksa ya da bozuksa varsayılan", () => {
    expect(loadBreakSettings()).toEqual(DEFAULT_BREAK_SETTINGS);
    localStorage.setItem("mola.ayarlari", "{bozuk");
    expect(loadBreakSettings()).toEqual(DEFAULT_BREAK_SETTINGS);
  });
  it("kaydeder ve okur; geçersiz alan varsayılana döner", () => {
    saveBreakSettings({ longBreakMinutes: 20, longEvery: 3, eyeReminder: false });
    expect(loadBreakSettings()).toEqual({ longBreakMinutes: 20, longEvery: 3, eyeReminder: false });
    localStorage.setItem("mola.ayarlari", JSON.stringify({ longBreakMinutes: -1, longEvery: "x", eyeReminder: 1 }));
    expect(loadBreakSettings()).toEqual(DEFAULT_BREAK_SETTINGS);
  });
});
