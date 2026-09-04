import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { sqliteNullableText, sqliteText, type SqlRow } from '@/data/sqlite-row';
import type { Item, ItemInput, ItemType } from '@/types/domain';

export class ActivityRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async addTodayItem(today: string, itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      'INSERT OR IGNORE INTO today_item_additions (id,date,item_id,created_at,updated_at) VALUES (?,?,?,?,?)',
      randomUUID(),
      today,
      itemId,
      now,
      now,
    );
  }

  async startTimer(item: Item): Promise<string> {
    const now = new Date().toISOString();
    const id = randomUUID();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO entries
         (id,item_id,account_id,type,started_at,ended_at,duration_min,value,count,occurred_at,note,source,created_at,updated_at)
         VALUES (?,?,?,?,?,NULL,NULL,NULL,NULL,?,NULL,'app',?,?)`,
        id,
        item.id,
        item.accountId,
        item.type,
        now,
        now,
        now,
        now,
      );
      await transaction.runAsync(
        `INSERT INTO settings (key,value,updated_at) VALUES ('last_timer_item_id',?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
        item.id,
        now,
      );
    });
    return id;
  }

  async stopTimer(entryId: string, durationMinutes: number): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      `UPDATE entries
       SET ended_at = ?, duration_min = ?,
           count = CASE
             WHEN (SELECT count_on_complete FROM items WHERE items.id = entries.item_id) = 1 THEN 1
             ELSE count
           END,
           updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      now,
      durationMinutes,
      now,
      entryId,
    );
  }

  async createEntry(item: Item, amount: number | null, note: string | null = null): Promise<void> {
    const now = new Date().toISOString();
    const duration = item.type === 'time' ? Math.round(amount ?? item.defaultDurationMin ?? 0) : null;
    const value = item.type === 'numeric' || item.type === 'event' ? amount : null;
    const count = item.type === 'completion' || item.type === 'count'
      ? Math.round(amount ?? 1)
      : item.type === 'time' && item.countOnComplete
        ? 1
        : null;
    await this.database.runAsync(
      `INSERT INTO entries
       (id,item_id,account_id,type,started_at,ended_at,duration_min,value,count,occurred_at,note,source,created_at,updated_at)
       VALUES (?,?,?,?,NULL,NULL,?,?,?,?,?,'app',?,?)`,
      randomUUID(),
      item.id,
      item.accountId,
      item.type,
      duration,
      value,
      count,
      now,
      note,
      now,
      now,
    );
  }

  async updateEntry(entryId: string, amount: number | null, note: string | null): Promise<void> {
    const target = await this.database.getFirstAsync<SqlRow>('SELECT type FROM entries WHERE id = ?', entryId);
    if (!target) throw new Error('수정할 기록을 찾을 수 없습니다.');
    const type = sqliteText(target, 'type') as ItemType;
    const duration = type === 'time' ? Math.round(amount ?? 0) : null;
    const value = type === 'numeric' || type === 'event' ? amount : null;
    const count = type === 'completion' || type === 'count' ? Math.round(amount ?? 0) : null;
    await this.database.runAsync(
      `UPDATE entries SET duration_min=?, value=?,
       count=CASE WHEN type='time' THEN count ELSE ? END,
       note=?, updated_at=? WHERE id=?`,
      duration,
      value,
      count,
      note,
      new Date().toISOString(),
      entryId,
    );
  }

  async deleteEntry(entryId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync('UPDATE entries SET deleted_at=?, updated_at=? WHERE id=?', now, now, entryId);
  }

  async restoreEntry(entryId: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE entries SET deleted_at=NULL, updated_at=? WHERE id=?',
      new Date().toISOString(),
      entryId,
    );
  }

  async saveItem(input: ItemInput): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      if (input.id) {
        await transaction.runAsync(
          `UPDATE items SET account_id=?,project_id=?,name=?,type=?,unit=?,level_min=?,level_target=?,level_max=?,
           default_duration_min=?,count_on_complete=?,updated_at=? WHERE id=?`,
          input.accountId,
          input.projectId,
          input.name,
          input.type,
          input.unit,
          input.levelMin,
          input.levelTarget,
          input.levelMax,
          input.defaultDurationMin,
          input.countOnComplete ? 1 : 0,
          now,
          id,
        );
      } else {
        const order = await transaction.getFirstAsync<{ nextOrder: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM items',
        );
        await transaction.runAsync(
          `INSERT INTO items
           (id,account_id,project_id,name,type,unit,level_min,level_target,level_max,default_duration_min,count_on_complete,sort_order,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          id,
          input.accountId,
          input.projectId,
          input.name,
          input.type,
          input.unit,
          input.levelMin,
          input.levelTarget,
          input.levelMax,
          input.defaultDurationMin,
          input.countOnComplete ? 1 : 0,
          order?.nextOrder ?? 0,
          now,
          now,
        );
      }
      const existing = await transaction.getFirstAsync<SqlRow>(
        'SELECT id FROM item_schedules WHERE item_id=? ORDER BY created_at LIMIT 1',
        id,
      );
      if (input.weekdayMask > 0) {
        if (existing) {
          await transaction.runAsync(
            'UPDATE item_schedules SET weekday_mask=?,planned_value=?,start_time=?,auto_create=?,deleted_at=NULL,updated_at=? WHERE id=?',
            input.weekdayMask,
            input.plannedValue,
            input.startTime,
            input.autoCreate ? 1 : 0,
            now,
            sqliteText(existing, 'id'),
          );
        } else {
          await transaction.runAsync(
            'INSERT INTO item_schedules (id,item_id,weekday_mask,planned_value,start_time,auto_create,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
            randomUUID(),
            id,
            input.weekdayMask,
            input.plannedValue,
            input.startTime,
            input.autoCreate ? 1 : 0,
            now,
            now,
          );
        }
      } else if (existing) {
        await transaction.runAsync(
          'UPDATE item_schedules SET deleted_at=?,updated_at=? WHERE id=?',
          now,
          now,
          sqliteText(existing, 'id'),
        );
      }
    });
    return id;
  }

  async setItemArchived(itemId: string, archived: boolean): Promise<void> {
    await this.database.runAsync(
      'UPDATE items SET archived=?,updated_at=? WHERE id=?',
      archived ? 1 : 0,
      new Date().toISOString(),
      itemId,
    );
  }

  async deleteItem(itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync('UPDATE items SET deleted_at=?,updated_at=? WHERE id=?', now, now, itemId);
      await transaction.runAsync(
        'UPDATE item_schedules SET deleted_at=?,updated_at=? WHERE item_id=? AND deleted_at IS NULL',
        now,
        now,
        itemId,
      );
    });
  }

  async restoreItem(itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const item = await transaction.getFirstAsync<SqlRow>('SELECT deleted_at FROM items WHERE id=?', itemId);
      if (!item) throw new Error(`복구할 항목을 찾을 수 없습니다: ${itemId}`);
      const deletedAt = sqliteNullableText(item, 'deleted_at');
      await transaction.runAsync('UPDATE items SET deleted_at=NULL,updated_at=? WHERE id=?', now, itemId);
      if (deletedAt) {
        await transaction.runAsync(
          'UPDATE item_schedules SET deleted_at=NULL,updated_at=? WHERE item_id=? AND deleted_at=?',
          now,
          itemId,
          deletedAt,
        );
      }
    });
  }
}
