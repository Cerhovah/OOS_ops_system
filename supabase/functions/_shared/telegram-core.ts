export type TelegramItemType = 'time' | 'completion' | 'count' | 'numeric' | 'event';

export interface TelegramItem {
  id: string;
  accountId: string;
  name: string;
  type: TelegramItemType;
  unit: string | null;
  countOnComplete: boolean;
}

export type TelegramCommand =
  | { kind: 'help' }
  | { kind: 'today' }
  | { kind: 'plan' }
  | { kind: 'week' }
  | { kind: 'end' }
  | { kind: 'study'; minutes: number }
  | { kind: 'log'; itemQuery: string; minutes: number }
  | { kind: 'done'; itemQuery: string }
  | { kind: 'count'; itemQuery: string };

export type ParsedTelegramInput =
  | { kind: 'command'; command: TelegramCommand }
  | { kind: 'invalid-command'; message: string }
  | { kind: 'free-text'; text: string };

export interface ProposedEntryAction {
  kind: 'entry';
  itemId: string;
  itemName: string;
  accountId: string;
  entryType: TelegramItemType;
  operation: 'duration' | 'completion' | 'count' | 'value';
  amount: number | null;
  note: string | null;
}

export type TelegramCallback =
  | { kind: 'close'; localDate: string }
  | { kind: 'edit'; localDate: string }
  | { kind: 'later'; localDate: string }
  | { kind: 'confirm'; proposalId: string }
  | { kind: 'dismiss'; proposalId: string };

const koreanNumbers = new Map<string, number>([
  ['한', 1], ['하나', 1], ['두', 2], ['둘', 2], ['세', 3], ['셋', 3], ['네', 4], ['넷', 4],
  ['다섯', 5], ['여섯', 6], ['일곱', 7], ['여덟', 8], ['아홉', 9], ['열', 10],
  ['열한', 11], ['열두', 12],
]);

function positiveInteger(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function commandName(raw: string): string {
  return raw.toLowerCase().split('@')[0];
}

export function parseTelegramInput(raw: string): ParsedTelegramInput {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text.startsWith('/')) return { kind: 'free-text', text };

  const [rawName, ...parts] = text.split(' ');
  const name = commandName(rawName);
  if (name === '/start' || name === '/help') return { kind: 'command', command: { kind: 'help' } };
  if (name === '/today') return { kind: 'command', command: { kind: 'today' } };
  if (name === '/plan') return { kind: 'command', command: { kind: 'plan' } };
  if (name === '/week') return { kind: 'command', command: { kind: 'week' } };
  if (name === '/end') return { kind: 'command', command: { kind: 'end' } };

  if (name === '/study') {
    const minutes = parts.length === 1 ? positiveInteger(parts[0]) : null;
    return minutes === null
      ? { kind: 'invalid-command', message: '형식: /study <분> · 예: /study 90' }
      : { kind: 'command', command: { kind: 'study', minutes } };
  }

  if (name === '/log') {
    const minutes = parts.length >= 2 ? positiveInteger(parts.at(-1) ?? '') : null;
    const itemQuery = parts.slice(0, -1).join(' ').trim();
    return minutes === null || itemQuery === ''
      ? { kind: 'invalid-command', message: '형식: /log <항목> <분> · 예: /log 편입 공부 90' }
      : { kind: 'command', command: { kind: 'log', itemQuery, minutes } };
  }

  if (name === '/done' || name === '/count') {
    const itemQuery = parts.join(' ').trim();
    if (itemQuery === '') {
      return { kind: 'invalid-command', message: `형식: ${name} <항목>` };
    }
    return {
      kind: 'command',
      command: name === '/done' ? { kind: 'done', itemQuery } : { kind: 'count', itemQuery },
    };
  }

  return { kind: 'invalid-command', message: '지원 명령은 /today /study /log /done /count /end /plan /week 입니다.' };
}

export function parseDurationMinutes(text: string): number | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let total = 0;
  let matched = false;
  const numericHours = normalized.match(/(\d+(?:\.\d+)?)\s*시간/);
  if (numericHours) {
    total += Number(numericHours[1]) * 60;
    matched = true;
  } else {
    const wordHours = normalized.match(/(열두|열한|다섯|여섯|일곱|여덟|아홉|하나|둘|셋|넷|한|두|세|네|열)\s*시간/);
    if (wordHours) {
      total += (koreanNumbers.get(wordHours[1]) ?? 0) * 60;
      matched = true;
    }
  }
  const minutes = normalized.match(/(\d+)\s*분/);
  if (minutes) {
    total += Number(minutes[1]);
    matched = true;
  }
  if (/시간\s*(?:정도\s*)?반|시간반/.test(normalized)) {
    total += 30;
    matched = true;
  }
  if (!matched || !Number.isFinite(total) || total <= 0) return null;
  return Math.round(total);
}

