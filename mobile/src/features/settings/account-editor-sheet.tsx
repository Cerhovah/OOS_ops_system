import { Alert } from 'react-native';

import { AppButton, Field, Sheet } from '@/components/ui';
import type { Account } from '@/types/domain';

interface AccountEditorSheetProps {
  target: Account | 'new' | null;
  name: string;
  kind: string;
  color: string;
  busy: boolean;
  onNameChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onSave: () => Promise<void>;
  onDelete: (accountId: string) => Promise<void>;
  onClose: () => void;
}

export function AccountEditorSheet({
  target,
  name,
  kind,
  color,
  busy,
  onNameChange,
  onKindChange,
  onColorChange,
  onSave,
  onDelete,
  onClose,
}: AccountEditorSheetProps) {
  return (
    <Sheet visible={target !== null} title={target === 'new' ? '계정 추가' : '계정 편집'} onClose={onClose}>
      <Field label="계정 이름" value={name} onChangeText={onNameChange} />
      <Field label="분류(선택)" value={kind} onChangeText={onKindChange} />
      <Field label="색상(선택)" value={color} onChangeText={onColorChange} />
      <AppButton
        label="계정 저장"
        onPress={() => void onSave().catch(() => undefined)}
        disabled={!name.trim() || busy}
      />
      {target !== 'new' && target ? (
        <AppButton
          label="계정 삭제"
          variant="danger"
          disabled={busy}
          onPress={() => {
            const account = target;
            Alert.alert('계정 삭제', '계정은 소프트 삭제되며 연결 기록은 보존됩니다.', [
              { text: '취소', style: 'cancel' },
              {
                text: '삭제',
                style: 'destructive',
                onPress: () => void onDelete(account.id).then(onClose).catch(() => undefined),
              },
            ]);
          }}
        />
      ) : null}
    </Sheet>
  );
}
