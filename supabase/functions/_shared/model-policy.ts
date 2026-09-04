export const ANALYSIS_TIERS = ['standard', 'deep'] as const;

/** Edge Runtime global; declared locally so the mobile TypeScript gate can import policy tests. */
declare const Deno: { env: { get(name: string): string | undefined } };

export type AnalysisTier = (typeof ANALYSIS_TIERS)[number];
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface ModelPolicy {
  provider: 'openai';
  tier: AnalysisTier;
  model: string;
  reasoningEffort: ReasoningEffort;
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

type Environment = (name: string) => string | undefined;

function required(environment: Environment, name: string): string {
  const value = environment(name)?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

function positiveNumber(environment: Environment, name: string): number {
  const value = Number(required(environment, name));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name}_invalid`);
  return value;
}

/** Resolves the model exclusively on the server; mobile never makes this choice. */
export function resolveModelPolicy(
  tier: AnalysisTier,
  environment: Environment = (name) => Deno.env.get(name),
): ModelPolicy {
  if (tier === 'deep') {
    return {
      provider: 'openai', tier, model: required(environment, 'AI_MODEL_DEEP'), reasoningEffort: 'high',
      inputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_DEEP_INPUT_PER_MILLION'),
      outputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_DEEP_OUTPUT_PER_MILLION'),
    };
  }
  return {
    provider: 'openai', tier, model: required(environment, 'AI_MODEL_STANDARD'), reasoningEffort: 'medium',
    inputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_STANDARD_INPUT_PER_MILLION'),
    outputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_STANDARD_OUTPUT_PER_MILLION'),
  };
}

/** Reserved for deterministic -> lightweight preprocessing, never final analysis. */
export function resolveLightweightModelPolicy(
  environment: Environment = (name) => Deno.env.get(name),
): Omit<ModelPolicy, 'tier'> {
  return {
    provider: 'openai', model: required(environment, 'AI_MODEL_LIGHT'), reasoningEffort: 'low',
    inputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_LIGHT_INPUT_PER_MILLION'),
    outputPerMillionUsd: positiveNumber(environment, 'AI_PRICE_LIGHT_OUTPUT_PER_MILLION'),
  };
}

export function estimateCostUsd(inputTokens: number | null, outputTokens: number | null, policy: Pick<ModelPolicy, 'inputPerMillionUsd' | 'outputPerMillionUsd'>): number | null {
  if (inputTokens === null || outputTokens === null) return null;
  return (inputTokens * policy.inputPerMillionUsd + outputTokens * policy.outputPerMillionUsd) / 1_000_000;
}
