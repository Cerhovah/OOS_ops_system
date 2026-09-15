import { describe, expect, it } from 'vitest';

import {
  createTimerRuntime,
  parseTimerRuntime,
  pauseTimerRuntime,
  resumeTimerRuntime,
  serializeTimerRuntime,
  timerElapsedMilliseconds,
  timerElapsedMinutes,
  timerRuntimeSettingKey,
} from './timer-runtime';

describe('timer runtime', () => {
  it('tracks only active time across pause and resume', () => {
    const started = createTimerRuntime('2026-09-12T00:00:00.000Z');
    const paused = pauseTimerRuntime(started, '2026-09-12T00:12:30.000Z');
    const resumed = resumeTimerRuntime(paused, '2026-09-12T00:30:00.000Z');

    expect(timerElapsedMilliseconds(paused, '2026-09-12T00:25:00.000Z')).toBe(750_000);
    expect(timerElapsedMinutes(resumed, '2026-09-12T00:35:00.000Z')).toBe(18);
  });

  it('falls back to the entry start for absent or invalid legacy settings', () => {
    const startedAt = '2026-09-12T00:00:00.000Z';
    expect(parseTimerRuntime(undefined, startedAt)).toEqual(createTimerRuntime(startedAt));
    expect(parseTimerRuntime('{broken', startedAt)).toEqual(createTimerRuntime(startedAt));
  });

  it('round-trips a paused state under a local-only setting key', () => {
    const runtime = pauseTimerRuntime(createTimerRuntime('2026-09-12T00:00:00.000Z'), '2026-09-12T00:01:00.000Z');
    expect(parseTimerRuntime(serializeTimerRuntime(runtime), '2020-01-01T00:00:00.000Z')).toEqual(runtime);
    expect(timerRuntimeSettingKey('entry-1')).toBe('timer_runtime:entry-1');
  });

  it('accepts both valid states and rejects malformed persisted shapes', () => {
    const startedAt = '2026-09-12T00:00:00.000Z';
    const running = createTimerRuntime(startedAt);
    const paused = pauseTimerRuntime(running, '2026-09-12T00:01:00.000Z');

    expect(parseTimerRuntime(serializeTimerRuntime(running), startedAt)).toEqual(running);
    expect(parseTimerRuntime(serializeTimerRuntime(paused), startedAt)).toEqual(paused);
    for (const malformed of [
      'null',
      '{}',
      '{"status":"unknown","accumulatedMilliseconds":0}',
      '{"status":"running","accumulatedMilliseconds":-1,"runningSince":"2026-09-12T00:00:00.000Z"}',
      '{"status":"running","accumulatedMilliseconds":0,"runningSince":"not-a-date"}',
      '{"status":"paused","accumulatedMilliseconds":0,"pausedAt":7}',
    ]) {
      expect(parseTimerRuntime(malformed, startedAt)).toEqual(running);
    }
  });

  it('keeps repeated state transitions stable and ignores a backwards clock', () => {
    const running = createTimerRuntime('2026-09-12T00:01:00.000Z');
    const paused = pauseTimerRuntime(running, '2026-09-12T00:00:00.000Z');

    expect(paused.accumulatedMilliseconds).toBe(0);
    expect(pauseTimerRuntime(paused, '2026-09-12T00:02:00.000Z')).toBe(paused);
    expect(resumeTimerRuntime(running, '2026-09-12T00:02:00.000Z')).toBe(running);
  });
});
