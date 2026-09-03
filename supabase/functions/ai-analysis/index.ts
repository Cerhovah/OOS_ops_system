import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

import {
  ANALYSIS_CONTRACT_VERSION,
  ANALYSIS_MODEL,
  ANALYSIS_MODES,
  ANALYSIS_MODE_LABELS,
  ANALYSIS_OUTPUT_JSON_SCHEMA,
  ANALYSIS_PROVIDER,
  ANALYSIS_SYSTEM_PROMPT,
} from '../_shared/analysis-contract.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AnalysisMode = (typeof ANALYSIS_MODES)[number];

interface AnalysisRequest {
  mode: AnalysisMode;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  dataSnapshotJson: string;
}

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

function parseRequest(value: unknown): AnalysisRequest | null {
  if (!isRecord(value) || typeof value.mode !== 'string' || !ANALYSIS_MODES.includes(value.mode as AnalysisMode)) return null;
  if (typeof value.question !== 'string' || !value.question.trim() || value.question.length > 2_000) return null;
  if (typeof value.rangeStart !== 'string' || typeof value.rangeEnd !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.rangeStart) || !/^\d{4}-\d{2}-\d{2}$/.test(value.rangeEnd)) return null;
  if (typeof value.dataSnapshotJson !== 'string' || value.dataSnapshotJson.length > 750_000) return null;
  try {
    if (!isRecord(JSON.parse(value.dataSnapshotJson))) return null;
  } catch {
    return null;
  }
  return {
    mode: value.mode as AnalysisMode,
    question: value.question.trim(),
    rangeStart: value.rangeStart,
    rangeEnd: value.rangeEnd,
    dataSnapshotJson: value.dataSnapshotJson,
  };
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!authorization || !bearer) return json(401, { error: 'unauthorized' });

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_request' });
  }
  const analysis = parseRequest(body);
  if (!analysis) return json(400, { error: 'invalid_request' });

  let openAiResponse: Response;
  try {
    openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        instructions: ANALYSIS_SYSTEM_PROMPT,
        input: [{ role: 'user', content: [{ type: 'input_text', text: userInput(analysis) }] }],
        reasoning: { effort: 'low' },
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
  return json(200, {
    contract_version: ANALYSIS_CONTRACT_VERSION,
    provider: ANALYSIS_PROVIDER,
    model: ANALYSIS_MODEL,
    text,
    input_tokens: token(usage.input_tokens),
    output_tokens: token(usage.output_tokens),
  });
});
