import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppBar, AppButton, Field, LoadingView, Screen, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { DEFAULT_DAY_END_TIME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { dateKey, parseDurationToMinutes } from '@/domain/calculations';
import {
  ChoiceChips,
  CurrentSessionCard,
  FixedActionBar,
  PlanActualDelta,
  TodayAccountSection,
  TodayListAction,
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
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import type { Entry, Item, ItemInput, ItemType } from '@/types/domain';

type SheetMode = 'add-existing' | 'quick-add' | null;
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
  const [selectedTodayItemIds, setSelectedTodayItemIds] = useState<string[]>([]);
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
  const currentSession = viewModel.currentTimer;
  const currentItemModel = currentSession
    ? viewModel.visibleItems.find((visible) => visible.candidate.item.id === currentSession.item.id) ?? null
    : null;
  const currentAccountGroup = currentSession
    ? viewModel.accountGroups.find((group) => group.accountId === currentSession.item.accountId) ?? null
    : null;

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

  function openTodaySelection() {
    setItemSearch('');
    setSelectedTodayItemIds([]);
    setSheetMode('add-existing');
  }

  function toggleTodayItem(itemId: string) {
    setSelectedTodayItemIds((current) => (
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    ));
  }

  async function addSelectedItems() {
    for (const itemId of selectedTodayItemIds) await app.addTodayItem(itemId);
    setItemSearch('');
    setSelectedTodayItemIds([]);
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

  function runItemAction(itemModel: TodayItemViewModel) {
    const item = itemModel.candidate.item;
    if (item.type === 'time') {
      if (!itemModel.session) requestTimerAction({ kind: 'start', item });
      else if (itemModel.session.runtime.status === 'running') {
        void app.pauseTimer(itemModel.session.entry).catch(() => undefined);
      } else requestTimerAction({ kind: 'resume', session: itemModel.session });
      return;
    }
    if (item.type === 'completion' || item.type === 'count') {
      void recordOne(item).catch(() => undefined);
      return;
    }
    requestManualRecord(item);
  }

  const selected = selectedItem?.candidate;
  const selectedSession = selectedItem?.session ?? null;

  return (
    <>
      <Screen
        contentGap={tokens.space.sm}
        horizontalPadding={tokens.space.lg}
        topPadding={tokens.space.md}
        usesTabBar
        refreshControl={(
          <RefreshControl refreshing={app.busy} onRefresh={() => void app.refresh().catch(() => undefined)} />
        )}>
        <AppBar title="오늘" meta={todayLabel} />
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <TodaySummary actualMinutes={viewModel.actualMinutes} itemCount={viewModel.visibleItems.length} />
        {currentSession ? (
          <CurrentSessionCard
            session={currentSession}
            accountName={viewModel.accountNames[currentSession.item.accountId] ?? '기존 계정'}
            accountLimitMinutes={currentAccountGroup?.plannedMinutes ?? 0}
            priorActualMinutes={currentItemModel?.actualMinutes ?? 0}
            busy={app.busy}
            onPause={() => void app.pauseTimer(currentSession.entry).catch(() => undefined)}
            onResume={() => requestTimerAction({ kind: 'resume', session: currentSession })}
            onStop={() => void app.stopTimer(currentSession.entry).catch(() => undefined)}
          />
        ) : null}
        {viewModel.accountGroups.map((group) => (
          <TodayAccountSection
            key={group.accountId}
            disabled={app.busy}
            group={group}
            currentSessionId={currentSession?.entry.id ?? null}
            onItemAction={runItemAction}
            onItemPress={setSelectedItem}
          />
        ))}
        {viewModel.accountGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={textStyles.title}>오늘 사용할 항목이 없습니다</Text>
            <Text style={textStyles.muted}>필요한 항목만 고르면 이 화면에 바로 나타납니다.</Text>
            <AppButton label="오늘 항목 선택" onPress={openTodaySelection} />
          </View>
        ) : null}
        {viewModel.accountGroups.length > 0 ? (
          <View style={styles.listActions}>
            <TodayListAction kind="add" label="오늘 사용할 항목" onPress={openTodaySelection} />
            <TodayListAction kind="reflection" label="오늘 돌아보기" onPress={() => router.push('/today/close')} />
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
              {viewModel.accountNames[selected.item.accountId] ?? '기존 계정'}
            </Text>
            {selected.item.type === 'time' ? (
              <>
                <PlanActualDelta planned={selected.plannedValue} actual={selectedItem?.actualMinutes ?? 0} />
                <Text style={textStyles.muted}>
                  {selectedSession ? `열린 세션 1개 · ${selectedSession.runtime.status === 'running' ? '기록 중' : '일시정지'}` : '열린 세션 없음'}
                </Text>
              </>
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
              variant={selected.item.type === 'completion' || selected.item.type === 'count' ? 'secondary' : 'primary'}
              onPress={() => requestManualRecord(selected.item)}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={pendingTimerAction !== null} title="타이머 전환" onClose={() => setPendingTimerAction(null)}>
        <Text style={textStyles.muted}>
          {viewModel.runningTimer ? `${viewModel.runningTimer.item.name}을 일시정지하고 ` : ''}
          {pendingTimerAction?.kind === 'start' ? pendingTimerAction.item.name : pendingTimerAction?.session.item.name ?? '새 항목'}을 시작할까요?
        </Text>
        <AppButton
          label="일시정지 후 시작"
          onPress={() => {
            if (!pendingTimerAction) return;
            void runTimerAction(pendingTimerAction, viewModel.runningTimer?.entry ?? null).catch(() => undefined);
          }}
          disabled={app.busy}
        />
        <AppButton label="취소" variant="secondary" onPress={() => setPendingTimerAction(null)} />
      </Sheet>

      <Sheet visible={recordWarningItem !== null} title="실행 중에도 직접 기록할 수 있습니다" onClose={() => setRecordWarningItem(null)}>
        <Text style={textStyles.muted}>현재 타이머는 계속 흐릅니다. 저장 후 언제든 오늘 화면으로 돌아갈 수 있습니다.</Text>
        <AppButton label="기록 계속하기" onPress={() => recordWarningItem && openManualRecord(recordWarningItem)} />
        <AppButton label="취소" variant="plain" onPress={() => setRecordWarningItem(null)} />
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
              {accountItems.map((item) => {
                const selectedForToday = selectedTodayItemIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${item.name}, 오늘 사용할 항목`}
                    accessibilityState={{ checked: selectedForToday, disabled: app.busy }}
                    disabled={app.busy}
                    onPress={() => toggleTodayItem(item.id)}
                    style={({ pressed }) => [styles.selectionRow, pressed && styles.selectionRowPressed]}>
                    <View style={[styles.selectionBox, selectedForToday && styles.selectionBoxSelected]}>
                      {selectedForToday ? <Check color={COLORS.inverse} size={15} strokeWidth={2.4} /> : null}
                    </View>
                    <View style={styles.selectionCopy}>
                      <Text style={textStyles.title}>{item.name}</Text>
                      <Text style={textStyles.muted}>{account.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
        {viewModel.missingItems.length > 0 ? (
          <AppButton label="선택 완료" onPress={() => void addSelectedItems().catch(() => undefined)} disabled={app.busy || selectedTodayItemIds.length === 0} />
        ) : null}
        <AppButton label="새 항목 만들기" variant="secondary" onPress={startQuickAdd} disabled={app.busy || activeAccounts.length === 0} />
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
  listActions: { gap: 2 },
  emptyState: { gap: tokens.space.sm, borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceRaised, padding: tokens.space.ml },
  accountChoices: { gap: tokens.space.xs },
  recordChip: { flexGrow: 1 },
  itemGroup: { gap: tokens.space.xs },
  selectionRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth },
  selectionRowPressed: { opacity: 0.72 },
  selectionBox: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderColor: COLORS.borderStrong, borderWidth: 1, borderRadius: 6 },
  selectionBoxSelected: { borderColor: COLORS.accentStrong, backgroundColor: COLORS.accentStrong },
  selectionCopy: { flex: 1, gap: 2 },
});
