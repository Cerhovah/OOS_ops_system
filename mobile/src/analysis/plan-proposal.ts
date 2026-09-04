import type { PlanChangePayload } from '@/types/domain';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parsePlanChangePayload(payloadJson: string): PlanChangePayload {
  const value: unknown = JSON.parse(payloadJson);
  if (!isRecord(value) || typeof value.weekStart !== 'string' || !isIsoDate(value.weekStart)) {
    throw new Error('제안에 올바른 주 시작일이 없습니다.');
  }
  if (!isRecord(value.minutesByAccount)) {
    throw new Error('제안에 계정별 계획값이 없습니다.');
  }

  const minutesByAccount: Record<string, number> = {};
  for (const [accountId, minutes] of Object.entries(value.minutesByAccount)) {
    if (!accountId || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) {
      throw new Error(`제안 계획값을 확인할 수 없습니다: ${accountId || '빈 계정 ID'}`);
    }
    minutesByAccount[accountId] = Math.round(minutes);
  }
  if (Object.keys(minutesByAccount).length === 0) {
    throw new Error('제안의 계획 행이 비어 있습니다.');
  }

  const note = value.note === null ? null : typeof value.note === 'string' ? value.note : null;
  return { weekStart: value.weekStart, minutesByAccount, note };
}

export function tryParsePlanChangePayload(payloadJson: string): PlanChangePayload | null {
  try {
    return parsePlanChangePayload(payloadJson);
  } catch {
    return null;
  }
}
