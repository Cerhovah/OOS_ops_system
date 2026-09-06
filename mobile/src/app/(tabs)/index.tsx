import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton, Field, Heading, LoadingView, Screen, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { DEFAULT_DAY_END_TIME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { dateKey } from '@/domain/calculations';
import {
  ChoiceChips,
  FixedActionBar,
  TaskSheet,
  TimerView,
} from '@/features/today/today-components';
import {
  amountLabel,
  buildTodayViewModel,
  searchMissingItems,
} from '@/features/today/today-view-model';
import { COLORS } from '@/theme/colors';
import type { Item, ItemInput, ItemType } from '@/types/domain';

type SheetMode = 'tasks' | 'add-existing' | 'quick-add' | 'manual-items' | null;

const itemTypeChoices: readonly { value: ItemType; label: string }[] = [
  { value: 'time', label: '시간' },
  { value: 'completion', label: '완료' },
  { value: 'count', label: '횟수' },
  { value: 'numeric', label: '수치' },
  { value: 'event', label: '이벤트' },
];

export default function TodayScreen() {
  const app = useApp();
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [recordItem, setRecordItem] = useState<Item | null>(null);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickType, setQuickType] = useState<ItemType>('time');
  const [quickDuration, setQuickDuration] = useState('');
  const autoOpened = useRef(false);
  const today = dateKey(new Date());
  const todayLabel = formatTodayLabel(new Date());
  const dayEndTime = app.snapshot.settings.day_end_time ?? DEFAULT_DAY_END_TIME;
  const viewModel = useMemo(
    () => buildTodayViewModel(app.snapshot, today, new Date(), dayEndTime),
    [app.snapshot, dayEndTime, today],
  );
  const activeAccounts = useMemo(
    () => app.snapshot.accounts.filter((account) => !account.deletedAt && !account.archived),
    [app.snapshot.accounts],
  );
  const searchedMissingItems = useMemo(
    () => searchMissingItems(viewModel.missingItems, itemSearch),
    [itemSearch, viewModel.missingItems],
  );

  useEffect(() => {
    if (app.loading || autoOpened.current) return;
    autoOpened.current = true;
    if (viewModel.runningTimers.length === 0) setSheetMode('tasks');
  }, [app.loading, viewModel.runningTimers.length]);

  if (app.loading) return <LoadingView />;

  function openManualRecord(item: Item) {
    setSheetMode(null);
    setRecordItem(item);
    setRecordAmount(String(item.defaultDurationMin ?? (item.type === 'count' || item.type === 'completion' ? 1 : '')));
    setRecordNote('');
  }

  async function selectTask(item: Item) {
    if (item.type === 'time') {
      await app.startTimer(item);
      setSheetMode(null);
      return;
    }
    if (item.type === 'completion' || item.type === 'count') {
      await app.createEntry(item, 1);
      setSheetMode(null);
      return;
    }
    openManualRecord(item);
  }

  async function addExistingItem(item: Item) {
    await app.addTodayItem(item.id);
    setItemSearch('');
    setSheetMode('tasks');
  }

  function startQuickAdd() {
    setQuickName('');
    setQuickAccountId(activeAccounts[0]?.id ?? '');
    setQuickType('time');
    setQuickDuration('');
    setSheetMode('quick-add');
  }

  async function saveQuickItem() {
    const duration = quickDuration.trim() === '' ? null : Number(quickDuration);
    if (!quickName.trim() || !quickAccountId) {
      Alert.alert('입력 확인', '이름과 계정을 선택하십시오.');
      return;
    }
    if (duration !== null && (!Number.isInteger(duration) || duration <= 0)) {
      Alert.alert('입력 확인', '시간은 1분 이상의 정수로 입력하십시오.');
      return;
    }
    const input: ItemInput = {
      name: quickName.trim(),
      accountId: quickAccountId,
      projectId: null,
      type: quickType,
      unit: null,
      levelMin: null,
      levelTarget: null,
      levelMax: null,
      defaultDurationMin: quickType === 'time' ? duration : null,
      countOnComplete: false,
      weekdayMask: 0,
      plannedValue: null,
      startTime: null,
      autoCreate: false,
    };
    const itemId = await app.saveItem(input);
    await app.addTodayItem(itemId);
    setSheetMode('tasks');
  }

  async function submitManualRecord() {
    if (!recordItem) return;
    const amount = recordItem.type === 'event' && recordAmount.trim() === '' ? null : Number(recordAmount);
    if (amount !== null && !Number.isFinite(amount)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    await app.createEntry(recordItem, amount, recordNote.trim() || null);
    setRecordItem(null);
  }

  return (
    <>
      <Screen
        refreshControl={(
          <RefreshControl refreshing={app.busy} onRefresh={() => void app.refresh().catch(() => undefined)} />
        )}>
        <Heading subtitle={todayLabel}>오늘</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        {viewModel.runningTimers.length > 0 ? (
          viewModel.runningTimers.map(({ entry, item }) => (
            <TimerView
              key={entry.id}
              entry={entry}
              item={item}
              busy={app.busy}
              onStop={() => void app.stopTimer(entry).catch(() => undefined)}
              onOpenTasks={() => setSheetMode('tasks')}
            />
          ))
        ) : (
          <View style={styles.idle}>
            <AppButton label="오늘의 할일 확인" onPress={() => setSheetMode('tasks')} style={styles.primaryAction} />
            <View style={styles.emptyState}>
              <Text style={styles.emptyLabel}>지금 실행 중</Text>
              <Text style={styles.emptyMark}>—</Text>
              <Text style={textStyles.muted}>현재 실행 중인 항목이 없습니다.</Text>
            </View>
          </View>
        )}
      </Screen>

      <TaskSheet
        visible={sheetMode === 'tasks'}
        items={viewModel.visibleItems.map(({ candidate }) => candidate)}
        onClose={() => setSheetMode(null)}
        onItemPress={(item) => void selectTask(item).catch(() => undefined)}
        onAddItem={() => { setItemSearch(''); setSheetMode('add-existing'); }}
        onManualRecord={() => setSheetMode('manual-items')}
      />

      <Sheet visible={sheetMode === 'add-existing'} title="오늘 할일 추가" onClose={() => setSheetMode('tasks')}>
        <Field label="항목 검색" value={itemSearch} onChangeText={setItemSearch} placeholder="항목 이름" />
        {viewModel.missingItems.length === 0 ? <Text style={textStyles.body}>추가할 기존 항목이 없습니다.</Text> : null}
        {viewModel.missingItems.length > 0 && searchedMissingItems.length === 0 ? <Text style={textStyles.body}>검색 결과가 없습니다.</Text> : null}
        {searchedMissingItems.map((item) => (
          <AppButton
            key={item.id}
            label={`${item.name} · ${viewModel.accountNames[item.accountId] ?? '기존 계정'}`}
            variant="secondary"
            onPress={() => void addExistingItem(item).catch(() => undefined)}
            disabled={app.busy}
          />
        ))}
        <AppButton label="새 항목 만들기" onPress={startQuickAdd} disabled={app.busy || activeAccounts.length === 0} />
      </Sheet>

      <Sheet visible={sheetMode === 'quick-add'} title="새 항목 만들기" onClose={() => setSheetMode('add-existing')}>
        <Text style={textStyles.muted}>기본 정보만 저장하고 오늘 할일에 추가합니다. 일정과 고급 설정은 설정에서 바꿀 수 있습니다.</Text>
        <Field label="이름" value={quickName} onChangeText={setQuickName} placeholder="항목 이름" />
        <View style={styles.accountChoices}>
          <Text style={textStyles.muted}>계정</Text>
          {activeAccounts.map((account) => (
            <AppButton
              key={account.id}
              label={account.name}
              variant={quickAccountId === account.id ? 'primary' : 'secondary'}
              accessibilityState={{ selected: quickAccountId === account.id }}
              onPress={() => setQuickAccountId(account.id)}
            />
          ))}
        </View>
        <ChoiceChips label="유형" choices={itemTypeChoices} value={quickType} onChange={(value) => setQuickType(value as ItemType)} />
        {quickType === 'time' ? (
          <Field label="기본 시간(선택, 분)" value={quickDuration} onChangeText={setQuickDuration} keyboardType="number-pad" />
        ) : null}
        <AppButton label="저장하고 오늘에 추가" onPress={() => void saveQuickItem().catch(() => undefined)} disabled={app.busy} />
      </Sheet>

      <Sheet visible={sheetMode === 'manual-items'} title="직접 기록" onClose={() => setSheetMode('tasks')}>
        <Text style={textStyles.muted}>기록할 항목을 고르십시오.</Text>
        {viewModel.activeItems.map((item) => (
          <AppButton
            key={item.id}
            label={`${item.name} · ${amountLabel(item)}`}
            variant="secondary"
            onPress={() => openManualRecord(item)}
          />
        ))}
      </Sheet>

      <Sheet visible={recordItem !== null} title={recordItem ? `${recordItem.name} 직접 기록` : '직접 기록'} onClose={() => setRecordItem(null)}>
        {recordItem?.type === 'time' ? (
          <FixedActionBar>
            {['15', '30', '50'].map((minutes) => (
              <View key={minutes} style={styles.recordChip}>
                <AppButton label={`${minutes}분`} variant="secondary" onPress={() => setRecordAmount(minutes)} />
              </View>
            ))}
          </FixedActionBar>
        ) : null}
        <Field
          label={recordItem?.type === 'event' ? `${recordItem ? amountLabel(recordItem) : '값'}(선택)` : recordItem ? amountLabel(recordItem) : '값'}
          value={recordAmount}
          onChangeText={setRecordAmount}
          keyboardType="decimal-pad"
        />
        <Field label="메모(선택)" value={recordNote} onChangeText={setRecordNote} multiline />
        <AppButton
          label="기록 저장"
          onPress={() => void submitManualRecord().catch(() => undefined)}
          disabled={(recordItem?.type !== 'event' && recordAmount.trim() === '') || app.busy}
        />
      </Sheet>
    </>
  );
}

function formatTodayLabel(now: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul',
  }).format(now);
}

const styles = StyleSheet.create({
  idle: { alignItems: 'stretch', gap: 24 },
  primaryAction: { alignSelf: 'stretch' },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 72 },
  emptyLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  emptyMark: { color: COLORS.text, fontSize: 48, fontWeight: '800', lineHeight: 56 },
  accountChoices: { gap: 8 },
  recordChip: { flexGrow: 1 },
});
