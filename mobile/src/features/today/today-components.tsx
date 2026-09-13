import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppButton, textStyles } from '@/components/ui';
import { formatMinutes } from '@/domain/calculations';
import { timerElapsedMilliseconds, type TimerRuntime } from '@/domain/timer-runtime';
import type {
  TimerSessionViewModel,
  TodayAccountGroupViewModel,
  TodayItemViewModel,
} from '@/features/today/today-view-model';
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import { FONTS } from '@/theme/typography';
import type { Item } from '@/types/domain';

export function TodaySummary({ plannedMinutes, actualMinutes }: { plannedMinutes: number; actualMinutes: number }) {
  const remainingMinutes = plannedMinutes - actualMinutes;
  const remaining = remainingMinutes >= 0
    ? formatMinutes(remainingMinutes)
    : `+${formatMinutes(Math.abs(remainingMinutes))} 초과`;
  return (
    <View
      accessible
      accessibilityLabel={`오늘 기록 ${formatMinutes(actualMinutes)}, 남은 계획 ${remaining}`}
      style={styles.todaySummary}>
      <SummaryMetric label="기록" value={formatMinutes(actualMinutes)} />
      <SummaryMetric label={remainingMinutes >= 0 ? '남음' : '차이'} value={remaining} align="right" />
    </View>
  );
}

export function TodayAccountSection({
  group,
  onItemPress,
}: {
  group: TodayAccountGroupViewModel;
  onItemPress: (item: TodayItemViewModel) => void;
}) {
  const remaining = group.plannedMinutes - group.actualMinutes;
  const total = group.plannedMinutes === 0
    ? group.actualMinutes > 0 ? `${formatMinutes(group.actualMinutes)} 기록` : '시간 계획 없음'
    : remaining >= 0 ? `${formatMinutes(remaining)} 남음` : `+${formatMinutes(Math.abs(remaining))} 초과`;
  return (
    <View style={styles.accountGroup}>
      <View style={styles.accountHeader}>
        <Text accessibilityRole="header" style={styles.accountTitle} numberOfLines={2}>{group.accountName}</Text>
        <Text style={styles.accountSubtotal} numberOfLines={2}>{total}</Text>
      </View>
      <View style={styles.accountList}>
        {group.items.map((item) => (
          <TodayItemRow key={item.candidate.item.id} model={item} onPress={() => onItemPress(item)} />
        ))}
      </View>
    </View>
  );
}

