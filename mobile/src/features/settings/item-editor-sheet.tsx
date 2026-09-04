import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, ChoiceRow, Field, Sheet, StatusBanner, textStyles } from '@/components/ui';
import type { Account, Item, ItemType, Project } from '@/types/domain';

import type { ItemDraft } from './drafts';

const ITEM_TYPES = [
  { value: 'time', label: '시간' },
  { value: 'completion', label: '완료' },
  { value: 'count', label: '횟수' },
  { value: 'numeric', label: '수치' },
  { value: 'event', label: '이벤트' },
] as const;
const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

interface ItemEditorSheetProps {
  target: Item | 'new' | null;
  draft: ItemDraft;
  accounts: readonly Account[];
  projects: readonly Project[];
  valid: boolean;
  busy: boolean;
  onChange: (patch: Partial<ItemDraft>) => void;
  onSave: () => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onClose: () => void;
}

export function ItemEditorSheet({
  target,
  draft,
  accounts,
  projects,
  valid,
  busy,
  onChange,
  onSave,
  onDelete,
  onClose,
}: ItemEditorSheetProps) {
  return (
    <Sheet visible={target !== null} title={target === 'new' ? '항목 추가' : '항목 편집'} onClose={onClose}>
      <Field label="항목 이름" value={draft.name} onChangeText={(name) => onChange({ name })} />
      <ChoiceRow
        label="유형"
        choices={ITEM_TYPES}
        value={draft.type}
        onChange={(type) => onChange({ type: type as ItemType })}
      />
      <ChoiceRow
        label="시간계정"
        choices={accounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: account.name }))}
        value={draft.accountId}
        onChange={(accountId) => onChange({ accountId })}
      />
      <ChoiceRow
        label="프로젝트(선택)"
        choices={[{ value: '', label: '연결 안 함' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]}
        value={draft.projectId}
        onChange={(projectId) => onChange({ projectId })}
      />
      <Field label="단위(선택)" value={draft.unit} onChangeText={(unit) => onChange({ unit })} />
      <Field label="최소(선택)" value={draft.levelMin} onChangeText={(levelMin) => onChange({ levelMin })} keyboardType="decimal-pad" />
      <Field label="목표(선택)" value={draft.levelTarget} onChangeText={(levelTarget) => onChange({ levelTarget })} keyboardType="decimal-pad" />
      <Field label="상한(선택)" value={draft.levelMax} onChangeText={(levelMax) => onChange({ levelMax })} keyboardType="decimal-pad" />
      <Field label="수동 입력 기본 분(선택)" value={draft.duration} onChangeText={(duration) => onChange({ duration })} keyboardType="number-pad" />
      {draft.type === 'time' ? (
        <ChoiceRow
          label="완료 시 횟수 증가"
          choices={[{ value: '0', label: '사용 안 함' }, { value: '1', label: '1회 증가' }]}
          value={draft.countOnComplete}
          onChange={(countOnComplete) => onChange({ countOnComplete: countOnComplete === '1' ? '1' : '0' })}
        />
      ) : null}
      <Text style={textStyles.title}>요일 템플릿(선택)</Text>
      <View style={styles.actions}>
        {DAYS.map((day, index) => (
          <AppButton
            key={day}
            label={day}
            variant={(draft.weekdayMask & (1 << index)) !== 0 ? 'primary' : 'secondary'}
            onPress={() => onChange({ weekdayMask: draft.weekdayMask ^ (1 << index) })}
          />
        ))}
      </View>
      <Field label="요일 계획값(선택)" value={draft.plannedValue} onChangeText={(plannedValue) => onChange({ plannedValue })} keyboardType="decimal-pad" />
      <Field label="알림 시작 시각(선택, HH:MM)" value={draft.startTime} onChangeText={(startTime) => onChange({ startTime })} />
      <ChoiceRow
        label="이 항목 일정 알림"
        choices={[{ value: '0', label: '사용 안 함' }, { value: '1', label: '사용' }]}
        value={draft.notificationEnabled}
        onChange={(notificationEnabled) => onChange({ notificationEnabled: notificationEnabled === '1' ? '1' : '0' })}
      />
      {!valid ? <StatusBanner message="필수값과 숫자·시각 형식을 확인하십시오." /> : null}
      <AppButton label="항목 저장" onPress={() => void onSave().catch(() => undefined)} disabled={!valid || busy} />
      {target !== 'new' && target ? (
        <AppButton
          label="항목 삭제"
          variant="danger"
          disabled={busy}
          onPress={() => {
            const item = target;
            Alert.alert('항목 삭제', '소프트 삭제하며 이 화면에서 복구할 수 있습니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => void onDelete(item.id).then(onClose).catch(() => undefined),
              },
            ]);
          }}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
