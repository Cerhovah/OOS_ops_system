export interface InlineButton {
  text: string;
  callback_data: string;
}

interface TelegramEnvelope {
  ok?: unknown;
  description?: unknown;
  result?: unknown;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function telegramRequest(
  token: string,
  method: string,
  body: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const envelope = await response.json() as TelegramEnvelope;
  if (!response.ok || envelope.ok !== true) {
    const detail = typeof envelope.description === 'string' ? envelope.description : `HTTP ${response.status}`;
    throw new Error(`Telegram ${method} 실패: ${detail}`);
  }
  return envelope.result;
}

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  keyboard?: readonly (readonly InlineButton[])[],
): Promise<number | null> {
  const result = asObject(await telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text,
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  }));
  return typeof result?.message_id === 'number' ? result.message_id : null;
}

export async function answerTelegramCallback(
  token: string,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function getTelegramFilePath(token: string, fileId: string): Promise<string> {
  const result = asObject(await telegramRequest(token, 'getFile', { file_id: fileId }));
  if (typeof result?.file_path !== 'string') throw new Error('Telegram 음성 파일 경로가 없습니다.');
  return result.file_path;
}

export async function downloadTelegramFile(token: string, filePath: string): Promise<Blob> {
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!response.ok) throw new Error(`Telegram 음성 다운로드 실패: HTTP ${response.status}`);
  return response.blob();
}
