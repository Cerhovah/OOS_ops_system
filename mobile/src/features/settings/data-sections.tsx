import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Section, textStyles } from '@/components/ui';
import { APP_NAME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { useSync } from '@/context/sync-context';
import { dateKey } from '@/domain/calculations';
import type { Entry } from '@/types/domain';

import { ANALYSIS_MODEL, ANALYSIS_PROVIDER } from '@/analysis/provider-registry';

const EXPORT_TABLES = [
  'accounts', 'projects', 'items', 'item_schedules', 'project_kpis', 'project_kpi_records',
  'weekly_plans', 'weekly_plan_lines', 'entries', 'day_notes', 'day_closures',
  'weekly_comments', 'today_item_additions', 'analysis_sessions', 'ai_proposals',
  'settings', 'sync_outbox', 'sync_conflicts', 'sync_state',
] as const;

export function entryAmount(entry: Entry): number | null {
  return entry.durationMin ?? entry.value ?? entry.count;
}

export function RecentEntriesSection({ onEdit }: { onEdit: (entry: Entry) => void }) {
  const app = useApp();
  const recentEntries = app.snapshot.entries.filter((entry) => !entry.deletedAt && !entry.startedAt).slice(0, 30);
  const itemNames = new Map(app.snapshot.items.map((item) => [item.id, item.name]));

  return (
    <Section title="최근 기록 수정·삭제">
      {recentEntries.map((entry) => (
        <Card key={entry.id}>
          <Text style={textStyles.title}>{itemNames.get(entry.itemId) ?? '삭제된 항목'}</Text>
          <Text style={textStyles.body}>{entry.type} · {entryAmount(entry) ?? '—'} · {dateKey(new Date(entry.occurredAt))}</Text>
          <View style={styles.actions}>
            <AppButton label="수정" variant="secondary" onPress={() => onEdit(entry)} />
            <AppButton
              label="삭제"
              variant="danger"
              onPress={() => void app.deleteEntry(entry.id).catch(() => undefined)}
              disabled={app.busy}
            />
          </View>
        </Card>
      ))}
    </Section>
  );
}

export function RecoverySection() {
  const app = useApp();
  const deletedEntries = app.snapshot.entries.filter((entry) => entry.deletedAt);
  const deletedItems = app.snapshot.items.filter((item) => item.deletedAt);
  const deletedAccounts = app.snapshot.accounts.filter((account) => account.deletedAt);
  const deletedProjects = app.snapshot.projects.filter((project) => project.deletedAt);
  const deletedKpis = app.snapshot.kpis.filter((kpi) => kpi.deletedAt);
  const deletedKpiRecords = app.snapshot.kpiRecords.filter((record) => record.deletedAt);
  const itemNames = new Map(app.snapshot.items.map((item) => [item.id, item.name]));
  const kpiNames = new Map(app.snapshot.kpis.map((kpi) => [kpi.id, kpi.label]));
  const deletedCount = deletedEntries.length + deletedItems.length + deletedAccounts.length
    + deletedProjects.length + deletedKpis.length + deletedKpiRecords.length;

  return (
    <Section title="삭제된 데이터 복구">
      {deletedEntries.map((entry) => (
        <Card key={entry.id}>
          <Text style={textStyles.body}>기록 · {itemNames.get(entry.itemId) ?? entry.itemId} · {entryAmount(entry) ?? '—'}</Text>
          <AppButton
            label="기록 복구"
            variant="secondary"
            onPress={() => void app.restoreEntry(entry.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedItems.map((item) => (
        <Card key={item.id}>
          <Text style={textStyles.body}>항목 · {item.name}</Text>
          <AppButton
            label="항목 복구"
            variant="secondary"
            onPress={() => void app.restoreItem(item.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedAccounts.map((account) => (
        <Card key={account.id}>
          <Text style={textStyles.body}>계정 · {account.name}</Text>
          <AppButton
            label="계정 복구"
            variant="secondary"
            onPress={() => void app.restoreAccount(account.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedProjects.map((project) => (
        <Card key={project.id}>
          <Text style={textStyles.body}>프로젝트 · {project.name}</Text>
          <AppButton
            label="프로젝트 복구"
            variant="secondary"
            onPress={() => void app.restoreProject(project.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedKpis.map((kpi) => (
        <Card key={kpi.id}>
          <Text style={textStyles.body}>KPI · {kpi.label}</Text>
          <AppButton
            label="KPI 복구"
            variant="secondary"
            onPress={() => void app.restoreKpi(kpi.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedKpiRecords.map((record) => (
        <Card key={record.id}>
          <Text style={textStyles.body}>KPI 기록 · {kpiNames.get(record.kpiId) ?? record.kpiId} · {record.value}</Text>
          <AppButton
            label="KPI 기록 복구"
            variant="secondary"
            onPress={() => void app.restoreKpiRecord(record.id).catch(() => undefined)}
            disabled={app.busy}
          />
        </Card>
      ))}
      {deletedCount === 0 ? <Text style={textStyles.body}>삭제된 데이터가 없습니다.</Text> : null}
    </Section>
  );
}

export function ExportSection() {
  const app = useApp();
  return (
    <Section title="데이터 내보내기">
      <AppButton
        label="전체 JSON 내보내기"
        onPress={() => void app.exportJson().catch(() => undefined)}
        disabled={app.busy}
      />
      <Text style={textStyles.muted}>CSV는 테이블별로 공유합니다. 소프트 삭제 행과 계획 전 버전을 포함합니다.</Text>
      <View style={styles.actions}>
        {EXPORT_TABLES.map((table) => (
          <AppButton
            key={table}
            label={`${table}.csv`}
            variant="secondary"
            onPress={() => void app.exportCsv(table).catch(() => undefined)}
            disabled={app.busy}
          />
        ))}
      </View>
    </Section>
  );
}

export function AppInfoSection({ onReset }: { onReset: () => void }) {
  const app = useApp();
  const sync = useSync();
  return (
    <Section title="앱 정보와 초기화">
      <Card>
        <Text style={textStyles.body}>{APP_NAME} · 로컬 우선</Text>
        <Text style={textStyles.muted}>
          AI 분석 · {sync.session ? `${ANALYSIS_PROVIDER} / ${ANALYSIS_MODEL} 서버 연결` : 'Supabase 로그인 필요'}
        </Text>
        <AppButton label="전체 초기화" variant="danger" onPress={onReset} disabled={app.busy} />
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
