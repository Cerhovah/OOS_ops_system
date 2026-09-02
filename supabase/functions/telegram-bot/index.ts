import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4';

import { structureFreeText, transcribeTelegramVoice } from '../_shared/telegram-ai.ts';
import { answerTelegramCallback, sendTelegramMessage } from '../_shared/telegram-api.ts';
import {
  formatMinutes,
  formatProposal,
  parseFreeTextActions,
  parseTelegramCallback,
  parseTelegramInput,
  TELEGRAM_HELP_TEXT,
  type ProposedEntryAction,
  type TelegramCommand,
  type TelegramItem,
} from '../_shared/telegram-core.ts';
import {
  actionForItem,
  buildPlanSummary,
  buildTodaySummary,
  buildWeekSummary,
  claimDailyDelivery,
  claimTelegramProposal,
  claimTelegramUpdate,
  clockInZone,
  closeTelegramDay,
  completeTelegramUpdate,
  createTelegramProposal,
  failTelegramUpdate,
  findStudyItem,
  getTelegramSettingsByChat,
  listTelegramSettings,
  loadTelegramItems,
  markDailyDeliverySent,
  reopenTelegramProposal,
  releaseDailyDelivery,
  resolveTelegramProposal,
  writeTelegramActions,
  type TelegramSettings,
} from '../_shared/telegram-data.ts';

interface TelegramMessage {
  text: string | null;
  voiceFileId: string | null;
}

interface TelegramUpdate {
  updateId: number;
  chatId: number;
  message: TelegramMessage | null;
  callback: { id: string; data: string } | null;
}

