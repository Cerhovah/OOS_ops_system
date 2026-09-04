import { getSupabaseClient } from '@/services/supabase';

import { ANALYSIS_CONTRACT_VERSION } from './provider-config';
import type { AnalysisRequest, AnalysisTransport, AnalysisTransportResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function functionErrorCode(error: unknown): Promise<string | null> {
  if (!isRecord(error) || !isRecord(error.context) || typeof error.context.json !== 'function') return null;
  try {
    const payload: unknown = await (error.context.json as () => Promise<unknown>).call(error.context);
    return isRecord(payload) && typeof payload.error === 'string' ? payload.error : null;
  } catch {
    return null;
  }
}

function throwServerError(code: string): never {
  if (code === 'openai_not_configured' || code === 'model_policy_not_configured') {
    throw new Error('AI 분석 서버의 제공자 또는 모델 정책이 아직 설정되지 않았습니다.');
  }
  if (code === 'openai_authentication') throw new Error('AI 분석 서버의 OpenAI 인증 정보를 확인할 수 없습니다.');
  if (code === 'openai_limit') throw new Error('AI API 사용 한도 또는 요청 제한에 도달했습니다.');
  if (code === 'unauthorized' || code === 'forbidden') throw new Error('AI 분석 서버 사용 권한을 확인할 수 없습니다. 다시 로그인해 주세요.');
  throw new Error('AI 분석 서버가 요청을 완료하지 못했습니다.');
}

export class SupabaseAnalysisTransport implements AnalysisTransport {
  async generate(request: AnalysisRequest): Promise<AnalysisTransportResult> {
    const { data, error } = await getSupabaseClient().functions.invoke<unknown>('ai-analysis', { body: request });
    if (error) {
      const code = await functionErrorCode(error);
      if (code) throwServerError(code);
      throw new Error('AI 분석 서버 호출에 실패했습니다. 네트워크와 로그인 상태를 확인해 주세요.');
    }
    if (!isRecord(data)) throw new Error('AI 분석 서버 응답 형식이 올바르지 않습니다.');
    if (typeof data.error === 'string') throwServerError(data.error);
    if (
      data.contract_version !== ANALYSIS_CONTRACT_VERSION
      || typeof data.provider !== 'string'
      || typeof data.model !== 'string'
      || typeof data.text !== 'string'
      || !data.text.trim()
    ) throw new Error('AI 분석 서버 응답 형식이 올바르지 않습니다.');

    return {
      text: data.text,
      provider: data.provider,
      model: data.model,
      inputTokens: nullableNumber(data.input_tokens),
      outputTokens: nullableNumber(data.output_tokens),
      totalTokens: nullableNumber(data.total_tokens),
      estimatedCostUsd: nullableNumber(data.estimated_cost_usd),
      reasoningEffort: nullableText(data.reasoning_effort),
      providerResponseId: nullableText(data.provider_response_id),
      startedAt: nullableText(data.started_at),
      finishedAt: nullableText(data.finished_at),
    };
  }
}
