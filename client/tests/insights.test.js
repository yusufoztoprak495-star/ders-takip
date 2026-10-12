import { describe, it, expect } from "vitest";
import {
  addDays,
  studyStreak,
  topSubjectOfDay,
  weeklyChange,
} from "../src/lib/insights.js";

// Gün satırı: yalnızca süre ve soru sayısı gerekir
const day = (date, totalSeconds = 0, questions = 0) => ({
  date,
  totalSeconds,
  correct: questions,
  wrong: 0,
  blank: 0,
});

describe("addDays", () => {
  it("ay ve yıl sınırlarını doğru geçer", () => {
    expect(addDays("2026-10-12", -1)).toBe("2026-10-11");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("weeklyChange", () => {
  const today = "2026-10-12";

  it("son 7 günü önceki 7 günle karşılaştırır", () => {
    const days = [
      day("2026-10-12", 3600), // bu hafta (06.10–12.10)
      day("2026-10-06", 3600),
      day("2026-10-05", 1800), // geçen hafta (29.09–05.10)
      day("2026-09-29", 1800),
      day("2026-09-28", 99999), // iki hafta önce: sayılmaz
    ];
    expect(weeklyChange(days, today)).toEqual({
      current: 7200,
      previous: 3600,
      percent: 100,
      direction: "up",
    });
  });

  it("düşüşü negatif yüzde ve 'down' olarak verir", () => {
    const days = [day("2026-10-12", 1800), day("2026-10-05", 3600)];
    expect(weeklyChange(days, today)).toMatchObject({
      percent: -50,
      direction: "down",
    });
  });

  it("değişmediyse 'flat'", () => {
    const days = [day("2026-10-12", 3600), day("2026-10-05", 3600)];
    expect(weeklyChange(days, today)).toMatchObject({
      percent: 0,
      direction: "flat",
    });
  });

  it("geçen hafta hiç çalışılmadıysa yüzde yoktur (sıfıra bölme olmaz)", () => {
    expect(weeklyChange([day("2026-10-12", 3600)], today)).toEqual({
      current: 3600,
      previous: 0,
      percent: null,
      direction: "new",
    });
  });

  it("iki hafta da boşsa 'flat' ve yüzde null", () => {
    expect(weeklyChange([], today)).toEqual({
      current: 0,
      previous: 0,
      percent: null,
      direction: "flat",
    });
  });
});

describe("studyStreak", () => {
  const today = "2026-10-12";

  it("bugünden geriye üst üste çalışılan günleri sayar", () => {
    const days = [
      day("2026-10-12", 60),
      day("2026-10-11", 60),
      day("2026-10-10", 0, 5),
      day("2026-10-08", 60),
    ];
    expect(studyStreak(days, today)).toEqual({ count: 3, activeToday: true });
  });

  it("bugün henüz çalışılmadıysa seri dünden sayılır (gün bitmeden bozulmaz)", () => {
    const days = [day("2026-10-11", 60), day("2026-10-10", 60)];
    expect(studyStreak(days, today)).toEqual({ count: 2, activeToday: false });
  });

  it("dün de bugün de yoksa seri 0", () => {
    expect(studyStreak([day("2026-10-09", 60)], today)).toEqual({
      count: 0,
      activeToday: false,
    });
    expect(studyStreak([], today)).toEqual({ count: 0, activeToday: false });
  });

  it("süresi ve sorusu 0 olan gün seriyi böler", () => {
    const days = [
      day("2026-10-12", 60),
      day("2026-10-11", 0, 0),
      day("2026-10-10", 60),
    ];
    expect(studyStreak(days, today).count).toBe(1);
  });

  it("ay sınırından geçen seriyi sayar", () => {
    const days = [
      day("2026-10-02", 60),
      day("2026-10-01", 60),
      day("2026-09-30", 60),
      day("2026-09-29", 60),
    ];
    expect(studyStreak(days, "2026-10-02").count).toBe(4);
  });
});

describe("topSubjectOfDay", () => {
  const rows = [
    {
      subjectId: 1,
      subjectName: "Türkçe",
      examType: "TYT",
      totalSeconds: 1800,
    },
    {
      subjectId: 3,
      subjectName: "Matematik",
      examType: "TYT",
      totalSeconds: 5400,
    },
    { subjectId: 5, subjectName: "Fizik", examType: "AYT", totalSeconds: 0 },
  ];

  it("en çok çalışılan dersi verir", () => {
    expect(topSubjectOfDay(rows).subjectId).toBe(3);
  });

  it("hiç çalışılmamışsa null", () => {
    expect(
      topSubjectOfDay(rows.map((r) => ({ ...r, totalSeconds: 0 }))),
    ).toBeNull();
    expect(topSubjectOfDay([])).toBeNull();
  });

  it("girdiyi değiştirmez", () => {
    const copy = JSON.stringify(rows);
    topSubjectOfDay(rows);
    expect(JSON.stringify(rows)).toBe(copy);
  });
});
