import { useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton, Field, Heading, LoadingView, Screen, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { DEFAULT_DAY_END_TIME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { dateKey, formatMinutes, parseDurationToMinutes } from '@/domain/calculations';
import {
  ChoiceChips,
  CurrentSessionCard,
  FixedActionBar,
  TodayAccountSection,
  TodaySummary,
  taskActionLabel,
} from '@/features/today/today-components';
import {
  amountLabel,
  buildTodayViewModel,
  searchMissingItems,
  type TimerSessionViewModel,
  type TodayItemViewModel,
} from '@/features/today/today-view-model';
import { tokens } from '@/theme/tokens';
import type { Entry, Item, ItemInput, ItemType } from '@/types/domain';

type SheetMode = 'add-existing' | 'quick-add' | 'manual-items' | null;
type PendingTimerAction =
  | { kind: 'start'; item: Item }
  | { kind: 'resume'; session: TimerSessionViewModel };

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
  const [selectedItem, setSelectedItem] = useState<TodayItemViewModel | null>(null);
  const [pendingTimerAction, setPendingTimerAction] = useState<PendingTimerAction | null>(null);
  const [recordWarningItem, setRecordWarningItem] = useState<Item | null>(null);
  const [recordItem, setRecordItem] = useState<Item | null>(null);
  const [recordAmount, setRecordAmount] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [quickType, setQuickType] = useState<ItemType>('time');
  const [quickDuration, setQuickDuration] = useState('');
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
    () => searchMissingItems(viewModel.missingItems, itemSearch, viewModel.accountNames),
    [itemSearch, viewModel.accountNames, viewModel.missingItems],
  );
  const currentSession = viewModel.runningTimer ?? viewModel.timerSessions[0] ?? null;

  if (app.loading) return <LoadingView />;

  function openManualRecord(item: Item) {
    setSheetMode(null);
    setSelectedItem(null);
    setRecordWarningItem(null);
    setRecordItem(item);
    setRecordAmount(String(item.defaultDurationMin ?? (item.type === 'count' || item.type === 'completion' ? 1 : '')));
    setRecordNote('');
  }

  function requestManualRecord(item: Item) {
    setSelectedItem(null);
    setSheetMode(null);
    if (viewModel.runningTimer) {
      setRecordWarningItem(item);
      return;
    }
    openManualRecord(item);
  }

  async function runTimerAction(action: PendingTimerAction, pauseEntry: Entry | null = null) {
    if (action.kind === 'start') await app.startTimer(action.item, pauseEntry);
    else await app.resumeTimer(action.session.entry, pauseEntry);
    setSelectedItem(null);
    setPendingTimerAction(null);
  }

  function requestTimerAction(action: PendingTimerAction) {
    const targetEntryId = action.kind === 'resume' ? action.session.entry.id : null;
    const running = viewModel.runningTimer;
    if (running && running.entry.id !== targetEntryId) {
      setSelectedItem(null);
      setPendingTimerAction(action);
      return;
    }
    void runTimerAction(action).catch(() => undefined);
  }

  async function addExistingItem(item: Item) {
    await app.addTodayItem(item.id);
    setItemSearch('');
    setSheetMode(null);
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
    setSheetMode(null);
  }

  async function submitManualRecord() {
    if (!recordItem) return;
    const amount = recordItem.type === 'event' && recordAmount.trim() === ''
      ? null
      : recordItem.type === 'time' ? parseDurationToMinutes(recordAmount) : Number(recordAmount);
    if (amount !== null && !Number.isFinite(amount)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    await app.createEntry(recordItem, amount, recordNote.trim() || null);
    setRecordItem(null);
  }

  async function recordOne(item: Item) {
    await app.createEntry(item, 1);
    setSelectedItem(null);
  }

  const selected = selectedItem?.candidate;
  const selectedSession = selectedItem?.session ?? null;

  return (
    <>
      <Screen
        usesTabBar
        refreshControl={(
          <RefreshControl refreshing={app.busy} onRefresh={() => void app.refresh().catch(() => undefined)} />
        )}>
        <Heading subtitle={todayLabel}>오늘</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <TodaySummary plannedMinutes={viewModel.plannedMinutes} actualMinutes={viewModel.actualMinutes} />
        {currentSession ? (
          <CurrentSessionCard
            session={currentSession}
            accountName={viewModel.accountNames[currentSession.item.accountId] ?? '기존 계정'}
            plannedValue={viewModel.visibleItems.find(
              (visible) => visible.candidate.item.id === currentSession.item.id,
            )?.candidate.plannedValue ?? null}
            busy={app.busy}
            onPause={() => void app.pauseTimer(currentSession.entry).catch(() => undefined)}
            onResume={() => requestTimerAction({ kind: 'resume', session: currentSession })}
            onStop={() => void app.stopTimer(currentSession.entry).catch(() => undefined)}
          />
        ) : null}
        <View style={styles.listHeader}>
          <Text accessibilityRole="header" style={textStyles.title}>오늘 목록</Text>
          <View style={styles.listActions}>
            <AppButton label="항목 불러오기" variant="plain" onPress={() => { setItemSearch(''); setSheetMode('add-existing'); }} />
            <AppButton label="직접 기록" variant="plain" onPress={() => setSheetMode('manual-items')} />
          </View>
        </View>
        {viewModel.accountGroups.map((group) => (
          <TodayAccountSection key={group.accountId} group={group} onItemPress={setSelectedItem} />
        ))}
        {viewModel.accountGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={textStyles.title}>오늘 표시할 항목이 없습니다.</Text>
            <Text style={textStyles.muted}>저장된 항목을 불러오거나 새 항목을 만든 뒤 바로 기록할 수 있습니다.</Text>
            <AppButton label="항목 불러오기" variant="secondary" onPress={() => setSheetMode('add-existing')} />
          </View>
        ) : null}
      </Screen>

      <Sheet
        visible={selectedItem !== null}
        title={selected?.item.name ?? '항목 동작'}
        onClose={() => setSelectedItem(null)}>
        {selected ? (
          <>
            <Text style={textStyles.muted}>
              {viewModel.accountNames[selected.item.accountId] ?? '기존 계정'} · {' '}
              {selected.plannedValue === null ? '계획 없음' : `${formatMinutes(selected.plannedValue)} 계획`}
            </Text>
            {selected.item.type === 'time' && !selectedSession ? (
              <AppButton
                label="타이머 시작"
                onPress={() => requestTimerAction({ kind: 'start', item: selected.item })}
                disabled={app.busy}
              />
            ) : null}
            {selected.item.type === 'time' && selectedSession?.runtime.status === 'running' ? (
              <AppButton
                label="일시정지"
                variant="secondary"
                onPress={() => void app.pauseTimer(selectedSession.entry).then(() => setSelectedItem(null)).catch(() => undefined)}
                disabled={app.busy}
              />
            ) : null}
            {selected.item.type === 'time' && selectedSession?.runtime.status === 'paused' ? (
              <AppButton
                label="다시 시작"
                onPress={() => requestTimerAction({ kind: 'resume', session: selectedSession })}
                disabled={app.busy}
              />
            ) : null}
            {selectedSession ? (
              <AppButton
                label="종료하고 기록"
                variant="secondary"
                onPress={() => void app.stopTimer(selectedSession.entry).then(() => setSelectedItem(null)).catch(() => undefined)}
                disabled={app.busy}
              />
            ) : null}
            {(selected.item.type === 'completion' || selected.item.type === 'count') ? (
              <AppButton
                label={taskActionLabel(selected.item)}
                onPress={() => void recordOne(selected.item).catch(() => undefined)}
                disabled={app.busy}
              />
            ) : null}
            <AppButton
              label={selected.item.type === 'numeric' || selected.item.type === 'event' ? '값 입력' : '직접 기록'}
              variant="secondary"
              onPress={() => requestManualRecord(selected.item)}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={pendingTimerAction !== null} title="다른 기록이 실행 중입니다" onClose={() => setPendingTimerAction(null)}>
        <Text style={textStyles.muted}>
          {viewModel.runningTimer
            ? `${viewModel.accountNames[viewModel.runningTimer.item.accountId] ?? '기존 계정'} · ${viewModel.runningTimer.item.name}`
            : '실행 중인 기록'}은 그대로 돌아갈 수 있습니다.
        </Text>
        <AppButton label="기존 기록으로 돌아가기" variant="secondary" onPress={() => setPendingTimerAction(null)} />
        <AppButton
          label="일시정지하고 새로 시작"
          onPress={() => {
            if (!pendingTimerAction) return;
            void runTimerAction(pendingTimerAction, viewModel.runningTimer?.entry ?? null).catch(() => undefined);
          }}
          disabled={app.busy}
        />
      </Sheet>

      <Sheet visible={recordWarningItem !== null} title="실행 중에도 직접 기록할 수 있습니다" onClose={() => setRecordWarningItem(null)}>
        <Text style={textStyles.muted}>현재 타이머는 계속 흐릅니다. 저장 후 언제든 오늘 화면으로 돌아갈 수 있습니다.</Text>
        <AppButton label="기록 계속하기" onPress={() => recordWarningItem && openManualRecord(recordWarningItem)} />
        <AppButton label="취소" variant="secondary" onPress={() => setRecordWarningItem(null)} />
      </Sheet>

      <Sheet visible={sheetMode === 'add-existing'} title="저장된 항목 불러오기" onClose={() => setSheetMode(null)}>
        <Field label="계정 또는 항목 검색" value={itemSearch} onChangeText={setItemSearch} placeholder="계정 또는 항목 이름" />
        {viewModel.missingItems.length === 0 ? <Text style={textStyles.body}>추가할 기존 항목이 없습니다.</Text> : null}
        {viewModel.missingItems.length > 0 && searchedMissingItems.length === 0 ? <Text style={textStyles.body}>검색 결과가 없습니다.</Text> : null}
        {activeAccounts.map((account) => {
          const accountItems = searchedMissingItems.filter((item) => item.accountId === account.id);
          if (accountItems.length === 0) return null;
          return (
            <View key={account.id} style={styles.itemGroup}>
              <Text style={textStyles.title}>{account.name}</Text>
              {accountItems.map((item) => (
                <AppButton key={item.id} label={item.name} variant="secondary"
                  onPress={() => void addExistingItem(item).catch(() => undefined)} disabled={app.busy} />
              ))}
            </View>
          );
        })}
        <AppButton label="새 항목 만들기" onPress={startQuickAdd} disabled={app.busy || activeAccounts.length === 0} />
      </Sheet>

      <Sheet visible={sheetMode === 'quick-add'} title="새 항목 만들기" onClose={() => setSheetMode('add-existing')}>
        <Text style={textStyles.muted}>기본 정보만 저장하고 오늘 목록에 추가합니다. 일정과 고급 설정은 항목 관리에서 바꿀 수 있습니다.</Text>
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

      <Sheet visible={sheetMode === 'manual-items'} title="직접 기록" onClose={() => setSheetMode(null)}>
        <Text style={textStyles.muted}>기록할 항목을 고르십시오.</Text>
        {activeAccounts.map((account) => (
          <View key={account.id} style={styles.itemGroup}>
            <Text style={textStyles.title}>{account.name}</Text>
            {viewModel.activeItems.filter((item) => item.accountId === account.id).map((item) => (
              <AppButton key={item.id} label={`${item.name} · ${amountLabel(item)}`} variant="secondary" onPress={() => requestManualRecord(item)} />
            ))}
          </View>
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
  listHeader: { gap: tokens.space.xs },
  listActions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xxs },
  emptyState: { gap: tokens.space.sm, borderRadius: tokens.radius.card, padding: tokens.space.md },
  accountChoices: { gap: tokens.space.xs },
  recordChip: { flexGrow: 1 },
  itemGroup: { gap: tokens.space.xs },
});
