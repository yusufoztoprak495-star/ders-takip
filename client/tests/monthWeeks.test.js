import { describe, it, expect } from 'vitest';
import { DEFAULT_DAILY_STUDY, distributeTopics, monthCapacities, plannedStudyMinutes, weekCapacity } from '../src/lib/monthWeeks.js';

// 08:00–18:00 (10 saat = 600 dk)
const window = { dayStart: 480, dayEnd: 1080 };
const base = { month: '2026-10', classes: [], plans: [], weekPlans: [], window };

describe('Haftanın boş çalışma süresi (weekCapacity)', () => {
  it('günlük çalışma varsayılanı 4 saattir; hafta 7 gün, son hafta ay sonuna kadar sayılır', () => {
    expect(DEFAULT_DAILY_STUDY).toBe(240);
    expect(weekCapacity({ ...base, week: 1 })).toMatchObject({ total: 7 * 240, days: 7 });
    expect(weekCapacity({ ...base, week: 3 })).toMatchObject({ total: 7 * 240, days: 7 });
    // 22–31 Ekim: 10 gün
    expect(weekCapacity({ ...base, week: 4 })).toMatchObject({ total: 10 * 240, days: 10 });
    expect(weekCapacity({ ...base, month: '2027-02', week: 4 })).toMatchObject({ total: 7 * 240, days: 7 });
  });

  it('ders saatleri boş süreyi düşürür; günlük sınırı aşan boş süre sınırlanır', () => {
    // Pazartesi 08:00–12:00 ders: boş 360 dk. Günlük çalışma 480 → pazartesi 360, diğer günler 480
    const res = weekCapacity({ ...base, week: 1, classes: [{ day: 0, start: 480, end: 720 }], dailyStudy: 480 });
    expect(res.perDay).toEqual([360, 480, 480, 480, 480, 480, 480]);
    expect(res.total).toBe(6 * 480 + 360);
  });

  it('çalışma blokları boş sayılır; mola ve diğer bloklar süreyi düşürür', () => {
    const plans = [
      { day: 1, kind: 'other', start: 480, end: 600 },
      { day: 2, kind: 'study', start: 600, end: 720 },
      { day: 3, kind: 'break', start: 480, end: 540 },
    ];
    const res = weekCapacity({ ...base, week: 1, plans, dailyStudy: 600 });
    expect(res.perDay).toEqual([600, 480, 600, 540, 600, 600, 600]);
  });

  it('45 dakikadan kısa boşluklar çalışmaya yaramaz sayılır', () => {
    const classes = [
      { day: 3, start: 480, end: 540 },
      { day: 3, start: 570, end: 1080 },
    ];
    expect(weekCapacity({ ...base, week: 1, classes }).perDay[3]).toBe(0);
    // 45 dakikalık boşluk yeter
    const ok = [
      { day: 3, start: 480, end: 540 },
      { day: 3, start: 585, end: 1080 },
    ];
    expect(weekCapacity({ ...base, week: 1, classes: ok }).perDay[3]).toBe(45);
  });

  it('ortak blok ile haftaya özel blok üst üste binerse süre bir kez düşer', () => {
    const plans = [{ day: 0, kind: 'other', start: 480, end: 600 }];
    const weekPlans = [{ day: 0, kind: 'other', start: 540, end: 660 }];
    // dolu: 08:00–11:00 → boş 420, günlük sınır 600
    expect(weekCapacity({ ...base, week: 1, plans, weekPlans, dailyStudy: 600 }).perDay[0]).toBe(420);
  });

  it('haftaya özel blok yalnızca o haftanın süresini etkiler (monthCapacities)', () => {
    const weekPlans = [{ week: 2, day: 0, kind: 'other', start: 480, end: 1080 }];
    const caps = monthCapacities({ ...base, weekPlans });
    expect(caps.map((c) => c.week)).toEqual([1, 2, 3, 4]);
    expect(caps.map((c) => c.total)).toEqual([1680, 1440, 1680, 2400]);
  });

  it('son haftada bir gün adı iki kez geçerse haftaya özel blok ikisine de uygulanır', () => {
    // 22 ve 29 Ekim perşembe: tüm gün dolu
    const weekPlans = [{ week: 4, day: 3, kind: 'other', start: 480, end: 1080 }];
    expect(monthCapacities({ ...base, weekPlans })[3].total).toBe(2400 - 2 * 240);
  });

  it('fromDate: geçmiş günler sayılmaz', () => {
    const caps = monthCapacities({ ...base, fromDate: '2026-10-27' });
    expect(caps.map((c) => c.total)).toEqual([0, 0, 0, 5 * 240]);
    expect(caps.map((c) => c.days)).toEqual([0, 0, 0, 5]);
    // ayın başından önceki bir tarih hiçbir şeyi değiştirmez; ay bittiyse hepsi sıfırdır
    expect(monthCapacities({ ...base, fromDate: '2026-09-15' }).map((c) => c.total)).toEqual([1680, 1680, 1680, 2400]);
    expect(monthCapacities({ ...base, fromDate: '2026-11-02' }).map((c) => c.total)).toEqual([0, 0, 0, 0]);
  });
});

const topic = (id, subjectId) => ({ id, subjectId });
const weekOfId = (res) => Object.fromEntries(res.assignments.map((a) => [a.id, a.week]));

