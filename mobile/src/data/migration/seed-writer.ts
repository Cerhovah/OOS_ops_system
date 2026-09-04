import type { SQLiteDatabase } from 'expo-sqlite';

import {
  accountSeeds,
  itemSeeds,
  kpiSeeds,
  projectSeeds,
  scheduleSeeds,
  SEED_TIME,
  settingSeeds,
} from '@/data/migration/seed-manifest';
import { dateKey, weekRange } from '@/domain/calculations';

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM accounts');
  if ((count?.count ?? 0) > 0) return;
  const currentWeek = weekRange(dateKey(new Date())).start;
  const planColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(weekly_plans)');
  const hasSyncColumns = planColumns.some((column) => column.name === 'updated_at');

  for (const [id, name, color, kind, sortOrder] of accountSeeds) {
    await db.runAsync(
      'INSERT INTO accounts (id,name,color,kind,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      id,
      name,
      color,
      kind,
      sortOrder,
      SEED_TIME,
      SEED_TIME,
    );
  }
  for (const [id, name, description, currentExperiment, nextDecisionDate] of projectSeeds) {
    await db.runAsync(
      'INSERT INTO projects (id,name,description,current_experiment,next_decision_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
      id,
      name,
      description,
      currentExperiment,
      nextDecisionDate,
      SEED_TIME,
      SEED_TIME,
    );
  }
  for (const seed of itemSeeds) {
    await db.runAsync(
      `INSERT INTO items
        (id,account_id,project_id,name,type,unit,level_min,level_target,level_max,default_duration_min,count_on_complete,sort_order,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ...seed,
      SEED_TIME,
      SEED_TIME,
    );
  }
  for (const [id, itemId, weekdayMask, plannedValue] of scheduleSeeds) {
    await db.runAsync(
      'INSERT INTO item_schedules (id,item_id,weekday_mask,planned_value,auto_create,created_at,updated_at) VALUES (?,?,?,?,1,?,?)',
      id,
      itemId,
      weekdayMask,
      plannedValue,
      SEED_TIME,
      SEED_TIME,
    );
  }
  for (const seed of kpiSeeds) {
    await db.runAsync(
      'INSERT INTO project_kpis (id,project_id,key,label,unit,aggregation,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      ...seed,
      SEED_TIME,
      SEED_TIME,
    );
  }
  const planId = `seed-plan-${currentWeek}-v1`;
  if (hasSyncColumns) {
    await db.runAsync(
      'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at,updated_at) VALUES (?,?,1,NULL,?,?,?)',
      planId,
      currentWeek,
      'app',
      SEED_TIME,
      SEED_TIME,
    );
  } else {
    await db.runAsync(
      'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at) VALUES (?,?,1,NULL,?,?)',
      planId,
      currentWeek,
      'app',
      SEED_TIME,
    );
  }
  for (const [accountId, , , , , plannedMinutes] of accountSeeds) {
    if (hasSyncColumns) {
      await db.runAsync(
        'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at) VALUES (?,?,?,?,?,?)',
        `${planId}-${accountId}`,
        planId,
        accountId,
        plannedMinutes,
        SEED_TIME,
        SEED_TIME,
      );
    } else {
      await db.runAsync(
        'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes) VALUES (?,?,?,?)',
        `${planId}-${accountId}`,
        planId,
        accountId,
        plannedMinutes,
      );
    }
  }
  for (const [key, value] of settingSeeds) {
    await db.runAsync('INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)', key, value, SEED_TIME);
  }
}
