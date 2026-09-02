import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppRepository } from '@/data/repository';
import type { Item, ItemSchedule } from '@/types/domain';

import {
  cancelTimerLimitNotification,
  ensureNotificationSchedule,
  observeNotificationNavigation,
  requestNotificationPermission,
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
  AndroidNotificationVisibility: { PUBLIC: 'PUBLIC' },
  SchedulableTriggerInputTypes: { DAILY: 'DAILY', DATE: 'DATE', TIME_INTERVAL: 'TIME_INTERVAL', WEEKLY: 'WEEKLY' },
  addNotificationResponseReceivedListener: vi.fn((listener: (response: { notification: unknown }) => void) => {
    notificationState.listener = listener;
    return { remove: vi.fn() };
  }),
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
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('daily-records-v2', {
      name: '오늘 기록 알림',
      description: '오늘 종료, 항목 일정, 타이머 상한 알림',
      enableVibrate: true,
      importance: 'HIGH',
      lockscreenVisibility: 'PUBLIC',
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
      trigger: { type: 'DAILY', hour: 21, minute: 30, channelId: 'daily-records-v2' },
    });
    expect(settings.get('notification_permission_requested')).toBe('1');
    expect(settings.get('close_notification_id')).toBe('scheduled-1');
  });

  it('moves a closed-day alert to tomorrow unless always-notify is enabled', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00+09:00'));
    const { repository } = repositoryWith({
      close_notification_enabled: '1',
      close_notification_time: '20:45',
      notification_permission_requested: '1',
      notification_always: '0',
    });

    await ensureNotificationSchedule(repository, true);

    const trigger = notificationState.requests[0].trigger as { type: string; date: Date };
    expect(trigger.type).toBe('DATE');
    expect(trigger.date.toISOString()).toBe('2026-08-24T11:45:00.000Z');
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
      { type: 'WEEKLY', weekday: 2, hour: 8, minute: 15, channelId: 'daily-records-v2' },
      { type: 'WEEKLY', weekday: 1, hour: 8, minute: 15, channelId: 'daily-records-v2' },
    ]);
    expect(JSON.parse(settings.get('item_notification_ids')!)).toEqual(['scheduled-1', 'scheduled-2']);

    await scheduleTimerLimitNotification(repository, 'entry-1', scheduledItem);
    expect(notificationState.requests[2]).toMatchObject({
      content: { data: { url: '/', itemId: 'item-1' } },
      trigger: { type: 'DATE', channelId: 'daily-records-v2' },
    });
    expect(settings.get('timer_notification:entry-1')).toBe('scheduled-3');
    await cancelTimerLimitNotification(repository, 'entry-1');
    expect(notificationState.cancelled).toContain('scheduled-3');
    expect(settings.get('timer_notification:entry-1')).toBe('');
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
      trigger: { type: 'TIME_INTERVAL', seconds: 30, channelId: 'daily-records-v2' },
    });
    expect(settings.get('close_notification_id')).toBe('daily-id');
  });
});
