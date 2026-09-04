import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestSQLiteDatabase } from '@/test/sqlite-adapter';

import { migrateDatabase } from './migrations';
import { SyncRepository } from './sync-repository';

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));

describe('SyncRepository safety invariants', () => {
  let database: TestSQLiteDatabase;
  let repository: SyncRepository;

  beforeEach(async () => {
    database = new TestSQLiteDatabase();
    await migrateDatabase(database.asExpoDatabase());
    database.raw.exec('DELETE FROM sync_outbox;');
    repository = new SyncRepository(database.asExpoDatabase());
  });

  afterEach(() => database.close());

  it('binds the local sync state to the first account until explicit reset clears it', async () => {
    await repository.bindOwner('user-a');
    await repository.bindOwner('user-a');

    await expect(repository.bindOwner('user-b')).rejects.toThrow('다른 Supabase 계정');
    expect(database.raw.prepare("SELECT value FROM sync_state WHERE key='sync_owner_user_id'").get())
      .toMatchObject({ value: 'user-a' });

    database.raw.exec('DELETE FROM sync_state;');
    await expect(repository.bindOwner('user-b')).resolves.toBeUndefined();
  });

  it('honors a legacy account-specific pull cursor before creating the owner binding', async () => {
    database.raw.prepare(
      "INSERT INTO sync_state (key,value,updated_at) VALUES ('last_pulled_server_at:user-a','2026-09-04T00:00:00.000Z','2026-09-04T00:00:00.000Z')",
    ).run();

    await expect(repository.bindOwner('user-b')).rejects.toThrow('다른 Supabase 계정');
    await expect(repository.bindOwner('user-a')).resolves.toBeUndefined();
    expect(database.raw.prepare("SELECT value FROM sync_state WHERE key='sync_owner_user_id'").get())
      .toMatchObject({ value: 'user-a' });
  });

  it('surfaces an unknown outbox table instead of leaving an invisible pending row', async () => {
    database.raw.prepare(
      `INSERT INTO sync_outbox
        (id,table_name,record_id,operation,payload_json,local_updated_at,attempts,last_error,created_at)
       VALUES ('outbox-unknown','removed_table','row-1','upsert','{}','2026-09-04T00:00:00.000Z',0,NULL,
        '2026-09-04T00:00:00.000Z')`,
    ).run();

    await expect(repository.listOutbox()).rejects.toThrow('지원하지 않는 동기화 대기 테이블');
    await expect(repository.pendingCount()).resolves.toBe(1);
  });

  it('fails on future remote schema instead of advancing past data this client cannot apply', async () => {
    const remote = {
      user_id: 'user-a',
      table_name: 'future_table',
      local_id: 'future-row',
      payload: { id: 'future-row' },
      client_updated_at: '2026-09-04T00:00:00.000Z',
      deleted_at: null,
      server_updated_at: '2026-09-04T00:00:01.000Z',
    };

    await expect(repository.applyRemoteRecords([remote])).rejects.toThrow('지원하지 않는 원격 동기화 테이블');
  });

  it('does not acknowledge a newer edit made while an older payload is in flight', async () => {
    database.raw.prepare(
      "UPDATE accounts SET name='전송 시작 값',updated_at='2026-09-04T00:00:01.000Z' WHERE id='seed-account-sleep'",
    ).run();
    const sent = (await repository.listOutbox())[0];
    expect(sent).toBeDefined();

    database.raw.prepare(
      "UPDATE accounts SET name='전송 중 최신 값',updated_at='2026-09-04T00:00:02.000Z' WHERE id='seed-account-sleep'",
    ).run();
    await repository.removeOutbox([{ id: sent.id, localUpdatedAt: sent.localUpdatedAt }]);

    const pending = await repository.listOutbox();
    expect(pending).toHaveLength(1);
    expect(pending[0].localUpdatedAt).toBe('2026-09-04T00:00:02.000Z');
    expect(pending[0].payload).toMatchObject({ name: '전송 중 최신 값' });
  });
});
