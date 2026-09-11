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
  return (
    <View style={styles.todaySummary}>
      <Text style={styles.todaySummaryText}>
        오늘 기록 {formatMinutes(actualMinutes)} · 남은 계획 {formatMinutes(Math.max(0, plannedMinutes - actualMinutes))}
      </Text>
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
      {group.items.map((item) => (
        <TodayItemRow key={item.candidate.item.id} model={item} onPress={() => onItemPress(item)} />
      ))}
    </View>
  );
}

export function TodayItemRow({ model, onPress }: { model: TodayItemViewModel; onPress: () => void }) {
  const state = model.session?.runtime.status ?? 'idle';
  const action = state === 'running' ? '실행 중' : state === 'paused' ? '다시 시작' : '열기';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${model.candidate.item.name}, ${model.summary}, ${action}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.todayItem,
        state === 'running' && styles.todayItemRunning,
        state === 'paused' && styles.todayItemPaused,
        pressed && styles.pressed,
      ]}>
      <View style={styles.todayItemCopy}>
        <Text style={styles.taskName} numberOfLines={2}>{model.candidate.item.name}</Text>
        <Text style={[textStyles.muted, state === 'running' && styles.activeMeta]} numberOfLines={2}>
          {model.summary}
        </Text>
      </View>
      <Text style={[styles.todayItemAction, state === 'running' && styles.activeMeta]}>{action}</Text>
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
      <Text style={[styles.sessionStatus, session.runtime.status === 'paused' && styles.pausedMeta]}>{statusLabel}</Text>
      <Text accessibilityRole="header" style={styles.sessionItem} numberOfLines={2}>
        {accountName} · {session.item.name}
      </Text>
      <Text accessibilityLabel={`경과 시간 ${formatTimer(elapsed)}`} style={styles.sessionTimer}>
        {formatTimer(elapsed)}
      </Text>
      <Text style={textStyles.muted}>{remainingLabel}</Text>
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
  todaySummary: { minHeight: tokens.hitTarget, justifyContent: 'center', borderRadius: tokens.radius.control, backgroundColor: COLORS.surface, paddingHorizontal: tokens.space.sm },
  todaySummaryText: { color: COLORS.muted, fontSize: tokens.type.caption, fontWeight: '600', fontVariant: ['tabular-nums'] },
  accountGroup: { gap: tokens.space.xs },
  accountHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  accountTitle: { flex: 1, color: COLORS.text, fontSize: tokens.type.caption, fontWeight: '700' },
  accountSubtotal: { color: COLORS.muted, fontSize: tokens.type.caption, fontVariant: ['tabular-nums'] },
  todayItem: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, borderColor: COLORS.border, borderWidth: 1, borderRadius: tokens.radius.card, backgroundColor: COLORS.surface, paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md },
  todayItemRunning: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  todayItemPaused: { borderColor: COLORS.warning, backgroundColor: COLORS.warningSoft },
  todayItemCopy: { flex: 1, gap: tokens.space.xxs },
  taskName: { flex: 1, color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', lineHeight: 23 },
  todayItemAction: { color: COLORS.muted, fontSize: tokens.type.caption, fontWeight: '700' },
  activeMeta: { color: COLORS.accent },
  pausedMeta: { color: COLORS.warning },
  pressed: { opacity: 0.7 },
  sessionCard: { gap: tokens.space.sm, borderRadius: tokens.radius.card, backgroundColor: COLORS.accentSoft, padding: tokens.space.md },
  sessionCardPaused: { backgroundColor: COLORS.warningSoft },
  sessionStatus: { color: COLORS.accent, fontSize: tokens.type.caption, fontWeight: '700' },
  sessionItem: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', lineHeight: 23 },
  sessionTimer: { color: COLORS.text, fontSize: 44, lineHeight: 52, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  sessionActions: { flexDirection: 'row', gap: tokens.space.xs },
  sessionSecondaryAction: { flex: 2 },
  sessionPrimaryAction: { flex: 3 },
  metricHero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.xs, paddingVertical: tokens.space.sm },
  metricValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricRow: { flexDirection: 'row', borderTopColor: COLORS.border, borderTopWidth: 1, borderBottomColor: COLORS.border, borderBottomWidth: 1, paddingVertical: tokens.space.md },
  metricColumn: { flex: 1, alignItems: 'center', gap: tokens.space.xxs },
  metricColumnValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ledgerRow: { minHeight: tokens.hitTarget, flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  ledgerText: { flex: 1, gap: tokens.space.xxs },
  ledgerValue: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  choiceWrap: { gap: tokens.space.xs },
  choiceLabel: { color: COLORS.text, fontSize: tokens.type.caption, fontWeight: '600' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs },
  choice: { minHeight: tokens.hitTarget, borderColor: COLORS.border, borderWidth: 1, borderRadius: tokens.radius.pill, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  choiceSelected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  choiceText: { color: COLORS.text, fontSize: tokens.type.caption },
  choiceTextSelected: { color: COLORS.accent, fontWeight: '700' },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, paddingTop: tokens.space.sm },
});
