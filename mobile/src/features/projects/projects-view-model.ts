import { aggregateKpi, entryBelongsToRange } from '@/domain/calculations';
import type { AppSnapshot, Project, ProjectKpi, ProjectKpiRecord } from '@/types/domain';

export interface ProjectKpiViewModel {
  kpi: ProjectKpi;
  total: number;
  recordCount: number;
  recentRecords: ProjectKpiRecord[];
}

interface ProjectsViewModel {
  projects: Project[];
  selected: Project | null;
  totalMinutes: number;
  weekMinutes: number;
  kpis: ProjectKpiViewModel[];
}

export function buildProjectsViewModel(
  snapshot: AppSnapshot,
  selectedId: string | null,
  weekStart: string,
  weekEnd: string,
): ProjectsViewModel {
  const projects = snapshot.projects.filter((project) => !project.deletedAt);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const selected = (selectedId ? projectById.get(selectedId) : undefined) ?? projects[0] ?? null;
  if (!selected) return { projects, selected: null, totalMinutes: 0, weekMinutes: 0, kpis: [] };

  const itemIds = new Set<string>();
  for (const item of snapshot.items) {
    if (!item.deletedAt && item.projectId === selected.id) itemIds.add(item.id);
  }

  let totalMinutes = 0;
  let weekMinutes = 0;
  for (const entry of snapshot.entries) {
    if (entry.deletedAt || entry.type !== 'time' || !itemIds.has(entry.itemId)) continue;
    const minutes = entry.durationMin ?? 0;
    totalMinutes += minutes;
    if (entryBelongsToRange(entry, weekStart, weekEnd)) weekMinutes += minutes;
  }

  const selectedKpis = snapshot.kpis.filter((kpi) => !kpi.deletedAt && kpi.projectId === selected.id);
  const recordsByKpi = new Map(selectedKpis.map((kpi) => [kpi.id, [] as ProjectKpiRecord[]]));
  for (const record of snapshot.kpiRecords) {
    if (record.deletedAt) continue;
    recordsByKpi.get(record.kpiId)?.push(record);
  }
  const kpis = selectedKpis.map((kpi) => {
    const records = recordsByKpi.get(kpi.id) ?? [];
    return {
      kpi,
      total: aggregateKpi(records.map((record) => record.value), kpi.aggregation),
      recordCount: records.length,
      recentRecords: records.slice(-10).reverse(),
    };
  });

  return { projects, selected, totalMinutes, weekMinutes, kpis };
}
