import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppRepository } from '@/data/repository';
import type { Entry, Item, ItemSchedule } from '@/types/domain';

import { notificationScheduleFingerprint } from './notification-policy';
import {
  cancelTimerLimitNotification,
  ensureNotificationSchedule,
  observeNotificationNavigation,
  requestNotificationPermission,
  resetNotificationSchedules,
  scheduleTestNotification,
  scheduleTimerLimitNotification,
} from './notifications';

const notificationState = vi.hoisted(() => ({
  cancelled: [] as string[],
  handler: null as { handleNotification: () => Promise<Record<string, boolean>> } | null,
  lastResponse: null as { notification: unknown } | null,
  listener: null as ((response: { notification: unknown }) => void) | null,
  permission: { granted: true },
  requests: [] as Record<string, unknown>[],
}));

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));

vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));

vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 'HIGH' },
  AndroidNotificationPriority: { HIGH: 'HIGH' },
  AndroidNotificationVisibility: { PRIVATE: 'PRIVATE' },
  SchedulableTriggerInputTypes: { DAILY: 'DAILY', DATE: 'DATE', TIME_INTERVAL: 'TIME_INTERVAL', WEEKLY: 'WEEKLY' },
  addNotificationResponseReceivedListener: vi.fn((listener: (response: { notification: unknown }) => void) => {
    notificationState.listener = listener;
    return { remove: vi.fn() };
  }),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => undefined),
  cancelScheduledNotificationAsync: vi.fn(async (identifier: string) => {
    notificationState.cancelled.push(identifier);
  }),
  clearLastNotificationResponseAsync: vi.fn(async () => undefined),
  getAllScheduledNotificationsAsync: vi.fn(async () => [{ identifier: 'old-close' }]),
  getLastNotificationResponse: vi.fn(() => notificationState.lastResponse),
  getPermissionsAsync: vi.fn(async () => notificationState.permission),
  requestPermissionsAsync: vi.fn(async () => notificationState.permission),
  scheduleNotificationAsync: vi.fn(async (request: Record<string, unknown>) => {
    notificationState.requests.push(request);
    return `scheduled-${notificationState.requests.length}`;
  }),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  setNotificationCategoryAsync: vi.fn(async () => undefined),
  setNotificationHandler: vi.fn((handler: { handleNotification: () => Promise<Record<string, boolean>> }) => {
    notificationState.handler = handler;
  }),
}));

function repositoryWith(initial: Record<string, string> = {}): {
  repository: AppRepository;
  settings: Map<string, string>;
} {
  const settings = new Map(Object.entries(initial));
  return {
    repository: {
      getSetting: async (key: string) => settings.get(key) ?? null,
      setSetting: async (key: string, value: string) => { settings.set(key, value); },
    } as unknown as AppRepository,
    settings,
  };
}

const scheduledItem: Item = {
  id: 'item-1',
  accountId: 'account-1',
  projectId: null,
  name: '통학',
  type: 'time',
  unit: null,
  levelMin: null,
  levelTarget: 225,
  levelMax: 30,
  defaultDurationMin: 225,
  countOnComplete: false,
  sortOrder: 0,
  archived: false,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  deletedAt: null,
};

const itemSchedule: ItemSchedule = {
  id: 'schedule-1',
  itemId: scheduledItem.id,
  weekdayMask: (1 << 0) | (1 << 6),
  plannedValue: 225,
  startTime: '08:15',
  autoCreate: true,
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  deletedAt: null,
};

const stoppedTimer: Entry = {
  id: 'entry-stopped',
  itemId: scheduledItem.id,
  accountId: scheduledItem.accountId,
  type: 'time',
  startedAt: '2026-08-23T01:00:00.000Z',
  endedAt: '2026-08-23T01:30:00.000Z',
  durationMin: 30,
  value: null,
  count: null,
  occurredAt: '2026-08-23T01:00:00.000Z',
  note: null,
  source: 'app',
  createdAt: '2026-08-23T01:00:00.000Z',
  updatedAt: '2026-08-23T01:30:00.000Z',
  deletedAt: null,
};

