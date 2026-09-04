/// <reference types="node" />

import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { migrateDatabase } from '@/data/migrations';
import { SnapshotRepository } from '@/data/app-repository/snapshot-repository';
import { SyncRepository, type RemoteSyncRecord } from '@/data/sync-repository';
import { TestSQLiteDatabase } from '@/test/sqlite-adapter';

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));

describe('SnapshotRepository with remote tombstones', () => {
  let adapter: TestSQLiteDatabase;
  let snapshotRepository: SnapshotRepository;
  let syncRepository: SyncRepository;

  beforeEach(async () => {
    adapter = new TestSQLiteDatabase();
    await migrateDatabase(adapter.asExpoDatabase());
    snapshotRepository = new SnapshotRepository(adapter.asExpoDatabase());
    syncRepository = new SyncRepository(adapter.asExpoDatabase());
  });

  afterEach(() => adapter.close());

  function remoteClosure(updatedAt: string, deletedAt: string | null): RemoteSyncRecord {
    return {
      user_id: 'user-a',
      table_name: 'day_closures',
      local_id: 'closure-remote',
      payload: {
        id: 'closure-remote',
        date: '2026-09-04',
        closed_at: '2026-09-04T14:00:00.000Z',
        planned_minutes: 480,
        actual_minutes: 420,
        snapshot_json: '{"rows":[]}',
        note: '원격 종료 메모',
        updated_at: updatedAt,
        deleted_at: deletedAt,
      },
      client_updated_at: updatedAt,
      deleted_at: deletedAt,
      server_updated_at: updatedAt,
    };
  }

  it('keeps a pulled closure tombstone in SQLite but excludes it from the active snapshot', async () => {
    await syncRepository.applyRemoteRecords([
      remoteClosure('2026-09-04T14:00:00.000Z', null),
    ]);

    expect((await snapshotRepository.load('2026-09-04')).closures).toEqual([
      expect.objectContaining({ id: 'closure-remote', note: '원격 종료 메모' }),
    ]);

    const deletedAt = '2026-09-04T15:00:00.000Z';
    await syncRepository.applyRemoteRecords([remoteClosure(deletedAt, deletedAt)]);

    expect(adapter.raw.prepare(
      "SELECT deleted_at FROM day_closures WHERE id='closure-remote'",
    ).get()).toMatchObject({ deleted_at: deletedAt });
    expect((await snapshotRepository.load('2026-09-04')).closures).toEqual([]);
  });
});
