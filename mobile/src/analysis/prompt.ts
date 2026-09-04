import type { AnalysisMode, PlanChangePayload } from '@/types/domain';

import type { AnalysisNumberUsed, AnalysisPlanChangeProposal, ParsedAnalysisOutput } from './types';

export const ANALYSIS_SYSTEM_PROMPT = `당신은 개인 운영체제의 데이터 분석 참모다.
다음 규칙은 모든 응답에 적용된다.
1. 첨부된 데이터와 그 데이터로 계산할 수 있는 값에만 근거한다. 데이터가 부족하면 부족하다고 명시한다.
2. 사용한 숫자는 기간, 계정 또는 항목, 값과 단위를 numbers_used에 구체적으로 밝힌다.
3. 결론은 선택지로 제시하며 결정권이 사용자에게 있음을 유지한다.
4. 사용자의 성향, 심리, 동기 또는 위험을 서술하거나 도덕적·격려적·질책적 표현을 쓰지 않는다. 사용자를 문법적 주어로 평가하지 말고 계정·항목·기간·프로젝트의 숫자를 주어로 쓴다.
5. 변경을 이미 적용했다고 말하지 않는다. 변경안은 proposals에만 넣는다.
6. 감정이나 과거 프로파일이 아니라 첨부된 누적 데이터만 사용한다.
7. plan_change 제안은 week_start와 모든 대상 account_id의 planned_minutes를 포함한다.
응답은 지정된 JSON Schema만 따른다.`;

export const ANALYSIS_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answer', 'numbers_used', 'proposals'],
  properties: {
    answer: { type: 'string' },
    numbers_used: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'unit', 'period'],
        properties: {
          label: { type: 'string' },
          value: { type: 'number' },
          unit: { type: ['string', 'null'] },
          period: { type: 'string' },
        },
      },
    },
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'payload', 'rationale'],
        properties: {
          kind: { type: 'string', enum: ['plan_change'] },
          payload: {
            type: 'object',
            additionalProperties: false,
            required: ['week_start', 'minutes_by_account', 'note'],
            properties: {
              week_start: { type: 'string' },
              minutes_by_account: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['account_id', 'planned_minutes'],
                  properties: {
                    account_id: { type: 'string' },
                    planned_minutes: { type: 'number' },
                  },
                },
              },
              note: { type: ['string', 'null'] },
            },
          },
          rationale: { type: 'string' },
        },
      },
    },
  },
} as const;

export const ANALYSIS_MODE_LABELS: Readonly<Record<AnalysisMode, string>> = {
  audit: '감사',
  pattern: '패턴',
  project: '프로젝트',
  optimize: '최적화',
  longterm: '장기',
  free: '자유질문',
};

export const ANALYSIS_MODE_QUESTIONS: Readonly<Record<AnalysisMode, string>> = {
  audit: '선택 기간의 계획과 실제 차이를 계정·항목·주 단위로 분석해.',
  pattern: '선택 기간의 시간·성과·수면·운동·요일 사이에서 데이터로 확인되는 반복 관계를 찾아줘.',
  project: '선택 기간의 프로젝트별 투입시간과 KPI 변화를 함께 비교해.',
  optimize: '저장된 계획과 실제를 근거로 다음 주 시간배분 선택지를 여러 개 제안해.',
  longterm: '선택 기간의 주별 계획·실제·KPI 방향성을 숫자로 정리해.',
  free: '',
};

export const ANALYSIS_EXAMPLE_QUESTIONS = [
  '최근 8주를 보고 편입 시간을 25시간 계속 유지하는 게 맞는지 분석해',
  '제품 개발시간이 매출이나 사용자 증가와 관계가 있었는지 봐',
  '내 예상시간과 실제시간 오차가 가장 큰 활동은?',
  '이번 달에 계획만 세우고 완료하지 못한 프로젝트는?',
] as const;

const forbiddenOutputFragments = [
  '잘했', '못했', '아쉬', '연속!', '무너지', '조심하', '게으',
  '의지가', '의욕', '동기 부족', '심리적', '성향', '충동',
  '참을성', '융통성', '성실', '끈기', '자제력', '회복탄력', '즉흥', '선호합니다', '선호한다', '위험한 사람',
  '포기', '미루', '회피', '그만두', '적응력',
  'impulsive', 'unmotivated', 'lazy', 'impatient', 'personality', 'psychological',
  'spontaneous', 'prefers',
] as const;

