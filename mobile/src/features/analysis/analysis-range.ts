import { addDays, weekRange } from '@/domain/calculations';

export function completedAnalysisRange(
  today: string,
  weekStartDay: number,
  weeks: number,
): { start: string; end: string } {
  const safeWeeks = Number.isInteger(weeks) && weeks > 0 ? weeks : 4;
  const currentWeekStart = weekRange(today, weekStartDay).start;
  const end = addDays(currentWeekStart, -1);
  return { start: addDays(end, -(safeWeeks * 7) + 1), end };
}
