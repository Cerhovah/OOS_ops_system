import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  ChoiceRow,
  Field,
  Heading,
  LoadingView,
  Screen,
  Section,
  Sheet,
  textStyles,
} from '@/components/ui';
import { useApp } from '@/context/app-context';
import { aggregateKpi, dateKey, entryBelongsToRange, formatMinutes, parseWeekStartDay, weekRange } from '@/domain/calculations';
import type { Aggregation, Project, ProjectKpi, ProjectKpiRecord, ProjectStatus } from '@/types/domain';

const statusChoices = [
  { value: 'active', label: '진행' },
  { value: 'paused', label: '보류' },
  { value: 'closed', label: '종료' },
] as const;

const kpiPresets = [
  { value: '', label: '사용자 정의', unit: '' },
  { value: '배포됨', label: '배포됨', unit: '회' },
  { value: '고유 사용자', label: '고유 사용자', unit: '명' },
  { value: '재사용자', label: '재사용자', unit: '명' },
  { value: '가입', label: '가입', unit: '명' },
  { value: '문의', label: '문의', unit: '건' },
  { value: '결제', label: '결제', unit: '건' },
  { value: '매출', label: '매출', unit: 'KRW' },
  { value: '환불', label: '환불', unit: '건' },
  { value: '인터뷰', label: '인터뷰', unit: '회' },
  { value: '피드백', label: '피드백', unit: '건' },
] as const;

