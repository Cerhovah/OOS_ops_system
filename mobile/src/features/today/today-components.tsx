import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, textStyles } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { formatMinutes } from '@/domain/calculations';
import { timerElapsedMilliseconds, type TimerRuntime } from '@/domain/timer-runtime';
import type {
  TimerSessionViewModel,
  TodayAccountGroupViewModel,
  TodayItemViewModel,
} from '@/features/today/today-view-model';
import { tokens } from '@/theme/tokens';
import type { Item } from '@/types/domain';

export function TodaySummary({ plannedMinutes, actualMinutes }: { plannedMinutes: number; actualMinutes: number }) {
  const remainingMinutes = Math.max(0, plannedMinutes - actualMinutes);
  return (
    <View
      accessible
      accessibilityLabel={`오늘 기록 ${formatMinutes(actualMinutes)}, 남은 계획 ${formatMinutes(remainingMinutes)}`}
      style={styles.todaySummary}>
      <SummaryMetric label="오늘 기록" value={formatMinutes(actualMinutes)} />
      <View style={styles.summaryDivider} />
      <SummaryMetric label="남은 계획" value={formatMinutes(remainingMinutes)} />
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
  return (
    <View style={styles.accountGroup}>
      <View style={styles.accountHeader}>
        <Text accessibilityRole="header" style={styles.accountTitle} numberOfLines={2}>{group.accountName}</Text>
        <Text style={styles.accountSubtotal}>
          {formatMinutes(group.actualMinutes)} / {formatMinutes(group.plannedMinutes)}
        </Text>
      </View>
      <View style={styles.accountList}>
        {group.items.map((item, index) => (
          <TodayItemRow
            key={item.candidate.item.id}
            model={item}
            isLast={index === group.items.length - 1}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

export function TodayItemRow({
  model,
  onPress,
  isLast = false,
}: {
  model: TodayItemViewModel;
  onPress: () => void;
  isLast?: boolean;
}) {
  const state = model.session?.runtime.status ?? 'idle';
  const action = state === 'running' ? '실행 중' : state === 'paused' ? '일시정지' : '보기';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${model.candidate.item.name}, ${model.summary}, ${action}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.todayItem,
        state === 'running' && styles.todayItemRunning,
        state === 'paused' && styles.todayItemPaused,
        isLast && styles.todayItemLast,
        pressed && styles.pressed,
      ]}>
      <View style={[
        styles.itemStateMark,
        state === 'running' && styles.itemStateMarkRunning,
        state === 'paused' && styles.itemStateMarkPaused,
      ]} />
      <View style={styles.todayItemCopy}>
        <Text style={styles.taskName} numberOfLines={2}>{model.candidate.item.name}</Text>
        <Text style={textStyles.muted} numberOfLines={2}>
          {model.summary}
        </Text>
      </View>
      <Text style={[
        styles.todayItemAction,
        state === 'running' && styles.activeMeta,
        state === 'paused' && styles.pausedMeta,
      ]}>{action}</Text>
    </Pressable>
  );
}

export function CurrentSessionCard({
  session,
  accountName,
  plannedValue,
  busy,
  onPause,
  onResume,
  onStop,
}: {
  session: TimerSessionViewModel;
  accountName: string;
  plannedValue: number | null;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const elapsed = useTimerElapsed(session.runtime);
  const elapsedMinutes = Math.round(elapsed / 60_000);
  const remaining = plannedValue === null ? null : plannedValue - elapsedMinutes;
  const statusLabel = session.runtime.status === 'paused' ? '일시정지됨' : '지금 실행 중';
  const remainingLabel = remaining === null
    ? '계획 없음'
    : remaining >= 0
      ? `${formatMinutes(remaining)} 남음`
      : `계획보다 ${formatMinutes(Math.abs(remaining))} 더 기록`;
  return (
    <View style={[styles.sessionCard, session.runtime.status === 'paused' && styles.sessionCardPaused]}>
      <View style={styles.sessionMetaRow}>
        <View style={styles.sessionStatusWrap}>
          <View style={[styles.sessionDot, session.runtime.status === 'paused' && styles.sessionDotPaused]} />
          <Text style={[styles.sessionStatus, session.runtime.status === 'paused' && styles.pausedMeta]}>{statusLabel}</Text>
        </View>
        <Text style={styles.sessionRemaining}>{remainingLabel}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.sessionItem} numberOfLines={2}>
        {accountName} · {session.item.name}
      </Text>
      <Text accessibilityLabel={`경과 시간 ${formatTimer(elapsed)}`} style={styles.sessionTimer}>
        {formatTimer(elapsed)}
      </Text>
      <View style={styles.sessionActions}>
        <View style={styles.sessionSecondaryAction}>
          <AppButton
            label={session.runtime.status === 'paused' ? '다시 시작' : '일시정지'}
            variant="secondary"
            onPress={session.runtime.status === 'paused' ? onResume : onPause}
            disabled={busy}
          />
        </View>
        <View style={styles.sessionPrimaryAction}>
          <AppButton label="종료하고 기록" onPress={onStop} disabled={busy} />
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
    <View accessibilityLabel={`계획 ${planned === null ? '미보존' : formatMinutes(planned)}, 실제 ${formatMinutes(actual)}, 차이 ${delta === null ? '미보존' : formatMinutes(delta)}`} style={styles.metricRow}>
      <MetricColumn label="계획" value={planned === null ? '미보존' : formatMinutes(planned)} />
      <MetricColumn label="실제" value={formatMinutes(actual)} />
      <MetricColumn label="차이" value={delta === null ? '—' : formatMinutes(delta)} />
    </View>
  );
}

export function LedgerRow({
  title,
  value,
  description,
  onPress,
}: {
  title: string;
  value: string;
  description: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.ledgerText}>
        <Text style={textStyles.title} numberOfLines={2}>{title}</Text>
        <Text style={textStyles.muted} numberOfLines={2}>{description}</Text>
      </View>
      <Text style={styles.ledgerValue}>{value}</Text>
    </>
  );
  if (!onPress) return <View style={styles.ledgerRow}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} 기록 편집`} onPress={onPress} style={({ pressed }) => [styles.ledgerRow, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

export function ChoiceChips({
  label,
  choices,
  value,
  onChange,
}: {
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

function MetricColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricColumn}>
      <Text style={textStyles.muted}>{label}</Text>
      <Text style={styles.metricColumnValue}>{value}</Text>
    </View>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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

const styles = StyleSheet.create({
  todaySummary: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceRaised, paddingHorizontal: tokens.space.md },
  summaryMetric: { flex: 1, gap: 3 },
  summaryLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  summaryValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryDivider: { width: 1, height: 28, marginHorizontal: tokens.space.sm, backgroundColor: COLORS.border },
  accountGroup: { gap: 6 },
  accountHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, paddingHorizontal: tokens.space.xxs },
  accountTitle: { flex: 1, color: COLORS.text, fontSize: tokens.type.caption, fontWeight: '800', letterSpacing: -0.1 },
  accountSubtotal: { color: COLORS.muted, fontSize: tokens.type.caption, fontVariant: ['tabular-nums'] },
  accountList: { borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceRaised, overflow: 'hidden' },
  todayItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: tokens.space.sm },
  todayItemLast: { borderBottomWidth: 0 },
  todayItemRunning: { backgroundColor: COLORS.accentSoft },
  todayItemPaused: { backgroundColor: COLORS.surfaceSubtle },
  itemStateMark: { width: 3, height: 28, borderRadius: 2, backgroundColor: 'transparent' },
  itemStateMarkRunning: { backgroundColor: COLORS.accent },
  itemStateMarkPaused: { backgroundColor: COLORS.muted },
  todayItemCopy: { flex: 1, gap: tokens.space.xxs },
  taskName: { flex: 1, color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', lineHeight: 22, letterSpacing: -0.2 },
  todayItemAction: { color: COLORS.muted, fontSize: tokens.type.caption, fontWeight: '700' },
  activeMeta: { color: COLORS.accentStrong },
  pausedMeta: { color: COLORS.muted },
  pressed: { opacity: 0.7 },
  sessionCard: { gap: 10, borderLeftWidth: 3, borderLeftColor: COLORS.accent, borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceRaised, padding: tokens.space.md },
  sessionCardPaused: { borderLeftColor: COLORS.muted },
  sessionMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.xs },
  sessionStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sessionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  sessionDotPaused: { backgroundColor: COLORS.muted },
  sessionStatus: { color: COLORS.accentStrong, fontSize: tokens.type.caption, fontWeight: '700' },
  sessionRemaining: { flexShrink: 1, color: COLORS.muted, fontSize: tokens.type.caption, textAlign: 'right', fontVariant: ['tabular-nums'] },
  sessionItem: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', lineHeight: 23 },
  sessionTimer: { color: COLORS.text, fontSize: 38, lineHeight: 46, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1.3 },
  sessionActions: { flexDirection: 'row', gap: tokens.space.xs },
  sessionSecondaryAction: { flex: 2 },
  sessionPrimaryAction: { flex: 3 },
  metricHero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.xs, paddingVertical: tokens.space.sm },
  metricValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricRow: { flexDirection: 'row', borderRadius: tokens.radius.card, backgroundColor: COLORS.surfaceRaised, paddingVertical: 14, paddingHorizontal: tokens.space.xs },
  metricColumn: { flex: 1, alignItems: 'center', gap: tokens.space.xxs },
  metricColumnValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ledgerRow: { minHeight: tokens.hitTarget, flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  ledgerText: { flex: 1, gap: tokens.space.xxs },
  ledgerValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  choiceWrap: { gap: tokens.space.xs },
  choiceLabel: { color: COLORS.text, fontSize: tokens.type.caption, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  choice: { minHeight: tokens.hitTarget, backgroundColor: COLORS.surfaceSubtle, borderRadius: tokens.radius.pill, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  choiceSelected: { backgroundColor: COLORS.accentSoft },
  choiceText: { color: COLORS.text, fontSize: tokens.type.caption },
  choiceTextSelected: { color: COLORS.accent, fontWeight: '700' },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, paddingTop: tokens.space.sm },
});
