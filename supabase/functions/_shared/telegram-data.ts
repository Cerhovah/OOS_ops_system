import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4';

import {
  findTelegramItem,
  formatMinutes,
  type ProposedEntryAction,
  type TelegramItem,
  type TelegramItemType,
} from './telegram-core.ts';

export interface TelegramSettings {
  userId: string;
  chatId: number;
  botUsername: string;
  notificationTime: string;
  timeZone: string;
  enabled: boolean;
}

interface SyncRecord {
  tableName: string;
  localId: string;
  payload: Record<string, unknown>;
  deletedAt: string | null;
}

interface UserData {
  records: SyncRecord[];
  items: TelegramItem[];
}

interface LocalClock {
  date: string;
  hour: number;
  minute: number;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parseSettingsRow(value: unknown): TelegramSettings | null {
  const row = asObject(value);
  const userId = text(row?.user_id);
  const chatId = numberValue(row?.allowed_chat_id);
  const botUsername = text(row?.bot_username);
  const notificationTime = text(row?.notification_time);
  const timeZone = text(row?.time_zone);
  const enabled = booleanValue(row?.enabled);
  if (!userId || chatId === null || !botUsername || !notificationTime || !timeZone || enabled === null) return null;
  return { userId, chatId, botUsername, notificationTime, timeZone, enabled };
}

function parseSyncRecords(value: unknown): SyncRecord[] {
  return asArray(value).flatMap((candidate) => {
    const row = asObject(candidate);
    const tableName = text(row?.table_name);
    const localId = text(row?.local_id);
    const payload = asObject(row?.payload);
    const deletedAt = row?.deleted_at === null ? null : text(row?.deleted_at);
    if (!tableName || !localId || !payload || (row?.deleted_at !== null && deletedAt === null)) return [];
    return [{ tableName, localId, payload, deletedAt }];
  });
}

function itemFromRecord(record: SyncRecord): TelegramItem | null {
  if (record.tableName !== 'items' || record.deletedAt !== null || record.payload.deleted_at !== null) return null;
  const id = text(record.payload.id) ?? record.localId;
  const accountId = text(record.payload.account_id);
  const name = text(record.payload.name);
  const type = text(record.payload.type);
  if (!accountId || !name || !['time', 'completion', 'count', 'numeric', 'event'].includes(type ?? '')) return null;
  return {
    id,
    accountId,
    name,
    type: type as TelegramItemType,
    unit: text(record.payload.unit),
    countOnComplete: numberValue(record.payload.count_on_complete) === 1,
  };
}

async function loadUserData(client: SupabaseClient, userId: string): Promise<UserData> {
  const { data, error } = await client
    .from('oos_sync_records')
    .select('table_name,local_id,payload,deleted_at')
    .eq('user_id', userId)
    .in('table_name', [
      'accounts', 'items', 'item_schedules', 'entries', 'weekly_plans', 'weekly_plan_lines',
      'day_closures', 'settings',
    ]);
  if (error) throw error;
  const records = parseSyncRecords(data as unknown);
  return { records, items: records.flatMap((record) => itemFromRecord(record) ?? []) };
}

export async function loadTelegramItems(client: SupabaseClient, userId: string): Promise<TelegramItem[]> {
  return (await loadUserData(client, userId)).items;
}

export async function getTelegramSettingsByChat(
  client: SupabaseClient,
  chatId: number,
): Promise<TelegramSettings | null> {
  const { data, error } = await client
    .from('telegram_settings')
    .select('user_id,allowed_chat_id,bot_username,notification_time,time_zone,enabled')
    .eq('allowed_chat_id', chatId)
    .eq('enabled', true)
    .maybeSingle();
  if (error) throw error;
  return parseSettingsRow(data as unknown);
}

export async function listTelegramSettings(client: SupabaseClient): Promise<TelegramSettings[]> {
  const { data, error } = await client
    .from('telegram_settings')
    .select('user_id,allowed_chat_id,bot_username,notification_time,time_zone,enabled')
    .eq('enabled', true);
  if (error) throw error;
  return asArray(data as unknown).flatMap((row) => parseSettingsRow(row) ?? []);
}

export async function claimTelegramUpdate(
  client: SupabaseClient,
  updateId: number,
  chatId: number | null,
): Promise<boolean> {
  const attemptedAt = new Date().toISOString();
  const { error } = await client.from('telegram_updates').insert({
    update_id: updateId,
    chat_id: chatId,
    status: 'processing',
    attempted_at: attemptedAt,
  });
  if (!error) return true;
  if (error.code !== '23505') throw error;
  const { data, error: retryError } = await client
    .from('telegram_updates')
    .update({ status: 'processing', attempted_at: attemptedAt, last_error: null })
    .eq('update_id', updateId)
    .eq('status', 'failed')
    .select('update_id')
    .maybeSingle();
  if (retryError) throw retryError;
  return data !== null;
}

export async function completeTelegramUpdate(client: SupabaseClient, updateId: number): Promise<void> {
  const { error } = await client.from('telegram_updates')
    .update({ status: 'completed', completed_at: new Date().toISOString(), last_error: null })
    .eq('update_id', updateId)
    .eq('status', 'processing');
  if (error) throw error;
}

export async function failTelegramUpdate(client: SupabaseClient, updateId: number, reason: string): Promise<void> {
  const { error } = await client.from('telegram_updates')
    .update({ status: 'failed', last_error: reason.slice(0, 500) })
    .eq('update_id', updateId)
    .eq('status', 'processing');
  if (error) throw error;
}

function operationForItem(item: TelegramItem): ProposedEntryAction['operation'] {
  if (item.type === 'time') return 'duration';
  if (item.type === 'completion') return 'completion';
  if (item.type === 'count') return 'count';
  return 'value';
}

export function actionForItem(item: TelegramItem, amount: number | null): ProposedEntryAction {
  return {
    kind: 'entry',
    itemId: item.id,
    itemName: item.name,
    accountId: item.accountId,
    entryType: item.type,
    operation: operationForItem(item),
    amount,
    note: null,
  };
}

async function deterministicUuid(seed: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function entryPayload(
  action: ProposedEntryAction,
  source: 'telegram' | 'voice',
  now: string,
  id: string,
): Record<string, unknown> {
  const duration = action.operation === 'duration' ? Math.round(action.amount ?? 0) : action.operation === 'completion' && action.entryType === 'time' ? 0 : null;
  const value = action.operation === 'value' ? action.amount : null;
  const count = action.operation === 'completion' || action.operation === 'count' ? Math.round(action.amount ?? 1) : null;
  return {
    id,
    item_id: action.itemId,
    account_id: action.accountId,
    type: action.entryType,
    started_at: null,
    ended_at: null,
    duration_min: duration,
    value,
    count,
    occurred_at: now,
    note: action.note,
    source,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

export async function writeTelegramActions(
  client: SupabaseClient,
  userId: string,
  actions: readonly ProposedEntryAction[],
  source: 'telegram' | 'voice',
  idempotencyKey?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const rows = await Promise.all(actions.map(async (action, index) => {
    const id = idempotencyKey
      ? await deterministicUuid(`oos:${userId}:${source}:${idempotencyKey}:${index}`)
      : crypto.randomUUID();
    const payload = entryPayload(action, source, now, id);
    return {
      user_id: userId,
      table_name: 'entries',
      local_id: payload.id,
      payload,
      client_updated_at: now,
      deleted_at: null,
    };
  }));
  if (rows.length === 0) return;
  const { error } = await client.from('oos_sync_records').upsert(rows, {
    onConflict: 'user_id,table_name,local_id',
  });
  if (error) throw error;
}

export async function createTelegramProposal(
  client: SupabaseClient,
  settings: TelegramSettings,
  source: 'text' | 'voice',
  originalText: string,
  actions: readonly ProposedEntryAction[],
  idempotencyKey?: string,
): Promise<string> {
  const id = idempotencyKey
    ? await deterministicUuid(`oos:${settings.userId}:proposal:${idempotencyKey}`)
    : crypto.randomUUID();
  const { error } = await client.from('telegram_proposals').upsert({
    id,
    user_id: settings.userId,
    chat_id: settings.chatId,
    source,
    original_text: originalText,
    actions,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  return id;
}

function parseProposalAction(value: unknown): ProposedEntryAction | null {
  const row = asObject(value);
  const operation = text(row?.operation);
  const entryType = text(row?.entryType);
  const amount = row?.amount === null ? null : numberValue(row?.amount);
  if (
    row?.kind !== 'entry' || !text(row.itemId) || !text(row.itemName) || !text(row.accountId) ||
    !['time', 'completion', 'count', 'numeric', 'event'].includes(entryType ?? '') ||
    !['duration', 'completion', 'count', 'value'].includes(operation ?? '') ||
    (row?.amount !== null && amount === null)
  ) return null;
  return {
    kind: 'entry',
    itemId: text(row.itemId) ?? '',
    itemName: text(row.itemName) ?? '',
    accountId: text(row.accountId) ?? '',
    entryType: entryType as TelegramItemType,
    operation: operation as ProposedEntryAction['operation'],
    amount,
    note: row.note === null ? null : text(row.note),
  };
}

function proposalResult(value: unknown): { actions: ProposedEntryAction[]; source: 'telegram' | 'voice' } | null {
  const row = asObject(value);
  if (!row) return null;
  const source = row.source === 'voice' ? 'voice' : row.source === 'text' ? 'telegram' : null;
  if (!source) return null;
  const parsed = asArray(row.actions).map(parseProposalAction);
  if (parsed.some((action) => action === null)) return null;
  return { actions: parsed.filter((action): action is ProposedEntryAction => action !== null), source };
}

export async function claimTelegramProposal(
  client: SupabaseClient,
  settings: TelegramSettings,
  proposalId: string,
): Promise<{ actions: ProposedEntryAction[]; source: 'telegram' | 'voice' } | null> {
  const { data, error } = await client
    .from('telegram_proposals')
    .update({ status: 'confirmed', resolved_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('user_id', settings.userId)
    .eq('chat_id', settings.chatId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .select('actions,source')
    .maybeSingle();
  if (error) throw error;
  return proposalResult(data as unknown);
}

export async function reopenTelegramProposal(
  client: SupabaseClient,
  settings: TelegramSettings,
  proposalId: string,
): Promise<void> {
  const { error } = await client
    .from('telegram_proposals')
    .update({ status: 'pending', resolved_at: null })
    .eq('id', proposalId)
    .eq('user_id', settings.userId)
    .eq('chat_id', settings.chatId)
    .eq('status', 'confirmed');
  if (error) throw error;
}

export async function resolveTelegramProposal(
  client: SupabaseClient,
  settings: TelegramSettings,
  proposalId: string,
  status: 'confirmed' | 'dismissed',
): Promise<boolean> {
  const { data, error } = await client
    .from('telegram_proposals')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('user_id', settings.userId)
    .eq('chat_id', settings.chatId)
    .eq('status', 'pending')
    .select('id');
  if (error) throw error;
  return asArray(data as unknown).length === 1;
}

function localDate(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function clockInZone(now: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? '0';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    hour: Number(part('hour')),
    minute: Number(part('minute')),
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekStart(date: string, startDay: number): string {
  const jsDay = new Date(`${date}T00:00:00Z`).getUTCDay();
  const mondayIndex = (jsDay + 6) % 7;
  const delta = (mondayIndex - startDay + 7) % 7;
  return addDays(date, -delta);
}

function activeRecords(data: UserData, tableName: string): SyncRecord[] {
  return data.records.filter((record) => record.tableName === tableName && record.deletedAt === null && record.payload.deleted_at === null);
}

function settingValue(data: UserData, key: string): string | null {
  return text(activeRecords(data, 'settings').find((record) => record.localId === key)?.payload.value);
}

function accountNames(data: UserData): Map<string, string> {
  return new Map(activeRecords(data, 'accounts').flatMap((record) => {
    const name = text(record.payload.name);
    return name ? [[record.localId, name] as const] : [];
  }));
}

function entriesForDate(data: UserData, date: string, timeZone: string): SyncRecord[] {
  return activeRecords(data, 'entries').filter((record) => {
    const occurredAt = text(record.payload.occurred_at);
    return occurredAt !== null && localDate(occurredAt, timeZone) === date;
  });
}

export async function buildTodaySummary(
  client: SupabaseClient,
  settings: TelegramSettings,
  date = clockInZone(new Date(), settings.timeZone).date,
): Promise<string> {
  const data = await loadUserData(client, settings.userId);
  const itemMap = new Map(data.items.map((item) => [item.id, item]));
  const grouped = new Map<string, { minutes: number; count: number; values: number[] }>();
  for (const record of entriesForDate(data, date, settings.timeZone)) {
    const itemId = text(record.payload.item_id);
    if (!itemId) continue;
    const aggregate = grouped.get(itemId) ?? { minutes: 0, count: 0, values: [] };
    aggregate.minutes += numberValue(record.payload.duration_min) ?? 0;
    aggregate.count += numberValue(record.payload.count) ?? 0;
    const value = numberValue(record.payload.value);
    if (value !== null) aggregate.values.push(value);
    grouped.set(itemId, aggregate);
  }
  const lines = [...grouped.entries()].map(([itemId, value]) => {
    const item = itemMap.get(itemId);
    const name = item?.name ?? itemId;
    if (value.minutes > 0) return `${name} · ${formatMinutes(value.minutes)}${value.count > 0 ? ` · ${value.count}회` : ''}`;
    if (value.values.length > 0) return `${name} · ${value.values.map(String).join(', ')}${item?.unit ? ` ${item.unit}` : ''}`;
    return `${name} · ${value.count}건`;
  });
  const totalMinutes = [...grouped.values()].reduce((sum, value) => sum + value.minutes, 0);
  return [`오늘 기록 · ${date}`, `시간 합계 · ${formatMinutes(totalMinutes)}`, ...(lines.length > 0 ? lines : ['기록 없음'])].join('\n');
}

function currentPlan(data: UserData, date: string): { id: string; weekStart: string; version: number } | null {
  const startDay = Number(settingValue(data, 'week_start_day') ?? '0');
  const targetWeek = weekStart(date, Number.isInteger(startDay) ? startDay : 0);
  const plans = activeRecords(data, 'weekly_plans')
    .filter((record) => text(record.payload.week_start) === targetWeek)
    .map((record) => ({ id: record.localId, weekStart: targetWeek, version: numberValue(record.payload.version) ?? 0 }))
    .sort((left, right) => right.version - left.version);
  return plans[0] ?? null;
}

export async function buildPlanSummary(client: SupabaseClient, settings: TelegramSettings): Promise<string> {
  const data = await loadUserData(client, settings.userId);
  const date = clockInZone(new Date(), settings.timeZone).date;
  const plan = currentPlan(data, date);
  if (!plan) return `이번 주 계획 · ${date}\n계획 없음`;
  const names = accountNames(data);
  const lines = activeRecords(data, 'weekly_plan_lines')
    .filter((record) => text(record.payload.weekly_plan_id) === plan.id)
    .map((record) => ({
      name: names.get(text(record.payload.account_id) ?? '') ?? text(record.payload.account_id) ?? '계정',
      minutes: numberValue(record.payload.planned_minutes) ?? 0,
    }))
    .sort((left, right) => right.minutes - left.minutes)
    .map((line) => `${line.name} · ${formatMinutes(line.minutes)}`);
  const total = activeRecords(data, 'weekly_plan_lines')
    .filter((record) => text(record.payload.weekly_plan_id) === plan.id)
    .reduce((sum, record) => sum + (numberValue(record.payload.planned_minutes) ?? 0), 0);
  return [`이번 주 계획 · ${plan.weekStart} · v${plan.version}`, `합계 · ${formatMinutes(total)}`, ...lines].join('\n');
}

export async function buildWeekSummary(client: SupabaseClient, settings: TelegramSettings): Promise<string> {
  const data = await loadUserData(client, settings.userId);
  const date = clockInZone(new Date(), settings.timeZone).date;
  const plan = currentPlan(data, date);
  const startDay = Number(settingValue(data, 'week_start_day') ?? '0');
  const start = weekStart(date, Number.isInteger(startDay) ? startDay : 0);
  const end = addDays(start, 6);
  const names = accountNames(data);
  const planned = new Map<string, number>();
  if (plan) {
    for (const record of activeRecords(data, 'weekly_plan_lines').filter((candidate) => text(candidate.payload.weekly_plan_id) === plan.id)) {
      const accountId = text(record.payload.account_id);
      if (accountId) planned.set(accountId, numberValue(record.payload.planned_minutes) ?? 0);
    }
  }
  const actual = new Map<string, number>();
  for (const record of activeRecords(data, 'entries')) {
    const occurredAt = text(record.payload.occurred_at);
    const accountId = text(record.payload.account_id);
    if (!occurredAt || !accountId) continue;
    const entryDate = localDate(occurredAt, settings.timeZone);
    if (entryDate < start || entryDate > end) continue;
    actual.set(accountId, (actual.get(accountId) ?? 0) + (numberValue(record.payload.duration_min) ?? 0));
  }
  const ids = [...new Set([...planned.keys(), ...actual.keys()])];
  const lines = ids.map((id) => {
    const planMinutes = planned.get(id) ?? 0;
    const actualMinutes = actual.get(id) ?? 0;
    return `${names.get(id) ?? id} · 계획 ${formatMinutes(planMinutes)} · 실제 ${formatMinutes(actualMinutes)} · 차이 ${formatMinutes(actualMinutes - planMinutes)}`;
  });
  const totalPlan = [...planned.values()].reduce((sum, value) => sum + value, 0);
  const totalActual = [...actual.values()].reduce((sum, value) => sum + value, 0);
  return [
    `이번 주 · ${start}~${end}`,
    `합계 · 계획 ${formatMinutes(totalPlan)} · 실제 ${formatMinutes(totalActual)} · 차이 ${formatMinutes(totalActual - totalPlan)}`,
    ...lines,
  ].join('\n');
}

export async function closeTelegramDay(
  client: SupabaseClient,
  settings: TelegramSettings,
  date = clockInZone(new Date(), settings.timeZone).date,
): Promise<void> {
  const data = await loadUserData(client, settings.userId);
  const existing = activeRecords(data, 'day_closures').find((record) => text(record.payload.date) === date);
  const now = new Date().toISOString();
  const actualMinutes = entriesForDate(data, date, settings.timeZone)
    .reduce((sum, record) => sum + (numberValue(record.payload.duration_min) ?? 0), 0);
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const plannedMinutes = activeRecords(data, 'item_schedules')
    .filter((record) => {
      const mask = numberValue(record.payload.weekday_mask) ?? 0;
      return (mask & (1 << weekday)) !== 0 && numberValue(record.payload.auto_create) === 1;
    })
    .reduce((sum, record) => sum + (numberValue(record.payload.planned_value) ?? 0), 0);
  const id = existing?.localId ?? crypto.randomUUID();
  const payload = {
    id,
    date,
    closed_at: now,
    planned_minutes: Math.round(plannedMinutes),
    actual_minutes: Math.round(actualMinutes),
    snapshot_json: JSON.stringify({ date, plannedMinutes, actualMinutes }),
    note: null,
    updated_at: now,
    deleted_at: null,
  };
  const { error } = await client.from('oos_sync_records').upsert({
    user_id: settings.userId,
    table_name: 'day_closures',
    local_id: id,
    payload,
    client_updated_at: now,
    deleted_at: null,
  }, { onConflict: 'user_id,table_name,local_id' });
  if (error) throw error;
}

export async function claimDailyDelivery(
  client: SupabaseClient,
  settings: TelegramSettings,
  localDateValue: string,
): Promise<boolean> {
  const { error } = await client.from('telegram_delivery_log').insert({
    user_id: settings.userId,
    local_date: localDateValue,
    kind: 'daily_close',
    chat_id: settings.chatId,
  });
  if (!error) return true;
  if (error.code === '23505') return false;
  throw error;
}

export async function releaseDailyDelivery(
  client: SupabaseClient,
  settings: TelegramSettings,
  localDateValue: string,
): Promise<void> {
  const { error } = await client.from('telegram_delivery_log')
    .delete()
    .eq('user_id', settings.userId)
    .eq('local_date', localDateValue)
    .eq('kind', 'daily_close')
    .is('sent_at', null);
  if (error) throw error;
}

export async function markDailyDeliverySent(
  client: SupabaseClient,
  settings: TelegramSettings,
  localDateValue: string,
  messageId: number | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error: deliveryError } = await client.from('telegram_delivery_log')
    .update({ telegram_message_id: messageId, sent_at: now })
    .eq('user_id', settings.userId)
    .eq('local_date', localDateValue)
    .eq('kind', 'daily_close');
  if (deliveryError) throw deliveryError;
  const { error: settingsError } = await client.from('telegram_settings')
    .update({ last_prompt_local_date: localDateValue })
    .eq('user_id', settings.userId);
  if (settingsError) throw settingsError;
}

export function findStudyItem(items: readonly TelegramItem[]): TelegramItem | null {
  return items.find((item) => item.id === 'seed-item-study' && item.type === 'time')
    ?? findTelegramItem(items, '편입', ['time']);
}
