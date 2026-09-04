import { describe, expect, it } from 'vitest';

import { estimateAnalysisCost, runAnalysis } from './service';
import type { AnalysisTransport } from './types';

describe('Phase 4 analysis service', () => {
  it('calculates provider token cost and preserves usage', async () => {
    let transportedQuestion = '';
    const transport: AnalysisTransport = {
      provider: 'test-provider',
      model: 'test-model',
      generate: async (request) => {
        transportedQuestion = request.question;
        return {
          text: JSON.stringify({ answer: '실제 60분입니다.', numbers_used: [], proposals: [] }),
          inputTokens: 1000,
          outputTokens: 500,
        };
      },
    };
    const result = await runAnalysis({
      mode: 'audit',
      question: '차이를 보여줘. API_KEY=credential-for-regression',
      rangeStart: '2026-08-01',
      rangeEnd: '2026-08-31',
      dataSnapshotJson: '{}',
    }, transport, { inputPerMillionUsd: 2, outputPerMillionUsd: 12 });

    expect(result.provider).toBe('test-provider');
    expect(result.estimatedCostUsd).toBe(0.008);
    expect(result.structured).toBe(true);
    expect(transportedQuestion).toBe('차이를 보여줘. API_KEY=[REDACTED]');
  });

  it('returns null when usage or a price is unavailable', () => {
    expect(estimateAnalysisCost(null, 20, { inputPerMillionUsd: 1, outputPerMillionUsd: 1 })).toBeNull();
    expect(estimateAnalysisCost(10, 20, null)).toBeNull();
  });
});
