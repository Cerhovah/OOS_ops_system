import {
  APP_NAME,
  DEFAULT_CLOSE_NOTIFICATION_TIME,
  DEFAULT_DAY_END_TIME,
  DEFAULT_WEEK_START_DAY,
} from '@/constants/app';

export const SEED_TIME = '2026-08-20T00:00:00.000+09:00';

export const accountSeeds = [
  ['seed-account-sleep', '수면', '#526D82', '기반', 0, 49 * 60],
  ['seed-account-morning', '기상 후 준비', '#7D8F69', '기반', 1, 4 * 60],
  ['seed-account-required', '필수 블록(월~토 1.5h)', '#8A6F4D', '기반', 2, 9 * 60],
  ['seed-account-life', '식사·세면·기본생활', '#B08B57', '기반', 3, 13 * 60],
  ['seed-account-exercise', '운동', '#3E7C59', '건강', 4, 4 * 60],
  ['seed-account-commute', '통학(양주↔개포)', '#6B728E', '이동', 5, 15 * 60],
  ['seed-account-transfer', '편입 학업', '#2457D6', '학업', 6, 24 * 60],
  ['seed-account-codyssey', '코디세이', '#5D4E8C', '학업', 7, 15 * 60],
  ['seed-account-product', '개인제품·창업·시장검증', '#9B4D32', '제품', 8, 13 * 60],
  ['seed-account-career', 'AI·진로 옵션관리', '#46647A', '진로', 9, 2 * 60],
  ['seed-account-social', '봉사·사회접촉', '#8C5A72', '사회', 10, 4 * 60],
  ['seed-account-leisure', '유한 여가', '#3D7B80', '여가', 11, 6 * 60],
  ['seed-account-landing', '착륙·저자극 전환', '#697A5D', '기반', 12, 4 * 60],
  ['seed-account-buffer', '미예약 버퍼', '#767676', '버퍼', 13, 6 * 60],
] as const;

export const projectSeeds = [
  ['seed-project-transfer', '2027 편입', '편입 준비 결과물', null, null],
  ['seed-project-product', 'AI 제품 실험', '제품·시장 검증 결과물', '첫 사용자 흐름 검증', null],
] as const;

export const itemSeeds = [
  ['seed-item-study', 'seed-account-transfer', 'seed-project-transfer', '편입 공부', 'time', null, 120, 240, 270, 60, 0, 0],
  ['seed-item-exercise', 'seed-account-exercise', null, '운동', 'time', null, null, 60, 90, 60, 1, 1],
  ['seed-item-codyssey', 'seed-account-codyssey', null, '코디세이 미션', 'completion', null, null, 1, null, null, 0, 2],
  ['seed-item-commute', 'seed-account-commute', null, '통학', 'time', null, null, 225, null, 225, 0, 3],
  ['seed-item-required', 'seed-account-required', null, '필수 일정', 'time', null, null, 90, null, 90, 0, 4],
  ['seed-item-product', 'seed-account-product', 'seed-project-product', '개인 프로젝트', 'time', null, null, 120, null, 60, 0, 5],
  ['seed-item-payment', 'seed-account-product', 'seed-project-product', '유료 결제', 'event', 'KRW', null, null, null, null, 0, 6],
  ['seed-item-weight', 'seed-account-life', null, '체중', 'numeric', 'kg', null, null, null, null, 0, 7],
] as const;

export const scheduleSeeds = [
  ['seed-schedule-codyssey', 'seed-item-codyssey', (1 << 0) | (1 << 1), 1],
  ['seed-schedule-commute', 'seed-item-commute', (1 << 0) | (1 << 1) | (1 << 3) | (1 << 4), 225],
  ['seed-schedule-required', 'seed-item-required', 0b0111111, 90],
] as const;

export const kpiSeeds = [
  ['seed-kpi-study-set', 'seed-project-transfer', 'custom:problem_sets', '문제풀이 세트', '세트', 'sum', 0],
  ['seed-kpi-review-rate', 'seed-project-transfer', 'custom:review_rate', '오답 재풀이율', '%', 'last', 1],
  ['seed-kpi-mock-score', 'seed-project-transfer', 'custom:mock_score', '모의점수', '점', 'last', 2],
  ['seed-kpi-deploys', 'seed-project-product', 'deploys', '배포됨', '회', 'sum', 0],
  ['seed-kpi-users', 'seed-project-product', 'unique_users', '고유 사용자', '명', 'last', 1],
  ['seed-kpi-returning', 'seed-project-product', 'returning_users', '재방문 사용자', '명', 'last', 2],
  ['seed-kpi-payments', 'seed-project-product', 'payments', '유료 사용자', '명', 'last', 3],
  ['seed-kpi-revenue', 'seed-project-product', 'revenue', '매출', 'KRW', 'sum', 4],
] as const;

export const settingSeeds = [
  ['week_start_day', String(DEFAULT_WEEK_START_DAY)],
  ['day_end_time', DEFAULT_DAY_END_TIME],
  ['close_notification_time', DEFAULT_CLOSE_NOTIFICATION_TIME],
  ['close_notification_enabled', '1'],
  ['notification_always', '0'],
  ['notification_permission_requested', '0'],
  ['timer_limit_notifications_enabled', '0'],
  ['analysis_range_weeks', '4'],
  ['analysis_include_notes', '1'],
  ['ai_provider', 'openai'],
  ['ai_model', 'gpt-5.6-terra'],
  ['app_name', APP_NAME],
  ['time_zone', 'Asia/Seoul'],
] as const;
