import { describe, expect, it } from 'vitest';

import type { AppSnapshot, Entry, Item, Project, ProjectKpi, ProjectKpiRecord } from '@/types/domain';

import { buildProjectsViewModel } from './projects-view-model';

const createdAt = '2026-09-01T00:00:00.000Z';

function project(id: string, deletedAt: string | null = null): Project {
  return {
    id,
    name: id,
    description: null,
    status: 'active',
    currentExperiment: null,
    nextDecisionDate: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt,
  };
}

function item(id: string, projectId: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    accountId: 'account-1',
    projectId,
    name: id,
    type: 'time',
    unit: null,
    levelMin: null,
    levelTarget: null,
    levelMax: null,
    defaultDurationMin: null,
    countOnComplete: false,
    sortOrder: 0,
    archived: false,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  };
}

function entry(id: string, itemId: string, minutes: number, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    itemId,
    accountId: 'account-1',
    type: 'time',
    startedAt: null,
    endedAt: null,
    durationMin: minutes,
    value: null,
    count: null,
    occurredAt: '2026-09-08T00:00:00.000Z',
    note: null,
    source: 'app',
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...overrides,
  };
}

function kpi(id: string, aggregation: ProjectKpi['aggregation'], deletedAt: string | null = null): ProjectKpi {
  return {
    id,
    projectId: 'project-1',
    key: `custom:${id}`,
    label: id,
    unit: '건',
    aggregation,
    sortOrder: 0,
    createdAt,
    updatedAt: createdAt,
    deletedAt,
  };
}

function record(id: string, kpiId: string, value: number, deletedAt: string | null = null): ProjectKpiRecord {
  return {
    id,
    kpiId,
    value,
    occurredAt: createdAt,
    note: null,
    source: 'app',
    createdAt,
    updatedAt: createdAt,
    deletedAt,
  };
}

describe('buildProjectsViewModel', () => {
  it('preserves project time and KPI semantics with one indexed pass', () => {
    const snapshot: AppSnapshot = {
      accounts: [],
      projects: [project('project-1'), project('deleted-project', createdAt)],
      items: [
        item('active-item', 'project-1'),
        item('archived-item', 'project-1', { archived: true }),
        item('deleted-item', 'project-1', { deletedAt: createdAt }),
      ],
      schedules: [],
      entries: [
        entry('active-time', 'active-item', 30),
        entry('archived-time', 'archived-item', 20),
        entry('outside-week', 'active-item', 40, { occurredAt: '2026-08-01T00:00:00.000Z' }),
        entry('deleted-item-time', 'deleted-item', 100),
        entry('deleted-entry', 'active-item', 200, { deletedAt: createdAt }),
        entry('count-entry', 'active-item', 0, { type: 'count', count: 1 }),
      ],
      plans: [],
      planLines: [],
      kpis: [kpi('sum-kpi', 'sum'), kpi('last-kpi', 'last'), kpi('deleted-kpi', 'sum', createdAt)],
      kpiRecords: [
        record('sum-1', 'sum-kpi', 2),
        record('sum-2', 'sum-kpi', 3),
        record('sum-deleted', 'sum-kpi', 100, createdAt),
        record('last-1', 'last-kpi', 4),
        record('last-2', 'last-kpi', 7),
      ],
      closures: [],
      manualTodayItemIds: [],
      settings: {},
    };

    const result = buildProjectsViewModel(snapshot, 'project-1', '2026-09-07', '2026-09-13');

    expect(result.projects.map((candidate) => candidate.id)).toEqual(['project-1']);
    expect(result.totalMinutes).toBe(90);
    expect(result.weekMinutes).toBe(50);
    expect(result.kpis.map(({ kpi: candidate, total }) => [candidate.id, total])).toEqual([
      ['sum-kpi', 5],
      ['last-kpi', 7],
    ]);
    expect(result.kpis[0]?.recentRecords.map((candidate) => candidate.id)).toEqual(['sum-2', 'sum-1']);
  });
});
