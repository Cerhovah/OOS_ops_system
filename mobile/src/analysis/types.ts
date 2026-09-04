import type { AnalysisMode, PlanChangePayload } from '@/types/domain';

export interface AnalysisNumberUsed {
  label: string;
  value: number;
  unit: string | null;
  period: string;
}

export interface AnalysisPlanChangeProposal {
  kind: 'plan_change';
  payload: PlanChangePayload;
  rationale: string;
}

export interface ParsedAnalysisOutput {
  answer: string;
  numbersUsed: AnalysisNumberUsed[];
  proposals: AnalysisPlanChangeProposal[];
  structured: boolean;
  warning: string | null;
}

export interface AnalysisRequest {
  mode: AnalysisMode;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  dataSnapshotJson: string;
  analysisTier?: 'standard' | 'deep';
}

export interface AnalysisTransportResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  provider: string;
  model: string;
  reasoningEffort: string | null;
  providerResponseId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface AnalysisTransport {
  generate(request: AnalysisRequest): Promise<AnalysisTransportResult>;
}

export interface AnalysisRunResult extends ParsedAnalysisOutput {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  reasoningEffort: string | null;
  providerResponseId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}
