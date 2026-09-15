import { describe, expect, it } from 'vitest';

import holidayData from '@/data/holidays.ko-KR.json';

import { holidayName, holidaysForMonth } from './holidays';

describe('offline holiday release asset', () => {
  it('contains only supported ISO dates in stable order', () => {
    const dates = holidayData.holidays.map((holiday) => holiday.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
    expect(holidayData.holidays.every((holiday) => holidayData.supportedYears.includes(Number(holiday.date.slice(0, 4))))).toBe(true);
  });

  it('reads names without inferring dates outside the asset', () => {
    expect(holidayName('2026-09-25')).toBe('추석');
    expect(holidaysForMonth('2026-09')).toHaveLength(3);
    expect(holidayName('2027-01-01')).toBeNull();
  });
});
