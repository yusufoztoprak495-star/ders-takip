import { describe, it, expect } from 'vitest';
import { FIRST_PART, buildSuggestions, firstPart } from '../src/lib/monthSuggest.js';

const row = (id, subjectId, title, doneAt = null) => ({ id, subjectId, title, note: '', doneAt, week: null });
const idsOf = (group) => group.items.map((r) => r.id);
const groupOf = (res, id) => res.groups.find((g) => g.id === id);

describe('Akıllı öneri (buildSuggestions)', () => {
  const subjectOrder = [10, 20];

  it('bu ayın bitmemiş konusu varsa öneri yapmaz, kaç konu kaldığını söyler', () => {
    const res = buildSuggestions({
      current: [row(1, 10, 'A', '2026-10-02'), row(2, 10, 'B')],
      previous: [row(3, 10, 'Eski')],
      next: [row(4, 10, 'Yeni')],
      subjectOrder,
    });
    expect(res).toMatchObject({ monthDone: false, openCount: 1, groups: [] });
  });

  it('bu ayın hepsi bittiyse üç öneri grubu çıkar: bitmeyenler, tekrar, sonraki ay', () => {
    const res = buildSuggestions({
      current: [row(1, 10, 'A', '2026-10-02')],
      previous: [row(2, 10, 'Eski bitmemiş'), row(3, 10, 'Eski bitmiş', '2026-09-20')],
      next: [row(4, 10, 'Yeni'), row(5, 10, 'Yeni bitmiş', '2026-10-20')],
      subjectOrder,
    });
    expect(res.monthDone).toBe(true);
    expect(res.openCount).toBe(0);
    expect(res.groups.map((g) => [g.id, g.mode])).toEqual([
      ['carry', 'move'],
      ['review', 'copy'],
      ['pull', 'move'],
    ]);
    expect(idsOf(groupOf(res, 'carry'))).toEqual([2]);
    expect(idsOf(groupOf(res, 'review'))).toEqual([3]);
    // sonraki ayın yalnızca bitmemişleri öne çekilir
    expect(idsOf(groupOf(res, 'pull'))).toEqual([4]);
  });

  it('bu ay için hiç plan yoksa da biten ay sayılır (empty işaretlenir)', () => {
    const res = buildSuggestions({ current: [], previous: [row(2, 10, 'Eski')], next: [], subjectOrder });
    expect(res).toMatchObject({ monthDone: true, empty: true });
    expect(idsOf(groupOf(res, 'carry'))).toEqual([2]);
    expect(buildSuggestions({ current: [row(1, 10, 'A', '2026-10-02')], previous: [], next: [], subjectOrder }).empty).toBe(false);
  });

  it('konular ders sırasına, sonra kimliğe göre sıralanır; bilinmeyen ders sona gider', () => {
    const res = buildSuggestions({
      current: [],
      previous: [row(5, 20, 'D'), row(1, 10, 'A'), row(6, 99, 'Z'), row(3, 20, 'C'), row(2, 10, 'B')],
      next: [],
      subjectOrder: [20, 10],
    });
    expect(idsOf(groupOf(res, 'carry'))).toEqual([3, 5, 1, 2, 6]);
  });

  it('bu ayda zaten olan konu (aynı ders, aynı ad) önerilmez; büyük/küçük harf fark etmez', () => {
    const res = buildSuggestions({
      current: [row(1, 10, 'IŞIK', '2026-10-02')],
      previous: [row(2, 10, 'Işık'), row(3, 20, 'Işık'), row(4, 10, 'Dalga')],
      next: [row(5, 10, 'ışık')],
      subjectOrder,
    });
    // 10. dersin 'Işık' konusu zaten bu ayda; 20. dersin 'Işık' konusu başka bir konudur. Sıra: önce 10. ders
    expect(idsOf(groupOf(res, 'carry'))).toEqual([4, 3]);
    expect(groupOf(res, 'pull')).toBeUndefined();
  });

  it('boş kalan grup listede yer almaz; hiç öneri yoksa groups boştur', () => {
    const res = buildSuggestions({ current: [row(1, 10, 'A', '2026-10-02')], previous: [row(2, 10, 'B', '2026-09-02')], next: [], subjectOrder });
    expect(res.groups.map((g) => g.id)).toEqual(['review']);
    expect(buildSuggestions({ current: [], previous: [], next: [], subjectOrder }).groups).toEqual([]);
  });

  it('ilk kısım: sıradaki ilk 5 konu önceden seçilir', () => {
    expect(FIRST_PART).toBe(5);
    const items = Array.from({ length: 8 }, (_, i) => row(i + 1, 10, `K${i + 1}`));
    expect(firstPart(items)).toEqual([1, 2, 3, 4, 5]);
    expect(firstPart(items, 2)).toEqual([1, 2]);
    expect(firstPart(items.slice(0, 3))).toEqual([1, 2, 3]);
    expect(firstPart([])).toEqual([]);
  });

  it('girdiyi değiştirmez', () => {
    const input = {
      current: [],
      previous: [row(2, 20, 'B'), row(1, 10, 'A')],
      next: [row(3, 10, 'C')],
      subjectOrder: [20, 10],
    };
    const copy = JSON.parse(JSON.stringify(input));
    buildSuggestions(input);
    expect(input).toEqual(copy);
  });
});
