import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseClient } from '@/services/supabase';

import { SupabaseAnalysisTransport } from './supabase-transport';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/services/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ functions: { invoke: mocks.invoke } })),
}));

const request = {
  mode: 'audit' as const,
  question: '계획과 실제 차이를 알려줘.',
  rangeStart: '2026-08-01',
  rangeEnd: '2026-08-31',
  dataSnapshotJson: '{"daily":[]}',
};

describe('Supabase AI analysis transport', () => {
  beforeEach(() => mocks.invoke.mockReset());

  it('sends only the analysis request to the authenticated server function', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        contract_version: 'phase4-v1',
        provider: 'openai',
        model: 'gpt-5.6-terra',
        text: '{"answer":"자료가 없습니다.","numbers_used":[],"proposals":[]}',
        input_tokens: 123,
        output_tokens: 45,
      },
      error: null,
    });
    const transport = new SupabaseAnalysisTransport();
    await expect(transport.generate(request)).resolves.toMatchObject({ inputTokens: 123, outputTokens: 45 });
    expect(getSupabaseClient).toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledWith('ai-analysis', { body: request });
    expect(JSON.stringify(mocks.invoke.mock.calls)).not.toMatch(/api.?key|authorization|bearer/i);
  });

  it('maps server configuration and quota errors without exposing provider bodies', async () => {
    const transport = new SupabaseAnalysisTransport();
    mocks.invoke.mockResolvedValueOnce({ data: { error: 'openai_not_configured' }, error: null });
    await expect(transport.generate(request)).rejects.toThrow('아직 설정되지 않았습니다');
    mocks.invoke.mockResolvedValueOnce({ data: { error: 'openai_limit' }, error: null });
    await expect(transport.generate(request)).rejects.toThrow('사용 한도');
    mocks.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => ({ error: 'openai_not_configured' }) } },
    });
    await expect(transport.generate(request)).rejects.toThrow('아직 설정되지 않았습니다');
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('secret upstream detail') });
    await expect(transport.generate(request)).rejects.not.toThrow('secret');
  });

  it('rejects a mismatched or malformed server response', async () => {
    mocks.invoke.mockResolvedValue({ data: { contract_version: 'other', provider: 'other', model: 'other', text: '' }, error: null });
    await expect(new SupabaseAnalysisTransport().generate(request)).rejects.toThrow('응답 형식');
  });
});
