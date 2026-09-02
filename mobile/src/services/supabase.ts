import 'expo-sqlite/localStorage/install';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { parseAuthCallbackUrl } from '@/services/auth-callback';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

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
  const result = callback.kind === 'code'
    ? await client.auth.exchangeCodeForSession(callback.code)
    : await client.auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });

  if (result.error) throw result.error;
  return result.data.session;
}
