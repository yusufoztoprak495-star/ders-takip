import { describe, it, expect } from "vitest";
import { sortWeakestFirst, questionCount } from "../src/lib/topics.js";
import { formatLastSolved, formatLastStudied, formatPercent } from "../src/lib/format.js";

const row = (topicName, correct, wrong, blank, accuracy) => ({ topicName, correct, wrong, blank, accuracy });

describe("questionCount", () => {
  it("doğru + yanlış + boş", () => {
    expect(questionCount(row("a", 3, 2, 1, 50))).toBe(6);
  });
});

describe("sortWeakestFirst", () => {
  it("doğruluğu en düşük konu en başa gelir", () => {
    const sorted = sortWeakestFirst([row("iyi", 9, 1, 0, 90), row("zayıf", 2, 8, 0, 20), row("orta", 5, 5, 0, 50)]);
    expect(sorted.map((r) => r.topicName)).toEqual(["zayıf", "orta", "iyi"]);
  });

  it("hiç soru çözülmemiş (accuracy null) konular en sona gider", () => {
    const sorted = sortWeakestFirst([row("boş", 0, 0, 0, null), row("iyi", 9, 1, 0, 90), row("zayıf", 2, 8, 0, 20)]);
    expect(sorted.map((r) => r.topicName)).toEqual(["zayıf", "iyi", "boş"]);
  });

  it("aynı doğrulukta çok soru çözülen konu önce gelir", () => {
    const sorted = sortWeakestFirst([row("az", 1, 1, 0, 50), row("çok", 50, 50, 0, 50)]);
    expect(sorted.map((r) => r.topicName)).toEqual(["çok", "az"]);
  });

  it("tam eşitlikte ada göre (Türkçe) sıralar", () => {
    const sorted = sortWeakestFirst([row("Ünite", 1, 1, 0, 50), row("Cebir", 1, 1, 0, 50)]);
    expect(sorted.map((r) => r.topicName)).toEqual(["Cebir", "Ünite"]);
  });

  it("girdi dizisini değiştirmez; boş dizi çalışır", () => {
    const input = [row("b", 1, 1, 0, 50), row("a", 0, 5, 0, 0)];
    sortWeakestFirst(input);
    expect(input.map((r) => r.topicName)).toEqual(["b", "a"]);
    expect(sortWeakestFirst([])).toEqual([]);
  });
});

describe("formatPercent", () => {
  it("yüzde işaretiyle yazar, null için çizgi gösterir", () => {
    expect(formatPercent(75)).toBe("%75");
    expect(formatPercent(0)).toBe("%0");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatLastStudied", () => {
  it("hiç çalışılmamışsa bunu söyler", () => {
    expect(formatLastStudied(null, "2026-10-12")).toBe("Henüz çalışılmadı");
  });
  it("bugün, dün ve n gün önce", () => {
    expect(formatLastStudied("2026-10-12", "2026-10-12")).toBe("Bugün");
    expect(formatLastStudied("2026-10-11", "2026-10-12")).toBe("Dün · 11.10.2026");
    expect(formatLastStudied("2026-10-09", "2026-10-12")).toBe("3 gün önce · 09.10.2026");
  });
  it("ay ve yıl sınırını doğru sayar", () => {
    expect(formatLastStudied("2026-09-30", "2026-10-02")).toBe("2 gün önce · 30.09.2026");
    expect(formatLastStudied("2025-12-31", "2026-01-01")).toBe("Dün · 31.12.2025");
  });
});

describe("formatLastSolved", () => {
  it("hiç test çözülmemişse bunu söyler", () => {
    expect(formatLastSolved(null, "2026-10-12")).toBe("Henüz test çözülmedi");
  });
  it("tarihi göreli ve tam olarak yazar", () => {
    expect(formatLastSolved("2026-10-12", "2026-10-12")).toBe("Bugün");
    expect(formatLastSolved("2026-10-09", "2026-10-12")).toBe("3 gün önce · 09.10.2026");
  });
});
