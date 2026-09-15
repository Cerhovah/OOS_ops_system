import { AppButton, Field, Sheet } from '@/components/ui';
import { parseDurationToMinutes } from '@/domain/calculations';
import type { Entry } from '@/types/domain';

interface EntryEditorSheetProps {
  target: Entry | null;
  value: string;
  note: string;
  busy: boolean;
  onValueChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}

export function EntryEditorSheet({
  target,
  value,
  note,
  busy,
  onValueChange,
  onNoteChange,
  onSave,
  onClose,
}: EntryEditorSheetProps) {
  const parsed = target?.type === 'time' ? parseDurationToMinutes(value) : Number(value);
  const invalid = (target?.type !== 'event' && value.trim() === '')
    || (value.trim() !== '' && (parsed === null || !Number.isFinite(parsed)));

  return (
    <Sheet visible={target !== null} title="기록 수정" onClose={onClose}>
      <Field label={target?.type === 'time' ? '시간(분)' : '값'} value={value} onChangeText={onValueChange} keyboardType="decimal-pad" />
      <Field label="메모" value={note} onChangeText={onNoteChange} multiline />
      <AppButton
        label="수정 저장"
        onPress={() => void onSave().catch(() => undefined)}
        disabled={invalid || busy}
      />
    </Sheet>
  );
}
