import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, Sheet, textStyles } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { formatMinutes } from '@/domain/calculations';
import { tokens } from '@/theme/tokens';
import type { Entry, Item } from '@/types/domain';

export interface TaskSheetItem {
  item: Item;
  plannedValue: number | null;
}

export function TaskSheet({
  visible,
  items,
  onClose,
  onItemPress,
  onAddItem,
  onManualRecord,
}: {
  visible: boolean;
  items: readonly TaskSheetItem[];
  onClose: () => void;
  onItemPress: (item: Item) => void;
  onAddItem: () => void;
  onManualRecord: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      title="오늘 어떤 일을 할까요?"
      onClose={onClose}
      footer={(
        <>
          <View style={styles.footerItem}>
            <AppButton label="할일 추가" variant="secondary" onPress={onAddItem} />
          </View>
          <View style={styles.footerItem}>
            <AppButton label="직접 기록" onPress={onManualRecord} />
          </View>
        </>
      )}>
      <Text style={textStyles.muted}>시간형 항목은 누르면 바로 시작합니다.</Text>
      {items.length === 0 ? <Text style={textStyles.body}>오늘 할일이 없습니다.</Text> : null}
      {items.map(({ item, plannedValue }) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${taskActionLabel(item)}, ${plannedValue === null ? '계획 없음' : `계획 ${plannedValue}${taskUnit(item)}`}`}
          onPress={() => onItemPress(item)}
          style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}>
          <Text style={styles.taskName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.taskMeta}>
            <Text style={styles.taskPlan}>{plannedValue === null ? '계획 없음' : `${plannedValue}${taskUnit(item)}`}</Text>
            <Text style={styles.taskAction}>{taskActionLabel(item)}</Text>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

export function TimerView({
  entry,
  item,
  onStop,
  onOpenTasks,
  busy,
}: {
  entry: Entry;
  item: Item;
  onStop: () => void;
  onOpenTasks: () => void;
  busy: boolean;
}) {
  const elapsed = useElapsedMilliseconds(entry.startedAt);
  return (
    <View style={styles.timerWrap}>
      <Text accessibilityRole="header" style={styles.timerItem}>{item.name}</Text>
      <Text style={textStyles.muted}>경과 시간</Text>
      <Text accessibilityLabel={`경과 시간 ${formatTimer(elapsed)}`} style={styles.timerValue}>{formatTimer(elapsed)}</Text>
      <AppButton label="종료하고 기록" onPress={onStop} disabled={busy} style={styles.timerAction} />
      <AppButton label="오늘의 할일 확인" variant="plain" onPress={onOpenTasks} />
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

function taskUnit(item: Item): string {
  if (item.type === 'time') return '분';
  if (item.type === 'completion' || item.type === 'count') return '회';
  return item.unit ?? '값';
}

function MetricColumn({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricColumn}>
      <Text style={textStyles.muted}>{label}</Text>
      <Text style={styles.metricColumnValue}>{value}</Text>
    </View>
  );
}

function useElapsedMilliseconds(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, now - new Date(startedAt).getTime());
}

function formatTimer(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  footerItem: { flex: 1 },
  taskRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.sm, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  taskName: { flex: 1, color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700', lineHeight: 23 },
  taskMeta: { alignItems: 'flex-end', gap: tokens.space.xxs },
  taskPlan: { color: COLORS.text, fontSize: tokens.type.caption, fontWeight: '700', fontVariant: ['tabular-nums'] },
  taskAction: { color: COLORS.muted, fontSize: 12 },
  pressed: { opacity: 0.7 },
  timerWrap: { alignItems: 'center', gap: tokens.space.md, paddingTop: 80, paddingBottom: tokens.space.xl },
  timerItem: { color: COLORS.text, fontSize: tokens.type.title, fontWeight: '800', textAlign: 'center' },
  timerValue: { color: COLORS.text, fontSize: tokens.type.timer, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2 },
  timerAction: { alignSelf: 'stretch', marginTop: tokens.space.lg },
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
