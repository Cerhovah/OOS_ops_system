import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

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
import { dateKey, formatMinutes, remainingAvailableToday, todayItems } from '@/domain/calculations';
import type { Entry, Item, TodayItem } from '@/types/domain';

function amountLabel(item: Item): string {
  if (item.type === 'time') return '분';
  if (item.type === 'numeric' || item.type === 'event') return item.unit ?? '값';
  return '회';
}

function itemSummary(item: Item, entries: readonly Entry[]): string {
  const active = entries.filter((entry) => entry.itemId === item.id && !entry.deletedAt);
  if (item.type === 'time') return formatMinutes(active.reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0));
  if (item.type === 'completion') return `${active.reduce((sum, entry) => sum + (entry.count ?? 0), 0)}회`;
  if (item.type === 'count') return `${active.reduce((sum, entry) => sum + (entry.count ?? 0), 0)}회`;
  const latest = active[0];
  return latest ? `${latest.value ?? 0}${item.unit ? ` ${item.unit}` : ''}` : '—';
}

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
  const activeItems = app.snapshot.items.filter((item) => !item.deletedAt && !item.archived);
  const todayEntries = app.snapshot.entries.filter(
    (entry) => !entry.deletedAt && dateKey(new Date(entry.occurredAt)) === today,
  );
  const running = app.snapshot.entries.filter((entry) => !entry.deletedAt && entry.startedAt && !entry.endedAt);
  const visibleItems = todayItems(
    app.snapshot.items,
    app.snapshot.schedules,
    app.snapshot.manualTodayItemIds,
    running.map((entry) => entry.itemId),
    today,
  );
  const available = remainingAvailableToday(
    new Date(),
    app.snapshot.settings.day_end_time ?? DEFAULT_DAY_END_TIME,
    visibleItems,
    todayEntries,
  );
  const planned = visibleItems.reduce(
    (sum, candidate) => sum + (candidate.item.type === 'time' ? (candidate.plannedValue ?? 0) : 0),
    0,
  );
  const actual = todayEntries.reduce((sum, entry) => sum + (entry.type === 'time' ? (entry.durationMin ?? 0) : 0), 0);
  const missingItems = activeItems.filter((item) => !visibleItems.some((candidate) => candidate.item.id === item.id));
  const searchedItems = missingItems.filter((item) => item.name.toLocaleLowerCase('ko-KR').includes(itemSearch.trim().toLocaleLowerCase('ko-KR')));

  const accountNames = useMemo(
    () => Object.fromEntries(app.snapshot.accounts.map((account) => [account.id, account.name])),
    [app.snapshot.accounts],
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
    const preferred = activeItems.find((item) => item.id === app.snapshot.settings.last_timer_item_id && item.type === 'time');
    const item = preferred ?? activeItems.find((candidate) => candidate.type === 'time');
    if (!item) {
      setAdding(true);
      return;
    }
    await app.startTimer(item);
  }

  function undoLatest(item: Item) {
    const latest = todayEntries.find((entry) => entry.itemId === item.id && !entry.startedAt);
    if (latest) void app.deleteEntry(latest.id);
  }

  return (
    <>
      <Screen refreshControl={<RefreshControl refreshing={app.busy} onRefresh={() => void app.refresh()} />}>
        <Heading subtitle={`${today} · Asia/Seoul`}>오늘</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <Card style={styles.summary}>
          <View>
            <Text style={textStyles.muted}>남은 가용시간</Text>
            <Text style={styles.available}>{formatMinutes(available.displayMinutes)}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={textStyles.muted}>계획 → 실제</Text>
            <Text style={textStyles.number}>{formatMinutes(planned)} → {formatMinutes(actual)}</Text>
          </View>
        </Card>

        {running.length > 0 ? (
          <Section title="진행 중 타이머">
            {running.map((entry) => {
              const item = activeItems.find((candidate) => candidate.id === entry.itemId);
              return item ? (
                <Card key={entry.id}>
                  <Text style={textStyles.title}>{item.name}</Text>
                  <Text style={textStyles.muted}>시작 {new Date(entry.startedAt!).toLocaleTimeString('ko-KR')}</Text>
                  <AppButton label="정지" onPress={() => void app.stopTimer(entry)} />
                </Card>
              ) : null;
            })}
          </Section>
        ) : null}

        <Section title="오늘 항목">
          {visibleItems.length === 0 ? (
            <Card><Text style={textStyles.body}>오늘 자동 항목이 없습니다. + 기록에서 항목을 선택할 수 있습니다.</Text></Card>
          ) : null}
          {visibleItems.map((candidate: TodayItem) => {
            const item = candidate.item;
            const runningEntry = running.find((entry) => entry.itemId === item.id);
            const hasUndo = todayEntries.some((entry) => entry.itemId === item.id && !entry.startedAt);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} 설정`}
                onLongPress={() => router.push({ pathname: '/settings', params: { itemId: item.id } })}>
                <Card style={selectedItemId === item.id ? styles.selected : undefined}>
                  <View style={styles.rowBetween}>
                    <View style={styles.flex}>
                      <Text style={textStyles.title}>{item.name}</Text>
                      <Text style={textStyles.muted}>{accountNames[item.accountId]} · 계획 {candidate.plannedValue ?? '—'} {amountLabel(item)}</Text>
                    </View>
                    <Text style={textStyles.number}>{itemSummary(item, todayEntries)}</Text>
                  </View>
                  <View style={styles.actions}>
                    {item.type === 'time' ? (
                      <>
                        <AppButton
                          label={runningEntry ? '정지' : '▶ 타이머'}
                          onPress={() => void (runningEntry ? app.stopTimer(runningEntry) : app.startTimer(item))}
                        />
                        <AppButton label="+ 시간" variant="secondary" onPress={() => openRecord(item)} />
                      </>
                    ) : (
                      <AppButton
                        label={item.type === 'completion' ? '✓ 완료' : item.type === 'count' ? '+1' : '값 입력'}
                        onPress={() => void quickRecord(item)}
                      />
                    )}
                    {hasUndo ? <AppButton label="되돌리기" variant="plain" onPress={() => undoLatest(item)} /> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </Section>

        <View style={styles.bottomActions}>
          <AppButton label="+ 기록" variant="secondary" onPress={() => { setItemSearch(''); setAdding(true); }} />
          <AppButton label="작업 시작" onPress={() => void quickStart()} />
          <AppButton label="오늘 종료" variant="secondary" onPress={() => router.push('/today/close')} />
        </View>
      </Screen>

      <Sheet visible={adding} title="항목 선택" onClose={() => setAdding(false)}>
        <Field label="항목 검색" value={itemSearch} onChangeText={setItemSearch} placeholder="항목 이름" />
        {missingItems.length === 0 ? <Text style={textStyles.body}>추가할 다른 항목이 없습니다.</Text> : null}
        {missingItems.length > 0 && searchedItems.length === 0 ? <Text style={textStyles.body}>검색 결과가 없습니다.</Text> : null}
        {searchedItems.map((item) => (
          <AppButton key={item.id} label={`${item.name} · ${accountNames[item.accountId]}`} variant="secondary" onPress={() => void chooseAdditional(item)} />
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
          onPress={() => void submitRecord()}
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