interface RuntimeConfig {
  token: string;
  webhookSecret: string;
  cronSecret: string;
  allowedChatId: number;
  ownerUserId: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} secret이 설정되지 않았습니다.`);
  return value;
}

function runtimeConfig(): RuntimeConfig {
  const rawChatId = requiredEnv('TELEGRAM_ALLOWED_CHAT_ID');
  const allowedChatId = Number(rawChatId);
  if (!Number.isSafeInteger(allowedChatId)) throw new Error('TELEGRAM_ALLOWED_CHAT_ID 형식이 올바르지 않습니다.');
  return {
    token: requiredEnv('TELEGRAM_BOT_TOKEN'),
    webhookSecret: requiredEnv('TELEGRAM_WEBHOOK_SECRET'),
    cronSecret: requiredEnv('TELEGRAM_CRON_SECRET'),
    allowedChatId,
    ownerUserId: requiredEnv('OOS_OWNER_USER_ID'),
  };
}

function serviceClient(): SupabaseClient {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseUpdate(value: unknown): TelegramUpdate | null {
  const root = asObject(value);
  if (typeof root?.update_id !== 'number') return null;
  const message = asObject(root.message);
  const callbackQuery = asObject(root.callback_query);
  const callbackMessage = asObject(callbackQuery?.message);
  const chat = asObject(message?.chat) ?? asObject(callbackMessage?.chat);
  if (typeof chat?.id !== 'number') return null;
  const voice = asObject(message?.voice);
  return {
    updateId: root.update_id,
    chatId: chat.id,
    message: message ? {
      text: typeof message.text === 'string' ? message.text : null,
      voiceFileId: typeof voice?.file_id === 'string' ? voice.file_id : null,
    } : null,
    callback: callbackQuery && typeof callbackQuery.id === 'string' && typeof callbackQuery.data === 'string'
      ? { id: callbackQuery.id, data: callbackQuery.data }
      : null,
  };
}

function response(status: number, body: Readonly<Record<string, unknown>>): Response {
  return Response.json(body, { status });
}

function findItem(
  items: readonly TelegramItem[],
  query: string,
  types: readonly TelegramItem['type'][],
): TelegramItem | null {
  const compact = (value: string) => value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
  const target = compact(query);
  const exact = items.find((item) => types.includes(item.type) && compact(item.name) === target);
  if (exact) return exact;
  const candidates = items.filter((item) => types.includes(item.type) && (
    compact(item.name).includes(target) || target.includes(compact(item.name))
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

function recordedText(action: ProposedEntryAction): string {
  if (action.operation === 'duration') return `기록됨\n${action.itemName} · ${formatMinutes(action.amount ?? 0)}`;
  if (action.operation === 'completion') return `기록됨\n${action.itemName} · 완료 1건`;
  if (action.operation === 'count') return `기록됨\n${action.itemName} · ${action.amount ?? 1}회`;
  return `기록됨\n${action.itemName} · ${action.amount ?? '값 없음'}`;
}

async function executeCommand(
  client: SupabaseClient,
  config: RuntimeConfig,
  settings: TelegramSettings,
  command: TelegramCommand,
  updateId: number,
): Promise<void> {
  if (command.kind === 'help') {
    await sendTelegramMessage(config.token, settings.chatId, TELEGRAM_HELP_TEXT);
    return;
  }
  if (command.kind === 'today') {
    await sendTelegramMessage(config.token, settings.chatId, await buildTodaySummary(client, settings));
    return;
  }
  if (command.kind === 'plan') {
    await sendTelegramMessage(config.token, settings.chatId, await buildPlanSummary(client, settings));
    return;
  }
  if (command.kind === 'week') {
    await sendTelegramMessage(config.token, settings.chatId, await buildWeekSummary(client, settings));
    return;
  }
  if (command.kind === 'end') {
    await closeTelegramDay(client, settings);
    await sendTelegramMessage(config.token, settings.chatId, '오늘 종료 스냅샷이 저장되었습니다.');
    return;
  }

  const items = await loadTelegramItems(client, settings.userId);
  let item: TelegramItem | null = null;
  let amount = 1;
  if (command.kind === 'study') {
    item = findStudyItem(items);
    amount = command.minutes;
  } else if (command.kind === 'log') {
    item = findItem(items, command.itemQuery, ['time']);
    amount = command.minutes;
  } else if (command.kind === 'done') {
    item = findItem(items, command.itemQuery, ['completion']);
  } else if (command.kind === 'count') {
    item = findItem(items, command.itemQuery, ['count']);
  }
  if (!item) {
    await sendTelegramMessage(config.token, settings.chatId, '일치하는 항목을 찾지 못했습니다. 앱의 항목 이름을 확인하십시오.');
    return;
  }
  const action = actionForItem(item, amount);
  await writeTelegramActions(client, settings.userId, [action], 'telegram', `update:${updateId}`);
  await sendTelegramMessage(config.token, settings.chatId, recordedText(action));
}

function structuringConfig() {
  const apiUrl = Deno.env.get('TELEGRAM_STRUCTURING_API_URL')?.trim();
  const apiKey = Deno.env.get('TELEGRAM_STRUCTURING_API_KEY')?.trim();
  const model = Deno.env.get('TELEGRAM_STRUCTURING_MODEL')?.trim();
  return apiUrl && apiKey && model ? { apiUrl, apiKey, model } : null;
}

function transcriptionConfig() {
  const apiUrl = Deno.env.get('TELEGRAM_TRANSCRIPTION_API_URL')?.trim();
  const apiKey = Deno.env.get('TELEGRAM_TRANSCRIPTION_API_KEY')?.trim();
  const model = Deno.env.get('TELEGRAM_TRANSCRIPTION_MODEL')?.trim();
  return apiUrl && apiKey && model ? { apiUrl, apiKey, model } : null;
}

async function proposeText(
  client: SupabaseClient,
  config: RuntimeConfig,
  settings: TelegramSettings,
  text: string,
  source: 'text' | 'voice',
  updateId: number,
): Promise<void> {
  const items = await loadTelegramItems(client, settings.userId);
  let actions = parseFreeTextActions(text, items);
  const aiConfig = structuringConfig();
  if (actions.length === 0 && aiConfig) actions = await structureFreeText(aiConfig, text, items);
  if (actions.length === 0) {
    await sendTelegramMessage(config.token, settings.chatId, '구조화할 기록이 없습니다. 정확한 명령 형식은 /help에서 확인할 수 있습니다.');
    return;
  }
  const proposalId = await createTelegramProposal(client, settings, source, text, actions, `update:${updateId}`);
  await sendTelegramMessage(config.token, settings.chatId, formatProposal(actions), [[
    { text: '확인', callback_data: `confirm:${proposalId}` },
    { text: '무시', callback_data: `dismiss:${proposalId}` },
  ]]);
}

async function handleMessage(
  client: SupabaseClient,
  config: RuntimeConfig,
  settings: TelegramSettings,
  message: TelegramMessage,
  updateId: number,
): Promise<void> {
  if (message.text !== null) {
    const parsed = parseTelegramInput(message.text);
    if (parsed.kind === 'command') await executeCommand(client, config, settings, parsed.command, updateId);
    else if (parsed.kind === 'invalid-command') await sendTelegramMessage(config.token, settings.chatId, parsed.message);
    else await proposeText(client, config, settings, parsed.text, 'text', updateId);
    return;
  }
  if (message.voiceFileId !== null) {
    const voiceConfig = transcriptionConfig();
    if (!voiceConfig) {
      await sendTelegramMessage(config.token, settings.chatId, '음성 전사 연결이 아직 설정되지 않았습니다. 음성 기록은 적용되지 않았습니다.');
      return;
    }
    const transcript = await transcribeTelegramVoice(voiceConfig, config.token, message.voiceFileId);
    await proposeText(client, config, settings, transcript, 'voice', updateId);
  }
}

async function handleCallback(
  client: SupabaseClient,
  config: RuntimeConfig,
  settings: TelegramSettings,
  callback: { id: string; data: string },
): Promise<void> {
  const parsed = parseTelegramCallback(callback.data);
  if (!parsed) {
    await answerTelegramCallback(config.token, callback.id, '지원하지 않는 버튼입니다.');
    return;
  }
  if (parsed.kind === 'close') {
    await closeTelegramDay(client, settings, parsed.localDate);
    await answerTelegramCallback(config.token, callback.id, '오늘 종료 스냅샷 저장됨');
    return;
  }
  if (parsed.kind === 'edit') {
    await answerTelegramCallback(config.token, callback.id, '수정 명령 안내를 보냈습니다.');
    await sendTelegramMessage(config.token, settings.chatId, TELEGRAM_HELP_TEXT);
    return;
  }
  if (parsed.kind === 'later') {
    await answerTelegramCallback(config.token, callback.id, '데이터를 변경하지 않았습니다.');
    return;
  }
  if (parsed.kind === 'dismiss') {
    const dismissed = await resolveTelegramProposal(client, settings, parsed.proposalId, 'dismissed');
    await answerTelegramCallback(config.token, callback.id, dismissed ? '제안을 무시했습니다.' : '이미 처리되었거나 만료된 제안입니다.');
    return;
  }
  const proposal = await claimTelegramProposal(client, settings, parsed.proposalId);
  if (!proposal) {
    await answerTelegramCallback(config.token, callback.id, '이미 처리되었거나 만료된 제안입니다.');
    return;
  }
  try {
    await writeTelegramActions(client, settings.userId, proposal.actions, proposal.source, `proposal:${parsed.proposalId}`);
  } catch (error) {
    await reopenTelegramProposal(client, settings, parsed.proposalId);
    throw error;
  }
  await answerTelegramCallback(config.token, callback.id, `${proposal.actions.length}건 기록됨`);
}

async function runDaily(client: SupabaseClient, config: RuntimeConfig): Promise<number> {
  let sent = 0;
  for (const settings of await listTelegramSettings(client)) {
    const clock = clockInZone(new Date(), settings.timeZone);
    const [hour, minute] = settings.notificationTime.split(':').map(Number);
    if (clock.hour !== hour || clock.minute !== minute) continue;
    if (!await claimDailyDelivery(client, settings, clock.date)) continue;
    try {
      const summary = await buildTodaySummary(client, settings, clock.date);
      const messageId = await sendTelegramMessage(config.token, settings.chatId, summary, [[
        { text: '오늘 종료', callback_data: `close:${clock.date}` },
        { text: '수정', callback_data: `edit:${clock.date}` },
        { text: '나중에', callback_data: `later:${clock.date}` },
      ]]);
      await markDailyDeliverySent(client, settings, clock.date, messageId);
      sent += 1;
    } catch (error) {
      await releaseDailyDelivery(client, settings, clock.date);
      console.error(error instanceof Error ? error.message : '예약 메시지 발송 실패');
    }
  }
  return sent;
}

Deno.serve(async (request) => {
  if (request.method === 'GET') return response(200, { ok: true, service: 'telegram-bot' });
  if (request.method !== 'POST') return response(405, { ok: false });
  try {
    const config = runtimeConfig();
    const client = serviceClient();
    if (request.headers.get('x-oos-cron-secret') === config.cronSecret) {
      return response(200, { ok: true, sent: await runDaily(client, config) });
    }
    if (request.headers.get('x-telegram-bot-api-secret-token') !== config.webhookSecret) {
      return response(401, { ok: false });
    }
    const update = parseUpdate(await request.json());
    if (!update) return response(200, { ok: true, ignored: true });
    if (update.chatId !== config.allowedChatId) return response(200, { ok: true, ignored: true });
    const settings = await getTelegramSettingsByChat(client, update.chatId);
    if (!settings || settings.userId !== config.ownerUserId) return response(200, { ok: true, ignored: true });
    if (!await claimTelegramUpdate(client, update.updateId, update.chatId)) {
      return response(200, { ok: true, duplicate: true });
    }
    try {
      if (update.callback) await handleCallback(client, config, settings, update.callback);
      else if (update.message) await handleMessage(client, config, settings, update.message, update.updateId);
      await completeTelegramUpdate(client, update.updateId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Telegram webhook 처리 실패';
      await failTelegramUpdate(client, update.updateId, reason);
      throw error;
    }
    return response(200, { ok: true });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Telegram webhook 처리 실패');
    return response(500, { ok: false });
  }
});
