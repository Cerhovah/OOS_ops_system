export const ANALYSIS_PROVIDER = 'openai';
export const ANALYSIS_MODEL = 'gpt-5.6-terra';
export const ANALYSIS_CONTRACT_VERSION = 'phase4-v1';

export const ANALYSIS_MODES = ['audit', 'pattern', 'project', 'optimize', 'longterm', 'free'] as const;

export const ANALYSIS_MODE_LABELS: Readonly<Record<(typeof ANALYSIS_MODES)[number], string>> = {
  audit: '감사',
  pattern: '패턴',
  project: '프로젝트',
  optimize: '최적화',
  longterm: '장기',
  free: '자유질문',
};

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
