import { describe, it, expect } from 'vitest';
import { isMonth, monthLabel, monthOf, progressOf, shiftMonth } from '../src/lib/months.js';

describe('Ay yardımcıları', () => {
  it('isMonth yalnızca YYYY-AA biçimini ve gerçek ayları kabul eder', () => {
    expect(isMonth('2026-10')).toBe(true);
    expect(isMonth('2026-01')).toBe(true);
    expect(isMonth('2026-12')).toBe(true);
    for (const bad of ['2026-13', '2026-00', '2026-1', '26-10', '2026-10-05', '', null, undefined, 202610]) {
      expect(isMonth(bad), String(bad)).toBe(false);
    }
  });

  it('monthOf bir günün ayını verir', () => {
    expect(monthOf('2026-10-27')).toBe('2026-10');
    expect(monthOf('2027-01-01')).toBe('2027-01');
  });

  it('shiftMonth yıl sınırlarını geçer', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-10', 0)).toBe('2026-10');
    expect(shiftMonth('2026-10', 15)).toBe('2028-01');
    expect(shiftMonth('2026-10', -10)).toBe('2025-12');
  });

  it('monthLabel Türkçe ay adı ve yıl verir', () => {
    expect(monthLabel('2026-10')).toBe('Ekim 2026');
    expect(monthLabel('2027-01')).toBe('Ocak 2027');
    expect(monthLabel('2026-08')).toBe('Ağustos 2026');
  });

  it('progressOf biten konuları sayar ve yüzdeyi yuvarlar', () => {
    expect(progressOf([])).toEqual({ total: 0, done: 0, percent: 0 });
    const items = [{ doneAt: '2026-10-02' }, { doneAt: null }, { doneAt: null }];
    expect(progressOf(items)).toEqual({ total: 3, done: 1, percent: 33 });
    expect(progressOf([{ doneAt: '2026-10-02' }, { doneAt: '2026-10-03' }])).toEqual({ total: 2, done: 2, percent: 100 });
  });
});
