function minutesOf(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function timeParts(value: string): { hour: number; minute: number } {
  const total = minutesOf(value);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function setTimeHour(value: string, hour: number): string {
  return formatTime(hour * 60 + timeParts(value).minute);
}

export function setTimeMinute(value: string, minute: number): string {
  return formatTime(timeParts(value).hour * 60 + minute);
}

export function adjustTime(value: string, deltaMinutes: number): string {
  return formatTime(minutesOf(value) + deltaMinutes);
}
