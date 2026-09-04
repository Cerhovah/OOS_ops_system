import type { SyncScalar, SyncTableDefinition } from '@/sync/schema';

function asSyncScalar(value: unknown): SyncScalar {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value;
  throw new Error('동기화 행에 지원하지 않는 값이 있습니다.');
}

export function parseOutboxPayload(value: string): Record<string, SyncScalar> {
  const parsed: unknown = JSON.parse(value);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('동기화 대기 데이터 형식이 올바르지 않습니다.');
  }
  return Object.fromEntries(Object.entries(parsed).map(([key, nested]) => [key, asSyncScalar(nested)]));
}

export function normalizeRemotePayload(
  definition: SyncTableDefinition,
  recordId: string,
  payload: Readonly<Record<string, unknown>>,
): Record<string, SyncScalar> {
  const normalized: Record<string, SyncScalar> = {};
  for (const column of definition.columns) {
    if (column === definition.primaryKey) {
      normalized[column] = recordId;
    } else if (Object.hasOwn(payload, column)) {
      normalized[column] = asSyncScalar(payload[column]);
    }
  }
  if (definition.columns.some((column) => !Object.hasOwn(normalized, column))) {
    throw new Error(`${definition.name} 원격 행에 필요한 열이 없습니다.`);
  }
  return normalized;
}
