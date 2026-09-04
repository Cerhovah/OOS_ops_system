import { describe, expect, it } from 'vitest';

import { runAnalysis } from './service';
import type { AnalysisTransport } from './types';

describe('Phase 4 analysis service', () => {
  it('calculates provider token cost and preserves usage', async () => {
    let transportedQuestion = '';
    const transport: AnalysisTransport = {
      generate: async (request) => {
        transportedQuestion = request.question;
        return {
          text: JSON.stringify({ answer: '실제 60분입니다.', numbers_used: [], proposals: [] }),
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          estimatedCostUsd: 0.008,
          provider: 'test-provider',
          model: 'test-model',
          reasoningEffort: 'medium',
          providerResponseId: 'resp_test',
          startedAt: '2026-09-05T00:00:00.000Z',
          finishedAt: '2026-09-05T00:00:01.000Z',
        };
      },
    };
    const result = await runAnalysis({
      mode: 'audit',
      question: '차이를 보여줘. API_KEY=credential-for-regression',
      rangeStart: '2026-08-01',
      rangeEnd: '2026-08-31',
      dataSnapshotJson: '{}',
    }, transport);

    expect(result.provider).toBe('test-provider');
    expect(result.estimatedCostUsd).toBe(0.008);
    expect(result.structured).toBe(true);
    expect(transportedQuestion).toBe('차이를 보여줘. API_KEY=[REDACTED]');
  });

});
