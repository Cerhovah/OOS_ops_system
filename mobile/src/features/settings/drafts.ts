import type { Item, ItemInput, ItemSchedule, ItemType } from '@/types/domain';

type ToggleValue = '0' | '1';

interface EditableDraft<T> {
  value: T;
  dirty: boolean;
  hydrated: boolean;
}

export interface GeneralSettingsDraft {
  weekStartDay: string;
  dayEnd: string;
  notificationTime: string;
  notificationEnabled: ToggleValue;
  notificationAlways: ToggleValue;
  timerNotifications: ToggleValue;
}

export interface AiSettingsDraft {
  rangeWeeks: string;
  includeNotes: ToggleValue;
}

export interface ItemDraft {
  name: string;
  type: ItemType;
  accountId: string;
  projectId: string;
  unit: string;
  levelMin: string;
  levelTarget: string;
  levelMax: string;
  duration: string;
  countOnComplete: ToggleValue;
  weekdayMask: number;
  plannedValue: string;
  startTime: string;
  notificationEnabled: ToggleValue;
}

export const DEFAULT_GENERAL_SETTINGS_DRAFT: GeneralSettingsDraft = {
  weekStartDay: '0',
  dayEnd: '23:00',
  notificationTime: '21:30',
  notificationEnabled: '1',
  notificationAlways: '0',
  timerNotifications: '0',
};

export const DEFAULT_AI_SETTINGS_DRAFT: AiSettingsDraft = {
  rangeWeeks: '4',
  includeNotes: '1',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toggleValue(value: string | undefined, fallback: ToggleValue): ToggleValue {
  if (value === '0' || value === '1') return value;
  return fallback;
}

function nullableNumber(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

export function createEditableDraft<T>(value: T): EditableDraft<T> {
  return { value, dirty: false, hydrated: false };
}

export function hydrateEditableDraft<T>(current: EditableDraft<T>, value: T): EditableDraft<T> {
  if (current.dirty) return current;
  return { value, dirty: false, hydrated: true };
}

export function patchEditableDraft<T>(current: EditableDraft<T>, patch: Partial<T>): EditableDraft<T> {
  return {
    value: { ...current.value, ...patch },
    dirty: true,
    hydrated: true,
  };
}

export function markEditableDraftSaved<T>(current: EditableDraft<T>, savedValue = current.value): EditableDraft<T> {
  if (current.value !== savedValue) return current;
  return { ...current, dirty: false, hydrated: true };
}

export function generalSettingsDraftFrom(settings: Readonly<Record<string, string>>): GeneralSettingsDraft {
  return {
    weekStartDay: settings.week_start_day ?? DEFAULT_GENERAL_SETTINGS_DRAFT.weekStartDay,
    dayEnd: settings.day_end_time ?? DEFAULT_GENERAL_SETTINGS_DRAFT.dayEnd,
    notificationTime: settings.close_notification_time ?? DEFAULT_GENERAL_SETTINGS_DRAFT.notificationTime,
    notificationEnabled: toggleValue(
      settings.close_notification_enabled,
      DEFAULT_GENERAL_SETTINGS_DRAFT.notificationEnabled,
    ),
    notificationAlways: toggleValue(
      settings.notification_always,
      DEFAULT_GENERAL_SETTINGS_DRAFT.notificationAlways,
    ),
    timerNotifications: toggleValue(
      settings.timer_limit_notifications_enabled,
      DEFAULT_GENERAL_SETTINGS_DRAFT.timerNotifications,
    ),
  };
}

export function aiSettingsDraftFrom(settings: Readonly<Record<string, string>>): AiSettingsDraft {
  return {
    rangeWeeks: settings.analysis_range_weeks ?? DEFAULT_AI_SETTINGS_DRAFT.rangeWeeks,
    includeNotes: toggleValue(settings.analysis_include_notes, DEFAULT_AI_SETTINGS_DRAFT.includeNotes),
  };
}

export function itemDraftFrom(
  item: Item | 'new',
  defaultAccountId: string,
  schedule: ItemSchedule | null,
  notificationSetting: string | undefined,
): ItemDraft {
  return {
    name: item === 'new' ? '' : item.name,
    type: item === 'new' ? 'time' : item.type,
    accountId: item === 'new' ? defaultAccountId : item.accountId,
    projectId: item === 'new' ? '' : item.projectId ?? '',
    unit: item === 'new' ? '' : item.unit ?? '',
    levelMin: item === 'new' ? '' : item.levelMin?.toString() ?? '',
    levelTarget: item === 'new' ? '' : item.levelTarget?.toString() ?? '',
    levelMax: item === 'new' ? '' : item.levelMax?.toString() ?? '',
    duration: item === 'new' ? '' : item.defaultDurationMin?.toString() ?? '',
    countOnComplete: item === 'new' || !item.countOnComplete ? '0' : '1',
    weekdayMask: schedule?.weekdayMask ?? 0,
    plannedValue: schedule?.plannedValue?.toString() ?? '',
    startTime: schedule?.startTime ?? '',
    notificationEnabled: item === 'new' ? '0' : toggleValue(notificationSetting, '0'),
  };
}

export function isItemDraftValid(draft: ItemDraft): boolean {
  const numbers = [draft.levelMin, draft.levelTarget, draft.levelMax, draft.duration, draft.plannedValue]
    .filter((value) => value.trim() !== '')
    .map(Number);
  return Boolean(draft.name.trim() && draft.accountId)
    && numbers.every(Number.isFinite)
    && (draft.startTime === '' || TIME_PATTERN.test(draft.startTime));
}

export function itemInputFromDraft(item: Item | 'new', draft: ItemDraft): ItemInput {
  return {
    id: item === 'new' ? undefined : item.id,
    name: draft.name.trim(),
    accountId: draft.accountId,
    projectId: draft.projectId || null,
    type: draft.type,
    unit: draft.unit.trim() || null,
    levelMin: nullableNumber(draft.levelMin),
    levelTarget: nullableNumber(draft.levelTarget),
    levelMax: nullableNumber(draft.levelMax),
    defaultDurationMin: nullableNumber(draft.duration),
    countOnComplete: draft.countOnComplete === '1',
    weekdayMask: draft.weekdayMask,
    plannedValue: nullableNumber(draft.plannedValue),
    startTime: draft.startTime || null,
    autoCreate: draft.weekdayMask > 0,
  };
}
