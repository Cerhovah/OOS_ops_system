export const TIMER_RUNTIME_SETTING_PREFIX = 'timer_runtime:';

export type TimerRuntime =
  | {
      status: 'running';
      accumulatedMilliseconds: number;
      runningSince: string;
    }
  | {
      status: 'paused';
      accumulatedMilliseconds: number;
      pausedAt: string;
    };

export function timerRuntimeSettingKey(entryId: string): string {
  return `${TIMER_RUNTIME_SETTING_PREFIX}${entryId}`;
}

export function createTimerRuntime(now: string): TimerRuntime {
  return { status: 'running', accumulatedMilliseconds: 0, runningSince: now };
}

export function parseTimerRuntime(value: string | undefined, startedAt: string): TimerRuntime {
  if (value) {
    try {
      const candidate: unknown = JSON.parse(value);
      if (isTimerRuntime(candidate)) return candidate;
    } catch {
      // Old or incomplete local settings fall back to the entry timestamp.
    }
  }
  return createTimerRuntime(startedAt);
}

export function serializeTimerRuntime(runtime: TimerRuntime): string {
  return JSON.stringify(runtime);
}

export function timerElapsedMilliseconds(runtime: TimerRuntime, now: string): number {
  if (runtime.status === 'paused') return runtime.accumulatedMilliseconds;
  const running = new Date(now).getTime() - new Date(runtime.runningSince).getTime();
  return runtime.accumulatedMilliseconds + Math.max(0, running);
}

export function timerElapsedMinutes(runtime: TimerRuntime, now: string): number {
  return Math.max(0, Math.round(timerElapsedMilliseconds(runtime, now) / 60_000));
}

export function pauseTimerRuntime(runtime: TimerRuntime, now: string): TimerRuntime {
  if (runtime.status === 'paused') return runtime;
  return {
    status: 'paused',
    accumulatedMilliseconds: timerElapsedMilliseconds(runtime, now),
    pausedAt: now,
  };
}

export function resumeTimerRuntime(runtime: TimerRuntime, now: string): TimerRuntime {
  if (runtime.status === 'running') return runtime;
  return {
    status: 'running',
    accumulatedMilliseconds: runtime.accumulatedMilliseconds,
    runningSince: now,
  };
}

function isTimerRuntime(value: unknown): value is TimerRuntime {
  if (!isRecord(value)) return false;
  if (!isNonNegativeFiniteNumber(value.accumulatedMilliseconds)) return false;
  if (value.status === 'running') return isIsoDate(value.runningSince);
  if (value.status === 'paused') return isIsoDate(value.pausedAt);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}
