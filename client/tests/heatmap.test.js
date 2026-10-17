import { describe, it, expect } from "vitest";
import { heatmapLevel, heatmapWeeks } from "../src/lib/heatmap.js";

describe("heatmapLevel", () => {
  it("süreyi 0–4 arası koyuluğa çevirir", () => {
    expect(heatmapLevel(0)).toBe(0);
    expect(heatmapLevel(10 * 60)).toBe(1);
    expect(heatmapLevel(45 * 60)).toBe(2);
    expect(heatmapLevel(2 * 3600)).toBe(3);
    expect(heatmapLevel(5 * 3600)).toBe(4);
  });
});

describe("heatmapWeeks", () => {
  const daily = [
    { date: "2026-10-19", totalSeconds: 7200 },
    { date: "2026-10-14", totalSeconds: 600 },
  ];

  it("sütunlar haftadır (pazartesi başlar), son sütun bugünün haftası; bugünden sonrası boş", () => {
    const weeks = heatmapWeeks(daily, "2026-10-21", 3); // çarşamba
    expect(weeks).toHaveLength(3);
    expect(weeks[2].days[0].date).toBe("2026-10-19");
    expect(weeks[2].days[0].level).toBe(3);
    expect(weeks[2].days[2].date).toBe("2026-10-21");
    expect(weeks[2].days[3].future).toBe(true);
    expect(weeks[1].days[2]).toMatchObject({ date: "2026-10-14", seconds: 600, level: 1 });
    expect(weeks[0].days[0].date).toBe("2026-10-05");
  });

  it("ay değişen haftalara ay adı etiketi koyar", () => {
    const weeks = heatmapWeeks([], "2026-11-04", 6);
    const labels = weeks.filter((w) => w.month).map((w) => w.month);
    // 28 Eylül haftasından başlar: 5 Ekim ve 2 Kasım haftalarında ay değişir
    expect(labels).toEqual(["Eki", "Kas"]);
  });
});
