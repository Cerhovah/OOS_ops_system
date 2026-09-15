import { useState } from 'react';

import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { parseDurationToMinutes } from '@/domain/calculations';
import { AnalysisRecoverySection } from '@/features/settings/analysis-recovery-section';
import { RecentEntriesSection, RecoverySection, entryAmount } from '@/features/settings/data-sections';
import { EntryEditorSheet } from '@/features/settings/entry-editor-sheet';
import type { Entry } from '@/types/domain';

export default function RecordManagementRoute() {
  const app = useApp();
  const [target, setTarget] = useState<Entry | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  if (app.loading) return <LoadingView />;

  function open(entry: Entry) {
    setTarget(entry);
    setValue(entryAmount(entry)?.toString() ?? '');
    setNote(entry.note ?? '');
  }

  async function save() {
    if (!target) return;
    const nextValue = target.type === 'event' && value.trim() === ''
      ? null
      : target.type === 'time' ? parseDurationToMinutes(value) : Number(value);
    if (nextValue !== null && !Number.isFinite(nextValue)) return;
    await app.updateEntry(target.id, nextValue, note.trim() || null);
    setTarget(null);
  }

  return (
    <>
      <Screen>
        <Heading subtitle="최근 기록을 수정하고 소프트 삭제된 데이터를 복구합니다.">기록 관리</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <RecentEntriesSection onEdit={open} />
        <RecoverySection />
        <AnalysisRecoverySection />
      </Screen>
      <EntryEditorSheet target={target} value={value} note={note} busy={app.busy}
        onValueChange={setValue} onNoteChange={setNote} onSave={save} onClose={() => setTarget(null)} />
    </>
  );
}
