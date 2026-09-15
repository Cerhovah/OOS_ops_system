import type { SQLiteDatabase } from 'expo-sqlite';

import {
  BACKUP_PROFILE_ID,
  BACKUP_PROFILE_NAME,
  PRACTICE_PROFILE_ID,
  PRACTICE_PROFILE_NAME,
} from '@/data/profile-constants';
import { dateKey, weekRange } from '@/domain/calculations';

export const PROFILE_SEED_TIME = '2026-09-13T13:30:00.000Z';

export const practiceWorkspaceSeeds = [
  {
    accountId: 'practice-account-transfer',
    accountName: '편입',
    itemId: 'practice-item-transfer',
    itemName: '편입 공부',
    color: '#6F8F83',
    dailyMinutes: 4 * 60,
    weeklyMinutes: 25 * 60,
  },
  {
    accountId: 'practice-account-codyssey',
    accountName: '코디세이 미션',
    itemId: 'practice-item-codyssey',
    itemName: '미션 수행',
    color: '#7887A6',
    dailyMinutes: 3 * 60,
    weeklyMinutes: 12 * 60,
  },
  {
    accountId: 'practice-account-business',
    accountName: '사업',
    itemId: 'practice-item-business',
    itemName: '사업 실행',
    color: '#9A806B',
    dailyMinutes: 3 * 60,
    weeklyMinutes: 18 * 60,
  },
  {
    accountId: 'practice-account-monetization',
    accountName: '수익화',
    itemId: 'practice-item-monetization',
    itemName: '수익화 실행',
    color: '#7D7697',
    dailyMinutes: 2 * 60,
    weeklyMinutes: 10 * 60,
  },
] as const;

export async function seedProfilesAndPracticeWorkspace(database: SQLiteDatabase): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO profiles (id,name,sort_order,created_at,updated_at)
     VALUES (?,?,?,?,?)`,
    BACKUP_PROFILE_ID,
    BACKUP_PROFILE_NAME,
    0,
    PROFILE_SEED_TIME,
    PROFILE_SEED_TIME,
  );
  await database.runAsync(
    `INSERT OR IGNORE INTO profiles (id,name,sort_order,created_at,updated_at)
     VALUES (?,?,?,?,?)`,
    PRACTICE_PROFILE_ID,
    PRACTICE_PROFILE_NAME,
    1,
    PROFILE_SEED_TIME,
    PROFILE_SEED_TIME,
  );

  for (const [sortOrder, seed] of practiceWorkspaceSeeds.entries()) {
    await database.runAsync(
      `INSERT OR IGNORE INTO accounts
       (id,name,color,kind,sort_order,archived,created_at,updated_at,profile_id,weekly_target_minutes)
       VALUES (?,?,?,?,?,0,?,?,?,?)`,
      seed.accountId,
      seed.accountName,
      seed.color,
      '실사용',
      sortOrder,
      PROFILE_SEED_TIME,
      PROFILE_SEED_TIME,
      PRACTICE_PROFILE_ID,
      seed.weeklyMinutes,
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO items
       (id,account_id,project_id,name,type,unit,level_min,level_target,level_max,
        default_duration_min,count_on_complete,sort_order,archived,created_at,updated_at)
       VALUES (?,?,NULL,?,'time',NULL,NULL,?,?,60,0,?,0,?,?)`,
      seed.itemId,
      seed.accountId,
      seed.itemName,
      seed.dailyMinutes,
      seed.dailyMinutes,
      sortOrder,
      PROFILE_SEED_TIME,
      PROFILE_SEED_TIME,
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO item_schedules
       (id,item_id,weekday_mask,planned_value,start_time,auto_create,created_at,updated_at)
       VALUES (?,?,127,?,NULL,1,?,?)`,
      `practice-schedule-${sortOrder}`,
      seed.itemId,
      seed.dailyMinutes,
      PROFILE_SEED_TIME,
      PROFILE_SEED_TIME,
    );
  }

  const weekStart = weekRange(dateKey(new Date())).start;
  const existingPracticePlan = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM weekly_plans WHERE profile_id=? AND week_start=? AND deleted_at IS NULL LIMIT 1',
    PRACTICE_PROFILE_ID,
    weekStart,
  );
  if (!existingPracticePlan) {
    const versionRow = await database.getFirstAsync<{ version: number | null }>(
      'SELECT MAX(version) AS version FROM weekly_plans WHERE week_start=?',
      weekStart,
    );
    const planId = `practice-plan-${weekStart}`;
    await database.runAsync(
      `INSERT INTO weekly_plans
       (id,week_start,version,note,source,created_at,updated_at,profile_id)
       VALUES (?,?,?,?,?,?,?,?)`,
      planId,
      weekStart,
      (versionRow?.version ?? 0) + 1,
      '연습용 프로필 기본 주간 상한',
      'app',
      PROFILE_SEED_TIME,
      PROFILE_SEED_TIME,
      PRACTICE_PROFILE_ID,
    );
    for (const seed of practiceWorkspaceSeeds) {
      await database.runAsync(
        `INSERT INTO weekly_plan_lines
         (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at)
         VALUES (?,?,?,?,?,?)`,
        `${planId}-${seed.accountId}`,
        planId,
        seed.accountId,
        seed.weeklyMinutes,
        PROFILE_SEED_TIME,
        PROFILE_SEED_TIME,
      );
    }
  }

  await database.runAsync(
    `INSERT INTO settings (key,value,updated_at) VALUES ('active_profile_id',?,?)
     ON CONFLICT(key) DO NOTHING`,
    PRACTICE_PROFILE_ID,
    PROFILE_SEED_TIME,
  );
}
