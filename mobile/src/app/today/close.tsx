import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Heading, LoadingView, Screen, Section, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { dateKey, formatMinutes, todayItems } from '@/domain/calculations';

export default function CloseDayScreen() {
  const app = useApp();
  const today = dateKey(new Date());
  const existing = app.snapshot.closures.find((closure) => closure.date === today);
  const [note, setNote] = useState(existing?.note ?? '');
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

  if (app.loading) return <LoadingView />;

  async function submit() {
    await app.closeDay(today, planned, actual, JSON.stringify({ date: today, rows }), note.trim() || null);
    Alert.alert('오늘 종료 저장', '종료 스냅샷을 저장했습니다. 기록은 계속 수정할 수 있습니다.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  }

  return (
    <Screen>
      <Heading subtitle="종료는 기록을 잠그지 않습니다.">오늘 종료</Heading>
      <Card>
        <Text style={textStyles.muted}>계획 → 실제 · 차이</Text>
        <Text style={styles.total}>{formatMinutes(planned)} → {formatMinutes(actual)} · {formatMinutes(actual - planned)}</Text>
      </Card>
      <Section title="항목별 계산">
        {rows.map((row) => (
          <Card key={row.id}>
            <View style={styles.row}>
              <Text style={textStyles.body}>{row.name}</Text>
              <Text style={textStyles.number}>{formatMinutes(row.planned)} / {formatMinutes(row.actual)} · {formatMinutes(row.difference)}</Text>
            </View>
          </Card>
        ))}
      </Section>
      <Field label="한 줄 메모" value={note} onChangeText={setNote} multiline placeholder="필요한 사실을 기록하십시오." />
      <AppButton label={existing ? '종료 스냅샷 갱신' : '종료'} onPress={() => void submit()} disabled={app.busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 22, color: '#17202A', fontWeight: '800', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
