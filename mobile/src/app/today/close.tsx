import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppBar, AppButton, Field, LoadingView, Screen, StatusBanner, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { dateKey, formatMinutes, todayItems } from '@/domain/calculations';
import {
  createCloseNoteDraft,
  editCloseNoteDraft,
  finishCloseNoteSave,
  hydrateCloseNoteDraft,
  isCloseNoteDraftReady,
} from '@/features/today/close-note-draft';
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

export default function CloseDayScreen() {
  const app = useApp();
  const today = dateKey(new Date());
  const existing = app.snapshot.closures.find((closure) => closure.date === today);
  const noteSourceKey = JSON.stringify([
    today,
    existing?.id ?? null,
    existing?.closedAt ?? null,
    existing?.note ?? null,
  ]);
  const [noteDraft, setNoteDraft] = useState(() => createCloseNoteDraft(today));
  const entries = app.snapshot.entries.filter(
    (entry) => !entry.deletedAt && dateKey(new Date(entry.occurredAt)) === today,
  );
  const visible = todayItems(
    app.snapshot.items,
    app.snapshot.schedules,
    app.snapshot.manualTodayItemIds,
    app.snapshot.entries.filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt).map((entry) => entry.itemId),
    today,
  );
  const rows = useMemo(
    () =>
      visible.map((candidate) => {
        const actual = entries
          .filter((entry) => entry.itemId === candidate.item.id && entry.type === 'time')
          .reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0);
        const planned = candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0;
        return { id: candidate.item.id, name: candidate.item.name, planned, actual, difference: actual - planned };
      }),
    [entries, visible],
  );
  const planned = rows.reduce((sum, row) => sum + row.planned, 0);
  const actual = rows.reduce((sum, row) => sum + row.actual, 0);

  useEffect(() => {
    if (app.loading) return;
    setNoteDraft((current) => hydrateCloseNoteDraft(current, {
      date: today,
      sourceKey: noteSourceKey,
      value: existing?.note ?? '',
    }));
  }, [app.loading, existing?.note, noteSourceKey, today]);

  const noteReady = isCloseNoteDraftReady(noteDraft, today, noteSourceKey);

  if (app.loading || !noteReady) return <LoadingView />;

  async function submit() {
    const submittedDate = today;
    const submittedValue = noteDraft.value;
    await app.closeDay(
      submittedDate,
      planned,
      actual,
      JSON.stringify({ date: submittedDate, rows }),
      submittedValue.trim() || null,
    );
    setNoteDraft((current) => finishCloseNoteSave(current, submittedDate, submittedValue));
    Alert.alert('오늘 돌아보기 저장', '오늘 메모를 저장했습니다. 기록은 계속 수정할 수 있습니다.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  }

  return (
    <Screen contentGap={tokens.space.sm} horizontalPadding={tokens.space.lg} topPadding={tokens.space.md}>
      <AppBar title="오늘 돌아보기" meta="기록은 잠기지 않습니다" />
      {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
      <View accessible accessibilityLabel={`오늘 ${formatMinutes(actual)} 기록, ${visible.length}개 항목`} style={styles.summary}>
        <Text style={textStyles.title}>오늘 {formatMinutes(actual)} 기록 · {visible.length}개 항목</Text>
      </View>
      <Field
        label="오늘의 흐름에서 기억할 점"
        value={noteDraft.value}
        onChangeText={(value) => setNoteDraft((current) => editCloseNoteDraft(current, value))}
        multiline
        placeholder="짧게 적어도 충분합니다."
      />
      <AppButton
        label={existing ? '저장 내용 갱신' : '저장하고 오늘 마무리'}
        onPress={() => void submit().catch(() => undefined)}
        disabled={app.busy || !noteReady}
      />
      <AppButton label="나중에" variant="secondary" onPress={() => router.back()} disabled={app.busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { minHeight: 48, justifyContent: 'center', borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceSubtle, paddingHorizontal: tokens.space.sm },
});
