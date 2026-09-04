import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

import {
  ANALYSIS_CONTRACT_VERSION,
  ANALYSIS_MODE_LABELS,
  ANALYSIS_OUTPUT_JSON_SCHEMA,
  ANALYSIS_SYSTEM_PROMPT,
} from '../_shared/analysis-contract.ts';
import { estimateCostUsd, resolveModelPolicy } from '../_shared/model-policy.ts';
import {
  isJsonContentType,
  MAX_ANALYSIS_REQUEST_BYTES,
  parseAnalysisRequestBytes,
  type AnalysisRequest,
} from '../_shared/analysis-request.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Readonly<Record<string, unknown>>): Response {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders, 'Cache-Control': 'no-store' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name}_missing`);
  return value;
}

function userInput(request: AnalysisRequest): string {
  return [
    `분석 모드: ${ANALYSIS_MODE_LABELS[request.mode]}`,
    `분석 기간: ${request.rangeStart}~${request.rangeEnd}`,
    `질문: ${request.question}`,
    '첨부 데이터 JSON:',
    request.dataSnapshotJson,
  ].join('\n');
}

function outputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  if (!Array.isArray(payload.output)) return null;
  const parts: string[] = [];
  for (const item of payload.output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim() || null;
}

function token(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function responseId(value: unknown): string | null {
  return isRecord(value) && typeof value.id === 'string' && value.id.trim() ? value.id : null;
}

async function readRawBody(req: Request): Promise<Uint8Array | null> {
  const declaredLength = req.headers.get('Content-Length');
  if (declaredLength && /^\d+$/.test(declaredLength.trim()) && Number(declaredLength) > MAX_ANALYSIS_REQUEST_BYTES) {
    return null;
  }
  if (!req.body) return new Uint8Array();

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_ANALYSIS_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!authorization || !bearer) return json(401, { error: 'unauthorized' });
  if (!isJsonContentType(req.headers.get('Content-Type'))) return json(415, { error: 'unsupported_media_type' });

  let supabaseUrl: string;
  let supabaseAnonKey: string;
  let ownerUserId: string;
  let openAiApiKey: string;
  try {
    supabaseUrl = requiredEnv('SUPABASE_URL');
    supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');
    ownerUserId = requiredEnv('OOS_OWNER_USER_ID');
    openAiApiKey = requiredEnv('OPENAI_API_KEY');
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '';
    return json(503, { error: message === 'OPENAI_API_KEY_missing' ? 'openai_not_configured' : 'server_not_configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(bearer);
  if (userError || !userData.user || userData.user.id !== ownerUserId) return json(403, { error: 'forbidden' });

  let rawBody: Uint8Array | null;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  if (!rawBody) return json(413, { error: 'request_too_large' });
  const parsedRequest = parseAnalysisRequestBytes(rawBody);
  if (!parsedRequest.ok) {
    const status = parsedRequest.error === 'invalid_request' ? 400 : 413;
    return json(status, { error: parsedRequest.error });
  }
  const analysis = parsedRequest.value;
  let policy;
  try {
    policy = resolveModelPolicy(analysis.analysisTier);
  } catch {
    return json(503, { error: 'model_policy_not_configured' });
  }
  const startedAt = new Date().toISOString();

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: policy.model,
        instructions: ANALYSIS_SYSTEM_PROMPT,
        input: [{ role: 'user', content: [{ type: 'input_text', text: userInput(analysis) }] }],
        reasoning: { effort: policy.reasoningEffort },
        text: {
          format: {
            type: 'json_schema',
            name: 'oos_ops_analysis',
            strict: true,
            schema: ANALYSIS_OUTPUT_JSON_SCHEMA,
          },
          verbosity: 'low',
        },
        max_output_tokens: 3_000,
        store: false,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return json(502, { error: 'openai_network' });
  }

  let openAiPayload: unknown;
  try {
    openAiPayload = await openAiResponse.json();
  } catch {
    return json(502, { error: 'openai_invalid_response' });
  }
  if (!openAiResponse.ok) {
    if (openAiResponse.status === 401) return json(502, { error: 'openai_authentication' });
    if (openAiResponse.status === 429) return json(429, { error: 'openai_limit' });
    return json(502, { error: 'openai_request_failed' });
  }
  if (isRecord(openAiPayload) && openAiPayload.status !== 'completed') {
    return json(502, { error: 'openai_incomplete' });
  }
  const text = outputText(openAiPayload);
  if (!text) return json(502, { error: 'openai_empty_response' });
  const usage = isRecord(openAiPayload) && isRecord(openAiPayload.usage) ? openAiPayload.usage : {};
  const inputTokens = token(usage.input_tokens);
  const outputTokens = token(usage.output_tokens);
  const totalTokens = token(usage.total_tokens) ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  return json(200, {
    contract_version: ANALYSIS_CONTRACT_VERSION,
    provider: policy.provider,
    model: policy.model,
    reasoning_effort: policy.reasoningEffort,
    text,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens,
    estimated_cost_usd: estimateCostUsd(inputTokens, outputTokens, policy),
    provider_response_id: responseId(openAiPayload),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });
});
