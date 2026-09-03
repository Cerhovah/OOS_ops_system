import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_MODE_LABELS,
  ANALYSIS_MODE_QUESTIONS,
  ANALYSIS_EXAMPLE_QUESTIONS,
  ANALYSIS_SYSTEM_PROMPT,
  parseAnalysisResponse,
  serializeAnalysisOutput,
} from './prompt';

describe('Phase 4 analysis prompt and response parser', () => {
  it('keeps all six modes and the fixed sovereignty rules in code', () => {
    expect(Object.keys(ANALYSIS_MODE_LABELS)).toEqual([
      'audit', 'pattern', 'project', 'optimize', 'longterm', 'free',
    ]);
    expect(ANALYSIS_EXAMPLE_QUESTIONS).toHaveLength(4);
    expect(ANALYSIS_MODE_QUESTIONS.audit).toContain('계획과 실제 차이');
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('첨부된 데이터');
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('결정권이 사용자');
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('proposals에만');
    expect(ANALYSIS_SYSTEM_PROMPT).toContain('성향, 심리, 동기 또는 위험을 서술');
  });

  it('parses a structured plan proposal without applying it', () => {
    const result = parseAnalysisResponse(JSON.stringify({
      answer: '최근 4주 실제 합계는 1200분입니다. 다음 주 계획은 두 선택지를 비교할 수 있습니다.',
      numbers_used: [{ label: '전체 실제', value: 1200, unit: '분', period: '2026-08-03~2026-08-30' }],
      proposals: [{
        kind: 'plan_change',
        payload: {
          week_start: '2026-09-07',
          minutes_by_account: [
            { account_id: 'account-a', planned_minutes: 600 },
            { account_id: 'account-b', planned_minutes: 500 },
          ],
          note: '선택지 A',
        },
        rationale: '실제 합계와 다음 주 고정 일정을 함께 반영한 계획안입니다.',
      }],
    }));

    expect(result.structured).toBe(true);
    expect(result.numbersUsed[0]).toMatchObject({ value: 1200, unit: '분' });
    expect(result.proposals[0].payload).toEqual({
      weekStart: '2026-09-07',
      minutesByAccount: { 'account-a': 600, 'account-b': 500 },
      note: '선택지 A',
    });
    expect(parseAnalysisResponse(serializeAnalysisOutput(result))).toEqual(result);
  });

  it('shows safe unstructured text without proposals', () => {
    expect(parseAnalysisResponse('데이터가 부족합니다.').structured).toBe(false);
    expect(parseAnalysisResponse('데이터가 부족합니다.').proposals).toEqual([]);
  });

  it('does not display output containing prohibited user descriptions', () => {
    const result = parseAnalysisResponse('{"answer":"사용자는 계획을 지키는 경향이 있어요","numbers_used":[],"proposals":[]}');
    expect(result.answer).toBe('응답이 고정 문구 규칙을 통과하지 못해 표시하지 않았습니다.');
    expect(result.proposals).toEqual([]);
    expect(result.warning).toContain('사용자 서술');
  });

  it('detects prohibited descriptions after JSON escape decoding without blocking factual trend words', () => {
    const escaped = parseAnalysisResponse('{"answer":"\\uc0ac\\uc6a9\\uc790\\ub294 \\uacc4\\ud68d\\uc744 \\uc9c0\\ud0a4\\ub294 \\uacbd\\ud5a5\\uc774 \\uc788\\uc5b4\\uc694","numbers_used":[],"proposals":[]}');
    expect(escaped.proposals).toEqual([]);
    expect(escaped.warning).toContain('사용자 서술');

    const factual = parseAnalysisResponse('{"answer":"매출의 주별 증가 경향이 데이터에 있습니다.","numbers_used":[],"proposals":[]}');
    expect(factual.structured).toBe(true);
  });

  it('rejects malformed or duplicate plan lines', () => {
    const result = parseAnalysisResponse(JSON.stringify({
      answer: '계획안입니다.',
      numbers_used: [],
      proposals: [{
        kind: 'plan_change',
        payload: {
          week_start: '2026-09-07',
          minutes_by_account: [
            { account_id: 'account-a', planned_minutes: 60 },
            { account_id: 'account-a', planned_minutes: 90 },
          ],
          note: null,
        },
        rationale: '중복 행',
      }],
    }));
    expect(result.structured).toBe(false);
    expect(result.proposals).toEqual([]);
  });
});
