import { getSupabaseClient } from '@/services/supabase';

export interface TelegramConnectionSettings {
  userId: string;
  allowedChatId: number;
  botUsername: string;
  notificationTime: string;
  timeZone: string;
  enabled: boolean;
  connectedAt: string;
  updatedAt: string;
}

interface TelegramSettingsCandidate {
  user_id?: unknown;
  allowed_chat_id?: unknown;
  bot_username?: unknown;
  notification_time?: unknown;
  time_zone?: unknown;
  enabled?: unknown;
  connected_at?: unknown;
  updated_at?: unknown;
}

function parseTelegramSettings(value: unknown): TelegramConnectionSettings | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as TelegramSettingsCandidate;
  if (
    typeof row.user_id !== 'string' || typeof row.allowed_chat_id !== 'number' ||
    typeof row.bot_username !== 'string' || typeof row.notification_time !== 'string' ||
    typeof row.time_zone !== 'string' || typeof row.enabled !== 'boolean' ||
    typeof row.connected_at !== 'string' || typeof row.updated_at !== 'string'
  ) return null;
  return {
    userId: row.user_id,
    allowedChatId: row.allowed_chat_id,
    botUsername: row.bot_username,
    notificationTime: row.notification_time.slice(0, 5),
    timeZone: row.time_zone,
    enabled: row.enabled,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTelegramSettings(userId: string): Promise<TelegramConnectionSettings | null> {
  const { data, error } = await getSupabaseClient()
    .from('telegram_settings')
    .select('user_id,allowed_chat_id,bot_username,notification_time,time_zone,enabled,connected_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return parseTelegramSettings(data as unknown);
}

export async function saveTelegramSettings(
  userId: string,
  notificationTime: string,
  enabled: boolean,
): Promise<TelegramConnectionSettings> {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) {
    throw new Error('Telegram 발송 시각은 HH:MM 형식이어야 합니다.');
  }
  const { data, error } = await getSupabaseClient()
    .from('telegram_settings')
    .update({ notification_time: `${notificationTime}:00`, enabled })
    .eq('user_id', userId)
    .select('user_id,allowed_chat_id,bot_username,notification_time,time_zone,enabled,connected_at,updated_at')
    .single();
  if (error) throw error;
  const parsed = parseTelegramSettings(data as unknown);
  if (!parsed) throw new Error('Telegram 설정 응답 형식이 올바르지 않습니다.');
  return parsed;
}
