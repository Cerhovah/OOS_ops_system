import { describe, expect, it } from 'vitest';

import { accountSeeds, itemSeeds, kpiSeeds, projectSeeds, scheduleSeeds } from './migrations';

describe('Phase 1 seed manifest', () => {
  it('contains the exact 14-account 168-hour allocation from SPEC 4.4', () => {
    expect(accountSeeds.map((seed) => seed[1])).toEqual([
      '수면',
      '기상 후 준비',
      '필수 블록(월~토 1.5h)',
      '식사·세면·기본생활',
      '운동',
      '통학(양주↔개포)',
      '편입 학업',
      '코디세이',
      '개인제품·창업·시장검증',
      'AI·진로 옵션관리',
      '봉사·사회접촉',
      '유한 여가',
      '착륙·저자극 전환',
      '미예약 버퍼',
    ]);
    expect(accountSeeds.reduce((total, seed) => total + seed[5], 0)).toBe(168 * 60);
  });

  it('contains every specified item and both projects with their KPI seeds', () => {
    expect(itemSeeds.map((seed) => seed[3])).toEqual([
      '편입 공부',
      '운동',
      '코디세이 미션',
      '통학',
      '필수 일정',
      '개인 프로젝트',
      '유료 결제',
      '체중',
    ]);
    expect(projectSeeds.map((seed) => seed[1])).toEqual(['2027 편입', 'AI 제품 실험']);
    expect(kpiSeeds.length).toBe(8);
  });

  it('uses the specified Monday/Tuesday and commute weekday masks without duplicates', () => {
    expect(new Set(scheduleSeeds.map((seed) => seed[1])).size).toBe(scheduleSeeds.length);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-codyssey')?.[2]).toBe(0b0000011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-commute')?.[2]).toBe(0b0011011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-required')?.[2]).toBe(0b0111111);
  });
});
