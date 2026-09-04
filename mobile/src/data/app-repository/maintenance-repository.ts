import type { SQLiteDatabase } from 'expo-sqlite';

import { APP_DATA_RESET_ORDER, APP_DATA_TABLE_NAMES } from '@/data/app-data-tables';
import { seedDatabase } from '@/data/migrations';
import type { SqlRow } from '@/data/sqlite-row';

export class MaintenanceRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async exportTables(): Promise<Record<string, SqlRow[]>> {
    const result: Record<string, SqlRow[]> = {};
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const table of APP_DATA_TABLE_NAMES) {
        result[table] = await transaction.getAllAsync<SqlRow>(`SELECT * FROM ${table}`);
      }
    });
    return result;
  }

  async resetAllData(notificationCleanupIdentifiers: readonly string[] = []): Promise<void> {
    const pendingNotificationCleanup = [...new Set(notificationCleanupIdentifiers)];
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(
        APP_DATA_RESET_ORDER.map((table) => `DELETE FROM ${table};`).join('\n'),
      );
      await seedDatabase(transaction);
      if (pendingNotificationCleanup.length > 0) {
        await transaction.runAsync(
          `INSERT INTO settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
          'notification_cleanup_pending',
          JSON.stringify(pendingNotificationCleanup),
          new Date().toISOString(),
        );
      }
    });
  }
}
