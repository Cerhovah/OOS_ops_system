import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  Field,
  Heading,
  LoadingView,
  Screen,
  Section,
  Sheet,
  StatusBanner,
  textStyles,
} from '@/components/ui';
import { COLORS, DEFAULT_DAY_END_TIME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { dateKey, formatMinutes } from '@/domain/calculations';
import {
  amountLabel,
  buildTodayViewModel,
  searchMissingItems,
} from '@/features/today/today-view-model';
import type { Entry, Item } from '@/types/domain';

export default function TodayScreen() {
  const app = useApp();
  const params = useLocalSearchParams<{ itemId?: string | string[] }>();
  const selectedItemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const [recordItem, setRecordItem] = useState<Item | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const today = dateKey(new Date());
  const dayEndTime = app.snapshot.settings.day_end_time ?? DEFAULT_DAY_END_TIME;
  const viewModel = useMemo(
    () => buildTodayViewModel(app.snapshot, today, new Date(), dayEndTime),
    [app.snapshot, dayEndTime, today],
  );
  const searchedItems = useMemo(
    () => searchMissingItems(viewModel.missingItems, itemSearch),
    [itemSearch, viewModel.missingItems],
  );

  if (app.loading) return <LoadingView />;

  function openRecord(item: Item) {
    setRecordItem(item);
    setAmount(String(item.defaultDurationMin ?? (item.type === 'count' || item.type === 'completion' ? 1 : '')));
    setNote('');
  }

  async function submitRecord() {
    if (!recordItem) return;
    const parsed = recordItem.type === 'event' && amount.trim() === '' ? null : Number(amount);
    if (parsed !== null && !Number.isFinite(parsed)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    await app.createEntry(recordItem, parsed, note.trim() || null);
    setRecordItem(null);
  }

  async function quickRecord(item: Item) {
    if (item.type === 'completion' || item.type === 'count') await app.createEntry(item, 1);
    else openRecord(item);
  }

  async function chooseAdditional(item: Item) {
    await app.addTodayItem(item.id);
    setAdding(false);
    await quickRecord(item);
  }

  async function quickStart() {
    const preferred = viewModel.activeItems.find(
      (item) => item.id === app.snapshot.settings.last_timer_item_id && item.type === 'time',
    );
    const item = preferred ?? viewModel.activeItems.find((candidate) => candidate.type === 'time');
    if (!item) {
      setAdding(true);
      return;
    }
    await app.startTimer(item);
  }

  function undoLatest(entry: Entry | null) {
    if (entry) void app.deleteEntry(entry.id).catch(() => undefined);
  }

  return (
    <>
      <Screen
        refreshControl={(
          <RefreshControl
            refreshing={app.busy}
            onRefresh={() => void app.refresh().catch(() => undefined)}
          />
        )}>
        <Heading subtitle={`${today} · Asia/Seoul`}>오늘</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <Card style={styles.summary}>
          <View>
            <Text style={textStyles.muted}>남은 가용시간</Text>
            <Text style={styles.available}>{formatMinutes(viewModel.available.displayMinutes)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={textStyles.muted}>계획 → 실제</Text>
            <Text style={textStyles.number}>
              {formatMinutes(viewModel.plannedMinutes)} → {formatMinutes(viewModel.actualMinutes)}
            </Text>
          </View>
        </Card>

        {viewModel.runningTimers.length > 0 ? (
          <Section title="진행 중 타이머">
            {viewModel.runningTimers.map(({ entry, item }) => (
              <Card key={entry.id}>
                <Text style={textStyles.title}>{item.name}</Text>
                <Text style={textStyles.muted}>시작 {new Date(entry.startedAt!).toLocaleTimeString('ko-KR')}</Text>
                <AppButton
                  label="정지"
                  onPress={() => void app.stopTimer(entry).catch(() => undefined)}
                  disabled={app.busy}
                />
              </Card>
            ))}
          </Section>
        ) : null}

        <Section title="오늘 항목">
          {viewModel.visibleItems.length === 0 ? (
            <Card><Text style={textStyles.body}>오늘 자동 항목이 없습니다. + 기록에서 항목을 선택할 수 있습니다.</Text></Card>
          ) : null}
          {viewModel.visibleItems.map(({ candidate, runningEntry, latestManualEntry, summary }) => {
            const item = candidate.item;
            return (
              <Card key={item.id} style={selectedItemId === item.id ? styles.selected : undefined}>
                <View style={styles.rowBetween}>
                  <View style={styles.flex}>
                    <Text style={textStyles.title}>{item.name}</Text>
                    <Text style={textStyles.muted}>
                      {viewModel.accountNames[item.accountId]} · 계획 {candidate.plannedValue ?? '—'} {amountLabel(item)}
                    </Text>
                  </View>
                  <Text style={textStyles.number}>{summary}</Text>
                </View>
                <View style={styles.actions}>
                  {item.type === 'time' ? (
                    <>
                      <AppButton
                        label={runningEntry ? '정지' : '▶ 타이머'}
                        onPress={() => void (runningEntry
                          ? app.stopTimer(runningEntry)
                          : app.startTimer(item)).catch(() => undefined)}
                        disabled={app.busy}
                      />
                      <AppButton label="+ 시간" variant="secondary" onPress={() => openRecord(item)} />
                    </>
                  ) : (
                    <AppButton
                      label={item.type === 'completion' ? '✓ 완료' : item.type === 'count' ? '+1' : '값 입력'}
                      onPress={() => void quickRecord(item).catch(() => undefined)}
                      disabled={app.busy}
                    />
                  )}
                  {latestManualEntry ? (
                    <AppButton
                      label="되돌리기"
                      variant="plain"
                      onPress={() => undoLatest(latestManualEntry)}
                      disabled={app.busy}
                    />
                  ) : null}
                  <AppButton
                    label="항목 편집"
                    variant="plain"
                    onPress={() => router.push({ pathname: '/settings', params: { itemId: item.id } })}
                  />
                </View>
              </Card>
            );
          })}
        </Section>

        <View style={styles.bottomActions}>
          <AppButton label="+ 기록" variant="secondary" onPress={() => { setItemSearch(''); setAdding(true); }} />
          <AppButton
            label="작업 시작"
            onPress={() => void quickStart().catch(() => undefined)}
            disabled={app.busy}
          />
          <AppButton label="오늘 종료" variant="secondary" onPress={() => router.push('/today/close')} />
        </View>
      </Screen>

      <Sheet visible={adding} title="항목 선택" onClose={() => setAdding(false)}>
        <Field label="항목 검색" value={itemSearch} onChangeText={setItemSearch} placeholder="항목 이름" />
        {viewModel.missingItems.length === 0 ? <Text style={textStyles.body}>추가할 다른 항목이 없습니다.</Text> : null}
        {viewModel.missingItems.length > 0 && searchedItems.length === 0 ? <Text style={textStyles.body}>검색 결과가 없습니다.</Text> : null}
        {searchedItems.map((item) => (
          <AppButton
            key={item.id}
            label={`${item.name} · ${viewModel.accountNames[item.accountId]}`}
            variant="secondary"
            onPress={() => void chooseAdditional(item).catch(() => undefined)}
            disabled={app.busy}
          />
        ))}
      </Sheet>

      <Sheet visible={recordItem !== null} title={recordItem ? `${recordItem.name} 기록` : '기록'} onClose={() => setRecordItem(null)}>
        <Field
          label={recordItem?.type === 'event' ? `${amountLabel(recordItem)}(선택)` : recordItem ? amountLabel(recordItem) : '값'}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />
        <Field label="메모(선택)" value={note} onChangeText={setNote} multiline />
        <AppButton
          label="기록 저장"
          onPress={() => void submitRecord().catch(() => undefined)}
          disabled={(recordItem?.type !== 'event' && amount.trim() === '') || app.busy}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryRight: { alignItems: 'flex-end', gap: 4 },
  available: { color: COLORS.text, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  flex: { flex: 1, gap: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bottomActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  selected: { borderColor: COLORS.accent, borderWidth: 2 },
});
