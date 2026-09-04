import { describe, expect, it } from 'vitest';

import {
  ANALYSIS_MODE_LABELS,
  ANALYSIS_MODE_QUESTIONS,
  ANALYSIS_EXAMPLE_QUESTIONS,
  ANALYSIS_SYSTEM_PROMPT,
  isAnalysisProseAllowed,
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

  it('checks every user-visible number label, unit, and period for prohibited descriptions', () => {
    for (const field of ['label', 'unit', 'period'] as const) {
      const number = { label: '실제', value: 120, unit: '분', period: '이번 주' };
      number[field] = '사용자의 성향은 고정됨';
      const result = parseAnalysisResponse(JSON.stringify({
        answer: '실제 120분입니다.',
        numbers_used: [number],
        proposals: [],
      }));
      expect(result.numbersUsed).toEqual([]);
      expect(result.warning).toContain('사용자 서술');
    }
  });

  it('detects prohibited descriptions after JSON escape decoding without blocking factual trend words', () => {
    const escaped = parseAnalysisResponse('{"answer":"\\uc0ac\\uc6a9\\uc790\\ub294 \\uacc4\\ud68d\\uc744 \\uc9c0\\ud0a4\\ub294 \\uacbd\\ud5a5\\uc774 \\uc788\\uc5b4\\uc694","numbers_used":[],"proposals":[]}');
    expect(escaped.proposals).toEqual([]);
    expect(escaped.warning).toContain('사용자 서술');

    for (const answer of [
      '매출의 주별 증가 경향이 데이터에 있습니다.',
      '최근 4주 화요일 실제 시간이 높은 경향이 있어요.',
      '낙관적 시나리오 A는 제품 계정 900분을 제안합니다.',
      '두 선택지 중 수면 49시간 유지안을 선호하면 A안을 고를 수 있습니다.',
      'Revenue has an upward tendency over 4 weeks.',
      'The project is resilient to a one-week delay.',
    ]) {
      expect(parseAnalysisResponse(JSON.stringify({ answer, numbers_used: [], proposals: [] })).structured).toBe(true);
    }
  });

  it.each([
    '사용자는 충동적입니다.',
    '사용자는 3시간만 기록한 충동적인 사람입니다.',
    '데이터상 사용자는 3회 이후 낙관적입니다.',
    '유료 사용자는 3명이고 충동적입니다.',
    '활성 사용자는 3명이며 낙관적입니다.',
    '이용자는 충동적입니다.',
    '기록자는 낙관적입니다.',
    '분석 대상은 의욕이 없습니다.',
    'This person is impulsive.',
    '계획을 자주 바꾸는 경향이 있습니다.',
    '사용자님은 충동적입니다.',
    '사용자께서는 충동적입니다.',
    '사용자 또한 낙관적입니다.',
    '**사용자**는 충동적입니다.',
    'This user is impulsive.',
    'User is impulsive.',
    '유료 사용자는 3명입니다. 충동적입니다.',
    '계획보다 즉흥적인 선택을 선호합니다.',
    '쉽게 포기합니다.',
    '결정을 자주 미룹니다.',
    'They are adaptable under pressure.',
    '유료 사용자는 3명입니다. 쉽게 포기합니다.',
    '사용자는 참을성이 부족합니다.',
    '사용자는 낙관적입니다.',
    '분석 결과, 사용자는 융통성이 큽니다.',
    '데이터를 종합하면 사용자는 융통성이 큽니다.',
    '당신은 의욕이 없습니다.',
    '계획적인 사람입니다.',
    'You are an impulsive person.',
    'The user is unusually resilient.',
    'Data indicate the user is unusually resilient.',
  ])('fails closed for a personal description outside the original phrase list: %s', (answer) => {
    const result = parseAnalysisResponse(JSON.stringify({ answer, numbers_used: [], proposals: [] }));
    expect(result.structured).toBe(false);
    expect(result.warning).toContain('사용자 서술');
  });

  it('still allows factual customer metrics and project risk statements', () => {
    for (const answer of [
      '유료 사용자는 3명입니다. 프로젝트 위험 항목은 2건입니다.',
      '유료 사용자는 총 3명입니다.',
      '활성 사용자는 3명으로 집계됩니다.',
      '유료 사용자는 3명이고 무료 사용자는 5명입니다.',
      '유료 사용자는 3명 증가했습니다.',
    ]) {
      const result = parseAnalysisResponse(JSON.stringify({ answer, numbers_used: [], proposals: [] }));
      expect(result.structured).toBe(true);
    }
  });

  it('exposes the same fail-closed prose check for persisted proposal boundaries', () => {
    expect(isAnalysisProseAllowed('계정별 계획 합계를 제안합니다.')).toBe(true);
    expect(isAnalysisProseAllowed('사용자는 충동적입니다.')).toBe(false);
    expect(isAnalysisProseAllowed('   사용자는 충동적입니다.')).toBe(false);
    expect(isAnalysisProseAllowed('당신은 의욕이 없습니다.')).toBe(false);
  });

  it('checks answer, proposal rationale and proposal note as separate trust boundaries', () => {
    const result = parseAnalysisResponse(JSON.stringify({
      answer: '최근 4주 실제 합계는 1200분입니다.',
      numbers_used: [],
      proposals: [{
        kind: 'plan_change',
        payload: {
          week_start: '2026-09-07',
          minutes_by_account: [{ account_id: 'account-a', planned_minutes: 600 }],
          note: '결정을 자주 미룹니다.',
        },
        rationale: '쉽게 포기합니다.',
      }],
    }));

    expect(result.structured).toBe(false);
    expect(result.proposals).toEqual([]);
    expect(result.warning).toContain('사용자 서술');
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