export function TodayItemRow({ model, onPress }: { model: TodayItemViewModel; onPress: () => void }) {
  const state = model.session?.runtime.status ?? 'idle';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${model.candidate.item.name}, ${model.meta}, ${model.trailing}`}
      onPress={onPress}
      style={({ pressed }) => [styles.todayItem, pressed && styles.pressed]}>
      <View style={[
        styles.itemStateMark,
        state === 'running' && styles.itemStateMarkRunning,
        state === 'paused' && styles.itemStateMarkPaused,
      ]} />
      <View style={styles.todayItemCopy}>
        <Text style={styles.taskName} numberOfLines={2}>{model.candidate.item.name}</Text>
        <Text style={styles.taskMeta} numberOfLines={2}>{model.meta}</Text>
      </View>
      <Text style={[styles.todayItemTrailing, state === 'paused' && styles.pausedMeta]} numberOfLines={2}>
        {model.trailing}
      </Text>
    </Pressable>
  );
}

export function CurrentSessionCard({
  session,
  accountName,
  plannedValue,
  priorActualMinutes,
  todayActualMinutes,
  busy,
  onPause,
  onResume,
  onStop,
}: {
  session: TimerSessionViewModel;
  accountName: string;
  plannedValue: number | null;
  priorActualMinutes: number;
  todayActualMinutes: number;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const elapsed = useTimerElapsed(session.runtime);
  const elapsedSeconds = Math.floor(elapsed / 1_000);
  const remainingSeconds = plannedValue === null
    ? null
    : plannedValue * 60 - priorActualMinutes * 60 - elapsedSeconds;
  const statusLabel = session.runtime.status === 'paused' ? '일시정지됨' : '기록 중';
  const remainingLabel = remainingSeconds === null
    ? '계획 없음'
    : remainingSeconds >= 0
      ? `${formatClockDuration(remainingSeconds)} 남음`
      : `+${formatClockDuration(Math.abs(remainingSeconds))} 초과`;
  const todayTotal = formatMinutes(todayActualMinutes + Math.round(elapsed / 60_000));
  const paused = session.runtime.status === 'paused';
  return (
    <View style={[styles.sessionCard, paused && styles.sessionCardPaused]}>
      <Text style={[styles.sessionStatus, paused && styles.pausedMeta]}>{statusLabel}</Text>
      <Text accessibilityRole="header" style={styles.sessionItem} numberOfLines={2}>
        {accountName} · {session.item.name}
      </Text>
      <Text accessibilityLabel={`경과 시간 ${formatTimer(elapsed)}`} style={[styles.sessionTimer, paused && styles.sessionTimerPaused]}>
        {formatTimer(elapsed)}
      </Text>
      <View style={styles.sessionMetrics}>
        <Text style={styles.sessionRemaining} numberOfLines={2}>{remainingLabel}</Text>
        <Text style={[styles.sessionRemaining, styles.textRight]} numberOfLines={2}>오늘 {todayTotal}</Text>
      </View>
      <View style={styles.sessionActions}>
        <View style={styles.sessionAction}>
          <AppButton label={paused ? '다시 시작' : '일시정지'} onPress={paused ? onResume : onPause} disabled={busy} />
        </View>
        <View style={styles.sessionAction}>
          <AppButton label="기록 종료" variant="plain" onPress={onStop} disabled={busy} />
        </View>
      </View>
    </View>
  );
}

export function MetricHero({ label, value, description }: { label: string; value: string; description?: string }) {
  return (
    <View style={styles.metricHero}>
      <Text style={textStyles.muted}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {description ? <Text style={textStyles.muted}>{description}</Text> : null}
    </View>
  );
}

export function PlanActualDelta({ planned, actual }: { planned: number | null; actual: number }) {
  const delta = planned === null ? null : actual - planned;
  return (
    <View
      accessibilityLabel={`계획 ${planned === null ? '미보존' : formatMinutes(planned)}, 실제 ${formatMinutes(actual)}, 차이 ${delta === null ? '미보존' : signedMinutes(delta)}`}
      style={styles.metricRow}>
      <MetricColumn label="계획" value={planned === null ? '미보존' : formatMinutes(planned)} />
      <MetricColumn label="실제" value={formatMinutes(actual)} />
      <MetricColumn label="차이" value={delta === null ? '—' : signedMinutes(delta)} align="right" />
    </View>
  );
}

export function LedgerRow({ title, planned, actual, level, onPress }: {
  title: string;
  planned: number | null;
  actual: number;
  level: 'account' | 'item';
  onPress?: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.6;
  const delta = planned === null ? null : actual - planned;
  const metrics = [
    `계획 ${planned === null ? '미보존' : formatMinutes(planned)}`,
    `실제 ${formatMinutes(actual)}`,
    `차이 ${delta === null ? '—' : signedMinutes(delta)}`,
  ];
  const content = (
    <>
      <Text style={[styles.ledgerTitle, level === 'account' && styles.ledgerTitleAccount, stacked && styles.ledgerTitleStacked]} numberOfLines={stacked ? 3 : 2}>{title}</Text>
      <View style={[styles.ledgerMetrics, stacked && styles.ledgerMetricsStacked]}>
        {metrics.map((value) => <Text key={value} style={styles.ledgerMetric} numberOfLines={2}>{value}</Text>)}
      </View>
    </>
  );
  const rowStyle = [
    styles.ledgerRow,
    level === 'account' ? styles.ledgerAccount : styles.ledgerItem,
    stacked && styles.ledgerRowStacked,
  ];
  if (!onPress) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${metrics.join(', ')}, 기록 상세`}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function EntryRow({ title, value, description, onPress }: {
  title: string;
  value: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}, ${description}, 기록 편집`}
      onPress={onPress}
      style={({ pressed }) => [styles.entryRow, pressed && styles.pressed]}>
      <View style={styles.entryCopy}>
        <Text style={textStyles.title} numberOfLines={2}>{title}</Text>
        <Text style={textStyles.muted} numberOfLines={2}>{description}</Text>
      </View>
      <Text style={styles.entryValue} numberOfLines={2}>{value}</Text>
    </Pressable>
  );
}

export function ChoiceChips({ label, choices, value, onChange }: {
  label: string;
  choices: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choiceRow}>
        {choices.map((choice) => (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${choice.label}`}
            accessibilityState={{ selected: value === choice.value }}
            onPress={() => onChange(choice.value)}
            style={[styles.choice, value === choice.value && styles.choiceSelected]}>
            <Text style={[styles.choiceText, value === choice.value && styles.choiceTextSelected]}>{choice.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function FixedActionBar({ children }: { children: ReactNode }) {
  return <View style={styles.actionBar}>{children}</View>;
}

export function taskActionLabel(item: Item): string {
  if (item.type === 'time') return '시작';
  if (item.type === 'completion') return '완료 기록';
  if (item.type === 'count') return '1회 기록';
  return '값 입력';
}

function MetricColumn({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <View style={[styles.metricColumn, align === 'right' && styles.alignRight]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricColumnValue, align === 'right' && styles.textRight]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SummaryMetric({ label, value, align = 'left' }: { label: string; value: string; align?: 'left' | 'right' }) {
  return (
    <View style={[styles.summaryMetric, align === 'right' && styles.alignRight]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, align === 'right' && styles.textRight]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function useTimerElapsed(runtime: TimerRuntime): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (runtime.status === 'paused') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [runtime]);
  return timerElapsedMilliseconds(runtime, new Date(now).toISOString());
}

function formatTimer(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatClockDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? formatMinutes(minutes) : `${formatMinutes(minutes)} ${seconds}초`;
}

function signedMinutes(value: number): string {
  if (value > 0) return `+${formatMinutes(value)}`;
  return formatMinutes(value);
}

const styles = StyleSheet.create({
  todaySummary: { minHeight: 56, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceSubtle, paddingHorizontal: 14, paddingVertical: 10 },
  summaryMetric: { flex: 1, gap: 2 },
  summaryLabel: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  summaryValue: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  accountGroup: { gap: 10 },
  accountHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, paddingHorizontal: tokens.space.xxs },
  accountTitle: { flex: 1, color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.section, lineHeight: 24, letterSpacing: -0.2 },
  accountSubtotal: { maxWidth: 140, color: COLORS.accentStrong, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  accountList: { gap: 10 },
  todayItem: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: COLORS.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.card, backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: tokens.space.sm },
  itemStateMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.muted },
  itemStateMarkRunning: { backgroundColor: COLORS.accent },
  itemStateMarkPaused: { backgroundColor: COLORS.borderStrong },
  todayItemCopy: { flex: 1, minWidth: 0, gap: 2 },
  taskName: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, letterSpacing: -0.1 },
  taskMeta: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  todayItemTrailing: { width: 88, flexShrink: 0, color: COLORS.accentStrong, fontFamily: FONTS.medium, fontSize: tokens.type.caption, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  pausedMeta: { color: COLORS.muted },
  pressed: { opacity: 0.7 },
  sessionCard: { gap: 8, borderColor: COLORS.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.card, backgroundColor: COLORS.accentSoft, padding: tokens.space.md },
  sessionCardPaused: { backgroundColor: COLORS.surfaceSubtle },
  sessionStatus: { color: COLORS.accentStrong, fontFamily: FONTS.medium, fontSize: tokens.type.caption, lineHeight: 18 },
  sessionItem: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22 },
  sessionTimer: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.timer, lineHeight: 48, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  sessionTimerPaused: { color: COLORS.muted },
  sessionMetrics: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.space.xs },
  sessionRemaining: { flex: 1, color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18, fontVariant: ['tabular-nums'] },
  sessionActions: { flexDirection: 'row', gap: tokens.space.xs },
  sessionAction: { flex: 1 },
  metricHero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.xs, paddingVertical: tokens.space.sm },
  metricValue: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  metricRow: { minHeight: 68, flexDirection: 'row', justifyContent: 'space-between', borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceSubtle, padding: tokens.space.sm },
  metricColumn: { flex: 1, alignItems: 'flex-start', gap: 2 },
  metricLabel: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  metricColumnValue: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  alignRight: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },
  ledgerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: tokens.radius.small, paddingHorizontal: tokens.space.sm, paddingVertical: 12 },
  ledgerRowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  ledgerAccount: { backgroundColor: COLORS.surfaceSubtle },
  ledgerItem: { backgroundColor: COLORS.surface },
  ledgerTitle: { flex: 1.35, color: COLORS.text, fontFamily: FONTS.regular, fontSize: tokens.type.label, lineHeight: 18 },
  ledgerTitleStacked: { flexGrow: 0, flexBasis: 'auto' },
  ledgerTitleAccount: { fontFamily: FONTS.medium, fontSize: tokens.type.caption },
  ledgerMetrics: { flex: 3, flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  ledgerMetricsStacked: { width: '100%' },
  ledgerMetric: { flex: 1, color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.label, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  entryRow: { minHeight: tokens.hitTarget, flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth },
  entryCopy: { flex: 1, gap: tokens.space.xxs },
  entryValue: { maxWidth: 96, color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, textAlign: 'right', fontVariant: ['tabular-nums'] },
  choiceWrap: { gap: tokens.space.xs },
  choiceLabel: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.caption, lineHeight: 18 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  choice: { minHeight: tokens.hitTarget, backgroundColor: COLORS.surfaceSubtle, borderRadius: tokens.radius.pill, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  choiceSelected: { backgroundColor: COLORS.accentSoft },
  choiceText: { color: COLORS.text, fontFamily: FONTS.regular, fontSize: tokens.type.caption },
  choiceTextSelected: { color: COLORS.accent, fontFamily: FONTS.medium },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, paddingTop: tokens.space.sm },
});