export default function ProjectsScreen() {
  const app = useApp();
  const projects = app.snapshot.projects.filter((project) => !project.deletedAt);
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null);
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0] ?? null;
  const [projectForm, setProjectForm] = useState<Project | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [experiment, setExperiment] = useState('');
  const [decisionDate, setDecisionDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [kpiForm, setKpiForm] = useState<ProjectKpi | 'new' | null>(null);
  const [kpiPreset, setKpiPreset] = useState('');
  const [kpiLabel, setKpiLabel] = useState('');
  const [kpiUnit, setKpiUnit] = useState('');
  const [aggregation, setAggregation] = useState<Aggregation>('sum');
  const [recordForm, setRecordForm] = useState<{ kpiId: string; record: ProjectKpiRecord | null } | null>(null);
  const [recordValue, setRecordValue] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const currentWeek = weekRange(
    dateKey(new Date()),
    parseWeekStartDay(app.snapshot.settings.week_start_day),
  );

  const derived = useMemo(() => {
    if (!selected) return { total: 0, week: 0 };
    const itemIds = new Set(
      app.snapshot.items.filter((item) => item.projectId === selected.id && !item.deletedAt).map((item) => item.id),
    );
    const timeEntries = app.snapshot.entries.filter(
      (entry) => itemIds.has(entry.itemId) && entry.type === 'time' && !entry.deletedAt,
    );
    return {
      total: timeEntries.reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0),
      week: timeEntries
        .filter((entry) => entryBelongsToRange(entry, currentWeek.start, currentWeek.end))
        .reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0),
    };
  }, [app.snapshot.entries, app.snapshot.items, currentWeek.end, currentWeek.start, selected]);

  if (app.loading) return <LoadingView />;

  function openProject(project: Project | 'new') {
    setProjectForm(project);
    setName(project === 'new' ? '' : project.name);
    setDescription(project === 'new' ? '' : project.description ?? '');
    setExperiment(project === 'new' ? '' : project.currentExperiment ?? '');
    setDecisionDate(project === 'new' ? '' : project.nextDecisionDate ?? '');
    setStatus(project === 'new' ? 'active' : project.status);
  }

  async function saveProject() {
    if (!name.trim()) return;
    await app.saveProject({
      id: projectForm === 'new' || projectForm === null ? undefined : projectForm.id,
      name: name.trim(),
      description: description.trim() || null,
      status,
      currentExperiment: experiment.trim() || null,
      nextDecisionDate: decisionDate.trim() || null,
    });
    setProjectForm(null);
  }

  async function saveKpi() {
    if (!selected || !kpiLabel.trim()) return;
    if (kpiForm === 'new') {
      await app.createKpi(selected.id, kpiLabel.trim(), kpiUnit.trim() || null, aggregation);
    } else if (kpiForm) {
      await app.updateKpi(kpiForm.id, kpiLabel.trim(), kpiUnit.trim() || null, aggregation);
    }
    setKpiForm(null);
    setKpiLabel('');
    setKpiUnit('');
  }

  async function submitKpiRecord() {
    if (!recordForm) return;
    const value = Number(recordValue);
    if (!Number.isFinite(value)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    if (recordForm.record) {
      await app.updateKpiRecord(recordForm.record.id, value, recordNote.trim() || null);
    } else {
      await app.recordKpi(recordForm.kpiId, value, recordNote.trim() || null);
    }
    setRecordForm(null);
  }

  const selectedKpis = selected ? app.snapshot.kpis.filter((kpi) => kpi.projectId === selected.id && !kpi.deletedAt) : [];

  return (
    <>
      <Screen>
        <Heading subtitle="시간계정과 결과물은 별도로 집계합니다.">프로젝트</Heading>
        <Section title="프로젝트 목록" action={<AppButton label="+ 프로젝트" variant="plain" onPress={() => openProject('new')} />}>
          <View style={styles.projectChoices}>
            {projects.map((project) => (
              <AppButton
                key={project.id}
                label={project.name}
                variant={selected?.id === project.id ? 'primary' : 'secondary'}
                onPress={() => setSelectedId(project.id)}
              />
            ))}
          </View>
        </Section>
        {selected ? (
          <>
            <Card>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={textStyles.title}>{selected.name}</Text>
                  <Text style={textStyles.muted}>상태 {selected.status}</Text>
                </View>
                <AppButton label="편집" variant="plain" onPress={() => openProject(selected)} />
              </View>
              <Text style={textStyles.body}>누적 투입 {formatMinutes(derived.total)} · 이번 주 {formatMinutes(derived.week)}</Text>
              <Text style={textStyles.muted}>현재 실험: {selected.currentExperiment ?? '—'}</Text>
              <Text style={textStyles.muted}>다음 판정일: {selected.nextDecisionDate ?? '—'}</Text>
            </Card>
            <Section title="KPI" action={<AppButton label="+ KPI" variant="plain" onPress={() => {
              setKpiForm('new');
              setKpiPreset('');
              setKpiLabel('');
              setKpiUnit('');
              setAggregation('sum');
            }} />}>
              {selectedKpis.length === 0 ? <Text style={textStyles.body}>선택된 KPI가 없습니다.</Text> : null}
              {selectedKpis.map((kpi) => {
                const records = app.snapshot.kpiRecords.filter((record) => record.kpiId === kpi.id && !record.deletedAt);
                const values = records.map((record) => record.value);
                const recentRecords = records.slice().reverse().slice(0, 10);
                const total = aggregateKpi(values, kpi.aggregation);
                return (
                  <Card key={kpi.id}>
                    <Text style={textStyles.title}>{kpi.label}</Text>
                    <Text style={styles.kpiValue}>{total}{kpi.unit ? ` ${kpi.unit}` : ''}</Text>
                    <Text style={textStyles.muted}>집계 {kpi.aggregation} · 기록 {values.length}건</Text>
                    <AppButton
                      label="+ 기록"
                      onPress={() => {
                        setRecordForm({ kpiId: kpi.id, record: null });
                        setRecordValue('');
                        setRecordNote('');
                      }}
                    />
                    {recentRecords.map((record) => (
                      <View key={record.id} style={styles.recordRow}>
                        <View style={styles.flex}>
                          <Text style={textStyles.body}>
                            {record.value}{kpi.unit ? ` ${kpi.unit}` : ''} · {dateKey(new Date(record.occurredAt))}
                          </Text>
                          {record.note ? <Text style={textStyles.muted}>{record.note}</Text> : null}
                        </View>
                        <AppButton
                          label="수정"
                          variant="plain"
                          onPress={() => {
                            setRecordForm({ kpiId: kpi.id, record });
                            setRecordValue(String(record.value));
                            setRecordNote(record.note ?? '');
                          }}
                        />
                        <AppButton label="삭제" variant="danger" onPress={() => void app.deleteKpiRecord(record.id)} />
                      </View>
                    ))}
                    <AppButton label="KPI 편집" variant="secondary" onPress={() => {
                      setKpiForm(kpi);
                      setKpiPreset('');
                      setKpiLabel(kpi.label);
                      setKpiUnit(kpi.unit ?? '');
                      setAggregation(kpi.aggregation);
                    }} />
                  </Card>
                );
              })}
            </Section>
          </>
        ) : (
          <Card><Text style={textStyles.body}>프로젝트를 추가하십시오.</Text></Card>
        )}
      </Screen>

      <Sheet visible={projectForm !== null} title={projectForm === 'new' ? '프로젝트 추가' : '프로젝트 편집'} onClose={() => setProjectForm(null)}>
        <Field label="이름" value={name} onChangeText={setName} />
        <Field label="설명" value={description} onChangeText={setDescription} multiline />
        <Field label="현재 실험" value={experiment} onChangeText={setExperiment} />
        <Field label="다음 판정일(YYYY-MM-DD)" value={decisionDate} onChangeText={setDecisionDate} />
        <ChoiceRow label="상태" choices={statusChoices} value={status} onChange={(value) => setStatus(value as ProjectStatus)} />
        <AppButton label="프로젝트 저장" onPress={() => void saveProject()} disabled={!name.trim()} />
        {projectForm !== 'new' && projectForm ? (
          <AppButton
            label="프로젝트 삭제"
            variant="danger"
            onPress={() => {
              const project = projectForm;
              Alert.alert('프로젝트 삭제', '소프트 삭제하며 설정에서 복구할 수 있습니다.', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => void app.deleteProject(project.id).then(() => setProjectForm(null)) },
              ]);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={kpiForm !== null} title={kpiForm === 'new' ? 'KPI 추가' : 'KPI 편집'} onClose={() => setKpiForm(null)}>
        {kpiForm === 'new' ? (
          <ChoiceRow
            label="기본 KPI 선택"
            choices={kpiPresets.map((preset) => ({ value: preset.value, label: preset.label }))}
            value={kpiPreset}
            onChange={(value) => {
              setKpiPreset(value);
              const preset = kpiPresets.find((candidate) => candidate.value === value);
              if (preset && preset.value) {
                setKpiLabel(preset.label);
                setKpiUnit(preset.unit);
              }
            }}
          />
        ) : null}
        <Field label="KPI 이름" value={kpiLabel} onChangeText={setKpiLabel} />
        <Field label="단위(선택)" value={kpiUnit} onChangeText={setKpiUnit} />
        <ChoiceRow
          label="집계 방식"
          choices={[{ value: 'sum', label: '합계' }, { value: 'last', label: '최근값' }, { value: 'max', label: '최댓값' }]}
          value={aggregation}
          onChange={(value) => setAggregation(value as Aggregation)}
        />
        <AppButton label="KPI 저장" onPress={() => void saveKpi()} disabled={!kpiLabel.trim()} />
        {kpiForm !== 'new' && kpiForm ? (
          <AppButton label="KPI 삭제" variant="danger" onPress={() => {
            const kpi = kpiForm;
            Alert.alert('KPI 삭제', '소프트 삭제하며 설정에서 복구할 수 있습니다.', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => void app.deleteKpi(kpi.id).then(() => setKpiForm(null)) },
            ]);
          }} />
        ) : null}
      </Sheet>

      <Sheet
        visible={recordForm !== null}
        title={recordForm?.record ? 'KPI 값 수정' : 'KPI 값 기록'}
        onClose={() => setRecordForm(null)}>
        <Field label="값" value={recordValue} onChangeText={setRecordValue} keyboardType="decimal-pad" />
        <Field label="메모(선택)" value={recordNote} onChangeText={setRecordNote} multiline />
        <AppButton label={recordForm?.record ? '수정 저장' : '기록 저장'} onPress={() => void submitKpiRecord()} disabled={!recordValue.trim()} />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  projectChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1, gap: 4 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiValue: { color: '#17202A', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
