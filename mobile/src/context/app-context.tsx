import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { dateKey, timerDurationMinutes } from '@/domain/calculations';
import { AppRepository } from '@/data/repository';
import { shareFullJson, shareTableCsv } from '@/services/export-service';
import { publishLocalMutation } from '@/services/local-mutation-signal';
import { notificationScheduleFingerprint } from '@/services/notification-policy';
import {
  cancelTimerLimitNotification,
  ensureNotificationSchedule,
  requestNotificationPermission,
  resetNotificationSchedules,
  scheduleTestNotification,
  scheduleTimerLimitNotification,
} from '@/services/notifications';
import type {
  Aggregation,
  AppSnapshot,
  Entry,
  Item,
  ItemInput,
  PlanSource,
  ProjectInput,
} from '@/types/domain';

const emptySnapshot: AppSnapshot = {
  accounts: [],
  projects: [],
  items: [],
  schedules: [],
  entries: [],
  plans: [],
  planLines: [],
  kpis: [],
  kpiRecords: [],
  closures: [],
  manualTodayItemIds: [],
  settings: {},
};

interface AppContextValue {
  snapshot: AppSnapshot;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: () => void;
  addTodayItem: (itemId: string) => Promise<void>;
  startTimer: (item: Item) => Promise<void>;
  stopTimer: (entry: Entry) => Promise<void>;
  createEntry: (item: Item, amount: number | null, note?: string | null) => Promise<void>;
  updateEntry: (entryId: string, amount: number | null, note: string | null) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  restoreEntry: (entryId: string) => Promise<void>;
  saveItem: (input: ItemInput) => Promise<string>;
  setItemArchived: (itemId: string, archived: boolean) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
  saveAccount: (input: { id?: string; name: string; kind: string | null; color: string | null }) => Promise<void>;
  setAccountArchived: (accountId: string, archived: boolean) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  restoreAccount: (accountId: string) => Promise<void>;
  saveProject: (input: ProjectInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  createKpi: (projectId: string, label: string, unit: string | null, aggregation: Aggregation) => Promise<void>;
  updateKpi: (kpiId: string, label: string, unit: string | null, aggregation: Aggregation) => Promise<void>;
  deleteKpi: (kpiId: string) => Promise<void>;
  restoreKpi: (kpiId: string) => Promise<void>;
  recordKpi: (kpiId: string, value: number, note: string | null) => Promise<void>;
  updateKpiRecord: (recordId: string, value: number, note: string | null) => Promise<void>;
  deleteKpiRecord: (recordId: string) => Promise<void>;
  restoreKpiRecord: (recordId: string) => Promise<void>;
  saveWeeklyPlan: (
    weekStart: string,
    values: Readonly<Record<string, number>>,
    source?: PlanSource,
    note?: string | null,
  ) => Promise<number>;
  copyPreviousWeek: (weekStart: string) => Promise<boolean>;
  closeDay: (
    day: string,
    plannedMinutes: number,
    actualMinutes: number,
    snapshotJson: string,
    note: string | null,
  ) => Promise<void>;
  setSetting: (key: string, value: string) => Promise<void>;
  setSettings: (values: Readonly<Record<string, string>>) => Promise<void>;
  getWeeklyComment: (weekStart: string) => Promise<string>;
  saveWeeklyComment: (weekStart: string, value: string) => Promise<void>;
  exportJson: () => Promise<void>;
  exportCsv: (tableName: string) => Promise<void>;
  requestNotifications: () => Promise<boolean>;
  testNotification: () => Promise<string>;
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const repository = useMemo(() => new AppRepository(db), [db]);
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [activeOperations, setActiveOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const loadedDate = useRef(dateKey(new Date()));
  const refreshSequence = useRef(0);
  const completedNotificationSchedule = useRef<string | null>(null);
  const pendingNotificationSchedule = useRef<string | null>(null);
  const busy = activeOperations > 0;

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const today = dateKey(new Date());
      const nextSnapshot = await repository.loadSnapshot(today);
      if (sequence !== refreshSequence.current) return;
      setSnapshot(nextSnapshot);
      loadedDate.current = today;
      setError(null);
    } catch (caught) {
      if (sequence !== refreshSequence.current) return;
      setError(caught instanceof Error ? caught.message : '데이터를 불러오지 못했습니다.');
      throw caught;
    } finally {
      if (sequence === refreshSequence.current) setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const refreshAfterDateChange = () => {
      if (dateKey(new Date()) !== loadedDate.current) void refresh().catch(() => undefined);
    };
    const interval = setInterval(refreshAfterDateChange, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch(() => undefined);
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    const today = dateKey(new Date());
    const todayClosed = snapshot.closures.some((closure) => closure.date === today);
    const fingerprint = notificationScheduleFingerprint(
      today,
      todayClosed,
      snapshot.items,
      snapshot.schedules,
      snapshot.settings,
      snapshot.entries,
    );
    if (
      completedNotificationSchedule.current === fingerprint
      || pendingNotificationSchedule.current === fingerprint
    ) return;
    pendingNotificationSchedule.current = fingerprint;
    void ensureNotificationSchedule(
      repository,
      todayClosed,
      snapshot.items,
      snapshot.schedules,
      snapshot.entries,
      snapshot.settings,
    ).then(() => {
      if (pendingNotificationSchedule.current !== fingerprint) return;
      completedNotificationSchedule.current = fingerprint;
      pendingNotificationSchedule.current = null;
    }).catch((caught: unknown) => {
      if (pendingNotificationSchedule.current === fingerprint) pendingNotificationSchedule.current = null;
      setError(caught instanceof Error ? caught.message : '알림 예약을 확인하지 못했습니다.');
    });
  }, [
    loading,
    repository,
    snapshot.closures,
    snapshot.entries,
    snapshot.items,
    snapshot.schedules,
    snapshot.settings,
  ]);

  const mutate = useCallback(
    async <T,>(
      task: () => Promise<T>,
      options: { refresh?: boolean; signalSync?: boolean } = {},
    ): Promise<T> => {
      const shouldRefresh = options.refresh ?? true;
      const shouldSignalSync = options.signalSync ?? true;
      setActiveOperations((count) => count + 1);
      try {
        const result = await task();
        if (shouldSignalSync) publishLocalMutation();
        if (shouldRefresh) await refresh();
        return result;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '작업을 완료하지 못했습니다.';
        setError(message);
        throw caught;
      } finally {
        setActiveOperations((count) => Math.max(0, count - 1));
      }
    },
    [refresh],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      snapshot,
      loading,
      busy,
      error,
      refresh,
      clearError: () => setError(null),
      addTodayItem: (itemId) => mutate(() => repository.addTodayItem(dateKey(new Date()), itemId)),
      startTimer: (item) =>
        mutate(async () => {
          const entryId = await repository.startTimer(item);
          await scheduleTimerLimitNotification(repository, entryId, item).catch(() => undefined);
        }),
      stopTimer: (entry) => {
        if (!entry.startedAt) return Promise.resolve();
        return mutate(async () => {
          await repository.stopTimer(entry.id, timerDurationMinutes(entry.startedAt!, new Date().toISOString()));
          await cancelTimerLimitNotification(repository, entry.id).catch(() => undefined);
        });
      },
      createEntry: (item, amount, note = null) => mutate(() => repository.createEntry(item, amount, note)),
      updateEntry: (entryId, amount, note) => mutate(() => repository.updateEntry(entryId, amount, note)),
      deleteEntry: (entryId) => mutate(() => repository.deleteEntry(entryId)),
      restoreEntry: (entryId) => mutate(() => repository.restoreEntry(entryId)),
      saveItem: (input) => mutate(() => repository.saveItem(input)),
      setItemArchived: (itemId, archived) => mutate(() => repository.setItemArchived(itemId, archived)),
      deleteItem: (itemId) => mutate(() => repository.deleteItem(itemId)),
      restoreItem: (itemId) => mutate(() => repository.restoreItem(itemId)),
      saveAccount: (input) => mutate(() => repository.saveAccount(input)).then(() => undefined),
      setAccountArchived: (accountId, archived) => mutate(() => repository.setAccountArchived(accountId, archived)),
      deleteAccount: (accountId) => mutate(() => repository.deleteAccount(accountId)),
      restoreAccount: (accountId) => mutate(() => repository.restoreAccount(accountId)),
      saveProject: (input) => mutate(() => repository.saveProject(input)).then(() => undefined),
      deleteProject: (projectId) => mutate(() => repository.deleteProject(projectId)),
      restoreProject: (projectId) => mutate(() => repository.restoreProject(projectId)),
      createKpi: (projectId, label, unit, aggregation) =>
        mutate(() => repository.createKpi(projectId, label, unit, aggregation)),
      updateKpi: (kpiId, label, unit, aggregation) =>
        mutate(() => repository.updateKpi(kpiId, label, unit, aggregation)),
      deleteKpi: (kpiId) => mutate(() => repository.deleteKpi(kpiId)),
      restoreKpi: (kpiId) => mutate(() => repository.restoreKpi(kpiId)),
      recordKpi: (kpiId, amount, note) => mutate(() => repository.recordKpi(kpiId, amount, note)),
      updateKpiRecord: (recordId, amount, note) =>
        mutate(() => repository.updateKpiRecord(recordId, amount, note)),
      deleteKpiRecord: (recordId) => mutate(() => repository.deleteKpiRecord(recordId)),
      restoreKpiRecord: (recordId) => mutate(() => repository.restoreKpiRecord(recordId)),
      saveWeeklyPlan: (weekStart, values, source = 'app', note = null) =>
        mutate(() => repository.saveWeeklyPlan(weekStart, values, source, note)),
      copyPreviousWeek: (weekStart) => mutate(() => repository.copyPreviousWeek(weekStart)),
      closeDay: (day, planned, actual, snapshotJson, note) =>
        mutate(() => repository.closeDay(day, planned, actual, snapshotJson, note)),
      setSetting: (key, settingValue) =>
        mutate(() => repository.setSetting(key, settingValue)),
      setSettings: (settingValues) =>
        mutate(() => repository.setSettings(settingValues)),
      getWeeklyComment: (weekStart) => repository.getWeeklyComment(weekStart),
      saveWeeklyComment: (weekStart, comment) => mutate(
        () => repository.saveWeeklyComment(weekStart, comment),
        { refresh: false },
      ),
      exportJson: () =>
        mutate(async () => {
          const tables = await repository.exportTables();
          await shareFullJson(tables);
        }, { refresh: false, signalSync: false }),
      exportCsv: (tableName) =>
        mutate(async () => {
          const tables = await repository.exportTables();
          const table = tables[tableName];
          if (!table) throw new Error(`내보낼 테이블을 찾을 수 없습니다: ${tableName}`);
          await shareTableCsv(tableName, table);
        }, { refresh: false, signalSync: false }),
      requestNotifications: () =>
        mutate(async () => {
          const granted = await requestNotificationPermission(repository);
          if (granted) {
            const today = dateKey(new Date());
            const todayClosed = snapshot.closures.some((closure) => closure.date === today);
            await ensureNotificationSchedule(
              repository,
              todayClosed,
              snapshot.items,
              snapshot.schedules,
              snapshot.entries,
              snapshot.settings,
            );
          }
          return granted;
        }, { refresh: false, signalSync: false }),
      testNotification: () => mutate(
        () => scheduleTestNotification(repository),
        { refresh: false, signalSync: false },
      ),
      resetAllData: () => mutate(async () => {
        const result = await resetNotificationSchedules(
          (identifiers) => repository.resetAllData(identifiers),
          () => repository.setSetting('notification_cleanup_pending', '[]'),
        );
        completedNotificationSchedule.current = null;
        pendingNotificationSchedule.current = null;
        return result.notificationCleanupPending;
      }).then((notificationCleanupPending) => {
        if (notificationCleanupPending) {
          setError('데이터 초기화는 완료됐고 이전 알림 예약은 다음 실행에서 다시 정리합니다.');
        }
      }),
    }),
    [busy, error, loading, mutate, refresh, repository, snapshot],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp은 AppProvider 안에서 사용해야 합니다.');
  return value;
}
