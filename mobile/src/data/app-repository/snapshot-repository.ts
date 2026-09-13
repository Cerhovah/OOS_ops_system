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
  profileFromRow,
  scheduleFromRow,
} from '@/data/app-row-mappers';
import { BACKUP_PROFILE_ID } from '@/data/profile-constants';
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
      const [profileRows, accountRows, projectRows, itemRows, scheduleRows, entryRows, planRows, planLineRows, kpiRows, kpiRecordRows, closureRows, manualRows, settingRows] =
        await Promise.all([
          rows(transaction, 'SELECT * FROM profiles ORDER BY sort_order, created_at'),
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
      const profiles = profileRows.map(profileFromRow);
      const settings = Object.fromEntries(settingRows.map((row) => [sqliteText(row, 'key'), sqliteText(row, 'value')]));
      const activeProfiles = profiles.filter((profile) => !profile.deletedAt);
      const activeProfileId = activeProfiles.some((profile) => profile.id === settings.active_profile_id)
        ? settings.active_profile_id
        : activeProfiles[0]?.id ?? BACKUP_PROFILE_ID;
      const accounts = accountRows.map(accountFromRow).filter((account) => account.profileId === activeProfileId);
      const accountIds = new Set(accounts.map((account) => account.id));
      const projects = projectRows.map(projectFromRow).filter((project) => project.profileId === activeProfileId);
      const projectIds = new Set(projects.map((project) => project.id));
      const activeKpis = kpiRows.map(kpiFromRow).filter((kpi) => projectIds.has(kpi.projectId));
      const kpiIds = new Set(activeKpis.map((kpi) => kpi.id));
      const items = itemRows.map(itemFromRow).filter((item) => accountIds.has(item.accountId));
      const itemIds = new Set(items.map((item) => item.id));
      const plans = planRows.map(planFromRow).filter((plan) => plan.profileId === activeProfileId);
      const planIds = new Set(plans.map((plan) => plan.id));
      snapshot = {
        profiles,
        activeProfileId,
        accounts,
        projects,
        items,
        schedules: scheduleRows.map(scheduleFromRow).filter((schedule) => itemIds.has(schedule.itemId)),
        entries: entryRows.map(entryFromRow).filter((entry) => accountIds.has(entry.accountId) && itemIds.has(entry.itemId)),
        plans,
        planLines: planLineRows.map(planLineFromRow).filter((line) => planIds.has(line.weeklyPlanId) && accountIds.has(line.accountId)),
        kpis: activeKpis,
        kpiRecords: kpiRecordRows.map(kpiRecordFromRow).filter((record) => kpiIds.has(record.kpiId)),
        closures: closureRows.map(closureFromRow),
        manualTodayItemIds: manualRows.map((row) => sqliteText(row, 'item_id')).filter((id) => itemIds.has(id)),
        settings,
      };
    });
    if (!snapshot) throw new Error('SQLite 스냅샷 트랜잭션이 완료되지 않았습니다.');
    return snapshot;
  }
}
