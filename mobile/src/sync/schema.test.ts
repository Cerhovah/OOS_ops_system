import { describe, expect, it } from 'vitest';

import { isSyncableSetting, syncTableDefinitions } from './schema';

describe('local-first sync schema', () => {
  it('tracks every Phase 1-4 user-data table exactly once', () => {
    expect(syncTableDefinitions.map((definition) => definition.name)).toEqual([
      'accounts', 'projects', 'items', 'item_schedules', 'project_kpis', 'project_kpi_records',
      'weekly_plans', 'weekly_plan_lines', 'entries', 'day_notes', 'day_closures', 'weekly_comments',
      'today_item_additions', 'analysis_sessions', 'ai_proposals', 'settings',
    ]);
    expect(new Set(syncTableDefinitions.map((definition) => definition.name)).size).toBe(syncTableDefinitions.length);
  });

  it('syncs user preferences but excludes device-only notification state', () => {
    expect(isSyncableSetting('week_start_day')).toBe(true);
    expect(isSyncableSetting('item_notification:seed-item-study')).toBe(true);
    expect(isSyncableSetting('close_notification_id')).toBe(false);
    expect(isSyncableSetting('notification_permission_requested')).toBe(false);
    expect(isSyncableSetting('timer_notification:entry-id')).toBe(false);
    expect(isSyncableSetting('ai_provider')).toBe(true);
    expect(isSyncableSetting('ai_model')).toBe(true);
    expect(isSyncableSetting('analysis_range_weeks')).toBe(true);
  });
});
