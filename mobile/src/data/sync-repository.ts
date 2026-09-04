import type { SQLiteDatabase } from 'expo-sqlite';

import { LocalSyncStore } from '@/data/sync-persistence/local-sync-store';
import { RemoteSyncStore } from '@/data/sync-persistence/remote-sync-store';
import type {
  OutboxAcknowledgement,
  OutboxRecord,
  RemoteSyncRecord,
  SyncConflict,
} from '@/data/sync-persistence/types';

export type { RemoteSyncRecord, SyncConflict } from '@/data/sync-persistence/types';

export class SyncRepository {
  private readonly local: LocalSyncStore;
  private readonly remote: RemoteSyncStore;

  constructor(database: SQLiteDatabase) {
    this.local = new LocalSyncStore(database);
    this.remote = new RemoteSyncStore(database);
  }

  bindOwner(userId: string): Promise<void> {
    return this.local.bindOwner(userId);
  }

  shouldReplaceSeedBootstrap(hasRemoteRecords: boolean): Promise<boolean> {
    return this.local.shouldReplaceSeedBootstrap(hasRemoteRecords);
  }

  listOutbox(limit = 250): Promise<OutboxRecord[]> {
    return this.local.listOutbox(limit);
  }

  pendingCount(): Promise<number> {
    return this.local.pendingCount();
  }

  removeOutbox(acknowledgements: readonly OutboxAcknowledgement[]): Promise<void> {
    return this.local.removeOutbox(acknowledgements);
  }

  markPushFailure(ids: readonly string[], message: string): Promise<void> {
    return this.local.markPushFailure(ids, message);
  }

  getState(key: string): Promise<string | null> {
    return this.local.getState(key);
  }

  setState(key: string, value: string): Promise<void> {
    return this.local.setState(key, value);
  }

  listConflicts(limit = 50): Promise<SyncConflict[]> {
    return this.local.listConflicts(limit);
  }

  applyRemoteRecords(
    records: readonly RemoteSyncRecord[],
    options: { replaceSeedBootstrap?: boolean } = {},
  ): Promise<void> {
    return this.remote.applyRecords(records, options);
  }
}
