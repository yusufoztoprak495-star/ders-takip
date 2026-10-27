import { describe, it, expect } from "vitest";
import {
  METHODS,
  blockTitle,
  buildWeekPlan,
  defaultDays,
  placeDay,
  scheduleDays,
} from "../src/lib/weekSuggest.js";

const topic = (title, konu, soru) => ({ title, konu, soru });
// Gün → [ "Konu: X", "Soru: Y" ] kısa gösterim (karşılaştırma kolay olsun)
const short = (byDay) =>
  Object.fromEntries(Object.entries(byDay).map(([d, list]) => [d, list.map((s) => `${s.type === "konu" ? "K" : "S"}:${s.title}`)]));

describe("defaultDays: yönteme göre konu başına gün", () => {
  it("çift dikiş: 1 gün konu, 1 gün soru", () => {
    expect(defaultDays("ciftDikis", 3, 6)).toEqual({ konu: 1, soru: 1 });
  });
  it("konu haftası: günler konulara paylaşılır, soru yok; en az 1 gün", () => {
    expect(defaultDays("konuHaftasi", 2, 6)).toEqual({ konu: 3, soru: 0 });
    expect(defaultDays("konuHaftasi", 4, 6)).toEqual({ konu: 1, soru: 0 });
    expect(defaultDays("konuHaftasi", 9, 6)).toEqual({ konu: 1, soru: 0 });
  });
  it("soru haftası: konu yok, günler soruya", () => {
    expect(defaultDays("soruHaftasi", 2, 6)).toEqual({ konu: 0, soru: 3 });
  });
  it("bilinen üç yöntem var", () => {
    expect(Object.keys(METHODS)).toEqual(["ciftDikis", "konuHaftasi", "soruHaftasi"]);
  });
});

