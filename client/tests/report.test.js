import { describe, it, expect } from "vitest";
import { weeklyReport } from "../src/lib/report.js";

const day = (date, totalSeconds, correct = 0, wrong = 0, blank = 0) => ({ date, totalSeconds, correct, wrong, blank });

describe("weeklyReport", () => {
  // 2026-10-12 Pazartesi
  const daily = [
    day("2026-10-06", 3600), // önceki hafta
    day("2026-10-07", 3600),
    day("2026-10-12", 7200, 30, 8, 2),
    day("2026-10-14", 1800),
    day("2026-10-17", 10800, 50, 10, 0),
  ];

  it("haftanın 7 gününü, toplamları ve en iyi günü verir", () => {
    const r = weeklyReport(daily, "2026-10-12", [{ subjectName: "Fizik", examType: "AYT", totalSeconds: 9000 }]);
    expect(r.weekStart).toBe("2026-10-12");
    expect(r.weekEnd).toBe("2026-10-18");
    expect(r.days.map((d) => d.seconds)).toEqual([7200, 0, 1800, 0, 0, 10800, 0]);
    expect(r.totalSeconds).toBe(19800);
    expect(r.studiedDays).toBe(3);
    expect(r.best).toEqual({ date: "2026-10-17", seconds: 10800 });
    expect(r.questions).toBe(100);
    expect(r.net).toBe(75.5);
    expect(r.accuracy).toBe(80);
    expect(r.topSubjects[0]).toMatchObject({ label: "Fizik (AYT)", seconds: 9000 });
  });

  it("önceki haftaya göre değişim yüzdesi; önceki hafta boşsa null", () => {
    expect(weeklyReport(daily, "2026-10-12", []).change).toBe(175); // 7200 → 19800
    expect(weeklyReport([day("2026-10-12", 600)], "2026-10-12", []).change).toBeNull();
  });

  it("boş hafta", () => {
    const r = weeklyReport([], "2026-10-12", []);
    expect(r).toMatchObject({ totalSeconds: 0, studiedDays: 0, best: null, accuracy: null, questions: 0 });
  });
});
