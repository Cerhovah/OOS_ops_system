import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_CONTRACT_VERSION as SERVER_CONTRACT_VERSION,
  ANALYSIS_OUTPUT_JSON_SCHEMA as SERVER_SCHEMA,
  ANALYSIS_PROVIDER as SERVER_PROVIDER,
  ANALYSIS_SYSTEM_PROMPT as SERVER_PROMPT,
} from '../../../supabase/functions/_shared/analysis-contract';

import { ANALYSIS_OUTPUT_JSON_SCHEMA, ANALYSIS_SYSTEM_PROMPT } from './prompt';
import { ANALYSIS_CONTRACT_VERSION, ANALYSIS_PROVIDER } from './provider-config';

describe('Phase 4 mobile/server analysis contract', () => {
  it('keeps the provider contract, fixed prompt, and structured output schema identical', () => {
    expect(SERVER_CONTRACT_VERSION).toBe(ANALYSIS_CONTRACT_VERSION);
    expect(SERVER_PROVIDER).toBe(ANALYSIS_PROVIDER);
    expect(SERVER_PROMPT).toBe(ANALYSIS_SYSTEM_PROMPT);
    expect(SERVER_SCHEMA).toEqual(ANALYSIS_OUTPUT_JSON_SCHEMA);
  });
});
