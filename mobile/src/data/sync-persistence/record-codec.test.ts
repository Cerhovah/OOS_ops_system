import { describe, expect, it } from 'vitest';

import { normalizeRemotePayload } from './record-codec';
import { getSyncTableDefinition } from '@/sync/schema';

describe('remote sync record compatibility', () => {
  it('fills only explicitly versioned nullable analysis fields from legacy payloads', () => {
    const definition = getSyncTableDefinition('analysis_sessions');
    expect(definition).not.toBeNull();
    if (!definition) throw new Error('analysis_sessions definition missing');

    const timestamp = '2026-09-04T01:00:00.000Z';
    const normalized = normalizeRemotePayload(definition, 'session-old', {
      id: 'session-old', mode: 'audit', question: null, range_start: '2026-08-01', range_end: '2026-09-01',
      data_snapshot_json: '{}', response_text: 'old response', provider: 'openai', model: 'legacy-model',
      input_tokens: 10, output_tokens: 5, estimated_cost_usd: 0.001,
      created_at: timestamp, updated_at: timestamp, deleted_at: null,
    });

    expect(normalized).toMatchObject({
      reasoning_effort: null,
      total_tokens: null,
      provider_response_id: null,
      started_at: null,
      finished_at: null,
    });
  });

  it('still rejects a legacy payload that misses a required field', () => {
    const definition = getSyncTableDefinition('analysis_sessions');
    expect(definition).not.toBeNull();
    if (!definition) throw new Error('analysis_sessions definition missing');

    expect(() => normalizeRemotePayload(definition, 'session-invalid', {
      id: 'session-invalid',
    })).toThrow('analysis_sessions 원격 행에 필요한 열이 없습니다.');
  });
});
