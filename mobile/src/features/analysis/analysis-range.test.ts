import { describe, expect, it } from 'vitest';

import { completedAnalysisRange } from '@/features/analysis/analysis-range';

describe('completedAnalysisRange', () => {
  it('returns exactly four completed Monday-based calendar weeks', () => {
    expect(completedAnalysisRange('2026-09-04', 0, 4)).toEqual({
      start: '2026-08-03',
      end: '2026-08-30',
    });
  });

  it('honors a Sunday week boundary and normalizes invalid week counts', () => {
    expect(completedAnalysisRange('2026-09-06', 6, 8)).toEqual({
      start: '2026-07-12',
      end: '2026-09-05',
    });
    expect(completedAnalysisRange('2026-09-04', 0, Number.NaN)).toEqual({
      start: '2026-08-03',
      end: '2026-08-30',
    });
  });
});
