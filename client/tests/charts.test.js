import { describe, it, expect } from "vitest";
import {
  accuracyOf,
  fillMissingDays,
  groupByWeek,
  weekStartOf,
  weeklyFrom,
  summarize,
} from "../src/lib/charts.js";

const day = (date, totalSeconds = 0, correct = 0, wrong = 0, blank = 0) => ({
  date,
  totalSeconds,
  correct,
  wrong,
  blank,
  net: correct - wrong / 4,
});

describe("fillMissingDays", () => {
  it("3 günlük aralıkta bir günlük veriyle 3 satır döner, boşlar sıfır", () => {
    const result = fillMissingDays(
      [day("2026-10-11", 600, 5, 1, 0)],
      "2026-10-10",
      "2026-10-12",
    );
    expect(result).toEqual([
      {
        date: "2026-10-10",
        totalSeconds: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        net: 0,
      },
      day("2026-10-11", 600, 5, 1, 0),
      {
        date: "2026-10-12",
        totalSeconds: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
        net: 0,
      },
    ]);
  });

  it("ay sınırını doğru geçer", () => {
    const dates = fillMissingDays([], "2026-09-30", "2026-10-02").map(
      (d) => d.date,
    );
    expect(dates).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("aralık dışındaki günleri atar", () => {
    const result = fillMissingDays(
      [day("2026-09-01", 100), day("2026-10-11", 200)],
      "2026-10-10",
      "2026-10-11",
    );
    expect(result.map((d) => d.date)).toEqual(["2026-10-10", "2026-10-11"]);
  });

  it("tek günlük aralıkta (from = to) bir satır döner", () => {
    expect(fillMissingDays([], "2026-10-12", "2026-10-12")).toHaveLength(1);
  });
});

describe("weekStartOf", () => {
  it("haftanın başlangıcı Pazartesidir", () => {
    expect(weekStartOf("2026-10-12")).toBe("2026-10-12"); // Pazartesi
    expect(weekStartOf("2026-10-11")).toBe("2026-10-05"); // Pazar bir önceki haftadır
    expect(weekStartOf("2026-10-14")).toBe("2026-10-12"); // Çarşamba
  });

  it("ay sınırını geçer", () => {
    expect(weekStartOf("2026-10-01")).toBe("2026-09-28");
  });
});

describe("groupByWeek", () => {
  it("Pazar ve Pazartesi farklı haftalara düşer", () => {
    const weeks = groupByWeek([day("2026-10-11", 100), day("2026-10-12", 200)]);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-10-05", "2026-10-12"]);
    expect(weeks.map((w) => w.totalSeconds)).toEqual([100, 200]);
  });

  it("aynı haftadaki günleri toplar, net toplam doğru/yanlıştan hesaplanır", () => {
    const [week] = groupByWeek([
      day("2026-10-12", 600, 6, 2, 2),
      day("2026-10-14", 300, 4, 2, 0),
    ]);
    expect(week).toEqual({
      weekStart: "2026-10-12",
      totalSeconds: 900,
      correct: 10,
      wrong: 4,
      blank: 2,
      net: 9,
    });
  });

  it("boş girdide boş dizi döner", () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it("girdi sırasından bağımsız olarak haftaları artan sıralar", () => {
    const weeks = groupByWeek([day("2026-10-20", 1), day("2026-10-05", 2)]);
    expect(weeks.map((w) => w.weekStart)).toEqual(["2026-10-05", "2026-10-19"]);
  });
});

describe("weeklyFrom", () => {
  const today = new Date(2026, 9, 12);

  it("kısa aralıkta en az 4 hafta geriye gider ve haftanın Pazartesisinden başlar", () => {
    // 28 gün geriye = 15 Eylül (Salı) -> o haftanın Pazartesisi 14 Eylül
    expect(weeklyFrom(14, today)).toBe("2026-09-14");
  });

  it("uzun aralıkta seçilen aralığı kapsar", () => {
    expect(weeklyFrom(90, today) <= "2026-07-15").toBe(true);
  });
});

describe("summarize", () => {
  it("günlükleri toplar", () => {
    expect(
      summarize([
        day("2026-10-11", 600, 6, 2, 2),
        day("2026-10-12", 300, 4, 2, 0),
      ]),
    ).toEqual({
      totalSeconds: 900,
      questions: 16,
      correct: 10,
      wrong: 4,
      blank: 2,
      net: 9,
      accuracy: 63, // 10 / 16
    });
  });

  it("boş girdide sıfırlar döner (NaN yok)", () => {
    expect(summarize([])).toEqual({
      totalSeconds: 0,
      questions: 0,
      correct: 0,
      wrong: 0,
      blank: 0,
      net: 0,
      accuracy: null,
    });
  });
});

describe("accuracyOf", () => {
  it("doğru / (doğru + yanlış + boş) yüzdesi; soru yoksa null", () => {
    expect(accuracyOf(3, 1, 0)).toBe(75);
    expect(accuracyOf(0, 0, 0)).toBeNull();
  });
});

describe("summarize doğruluk", () => {
  it("toplamlardan doğruluk oranını da verir", () => {
    const result = summarize([
      { totalSeconds: 60, correct: 6, wrong: 2, blank: 2 },
      { totalSeconds: 0, correct: 4, wrong: 0, blank: 0 },
    ]);
    expect(result.accuracy).toBe(71);
    expect(summarize([]).accuracy).toBeNull();
  });
});
