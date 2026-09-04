import { Alert } from 'react-native';

import { AppButton, ChoiceRow, Field, Sheet } from '@/components/ui';
import type { Aggregation, Project, ProjectKpi, ProjectStatus } from '@/types/domain';

const STATUS_CHOICES = [
  { value: 'active', label: '진행' },
  { value: 'paused', label: '보류' },
  { value: 'closed', label: '종료' },
] as const;

const KPI_PRESETS = [
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

interface ProjectEditorSheetProps {
  target: Project | 'new' | null;
  name: string;
  description: string;
  experiment: string;
  decisionDate: string;
  status: ProjectStatus;
  busy: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onExperimentChange: (value: string) => void;
  onDecisionDateChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus) => void;
  onSave: () => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
  onClose: () => void;
}

export function ProjectEditorSheet({
  target,
  name,
  description,
  experiment,
  decisionDate,
  status,
  busy,
  onNameChange,
  onDescriptionChange,
  onExperimentChange,
  onDecisionDateChange,
  onStatusChange,
  onSave,
  onDelete,
  onClose,
}: ProjectEditorSheetProps) {
  return (
    <Sheet visible={target !== null} title={target === 'new' ? '프로젝트 추가' : '프로젝트 편집'} onClose={onClose}>
      <Field label="이름" value={name} onChangeText={onNameChange} />
      <Field label="설명" value={description} onChangeText={onDescriptionChange} multiline />
      <Field label="현재 실험" value={experiment} onChangeText={onExperimentChange} />
      <Field label="다음 판정일(YYYY-MM-DD)" value={decisionDate} onChangeText={onDecisionDateChange} />
      <ChoiceRow label="상태" choices={STATUS_CHOICES} value={status} onChange={(value) => onStatusChange(value as ProjectStatus)} />
      <AppButton
        label="프로젝트 저장"
        onPress={() => void onSave().catch(() => undefined)}
        disabled={!name.trim() || busy}
      />
      {target !== 'new' && target ? (
        <AppButton
          label="프로젝트 삭제"
          variant="danger"
          disabled={busy}
          onPress={() => {
            const project = target;
            Alert.alert('프로젝트 삭제', '소프트 삭제하며 설정에서 복구할 수 있습니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => void onDelete(project.id).then(onClose).catch(() => undefined),
              },
            ]);
          }}
        />
      ) : null}
    </Sheet>
  );
}

interface KpiEditorSheetProps {
  target: ProjectKpi | 'new' | null;
  preset: string;
  label: string;
  unit: string;
  aggregation: Aggregation;
  busy: boolean;
  onPresetChange: (value: string, label: string, unit: string) => void;
  onLabelChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onAggregationChange: (value: Aggregation) => void;
  onSave: () => Promise<void>;
  onDelete: (kpiId: string) => Promise<void>;
  onClose: () => void;
}

export function KpiEditorSheet({
  target,
  preset,
  label,
  unit,
  aggregation,
  busy,
  onPresetChange,
  onLabelChange,
  onUnitChange,
  onAggregationChange,
  onSave,
  onDelete,
  onClose,
}: KpiEditorSheetProps) {
  return (
    <Sheet visible={target !== null} title={target === 'new' ? 'KPI 추가' : 'KPI 편집'} onClose={onClose}>
      {target === 'new' ? (
        <ChoiceRow
          label="기본 KPI 선택"
          choices={KPI_PRESETS.map((candidate) => ({ value: candidate.value, label: candidate.label }))}
          value={preset}
          onChange={(value) => {
            const selected = KPI_PRESETS.find((candidate) => candidate.value === value);
            onPresetChange(value, selected?.value ? selected.label : '', selected?.value ? selected.unit : '');
          }}
        />
      ) : null}
      <Field label="KPI 이름" value={label} onChangeText={onLabelChange} />
      <Field label="단위(선택)" value={unit} onChangeText={onUnitChange} />
      <ChoiceRow
        label="집계 방식"
        choices={[{ value: 'sum', label: '합계' }, { value: 'last', label: '최근값' }, { value: 'max', label: '최댓값' }]}
        value={aggregation}
        onChange={(value) => onAggregationChange(value as Aggregation)}
      />
      <AppButton
        label="KPI 저장"
        onPress={() => void onSave().catch(() => undefined)}
        disabled={!label.trim() || busy}
      />
      {target !== 'new' && target ? (
        <AppButton
          label="KPI 삭제"
          variant="danger"
          disabled={busy}
          onPress={() => {
            const kpi = target;
            Alert.alert('KPI 삭제', '소프트 삭제하며 설정에서 복구할 수 있습니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => void onDelete(kpi.id).then(onClose).catch(() => undefined),
              },
            ]);
          }}
        />
      ) : null}
    </Sheet>
  );
}

interface KpiRecordEditorSheetProps {
  editing: boolean;
  visible: boolean;
  value: string;
  note: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function KpiRecordEditorSheet({
  editing,
  visible,
  value,
  note,
  busy,
  onValueChange,
  onNoteChange,
  onSave,
  onClose,
}: KpiRecordEditorSheetProps) {
  return (
    <Sheet visible={visible} title={editing ? 'KPI 값 수정' : 'KPI 값 기록'} onClose={onClose}>
      <Field label="값" value={value} onChangeText={onValueChange} keyboardType="decimal-pad" />
      <Field label="메모(선택)" value={note} onChangeText={onNoteChange} multiline />
      <AppButton
        label={editing ? '수정 저장' : '기록 저장'}
        onPress={() => void onSave().catch(() => undefined)}
        disabled={!value.trim() || busy}
      />
    </Sheet>
  );
}
