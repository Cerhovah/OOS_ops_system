import NetInfo from '@react-native-community/netinfo';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useSQLiteContext } from 'expo-sqlite';
import {
  AppState,
  type AppStateStatus,
} from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useApp } from '@/context/app-context';
import { SyncRepository, type SyncConflict } from '@/data/sync-repository';
import { AUTH_CALLBACK_URL } from '@/services/auth-callback';
import {
  createSessionFromAuthCallback,
  getSupabaseClient,
  isSupabaseConfigured,
} from '@/services/supabase';
import { synchronize, type SyncRunResult } from '@/services/sync-service';
import {
  fetchTelegramSettings,
  saveTelegramSettings,
  type TelegramConnectionSettings,
} from '@/services/telegram';

interface SyncContextValue {
  configured: boolean;
  session: Session | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  conflicts: SyncConflict[];
  telegramSettings: TelegramConnectionSettings | null;
  telegramLoading: boolean;
  clearError: () => void;
  requestMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<SyncRunResult | null>;
  refreshTelegram: () => Promise<void>;
  updateTelegram: (notificationTime: string, enabled: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : '동기화를 완료하지 못했습니다. 로컬 기록은 보존됩니다.';
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const linkingUrl = Linking.useLinkingURL();
  const app = useApp();
  const appLoading = app.loading;
  const appSnapshot = app.snapshot;
  const refreshApp = app.refresh;
  const repository = useMemo(() => new SyncRepository(db), [db]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [telegramSettings, setTelegramSettings] = useState<TelegramConnectionSettings | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const syncPromise = useRef<Promise<SyncRunResult | null> | null>(null);
  const handledAuthUrl = useRef<string | null>(null);

  const refreshMetadata = useCallback(async () => {
    const [lastSync, pending, conflictRows] = await Promise.all([
      repository.getState('last_sync_at'),
      repository.pendingCount(),
      repository.listConflicts(),
    ]);
    setLastSyncedAt(lastSync);
    setPendingCount(pending);
    setConflicts(conflictRows);
  }, [repository]);

  useEffect(() => {
    void refreshMetadata().catch((caught: unknown) => setError(errorMessage(caught)));
  }, [refreshMetadata]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const client = getSupabaseClient();
    void client.auth.getSession().then(({ data, error: authError }) => {
      if (authError) setError(authError.message);
      if (data.session) setSession(data.session);
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !linkingUrl || handledAuthUrl.current === linkingUrl) return;
    handledAuthUrl.current = linkingUrl;
    setLoading(true);
    void createSessionFromAuthCallback(linkingUrl)
      .then((nextSession) => {
        if (nextSession) {
          setSession(nextSession);
          setError(null);
        }
      })
      .catch((caught: unknown) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }, [linkingUrl]);

  const refreshTelegram = useCallback(async (): Promise<void> => {
    if (!session) {
      setTelegramSettings(null);
      return;
    }
    setTelegramLoading(true);
    try {
      setTelegramSettings(await fetchTelegramSettings(session.user.id));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setTelegramLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refreshTelegram();
  }, [refreshTelegram]);

  const syncNow = useCallback(async (): Promise<SyncRunResult | null> => {
    if (!session) return null;
    if (syncPromise.current) return syncPromise.current;
    const task = (async () => {
      setSyncing(true);
      try {
        const result = await synchronize(db, session.user.id);
        await refreshApp();
        await refreshMetadata();
        await refreshTelegram();
        setError(null);
        return result;
      } catch (caught) {
        setError(errorMessage(caught));
        await refreshMetadata().catch(() => undefined);
        return null;
      } finally {
        setSyncing(false);
        syncPromise.current = null;
      }
    })();
    syncPromise.current = task;
    return task;
  }, [db, refreshApp, refreshMetadata, refreshTelegram, session]);

  useEffect(() => {
    if (!session) return;
    void syncNow();
    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) void syncNow();
    });
    const appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void syncNow();
    });
    return () => {
      networkSubscription();
      appStateSubscription.remove();
    };
  }, [session, syncNow]);

  useEffect(() => {
    if (!session || appLoading) return;
    const timeout = setTimeout(() => {
      void repository.pendingCount().then((count) => {
        setPendingCount(count);
        if (count > 0) void syncNow();
      });
    }, 1500);
    return () => clearTimeout(timeout);
  }, [appLoading, appSnapshot, repository, session, syncNow]);

  const value = useMemo<SyncContextValue>(() => ({
    configured: isSupabaseConfigured,
    session,
    loading,
    syncing,
    error,
    lastSyncedAt,
    pendingCount,
    conflicts,
    telegramSettings,
    telegramLoading,
    clearError: () => setError(null),
    requestMagicLink: async (email) => {
      setError(null);
      const { error: authError } = await getSupabaseClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: AUTH_CALLBACK_URL,
        },
      });
      if (authError) {
        setError(authError.message);
        throw authError;
      }
    },
    signOut: async () => {
      const { error: authError } = await getSupabaseClient().auth.signOut();
      if (authError) {
        setError(authError.message);
        throw authError;
      }
      setSession(null);
      setTelegramSettings(null);
    },
    syncNow,
    refreshTelegram,
    updateTelegram: async (notificationTime, enabled) => {
      if (!session) throw new Error('Telegram 설정을 변경하려면 먼저 로그인하십시오.');
      setError(null);
      try {
        setTelegramSettings(await saveTelegramSettings(session.user.id, notificationTime, enabled));
      } catch (caught) {
        setError(errorMessage(caught));
      }
    },
  }), [
    conflicts, error, lastSyncedAt, loading, pendingCount, refreshTelegram, session, syncNow, syncing,
    telegramLoading, telegramSettings,
  ]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const value = useContext(SyncContext);
  if (!value) throw new Error('useSync는 SyncProvider 안에서 사용해야 합니다.');
  return value;
}
