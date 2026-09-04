import { describe, expect, it } from 'vitest';

import {
  isJsonContentType,
  MAX_ANALYSIS_REQUEST_BYTES,
  MAX_ANALYSIS_SNAPSHOT_BYTES,
  parseAnalysisRequestBytes,
} from './analysis-request';

const encoder = new TextEncoder();

function requestBytes(overrides: Readonly<Record<string, unknown>> = {}): Uint8Array {
  return encoder.encode(JSON.stringify({
    mode: 'audit',
    question: '계획과 실제 차이를 분석해.',
    rangeStart: '2026-08-01',
    rangeEnd: '2026-09-04',
    dataSnapshotJson: JSON.stringify({ schemaVersion: 1 }),
    ...overrides,
  }));
}

describe('Edge analysis request validation', () => {
  it('accepts JSON media types and a valid request', () => {
    expect(isJsonContentType('application/json')).toBe(true);
    expect(isJsonContentType('Application/JSON; charset=utf-8')).toBe(true);
    expect(isJsonContentType('text/plain')).toBe(false);
    expect(isJsonContentType(null)).toBe(false);

    const result = parseAnalysisRequestBytes(requestBytes());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.question).toBe('계획과 실제 차이를 분석해.');
  });

  it('rejects the raw byte body before attempting JSON validation', () => {
    const oversized = new Uint8Array(MAX_ANALYSIS_REQUEST_BYTES + 1);
    oversized.fill(0x7b);
    expect(parseAnalysisRequestBytes(oversized)).toEqual({ ok: false, error: 'request_too_large' });
  });

  it('uses UTF-8 bytes for the independent snapshot limit', () => {
    const snapshot = JSON.stringify({ text: '가'.repeat(Math.ceil(MAX_ANALYSIS_SNAPSHOT_BYTES / 3) + 1) });
    expect(encoder.encode(snapshot).byteLength).toBeGreaterThan(MAX_ANALYSIS_SNAPSHOT_BYTES);
    expect(parseAnalysisRequestBytes(requestBytes({ dataSnapshotJson: snapshot }))).toEqual({
      ok: false,
      error: 'snapshot_too_large',
    });
  });

  it('rejects malformed snapshots, impossible dates, and reversed ranges', () => {
    expect(parseAnalysisRequestBytes(requestBytes({ dataSnapshotJson: '[]' }))).toEqual({ ok: false, error: 'invalid_request' });
    expect(parseAnalysisRequestBytes(requestBytes({ rangeStart: '2026-02-30' }))).toEqual({ ok: false, error: 'invalid_request' });
    expect(parseAnalysisRequestBytes(requestBytes({ rangeStart: '2026-09-05' }))).toEqual({ ok: false, error: 'invalid_request' });
  });
});
