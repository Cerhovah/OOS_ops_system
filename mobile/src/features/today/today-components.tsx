import { useEffect, useState, type ReactNode } from 'react';
import { Check, NotebookPen, Pause, PencilLine, Play, Plus, type LucideIcon } from 'lucide-react-native';
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

export function TodaySummary({ actualMinutes, itemCount }: { actualMinutes: number; itemCount: number }) {
  const label = `오늘 ${formatMinutes(actualMinutes)} 기록 · ${itemCount}개 항목`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={styles.todaySummary}>
      <Text style={styles.todaySummaryText}>{label}</Text>
    </View>
  );
}

export function TodayAccountSection({
  group,
  currentSessionId,
  disabled,
  onItemAction,
  onItemPress,
}: {
  group: TodayAccountGroupViewModel;
  currentSessionId: string | null;
  disabled?: boolean;
  onItemAction: (item: TodayItemViewModel) => void;
  onItemPress: (item: TodayItemViewModel) => void;
}) {
  const total = group.plannedMinutes === 0
    ? '자유 기록'
    : `${formatMinutes(group.actualMinutes)} / ${formatMinutes(group.plannedMinutes)}`;
  return (
    <View style={styles.accountGroup}>
      <View style={styles.accountHeader}>
        <Text accessibilityRole="header" style={styles.accountTitle}>{group.accountName}</Text>
        <Text style={styles.accountSubtotal}>{total}</Text>
      </View>
      <View style={styles.accountList}>
        {group.items.map((item) => (
          <TodayItemRow
            key={item.candidate.item.id}
            current={item.session?.entry.id === currentSessionId}
            disabled={disabled}
            model={item}
            onActionPress={() => onItemAction(item)}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

export function TodayItemRow({
  disabled = false,
  current = false,
  model,
  onActionPress,
  onPress,
}: {
  disabled?: boolean;
  current?: boolean;
  model: TodayItemViewModel;
  onActionPress: () => void;
  onPress: () => void;
}) {
  const state = model.session?.runtime.status ?? 'idle';
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.6;
  const item = model.candidate.item;
  const timeItem = item.type === 'time';
  const ActionIcon = timeItem && state === 'running'
    ? Pause
    : timeItem
      ? Play
      : item.type === 'completion'
        ? Check
        : item.type === 'count'
          ? Plus
          : PencilLine;
  const actionLabel = timeItem
    ? state === 'running' ? `${item.name} 일시정지` : state === 'paused' ? `${item.name} 다시 시작` : `${item.name} 시작`
    : item.type === 'completion' || item.type === 'count' ? `${item.name} 1회 기록` : `${item.name} 값 입력`;
  const elapsed = useTimerElapsed(model.session?.runtime ?? null);
  const actualMinutes = model.actualMinutes + Math.round(elapsed / 60_000);
  const metadata = timeItem
    ? `오늘 ${formatMinutes(actualMinutes)}${state === 'running' ? ' · 기록 중' : state === 'paused' ? ' · 일시정지' : ''}`
    : item.type === 'completion'
      ? `완료형 · 오늘 ${model.summary}`
      : item.type === 'count'
        ? `횟수형 · 오늘 ${model.summary}`
        : model.summary === '기록 없음'
          ? item.type === 'event' ? '이벤트' : '수치형'
          : `오늘 ${model.summary}`;
  return (
    <View style={styles.todayItem}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${metadata}, 상세와 직접 기록`}
        onPress={onPress}
        style={({ pressed }) => [styles.itemBody, pressed && styles.pressed]}>
        <View style={[
          styles.itemStateMark,
          state === 'running' && styles.itemStateMarkRunning,
          state === 'paused' && styles.itemStateMarkPaused,
        ]} />
        <View style={styles.todayItemCopy}>
          <Text style={styles.taskName}>{item.name}</Text>
          <Text style={styles.taskMeta} numberOfLines={largeText ? undefined : 1}>{metadata}</Text>
        </View>
      </Pressable>
      {current ? <View style={styles.itemAction} /> : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={4}
          onPress={onActionPress}
          style={({ pressed }) => [styles.itemAction, pressed && styles.itemActionPressed]}>
          <View style={ActionIcon === Play ? styles.playOptical : undefined}>
            <ActionIcon color={state === 'paused' ? COLORS.muted : COLORS.accentStrong} size={22} strokeWidth={2} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

export function CurrentSessionCard({
  session,
  accountName,
  accountLimitMinutes,
  priorActualMinutes,
  busy,
  onPause,
  onResume,
  onStop,
}: {
  session: TimerSessionViewModel;
  accountName: string;
  accountLimitMinutes: number;
  priorActualMinutes: number;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const elapsed = useTimerElapsed(session.runtime);
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.6;
  const statusLabel = session.runtime.status === 'paused' ? '일시정지됨' : '기록 중';
  const todayTotal = formatMinutes(priorActualMinutes + Math.round(elapsed / 60_000));
  const accountLimit = accountLimitMinutes > 0 ? `${formatMinutes(accountLimitMinutes)} 공용 상한` : '자유 기록';
  const paused = session.runtime.status === 'paused';
  return (
    <View style={[styles.sessionCard, paused && styles.sessionCardPaused]}>
      <Text style={[styles.sessionStatus, paused && styles.pausedMeta]}>{statusLabel}</Text>
      <Text accessibilityRole="header" style={styles.sessionItem} numberOfLines={largeText ? undefined : 2}>
        {accountName} · {session.item.name}
      </Text>
      <Text accessibilityLabel={`경과 시간 ${formatTimer(elapsed)}`} style={[styles.sessionTimer, paused && styles.sessionTimerPaused]}>
        {formatTimer(elapsed)}
      </Text>
      <Text style={styles.sessionRemaining}>오늘 {todayTotal} · {accountLimit}</Text>
      <View style={styles.sessionActions}>
        <View style={styles.sessionAction}>
          <AppButton label={paused ? '다시 시작' : '일시정지'} onPress={paused ? onResume : onPause} disabled={busy} />
        </View>
        <View style={styles.sessionAction}>
          <AppButton
            label="기록 종료"
            variant="secondary"
            onPress={onStop}
            disabled={busy}
            style={paused ? styles.pausedStopAction : undefined}
          />
        </View>
      </View>
    </View>
  );
}

export function TodayListAction({
  kind,
  label,
  onPress,
}: {
  kind: 'add' | 'reflection';
  label: string;
  onPress: () => void;
}) {
  const Icon: LucideIcon = kind === 'add' ? Plus : NotebookPen;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.listAction, pressed && styles.pressed]}>
      <View style={styles.listActionIcon}>
        <Icon color={COLORS.accentStrong} size={20} strokeWidth={2} />
      </View>
      <Text style={styles.listActionLabel}>{label}</Text>
    </Pressable>
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
      <MetricColumn label="차이" value={delta === null ? '—' : signedMinutes(delta)} />
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
  const accountTotal = planned === null
    ? `실제 ${formatMinutes(actual)}`
    : `${formatMinutes(actual)} / ${formatMinutes(planned)}`;
  const content = level === 'account' ? (
    <>
      <Text style={[styles.ledgerTitle, styles.ledgerTitleAccount]}>{title}</Text>
      <Text style={styles.ledgerAccountTotal}>{accountTotal}</Text>
    </>
  ) : (
    <View style={styles.ledgerCopy}>
      <Text style={styles.ledgerTitle} numberOfLines={stacked ? undefined : 2}>{title}</Text>
      <Text style={styles.ledgerMetric} numberOfLines={stacked ? undefined : 2}>{metrics.join(' · ')}</Text>
    </View>
  );
  const rowStyle = [
    styles.ledgerRow,
    level === 'account' ? styles.ledgerAccount : styles.ledgerItem,
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

function useTimerElapsed(runtime: TimerRuntime | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (runtime === null || runtime.status === 'paused') return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [runtime]);
  return runtime === null ? 0 : timerElapsedMilliseconds(runtime, new Date(now).toISOString());
}

function formatTimer(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function signedMinutes(value: number): string {
  if (value > 0) return `+${formatMinutes(value)}`;
  return formatMinutes(value);
}

const styles = StyleSheet.create({
  todaySummary: { minHeight: 44, justifyContent: 'center' },
  todaySummaryText: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  accountGroup: { gap: 0, paddingBottom: tokens.space.xs },
  accountHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm, paddingLeft: 13 },
  accountTitle: { flex: 1, color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.section, lineHeight: 24, letterSpacing: -0.2 },
  accountSubtotal: { maxWidth: 148, color: COLORS.accentStrong, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  accountList: { gap: 0 },
  todayItem: { minHeight: 60, flexDirection: 'row', alignItems: 'stretch', borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth },
  itemBody: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemStateMark: { width: 3, alignSelf: 'stretch', marginVertical: 18, borderRadius: 2, backgroundColor: COLORS.surfaceSubtle },
  itemStateMarkRunning: { backgroundColor: COLORS.accent },
  itemStateMarkPaused: { backgroundColor: COLORS.borderStrong },
  todayItemCopy: { flex: 1, minWidth: 0, gap: 1 },
  taskName: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, letterSpacing: -0.1 },
  taskMeta: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  itemAction: { width: tokens.hitTarget, height: tokens.hitTarget, alignItems: 'center', justifyContent: 'center' },
  playOptical: { transform: [{ translateX: 1 }] },
  itemActionPressed: { borderRadius: tokens.radius.pill, backgroundColor: COLORS.accentSoft },
  pausedMeta: { color: COLORS.muted },
  pressed: { opacity: 0.7 },
  sessionCard: { minHeight: 224, gap: 6, borderRadius: tokens.radius.card, backgroundColor: COLORS.accentSoft, paddingHorizontal: tokens.space.ml, paddingVertical: 18 },
  sessionCardPaused: { borderColor: COLORS.border, borderWidth: StyleSheet.hairlineWidth, backgroundColor: COLORS.surfaceSubtle },
  sessionStatus: { color: COLORS.accentStrong, fontFamily: FONTS.medium, fontSize: tokens.type.caption, lineHeight: 18 },
  sessionItem: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22 },
  sessionTimer: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.timer, lineHeight: 48, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  sessionTimerPaused: { color: COLORS.muted },
  sessionRemaining: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18, fontVariant: ['tabular-nums'] },
  sessionActions: { flexDirection: 'row', gap: tokens.space.xs },
  sessionAction: { flex: 1 },
  pausedStopAction: { borderWidth: 1, borderColor: COLORS.borderStrong },
  listAction: { minHeight: tokens.hitTarget, flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  listActionIcon: { width: 24, alignItems: 'center' },
  listActionLabel: { flex: 1, color: COLORS.accentStrong, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22 },
  metricHero: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space.xs, paddingVertical: tokens.space.sm },
  metricValue: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  metricRow: { minHeight: 62, flexDirection: 'row', gap: tokens.space.xs },
  metricColumn: { flex: 1, minHeight: 62, alignItems: 'flex-start', gap: 2, borderRadius: tokens.radius.small, backgroundColor: COLORS.surfaceSubtle, padding: 10 },
  metricLabel: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  metricColumnValue: { color: COLORS.text, fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22, fontVariant: ['tabular-nums'] },
  alignRight: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, borderBottomColor: COLORS.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: tokens.space.sm },
  ledgerAccount: { minHeight: 44, backgroundColor: COLORS.surface },
  ledgerItem: { minHeight: 56, backgroundColor: COLORS.surface },
  ledgerCopy: { flex: 1, gap: 1, paddingVertical: tokens.space.xs },
  ledgerTitle: { flex: 1, color: COLORS.text, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18 },
  ledgerTitleAccount: { fontFamily: FONTS.medium, fontSize: tokens.type.body, lineHeight: 22 },
  ledgerAccountTotal: { color: COLORS.accentStrong, fontFamily: FONTS.regular, fontSize: tokens.type.caption, lineHeight: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  ledgerMetric: { color: COLORS.muted, fontFamily: FONTS.regular, fontSize: tokens.type.label, lineHeight: 18, fontVariant: ['tabular-nums'] },
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
