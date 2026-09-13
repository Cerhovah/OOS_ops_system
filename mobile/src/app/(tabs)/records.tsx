import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppBar, AppButton, Field, LoadingView, Screen, Section, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { addDays, dateKey, parseDurationToMinutes } from '@/domain/calculations';
import { EntryRow, FixedActionBar, LedgerRow, PlanActualDelta } from '@/features/today/today-components';
import { buildRecordsViewModel, type LedgerEntryViewModel } from '@/features/records/records-view-model';
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
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
  const [entryListItemId, setEntryListItemId] = useState<string | null>(null);
  const [manualItem, setManualItem] = useState<Item | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualPicker, setManualPicker] = useState(false);
  const model = useMemo(
    () => buildRecordsViewModel(app.snapshot, selectedDate, today),
    [app.snapshot, selectedDate, today],
  );
  const accountGroups = useMemo(
    () => [...new Set(model.itemSummaries.map((row) => `${row.accountId}:${row.accountName}`))].map((key) => {
      const [accountId] = key.split(':');
      const rows = model.itemSummaries.filter((row) => row.accountId === accountId);
      return {
        key,
        accountId,
        accountName: rows[0]?.accountName ?? '삭제된 계정',
        rows,
        plannedMinutes: selectedDate === today
          ? rows.reduce((total, row) => total + (row.plannedMinutes ?? 0), 0)
          : null,
        actualMinutes: rows.reduce((total, row) => total + row.actualMinutes, 0),
      };
    }),
    [model.itemSummaries, selectedDate, today],
  );
  const nonTimeEntries = useMemo(() => model.entries.filter((row) => row.entry.type !== 'time'), [model.entries]);
  const entriesByItem = useMemo(() => {
    const grouped = new Map<string, LedgerEntryViewModel[]>();
    for (const row of model.entries) {
      const rows = grouped.get(row.entry.itemId) ?? [];
      rows.push(row);
      grouped.set(row.entry.itemId, rows);
    }
    return grouped;
  }, [model.entries]);
  const entryListRows = useMemo(
    () => entryListItemId ? entriesByItem.get(entryListItemId) ?? [] : [],
    [entriesByItem, entryListItemId],
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
        <AppBar title="기록" meta="더보기" onMetaPress={() => router.push('/more')} />
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <View style={styles.dateNav}>
          <AppButton label="이전" variant="plain" onPress={() => moveToDate(addDays(selectedDate, -1))} />
          <AppButton label={formatDateNavLabel(selectedDate, today)} variant="plain" onPress={() => setDatePickerVisible(true)} style={styles.dateCenter} />
          <AppButton label="다음" variant="plain" onPress={() => moveToDate(addDays(selectedDate, 1))} />
        </View>
        <PlanActualDelta planned={model.plannedMinutes} actual={model.actualMinutes} />
        <Section title="항목별 기록">
          {model.itemSummaries.length === 0 ? <Text style={textStyles.body}>이 날짜에 시간 기록이 없습니다.</Text> : null}
          {accountGroups.map((group) => {
            return (
              <View key={group.key} style={styles.accountGroup}>
                <LedgerRow
                  title={group.accountName}
                  planned={group.plannedMinutes}
                  actual={group.actualMinutes}
                  level="account"
                />
                {group.rows.map((row) => {
                  const matchingEntries = entriesByItem.get(row.itemId) ?? [];
                  return (
                    <LedgerRow
                      key={row.itemId}
                      title={row.itemName}
                      planned={row.plannedMinutes}
                      actual={row.actualMinutes}
                      level="item"
                      onPress={matchingEntries.length > 0 ? () => setEntryListItemId(row.itemId) : undefined}
                    />
                  );
                })}
              </View>
            );
          })}
        </Section>
        {nonTimeEntries.length > 0 ? (
          <Section title="기타 기록">
            {nonTimeEntries.map((row) => (
              <EntryRow key={row.entry.id} title={row.itemName} value={row.value} description={row.description} onPress={() => openEntry(row.entry)} />
            ))}
          </Section>
        ) : null}
        {selectedDate === today ? (
          <FixedActionBar>
            <View style={styles.actionItem}><AppButton label="직접 기록" onPress={() => setManualPicker(true)} style={styles.fullAction} /></View>
            <View style={styles.actionItem}><AppButton label="오늘 종료" variant="secondary" onPress={() => router.push('/today/close')} style={styles.fullAction} /></View>
          </FixedActionBar>
        ) : (
          <AppButton label="오늘로 이동" variant="plain" onPress={() => moveToDate(today)} style={styles.fullAction} />
        )}
      </Screen>

      <Sheet
        visible={entryListItemId !== null}
        title={entryListRows[0]?.itemName ?? '항목 기록'}
        onClose={() => setEntryListItemId(null)}>
        <Text style={textStyles.muted}>개별 기록을 누르면 값과 메모를 수정할 수 있습니다.</Text>
        {entryListRows.map((row) => (
          <EntryRow
            key={row.entry.id}
            title={row.itemName}
            value={row.value}
            description={row.description}
            onPress={() => { setEntryListItemId(null); openEntry(row.entry); }}
          />
        ))}
      </Sheet>

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

function formatDateNavLabel(value: string, today: string): string {
  const date = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(new Date(`${value}T12:00:00+09:00`));
  return value === today ? `${date} · 오늘` : date;
}

const styles = StyleSheet.create({
  dateNav: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: COLORS.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.card, backgroundColor: COLORS.surface, paddingHorizontal: tokens.space.xxs },
  dateCenter: { flex: 1 },
  actionItem: { flexGrow: 1, minWidth: 132 },
  fullAction: { alignSelf: 'stretch' },
  accountGroup: { gap: 10 },
});
