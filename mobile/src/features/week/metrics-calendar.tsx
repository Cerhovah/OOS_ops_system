import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';

import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

import { holidayName } from './holidays';

LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

interface MetricsCalendarProps {
  selectedDate: string;
  recordDates: ReadonlySet<string>;
  weekStartDay: number;
  onSelectDate: (date: string) => void;
}

export function MetricsCalendar({ selectedDate, recordDates, weekStartDay, onSelectDate }: MetricsCalendarProps) {
  const currentMonth = selectedDate.slice(0, 7);
  const firstDay = (weekStartDay + 1) % 7;
  const calendarKey = `${currentMonth}:${firstDay}`;
  const dayComponent = useMemo(() => function DayCell({ date, state }: { date?: DateData; state?: string }) {
    if (!date) return <View style={styles.dayCell} />;
    const holiday = holidayName(date.dateString);
    const selected = date.dateString === selectedDate;
    const disabled = state === 'disabled';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${date.dateString}${holiday ? `, ${holiday}` : ''}${recordDates.has(date.dateString) ? ', 기록 있음' : ''}`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => onSelectDate(date.dateString)}
        style={[styles.dayCell, selected && styles.selectedDay]}>
        <Text style={[styles.dayNumber, holiday && styles.holiday, disabled && styles.disabled, selected && styles.selectedText]}>{date.day}</Text>
        {holiday ? <Text numberOfLines={1} style={[styles.holidayName, selected && styles.selectedText]}>{holiday}</Text> : <View style={styles.holidaySpace} />}
        <View style={[styles.dot, recordDates.has(date.dateString) && styles.recordDot]} />
      </Pressable>
    );
  }, [onSelectDate, recordDates, selectedDate]);

  return (
    <Calendar
      key={calendarKey}
      current={`${currentMonth}-01`}
      firstDay={firstDay}
      hideExtraDays
      enableSwipeMonths
      dayComponent={dayComponent}
      onDayPress={(day) => onSelectDate(day.dateString)}
      theme={{
        calendarBackground: COLORS.surface,
        monthTextColor: COLORS.text,
        textSectionTitleColor: COLORS.muted,
        arrowColor: COLORS.accent,
        textMonthFontWeight: '700',
        textDayHeaderFontWeight: '600',
      }}
      style={styles.calendar}
    />
  );
}

const styles = StyleSheet.create({
  calendar: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  dayCell: { width: 43, minHeight: 54, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 5, borderRadius: tokens.radius.control },
  selectedDay: { backgroundColor: COLORS.accent },
  dayNumber: { color: COLORS.text, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  selectedText: { color: COLORS.inverse },
  holiday: { color: COLORS.danger },
  disabled: { color: COLORS.muted, opacity: 0.35 },
  holidayName: { color: COLORS.danger, fontSize: 8, maxWidth: 39, marginTop: 2 },
  holidaySpace: { height: 12 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
  recordDot: { backgroundColor: COLORS.accent },
});
