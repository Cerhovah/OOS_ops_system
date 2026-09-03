import type { TokenPrice } from './service';

export const ANALYSIS_PROVIDER = 'openai';
export const ANALYSIS_MODEL = 'gpt-5.6-terra';
export const ANALYSIS_CONTRACT_VERSION = 'phase4-v1';
export const ANALYSIS_TOKEN_PRICE: TokenPrice = {
  inputPerMillionUsd: 2,
  outputPerMillionUsd: 12,
};
