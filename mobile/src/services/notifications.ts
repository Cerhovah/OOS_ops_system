import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  APP_NAME,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_ROUTE,
} from '@/constants/app';
import type { AppRepository } from '@/data/repository';
import type { Entry, Item, ItemSchedule } from '@/types/domain';

import {
  createNotificationContent,
  prepareNotificationRuntime,
  reconcileNotificationSchedule,
} from './notification-scheduler';

let notificationScheduleQueue: Promise<void> = Promise.resolve();

function enqueueNotificationScheduleOperation<Result>(operation: () => Promise<Result>): Promise<Result> {
  const queued = notificationScheduleQueue.then(operation);
  notificationScheduleQueue = queued.then(() => undefined, () => undefined);
  return queued;
}

export function ensureNotificationSchedule(
  repository: AppRepository,
  todayClosed: boolean,
  items: readonly Item[] = [],
  schedules: readonly ItemSchedule[] = [],
  entries: readonly Entry[] = [],
  settings: Readonly<Record<string, string>> = {},
): Promise<void> {
  return enqueueNotificationScheduleOperation(
    () => reconcileNotificationSchedule(repository, todayClosed, items, schedules, entries, settings),
  );
}

export async function requestNotificationPermission(repository: AppRepository): Promise<boolean> {
  await prepareNotificationRuntime();
  const permission = await Notifications.requestPermissionsAsync();
  await repository.setSetting('notification_permission_requested', '1');
  return permission.granted;
}

async function scheduleTestNotificationNow(repository: AppRepository): Promise<string> {
  await prepareNotificationRuntime();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  await repository.setSetting('notification_permission_requested', '1');
  if (!permission.granted) throw new Error('알림 권한이 허용되지 않았습니다.');

  return Notifications.scheduleNotificationAsync({
    content: createNotificationContent('30초 뒤 알림 테스트입니다. 오늘 종료 열기 버튼이나 알림 본문을 누르십시오.'),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

export function scheduleTestNotification(repository: AppRepository): Promise<string> {
  return enqueueNotificationScheduleOperation(() => scheduleTestNotificationNow(repository));
}

async function scheduleTimerLimitNotificationNow(
  repository: AppRepository,
  entryId: string,
  item: Item,
): Promise<void> {
  if (item.levelMax === null || item.levelMax <= 0) return;
  if ((await repository.getSetting('timer_limit_notifications_enabled')) !== '1') return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: APP_NAME,
      body: `${item.name} · 상한 ${item.levelMax}분에 도달했습니다. 타이머는 계속 실행됩니다.`,
      data: { url: '/', itemId: item.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + item.levelMax * 60_000),
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
  try {
    await repository.setSetting(`timer_notification:${entryId}`, identifier);
  } catch (caught) {
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
    throw caught;
  }
}

export function scheduleTimerLimitNotification(
  repository: AppRepository,
  entryId: string,
  item: Item,
): Promise<void> {
  return enqueueNotificationScheduleOperation(
    () => scheduleTimerLimitNotificationNow(repository, entryId, item),
  );
}

async function cancelTimerLimitNotificationNow(repository: AppRepository, entryId: string): Promise<void> {
  const identifier = await repository.getSetting(`timer_notification:${entryId}`);
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  await repository.setSetting(`timer_notification:${entryId}`, '');
}

export function cancelTimerLimitNotification(repository: AppRepository, entryId: string): Promise<void> {
  return enqueueNotificationScheduleOperation(
    () => cancelTimerLimitNotificationNow(repository, entryId),
  );
}

export interface NotificationResetResult {
  notificationCleanupPending: boolean;
}

export function resetNotificationSchedules(
  resetDatabase: (notificationCleanupIdentifiers: readonly string[]) => Promise<void>,
  clearPendingIdentifiers: () => Promise<void>,
): Promise<NotificationResetResult> {
  return enqueueNotificationScheduleOperation(
    async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const identifiers = scheduled.map((request) => request.identifier);
      await resetDatabase(identifiers);
      if (identifiers.length === 0) return { notificationCleanupPending: false };
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await clearPendingIdentifiers();
        return { notificationCleanupPending: false };
      } catch {
        return { notificationCleanupPending: true };
      }
    },
  );
}

function redirect(notification: Notifications.Notification): void {
  const url = notification.request.content.data?.url;
  if (url === NOTIFICATION_ROUTE) router.push('/today/close');
  if (url === '/') {
    const itemId = notification.request.content.data?.itemId;
    router.push({ pathname: '/', params: typeof itemId === 'string' ? { itemId } : {} });
  }
}

export function observeNotificationNavigation(): () => void {
  const response = Notifications.getLastNotificationResponse();
  if (response?.notification) {
    redirect(response.notification);
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((next) => {
    redirect(next.notification);
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
  });
  return () => subscription.remove();
}
