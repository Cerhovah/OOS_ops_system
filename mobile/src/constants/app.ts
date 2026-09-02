export const APP_NAME = 'OOS Ops';
export const APP_TIME_ZONE = 'Asia/Seoul';
export const DEFAULT_WEEK_START_DAY = 0;
export const DEFAULT_DAY_END_TIME = '23:00';
export const DEFAULT_CLOSE_NOTIFICATION_TIME = '21:30';
export const WEEKLY_MINUTES = 168 * 60;
export const DATABASE_NAME = 'oos-ops.db';
export const NOTIFICATION_CHANNEL_ID = 'daily-records-v2';
export const NOTIFICATION_CATEGORY_ID = 'daily_close';
export const NOTIFICATION_ACTION_ID = 'open_close';
export const NOTIFICATION_ROUTE = '/today/close';

export const COLORS = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#17202A',
  muted: '#607080',
  border: '#D9DEE5',
  accent: '#2457D6',
  accentSoft: '#E9EEFC',
  warning: '#8A5300',
  warningSoft: '#FFF2D8',
  danger: '#9A2E2E',
  dangerSoft: '#FDECEC',
} as const;
