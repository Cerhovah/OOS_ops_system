import { useMemo, useState } from 'react';
import { Alert, Text } from 'react-native';

import { Card, Heading, LoadingView, Screen, StatusBanner, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { dateKey, parseWeekStartDay, weekRange } from '@/domain/calculations';
import {
  KpiEditorSheet,
  KpiRecordEditorSheet,
  ProjectEditorSheet,
} from '@/features/projects/project-editor-sheets';
import {
  ProjectKpiSection,
  ProjectNavigationSection,
  ProjectSummaryCard,
} from '@/features/projects/project-sections';
import { buildProjectsViewModel } from '@/features/projects/projects-view-model';
import type { Aggregation, Project, ProjectKpi, ProjectKpiRecord, ProjectStatus } from '@/types/domain';

interface RecordForm {
  kpiId: string;
  record: ProjectKpiRecord | null;
}

export default function ProjectsScreen() {
  const app = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [recordForm, setRecordForm] = useState<RecordForm | null>(null);
  const [recordValue, setRecordValue] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const currentWeek = weekRange(
    dateKey(new Date()),
    parseWeekStartDay(app.snapshot.settings.week_start_day),
  );
  const viewModel = useMemo(
    () => buildProjectsViewModel(app.snapshot, selectedId, currentWeek.start, currentWeek.end),
    [app.snapshot, currentWeek.end, currentWeek.start, selectedId],
  );

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

  function createKpi() {
    setKpiForm('new');
    setKpiPreset('');
    setKpiLabel('');
    setKpiUnit('');
    setAggregation('sum');
  }

  function editKpi(kpi: ProjectKpi) {
    setKpiForm(kpi);
    setKpiPreset('');
    setKpiLabel(kpi.label);
    setKpiUnit(kpi.unit ?? '');
    setAggregation(kpi.aggregation);
  }

  async function saveKpi() {
    if (!viewModel.selected || !kpiLabel.trim()) return;
    if (kpiForm === 'new') {
      await app.createKpi(viewModel.selected.id, kpiLabel.trim(), kpiUnit.trim() || null, aggregation);
    } else if (kpiForm) {
      await app.updateKpi(kpiForm.id, kpiLabel.trim(), kpiUnit.trim() || null, aggregation);
    }
    setKpiForm(null);
    setKpiLabel('');
    setKpiUnit('');
  }

  function openRecord(kpiId: string, record: ProjectKpiRecord | null = null) {
    setRecordForm({ kpiId, record });
    setRecordValue(record ? String(record.value) : '');
    setRecordNote(record?.note ?? '');
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

  return (
    <>
      <Screen>
        <Heading subtitle="시간계정과 결과물은 별도로 집계합니다.">프로젝트</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <ProjectNavigationSection
          projects={viewModel.projects}
          selectedId={viewModel.selected?.id ?? null}
          onSelect={setSelectedId}
          onCreate={() => openProject('new')}
        />
        {viewModel.selected ? (
          <>
            <ProjectSummaryCard
              project={viewModel.selected}
              totalMinutes={viewModel.totalMinutes}
              weekMinutes={viewModel.weekMinutes}
              onEdit={openProject}
            />
            <ProjectKpiSection
              kpis={viewModel.kpis}
              busy={app.busy}
              onCreate={createKpi}
              onRecord={openRecord}
              onEditRecord={(kpiId, record) => openRecord(kpiId, record)}
              onDeleteRecord={app.deleteKpiRecord}
              onEditKpi={editKpi}
            />
          </>
        ) : (
          <Card><Text style={textStyles.body}>프로젝트를 추가하십시오.</Text></Card>
        )}
      </Screen>

      <ProjectEditorSheet
        target={projectForm}
        name={name}
        description={description}
        experiment={experiment}
        decisionDate={decisionDate}
        status={status}
        busy={app.busy}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        onExperimentChange={setExperiment}
        onDecisionDateChange={setDecisionDate}
        onStatusChange={setStatus}
        onSave={saveProject}
        onDelete={app.deleteProject}
        onClose={() => setProjectForm(null)}
      />
      <KpiEditorSheet
        target={kpiForm}
        preset={kpiPreset}
        label={kpiLabel}
        unit={kpiUnit}
        aggregation={aggregation}
        busy={app.busy}
        onPresetChange={(value, presetLabel, presetUnit) => {
          setKpiPreset(value);
          if (value) {
            setKpiLabel(presetLabel);
            setKpiUnit(presetUnit);
          }
        }}
        onLabelChange={setKpiLabel}
        onUnitChange={setKpiUnit}
        onAggregationChange={setAggregation}
        onSave={saveKpi}
        onDelete={app.deleteKpi}
        onClose={() => setKpiForm(null)}
      />
      <KpiRecordEditorSheet
        visible={recordForm !== null}
        editing={Boolean(recordForm?.record)}
        value={recordValue}
        note={recordNote}
        busy={app.busy}
        onValueChange={setRecordValue}
        onNoteChange={setRecordNote}
        onSave={submitKpiRecord}
        onClose={() => setRecordForm(null)}
      />
    </>
  );
}
