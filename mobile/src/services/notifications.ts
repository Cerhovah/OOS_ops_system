import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import {
  APP_NAME,
  DEFAULT_CLOSE_NOTIFICATION_TIME,
  NOTIFICATION_ACTION_ID,
  NOTIFICATION_CATEGORY_ID,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_ROUTE,
} from '@/constants/app';
import { addDays, dateKey } from '@/domain/calculations';
import type { AppRepository } from '@/data/repository';
import type { Item, ItemSchedule } from '@/types/domain';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function notificationContent(body = '오늘 기록이 아직 끝나지 않았습니다. 탭하면 오늘 종료로 이동합니다.'): Notifications.NotificationContentInput {
  return {
    title: APP_NAME,
    body,
    categoryIdentifier: NOTIFICATION_CATEGORY_ID,
    data: { url: NOTIFICATION_ROUTE },
    priority: Notifications.AndroidNotificationPriority.HIGH,
    sound: 'default',
  };
}

async function prepareAndroidChannel(): Promise<void> {
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
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function scheduleDaily(hour: number, minute: number): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: notificationContent(),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

async function scheduleTomorrow(hour: number, minute: number): Promise<string> {
  const tomorrow = addDays(dateKey(new Date()), 1);
  const date = new Date(`${tomorrow}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`);
  return Notifications.scheduleNotificationAsync({
    content: notificationContent(),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

async function cancelStoredSchedule(repository: AppRepository): Promise<void> {
  const identifier = await repository.getSetting('close_notification_id');
  if (!identifier) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((request) => request.identifier === identifier)) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
  await repository.setSetting('close_notification_id', '');
}

async function cancelStoredItemSchedules(repository: AppRepository): Promise<void> {
  const raw = await repository.getSetting('item_notification_ids');
  let identifiers: string[] = [];
  if (raw) {
    try {
      identifiers = (JSON.parse(raw) as unknown[]).filter((value): value is string => typeof value === 'string');
    } catch {
      identifiers = [];
    }
  }
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
}

export async function ensureNotificationSchedule(
  repository: AppRepository,
  todayClosed: boolean,
  items: readonly Item[] = [],
  schedules: readonly ItemSchedule[] = [],
): Promise<void> {
  await prepareAndroidChannel();
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
    const identifier = todayClosed && !always ? await scheduleTomorrow(hour, minute) : await scheduleDaily(hour, minute);
    await repository.setSetting('close_notification_id', identifier);
  }
  await scheduleItemNotifications(repository, items, schedules);
}

export async function requestNotificationPermission(repository: AppRepository): Promise<boolean> {
  await prepareAndroidChannel();
  const permission = await Notifications.requestPermissionsAsync();
  await repository.setSetting('notification_permission_requested', '1');
  return permission.granted;
}

export async function scheduleTestNotification(repository: AppRepository): Promise<string> {
  await prepareAndroidChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  await repository.setSetting('notification_permission_requested', '1');
  if (!permission.granted) throw new Error('알림 권한이 허용되지 않았습니다.');

  return Notifications.scheduleNotificationAsync({
    content: notificationContent('30초 뒤 알림 테스트입니다. 오늘 종료 열기 버튼이나 알림 본문을 누르십시오.'),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30,
      channelId: NOTIFICATION_CHANNEL_ID,
    },
  });
}

export async function scheduleTimerLimitNotification(
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
  await repository.setSetting(`timer_notification:${entryId}`, identifier);
}

export async function cancelTimerLimitNotification(repository: AppRepository, entryId: string): Promise<void> {
  const identifier = await repository.getSetting(`timer_notification:${entryId}`);
  if (!identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
  await repository.setSetting(`timer_notification:${entryId}`, '');
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
