import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  APP_NAME,
  DEFAULT_CLOSE_NOTIFICATION_TIME,
  NOTIFICATION_ACTION_ID,
  NOTIFICATION_CATEGORY_ID,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_ROUTE,
} from '@/constants/app';
import type { AppRepository } from '@/data/repository';
import { addDays, dateKey } from '@/domain/calculations';
import type { Entry, Item, ItemSchedule } from '@/types/domain';

import { staleTimerNotificationSettings } from './notification-policy';

const CLOSED_DAY_NOTIFICATION_HORIZON_DAYS = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function createNotificationContent(
  body = '오늘 기록이 아직 끝나지 않았습니다. 탭하면 오늘 종료로 이동합니다.',
): Notifications.NotificationContentInput {
  return {
    title: APP_NAME,
    body,
    categoryIdentifier: NOTIFICATION_CATEGORY_ID,
    data: { url: NOTIFICATION_ROUTE },
    priority: Notifications.AndroidNotificationPriority.HIGH,
    sound: 'default',
  };
}

export async function prepareNotificationRuntime(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_ID, [
    {
      identifier: NOTIFICATION_ACTION_ID,
      buttonTitle: '오늘 종료 열기',
      options: { opensAppToForeground: true },
    },
  ]);
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: '오늘 기록 알림',
    description: '오늘 종료, 항목 일정, 타이머 상한 알림',
    enableVibrate: true,
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function scheduleDaily(hour: number, minute: number): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: createNotificationContent(),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

async function scheduleOnDate(day: string, hour: number, minute: number): Promise<string> {
  const date = new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`);
  return Notifications.scheduleNotificationAsync({
    content: createNotificationContent(),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

async function scheduleClosedDayHorizon(hour: number, minute: number): Promise<string[]> {
  const today = dateKey(new Date());
  const identifiers: string[] = [];
  try {
    for (let offset = 1; offset <= CLOSED_DAY_NOTIFICATION_HORIZON_DAYS; offset += 1) {
      identifiers.push(await scheduleOnDate(addDays(today, offset), hour, minute));
    }
    return identifiers;
  } catch (caught) {
    await Promise.allSettled(
      identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
    );
    throw caught;
  }
}

function storedIdentifiers(raw: string | null, acceptLegacySingle: boolean): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((value): value is string => typeof value === 'string');
    if (acceptLegacySingle && typeof parsed === 'string') return [parsed];
  } catch {
    return acceptLegacySingle ? [raw] : [];
  }
  return [];
}

async function persistScheduledIdentifiers(
  repository: AppRepository,
  key: string,
  identifiers: readonly string[],
): Promise<void> {
  try {
    await repository.setSetting(key, JSON.stringify(identifiers));
  } catch (caught) {
    await Promise.allSettled(
      identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
    );
    throw caught;
  }
}

async function cancelStoredSchedule(repository: AppRepository): Promise<void> {
  const identifiers = storedIdentifiers(await repository.getSetting('close_notification_id'), true);
  if (identifiers.length === 0) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIdentifiers = new Set(scheduled.map((request) => request.identifier));
  await Promise.all(
    identifiers
      .filter((identifier) => scheduledIdentifiers.has(identifier))
      .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
  await repository.setSetting('close_notification_id', '');
}

async function cancelStoredItemSchedules(repository: AppRepository): Promise<void> {
  const identifiers = storedIdentifiers(await repository.getSetting('item_notification_ids'), false);
  await Promise.all(identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)));
  await repository.setSetting('item_notification_ids', '[]');
}

async function scheduleItemNotifications(
  repository: AppRepository,
  items: readonly Item[],
  schedules: readonly ItemSchedule[],
): Promise<void> {
  await cancelStoredItemSchedules(repository);
  const activeItems = new Map(items.filter((item) => !item.deletedAt && !item.archived).map((item) => [item.id, item]));
  const identifiers: string[] = [];
  try {
    for (const schedule of schedules) {
      if (schedule.deletedAt || !schedule.startTime || !activeItems.has(schedule.itemId)) continue;
      if ((await repository.getSetting(`item_notification:${schedule.itemId}`)) !== '1') continue;
      const item = activeItems.get(schedule.itemId)!;
      const [hour, minute] = schedule.startTime.split(':').map(Number);
      for (let index = 0; index < 7; index += 1) {
        if ((schedule.weekdayMask & (1 << index)) === 0) continue;
        identifiers.push(
          await Notifications.scheduleNotificationAsync({
            content: {
              title: APP_NAME,
              body: `${item.name} · 일정 시각`,
              data: { url: '/', itemId: item.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: ((index + 1) % 7) + 1,
              hour,
              minute,
              channelId: NOTIFICATION_CHANNEL_ID,
            },
          }),
        );
      }
    }
    await repository.setSetting('item_notification_ids', JSON.stringify(identifiers));
  } catch (caught) {
    try {
      await repository.setSetting('item_notification_ids', JSON.stringify(identifiers));
    } catch {
      await Promise.allSettled(
        identifiers.map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
      );
    }
    throw caught;
  }
}

async function cancelStaleTimerNotifications(
  repository: AppRepository,
  entries: readonly Entry[],
  settings: Readonly<Record<string, string>>,
): Promise<void> {
  const failures: unknown[] = [];
  for (const [key, identifier] of staleTimerNotificationSettings(entries, settings)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await repository.setSetting(key, '');
    } catch (caught) {
      failures.push(caught);
    }
  }
  if (failures.length > 0) throw new Error('종료된 타이머 알림 정리를 다시 시도해야 합니다.');
}

async function cancelPendingNotificationCleanup(
  repository: AppRepository,
  settings: Readonly<Record<string, string>>,
): Promise<void> {
  const pending = storedIdentifiers(settings.notification_cleanup_pending ?? null, false);
  if (pending.length === 0) return;
  const remaining: string[] = [];
  for (const identifier of pending) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      remaining.push(identifier);
    }
  }
  await repository.setSetting('notification_cleanup_pending', JSON.stringify(remaining));
  if (remaining.length > 0) throw new Error('초기화 전 알림 예약 정리를 다시 시도해야 합니다.');
}

export async function reconcileNotificationSchedule(
  repository: AppRepository,
  todayClosed: boolean,
  items: readonly Item[] = [],
  schedules: readonly ItemSchedule[] = [],
  entries: readonly Entry[] = [],
  settings: Readonly<Record<string, string>> = {},
): Promise<void> {
  await prepareNotificationRuntime();
  await cancelPendingNotificationCleanup(repository, settings);
  await cancelStaleTimerNotifications(repository, entries, settings);
  const requested = (await repository.getSetting('notification_permission_requested')) === '1';
  let permission = await Notifications.getPermissionsAsync();
  if (!requested) {
    permission = await Notifications.requestPermissionsAsync();
    await repository.setSetting('notification_permission_requested', '1');
  }
  if (!permission.granted) return;
  await cancelStoredSchedule(repository);
  if ((await repository.getSetting('close_notification_enabled')) === '1') {
    const [hour, minute] = (await repository.getSetting('close_notification_time') ?? DEFAULT_CLOSE_NOTIFICATION_TIME)
      .split(':')
      .map(Number);
    const always = (await repository.getSetting('notification_always')) === '1';
    const identifiers = todayClosed && !always
      ? await scheduleClosedDayHorizon(hour, minute)
      : [await scheduleDaily(hour, minute)];
    await persistScheduledIdentifiers(repository, 'close_notification_id', identifiers);
  }
  await scheduleItemNotifications(repository, items, schedules);
}
