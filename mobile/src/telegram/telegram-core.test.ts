import { describe, expect, it } from 'vitest';

import {
  findTelegramItem,
  formatMinutes,
  formatProposal,
  parseDurationMinutes,
  parseFreeTextActions,
  parseTelegramCallback,
  parseTelegramInput,
  type TelegramItem,
} from '../../../supabase/functions/_shared/telegram-core';

const items: TelegramItem[] = [
  { id: 'study', accountId: 'school', name: '편입 공부', type: 'time', unit: null, countOnComplete: false },
  { id: 'exercise', accountId: 'health', name: '운동', type: 'time', unit: null, countOnComplete: true },
  { id: 'mission', accountId: 'code', name: '코디세이 미션', type: 'completion', unit: null, countOnComplete: false },
  { id: 'pushup', accountId: 'health', name: '푸시업', type: 'count', unit: '회', countOnComplete: false },
  { id: 'weight', accountId: 'health', name: '체중', type: 'numeric', unit: 'kg', countOnComplete: false },
];

describe('Telegram Phase 3 core', () => {
  it('parses exact commands without confirmation', () => {
    expect(parseTelegramInput('/study 90')).toEqual({ kind: 'command', command: { kind: 'study', minutes: 90 } });
    expect(parseTelegramInput('/log 편입 공부 80')).toEqual({
      kind: 'command', command: { kind: 'log', itemQuery: '편입 공부', minutes: 80 },
    });
    expect(parseTelegramInput('/done@oos_bot 코디세이 미션')).toEqual({
      kind: 'command', command: { kind: 'done', itemQuery: '코디세이 미션' },
    });
    expect(parseTelegramInput('/count 푸시업')).toEqual({
      kind: 'command', command: { kind: 'count', itemQuery: '푸시업' },
    });
  });

  it('returns factual format help for incomplete commands', () => {
    expect(parseTelegramInput('/study ninety')).toMatchObject({ kind: 'invalid-command' });
    expect(parseTelegramInput('/log 편입')).toMatchObject({ kind: 'invalid-command' });
    expect(parseTelegramInput('/unknown')).toMatchObject({ kind: 'invalid-command' });
  });

  it('keeps non-command text on the confirmation path', () => {
    expect(parseTelegramInput('편입 90분')).toEqual({ kind: 'free-text', text: '편입 90분' });
  });

  it('parses numeric and Korean-word durations', () => {
    expect(parseDurationMinutes('1시간 20분')).toBe(80);
    expect(parseDurationMinutes('세 시간 반 정도')).toBe(210);
    expect(parseDurationMinutes('90분')).toBe(90);
    expect(parseDurationMinutes('시간 없음')).toBeNull();
  });

  it('matches a unique item and rejects ambiguity', () => {
    expect(findTelegramItem(items, '편입')?.id).toBe('study');
    expect(findTelegramItem([...items, { ...items[0], id: 'study-2', name: '편입 수학' }], '편입')).toBeNull();
  });

  it('structures multiple free-text entries but does not apply them', () => {
    const actions = parseFreeTextActions('오늘 편입 세 시간 반 했고 코디세이 완료', items);
    expect(actions).toMatchObject([
      { itemId: 'study', operation: 'duration', amount: 210 },
      { itemId: 'mission', operation: 'completion', amount: 1 },
    ]);
    expect(formatProposal(actions)).toContain('확인하면 기록합니다.');
  });

  it('supports count-on-complete, count, and numeric free text', () => {
    expect(parseFreeTextActions('운동 완료', items)[0]).toMatchObject({
      itemId: 'exercise', operation: 'completion', amount: 1,
    });
    expect(parseFreeTextActions('푸시업 12회', items)[0]).toMatchObject({
      itemId: 'pushup', operation: 'count', amount: 12,
    });
    expect(parseFreeTextActions('체중 71.4kg', items)[0]).toMatchObject({
      itemId: 'weight', operation: 'value', amount: 71.4,
    });
  });

  it('formats positive and negative minute differences exactly', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(-90)).toBe('-1h 30m');
    expect(formatMinutes(0)).toBe('0m');
  });

  it('accepts only bounded callback shapes', () => {
    expect(parseTelegramCallback('close:2026-09-03')).toEqual({ kind: 'close', localDate: '2026-09-03' });
    expect(parseTelegramCallback('confirm:123e4567-e89b-12d3-a456-426614174000')).toEqual({
      kind: 'confirm', proposalId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(parseTelegramCallback('close:tomorrow')).toBeNull();
    expect(parseTelegramCallback('confirm:not-an-id')).toBeNull();
  });
});
