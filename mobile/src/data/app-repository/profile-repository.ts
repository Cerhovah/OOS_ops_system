import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { TimerRuntimeUpdate } from '@/data/app-repository/activity-repository';
import { timerRuntimeSettingKey } from '@/domain/timer-runtime';

export class ProfileRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async create(name: string): Promise<string> {
    const normalized = name.trim();
    if (!normalized) throw new Error('프로필 이름을 입력하십시오.');
    const duplicate = await this.database.getFirstAsync<{ id: string }>(
      'SELECT id FROM profiles WHERE lower(name)=lower(?) AND deleted_at IS NULL',
      normalized,
    );
    if (duplicate) throw new Error('같은 이름의 프로필이 이미 있습니다.');
    const now = new Date().toISOString();
    const id = randomUUID();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const order = await transaction.getFirstAsync<{ nextOrder: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM profiles',
      );
      await transaction.runAsync(
        `INSERT INTO profiles (id,name,sort_order,created_at,updated_at)
         VALUES (?,?,?,?,?)`,
        id,
        normalized,
        order?.nextOrder ?? 0,
        now,
        now,
      );
    });
    return id;
  }

  async switchTo(profileId: string, pausedRuntimes: readonly TimerRuntimeUpdate[]): Promise<void> {
    const target = await this.database.getFirstAsync<{ id: string }>(
      'SELECT id FROM profiles WHERE id=? AND deleted_at IS NULL',
      profileId,
    );
    if (!target) throw new Error('변경할 프로필을 찾을 수 없습니다.');
    const now = new Date().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      for (const update of pausedRuntimes) {
        await transaction.runAsync(
          `INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
          timerRuntimeSettingKey(update.entryId),
          update.value,
          now,
        );
      }
      await transaction.runAsync(
        `INSERT INTO settings (key,value,updated_at) VALUES ('active_profile_id',?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
        profileId,
        now,
      );
    });
  }

  async delete(profileId: string, activeProfileId: string): Promise<void> {
    if (profileId === activeProfileId) throw new Error('현재 사용 중인 프로필은 삭제할 수 없습니다.');
    const now = new Date().toISOString();
    const result = await this.database.runAsync(
      'UPDATE profiles SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL',
      now,
      now,
      profileId,
    );
    if (result.changes === 0) throw new Error('삭제할 프로필을 찾을 수 없습니다.');
  }

  async restore(profileId: string): Promise<void> {
    const result = await this.database.runAsync(
      'UPDATE profiles SET deleted_at=NULL,updated_at=? WHERE id=? AND deleted_at IS NOT NULL',
      new Date().toISOString(),
      profileId,
    );
    if (result.changes === 0) throw new Error('복구할 프로필을 찾을 수 없습니다.');
  }
}