function compact(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').replace(/[·._-]/g, '');
}

function aliases(item: TelegramItem): string[] {
  const values = [compact(item.name)];
  for (const token of item.name.trim().split(/\s+/)) {
    if (compact(token).length >= 2) values.push(compact(token));
  }
  for (const suffix of ['공부', '미션', '운동', '시간', '기록']) {
    const stripped = compact(item.name).replace(new RegExp(`${suffix}$`), '');
    if (stripped.length >= 2) values.push(stripped);
  }
  return [...new Set(values)].sort((left, right) => right.length - left.length);
}

export function findTelegramItem(
  items: readonly TelegramItem[],
  query: string,
  allowedTypes?: readonly TelegramItemType[],
): TelegramItem | null {
  const target = compact(query);
  const candidates = items
    .filter((item) => !allowedTypes || allowedTypes.includes(item.type))
    .map((item) => {
      const itemAliases = aliases(item);
      const exact = itemAliases.some((alias) => alias === target);
      const contained = itemAliases.find((alias) => alias.length >= 2 && target.includes(alias));
      return { item, score: exact ? 10_000 + target.length : (contained?.length ?? 0) };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) return null;
  return candidates[0].item;
}

function splitClauses(text: string): string[] {
  return text
    .replace(/^오늘\s*/, '')
    .split(/\s*(?:,|그리고|했고|했으며|하고\s+)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function numericAmount(text: string): number | null {
  const match = text.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseFreeTextActions(
  text: string,
  items: readonly TelegramItem[],
): ProposedEntryAction[] {
  const actions: ProposedEntryAction[] = [];
  for (const clause of splitClauses(text)) {
    const item = findTelegramItem(items, clause);
    if (!item) continue;

    let amount: number | null = null;
    const entryType: TelegramItemType = item.type;
    let operation: ProposedEntryAction['operation'] | null = null;
    if (item.type === 'time') {
      amount = parseDurationMinutes(clause);
      if (amount !== null) operation = 'duration';
      if (amount === null && /완료|끝/.test(clause) && item.countOnComplete) {
        amount = 1;
        operation = 'completion';
      }
    } else if (item.type === 'completion') {
      if (/완료|끝|했어|했다|함/.test(clause)) {
        amount = 1;
        operation = 'completion';
      }
    } else if (item.type === 'count') {
      const count = clause.match(/(\d+)\s*(?:회|번)/);
      amount = count ? positiveInteger(count[1]) : (/완료|했어|했다|함/.test(clause) ? 1 : null);
      if (amount !== null) operation = 'count';
    } else {
      amount = numericAmount(clause);
      if (amount !== null) operation = 'value';
    }
    if (amount === null || operation === null) continue;
    actions.push({
      kind: 'entry',
      itemId: item.id,
      itemName: item.name,
      accountId: item.accountId,
      entryType,
      operation,
      amount,
      note: null,
    });
  }
  return actions;
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const sign = rounded < 0 ? '-' : '';
  const absolute = Math.abs(rounded);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  if (hours === 0) return `${sign}${remainder}m`;
  if (remainder === 0) return `${sign}${hours}h`;
  return `${sign}${hours}h ${remainder}m`;
}

export function formatProposal(actions: readonly ProposedEntryAction[]): string {
  const lines = actions.map((action) => {
    if (action.operation === 'duration') return `${action.itemName} · ${formatMinutes(action.amount ?? 0)}`;
    if (action.operation === 'completion') return `${action.itemName} · 완료 1건`;
    if (action.operation === 'count') return `${action.itemName} · ${action.amount ?? 0}회`;
    return `${action.itemName} · ${action.amount ?? '값 없음'}`;
  });
  return ['기록 제안', ...lines, '확인하면 기록합니다.'].join('\n');
}

export function parseTelegramCallback(value: string): TelegramCallback | null {
  const [kind, target] = value.split(':');
  if (!target) return null;
  if ((kind === 'close' || kind === 'edit' || kind === 'later') && /^\d{4}-\d{2}-\d{2}$/.test(target)) {
    return { kind, localDate: target };
  }
  if ((kind === 'confirm' || kind === 'dismiss') && /^[0-9a-f-]{36}$/i.test(target)) {
    return { kind, proposalId: target };
  }
  return null;
}

export const TELEGRAM_HELP_TEXT = [
  '사용 가능한 명령',
  '/today · 오늘 기록 요약',
  '/study 90 · 편입 공부 90분 기록',
  '/log <항목> <분> · 시간 기록',
  '/done <항목> · 완료 기록',
  '/count <항목> · 횟수 1회 기록',
  '/end · 오늘 종료',
  '/plan · 이번 주 계획',
  '/week · 이번 주 계획·실제·차이',
  '자유 문장은 제안 확인 후 기록합니다.',
].join('\n');
