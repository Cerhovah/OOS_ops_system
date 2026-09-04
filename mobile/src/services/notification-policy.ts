import { DEFAULT_CLOSE_NOTIFICATION_TIME } from '@/constants/app';
import type { Entry, Item, ItemSchedule } from '@/types/domain';

export function staleTimerNotificationSettings(
  entries: readonly Entry[],
  settings: Readonly<Record<string, string>>,
): [key: string, identifier: string][] {
  const activeTimerIds = new Set(
    entries
      .filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt)
      .map((entry) => entry.id),
  );
  return Object.entries(settings)
    .filter(([key, identifier]) => (
      key.startsWith('timer_notification:')
      && identifier.length > 0
      && !activeTimerIds.has(key.slice('timer_notification:'.length))
    ))
    .sort(([left], [right]) => left.localeCompare(right));
}

export function notificationScheduleFingerprint(
  today: string,
  todayClosed: boolean,
  items: readonly Item[],
  schedules: readonly ItemSchedule[],
  settings: Readonly<Record<string, string>>,
  entries: readonly Entry[] = [],
): string {
  const activeItems = items
    .filter((item) => !item.deletedAt && !item.archived)
    .map((item) => [item.id, item.name, settings[`item_notification:${item.id}`] ?? '0'] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  const activeItemIds = new Set(activeItems.map(([id]) => id));
  const activeSchedules = schedules
    .filter((schedule) => !schedule.deletedAt && schedule.startTime && activeItemIds.has(schedule.itemId))
    .map((schedule) => [schedule.id, schedule.itemId, schedule.weekdayMask, schedule.startTime] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    today,
    todayClosed,
    closeEnabled: settings.close_notification_enabled ?? '0',
    closeTime: settings.close_notification_time ?? DEFAULT_CLOSE_NOTIFICATION_TIME,
    always: settings.notification_always ?? '0',
    activeItems,
    activeSchedules,
    pendingCleanup: settings.notification_cleanup_pending ?? '[]',
    staleTimerNotifications: staleTimerNotificationSettings(entries, settings),
  });
}
