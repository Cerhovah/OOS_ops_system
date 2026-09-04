import type { SQLiteDatabase } from 'expo-sqlite';

import { seedDatabase } from '@/data/migrations';
import type { SqlRow } from '@/data/sqlite-row';

const exportTableNames = [
  'accounts',
  'projects',
  'items',
  'item_schedules',
  'project_kpis',
  'project_kpi_records',
  'weekly_plans',
  'weekly_plan_lines',
  'entries',
  'day_notes',
  'day_closures',
  'weekly_comments',
  'today_item_additions',
  'analysis_sessions',
  'ai_proposals',
  'settings',
  'sync_outbox',
  'sync_conflicts',
  'sync_state',
] as const;

export class MaintenanceRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async exportTables(): Promise<Record<string, SqlRow[]>> {
    const result: Record<string, SqlRow[]> = {};
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of exportTableNames) {
        result[table] = await transaction.getAllAsync<SqlRow>(`SELECT * FROM ${table}`);
      }
    });
    return result;
  }

  async resetAllData(): Promise<void> {
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM sync_outbox;
        DELETE FROM sync_conflicts;
        DELETE FROM sync_state;
        DELETE FROM ai_proposals;
        DELETE FROM analysis_sessions;
        DELETE FROM project_kpi_records;
        DELETE FROM project_kpis;
        DELETE FROM entries;
        DELETE FROM item_schedules;
        DELETE FROM today_item_additions;
        DELETE FROM weekly_plan_lines;
        DELETE FROM weekly_plans;
        DELETE FROM day_notes;
        DELETE FROM day_closures;
        DELETE FROM weekly_comments;
        DELETE FROM items;
        DELETE FROM projects;
        DELETE FROM accounts;
        DELETE FROM settings;
      `);
      await seedDatabase(transaction);
    });
  }
}
