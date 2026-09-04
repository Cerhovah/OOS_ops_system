import { describe, expect, it, vi } from 'vitest';

import { resolveAnalysisTransport } from './provider-registry';

vi.mock('@/services/supabase', () => ({ getSupabaseClient: vi.fn() }));

describe('analysis provider registry', () => {
  it('does not require a client-side provider or model setting', () => {
    expect(resolveAnalysisTransport()).toBeDefined();
  });
});