describe('Konuları haftalara dağıtma (distributeTopics)', () => {
  it('eşit boş süre: bir dersin konuları sırayla ve eşit paylaşılır', () => {
    const topics = [1, 2, 3, 4, 5, 6, 7, 8].map((id) => topic(id, 10));
    const res = distributeTopics({ topics, capacities: [100, 100, 100, 100] });
    expect(weekOfId(res)).toEqual({ 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4 });
    expect(res.counts).toEqual([2, 2, 2, 2]);
    expect(res.noCapacity).toBe(false);
  });

  it('boş süreyle orantılı dağıtır; boş süresi olmayan haftaya konu vermez', () => {
    const topics = Array.from({ length: 10 }, (_, i) => topic(i + 1, 10));
    const res = distributeTopics({ topics, capacities: [300, 100, 0, 100] });
    expect(res.counts).toEqual([6, 2, 0, 2]);
    const weeks = weekOfId(res);
    expect([1, 2, 3, 4, 5, 6].map((id) => weeks[id])).toEqual([1, 1, 1, 1, 1, 1]);
    expect([7, 8].map((id) => weeks[id])).toEqual([2, 2]);
    expect([9, 10].map((id) => weeks[id])).toEqual([4, 4]);
  });

  it('dersler arasında dengeler: yuvarlama artıkları ders ders taşınır', () => {
    // İki ders, ikişer konu, eşit hafta: bir ders 1–2. haftaya, diğeri 3–4. haftaya düşer; her hafta 1 konu
    const topics = [topic(1, 10), topic(2, 10), topic(3, 20), topic(4, 20)];
    const res = distributeTopics({ topics, capacities: [100, 100, 100, 100] });
    expect(res.counts).toEqual([1, 1, 1, 1]);
    const weeks = weekOfId(res);
    expect([weeks[1], weeks[2]]).toEqual([1, 2]);
    expect([weeks[3], weeks[4]]).toEqual([3, 4]);
  });

  it('bir dersin konuları hiçbir zaman geriye gitmez (sıra korunur)', () => {
    const topics = [];
    let id = 1;
    for (const [subject, n] of [[10, 7], [20, 5], [30, 11], [40, 3]]) {
      for (let i = 0; i < n; i++) topics.push(topic(id++, subject));
    }
    const res = distributeTopics({ topics, capacities: [420, 300, 120, 640] });
    const weeks = weekOfId(res);
    for (const subject of [10, 20, 30, 40]) {
      const list = topics.filter((t) => t.subjectId === subject).map((t) => weeks[t.id]);
      expect(list, `ders ${subject}`).toEqual([...list].sort((a, b) => a - b));
    }
  });

  it('her konu tam bir hafta alır; toplamlar boş süre oranına en çok bir konu sapar', () => {
    let seed = 12345;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let round = 0; round < 200; round++) {
      const capacities = Array.from({ length: 4 }, () => (rand() < 0.2 ? 0 : Math.round(rand() * 1000) + 30));
      if (capacities.every((c) => c === 0)) continue;
      const subjects = 1 + Math.floor(rand() * 6);
      const topics = [];
      let id = 1;
      for (let s = 0; s < subjects; s++) {
        const n = 1 + Math.floor(rand() * 14);
        for (let i = 0; i < n; i++) topics.push(topic(id++, 100 + s));
      }
      const res = distributeTopics({ topics, capacities });
      expect(res.assignments).toHaveLength(topics.length);
      expect(res.counts.reduce((a, b) => a + b, 0)).toBe(topics.length);
      const sum = capacities.reduce((a, b) => a + b, 0);
      capacities.forEach((c, w) => {
        const ideal = (topics.length * c) / sum;
        expect(Math.abs(res.counts[w] - ideal), `tur ${round}, hafta ${w + 1}`).toBeLessThanOrEqual(1);
        if (c === 0) expect(res.counts[w]).toBe(0);
      });
    }
  });

  it('hiç boş süre yoksa eşit böler ve bunu bildirir', () => {
    const topics = [1, 2, 3, 4].map((id) => topic(id, 10));
    const res = distributeTopics({ topics, capacities: [0, 0, 0, 0] });
    expect(res.noCapacity).toBe(true);
    expect(res.counts).toEqual([1, 1, 1, 1]);
  });

  it('konu yoksa boş sonuç verir; girdiyi değiştirmez', () => {
    expect(distributeTopics({ topics: [], capacities: [1, 1, 1, 1] })).toEqual({ assignments: [], counts: [0, 0, 0, 0], noCapacity: false });
    const topics = [topic(1, 10), topic(2, 10)];
    const copy = JSON.parse(JSON.stringify(topics));
    distributeTopics({ topics, capacities: [5, 5, 5, 5] });
    expect(topics).toEqual(copy);
  });
});

describe('Haftada planlanan çalışma (plannedStudyMinutes)', () => {
  const plans = [
    { day: 0, kind: 'study', start: 600, end: 660 },
    { day: 0, kind: 'break', start: 660, end: 675 },
    { day: 1, kind: 'other', start: 600, end: 720 },
  ];

  it('yalnızca çalışma bloklarını sayar', () => {
    expect(plannedStudyMinutes({ month: '2026-10', week: 1, plans, weekPlans: [] })).toBe(60);
  });

  it('haftaya özel çalışma bloğu eklenir', () => {
    const weekPlans = [{ day: 2, kind: 'study', start: 480, end: 540 }];
    expect(plannedStudyMinutes({ month: '2026-10', week: 2, plans, weekPlans })).toBe(60 + 60);
  });

  it('son haftada tekrar eden gün adı iki kez sayılır (22–31 Ekim: pazartesi bir, perşembe iki kez)', () => {
    const weekPlans = [{ day: 3, kind: 'study', start: 480, end: 510 }];
    // pazartesi 26 Ekim bir kez (60) + perşembe 22 ve 29 Ekim (2 × 30)
    expect(plannedStudyMinutes({ month: '2026-10', week: 4, plans, weekPlans })).toBe(60 + 60);
  });
});
