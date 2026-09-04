import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GENERAL_SETTINGS_DRAFT,
  createEditableDraft,
  generalSettingsDraftFrom,
  hydrateEditableDraft,
  isItemDraftValid,
  itemDraftFrom,
  itemInputFromDraft,
  markEditableDraftSaved,
  patchEditableDraft,
} from './drafts';
import type { Item, ItemSchedule } from '@/types/domain';

const item: Item = {
  id: 'item-1',
  accountId: 'account-1',
  projectId: 'project-1',
  name: '집중 작업',
  type: 'time',
  unit: '분',
  levelMin: 30,
  levelTarget: 60,
  levelMax: 90,
  defaultDurationMin: 45,
  countOnComplete: true,
  sortOrder: 0,
  archived: false,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  deletedAt: null,
};

const schedule: ItemSchedule = {
  id: 'schedule-1',
  itemId: item.id,
  weekdayMask: 5,
  plannedValue: 75,
  startTime: '09:30',
  autoCreate: true,
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
  deletedAt: null,
};

describe('settings drafts', () => {
  it('hydrates an untouched draft from a refreshed snapshot', () => {
    const initial = createEditableDraft(DEFAULT_GENERAL_SETTINGS_DRAFT);
    const refreshed = generalSettingsDraftFrom({ day_end_time: '22:10', close_notification_enabled: '0' });

    expect(hydrateEditableDraft(initial, refreshed)).toEqual({
      value: { ...DEFAULT_GENERAL_SETTINGS_DRAFT, dayEnd: '22:10', notificationEnabled: '0' },
      dirty: false,
      hydrated: true,
    });
  });

  it('does not overwrite edits when the background snapshot refreshes', () => {
    const initial = hydrateEditableDraft(
      createEditableDraft(DEFAULT_GENERAL_SETTINGS_DRAFT),
      generalSettingsDraftFrom({ day_end_time: '23:00' }),
    );
    const edited = patchEditableDraft(initial, { dayEnd: '21:45' });
    const backgroundValue = generalSettingsDraftFrom({ day_end_time: '20:00' });

    expect(hydrateEditableDraft(edited, backgroundValue)).toBe(edited);
    expect(markEditableDraftSaved(edited)).toMatchObject({ dirty: false, hydrated: true });

    const submitted = edited.value;
    const editedWhileSaving = patchEditableDraft(edited, { dayEnd: '19:30' });
    expect(markEditableDraftSaved(editedWhileSaving, submitted)).toBe(editedWhileSaving);
  });

  it('creates one typed item draft for both route and button entry points', () => {
    const draft = itemDraftFrom(item, 'fallback-account', schedule, '1');

    expect(draft).toMatchObject({
      name: '집중 작업',
      accountId: 'account-1',
      projectId: 'project-1',
      levelTarget: '60',
      duration: '45',
      weekdayMask: 5,
      plannedValue: '75',
      startTime: '09:30',
      notificationEnabled: '1',
    });
    expect(isItemDraftValid(draft)).toBe(true);
    expect(itemInputFromDraft(item, draft)).toEqual({
      id: 'item-1',
      name: '집중 작업',
      accountId: 'account-1',
      projectId: 'project-1',
      type: 'time',
      unit: '분',
      levelMin: 30,
      levelTarget: 60,
      levelMax: 90,
      defaultDurationMin: 45,
      countOnComplete: true,
      weekdayMask: 5,
      plannedValue: 75,
      startTime: '09:30',
      autoCreate: true,
    });
  });

  it('initializes a new item without retaining an earlier item draft', () => {
    const draft = itemDraftFrom('new', 'account-2', null, '1');

    expect(draft).toMatchObject({
      name: '',
      type: 'time',
      accountId: 'account-2',
      projectId: '',
      weekdayMask: 0,
      notificationEnabled: '0',
    });
    expect(isItemDraftValid({ ...draft, name: '새 항목' })).toBe(true);
    expect(isItemDraftValid({ ...draft, name: '새 항목', startTime: '24:00' })).toBe(false);
  });
});
