import { describe, expect, it } from 'vitest';

import type { Account, WeeklyPlanLine } from '@/types/domain';

import {
  editPlanDraft,
  hydratePlanDraft,
  markPlanDraftSaved,
  planDraftHours,
} from './plan-draft';

const account = (id: string): Account => ({
  id,
  name: id,
  color: null,
  kind: null,
  sortOrder: 0,
  archived: false,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  deletedAt: null,
});

const line = (accountId: string, plannedMinutes: number): WeeklyPlanLine => ({
  id: `line-${accountId}`,
  weeklyPlanId: 'plan-1',
  accountId,
  plannedMinutes,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  deletedAt: null,
});

describe('plan draft', () => {
  it('indexes plan lines once and creates hour inputs for every active account', () => {
    expect(planDraftHours([account('a'), account('b')], [line('a', 90)])).toEqual({ a: '1.5', b: '0' });
  });

  it('does not expose a deleted plan line when a stale snapshot still contains it', () => {
    const deletedLine = {
      ...line('a', 600),
      id: 'deleted-line',
      deletedAt: '2026-09-04T00:00:00.000Z',
    };

    expect(planDraftHours([account('a')], [line('a', 90), deletedLine])).toEqual({ a: '1.5' });
  });

  it('keeps unsaved edits when a background refresh changes the source snapshot', () => {
    const initial = hydratePlanDraft(null, {
      weekStart: '2026-08-31',
      sourceKey: 'plan-1:a',
      hours: { a: '1' },
    });
    const edited = editPlanDraft(initial, 'a', '2.5');
    const refreshed = hydratePlanDraft(edited, {
      weekStart: '2026-08-31',
      sourceKey: 'plan-2:a',
      hours: { a: '3' },
    });

    expect(refreshed).toBe(edited);
    expect(refreshed.hours.a).toBe('2.5');
  });

  it('hydrates another week and accepts a refreshed source after save', () => {
    const edited = editPlanDraft(
      hydratePlanDraft(null, {
        weekStart: '2026-08-31',
        sourceKey: 'plan-1:a',
        hours: { a: '1' },
      }),
      'a',
      '2',
    );
    const switched = hydratePlanDraft(edited, {
      weekStart: '2026-09-07',
      sourceKey: 'plan-3:a',
      hours: { a: '4' },
    });
    expect(switched.hours.a).toBe('4');

    const saved = markPlanDraftSaved(editPlanDraft(switched, 'a', '5'));
    const refreshed = hydratePlanDraft(saved, {
      weekStart: '2026-09-07',
      sourceKey: 'plan-4:a',
      hours: { a: '5' },
    });
    expect(refreshed).toEqual({
      weekStart: '2026-09-07',
      sourceKey: 'plan-4:a',
      hours: { a: '5' },
      dirty: false,
    });
  });

  it('does not clear an edit made while an earlier draft was saving', () => {
    const submitted = editPlanDraft(
      hydratePlanDraft(null, {
        weekStart: '2026-08-31',
        sourceKey: 'plan-1:a',
        hours: { a: '1' },
      }),
      'a',
      '2',
    );
    const editedAgain = editPlanDraft(submitted, 'a', '3');

    expect(markPlanDraftSaved(editedAgain, submitted.hours)).toBe(editedAgain);
    expect(markPlanDraftSaved(submitted, submitted.hours).dirty).toBe(false);
  });

  it('does not mark another week clean when the previous week finishes saving', () => {
    const submitted = editPlanDraft(
      hydratePlanDraft(null, {
        weekStart: '2026-08-31',
        sourceKey: 'plan-1:a',
        hours: { a: '2' },
      }),
      'a',
      '3',
    );
    const anotherWeek = hydratePlanDraft(submitted, {
      weekStart: '2026-09-07',
      sourceKey: 'plan-2:a',
      hours: submitted.hours,
    });

    expect(markPlanDraftSaved(anotherWeek, submitted.hours, submitted.weekStart)).toBe(anotherWeek);
  });
});
