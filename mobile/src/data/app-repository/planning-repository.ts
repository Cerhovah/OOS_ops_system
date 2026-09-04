import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { sqliteNumber, sqliteText, type SqlRow } from '@/data/sqlite-row';
import { appendWeeklyPlanVersion } from '@/data/weekly-plan-writer';
import { addDays } from '@/domain/calculations';
import type { PlanSource } from '@/types/domain';

export class PlanningRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async saveWeeklyPlan(
    weekStart: string,
    minutesByAccount: Readonly<Record<string, number>>,
    source: PlanSource = 'app',
    note: string | null = null,
  ): Promise<number> {
    let version = 1;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      version = await appendWeeklyPlanVersion(transaction, { weekStart, minutesByAccount, source, note });
    });
    return version;
  }

  async copyPreviousWeek(weekStart: string): Promise<boolean> {
    const previousStart = addDays(weekStart, -7);
    let copied = false;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const plan = await transaction.getFirstAsync<SqlRow>(
        'SELECT * FROM weekly_plans WHERE week_start=? AND deleted_at IS NULL ORDER BY version DESC LIMIT 1',
        previousStart,
      );
      if (!plan) return;
      const previousLines = await transaction.getAllAsync<SqlRow>(
        'SELECT * FROM weekly_plan_lines WHERE weekly_plan_id=? AND deleted_at IS NULL',
        sqliteText(plan, 'id'),
      );
      const values = Object.fromEntries(
        previousLines.map((line) => [sqliteText(line, 'account_id'), sqliteNumber(line, 'planned_minutes')]),
      );
      await appendWeeklyPlanVersion(transaction, {
        weekStart,
        minutesByAccount: values,
        source: 'copy_last_week',
        note: `지난주(${previousStart}) 계획 복사`,
      });
      copied = true;
    });
    return copied;
  }

  async closeDay(
    day: string,
    plannedMinutes: number,
    actualMinutes: number,
    snapshotJson: string,
    note: string | null,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      `INSERT INTO day_closures (id,date,closed_at,planned_minutes,actual_minutes,snapshot_json,note,updated_at)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(date) DO UPDATE SET closed_at=excluded.closed_at,planned_minutes=excluded.planned_minutes,
       actual_minutes=excluded.actual_minutes,snapshot_json=excluded.snapshot_json,note=excluded.note,
       updated_at=excluded.updated_at,deleted_at=NULL`,
      randomUUID(),
      day,
      now,
      plannedMinutes,
      actualMinutes,
      snapshotJson,
      note,
      now,
    );
  }

  async getSetting(key: string): Promise<string | null> {
    const result = await this.database.getFirstAsync<SqlRow>('SELECT value FROM settings WHERE key=?', key);
    return result ? sqliteText(result, 'value') : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.setSettings({ [key]: value });
  }

  async setSettings(values: Readonly<Record<string, string>>): Promise<void> {
    const entries = Object.entries(values);
    if (entries.length === 0) return;
    const now = new Date().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const [key, value] of entries) {
        await transaction.runAsync(
          `INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
          key,
          value,
          now,
        );
      }
    });
  }

  async getWeeklyComment(weekStart: string): Promise<string> {
    const row = await this.database.getFirstAsync<SqlRow>(
      'SELECT text FROM weekly_comments WHERE week_start=? AND deleted_at IS NULL',
      weekStart,
    );
    return row ? sqliteText(row, 'text') : '';
  }

  async saveWeeklyComment(weekStart: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      `INSERT INTO weekly_comments (id,week_start,text,created_at,updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(week_start) DO UPDATE SET text=excluded.text,updated_at=excluded.updated_at`,
      randomUUID(),
      weekStart,
      value,
      now,
      now,
    );
  }
}
