import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { PlanSource } from '@/types/domain';

interface AppendWeeklyPlanInput {
  weekStart: string;
  minutesByAccount: Readonly<Record<string, number>>;
  source: PlanSource;
  note: string | null;
  now?: string;
}

export async function appendWeeklyPlanVersion(
  database: SQLiteDatabase,
  input: AppendWeeklyPlanInput,
): Promise<number> {
  const current = await database.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM weekly_plans WHERE week_start=?',
    input.weekStart,
  );
  const version = (current?.version ?? 0) + 1;
  const planId = randomUUID();
  const now = input.now ?? new Date().toISOString();
  await database.runAsync(
    'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
    planId,
    input.weekStart,
    version,
    input.note,
    input.source,
    now,
    now,
  );
  for (const [accountId, minutes] of Object.entries(input.minutesByAccount)) {
    await database.runAsync(
      'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      randomUUID(),
      planId,
      accountId,
      Math.round(minutes),
      now,
      now,
    );
  }
  return version;
}
