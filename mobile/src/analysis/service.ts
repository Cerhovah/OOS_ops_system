import type { AnalysisRequest, AnalysisRunResult, AnalysisTransport } from './types';
import { parseAnalysisResponse } from './prompt';
import { redactSensitiveText } from './redaction';

export async function runAnalysis(
  request: AnalysisRequest,
  transport: AnalysisTransport,
): Promise<AnalysisRunResult> {
  const response = await transport.generate({
    ...request,
    question: redactSensitiveText(request.question),
  });
  const parsed = parseAnalysisResponse(response.text);
  return {
    ...parsed,
    provider: response.provider,
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    totalTokens: response.totalTokens,
    estimatedCostUsd: response.estimatedCostUsd,
    reasoningEffort: response.reasoningEffort,
    providerResponseId: response.providerResponseId,
    startedAt: response.startedAt,
    finishedAt: response.finishedAt,
  };
}
