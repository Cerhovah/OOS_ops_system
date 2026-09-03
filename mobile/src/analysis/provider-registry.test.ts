import { describe, expect, it, vi } from 'vitest';

import { resolveAnalysisTransport } from './provider-registry';

vi.mock('@/services/supabase', () => ({ getSupabaseClient: vi.fn() }));

describe('Phase 4 provider registry', () => {
  it('requires provider and model', async () => {
    await expect(resolveAnalysisTransport({})).rejects.toThrow('제공자와 모델');
  });

  it('rejects unsupported providers and models', async () => {
    await expect(resolveAnalysisTransport({ ai_provider: 'provider', ai_model: 'model' })).rejects.toThrow('지원하지 않는');
    await expect(resolveAnalysisTransport({ ai_provider: 'openai', ai_model: 'other' })).rejects.toThrow('지원하지 않는');
  });

  it('activates the approved OpenAI model with its current token price', async () => {
    const resolved = await resolveAnalysisTransport({ ai_provider: 'openai', ai_model: 'gpt-5.6-terra' });
    expect(resolved.transport).toMatchObject({ provider: 'openai', model: 'gpt-5.6-terra' });
    expect(resolved.price).toEqual({ inputPerMillionUsd: 2, outputPerMillionUsd: 12 });
  });
});
