import { getSupabaseClient } from '@/services/supabase';

import { ANALYSIS_CONTRACT_VERSION } from './provider-config';
import type { AnalysisRequest, AnalysisTransport, AnalysisTransportResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nullableToken(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
  if (code === 'openai_not_configured') throw new Error('AI 분석 서버의 OpenAI 키가 아직 설정되지 않았습니다.');
  if (code === 'openai_authentication') throw new Error('AI 분석 서버의 OpenAI 키가 유효하지 않습니다.');
  if (code === 'openai_limit') {
    throw new Error('OpenAI API 사용 한도 또는 호출 속도 제한에 도달했습니다. API 결제와 사용 한도를 확인하십시오.');
  }
  if (code === 'unauthorized' || code === 'forbidden') {
    throw new Error('AI 분석 서버 사용 권한을 확인하지 못했습니다. 설정에서 다시 로그인하십시오.');
  }
  throw new Error('AI 분석 서버가 요청을 완료하지 못했습니다.');
}

export class SupabaseAnalysisTransport implements AnalysisTransport {
  readonly provider = 'openai';

  constructor(readonly model: string) {}

  async generate(request: AnalysisRequest): Promise<AnalysisTransportResult> {
    const { data, error } = await getSupabaseClient().functions.invoke<unknown>('ai-analysis', {
      body: request,
    });
    if (error) {
      const code = await functionErrorCode(error);
      if (code) throwServerError(code);
      const message = error.message.toLocaleLowerCase();
      if (message.includes('401') || message.includes('unauthorized')) {
        throw new Error('AI 분석에는 Supabase 로그인이 필요합니다. 설정에서 다시 로그인하십시오.');
      }
      throw new Error('AI 분석 서버 호출에 실패했습니다. 네트워크와 서버 설정을 확인하십시오.');
    }
    if (!isRecord(data)) throw new Error('AI 분석 서버 응답 형식이 올바르지 않습니다.');
    if (typeof data.error === 'string') throwServerError(data.error);
    if (
      data.contract_version !== ANALYSIS_CONTRACT_VERSION
      || data.provider !== this.provider
      || data.model !== this.model
      || typeof data.text !== 'string'
      || !data.text.trim()
    ) {
      throw new Error('AI 분석 서버 응답 형식이 올바르지 않습니다.');
    }
    return {
      text: data.text,
      inputTokens: nullableToken(data.input_tokens),
      outputTokens: nullableToken(data.output_tokens),
    };
  }
}
