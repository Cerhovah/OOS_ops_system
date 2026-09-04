import type { SyncScalar, SyncTableName } from '@/sync/schema';

export type SyncRow = Record<string, SyncScalar>;

export interface OutboxRecord {
  id: string;
  tableName: SyncTableName;
  recordId: string;
  payload: Record<string, SyncScalar>;
  localUpdatedAt: string;
}

export interface OutboxAcknowledgement {
  id: string;
  localUpdatedAt: string;
}

export interface RemoteSyncRecord {
  user_id: string;
  table_name: string;
  local_id: string;
  payload: Record<string, unknown>;
  client_updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

export interface SyncConflict {
  id: string;
  tableName: string;
  recordId: string;
  localPayload: string | null;
  remotePayload: string;
  localUpdatedAt: string | null;
  remoteUpdatedAt: string;
  winner: 'local' | 'remote';
  createdAt: string;
}
