import { describe, expect, it } from 'vitest';

import { parsePlanChangePayload, tryParsePlanChangePayload } from './plan-proposal';

describe('plan proposal payload', () => {
  it('normalizes a valid plan proposal', () => {
    expect(parsePlanChangePayload(JSON.stringify({
      weekStart: '2026-08-31',
      minutesByAccount: { accountA: 90.4 },
      note: '선택안',
    }))).toEqual({
      weekStart: '2026-08-31',
      minutesByAccount: { accountA: 90 },
      note: '선택안',
    });
  });

  it.each([
    '{',
    JSON.stringify({ weekStart: '2026-02-30', minutesByAccount: { accountA: 10 }, note: null }),
    JSON.stringify({ weekStart: '2026-08-31', minutesByAccount: {}, note: null }),
    JSON.stringify({ weekStart: '2026-08-31', minutesByAccount: { accountA: -1 }, note: null }),
    JSON.stringify({ weekStart: '2026-08-31', minutesByAccount: { accountA: 10 }, note: 1 }),
  ])('rejects malformed or unsafe payloads', (payload) => {
    expect(tryParsePlanChangePayload(payload)).toBeNull();
  });
});
