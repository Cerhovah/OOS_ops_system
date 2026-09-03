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
}

export interface AnalysisTransportResult {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface AnalysisTransport {
  readonly provider: string;
  readonly model: string;
  generate(request: AnalysisRequest): Promise<AnalysisTransportResult>;
}

export interface AnalysisRunResult extends ParsedAnalysisOutput {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
}
