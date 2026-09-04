import type { AnalysisDataSnapshot } from './snapshot-types';

function serialize(snapshot: AnalysisDataSnapshot): string {
  return JSON.stringify(snapshot);
}

export function estimateSnapshotTokens(snapshot: AnalysisDataSnapshot): number {
  return Math.ceil(serialize(snapshot).length / 4);
}

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function serializeAnalysisSnapshot(
  snapshot: AnalysisDataSnapshot,
  maxBytes = 72_000,
): string {
  const serialized = serialize(snapshot);
  if (utf8ByteLength(serialized) > maxBytes) {
    throw new Error('분석 첨부 데이터가 안전한 전송 한도를 넘었습니다. 분석 기간을 줄이십시오.');
  }
  return serialized;
}

export function applySnapshotTokenBudget(
  snapshot: AnalysisDataSnapshot,
  tokenBudget: number,
  latestPlanIds: ReadonlySet<string>,
): AnalysisDataSnapshot {
  while (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.notes.length > 0) {
    snapshot.notes.pop();
    if (!snapshot.omissions.includes('오래된 하루 메모 일부')) {
      snapshot.omissions.push('오래된 하루 메모 일부');
    }
  }
  while (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.weeklyComments.length > 0) {
    snapshot.weeklyComments.pop();
    if (!snapshot.omissions.includes('오래된 주간 코멘트 일부')) {
      snapshot.omissions.push('오래된 주간 코멘트 일부');
    }
  }
  if (estimateSnapshotTokens(snapshot) > tokenBudget) {
    let removedKpiNotes = false;
    for (const project of snapshot.projects) {
      for (const kpi of project.kpis) {
        for (const record of kpi.records) {
          if (record.note !== null) {
            record.note = null;
            removedKpiNotes = true;
          }
        }
      }
    }
    if (removedKpiNotes) snapshot.omissions.push('KPI 기록 메모');
  }
  if (estimateSnapshotTokens(snapshot) > tokenBudget && snapshot.daily.length > 0) {
    snapshot.daily = [];
    snapshot.aggregationLevel = 'weekly';
    snapshot.omissions.push('일 단위 집계를 주 단위로 상향');
  }

  while (estimateSnapshotTokens(snapshot) > tokenBudget) {
    const recordLists = snapshot.projects.flatMap((project) => project.kpis.map((kpi) => kpi.records));
    const list = recordLists.reduce<AnalysisDataSnapshot['projects'][number]['kpis'][number]['records'] | null>(
      (largest, records) => records.length > (largest?.length ?? 0) ? records : largest,
      null,
    );
    if (!list || list.length === 0) break;
    list.shift();
    if (!snapshot.omissions.includes('오래된 KPI 기록 일부')) {
      snapshot.omissions.push('오래된 KPI 기록 일부');
    }
  }

  if (estimateSnapshotTokens(snapshot) > tokenBudget) {
    snapshot.planVersions = snapshot.planVersions.filter((plan) => latestPlanIds.has(plan.id));
    snapshot.omissions.push('이전 주간 계획 버전 일부');
  }

  return snapshot;
}
