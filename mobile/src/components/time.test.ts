import { describe, expect, it } from 'vitest';

import { adjustTime, setTimeHour, setTimeMinute, timeParts } from './time';

describe('time selection helpers', () => {
  it('selects hours and minutes without text entry', () => {
    expect(setTimeHour('21:30', 13)).toBe('13:30');
    expect(setTimeMinute('13:30', 0)).toBe('13:00');
    expect(timeParts('13:00')).toEqual({ hour: 13, minute: 0 });
  });

  it('supports one-minute adjustment across midnight', () => {
    expect(adjustTime('23:59', 1)).toBe('00:00');
    expect(adjustTime('00:00', -1)).toBe('23:59');
  });

  it('falls back safely when a legacy setting is malformed', () => {
    expect(timeParts('invalid')).toEqual({ hour: 0, minute: 0 });
    expect(adjustTime('invalid', 5)).toBe('00:05');
  });
});