describe("scheduleDays: oturumları günlere sıralar", () => {
  const days = [0, 1, 2, 3, 4, 5];

  it("çift dikiş, günde 1 oturum: konu bir gün, sorusu ertesi gün, sonra sıradaki konu", () => {
    const { byDay, leftover } = scheduleDays({
      days,
      subjects: [{ subjectId: 3, perDay: 1, topics: [topic("A", 1, 1), topic("B", 1, 1), topic("C", 1, 1)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["K:A"], 1: ["S:A"], 2: ["K:B"], 3: ["S:B"], 4: ["K:C"], 5: ["S:C"] });
    expect(leftover).toEqual([]);
  });

  it("günde 2 oturum: dünün sorusu ve yeni konu aynı gün (önce soru), soru hiçbir zaman konusuyla aynı gün değil", () => {
    const { byDay } = scheduleDays({
      days: [0, 1, 2],
      subjects: [{ subjectId: 3, perDay: 2, topics: [topic("A", 1, 1), topic("B", 1, 1), topic("C", 1, 1)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["K:A", "K:B"], 1: ["S:A", "S:B"], 2: ["K:C"] });
  });

  it("birden çok gün konu ve soru: konu günleri bitmeden soru başlamaz", () => {
    const { byDay } = scheduleDays({
      days,
      subjects: [{ subjectId: 5, perDay: 1, topics: [topic("Polinomlar", 2, 2)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["K:Polinomlar"], 1: ["K:Polinomlar"], 2: ["S:Polinomlar"], 3: ["S:Polinomlar"] });
  });

  it("soru haftası: konu günü olmadan soru ilk günden başlar, sırayla", () => {
    const { byDay } = scheduleDays({
      days: [0, 1, 2, 3],
      subjects: [{ subjectId: 5, perDay: 1, topics: [topic("A", 0, 2), topic("B", 0, 2)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["S:A"], 1: ["S:A"], 2: ["S:B"], 3: ["S:B"] });
  });

  it("dersler birbirinden bağımsız ilerler, aynı günde ders sırasıyla gelir", () => {
    const { byDay } = scheduleDays({
      days: [0, 1],
      subjects: [
        { subjectId: 3, perDay: 1, topics: [topic("A", 1, 1)] },
        { subjectId: 9, perDay: 1, topics: [topic("X", 1, 1)] },
      ],
    });
    expect(short(byDay)).toEqual({ 0: ["K:A", "K:X"], 1: ["S:A", "S:X"] });
    expect(byDay[0].map((s) => s.subjectId)).toEqual([3, 9]);
  });

  it("haftaya sığmayan oturumlar artakalan olarak döner (sırasıyla)", () => {
    const { byDay, leftover } = scheduleDays({
      days: [0, 1, 2],
      subjects: [{ subjectId: 3, perDay: 1, topics: [topic("A", 1, 1), topic("B", 1, 1)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["K:A"], 1: ["S:A"], 2: ["K:B"] });
    expect(leftover.map((s) => `${s.type}:${s.title}`)).toEqual(["soru:B"]);
  });

  it("günler verilen sırada kullanılır (atlanan gün boş kalır)", () => {
    const { byDay } = scheduleDays({
      days: [0, 2, 4],
      subjects: [{ subjectId: 3, perDay: 1, topics: [topic("A", 1, 1)] }],
    });
    expect(short(byDay)).toEqual({ 0: ["K:A"], 2: ["S:A"] });
  });

  it("0 gün konu ve 0 gün soru olan konu atlanır", () => {
    const { byDay, leftover } = scheduleDays({
      days: [0],
      subjects: [{ subjectId: 3, perDay: 1, topics: [topic("Boş", 0, 0)] }],
    });
    expect(byDay).toEqual({});
    expect(leftover).toEqual([]);
  });
});

describe("placeDay: oturumları günün boş saatlerine yerleştirir", () => {
  const window = { dayStart: 480, dayEnd: 1380 }; // 08:00–23:00
  const s = (title, minutes) => ({ subjectId: 3, type: "konu", title, minutes });

  it("dolu saatleri atlar, oturumlar arasında mola bırakır, başlangıçlar 5 dakikaya yuvarlanır", () => {
    const busy = [{ start: 530, end: 975 }]; // 08:50–16:15 okul
    const { placed, unplaced } = placeDay({ sessions: [s("A", 60), s("B", 90)], busy, window, gap: 15 });
    // 08:00–08:50 aralığı (mola payıyla 08:35'e kadar) 60 dk'ya yetmez → okuldan 15 dk sonra 16:30
    expect(placed.map((p) => [p.title, p.start, p.end])).toEqual([
      ["A", 990, 1050],
      ["B", 1065, 1155],
    ]);
    expect(unplaced).toEqual([]);
  });

  it("dolu bloğa mola payı bırakır ve başlangıcı 5 dakikaya yuvarlar", () => {
    const busy = [{ start: 480, end: 541 }]; // 09:01'de biten iş
    const { placed } = placeDay({ sessions: [s("A", 60)], busy, window, gap: 15 });
    expect(placed[0].start).toBe(560); // 09:01 + 15 = 09:16 → 09:20
  });

  it("sığmayan oturum yerleşmez ve geri döner", () => {
    const busy = [{ start: 480, end: 1320 }]; // 22:00'a kadar dolu
    const { placed, unplaced } = placeDay({ sessions: [s("A", 60), s("B", 60)], busy, window, gap: 15 });
    expect(placed).toEqual([]);
    expect(unplaced.map((u) => u.title)).toEqual(["A", "B"]);
  });

  it("gün başında mola payı gerekmez", () => {
    const { placed } = placeDay({ sessions: [s("A", 60)], busy: [], window, gap: 15 });
    expect([placed[0].start, placed[0].end]).toEqual([480, 540]);
  });
});

describe("blockTitle", () => {
  it("türü başa yazar, 60 karakteri aşarsa kısaltır", () => {
    expect(blockTitle("konu", "Türev - 1")).toBe("Konu: Türev - 1");
    expect(blockTitle("soru", "Türev - 1")).toBe("Soru: Türev - 1");
    const long = blockTitle("konu", "İndirgenme - Yükseltgenme Tepkimelerinde Elektrik Akımı");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("buildWeekPlan: hepsi birlikte", () => {
  it("bir güne sığmayan oturum ertesi güne kayar; sorusu da onunla kayar", () => {
    const window = { dayStart: 480, dayEnd: 1380 };
    const busyByDay = { 0: [{ start: 480, end: 1290 }] }; // pazartesi 21:30'a kadar dolu
    const result = buildWeekPlan({
      days: [0, 1],
      window,
      busyByDay,
      gap: 15,
      subjects: [{ subjectId: 3, perDay: 1, minutes: 90, topics: [topic("A", 1, 1), topic("B", 1, 1)] }],
    });
    // Pazartesi 21:30 + mola sonrası 90 dk sığmaz → konu A salıya kayar, sorusu haftaya sığmaz
    expect(result.blocks.map((b) => [b.day, b.title, b.start, b.end, b.kind, b.subjectId])).toEqual([
      [1, "Konu: A", 480, 570, "study", 3],
    ]);
    expect(result.leftover.map((u) => `${u.type}:${u.title}`)).toEqual(["soru:A", "konu:B", "soru:B"]);
  });

  it("aynı gündeki farklı derslerin oturumları üst üste binmez", () => {
    const result = buildWeekPlan({
      days: [0],
      window: { dayStart: 480, dayEnd: 1380 },
      busyByDay: {},
      gap: 15,
      subjects: [
        { subjectId: 3, perDay: 2, minutes: 60, topics: [topic("A", 1, 0), topic("B", 1, 0)] },
        { subjectId: 9, perDay: 1, minutes: 45, topics: [topic("X", 1, 0)] },
      ],
    });
    expect(result.blocks.map((b) => [b.title, b.start, b.end])).toEqual([
      ["Konu: A", 480, 540],
      ["Konu: B", 555, 615],
      ["Konu: X", 630, 675],
    ]);
    expect(result.leftover).toEqual([]);
  });
});
