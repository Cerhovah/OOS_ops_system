import { describe, expect, it } from 'vitest';

import { estimateCostUsd, resolveLightweightModelPolicy, resolveModelPolicy } from '../../../supabase/functions/_shared/model-policy';

const environment = (name: string): string | undefined => ({
  AI_MODEL_LIGHT: 'gpt-5.6-luna',
  AI_MODEL_STANDARD: 'gpt-5.6-terra',
  AI_MODEL_DEEP: 'gpt-5.6-sol',
  AI_PRICE_LIGHT_INPUT_PER_MILLION: '0.2',
  AI_PRICE_LIGHT_OUTPUT_PER_MILLION: '1.2',
  AI_PRICE_STANDARD_INPUT_PER_MILLION: '2',
  AI_PRICE_STANDARD_OUTPUT_PER_MILLION: '12',
  AI_PRICE_DEEP_INPUT_PER_MILLION: '4',
  AI_PRICE_DEEP_OUTPUT_PER_MILLION: '20',
}[name]);

describe('server model policy', () => {
  it('routes final analysis tiers on the server with the configured effort', () => {
    expect(resolveModelPolicy('standard', environment)).toMatchObject({ model: 'gpt-5.6-terra', reasoningEffort: 'medium' });
    expect(resolveModelPolicy('deep', environment)).toMatchObject({ model: 'gpt-5.6-sol', reasoningEffort: 'high' });
    expect(resolveLightweightModelPolicy(environment)).toMatchObject({ model: 'gpt-5.6-luna', reasoningEffort: 'low' });
  });

  it('calculates estimated cost only when provider usage is available', () => {
    const policy = resolveModelPolicy('standard', environment);
    expect(estimateCostUsd(1_000, 500, policy)).toBe(0.008);
    expect(estimateCostUsd(null, 500, policy)).toBeNull();
  });
});