describe('notification scheduling', () => {
  beforeEach(() => {
    notificationState.cancelled = [];
    notificationState.lastResponse = null;
    notificationState.listener = null;
    notificationState.permission = { granted: true };
    notificationState.requests = [];
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('requests permission once and creates the default Android daily close schedule', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '1',
      close_notification_id: 'old-close',
      notification_permission_requested: '0',
    });

    await ensureNotificationSchedule(repository, false);

    await expect(notificationState.handler?.handleNotification()).resolves.toMatchObject({
      shouldPlaySound: true,
      shouldShowBanner: true,
      shouldShowList: true,
    });
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('daily-records-v3', {
      name: '오늘 기록 알림',
      description: '오늘 종료, 항목 일정, 타이머 상한 알림',
      enableVibrate: true,
      importance: 'HIGH',
      lockscreenVisibility: 'PRIVATE',
      vibrationPattern: [0, 250, 250, 250],
    });
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('daily_close', [{
      identifier: 'open_close',
      buttonTitle: '오늘 종료 열기',
      options: { opensAppToForeground: true },
    }]);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledOnce();
    expect(notificationState.cancelled).toContain('old-close');
    expect(notificationState.requests[0]).toMatchObject({
      trigger: { type: 'DAILY', hour: 21, minute: 30, channelId: 'daily-records-v3' },
    });
    expect(settings.get('notification_permission_requested')).toBe('1');
    expect(JSON.parse(settings.get('close_notification_id')!)).toEqual(['scheduled-1']);
  });

  it('keeps daily close alerts across a rolling horizon after today is closed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00+09:00'));
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '1',
      close_notification_time: '20:45',
      notification_permission_requested: '1',
      notification_always: '0',
    });

    await ensureNotificationSchedule(repository, true);

    const triggers = notificationState.requests.map((request) => request.trigger as { type: string; date: Date });
    expect(triggers).toHaveLength(30);
    expect(triggers[0]).toMatchObject({ type: 'DATE' });
    expect(triggers[0].date.toISOString()).toBe('2026-08-24T11:45:00.000Z');
    expect(triggers[1].date.toISOString()).toBe('2026-08-25T11:45:00.000Z');
    expect(triggers[29].date.toISOString()).toBe('2026-09-22T11:45:00.000Z');
    expect(JSON.parse(settings.get('close_notification_id')!)).toHaveLength(30);
  });

  it('keeps the recurring daily trigger when always-notify is enabled on a closed day', async () => {
    const { repository } = repositoryWith({
      close_notification_enabled: '1',
      close_notification_time: '20:45',
      notification_permission_requested: '1',
      notification_always: '1',
    });

    await ensureNotificationSchedule(repository, true);

    expect(notificationState.requests[0]).toMatchObject({
      trigger: { type: 'DAILY', hour: 20, minute: 45, channelId: 'daily-records-v3' },
    });
  });

  it('creates enabled weekly item schedules and a cancellable timer-limit alert', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00+09:00'));
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      'item_notification:item-1': '1',
      timer_limit_notifications_enabled: '1',
    });

    await ensureNotificationSchedule(repository, false, [scheduledItem], [itemSchedule]);
    expect(notificationState.requests.map((request) => request.trigger)).toEqual([
      { type: 'WEEKLY', weekday: 2, hour: 8, minute: 15, channelId: 'daily-records-v3' },
      { type: 'WEEKLY', weekday: 1, hour: 8, minute: 15, channelId: 'daily-records-v3' },
    ]);
    expect(JSON.parse(settings.get('item_notification_ids')!)).toEqual(['scheduled-1', 'scheduled-2']);

    await scheduleTimerLimitNotification(repository, 'entry-1', scheduledItem);
    expect(notificationState.requests[2]).toMatchObject({
      content: { data: { url: '/', itemId: 'item-1' } },
      trigger: { type: 'DATE', channelId: 'daily-records-v3' },
    });
    expect(settings.get('timer_notification:entry-1')).toBe('scheduled-3');
    await cancelTimerLimitNotification(repository, 'entry-1');
    expect(notificationState.cancelled).toContain('scheduled-3');
    expect(settings.get('timer_notification:entry-1')).toBe('');
  });

  it('serializes overlapping schedule reconciliation without orphaning the first item schedule', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      'item_notification:item-1': '1',
    });

    const first = ensureNotificationSchedule(repository, false, [scheduledItem], [itemSchedule]);
    const second = ensureNotificationSchedule(repository, false, [scheduledItem], [itemSchedule]);
    await Promise.all([first, second]);

    expect(notificationState.cancelled).toEqual(expect.arrayContaining(['scheduled-1', 'scheduled-2']));
    expect(JSON.parse(settings.get('item_notification_ids')!)).toEqual(['scheduled-3', 'scheduled-4']);
  });

  it('keeps partial item schedule identifiers recoverable after a scheduling failure', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      'item_notification:item-1': '1',
    });
    vi.mocked(Notifications.scheduleNotificationAsync)
      .mockImplementationOnce(async (request) => {
        notificationState.requests.push(request as unknown as Record<string, unknown>);
        return 'partial-item-id';
      })
      .mockImplementationOnce(async (request) => {
        notificationState.requests.push(request as unknown as Record<string, unknown>);
        throw new Error('schedule failed');
      });

    await expect(ensureNotificationSchedule(repository, false, [scheduledItem], [itemSchedule]))
      .rejects.toThrow('schedule failed');
    expect(JSON.parse(settings.get('item_notification_ids')!)).toEqual(['partial-item-id']);

    await ensureNotificationSchedule(repository, false, [scheduledItem], [itemSchedule]);
    expect(notificationState.cancelled).toContain('partial-item-id');
  });

  it('cancels a close or timer schedule whose identifier cannot be stored', async () => {
    const close = repositoryWith({
      close_notification_enabled: '1',
      notification_permission_requested: '1',
    });
    const setCloseSetting = close.repository.setSetting.bind(close.repository);
    vi.spyOn(close.repository, 'setSetting').mockImplementation(async (key, value) => {
      if (key === 'close_notification_id') throw new Error('close id write failed');
      await setCloseSetting(key, value);
    });

    await expect(ensureNotificationSchedule(close.repository, false)).rejects.toThrow('close id write failed');
    expect(notificationState.cancelled).toContain('scheduled-1');

    notificationState.cancelled = [];
    notificationState.requests = [];
    const timer = repositoryWith({ timer_limit_notifications_enabled: '1' });
    const setTimerSetting = timer.repository.setSetting.bind(timer.repository);
    vi.spyOn(timer.repository, 'setSetting').mockImplementation(async (key, value) => {
      if (key.startsWith('timer_notification:')) throw new Error('timer id write failed');
      await setTimerSetting(key, value);
    });

    await expect(scheduleTimerLimitNotification(timer.repository, 'entry-1', scheduledItem))
      .rejects.toThrow('timer id write failed');
    expect(notificationState.cancelled).toContain('scheduled-1');
  });

  it('fingerprints only inputs that change managed close and item schedules', () => {
    const settings = {
      close_notification_enabled: '1',
      close_notification_time: '21:30',
      notification_always: '0',
      'item_notification:item-1': '1',
      unrelated_setting: 'first',
    };
    const initial = notificationScheduleFingerprint(
      '2026-08-23', false, [scheduledItem], [itemSchedule], settings,
    );

    expect(notificationScheduleFingerprint(
      '2026-08-23', false, [scheduledItem], [itemSchedule], { ...settings, unrelated_setting: 'second' },
    )).toBe(initial);
    expect(notificationScheduleFingerprint(
      '2026-08-23', true, [scheduledItem], [itemSchedule], settings,
    )).not.toBe(initial);
    expect(notificationScheduleFingerprint(
      '2026-08-23', false, [{ ...scheduledItem, name: '변경된 항목' }], [itemSchedule], settings,
    )).not.toBe(initial);
  });

  it('keeps failed stale timer cleanup durable and retries it on the next reconciliation', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      'timer_notification:entry-stopped': 'stale-timer-id',
    });
    vi.mocked(Notifications.cancelScheduledNotificationAsync)
      .mockRejectedValueOnce(new Error('OS cancellation failed'));

    await expect(ensureNotificationSchedule(
      repository,
      false,
      [],
      [],
      [stoppedTimer],
      Object.fromEntries(settings),
    )).rejects.toThrow('종료된 타이머 알림 정리');
    expect(settings.get('timer_notification:entry-stopped')).toBe('stale-timer-id');

    await ensureNotificationSchedule(
      repository,
      false,
      [],
      [],
      [stoppedTimer],
      Object.fromEntries(settings),
    );
    expect(notificationState.cancelled).toContain('stale-timer-id');
    expect(settings.get('timer_notification:entry-stopped')).toBe('');
  });

  it('retries notification identifiers captured by a completed database reset', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      notification_cleanup_pending: JSON.stringify(['stale-a', 'stale-b']),
    });

    await ensureNotificationSchedule(repository, false, [], [], [], Object.fromEntries(settings));

    expect(notificationState.cancelled).toEqual(expect.arrayContaining(['stale-a', 'stale-b']));
    expect(settings.get('notification_cleanup_pending')).toBe('[]');
  });

  it('retains only failed reset-cleanup identifiers for another retry', async () => {
    const { repository, settings } = repositoryWith({
      close_notification_enabled: '0',
      notification_permission_requested: '1',
      notification_cleanup_pending: JSON.stringify(['stale-a', 'stale-b']),
    });
    vi.mocked(Notifications.cancelScheduledNotificationAsync)
      .mockRejectedValueOnce(new Error('first cancellation failed'));

    await expect(ensureNotificationSchedule(
      repository,
      false,
      [],
      [],
      [],
      Object.fromEntries(settings),
    )).rejects.toThrow('초기화 전 알림 예약 정리');
    expect(settings.get('notification_cleanup_pending')).toBe(JSON.stringify(['stale-a']));
    expect(notificationState.cancelled).toContain('stale-b');
  });

  it('supports explicit permission retry and routes close/item notification taps', async () => {
    const { repository, settings } = repositoryWith();
    expect(await requestNotificationPermission(repository)).toBe(true);
    expect(settings.get('notification_permission_requested')).toBe('1');

    notificationState.lastResponse = {
      notification: { request: { content: { data: { url: '/today/close' } } } },
    };
    const stop = observeNotificationNavigation();
    expect(router.push).toHaveBeenCalledWith('/today/close');
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledOnce();

    notificationState.listener?.({
      notification: { request: { content: { data: { url: '/', itemId: 'item-1' } } } },
    });
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/', params: { itemId: 'item-1' } });
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(2);
    stop();
  });

  it('can schedule multiple same-day one-off tests without changing the daily schedule', async () => {
    const { repository, settings } = repositoryWith({ close_notification_id: 'daily-id' });

    expect(await scheduleTestNotification(repository)).toBe('scheduled-1');
    expect(await scheduleTestNotification(repository)).toBe('scheduled-2');

    expect(notificationState.requests).toHaveLength(2);
    expect(notificationState.requests[0]).toMatchObject({
      content: {
        categoryIdentifier: 'daily_close',
        data: { url: '/today/close' },
        priority: 'HIGH',
        sound: 'default',
      },
      trigger: { type: 'TIME_INTERVAL', seconds: 30, channelId: 'daily-records-v3' },
    });
    expect(settings.get('close_notification_id')).toBe('daily-id');
  });

  it('resets the database before cancelling every captured OS schedule', async () => {
    const resetDatabase = vi.fn(async () => undefined);
    const clearPending = vi.fn(async () => undefined);

    await expect(resetNotificationSchedules(resetDatabase, clearPending)).resolves.toEqual({
      notificationCleanupPending: false,
    });
    expect(resetDatabase).toHaveBeenCalledWith(['old-close']);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledOnce();
    expect(clearPending).toHaveBeenCalledOnce();
  });

  it('leaves OS schedules intact when reset listing or the database reset fails', async () => {
    const resetDatabase = vi.fn(async () => undefined);
    const clearPending = vi.fn(async () => undefined);
    vi.mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockRejectedValueOnce(new Error('OS listing failed'));

    await expect(resetNotificationSchedules(resetDatabase, clearPending)).rejects.toThrow('OS listing failed');
    expect(resetDatabase).not.toHaveBeenCalled();
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();

    vi.mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([{ identifier: 'old-close' }] as never);
    resetDatabase.mockRejectedValueOnce(new Error('database reset failed'));
    await expect(resetNotificationSchedules(resetDatabase, clearPending)).rejects.toThrow('database reset failed');
    expect(Notifications.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('keeps the atomically seeded cleanup manifest when OS cancellation fails after reset', async () => {
    const resetDatabase = vi.fn(async () => undefined);
    const clearPending = vi.fn(async () => undefined);
    vi.mocked(Notifications.cancelAllScheduledNotificationsAsync)
      .mockRejectedValueOnce(new Error('OS cancellation failed'));

    await expect(resetNotificationSchedules(resetDatabase, clearPending)).resolves.toEqual({
      notificationCleanupPending: true,
    });
    expect(resetDatabase).toHaveBeenCalledWith(['old-close']);
    expect(clearPending).not.toHaveBeenCalled();
  });

  it('keeps the cleanup manifest when clearing it fails after OS cancellation', async () => {
    const resetDatabase = vi.fn(async () => undefined);
    const clearPending = vi.fn(async () => {
      throw new Error('manifest clear failed');
    });

    await expect(resetNotificationSchedules(resetDatabase, clearPending)).resolves.toEqual({
      notificationCleanupPending: true,
    });
    expect(resetDatabase).toHaveBeenCalledWith(['old-close']);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledOnce();
    expect(clearPending).toHaveBeenCalledOnce();
  });
});
