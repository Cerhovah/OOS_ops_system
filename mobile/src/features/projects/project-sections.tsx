import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Section, textStyles } from '@/components/ui';
import { dateKey, formatMinutes } from '@/domain/calculations';
import type { Project, ProjectKpi, ProjectKpiRecord } from '@/types/domain';

import type { ProjectKpiViewModel } from './projects-view-model';

interface ProjectNavigationSectionProps {
  projects: readonly Project[];
  selectedId: string | null;
  onSelect: (projectId: string) => void;
  onCreate: () => void;
}

export function ProjectNavigationSection({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: ProjectNavigationSectionProps) {
  return (
    <Section title="프로젝트 목록" action={<AppButton label="+ 프로젝트" variant="plain" onPress={onCreate} />}>
      <View style={styles.projectChoices}>
        {projects.map((project) => (
          <AppButton
            key={project.id}
            label={project.name}
            variant={selectedId === project.id ? 'primary' : 'secondary'}
            onPress={() => onSelect(project.id)}
          />
        ))}
      </View>
    </Section>
  );
}

interface ProjectSummaryCardProps {
  project: Project;
  totalMinutes: number;
  weekMinutes: number;
  onEdit: (project: Project) => void;
}

export function ProjectSummaryCard({ project, totalMinutes, weekMinutes, onEdit }: ProjectSummaryCardProps) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={textStyles.title}>{project.name}</Text>
          <Text style={textStyles.muted}>상태 {project.status}</Text>
        </View>
        <AppButton label="편집" variant="plain" onPress={() => onEdit(project)} />
      </View>
      <Text style={textStyles.body}>누적 투입 {formatMinutes(totalMinutes)} · 이번 주 {formatMinutes(weekMinutes)}</Text>
      <Text style={textStyles.muted}>현재 실험: {project.currentExperiment ?? '—'}</Text>
      <Text style={textStyles.muted}>다음 판정일: {project.nextDecisionDate ?? '—'}</Text>
    </Card>
  );
}

interface ProjectKpiSectionProps {
  kpis: readonly ProjectKpiViewModel[];
  busy: boolean;
  onCreate: () => void;
  onRecord: (kpiId: string) => void;
  onEditRecord: (kpiId: string, record: ProjectKpiRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onEditKpi: (kpi: ProjectKpi) => void;
}

export function ProjectKpiSection({
  kpis,
  busy,
  onCreate,
  onRecord,
  onEditRecord,
  onDeleteRecord,
  onEditKpi,
}: ProjectKpiSectionProps) {
  return (
    <Section title="KPI" action={<AppButton label="+ KPI" variant="plain" onPress={onCreate} />}>
      {kpis.length === 0 ? <Text style={textStyles.body}>선택된 KPI가 없습니다.</Text> : null}
      {kpis.map(({ kpi, total, recordCount, recentRecords }) => (
        <Card key={kpi.id}>
          <Text style={textStyles.title}>{kpi.label}</Text>
          <Text style={styles.kpiValue}>{total}{kpi.unit ? ` ${kpi.unit}` : ''}</Text>
          <Text style={textStyles.muted}>집계 {kpi.aggregation} · 기록 {recordCount}건</Text>
          <AppButton label="+ 기록" onPress={() => onRecord(kpi.id)} />
          {recentRecords.map((record) => (
            <View key={record.id} style={styles.recordRow}>
              <View style={styles.flex}>
                <Text style={textStyles.body}>
                  {record.value}{kpi.unit ? ` ${kpi.unit}` : ''} · {dateKey(new Date(record.occurredAt))}
                </Text>
                {record.note ? <Text style={textStyles.muted}>{record.note}</Text> : null}
              </View>
              <AppButton label="수정" variant="plain" onPress={() => onEditRecord(kpi.id, record)} />
              <AppButton
                label="삭제"
                variant="danger"
                onPress={() => void onDeleteRecord(record.id).catch(() => undefined)}
                disabled={busy}
              />
            </View>
          ))}
          <AppButton label="KPI 편집" variant="secondary" onPress={() => onEditKpi(kpi)} />
        </Card>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  projectChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, gap: 4 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiValue: { color: '#17202A', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
