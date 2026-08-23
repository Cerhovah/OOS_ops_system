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
    expect(accountSeeds.map((seed) => seed[5] / 60)).toEqual([49, 4, 9, 13, 4, 15, 24, 15, 13, 2, 4, 6, 4, 6]);
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
    expect(kpiSeeds.map((seed) => seed[3])).toEqual([
      '문제풀이 세트',
      '오답 재풀이율',
      '모의점수',
      '배포됨',
      '고유 사용자',
      '재방문 사용자',
      '유료 사용자',
      '매출',
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-study')?.slice(4, 10)).toEqual([
      'time', null, 120, 240, 270, 60,
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-exercise')?.slice(4, 11)).toEqual([
      'time', null, null, 60, 90, 60, 1,
    ]);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-payment')?.slice(4, 6)).toEqual(['event', 'KRW']);
    expect(itemSeeds.find((seed) => seed[0] === 'seed-item-weight')?.slice(4, 6)).toEqual(['numeric', 'kg']);
  });

  it('uses the specified Monday/Tuesday and commute weekday masks without duplicates', () => {
    expect(new Set(scheduleSeeds.map((seed) => seed[1])).size).toBe(scheduleSeeds.length);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-codyssey')?.[2]).toBe(0b0000011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-commute')?.[2]).toBe(0b0011011);
    expect(scheduleSeeds.find((seed) => seed[1] === 'seed-item-required')?.[2]).toBe(0b0111111);
  });
});
