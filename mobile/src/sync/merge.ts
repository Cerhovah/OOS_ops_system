export type MergeWinner = 'local' | 'remote' | 'same';

export interface MergeDecision {
  winner: MergeWinner;
  conflict: boolean;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function payloadsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export function decideMerge(input: {
  localPayload: Readonly<Record<string, unknown>> | null;
  localUpdatedAt: string | null;
  remotePayload: Readonly<Record<string, unknown>>;
  remoteUpdatedAt: string;
  hasPendingLocal: boolean;
}): MergeDecision {
  if (!input.localPayload) return { winner: 'remote', conflict: false };
  if (payloadsEqual(input.localPayload, input.remotePayload)) return { winner: 'same', conflict: false };
  if (!input.hasPendingLocal) return { winner: 'remote', conflict: false };

  const localTime = input.localUpdatedAt ? Date.parse(input.localUpdatedAt) : Number.NEGATIVE_INFINITY;
  const remoteTime = Date.parse(input.remoteUpdatedAt);
  if (Number.isFinite(localTime) && Number.isFinite(remoteTime) && localTime > remoteTime) {
    return { winner: 'local', conflict: true };
  }
  return { winner: 'remote', conflict: true };
}

