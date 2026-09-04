import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

import { parseAuthCallbackUrl } from '@/services/auth-callback';
import { createAuthStorage } from '@/services/auth-storage';
import { supabaseAuthStorageKeyFromUrl } from '@/services/auth-storage-core';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const authStorageKey = supabaseAuthStorageKeyFromUrl(supabaseUrl);

export const isSupabaseConfigured = Boolean(authStorageKey && supabasePublishableKey);

const supabase = supabaseUrl && supabasePublishableKey && authStorageKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: createAuthStorage(authStorageKey),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 없습니다. development 환경을 로컬로 내려받아야 합니다.');
  }
  return supabase;
}

export async function createSessionFromAuthCallback(url: string): Promise<Session | null> {
  const callback = parseAuthCallbackUrl(url);
  if (!callback) return null;
  if (callback.kind === 'error') throw new Error(callback.message);

  const client = getSupabaseClient();
  const result = await client.auth.exchangeCodeForSession(callback.code);

  if (result.error) throw result.error;
  return result.data.session;
}
