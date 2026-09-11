import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Field, Heading, LoadingView, Screen, Section, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { DEFAULT_DAY_END_TIME } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { addDays, dateKey, formatMinutes, parseDurationToMinutes } from '@/domain/calculations';
import { LedgerRow, MetricHero, PlanActualDelta, FixedActionBar } from '@/features/today/today-components';
import { buildTodayViewModel } from '@/features/today/today-view-model';
import { buildRecordsViewModel } from '@/features/records/records-view-model';
import type { Entry, Item } from '@/types/domain';

export default function RecordsScreen() {
  const app = useApp();
  const today = dateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [dateInput, setDateInput] = useState(today);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [entryForm, setEntryForm] = useState<Entry | null>(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [manualItem, setManualItem] = useState<Item | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualPicker, setManualPicker] = useState(false);
  const model = useMemo(
    () => buildRecordsViewModel(app.snapshot, selectedDate, today),
    [app.snapshot, selectedDate, today],
  );
  const todayViewModel = useMemo(
    () => buildTodayViewModel(app.snapshot, today, new Date(), app.snapshot.settings.day_end_time ?? DEFAULT_DAY_END_TIME),
    [app.snapshot, today],
  );
  const accountGroups = useMemo(
    () => [...new Set(model.entries.map((row) => `${row.accountId}:${row.accountName}`))],
    [model.entries],
  );
  const activeAccounts = useMemo(
    () => app.snapshot.accounts.filter((account) => !account.deletedAt && !account.archived),
    [app.snapshot.accounts],
  );

  if (app.loading) return <LoadingView />;

  function moveToDate(nextDate: string) {
    setSelectedDate(nextDate);
    setDateInput(nextDate);
  }

  function submitDate() {
    if (!isDateKey(dateInput)) {
      Alert.alert('날짜 확인', 'YYYY-MM-DD 형식의 실제 날짜를 입력하십시오.');
      return;
    }
    moveToDate(dateInput);
    setDatePickerVisible(false);
  }

  function openEntry(entry: Entry) {
    setEntryForm(entry);
    setEntryValue(entryAmount(entry));
    setEntryNote(entry.note ?? '');
  }

  async function saveEntry() {
    if (!entryForm) return;
    const value = entryForm.type === 'event' && entryValue.trim() === ''
      ? null
      : entryForm.type === 'time' ? parseDurationToMinutes(entryValue) : Number(entryValue);
    if (value !== null && !Number.isFinite(value)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    await app.updateEntry(entryForm.id, value, entryNote.trim() || null);
    setEntryForm(null);
  }

  function requestDelete(entry: Entry) {
    Alert.alert('기록 삭제', '삭제한 기록은 더보기의 기록 관리에서 복구할 수 있습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => void app.deleteEntry(entry.id).then(() => setEntryForm(null)).catch(() => undefined),
      },
    ]);
  }

  function openManualRecord(item: Item) {
    setManualPicker(false);
    setManualItem(item);
    setManualAmount(String(item.defaultDurationMin ?? (item.type === 'completion' || item.type === 'count' ? 1 : '')));
    setManualNote('');
  }

  async function saveManualRecord() {
    if (!manualItem) return;
    const amount = manualItem.type === 'event' && manualAmount.trim() === ''
      ? null
      : manualItem.type === 'time' ? parseDurationToMinutes(manualAmount) : Number(manualAmount);
    if (amount !== null && !Number.isFinite(amount)) {
      Alert.alert('입력 확인', '숫자를 입력하십시오.');
      return;
    }
    await app.createEntry(manualItem, amount, manualNote.trim() || null);
    setManualItem(null);
  }

  return (
    <>
      <Screen usesTabBar>
        <View style={styles.header}>
          <Heading subtitle={formatDateLabel(selectedDate)}>기록</Heading>
          <AppButton label="더보기" variant="plain" onPress={() => router.push('/more')} />
        </View>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <View style={styles.dateNav}>
          <AppButton label="어제" variant="secondary" onPress={() => moveToDate(addDays(today, -1))} />
          <AppButton label="오늘" variant={selectedDate === today ? 'primary' : 'secondary'} onPress={() => moveToDate(today)} />
          <AppButton label="날짜 선택" variant="plain" onPress={() => setDatePickerVisible(true)} />
        </View>
        <PlanActualDelta planned={model.plannedMinutes} actual={model.actualMinutes} />
        {selectedDate === today ? (
          <MetricHero label="오늘 가용시간" value={formatMinutes(todayViewModel.available.displayMinutes)} />
        ) : null}
        <Section title="원장">
          {model.entries.length === 0 ? <Text style={textStyles.body}>이 날짜에 기록이 없습니다.</Text> : null}
          {accountGroups.map((accountKey) => {
            const [accountId] = accountKey.split(':');
            const rows = model.entries.filter((row) => row.accountId === accountId);
            return (
              <View key={accountKey} style={styles.accountGroup}>
                <Text style={textStyles.title}>{rows[0]?.accountName}</Text>
                {rows.map((row) => (
                  <LedgerRow key={row.entry.id} title={row.itemName} value={row.value} description={row.description} onPress={() => openEntry(row.entry)} />
                ))}
                <Text style={textStyles.muted}>계정 소계 {formatMinutes(rows.reduce((total, row) => total + (row.entry.durationMin ?? 0), 0))}</Text>
              </View>
            );
          })}
          {model.entries.length > 0 ? <Text style={textStyles.number}>날짜 소계 {formatMinutes(model.actualMinutes)}</Text> : null}
        </Section>
        {selectedDate === today ? (
          <FixedActionBar>
            <View style={styles.actionItem}><AppButton label="직접 기록" onPress={() => setManualPicker(true)} style={styles.fullAction} /></View>
            <View style={styles.actionItem}><AppButton label="오늘 종료" variant="secondary" onPress={() => router.push('/today/close')} style={styles.fullAction} /></View>
          </FixedActionBar>
        ) : (
          <AppButton label="오늘로 이동" onPress={() => moveToDate(today)} style={styles.fullAction} />
        )}
      </Screen>

      <Sheet visible={datePickerVisible} title="날짜 선택" onClose={() => setDatePickerVisible(false)}>
        <Text style={textStyles.muted}>확인할 날짜를 YYYY-MM-DD 형식으로 입력합니다.</Text>
        <Field label="날짜" value={dateInput} onChangeText={setDateInput} placeholder="YYYY-MM-DD" />
        <AppButton label="이 날짜 보기" onPress={submitDate} />
      </Sheet>

      <Sheet visible={entryForm !== null} title="기록 수정" onClose={() => setEntryForm(null)}>
        <Text style={textStyles.muted}>기록 값과 메모를 수정합니다. 삭제한 기록은 기록 관리에서 복구할 수 있습니다.</Text>
        <Field label={entryForm?.type === 'time' ? '시간(분)' : '값'} value={entryValue} onChangeText={setEntryValue} keyboardType="decimal-pad" />
        <Field label="메모" value={entryNote} onChangeText={setEntryNote} multiline />
        <AppButton label="수정 저장" onPress={() => void saveEntry().catch(() => undefined)} disabled={app.busy} />
        {entryForm ? <AppButton label="삭제" variant="danger" onPress={() => requestDelete(entryForm)} disabled={app.busy} /> : null}
      </Sheet>

      <Sheet visible={manualPicker} title="직접 기록" onClose={() => setManualPicker(false)}>
        <Text style={textStyles.muted}>기록할 항목을 고르십시오.</Text>
        {activeAccounts.map((account) => {
          const items = app.snapshot.items.filter((item) => !item.deletedAt && !item.archived && item.accountId === account.id);
          if (items.length === 0) return null;
          return (
            <View key={account.id} style={styles.accountGroup}>
              <Text style={textStyles.title}>{account.name}</Text>
              {items.map((item) => (
                <AppButton key={item.id} label={item.name} variant="secondary" onPress={() => openManualRecord(item)} />
              ))}
            </View>
          );
        })}
      </Sheet>

      <Sheet visible={manualItem !== null} title={manualItem ? `${manualItem.name} 직접 기록` : '직접 기록'} onClose={() => setManualItem(null)}>
        <Field
          label={manualItem?.type === 'time' ? '시간(분)' : manualItem?.type === 'event' ? '값(선택)' : '값'}
          value={manualAmount}
          onChangeText={setManualAmount}
          keyboardType="decimal-pad"
        />
        <Field label="메모(선택)" value={manualNote} onChangeText={setManualNote} multiline />
        <AppButton
          label="기록 저장"
          onPress={() => void saveManualRecord().catch(() => undefined)}
          disabled={(manualItem?.type !== 'event' && manualAmount.trim() === '') || app.busy}
        />
      </Sheet>
    </>
  );
}

function entryAmount(entry: Entry): string {
  if (entry.type === 'time') return String(entry.durationMin ?? '');
  if (entry.type === 'completion' || entry.type === 'count') return String(entry.count ?? '');
  return String(entry.value ?? '');
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(`${value}T12:00:00+09:00`));
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  dateNav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  actionItem: { flexGrow: 1, minWidth: 132 },
  fullAction: { alignSelf: 'stretch' },
  accountGroup: { gap: 8, paddingBottom: 12 },
});
