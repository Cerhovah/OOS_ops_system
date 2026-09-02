import { downloadTelegramFile, getTelegramFilePath } from './telegram-api.ts';
import type { ProposedEntryAction, TelegramItem } from './telegram-core.ts';

export interface TranscriptionConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface StructuringConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractAssistantText(value: unknown): string | null {
  const root = asObject(value);
  if (typeof root?.text === 'string') return root.text;
  const choices = Array.isArray(root?.choices) ? root.choices : [];
  const first = asObject(choices[0]);
  const message = asObject(first?.message);
  return typeof message?.content === 'string' ? message.content : null;
}

export async function transcribeTelegramVoice(
  config: TranscriptionConfig,
  telegramToken: string,
  fileId: string,
): Promise<string> {
  const filePath = await getTelegramFilePath(telegramToken, fileId);
  const voice = await downloadTelegramFile(telegramToken, filePath);
  const body = new FormData();
  body.append('model', config.model);
  body.append('file', voice, 'telegram-voice.ogg');
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { authorization: `Bearer ${config.apiKey}` },
    body,
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(`음성 전사 요청 실패: HTTP ${response.status}`);
  const transcript = extractAssistantText(result)?.trim();
  if (!transcript) throw new Error('음성 전사 결과가 비어 있습니다.');
  return transcript;
}

function parseJsonText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  return JSON.parse(fenced.trim()) as unknown;
}

export async function structureFreeText(
  config: StructuringConfig,
  originalText: string,
  items: readonly TelegramItem[],
): Promise<ProposedEntryAction[]> {
  const itemPayload = items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    unit: item.unit,
    count_on_complete: item.countOnComplete,
  }));
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '입력 문장을 제공된 항목의 기록 제안 JSON으로만 변환한다.',
            '데이터에 없는 항목을 만들거나 추측하지 않는다.',
            '사용자에 대한 성향·심리·동기·위험을 서술하지 않는다.',
            '출력: {"actions":[{"item_id":"...","operation":"duration|completion|count|value","amount":number|null,"note":string|null}]}',
            '시간 amount는 분 정수다. 기록 적용은 하지 않고 제안만 반환한다.',
          ].join(' '),
        },
        { role: 'user', content: JSON.stringify({ text: originalText, items: itemPayload }) },
      ],
    }),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(`문장 구조화 요청 실패: HTTP ${response.status}`);
  const assistantText = extractAssistantText(result);
  if (!assistantText) return [];
  const root = asObject(parseJsonText(assistantText));
  const rawActions = Array.isArray(root?.actions) ? root.actions : [];
  return rawActions.flatMap((candidate) => {
    const row = asObject(candidate);
    const item = items.find((value) => value.id === row?.item_id);
    const operation = typeof row?.operation === 'string' ? row.operation : '';
    const amount = row?.amount === null ? null : typeof row?.amount === 'number' && Number.isFinite(row.amount) ? row.amount : null;
    if (!item || !['duration', 'completion', 'count', 'value'].includes(operation)) return [];
    if (operation === 'duration' && item.type !== 'time') return [];
    if (operation === 'completion' && item.type !== 'completion' && !(item.type === 'time' && item.countOnComplete)) return [];
    if (operation === 'count' && item.type !== 'count') return [];
    if (operation === 'value' && item.type !== 'numeric' && item.type !== 'event') return [];
    if (operation !== 'completion' && amount === null) return [];
    return [{
      kind: 'entry' as const,
      itemId: item.id,
      itemName: item.name,
      accountId: item.accountId,
      entryType: item.type,
      operation: operation as ProposedEntryAction['operation'],
      amount: operation === 'completion' ? 1 : amount,
      note: typeof row?.note === 'string' ? row.note : null,
    }];
  });
}
