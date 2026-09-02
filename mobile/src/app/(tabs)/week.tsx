import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Heading, LoadingView, Screen, Section, Sheet, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import {
  actualMinutesByAccount,
  addDays,
  dateKey,
  entryBelongsToRange,
  formatMinutes,
  latestPlanForWeek,
  parseWeekStartDay,
  weekRange,
} from '@/domain/calculations';
import type { Account } from '@/types/domain';

const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];

export default function WeekScreen() {
  const app = useApp();
  const weekStartDay = parseWeekStartDay(app.snapshot.settings.week_start_day);
  const initial = weekRange(dateKey(new Date()), weekStartDay).start;
  const [weekStart, setWeekStart] = useState(initial);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showDays, setShowDays] = useState(false);
  const [comment, setComment] = useState('');
  const weekEnd = addDays(weekStart, 6);
  const accounts = app.snapshot.accounts.filter((account) => !account.deletedAt && !account.archived);
  const plan = latestPlanForWeek(app.snapshot.plans, app.snapshot.planLines, weekStart);
  const entries = app.snapshot.entries.filter(
    (entry) => !entry.deletedAt && entryBelongsToRange(entry, weekStart, weekEnd),
  );
  const actuals = actualMinutesByAccount(entries);
  const plannedByAccount = Object.fromEntries(plan.lines.map((line) => [line.accountId, line.plannedMinutes]));

  useEffect(() => {
    setWeekStart(weekRange(dateKey(new Date()), weekStartDay).start);
  }, [weekStartDay]);

  useEffect(() => {
    void app.getWeeklyComment(weekStart).then(setComment);
  }, [app, weekStart]);

  const totals = useMemo(
    () => ({
      plan: accounts.reduce((sum, account) => sum + (plannedByAccount[account.id] ?? 0), 0),
      actual: accounts.reduce((sum, account) => sum + (actuals[account.id] ?? 0), 0),
    }),
    [accounts, actuals, plannedByAccount],
  );

  if (app.loading) return <LoadingView />;

  async function copyPrevious() {
    const copied = await app.copyPreviousWeek(weekStart);
    Alert.alert('지난주 계획 복사', copied ? '새 계획 버전을 만들었습니다.' : '복사할 지난주 계획이 없습니다.');
  }

  const selectedItems = selectedAccount
    ? app.snapshot.items.filter((item) => item.accountId === selectedAccount.id && !item.deletedAt)
    : [];

  return (
    <>
      <Screen>
        <Heading subtitle={`${weekStart} ~ ${weekEnd}`}>주간</Heading>
        <View style={styles.nav}>
          <AppButton label="이전 주" variant="secondary" onPress={() => setWeekStart(addDays(weekStart, -7))} />
          <AppButton label="이번 주" variant="plain" onPress={() => setWeekStart(initial)} />
          <AppButton label="다음 주" variant="secondary" onPress={() => setWeekStart(addDays(weekStart, 7))} />
        </View>
        {!plan.plan ? (
          <Card>
            <Text style={textStyles.body}>이번 주 계획이 없습니다.</Text>
            <AppButton label="지난주 계획 복사" onPress={() => void copyPrevious()} />
          </Card>
        ) : null}
        <Section
          title="계정별 계획 / 실제 / 차이"
          action={<AppButton label={showDays ? '계정 보기' : '요일 보기'} variant="plain" onPress={() => setShowDays(!showDays)} />}>
          {!showDays ? (
            <>
              {accounts.map((account) => {
                const planned = plannedByAccount[account.id] ?? 0;
                const actual = actuals[account.id] ?? 0;
                return (
                  <Card key={account.id}>
                    <Text style={textStyles.title}>{account.name}</Text>
                    <Text style={textStyles.number}>{formatMinutes(planned)} / {formatMinutes(actual)} / {formatMinutes(actual - planned)}</Text>
                    <AppButton label="항목·요일 분해" variant="plain" onPress={() => setSelectedAccount(account)} />
                  </Card>
                );
              })}
              <Card style={styles.totalCard}>
                <Text style={textStyles.title}>합계</Text>
                <Text style={textStyles.number}>{formatMinutes(totals.plan)} / {formatMinutes(totals.actual)} / {formatMinutes(totals.actual - totals.plan)}</Text>
              </Card>
            </>
          ) : (
            dayLabels.map((_, index) => {
              const weekday = (weekStartDay + index) % 7;
              const label = dayLabels[weekday];
              const key = addDays(weekStart, index);
              const actual = entries
                .filter((entry) => dateKey(new Date(entry.startedAt ?? entry.occurredAt)) === key && entry.type === 'time')
                .reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0);
              const planned = app.snapshot.schedules
                .filter((schedule) => !schedule.deletedAt && (schedule.weekdayMask & (1 << weekday)) !== 0)
                .reduce((sum, schedule) => sum + (schedule.plannedValue ?? 0), 0);
              return (
                <Card key={key}>
                  <Text style={textStyles.title}>{label} · {key}</Text>
                  <Text style={textStyles.number}>{formatMinutes(planned)} / {formatMinutes(actual)} / {formatMinutes(actual - planned)}</Text>
                </Card>
              );
            })
          )}
        </Section>
        <Section title="주간 코멘트">
          <Field label="코멘트(선택, 길이 제한 없음)" value={comment} onChangeText={setComment} multiline />
          <AppButton label="코멘트 저장" onPress={() => void app.saveWeeklyComment(weekStart, comment)} />
        </Section>
      </Screen>

      <Sheet visible={selectedAccount !== null} title={selectedAccount?.name ?? '계정 분해'} onClose={() => setSelectedAccount(null)}>
        {selectedItems.map((item) => {
          const itemEntries = entries.filter((entry) => entry.itemId === item.id);
          const time = itemEntries.reduce((sum, entry) => sum + (entry.durationMin ?? 0), 0);
          const count = itemEntries.reduce((sum, entry) => sum + (entry.count ?? 0), 0);
          return (
            <Card key={item.id}>
              <Text style={textStyles.title}>{item.name}</Text>
              <Text style={textStyles.body}>시간 {formatMinutes(time)} · 횟수/완료 {count}</Text>
              <Text style={textStyles.muted}>
                {dayLabels.map((_, index) => {
                  const label = dayLabels[(weekStartDay + index) % 7];
                  const key = addDays(weekStart, index);
                  const value = itemEntries
                    .filter((entry) => dateKey(new Date(entry.startedAt ?? entry.occurredAt)) === key)
                    .reduce((sum, entry) => sum + (entry.durationMin ?? entry.count ?? 0), 0);
                  return `${label} ${value}`;
                }).join(' · ')}
              </Text>
            </Card>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  totalCard: { borderWidth: 2 },
});
