import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { addDays } from '@/domain/calculations';
import { seedDatabase } from '@/data/migrations';
import type {
  Account,
  Aggregation,
  AppSnapshot,
  DayClosure,
  Entry,
  Item,
  ItemInput,
  ItemSchedule,
  ItemType,
  PlanSource,
  Project,
  ProjectInput,
  ProjectKpi,
  ProjectKpiRecord,
  WeeklyPlan,
  WeeklyPlanLine,
} from '@/types/domain';

type SqlValue = string | number | null;
type Row = Record<string, SqlValue>;

function text(row: Row, key: string): string {
  return String(row[key]);
}

function nullableText(row: Row, key: string): string | null {
  return row[key] === null ? null : String(row[key]);
}

function nullableNumber(row: Row, key: string): number | null {
  return row[key] === null ? null : Number(row[key]);
}

function accountFromRow(row: Row): Account {
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    color: nullableText(row, 'color'),
    kind: nullableText(row, 'kind'),
    sortOrder: Number(row.sort_order),
    archived: Boolean(row.archived),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function projectFromRow(row: Row): Project {
  return {
    id: text(row, 'id'),
    name: text(row, 'name'),
    description: nullableText(row, 'description'),
    status: text(row, 'status') as Project['status'],
    currentExperiment: nullableText(row, 'current_experiment'),
    nextDecisionDate: nullableText(row, 'next_decision_date'),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function itemFromRow(row: Row): Item {
  return {
    id: text(row, 'id'),
    accountId: text(row, 'account_id'),
    projectId: nullableText(row, 'project_id'),
    name: text(row, 'name'),
    type: text(row, 'type') as ItemType,
    unit: nullableText(row, 'unit'),
    levelMin: nullableNumber(row, 'level_min'),
    levelTarget: nullableNumber(row, 'level_target'),
    levelMax: nullableNumber(row, 'level_max'),
    defaultDurationMin: nullableNumber(row, 'default_duration_min'),
    countOnComplete: Boolean(row.count_on_complete),
    sortOrder: Number(row.sort_order),
    archived: Boolean(row.archived),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function scheduleFromRow(row: Row): ItemSchedule {
  return {
    id: text(row, 'id'),
    itemId: text(row, 'item_id'),
    weekdayMask: Number(row.weekday_mask),
    plannedValue: nullableNumber(row, 'planned_value'),
    startTime: nullableText(row, 'start_time'),
    autoCreate: Boolean(row.auto_create),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function entryFromRow(row: Row): Entry {
  return {
    id: text(row, 'id'),
    itemId: text(row, 'item_id'),
    accountId: text(row, 'account_id'),
    type: text(row, 'type') as ItemType,
    startedAt: nullableText(row, 'started_at'),
    endedAt: nullableText(row, 'ended_at'),
    durationMin: nullableNumber(row, 'duration_min'),
    value: nullableNumber(row, 'value'),
    count: nullableNumber(row, 'count'),
    occurredAt: text(row, 'occurred_at'),
    note: nullableText(row, 'note'),
    source: text(row, 'source') as Entry['source'],
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function planFromRow(row: Row): WeeklyPlan {
  return {
    id: text(row, 'id'),
    weekStart: text(row, 'week_start'),
    version: Number(row.version),
    note: nullableText(row, 'note'),
    source: text(row, 'source') as PlanSource,
    createdAt: text(row, 'created_at'),
  };
}

function planLineFromRow(row: Row): WeeklyPlanLine {
  return {
    id: text(row, 'id'),
    weeklyPlanId: text(row, 'weekly_plan_id'),
    accountId: text(row, 'account_id'),
    plannedMinutes: Number(row.planned_minutes),
  };
}

function kpiFromRow(row: Row): ProjectKpi {
  return {
    id: text(row, 'id'),
    projectId: text(row, 'project_id'),
    key: text(row, 'key'),
    label: text(row, 'label'),
    unit: nullableText(row, 'unit'),
    aggregation: text(row, 'aggregation') as Aggregation,
    sortOrder: Number(row.sort_order),
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function kpiRecordFromRow(row: Row): ProjectKpiRecord {
  return {
    id: text(row, 'id'),
    kpiId: text(row, 'kpi_id'),
    value: Number(row.value),
    occurredAt: text(row, 'occurred_at'),
    note: nullableText(row, 'note'),
    source: text(row, 'source') as ProjectKpiRecord['source'],
    createdAt: text(row, 'created_at'),
    updatedAt: text(row, 'updated_at'),
    deletedAt: nullableText(row, 'deleted_at'),
  };
}

function closureFromRow(row: Row): DayClosure {
  return {
    id: text(row, 'id'),
    date: text(row, 'date'),
    closedAt: text(row, 'closed_at'),
    plannedMinutes: Number(row.planned_minutes),
    actualMinutes: Number(row.actual_minutes),
    snapshotJson: text(row, 'snapshot_json'),
    note: nullableText(row, 'note'),
  };
}

async function rows(db: SQLiteDatabase, query: string, ...params: SqlValue[]): Promise<Row[]> {
  return db.getAllAsync<Row>(query, ...params);
}

export class AppRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async loadSnapshot(today: string): Promise<AppSnapshot> {
    const [accounts, projects, items, schedules, entries, plans, planLines, kpis, kpiRecords, closures, manualRows, settingRows] =
      await Promise.all([
        rows(this.db, 'SELECT * FROM accounts ORDER BY sort_order, created_at'),
        rows(this.db, 'SELECT * FROM projects ORDER BY created_at'),
        rows(this.db, 'SELECT * FROM items ORDER BY sort_order, created_at'),
        rows(this.db, 'SELECT * FROM item_schedules ORDER BY created_at'),
        rows(this.db, 'SELECT * FROM entries ORDER BY occurred_at DESC'),
        rows(this.db, 'SELECT * FROM weekly_plans ORDER BY week_start DESC, version DESC'),
        rows(this.db, 'SELECT * FROM weekly_plan_lines'),
        rows(this.db, 'SELECT * FROM project_kpis ORDER BY sort_order, created_at'),
        rows(this.db, 'SELECT * FROM project_kpi_records ORDER BY occurred_at'),
        rows(this.db, 'SELECT * FROM day_closures ORDER BY date DESC'),
        rows(this.db, 'SELECT item_id FROM today_item_additions WHERE date = ?', today),
        rows(this.db, 'SELECT key,value FROM settings'),
      ]);
    return {
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
      manualTodayItemIds: manualRows.map((row) => text(row, 'item_id')),
      settings: Object.fromEntries(settingRows.map((row) => [text(row, 'key'), text(row, 'value')])),
    };
  }

  async addTodayItem(today: string, itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
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
    await this.db.runAsync(
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
    return id;
  }

  async stopTimer(entryId: string, durationMinutes: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
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
    await this.db.runAsync(
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
    const target = await this.db.getFirstAsync<Row>('SELECT type FROM entries WHERE id = ?', entryId);
    if (!target) throw new Error('수정할 기록을 찾을 수 없습니다.');
    const type = text(target, 'type') as ItemType;
    const duration = type === 'time' ? Math.round(amount ?? 0) : null;
    const value = type === 'numeric' || type === 'event' ? amount : null;
    const count = type === 'completion' || type === 'count' ? Math.round(amount ?? 0) : null;
    await this.db.runAsync(
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
    await this.db.runAsync('UPDATE entries SET deleted_at=?, updated_at=? WHERE id=?', now, now, entryId);
  }

  async restoreEntry(entryId: string): Promise<void> {
    await this.db.runAsync('UPDATE entries SET deleted_at=NULL, updated_at=? WHERE id=?', new Date().toISOString(), entryId);
  }

  async saveItem(input: ItemInput): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      if (input.id) {
        await txn.runAsync(
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
        const order = await txn.getFirstAsync<{ nextOrder: number }>(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM items',
        );
        await txn.runAsync(
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
      const existing = await txn.getFirstAsync<Row>('SELECT id FROM item_schedules WHERE item_id=? ORDER BY created_at LIMIT 1', id);
      if (input.weekdayMask > 0) {
        if (existing) {
          await txn.runAsync(
            'UPDATE item_schedules SET weekday_mask=?,planned_value=?,start_time=?,auto_create=?,deleted_at=NULL,updated_at=? WHERE id=?',
            input.weekdayMask,
            input.plannedValue,
            input.startTime,
            input.autoCreate ? 1 : 0,
            now,
            text(existing, 'id'),
          );
        } else {
          await txn.runAsync(
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
        await txn.runAsync('UPDATE item_schedules SET deleted_at=?,updated_at=? WHERE id=?', now, now, text(existing, 'id'));
      }
    });
    return id;
  }

  async setItemArchived(itemId: string, archived: boolean): Promise<void> {
    await this.db.runAsync('UPDATE items SET archived=?,updated_at=? WHERE id=?', archived ? 1 : 0, new Date().toISOString(), itemId);
  }

  async deleteItem(itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('UPDATE items SET deleted_at=?,updated_at=? WHERE id=?', now, now, itemId);
      await txn.runAsync('UPDATE item_schedules SET deleted_at=?,updated_at=? WHERE item_id=? AND deleted_at IS NULL', now, now, itemId);
    });
  }

  async restoreItem(itemId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      const item = await txn.getFirstAsync<Row>('SELECT deleted_at FROM items WHERE id=?', itemId);
      if (!item) throw new Error(`복구할 항목을 찾을 수 없습니다: ${itemId}`);
      const deletedAt = nullableText(item, 'deleted_at');
      await txn.runAsync('UPDATE items SET deleted_at=NULL,updated_at=? WHERE id=?', now, itemId);
      if (deletedAt) {
        await txn.runAsync(
          'UPDATE item_schedules SET deleted_at=NULL,updated_at=? WHERE item_id=? AND deleted_at=?',
          now,
          itemId,
          deletedAt,
        );
      }
    });
  }

  async saveAccount(input: { id?: string; name: string; kind: string | null; color: string | null }): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (input.id) {
      await this.db.runAsync('UPDATE accounts SET name=?,kind=?,color=?,updated_at=? WHERE id=?', input.name, input.kind, input.color, now, id);
    } else {
      const order = await this.db.getFirstAsync<{ nextOrder: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM accounts',
      );
      await this.db.runAsync(
        'INSERT INTO accounts (id,name,color,kind,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        id,
        input.name,
        input.color,
        input.kind,
        order?.nextOrder ?? 0,
        now,
        now,
      );
    }
    return id;
  }

  async setAccountArchived(accountId: string, archived: boolean): Promise<void> {
    await this.db.runAsync('UPDATE accounts SET archived=?,updated_at=? WHERE id=?', archived ? 1 : 0, new Date().toISOString(), accountId);
  }

  async deleteAccount(accountId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync('UPDATE accounts SET deleted_at=?,updated_at=? WHERE id=?', now, now, accountId);
  }

  async restoreAccount(accountId: string): Promise<void> {
    await this.db.runAsync('UPDATE accounts SET deleted_at=NULL,updated_at=? WHERE id=?', new Date().toISOString(), accountId);
  }

  async saveProject(input: ProjectInput): Promise<string> {
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    if (input.id) {
      await this.db.runAsync(
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
      await this.db.runAsync(
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
    await this.db.runAsync('UPDATE projects SET deleted_at=?,updated_at=? WHERE id=?', now, now, projectId);
  }

  async restoreProject(projectId: string): Promise<void> {
    await this.db.runAsync('UPDATE projects SET deleted_at=NULL,updated_at=? WHERE id=?', new Date().toISOString(), projectId);
  }

  async createKpi(projectId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    const now = new Date().toISOString();
    const order = await this.db.getFirstAsync<{ nextOrder: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextOrder FROM project_kpis WHERE project_id=?',
      projectId,
    );
    await this.db.runAsync(
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
  }

  async updateKpi(kpiId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    await this.db.runAsync(
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
    await this.db.runAsync('UPDATE project_kpis SET deleted_at=?,updated_at=? WHERE id=?', now, now, kpiId);
  }

  async restoreKpi(kpiId: string): Promise<void> {
    await this.db.runAsync('UPDATE project_kpis SET deleted_at=NULL,updated_at=? WHERE id=?', new Date().toISOString(), kpiId);
  }

  async recordKpi(kpiId: string, value: number, note: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
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
    await this.db.runAsync(
      'UPDATE project_kpi_records SET value=?,note=?,updated_at=? WHERE id=?',
      value,
      note,
      new Date().toISOString(),
      recordId,
    );
  }

  async deleteKpiRecord(recordId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync('UPDATE project_kpi_records SET deleted_at=?,updated_at=? WHERE id=?', now, now, recordId);
  }

  async restoreKpiRecord(recordId: string): Promise<void> {
    await this.db.runAsync(
      'UPDATE project_kpi_records SET deleted_at=NULL,updated_at=? WHERE id=?',
      new Date().toISOString(),
      recordId,
    );
  }

  async saveWeeklyPlan(
    weekStart: string,
    minutesByAccount: Readonly<Record<string, number>>,
    source: PlanSource = 'app',
    note: string | null = null,
  ): Promise<number> {
    let version = 1;
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      const current = await txn.getFirstAsync<{ version: number }>(
        'SELECT MAX(version) AS version FROM weekly_plans WHERE week_start=?',
        weekStart,
      );
      version = (current?.version ?? 0) + 1;
      const planId = randomUUID();
      const now = new Date().toISOString();
      await txn.runAsync(
        'INSERT INTO weekly_plans (id,week_start,version,note,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',
        planId,
        weekStart,
        version,
        note,
        source,
        now,
        now,
      );
      for (const [accountId, minutes] of Object.entries(minutesByAccount)) {
        await txn.runAsync(
          'INSERT INTO weekly_plan_lines (id,weekly_plan_id,account_id,planned_minutes,created_at,updated_at) VALUES (?,?,?,?,?,?)',
          randomUUID(),
          planId,
          accountId,
          Math.round(minutes),
          now,
          now,
        );
      }
    });
    return version;
  }

  async copyPreviousWeek(weekStart: string): Promise<boolean> {
    const previousStart = addDays(weekStart, -7);
    const plan = await this.db.getFirstAsync<Row>(
      'SELECT * FROM weekly_plans WHERE week_start=? ORDER BY version DESC LIMIT 1',
      previousStart,
    );
    if (!plan) return false;
    const previousLines = await rows(this.db, 'SELECT * FROM weekly_plan_lines WHERE weekly_plan_id=?', text(plan, 'id'));
    const values = Object.fromEntries(previousLines.map((line) => [text(line, 'account_id'), Number(line.planned_minutes)]));
    await this.saveWeeklyPlan(weekStart, values, 'copy_last_week', `지난주(${previousStart}) 계획 복사`);
    return true;
  }

  async closeDay(
    day: string,
    plannedMinutes: number,
    actualMinutes: number,
    snapshotJson: string,
    note: string | null,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
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
    const result = await this.db.getFirstAsync<Row>('SELECT value FROM settings WHERE key=?', key);
    return result ? text(result, 'value') : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
      key,
      value,
      new Date().toISOString(),
    );
  }

  async getWeeklyComment(weekStart: string): Promise<string> {
    const row = await this.db.getFirstAsync<Row>('SELECT text FROM weekly_comments WHERE week_start=?', weekStart);
    return row ? text(row, 'text') : '';
  }

  async saveWeeklyComment(weekStart: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO weekly_comments (id,week_start,text,created_at,updated_at) VALUES (?,?,?,?,?)
       ON CONFLICT(week_start) DO UPDATE SET text=excluded.text,updated_at=excluded.updated_at`,
      randomUUID(),
      weekStart,
      value,
      now,
      now,
    );
  }

  async exportTables(): Promise<Record<string, Row[]>> {
    const tableNames = [
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
    const result: Record<string, Row[]> = {};
    for (const table of tableNames) {
      result[table] = await rows(this.db, `SELECT * FROM ${table}`);
    }
    return result;
  }

  async resetAllData(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(`
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
    });
    await seedDatabase(this.db);
  }
}
