import { describe, it, expect } from "vitest";
import { buildIcs, escapeIcsText, foldLine, nextDateForDay } from "../src/lib/ics.js";

const NOW = new Date(Date.UTC(2026, 9, 17, 9, 5, 0)); // 17.10.2026 Cumartesi

describe("nextDateForDay", () => {
  it("bugünden itibaren o haftanın gününe denk gelen ilk tarihi verir (0 = Pazartesi)", () => {
    expect(nextDateForDay("2026-10-17", 5)).toBe("2026-10-17"); // Cumartesi → bugün
    expect(nextDateForDay("2026-10-17", 6)).toBe("2026-10-18");
    expect(nextDateForDay("2026-10-17", 0)).toBe("2026-10-19");
    expect(nextDateForDay("2026-10-17", 4)).toBe("2026-10-23");
  });
});

describe("escapeIcsText / foldLine", () => {
  it("ters bölü, virgül, noktalı virgül ve satır sonunu kaçırır", () => {
    expect(escapeIcsText("a\\b, c; d\ne")).toBe("a\\\\b\\, c\; d\\ne");
  });

  it("75 bayttan uzun satırı boşlukla başlayan devam satırlarına böler (Türkçe harfler bölünmez)", () => {
    const line = `SUMMARY:${"ğ".repeat(60)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    [
      { uid: "class-3", title: "Matematik", location: "12-B", weekly: { day: 0, start: 510, end: 550 } },
      { uid: "plan-7", title: "Fizik: Soru, bankası", weekly: { day: 6, start: 1380, end: 1440 } },
      { uid: "exam-yks", title: "YKS", date: "2027-06-19" },
    ],
    { today: "2026-10-17", now: NOW },
  );
  const lines = ics.split("\r\n");

  it("geçerli bir takvim dosyası iskeleti üretir (CRLF, BEGIN/END)", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(3);
  });

  it("haftalık blokları ilk denk gelen günden başlayıp her hafta tekrarlar", () => {
    expect(ics).toContain("UID:class-3@ders-takip\r\nDTSTAMP:20261017T090500Z\r\nDTSTART:20261019T083000\r\nDTEND:20261019T091000\r\nRRULE:FREQ=WEEKLY");
    expect(ics).toContain("LOCATION:12-B");
  });

  it("gün sonu (24:00) ertesi günün 00:00'ı olarak yazılır; metin kaçırılır", () => {
    expect(ics).toContain("DTSTART:20261018T230000\r\nDTEND:20261019T000000");
    expect(ics).toContain("SUMMARY:Fizik: Soru\\, bankası");
  });

  it("sınav tarihi tüm gün süren tek bir etkinliktir", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20270619\r\nDTEND;VALUE=DATE:20270620\r\nSUMMARY:YKS");
  });
});
