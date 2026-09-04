import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SyncRepository } from '@/data/sync-repository';
import { migrateDatabase } from '@/data/migrations';
import { TestSQLiteDatabase } from '@/test/sqlite-adapter';

import { synchronize } from './sync-service';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('expo-crypto', () => ({ randomUUID: nodeRandomUUID }));
vi.mock('@/services/supabase', () => ({
  getSupabaseClient: mocks.getClient,
}));

class EmptyPullQuery {
  select(): this { return this; }
  eq(): this { return this; }
  order(): this { return this; }
  range(): Promise<{ data: unknown[]; error: null }> {
    return Promise.resolve({ data: [], error: null });
  }
}

interface PushedRecord {
  table_name: string;
  local_id: string;
  payload: Record<string, unknown>;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function appliedResponse(argumentsValue: unknown): { data: object[]; error: null } {
  const records = (argumentsValue as { p_records: PushedRecord[] }).p_records;
  return {
    data: records.map((record) => ({
      table_name: record.table_name,
      local_id: record.local_id,
      applied: true,
    })),
    error: null,
  };
}

describe('synchronize safety', () => {
  let database: TestSQLiteDatabase;

  beforeEach(async () => {
    database = new TestSQLiteDatabase();
    await migrateDatabase(database.asExpoDatabase());
    database.raw.exec('DELETE FROM sync_outbox; DELETE FROM sync_state;');
    mocks.from.mockReset().mockImplementation(() => new EmptyPullQuery());
    mocks.rpc.mockReset();
    mocks.getClient.mockReset().mockImplementation(() => ({ from: mocks.from, rpc: mocks.rpc }));
  });

  afterEach(() => database.close());

  it('checks the bound owner before creating any pull or push request', async () => {
    await new SyncRepository(database.asExpoDatabase()).bindOwner('user-a');

    await expect(synchronize(database.asExpoDatabase(), 'user-b')).rejects.toThrow('다른 Supabase 계정');
    expect(mocks.getClient).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('pushes an edit made while the preceding network request is still in flight', async () => {
    database.raw.prepare(
      "UPDATE accounts SET name='첫 전송',updated_at='2026-09-04T00:00:01.000Z' WHERE id='seed-account-sleep'",
    ).run();
    const firstRequest = deferred<{ data: object[]; error: null }>();
    mocks.rpc
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementation((_name: unknown, argumentsValue: unknown) => Promise.resolve(appliedResponse(argumentsValue)));

    const sync = synchronize(database.asExpoDatabase(), 'user-a');
    await vi.waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    database.raw.prepare(
      "UPDATE accounts SET name='전송 중 최신 값',updated_at='2026-09-04T00:00:02.000Z' WHERE id='seed-account-sleep'",
    ).run();

    const firstArguments = mocks.rpc.mock.calls[0][1] as unknown;
    firstRequest.resolve(appliedResponse(firstArguments));
    await expect(sync).resolves.toMatchObject({ pushed: 2, pending: 0 });

    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    const secondArguments = mocks.rpc.mock.calls[1][1] as { p_records: PushedRecord[] };
    expect(secondArguments.p_records[0].payload).toMatchObject({ name: '전송 중 최신 값' });
  });
});
