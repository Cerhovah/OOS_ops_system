import { ANALYSIS_MODES } from './analysis-contract.ts';
import { ANALYSIS_TIERS, type AnalysisTier } from './model-policy.ts';

export const MAX_ANALYSIS_REQUEST_BYTES = 100 * 1024;
export const MAX_ANALYSIS_SNAPSHOT_BYTES = 80 * 1024;

type AnalysisMode = (typeof ANALYSIS_MODES)[number];

export interface AnalysisRequest {
  mode: AnalysisMode;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  dataSnapshotJson: string;
  analysisTier: AnalysisTier;
}

export type AnalysisRequestError = 'invalid_request' | 'request_too_large' | 'snapshot_too_large';

export type AnalysisRequestResult =
  | { ok: true; value: AnalysisRequest }
  | { ok: false; error: AnalysisRequestError };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function isJsonContentType(value: string | null): boolean {
  return value?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

export function parseAnalysisRequestBytes(rawBody: Uint8Array): AnalysisRequestResult {
  if (rawBody.byteLength > MAX_ANALYSIS_REQUEST_BYTES) return { ok: false, error: 'request_too_large' };

  let bodyText: string;
  try {
    bodyText = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
  } catch {
    return { ok: false, error: 'invalid_request' };
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return { ok: false, error: 'invalid_request' };
  }
  if (!isRecord(body) || typeof body.mode !== 'string' || !ANALYSIS_MODES.includes(body.mode as AnalysisMode)) {
    return { ok: false, error: 'invalid_request' };
  }
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 2_000) {
    return { ok: false, error: 'invalid_request' };
  }
  if (typeof body.rangeStart !== 'string' || typeof body.rangeEnd !== 'string') {
    return { ok: false, error: 'invalid_request' };
  }
  if (!isDateKey(body.rangeStart) || !isDateKey(body.rangeEnd) || body.rangeStart > body.rangeEnd) {
    return { ok: false, error: 'invalid_request' };
  }
  if (typeof body.dataSnapshotJson !== 'string') return { ok: false, error: 'invalid_request' };
  if (body.analysisTier !== undefined && (typeof body.analysisTier !== 'string' || !ANALYSIS_TIERS.includes(body.analysisTier as AnalysisTier))) {
    return { ok: false, error: 'invalid_request' };
  }
  if (byteLength(body.dataSnapshotJson) > MAX_ANALYSIS_SNAPSHOT_BYTES) {
    return { ok: false, error: 'snapshot_too_large' };
  }
  try {
    if (!isRecord(JSON.parse(body.dataSnapshotJson))) return { ok: false, error: 'invalid_request' };
  } catch {
    return { ok: false, error: 'invalid_request' };
  }

  return {
    ok: true,
    value: {
      mode: body.mode as AnalysisMode,
      question: body.question.trim(),
      rangeStart: body.rangeStart,
      rangeEnd: body.rangeEnd,
      dataSnapshotJson: body.dataSnapshotJson,
      analysisTier: (body.analysisTier as AnalysisTier | undefined) ?? 'standard',
    },
  };
}
