import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Heading, LoadingView, Screen, Section, StatusBanner, textStyles } from '@/components/ui';
import { COLORS } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { addDays, dateKey, formatMinutes, latestPlanForWeek, parseWeekStartDay, planStatus, weekRange } from '@/domain/calculations';
import {
  editPlanDraft,
  hydratePlanDraft,
  markPlanDraftSaved,
  planDraftHours,
  type PlanDraft,
} from '@/features/plan/plan-draft';

export default function PlanScreen() {
  const app = useApp();
  const weekStartDay = parseWeekStartDay(app.snapshot.settings.week_start_day);
  const initial = weekRange(dateKey(new Date()), weekStartDay).start;
  const [weekStart, setWeekStart] = useState(initial);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const accounts = useMemo(
    () => app.snapshot.accounts.filter((account) => !account.deletedAt && !account.archived),
    [app.snapshot.accounts],
  );
  const current = useMemo(
    () => latestPlanForWeek(app.snapshot.plans, app.snapshot.planLines, weekStart),
    [app.snapshot.planLines, app.snapshot.plans, weekStart],
  );

  useEffect(() => {
    setWeekStart(weekRange(dateKey(new Date()), weekStartDay).start);
  }, [weekStartDay]);

  const sourceKey = `${current.plan?.id ?? 'none'}:${accounts.map((account) => account.id).join(',')}`;
  const sourceHours = useMemo(() => planDraftHours(accounts, current.lines), [accounts, current.lines]);

  useEffect(() => {
    setDraft((currentDraft) => hydratePlanDraft(currentDraft, {
      weekStart,
      sourceKey,
      hours: sourceHours,
    }));
  }, [draft?.dirty, sourceHours, sourceKey, weekStart]);

  const hours = draft?.weekStart === weekStart ? draft.hours : sourceHours;

  const minutes = useMemo(
    () => accounts.map((account) => Number(hours[account.id] ?? 0) * 60),
    [accounts, hours],
  );
  const valid = minutes.every(Number.isFinite);
  const status = planStatus(valid ? minutes : []);

  if (app.loading) return <LoadingView />;

  async function save(source: 'app' | 'copy_last_week' = 'app', note: string | null = null) {
    const submittedWeek = weekStart;
    const submittedHours = hours;
    const values = Object.fromEntries(accounts.map((account) => [account.id, Number(submittedHours[account.id]) * 60]));
    const version = await app.saveWeeklyPlan(submittedWeek, values, source, note);
    setDraft((currentDraft) => currentDraft
      ? markPlanDraftSaved(currentDraft, submittedHours, submittedWeek)
      : currentDraft);
    Alert.alert('계획 저장', `버전 ${version}을 새로 저장했습니다.`);
  }

  function confirmSave() {
    if (!valid) return;
    if (status.kind === 'balanced') {
      void save().catch(() => undefined);
      return;
    }
    const label = status.kind === 'over' ? `초과 +${formatMinutes(status.deltaMinutes)}` : `미배분 ${formatMinutes(-status.deltaMinutes)}`;
    Alert.alert(
      '168시간과 다른 계획',
      `현재 계획 ${formatMinutes(status.totalMinutes)} · ${label}. 다른 계정을 조정하거나 그대로 저장할 수 있습니다.`,
      [
        { text: '조정하기', style: 'cancel' },
        { text: '그대로 저장', onPress: () => void save().catch(() => undefined) },
      ],
    );
  }

  async function copyPrevious() {
    const copied = await app.copyPreviousWeek(weekStart);
    Alert.alert('지난주 계획 복사', copied ? '새 계획 버전을 만들었습니다.' : '복사할 지난주 계획이 없습니다.');
  }

  async function restore(planId: string, version: number) {
    const lines = app.snapshot.planLines.filter((line) => line.weeklyPlanId === planId && !line.deletedAt);
    const values = Object.fromEntries(lines.map((line) => [line.accountId, line.plannedMinutes]));
    const next = await app.saveWeeklyPlan(weekStart, values, 'app', `버전 ${version} 복원`);
    Alert.alert('계획 복원', `버전 ${version}의 값으로 새 버전 ${next}을 만들었습니다.`);
  }

  const versions = app.snapshot.plans.filter((plan) => plan.weekStart === weekStart && !plan.deletedAt);

  return (
    <Screen>
      <Heading subtitle={`${weekStart} ~ ${addDays(weekStart, 6)}`}>계획</Heading>
      {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
      <View style={styles.nav}>
        <AppButton label="이전 주" variant="secondary" onPress={() => setWeekStart(addDays(weekStart, -7))} />
        <AppButton label="이번 주" variant="plain" onPress={() => setWeekStart(initial)} />
        <AppButton label="다음 주" variant="secondary" onPress={() => setWeekStart(addDays(weekStart, 7))} />
      </View>
      <Card style={status.kind === 'balanced' ? undefined : styles.warning}>
        <Text style={textStyles.muted}>실시간 합계</Text>
        <Text style={styles.status}>
          {!valid
            ? '입력 형식을 확인하십시오.'
            : status.kind === 'balanced'
              ? `현재 계획: ${formatMinutes(status.totalMinutes)}`
              : status.kind === 'over'
                ? `현재 계획: ${formatMinutes(status.totalMinutes)} · 초과 +${formatMinutes(status.deltaMinutes)}`
                : `현재 계획: ${formatMinutes(status.totalMinutes)} · 미배분 ${formatMinutes(-status.deltaMinutes)}`}
        </Text>
      </Card>
      <Section title="계정별 주간 시간">
        {accounts.map((account) => (
          <Field
            key={account.id}
            label={`${account.name} (시간)`}
            value={hours[account.id] ?? '0'}
            onChangeText={(value) => setDraft((currentDraft) => editPlanDraft(
              currentDraft ?? {
                weekStart,
                sourceKey,
                hours: sourceHours,
                dirty: false,
              },
              account.id,
              value,
            ))}
            keyboardType="decimal-pad"
          />
        ))}
        <AppButton label="계획 저장" onPress={confirmSave} disabled={!valid || app.busy} />
        <AppButton
          label="지난주 계획 복사"
          variant="secondary"
          onPress={() => void copyPrevious().catch(() => undefined)}
          disabled={app.busy}
        />
      </Section>
      <Section title="버전 이력">
        {versions.length === 0 ? <Text style={textStyles.body}>저장된 버전이 없습니다.</Text> : null}
        {versions.map((version) => {
          const total = app.snapshot.planLines
            .filter((line) => line.weeklyPlanId === version.id && !line.deletedAt)
            .reduce((sum, line) => sum + line.plannedMinutes, 0);
          return (
            <Card key={version.id}>
              <Text style={textStyles.title}>버전 {version.version} · {version.source}</Text>
              <Text style={textStyles.number}>{formatMinutes(total)} · {new Date(version.createdAt).toLocaleString('ko-KR')}</Text>
              {version.note ? <Text style={textStyles.muted}>{version.note}</Text> : null}
              <AppButton
                label="이 버전 복원"
                variant="secondary"
                onPress={() => void restore(version.id, version.version).catch(() => undefined)}
                disabled={app.busy}
              />
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  warning: { backgroundColor: COLORS.warningSoft, borderColor: COLORS.warning },
  status: { color: COLORS.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
