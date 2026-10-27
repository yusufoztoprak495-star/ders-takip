import { describe, it, expect } from 'vitest';
import {
  WEEKS,
  daysInMonth,
  isMonth,
  monthLabel,
  monthOf,
  progressOf,
  shiftMonth,
  weekDays,
  weekLabel,
  weekOfDate,
  weekOfDay,
} from '../src/lib/months.js';

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

describe('Ayın dört haftası', () => {
  it('ay 4 haftaya bölünür', () => {
    expect(WEEKS).toBe(4);
  });

  it('daysInMonth artık yılı ve ay uzunluklarını bilir', () => {
    expect(daysInMonth('2026-10')).toBe(31);
    expect(daysInMonth('2026-11')).toBe(30);
    expect(daysInMonth('2027-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
  });

  it('weekOfDay: 1–7 birinci, 22 ve sonrası (31 dahil) dördüncü hafta', () => {
    expect([1, 7, 8, 14, 15, 21, 22, 28, 29, 31].map(weekOfDay)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 4, 4]);
  });

  it('weekOfDate günün ayını ve haftasını verir', () => {
    expect(weekOfDate('2026-10-14')).toEqual({ month: '2026-10', week: 2 });
    expect(weekOfDate('2026-10-31')).toEqual({ month: '2026-10', week: 4 });
    expect(weekOfDate('2027-02-01')).toEqual({ month: '2027-02', week: 1 });
  });

  it('weekDays haftanın gün aralığını verir; son hafta ayın sonuna kadar uzar', () => {
    expect(weekDays('2026-10', 1)).toEqual({ from: 1, to: 7 });
    expect(weekDays('2026-10', 3)).toEqual({ from: 15, to: 21 });
    expect(weekDays('2026-10', 4)).toEqual({ from: 22, to: 31 });
    expect(weekDays('2026-11', 4)).toEqual({ from: 22, to: 30 });
    expect(weekDays('2027-02', 4)).toEqual({ from: 22, to: 28 });
    expect(weekDays('2028-02', 4)).toEqual({ from: 22, to: 29 });
  });

  it('weekLabel gün aralığını ay adıyla yazar', () => {
    expect(weekLabel('2026-10', 1)).toBe('1–7 Ekim');
    expect(weekLabel('2026-10', 4)).toBe('22–31 Ekim');
    expect(weekLabel('2027-02', 4)).toBe('22–28 Şubat');
  });
});
