import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Heading, LoadingView, Screen, Section, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { actualMinutesByAccount, addDays, dateKey, entryBelongsToRange, formatMinutes, latestPlanForWeek, parseWeekStartDay, weekRange } from '@/domain/calculations';
import { buildRecordsViewModel } from '@/features/records/records-view-model';
import { beginWeeklyCommentDraft, canSaveWeeklyCommentDraft, editWeeklyCommentDraft, failWeeklyCommentDraft, finishWeeklyCommentSave, markWeeklyCommentLoading, resolveWeeklyCommentDraft, type WeeklyCommentDraft } from '@/features/week/comment-draft';
import { holidayName } from '@/features/week/holidays';
import { MetricsCalendar } from '@/features/week/metrics-calendar';
import type { Account } from '@/types/domain';

const COMMENT_LOAD_ERROR = '주간 코멘트를 불러오지 못했습니다. 다시 불러온 뒤 저장할 수 있습니다.';

export default function WeekRoute() {
  const app = useApp();
  const today = dateKey(new Date());
  const weekStartDay = parseWeekStartDay(app.snapshot.settings.week_start_day);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [calendarVisible, setCalendarVisible] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [commentDraft, setCommentDraft] = useState<WeeklyCommentDraft | null>(null);
  const commentRequest = useRef(0);
  const loadWeeklyComment = useRef(app.getWeeklyComment);
  const week = weekRange(selectedDate, weekStartDay);
  const accounts = app.snapshot.accounts.filter((account) => !account.deletedAt && !account.archived);
  const plan = latestPlanForWeek(app.snapshot.plans, app.snapshot.planLines, week.start);
  const entries = app.snapshot.entries.filter((entry) => !entry.deletedAt && entryBelongsToRange(entry, week.start, week.end));
  const actuals = actualMinutesByAccount(entries);
  const plannedByAccount = Object.fromEntries(plan.lines.map((line) => [line.accountId, line.plannedMinutes]));
  const selectedDay = useMemo(() => buildRecordsViewModel(app.snapshot, selectedDate, today), [app.snapshot, selectedDate, today]);
  const selectedDayAccountIds = [...new Set(selectedDay.itemSummaries.map((entry) => entry.accountId))];
  const recordDates = useMemo(
    () => new Set(app.snapshot.entries.filter((entry) => !entry.deletedAt).map((entry) => dateKey(new Date(entry.startedAt ?? entry.occurredAt)))),
    [app.snapshot.entries],
  );
  const totals = useMemo(() => ({
    plan: accounts.reduce((sum, account) => sum + (plannedByAccount[account.id] ?? 0), 0),
    actual: accounts.reduce((sum, account) => sum + (actuals[account.id] ?? 0), 0),
  }), [accounts, actuals, plannedByAccount]);

  useEffect(() => { loadWeeklyComment.current = app.getWeeklyComment; }, [app.getWeeklyComment]);

  const requestWeeklyComment = useCallback((targetWeek: string) => {
    const request = ++commentRequest.current;
    setCommentDraft((current) => markWeeklyCommentLoading(current, targetWeek));
    void loadWeeklyComment.current(targetWeek)
      .then((value) => {
        if (request !== commentRequest.current) return;
        setCommentDraft((current) => resolveWeeklyCommentDraft(beginWeeklyCommentDraft(current, targetWeek), targetWeek, value));
      })
      .catch(() => {
        if (request !== commentRequest.current) return;
        setCommentDraft((current) => failWeeklyCommentDraft(beginWeeklyCommentDraft(current, targetWeek), targetWeek, COMMENT_LOAD_ERROR));
      });
  }, []);

  useEffect(() => {
    requestWeeklyComment(week.start);
    return () => { commentRequest.current += 1; };
  }, [requestWeeklyComment, week.start]);

  if (app.loading) return <LoadingView />;

  function chooseDate(date: string) {
    setSelectedDate(date);
    setView('day');
  }

  async function copyPrevious() {
    const copied = await app.copyPreviousWeek(week.start);
    Alert.alert('지난주 계획 복사', copied ? '새 계획 버전을 만들었습니다.' : '복사할 지난주 계획이 없습니다.');
  }

  async function saveComment() {
    const current = beginWeeklyCommentDraft(commentDraft, week.start);
    if (!canSaveWeeklyCommentDraft(current, week.start)) return;
    await app.saveWeeklyComment(week.start, current.value);
    setCommentDraft((draft) => finishWeeklyCommentSave(draft, week.start, current.value));
  }

  const selectedItems = selectedAccount
    ? app.snapshot.items.filter((item) => item.accountId === selectedAccount.id && !item.deletedAt)
    : [];
  const selectedHoliday = holidayName(selectedDate);

  return (
    <>
      <Screen>
        <Heading subtitle={`${week.start} ~ ${week.end}`}>지표</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <View style={styles.nav}>
          <AppButton label="이전 주" variant="secondary" onPress={() => setSelectedDate(addDays(selectedDate, -7))} />
          <AppButton label="이번 주" variant="plain" onPress={() => setSelectedDate(today)} />
          <AppButton label="다음 주" variant="secondary" onPress={() => setSelectedDate(addDays(selectedDate, 7))} />
        </View>
        <Section title="날짜" action={<AppButton label={calendarVisible ? '달력 접기' : '달력 펼치기'} variant="plain" onPress={() => setCalendarVisible((value) => !value)} />}>
          {calendarVisible ? <MetricsCalendar selectedDate={selectedDate} recordDates={recordDates} weekStartDay={weekStartDay} onSelectDate={chooseDate} /> : null}
          <Card>
            <Text style={textStyles.title}>{formatDateLabel(selectedDate)}</Text>
            <Text style={textStyles.muted}>{selectedHoliday ?? (recordDates.has(selectedDate) ? '기록 있음' : '기록 없음')}</Text>
          </Card>
        </Section>
        <View style={styles.viewSwitch}>
          <AppButton label="선택 날짜" variant={view === 'day' ? 'primary' : 'secondary'} onPress={() => setView('day')} />
          <AppButton label="주간보기" variant={view === 'week' ? 'primary' : 'secondary'} onPress={() => setView('week')} />
        </View>

        {view === 'day' ? (
          <Section title="선택 날짜 기록">
            <Card style={styles.summaryCard}>
              <Text style={textStyles.muted}>계획 / 실제 / 차이</Text>
              <Text style={textStyles.number}>{daySummary(selectedDay.plannedMinutes, selectedDay.actualMinutes)}</Text>
            </Card>
            {selectedDay.itemSummaries.length === 0 ? <Text style={textStyles.body}>이 날짜에 시간 기록이 없습니다.</Text> : null}
            {selectedDayAccountIds.map((accountId) => {
              const rows = selectedDay.itemSummaries.filter((entry) => entry.accountId === accountId);
              return (
                <View key={accountId} style={styles.accountGroup}>
                  <Text style={textStyles.title}>{rows[0]?.accountName}</Text>
                  {rows.map((row) => (
                    <View key={row.itemId} style={styles.itemSummary}>
                      <Text style={textStyles.body}>{row.itemName}</Text>
                      <Text style={textStyles.muted}>계획 / 실제 / 차이</Text>
                      <Text style={textStyles.number}>{daySummary(row.plannedMinutes, row.actualMinutes)}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
            {selectedDay.entries.length > 0 ? (
              <View style={styles.ledger}>
                <Text style={textStyles.title}>원장</Text>
                {selectedDay.entries.map((row) => (
                  <View key={row.entry.id} style={styles.detailRow}>
                    <Text style={textStyles.body}>{row.itemName}</Text><Text style={textStyles.number}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Section>
        ) : (
          <Section title="계정별 계획 / 실제 / 차이">
            {!plan.plan ? <Card><Text style={textStyles.body}>이 주의 계획이 없습니다.</Text><AppButton label="지난주 계획 복사" onPress={() => void copyPrevious().catch(() => undefined)} disabled={app.busy} /></Card> : null}
            {accounts.map((account) => {
              const planned = plannedByAccount[account.id] ?? 0;
              const actual = actuals[account.id] ?? 0;
              return (
                <Card key={account.id}>
                  <Text style={textStyles.title}>{account.name}</Text>
                  <Text style={textStyles.number}>{formatMinutes(planned)} / {formatMinutes(actual)} / {formatMinutes(actual - planned)}</Text>
                  <AppButton label="항목별 보기" variant="plain" onPress={() => setSelectedAccount(account)} />
                </Card>
              );
            })}
            <Card style={styles.totalCard}>
              <Text style={textStyles.title}>합계</Text>
              <Text style={textStyles.number}>{formatMinutes(totals.plan)} / {formatMinutes(totals.actual)} / {formatMinutes(totals.actual - totals.plan)}</Text>
            </Card>
          </Section>
        )}

        <Section title="주간 코멘트">
          <Field label="코멘트(선택, 길이 제한 없음)" value={commentDraft?.weekStart === week.start ? commentDraft.value : ''}
            onChangeText={(value) => setCommentDraft((current) => editWeeklyCommentDraft(beginWeeklyCommentDraft(current, week.start), value))} multiline />
          {commentDraft?.weekStart === week.start && commentDraft.loadStatus === 'loading' ? <Text style={textStyles.muted}>저장된 코멘트를 불러오는 중입니다.</Text> : null}
          {commentDraft?.weekStart === week.start && commentDraft.loadStatus === 'error' ? (
            <><Text style={textStyles.muted}>{commentDraft.loadError}</Text><AppButton label="코멘트 다시 불러오기" variant="secondary" onPress={() => requestWeeklyComment(week.start)} disabled={app.busy} /></>
          ) : null}
          <AppButton label="코멘트 저장" onPress={() => void saveComment().catch(() => undefined)} disabled={app.busy || !canSaveWeeklyCommentDraft(commentDraft, week.start)} />
        </Section>
      </Screen>

      <Sheet visible={selectedAccount !== null} title={selectedAccount?.name ?? '계정 분해'} onClose={() => setSelectedAccount(null)}>
        {selectedItems.map((item) => {
          const itemEntries = entries.filter((entry) => entry.itemId === item.id);
          const time = itemEntries.reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0);
          const count = itemEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
          return <Card key={item.id}><Text style={textStyles.title}>{item.name}</Text><Text style={textStyles.body}>시간 {formatMinutes(time)} · 횟수/완료 {count}</Text></Card>;
        })}
      </Sheet>
    </>
  );
}

function daySummary(planned: number | null, actual: number): string {
  if (planned === null) return `계획 미보존 / ${formatMinutes(actual)} / —`;
  return `${formatMinutes(planned)} / ${formatMinutes(actual)} / ${formatMinutes(actual - planned)}`;
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' })
    .format(new Date(`${value}T12:00:00+09:00`));
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  viewSwitch: { flexDirection: 'row', gap: 8 },
  accountGroup: { gap: 8, paddingVertical: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  itemSummary: { gap: 4, paddingVertical: 6 },
  ledger: { gap: 8, paddingTop: 12 },
  summaryCard: { gap: 6 },
  totalCard: { borderWidth: 2 },
});
