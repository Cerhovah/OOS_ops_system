import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

const config = read('../config.toml');
const edgeHandler = read('../functions/ai-analysis/index.ts');
const syncMigration = read('../migrations/20260904020000_harden_sync_rpc.sql');
const supabaseClient = read('../../mobile/src/services/supabase.ts');
const syncContext = read('../../mobile/src/context/sync-context.tsx');

describe('server security hardening contracts', () => {
  it('keeps public signup disabled for the existing-owner application', () => {
    expect(config).toMatch(/\[auth\][\s\S]*?enable_signup\s*=\s*false/);
    expect(syncContext).toContain('shouldCreateUser: false');
    expect(supabaseClient).toContain("flowType: 'pkce'");
    expect(supabaseClient).not.toContain('auth.setSession');
  });

  it('checks JSON content type and bounded raw bytes before parsing the Edge request', () => {
    expect(edgeHandler).toContain("isJsonContentType(req.headers.get('Content-Type'))");
    expect(edgeHandler).toContain('readRawBody(req)');
    expect(edgeHandler).toContain('parseAnalysisRequestBytes(rawBody)');
    expect(edgeHandler).not.toContain('await req.json()');
  });

  it('removes direct writes and exposes only a bounded security-definer sync RPC', () => {
    expect(syncMigration).toContain('revoke insert, update, delete on table public.oos_sync_records from authenticated');
    expect(syncMigration).toContain('security definer');
    expect(syncMigration).toContain("set search_path = ''");
    expect(syncMigration).toContain('v_record_count < 1 or v_record_count > 250');
    expect(syncMigration).toContain("clock_timestamp() + interval '5 minutes'");
    expect(syncMigration).toContain('unsupported sync setting');
    expect(syncMigration).toContain("left(v_local_id, char_length('item_notification:')) = 'item_notification:'");
    expect(syncMigration).not.toContain("like 'item_notification:%'");
    expect(syncMigration).toContain('payload updated_at does not match client_updated_at');
    expect(syncMigration).toContain('payload deleted_at does not match deleted_at');
    expect(syncMigration).toContain('grant execute on function public.apply_oos_sync_records(jsonb) to authenticated');
  });
});
