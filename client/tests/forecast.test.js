import { describe, it, expect } from "vitest";
import { linearFit, netProjection, peakWindow, topicForecast } from "../src/lib/forecast.js";

describe("linearFit", () => {
  it("doğru üzerindeki noktalardan eğim ve kesişimi bulur", () => {
    const fit = linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }]);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.intercept).toBeCloseTo(1);
  });

  it("iki noktadan azsa ya da hepsi aynı x'teyse null döner", () => {
    expect(linearFit([{ x: 0, y: 1 }])).toBeNull();
    expect(linearFit([{ x: 3, y: 1 }, { x: 3, y: 5 }])).toBeNull();
  });
});

describe("netProjection", () => {
  const series = [
    { date: "2026-09-01", net: 60 },
    { date: "2026-09-11", net: 62 },
    { date: "2026-09-21", net: 64 },
  ];

  it("netin gidişini sınav gününe uzatır, aylık artışı verir", () => {
    const p = netProjection(series, "2026-10-01", 120);
    expect(p.projected).toBeCloseTo(66, 0); // tavandan uzakken neredeyse düz çizgi
    expect(p.perMonth).toBeCloseTo(6);
    expect(p.count).toBe(3);
    expect(p.days).toBe(10);
  });

  it("uzak tarihte en fazla 90 gün ileri bakar, artış yavaşlar; düşüş 0'ın altına inmez", () => {
    const far = netProjection(series, "2027-12-01", 120);
    expect(far.days).toBe(90);
    expect(far).toEqual(netProjection(series, "2026-12-20", 120)); // son denemeden 90 gün sonrası
    expect(far.projected).toBeLessThan(64 + 0.2 * 90); // düz çizgiden az
    expect(far.projected).toBeGreaterThan(75);
    const falling = series.map((d, i) => ({ ...d, net: 10 - i * 8 }));
    expect(netProjection(falling, "2026-12-01", 120).projected).toBe(0);
  });

  it("üçten az deneme varsa ya da hedef tarih geçmişse null döner", () => {
    expect(netProjection(series.slice(0, 2), "2026-10-01", 120)).toBeNull();
    expect(netProjection(series, "2026-09-21", 120)).toBeNull();
    expect(netProjection(series, null, 120)).toBeNull();
  });

  it("yalnızca son 8 denemeye bakar (eski dönem gidişi bozmasın)", () => {
    const old = Array.from({ length: 6 }, (_, i) => ({ date: `2026-01-0${i + 1}`, net: 100 }));
    const recent = Array.from({ length: 8 }, (_, i) => ({ date: `2026-08-${String(i * 3 + 1).padStart(2, "0")}`, net: 50 + i }));
    const p = netProjection([...old, ...recent], "2026-09-01", 120);
    expect(p.count).toBe(8);
    expect(p.perMonth).toBeCloseTo(10);
  });
});

describe("topicForecast", () => {
  const topic = (doneAt) => ({ id: Math.random(), doneAt });
  const today = "2026-10-20";

  it("son 4 haftadaki hızla kalan konuların biteceği günü tahmin eder", () => {
    // 28 günde 7 konu bitti: günde 0,25 → kalan 10 konu 40 gün sürer
    const topics = [
      ...Array.from({ length: 7 }, (_, i) => topic(`2026-10-${String(i + 1).padStart(2, "0")}`)),
      topic("2026-05-01"),
      ...Array.from({ length: 10 }, () => topic(null)),
    ];
    const f = topicForecast(topics, today, "2027-06-19");
    expect(f).toMatchObject({ total: 18, done: 8, remaining: 10, recent: 7, finishDate: "2026-11-29", onTrack: true });
    expect(f.perWeek).toBe(1.8); // 1,75 → bir ondalığa yuvarlanır
  });

  it("sınava yetişmek için haftada kaç konu gerektiğini söyler", () => {
    const topics = [topic("2026-10-10"), ...Array.from({ length: 20 }, () => topic(null))];
    const f = topicForecast(topics, today, "2026-11-30"); // 41 gün ≈ 5,9 hafta
    expect(f.neededPerWeek).toBe(4);
    expect(f.onTrack).toBe(false);
  });

  it("son dönemde hiç konu bitmediyse bitiş tarihi yoktur", () => {
    const f = topicForecast([topic("2026-01-01"), topic(null)], today, null);
    expect(f.finishDate).toBeNull();
    expect(f.onTrack).toBeNull();
    expect(f.neededPerWeek).toBeNull();
  });

  it("hepsi bittiyse kalan sıfırdır ve yolundadır", () => {
    const f = topicForecast([topic("2026-10-01")], today, "2027-06-19");
    expect(f).toMatchObject({ remaining: 0, finishDate: null, onTrack: true, neededPerWeek: 0 });
  });
});

describe("peakWindow", () => {
  const hours = (pairs) => Array.from({ length: 24 }, (_, hour) => ({ hour, seconds: pairs[hour] ?? 0 }));

  it("en çok çalışılan ardışık iki saati ve toplamdaki payını bulur", () => {
    const w = peakWindow(hours({ 9: 600, 20: 3000, 21: 3000, 22: 1000, 10: 2400 }));
    expect(w).toEqual({ start: 20, end: 22, seconds: 6000, share: 60 });
  });

  it("hiç çalışma yoksa null döner", () => {
    expect(peakWindow(hours({}))).toBeNull();
  });
});
