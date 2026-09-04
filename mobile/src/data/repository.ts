import type { SQLiteDatabase } from 'expo-sqlite';

import { ActivityRepository } from '@/data/app-repository/activity-repository';
import { CatalogRepository } from '@/data/app-repository/catalog-repository';
import { MaintenanceRepository } from '@/data/app-repository/maintenance-repository';
import { PlanningRepository } from '@/data/app-repository/planning-repository';
import { SnapshotRepository } from '@/data/app-repository/snapshot-repository';
import type { SqlRow } from '@/data/sqlite-row';
import type {
  Aggregation,
  AppSnapshot,
  Item,
  ItemInput,
  PlanSource,
  ProjectInput,
} from '@/types/domain';

export class AppRepository {
  private readonly activity: ActivityRepository;
  private readonly catalog: CatalogRepository;
  private readonly maintenance: MaintenanceRepository;
  private readonly planning: PlanningRepository;
  private readonly snapshot: SnapshotRepository;

  constructor(database: SQLiteDatabase) {
    this.activity = new ActivityRepository(database);
    this.catalog = new CatalogRepository(database);
    this.maintenance = new MaintenanceRepository(database);
    this.planning = new PlanningRepository(database);
    this.snapshot = new SnapshotRepository(database);
  }

  loadSnapshot(today: string): Promise<AppSnapshot> {
    return this.snapshot.load(today);
  }

  addTodayItem(today: string, itemId: string): Promise<void> {
    return this.activity.addTodayItem(today, itemId);
  }

  startTimer(item: Item): Promise<string> {
    return this.activity.startTimer(item);
  }

  stopTimer(entryId: string, durationMinutes: number): Promise<void> {
    return this.activity.stopTimer(entryId, durationMinutes);
  }

  createEntry(item: Item, amount: number | null, note: string | null = null): Promise<void> {
    return this.activity.createEntry(item, amount, note);
  }

  updateEntry(entryId: string, amount: number | null, note: string | null): Promise<void> {
    return this.activity.updateEntry(entryId, amount, note);
  }

  deleteEntry(entryId: string): Promise<void> {
    return this.activity.deleteEntry(entryId);
  }

  restoreEntry(entryId: string): Promise<void> {
    return this.activity.restoreEntry(entryId);
  }

  saveItem(input: ItemInput): Promise<string> {
    return this.activity.saveItem(input);
  }

  setItemArchived(itemId: string, archived: boolean): Promise<void> {
    return this.activity.setItemArchived(itemId, archived);
  }

  deleteItem(itemId: string): Promise<void> {
    return this.activity.deleteItem(itemId);
  }

  restoreItem(itemId: string): Promise<void> {
    return this.activity.restoreItem(itemId);
  }

  saveAccount(input: { id?: string; name: string; kind: string | null; color: string | null }): Promise<string> {
    return this.catalog.saveAccount(input);
  }

  setAccountArchived(accountId: string, archived: boolean): Promise<void> {
    return this.catalog.setAccountArchived(accountId, archived);
  }

  deleteAccount(accountId: string): Promise<void> {
    return this.catalog.deleteAccount(accountId);
  }

  restoreAccount(accountId: string): Promise<void> {
    return this.catalog.restoreAccount(accountId);
  }

  saveProject(input: ProjectInput): Promise<string> {
    return this.catalog.saveProject(input);
  }

  deleteProject(projectId: string): Promise<void> {
    return this.catalog.deleteProject(projectId);
  }

  restoreProject(projectId: string): Promise<void> {
    return this.catalog.restoreProject(projectId);
  }

  createKpi(projectId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    return this.catalog.createKpi(projectId, label, unit, aggregation);
  }

  updateKpi(kpiId: string, label: string, unit: string | null, aggregation: Aggregation): Promise<void> {
    return this.catalog.updateKpi(kpiId, label, unit, aggregation);
  }

  deleteKpi(kpiId: string): Promise<void> {
    return this.catalog.deleteKpi(kpiId);
  }

  restoreKpi(kpiId: string): Promise<void> {
    return this.catalog.restoreKpi(kpiId);
  }

  recordKpi(kpiId: string, value: number, note: string | null): Promise<void> {
    return this.catalog.recordKpi(kpiId, value, note);
  }

  updateKpiRecord(recordId: string, value: number, note: string | null): Promise<void> {
    return this.catalog.updateKpiRecord(recordId, value, note);
  }

  deleteKpiRecord(recordId: string): Promise<void> {
    return this.catalog.deleteKpiRecord(recordId);
  }

  restoreKpiRecord(recordId: string): Promise<void> {
    return this.catalog.restoreKpiRecord(recordId);
  }

  saveWeeklyPlan(
    weekStart: string,
    minutesByAccount: Readonly<Record<string, number>>,
    source: PlanSource = 'app',
    note: string | null = null,
  ): Promise<number> {
    return this.planning.saveWeeklyPlan(weekStart, minutesByAccount, source, note);
  }

  copyPreviousWeek(weekStart: string): Promise<boolean> {
    return this.planning.copyPreviousWeek(weekStart);
  }

  closeDay(
    day: string,
    plannedMinutes: number,
    actualMinutes: number,
    snapshotJson: string,
    note: string | null,
  ): Promise<void> {
    return this.planning.closeDay(day, plannedMinutes, actualMinutes, snapshotJson, note);
  }

  getSetting(key: string): Promise<string | null> {
    return this.planning.getSetting(key);
  }

  setSetting(key: string, value: string): Promise<void> {
    return this.planning.setSetting(key, value);
  }

  setSettings(values: Readonly<Record<string, string>>): Promise<void> {
    return this.planning.setSettings(values);
  }

  getWeeklyComment(weekStart: string): Promise<string> {
    return this.planning.getWeeklyComment(weekStart);
  }

  saveWeeklyComment(weekStart: string, value: string): Promise<void> {
    return this.planning.saveWeeklyComment(weekStart, value);
  }

  exportTables(): Promise<Record<string, SqlRow[]>> {
    return this.maintenance.exportTables();
  }

  resetAllData(notificationCleanupIdentifiers: readonly string[] = []): Promise<void> {
    return this.maintenance.resetAllData(notificationCleanupIdentifiers);
  }
}
