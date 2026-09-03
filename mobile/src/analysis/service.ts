import type { AnalysisRequest, AnalysisRunResult, AnalysisTransport } from './types';
import { parseAnalysisResponse } from './prompt';

export interface TokenPrice {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

export function estimateAnalysisCost(
  inputTokens: number | null,
  outputTokens: number | null,
  price: TokenPrice | null,
): number | null {
  if (inputTokens === null || outputTokens === null || price === null) return null;
  return (inputTokens * price.inputPerMillionUsd + outputTokens * price.outputPerMillionUsd) / 1_000_000;
}

export async function runAnalysis(
  request: AnalysisRequest,
  transport: AnalysisTransport,
  price: TokenPrice | null,
): Promise<AnalysisRunResult> {
  const response = await transport.generate(request);
  const parsed = parseAnalysisResponse(response.text);
  return {
    ...parsed,
    provider: transport.provider,
    model: transport.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    estimatedCostUsd: estimateAnalysisCost(response.inputTokens, response.outputTokens, price),
  };
}