const personalSubjectPattern = /(?:(?:사용자|이용자|기록자|대상자|분석\s*대상|해당\s*인물|이\s*사람|본\s*사람)(?:(?:\s*님)?\s*(?:께서는|께서|는|은|이|가|의)|\s+(?:또한|역시))|당신(?:은|이|의)?|귀하(?:는|가|의)?|너(?:는|가|의)?|본인(?:은|이|가|의)?|\b(?:you|your|users?|the user(?:'s)?|this user|this person|the person|this individual|the individual)\b)/i;

const personDescriptionPatterns = [
  new RegExp(`(?:^|[.!?\\n,:;]\\s*)(?:[-*•]\\s*)?${personalSubjectPattern.source}`, 'i'),
  /(?:^|[.!?\n,:;]\s*)(?:[-*•]\s*)?[^.!?\n\d]{1,40}(?:사람|인간)(?:입니다|이다|이에요|예요)/i,
] as const;

const aggregateUserLabelSource = '(?:유료|무료|활성|신규|등록|재방문|전체|고유|월간|주간|일간|서비스|앱)(?:\\s+(?:유료|무료|활성|신규|등록|재방문|전체|고유))?\\s+사용자(?:는|은|가|의)';
const aggregateUserMetricPattern = new RegExp(
  `${aggregateUserLabelSource}\\s*(?:(?:총|약)\\s*)?[-+]?\\d[\\d,.]*\\s*(?:명|건|%|퍼센트|회|곳|개)(?=\\s*(?:(?:이고|이며)\\s+(?=${aggregateUserLabelSource})|(?:(?:으로\\s+집계됩니다|(?:증가|감소)(?:했습니다|했다|합니다|한다)|입니다|이다|였다)\\s*)?(?:[.!?\\n]|$)))`,
  'g',
);
const factualTendencySubjectPattern = /(?:계정|항목|기간|프로젝트|KPI|매출|계획|실제|차이|기록|시간|횟수|수치|비율|분포|추세|요일)(?:은|는|이|가|의)/i;
const objectiveNarrativePattern = /(?:데이터|계정|항목|기간|프로젝트|KPI|계획(?:안)?|실제|차이|기록|시간|횟수|수치|비율|분포|추세|요일|매출|수익|비용|선택(?:지|안)|제안|변경안|일정|합계|평균|최소|최대|목표|상한|하한|토큰|집계\s*지표)|\b(?:data|account|item|period|project|kpi|plan|actual|difference|record|time|count|value|ratio|distribution|trend|weekday|revenue|cost|option|proposal|schedule|total|average|minimum|maximum|target|token)s?\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function containsUnsupportedPersonalClause(value: string): boolean {
  const withoutAggregateMetrics = value.replace(aggregateUserMetricPattern, '집계 지표');
  return personalSubjectPattern.test(withoutAggregateMetrics);
}

function containsUnsupportedTendency(value: string): boolean {
  return value
    .split(/[.!?\n]+/)
    .some((sentence) => sentence.includes('경향') && !factualTendencySubjectPattern.test(sentence));
}

function hasOnlyObjectiveNarrative(value: string): boolean {
  const withoutAggregateMetrics = value.replace(aggregateUserMetricPattern, '집계 지표');
  const sentences = withoutAggregateMetrics
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  return sentences.length > 0 && sentences.every((sentence) => objectiveNarrativePattern.test(sentence));
}

function containsForbiddenDescription(value: string): boolean {
  const normalized = value
    .replace(/[*_`~]/g, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim();
  const comparable = normalized.toLocaleLowerCase('en-US');
  return forbiddenOutputFragments.some((fragment) => comparable.includes(fragment))
    || personDescriptionPatterns.some((pattern) => pattern.test(normalized))
    || containsUnsupportedPersonalClause(normalized)
    || containsUnsupportedTendency(normalized);
}

export function isAnalysisProseAllowed(value: string): boolean {
  return !containsForbiddenDescription(value) && hasOnlyObjectiveNarrative(value);
}

function blockedOutput(): ParsedAnalysisOutput {
  return {
    answer: '응답이 고정 문구 규칙을 통과하지 못해 표시하지 않았습니다.',
    numbersUsed: [],
    proposals: [],
    structured: false,
    warning: '사용자 서술 또는 판정 문구가 감지되었습니다.',
  };
}

function numberUsed(value: unknown): AnalysisNumberUsed | null {
  if (!isRecord(value)) return null;
  const label = safeText(value.label);
  const period = safeText(value.period);
  if (!label || !period || typeof value.value !== 'number' || !Number.isFinite(value.value)) return null;
  if (value.unit !== null && typeof value.unit !== 'string') return null;
  return { label, value: value.value, unit: value.unit, period };
}

function planChangePayload(value: unknown): PlanChangePayload | null {
  if (!isRecord(value)) return null;
  const weekStart = safeText(value.week_start);
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !Array.isArray(value.minutes_by_account)) return null;
  const minutesByAccount: Record<string, number> = {};
  for (const line of value.minutes_by_account) {
    if (!isRecord(line)) return null;
    const accountId = safeText(line.account_id);
    const minutes = line.planned_minutes;
    if (!accountId || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return null;
    if (Object.hasOwn(minutesByAccount, accountId)) return null;
    minutesByAccount[accountId] = Math.round(minutes);
  }
  if (Object.keys(minutesByAccount).length === 0) return null;
  const note = value.note === null ? null : safeText(value.note);
  if (value.note !== null && note === null) return null;
  return { weekStart, minutesByAccount, note };
}

function proposal(value: unknown): AnalysisPlanChangeProposal | null {
  if (!isRecord(value) || value.kind !== 'plan_change') return null;
  const payload = planChangePayload(value.payload);
  const rationale = safeText(value.rationale);
  if (!payload || !rationale) return null;
  return { kind: 'plan_change', payload, rationale };
}

export function parseAnalysisResponse(raw: string): ParsedAnalysisOutput {
  const trimmed = raw.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) throw new Error('object required');
    const answer = safeText(parsed.answer);
    if (!answer || !Array.isArray(parsed.numbers_used) || !Array.isArray(parsed.proposals)) {
      throw new Error('required fields missing');
    }
    const numbersUsed = parsed.numbers_used.map(numberUsed);
    const proposals = parsed.proposals.map(proposal);
    if (numbersUsed.some((value) => value === null) || proposals.some((value) => value === null)) {
      throw new Error('invalid array member');
    }
    const checkedNumbers = numbersUsed.filter((value): value is AnalysisNumberUsed => value !== null);
    const checkedProposals = proposals.filter((value): value is AnalysisPlanChangeProposal => value !== null);
    const narratives = [
      answer,
      ...checkedProposals.flatMap((value) => [value.rationale, value.payload.note].filter(
        (text): text is string => text !== null,
      )),
    ];
    const metadata = checkedNumbers.flatMap((value) => [value.label, value.unit ?? '', value.period]);
    if (
      narratives.some((text) => !isAnalysisProseAllowed(text))
      || metadata.some((text) => containsForbiddenDescription(text))
    ) return blockedOutput();
    return {
      answer,
      numbersUsed: checkedNumbers,
      proposals: checkedProposals,
      structured: true,
      warning: null,
    };
  } catch {
    if (!isAnalysisProseAllowed(trimmed)) return blockedOutput();
    return {
      answer: trimmed || 'AI 응답 본문이 비어 있습니다.',
      numbersUsed: [],
      proposals: [],
      structured: false,
      warning: '구조화 응답을 해석하지 못해 원문만 표시합니다. 제안은 저장하지 않았습니다.',
    };
  }
}

export function serializeAnalysisOutput(output: ParsedAnalysisOutput): string {
  if (!output.structured) return output.answer;
  return JSON.stringify({
    answer: output.answer,
    numbers_used: output.numbersUsed.map((number) => ({
      label: number.label,
      value: number.value,
      unit: number.unit,
      period: number.period,
    })),
    proposals: output.proposals.map((item) => ({
      kind: item.kind,
      payload: {
        week_start: item.payload.weekStart,
        minutes_by_account: Object.entries(item.payload.minutesByAccount).map(([accountId, plannedMinutes]) => ({
          account_id: accountId,
          planned_minutes: plannedMinutes,
        })),
        note: item.payload.note,
      },
      rationale: item.rationale,
    })),
  });
}
