import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Aggregation, ProjectInput } from '@/types/domain';

export interface AccountInput {
  id?: string;
  name: string;
  kind: string | null;
  color: string | null;
}

export class CatalogRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async saveAccount(input: AccountInput): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (input.id) {
      await this.database.runAsync(
        'UPDATE accounts SET name=?,kind=?,color=?,updated_at=? WHERE id=?',
        input.name,
        input.kind,
        input.color,
        now,
        id,
      );
    } else {
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        const order = await transaction.getFirstAsync<{ nextOrder: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM accounts',
        );
        await transaction.runAsync(
          'INSERT INTO accounts (id,name,color,kind,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
          id,
          input.name,
          input.color,
          input.kind,
          order?.nextOrder ?? 0,
          now,
          now,
        );
      });
    }
    return id;
  }

  async setAccountArchived(accountId: string, archived: boolean): Promise<void> {
    await this.database.runAsync(
      'UPDATE accounts SET archived=?,updated_at=? WHERE id=?',
      archived ? 1 : 0,
      new Date().toISOString(),
      accountId,
    );
  }

  async deleteAccount(accountId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync('UPDATE accounts SET deleted_at=?,updated_at=? WHERE id=?', now, now, accountId);
  }

  async restoreAccount(accountId: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE accounts SET deleted_at=NULL,updated_at=? WHERE id=?',
      new Date().toISOString(),
      accountId,
    );
  }

  async saveProject(input: ProjectInput): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (input.id) {
      await this.database.runAsync(
        'UPDATE projects SET name=?,description=?,status=?,current_experiment=?,next_decision_date=?,updated_at=? WHERE id=?',
        input.name,
        input.description,
        input.status,
        input.currentExperiment,
        input.nextDecisionDate,
        now,
        id,
      );
    } else {
      await this.database.runAsync(
        'INSERT INTO projects (id,name,description,status,current_experiment,next_decision_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
        id,
        input.name,
        input.description,
        input.status,
        input.currentExperiment,
        input.nextDecisionDate,
        now,
        now,
      );
    }
    return id;
  }

  async deleteProject(projectId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync('UPDATE projects SET deleted_at=?,updated_at=? WHERE id=?', now, now, projectId);
  }

  async restoreProject(projectId: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE projects SET deleted_at=NULL,updated_at=? WHERE id=?',
      new Date().toISOString(),
      projectId,
    );
  }

  async createKpi(projectId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    const now = new Date().toISOString();
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const order = await transaction.getFirstAsync<{ nextOrder: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM project_kpis WHERE project_id=?',
        projectId,
      );
      await transaction.runAsync(
        'INSERT INTO project_kpis (id,project_id,key,label,unit,aggregation,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        randomUUID(),
        projectId,
        `custom:${randomUUID()}`,
        label,
        unit,
        aggregation,
        order?.nextOrder ?? 0,
        now,
        now,
      );
    });
  }

  async updateKpi(kpiId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    await this.database.runAsync(
      'UPDATE project_kpis SET label=?,unit=?,aggregation=?,updated_at=? WHERE id=?',
      label,
      unit,
      aggregation,
      new Date().toISOString(),
      kpiId,
    );
  }

  async deleteKpi(kpiId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync('UPDATE project_kpis SET deleted_at=?,updated_at=? WHERE id=?', now, now, kpiId);
  }

  async restoreKpi(kpiId: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE project_kpis SET deleted_at=NULL,updated_at=? WHERE id=?',
      new Date().toISOString(),
      kpiId,
    );
  }

  async recordKpi(kpiId: string, value: number, note: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      'INSERT INTO project_kpi_records (id,kpi_id,value,occurred_at,note,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      randomUUID(),
      kpiId,
      value,
      now,
      note,
      'app',
      now,
      now,
    );
  }

  async updateKpiRecord(recordId: string, value: number, note: string | null): Promise<void> {
    await this.database.runAsync(
      'UPDATE project_kpi_records SET value=?,note=?,updated_at=? WHERE id=?',
      value,
      note,
      new Date().toISOString(),
      recordId,
    );
  }

  async deleteKpiRecord(recordId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.runAsync(
      'UPDATE project_kpi_records SET deleted_at=?,updated_at=? WHERE id=?',
      now,
      now,
      recordId,
    );
  }

  async restoreKpiRecord(recordId: string): Promise<void> {
    await this.database.runAsync(
      'UPDATE project_kpi_records SET deleted_at=NULL,updated_at=? WHERE id=?',
      new Date().toISOString(),
      recordId,
    );
  }
}
