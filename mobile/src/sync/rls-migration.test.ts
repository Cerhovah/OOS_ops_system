/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(
  new URL('../../../supabase/migrations/20260902053000_phase_2_sync.sql', import.meta.url),
);
const migration = readFileSync(migrationPath, 'utf8');
const ambiguityFixMigration = readFileSync(
  fileURLToPath(
    new URL(
      '../../../supabase/migrations/20260902060000_fix_apply_oos_sync_records_conflict_target.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);
const legacyCleanupMigration = readFileSync(
  fileURLToPath(
    new URL('../../../supabase/migrations/20260903030000_remove_legacy_sync_schema.sql', import.meta.url),
  ),
  'utf8',
);

describe('Phase 2 Supabase RLS migration', () => {
  it('enables RLS and restricts every operation to the authenticated owner', () => {
    expect(migration).toContain('alter table public.oos_sync_records enable row level security');
    expect(migration).toContain('revoke all on table public.oos_sync_records from anon');
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(`on public.oos_sync_records for ${operation}`);
    }
    expect(migration.match(/to authenticated/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('prevents anonymous RPC use and rejects unauthenticated calls', () => {
    expect(migration).toContain('revoke all on function public.apply_oos_sync_records(jsonb) from public, anon');
    expect(migration).toContain('grant execute on function public.apply_oos_sync_records(jsonb) to authenticated');
    expect(migration).toContain("raise exception 'authentication required'");
  });

  it('uses the named primary-key constraint to avoid PL/pgSQL output-column ambiguity', () => {
    expect(ambiguityFixMigration).toContain(
      'on conflict on constraint oos_sync_records_pkey do update set',
    );
    expect(ambiguityFixMigration).not.toContain(
      'on conflict (user_id, table_name, local_id) do update set',
    );
  });

  it('removes only the empty legacy sync schema and preserves the active record store', () => {
    expect(legacyCleanupMigration).toContain("raise exception 'legacy sync schema contains data; cleanup stopped'");
    expect(legacyCleanupMigration).toContain('drop table if exists public.sync_records');
    expect(legacyCleanupMigration).not.toContain('drop table if exists public.oos_sync_records');
  });
});
