import type { SQLiteDatabase } from 'expo-sqlite';

import {
  accountFromRow,
  closureFromRow,
  entryFromRow,
  itemFromRow,
  kpiFromRow,
  kpiRecordFromRow,
  planFromRow,
  planLineFromRow,
  projectFromRow,
  scheduleFromRow,
} from '@/data/app-row-mappers';
import { sqliteText, type SqlRow, type SqlValue } from '@/data/sqlite-row';
import type { AppSnapshot } from '@/types/domain';

async function rows(database: SQLiteDatabase, query: string, ...params: SqlValue[]): Promise<SqlRow[]> {
  return database.getAllAsync<SqlRow>(query, ...params);
}

export class SnapshotRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async load(today: string): Promise<AppSnapshot> {
    let snapshot: AppSnapshot | undefined;
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const [accounts, projects, items, schedules, entries, plans, planLines, kpis, kpiRecords, closures, manualRows, settingRows] =
        await Promise.all([
          rows(transaction, 'SELECT * FROM accounts ORDER BY sort_order, created_at'),
          rows(transaction, 'SELECT * FROM projects ORDER BY created_at'),
          rows(transaction, 'SELECT * FROM items ORDER BY sort_order, created_at'),
          rows(transaction, 'SELECT * FROM item_schedules ORDER BY created_at'),
          rows(transaction, 'SELECT * FROM entries ORDER BY occurred_at DESC'),
          rows(transaction, 'SELECT * FROM weekly_plans ORDER BY week_start DESC, version DESC'),
          rows(transaction, 'SELECT * FROM weekly_plan_lines'),
          rows(transaction, 'SELECT * FROM project_kpis ORDER BY sort_order, created_at'),
          rows(transaction, 'SELECT * FROM project_kpi_records ORDER BY occurred_at'),
          rows(transaction, 'SELECT * FROM day_closures WHERE deleted_at IS NULL ORDER BY date DESC'),
          rows(transaction, 'SELECT item_id FROM today_item_additions WHERE date = ? AND deleted_at IS NULL', today),
          rows(transaction, 'SELECT key,value FROM settings'),
        ]);
      snapshot = {
        accounts: accounts.map(accountFromRow),
        projects: projects.map(projectFromRow),
        items: items.map(itemFromRow),
        schedules: schedules.map(scheduleFromRow),
        entries: entries.map(entryFromRow),
        plans: plans.map(planFromRow),
        planLines: planLines.map(planLineFromRow),
        kpis: kpis.map(kpiFromRow),
        kpiRecords: kpiRecords.map(kpiRecordFromRow),
        closures: closures.map(closureFromRow),
        manualTodayItemIds: manualRows.map((row) => sqliteText(row, 'item_id')),
        settings: Object.fromEntries(settingRows.map((row) => [sqliteText(row, 'key'), sqliteText(row, 'value')])),
      };
    });
    if (!snapshot) throw new Error('SQLite 스냅샷 트랜잭션이 완료되지 않았습니다.');
    return snapshot;
  }
}
