/// <reference types="node" />

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

export class TestSQLiteDatabase {
  readonly raw = new DatabaseSync(':memory:');

  asExpoDatabase(): SQLiteDatabase {
    return this as unknown as SQLiteDatabase;
  }

  async execAsync(source: string): Promise<void> {
    this.raw.exec(source);
  }

  async runAsync(source: string, ...params: SQLInputValue[]): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = this.raw.prepare(source).run(...params);
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  }

  async getFirstAsync<T>(source: string, ...params: SQLInputValue[]): Promise<T | null> {
    return (this.raw.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: SQLInputValue[]): Promise<T[]> {
    return this.raw.prepare(source).all(...params) as T[];
  }

  async withExclusiveTransactionAsync(task: (database: SQLiteDatabase) => Promise<void>): Promise<void> {
    this.raw.exec('BEGIN EXCLUSIVE');
    try {
      await task(this.asExpoDatabase());
      this.raw.exec('COMMIT');
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.raw.close();
  }
}
