import { describe, expect, it } from 'vitest';

import { decideMerge, payloadsEqual } from './merge';

describe('Phase 2 merge policy', () => {
  it('compares JSON payloads without depending on object key order', () => {
    expect(payloadsEqual({ id: '1', nested: { b: 2, a: 1 } }, { nested: { a: 1, b: 2 }, id: '1' })).toBe(true);
  });

  it('applies a remote row when the local row has no pending mutation', () => {
    expect(decideMerge({
      localPayload: { id: '1', value: 1 },
      localUpdatedAt: '2026-09-02T00:00:00.000Z',
      remotePayload: { id: '1', value: 2 },
      remoteUpdatedAt: '2026-09-01T00:00:00.000Z',
      hasPendingLocal: false,
    })).toEqual({ winner: 'remote', conflict: false });
  });

  it('keeps the newer pending local row and records a conflict', () => {
    expect(decideMerge({
      localPayload: { id: '1', value: 2 },
      localUpdatedAt: '2026-09-02T00:00:00.000Z',
      remotePayload: { id: '1', value: 1 },
      remoteUpdatedAt: '2026-09-01T00:00:00.000Z',
      hasPendingLocal: true,
    })).toEqual({ winner: 'local', conflict: true });
  });

  it('applies the newer remote row and records a conflict', () => {
    expect(decideMerge({
      localPayload: { id: '1', value: 1 },
      localUpdatedAt: '2026-09-01T00:00:00.000Z',
      remotePayload: { id: '1', value: 2 },
      remoteUpdatedAt: '2026-09-02T00:00:00.000Z',
      hasPendingLocal: true,
    })).toEqual({ winner: 'remote', conflict: true });
  });
});

