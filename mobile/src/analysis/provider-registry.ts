import { ANALYSIS_MODEL, ANALYSIS_PROVIDER, ANALYSIS_TOKEN_PRICE } from './provider-config';
import type { TokenPrice } from './service';
import { SupabaseAnalysisTransport } from './supabase-transport';
import type { AnalysisTransport } from './types';

export { ANALYSIS_MODEL, ANALYSIS_PROVIDER, ANALYSIS_TOKEN_PRICE } from './provider-config';

interface ResolvedAnalysisTransport {
  transport: AnalysisTransport;
  price: TokenPrice | null;
}

export async function resolveAnalysisTransport(
  settings: Readonly<Record<string, string>>,
): Promise<ResolvedAnalysisTransport> {
  const provider = settings.ai_provider?.trim();
  const model = settings.ai_model?.trim();
  if (!provider || !model) throw new Error('설정에서 AI 제공자와 모델을 먼저 저장하십시오.');
  if (provider !== ANALYSIS_PROVIDER) throw new Error(`지원하지 않는 AI 제공자입니다: ${provider}`);
  if (model !== ANALYSIS_MODEL) throw new Error(`지원하지 않는 AI 모델입니다: ${model}`);
  return {
    transport: new SupabaseAnalysisTransport(model),
    price: ANALYSIS_TOKEN_PRICE,
  };
}
