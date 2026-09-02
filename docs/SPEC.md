# 개인 운영체제(Personal Operations System) — 초안 v0.1 제작 명세서
## 자율 코딩 에이전트(Codex 등)용 · 하네스 포함판

- 문서 버전: 0.1 (2026-08-19)
- 대상 독자: 자율 코딩 에이전트(이하 "에이전트")와 제품 소유자(이하 "사용자")
- 제품 철학의 원천: 사용자가 확정한 메타설계 문서("개인 운영체제" 방향). 이 명세서는 그 메타설계를 구현 가능한 형태로 옮긴 것이며, 이 문서와 메타설계가 충돌하면 **메타설계가 우선**하고 에이전트는 `docs/QUESTIONS.md`에 기록한 뒤 사용자에게 묻는다.

---

## 0. 에이전트가 이 문서를 읽는 방법

### 0.1 역할
- **사용자**: 제품 소유자이자 유일한 결정권자. 무엇을 만들지, 어디까지 만들지, 언제 멈출지를 정한다.
- **에이전트**: 구현자. 기술 구현에 대해서는 넓은 자율권을 갖는다. 제품 철학·사용자 권한·데이터 소유권에 관한 사항(§2 불변조건)은 변경 권한이 없다.

### 0.2 권한 위계 (충돌 시 위가 이긴다)
1. 사용자의 명시적 지시(대화 중 새로 내린 지시 포함)
2. 이 문서의 **불변조건(§2)**
3. 이 문서의 나머지 지침(§3~§11)
4. 에이전트의 기술적 판단

### 0.3 자율 영역 / 질문 영역 / 금지 영역
- **자율 영역(묻지 않고 결정)**: 폴더 구조, 상태관리 방식, UI 컴포넌트 구현, 스타일 체계, 테스트 도구 선택, 스택 내부의 보조 라이브러리 선택, 데이터베이스 인덱스, 성능 최적화, 접근성 처리, 오류 메시지 문구(§12 문구 가이드 준수).
- **질문 영역(작업을 멈추고 `docs/QUESTIONS.md`에 적고 사용자 답을 기다림)**: §10.4 정지 조건 참조.
- **금지 영역(어떤 이유로도 하지 않음)**: §10.5 참조.

### 0.4 읽는 순서
§1 → §2 → §3 → §10 → (해당 단계의) §4~§9 → §11 → §12. 코드를 쓰기 전에 `docs/PLAN.md`를 먼저 작성한다(§10.2).

---

## 1. 제품 정의

### 1.1 한 문장
사용자가 자신의 168시간·프로젝트·성과·컨디션·계획 변경을 **직접 지휘**하고, AI는 그 데이터를 **분석하는 참모**로서 돕는 개인 경영 시스템. 계획 → 실행 → 기록 → 차이 분석 → 수정 → 장기 데이터 축적을 하나의 인터페이스에서 처리한다.

### 1.2 이 앱이 아닌 것
- 습관 추적기(Habit Tracker)가 아니다.
- 사용자를 통제하거나 행동을 판정하는 앱이 아니다.
- "무너짐을 예방하는 최소 습관 앱"이나 "붕괴 감시 계기판"이 아니다.

### 1.3 이 앱인 것
- 시간관리 앱 + 프로젝트 트래커 + 생활 기록 + 실험 로그 + AI 분석기가 하나로 합쳐진 **개인 운영체제**.
- 앱은 **회계사**다: 현실의 물리적 제약(168시간)을 계산하고 경고하되, 거부권은 항상 사용자에게 있다.
- AI는 **CFO/참모**다: 제안하고 분석하되, 적용은 항상 사용자가 버튼을 눌러야 한다.

### 1.4 사용 환경
- 단일 사용자(개인용). 휴대폰에 설치되는 네이티브 앱이 본체.
- 아이콘을 누르면 열리고, OS 알림이 오고, 오프라인에서도 기록된다.
- UI 언어: 한국어. 시간대: Asia/Seoul.

---

## 2. 불변조건 (Invariants) — 변경 불가, 모든 단계에 적용

| 번호 | 불변조건 | 구현상 의미 |
|---|---|---|
| I-1 | **사용자 주권**: 앱은 계산하고 경고하지만 어떤 입력도 차단하지 않는다. | 168h 초과 계획 저장 가능, 상한 초과 기록 가능, 모든 경고에는 "그대로 저장/계속" 선택지가 있다. 저장 버튼이 비활성화되는 경우는 입력값이 형식상 불완전할 때뿐이다. |
| I-2 | **데이터 투명성**: 숫자를 숨기지 않는다. 레이어(오늘/주간/월간)로 나눌 뿐이다. | 오늘 화면은 오늘의 숫자, 주간 화면은 주간 숫자, 월간/분석 화면은 추세. 어떤 화면에서도 "사용자 보호"를 이유로 집계를 숨기지 않는다. |
| I-3 | **판정 언어 금지**: "잘했다/못했다", 점수, 등급, 연속일수 강조, 색으로 하는 도덕적 판정 없음. | 표시하는 것은 계획 / 실제 / 차이(±). 차이는 부호와 숫자로만. 강조색은 정보 구분용이지 칭찬·질책용이 아니다. |
| I-4 | **항목 유형 다양성**: 시간형·완료형·횟수형·수치형·이벤트형을 별도로 지원한다. | 모든 항목을 하나의 습관 모델에 끼워 넣지 않는다. 각 유형은 고유한 기록 UI와 집계 규칙을 가진다. |
| I-5 | **목표 수준은 사용자 설정**: 최소/목표/상한은 각각 선택적이며 강제되지 않는다. | 항목마다 min/target/max 중 아무것도 안 넣어도, 하나만 넣어도 된다. 미달/초과는 정보로만 표시한다. |
| I-6 | **AI 제안 → 사용자 적용**: AI는 데이터를 직접 쓰지 않는다. | AI 출력은 "제안" 객체로 저장되고, 사용자가 "적용" 버튼을 눌러야 데이터에 반영된다. 적용된 변경도 이력으로 남는다. |
| I-7 | **로컬 우선(local-first)**: 인터넷 없이도 모든 기록이 가능하다. | 기본 저장소는 기기 내 SQLite. 동기화는 부가 기능이며 실패해도 기록은 유지된다. |
| I-8 | **데이터 소유권**: 전체 내보내기(CSV/JSON), 수정·삭제 가능, 계획 수정 이력 전부 보존. | 삭제는 소프트 삭제(복구 가능), 계획은 버전으로 누적, 내보내기에 모든 테이블 포함. |
| I-9 | **기록 비용 상한**: 타이머 시작 1탭, 완료 1탭, 수동 입력 2~3탭, 기록 하나 5~10초 이내. | 오늘 화면에서 바로 가능해야 한다. 모달 중첩 금지. |
| I-10 | **알림은 앱 자체 로컬 예약 알림**, 탭하면 해당 화면으로 딥링크. | expo-notifications 로컬 스케줄 알림 사용. 휴대폰 기본 알람에 의존하지 않는다. |
| I-11 | **메모는 기본 짧게, 길이 제한 없음.** | 한 줄 입력이 기본 UX이되 확장 가능. 글자 수 상한 없음. |
| I-12 | **기술 스택 고정**: Expo/React Native + expo-sqlite(로컬) + Supabase(동기화) + Telegram Bot(보조 인터페이스) + AI 분석 서비스. | 스택 변경은 질문 영역. 스택 안에서의 보조 라이브러리 선택은 자율 영역. |
| I-13 | **사람에 대한 서술 금지**: UI 문구, 코드 주석, AI 분석 프롬프트·출력 어디에도 사용자의 성향·심리·동기·위험에 대한 서술을 넣지 않는다. | AI 분석은 저장된 데이터·계산·선택지만 말한다. "~하는 경향이 있다", "~를 조심해야 한다" 류의 문장은 생성·표시하지 않는다. |
| I-14 | **제작 투자 상한 없음**: 품질에 필요한 만큼 만든다. 단, 단계 게이트(§10.3)를 통과하며 진행한다. | "작게 만들어야 안전하다"는 판단으로 기능을 줄이지 않는다. 범위 조정은 사용자만 한다. |

---

## 3. 범위와 단계

### 3.1 전체 범위(모두 이 제품의 일부)
A. 오늘 화면(기록기) · B. 주간 화면(계획 vs 실제 회계) · C. 프로젝트 화면(KPI) · D. 계획 화면(168시간 편집) · E. 분석 화면(AI 질의) · F. 설정 · G. 로컬 알림+딥링크 · H. 로컬 DB+이력+내보내기 · I. Supabase 동기화/백업 · J. Telegram 봇 보조 인터페이스 · K. AI 분석 서비스 · L. (후순위) 웹 대시보드, 외부 데이터 연동(GitHub 등)

### 3.2 제작 단계(에이전트의 작업 순서 제안 — 사용자가 순서를 바꿀 수 있음)
- **Phase 1 — 초안(v0.1)**: A, B, C, D, F, G, H. (이 단계가 끝나면 "초안 완성"으로 본다.)
- **Phase 2 — 동기화**: I.
- **Phase 3 — 봇**: J.
- **Phase 4 — 분석**: E, K.
- **Phase 5 — 확장**: L 및 `docs/FUTURE.md`에 쌓인 항목.

각 단계는 §10.3의 게이트를 통과해야 다음 단계로 간다. 단계 안에서의 순서는 에이전트 자율.

### 3.3 비목표(이번 명세에서 만들지 않음)
- 다중 사용자·팀 기능, 소셜 기능, 공유 리더보드
- 게임화 요소(연속일수 배지, 점수, 레벨, 보상)
- 광고, 분석용 원격 수집(텔레메트리)
- 앱 스토어 공개 배포 준비(개인 설치용 개발 빌드면 충분)

---

## 4. 도메인 모델

### 4.1 핵심 개념
- **시간계정(Account)**: 168시간을 나누는 서로 배타적인 계정. 주간 예산(계획 시간)을 가진다. 예: 수면, 편입, 코디세이, 통학, 제품·창업, 운동, 봉사·사회, 여가, 버퍼.
- **항목(Item)**: 실제로 기록하는 단위. 반드시 하나의 계정에 속한다. 유형은 다섯 가지.
  - `time` 시간형(예: 편입 공부) — 타이머 또는 수동 시간 입력
  - `completion` 완료형(예: 코디세이 미션 3 완료) — 완료 탭
  - `count` 횟수형(예: 운동 주 4회) — +1 탭
  - `numeric` 수치형(예: 체중) — 값 입력(단위 포함)
  - `event` 이벤트형(예: 유료 결제 1건) — 발생 기록(+선택 값·메모)
  - 한 항목이 두 유형의 성격을 가지면(예: 운동 = 시간+횟수) 시간형 항목으로 두고 `count_on_complete` 옵션을 켠다(완료 시 횟수 1 증가).
- **목표 수준(Level)**: 항목별 최소/목표/상한(각각 nullable). 단위는 유형에 따른다(분, 회, 값).
- **일정 규칙(Schedule)**: 항목의 요일 템플릿과 자동 생성 규칙. 예: 통학 = 월·화·목·금, 계획 225분, 자동 생성.
- **주간 계획(WeeklyPlan)**: 주 시작일 기준, 계정별 계획 시간의 집합. **수정할 때마다 새 버전으로 누적**(append-only).
- **기록(Entry)**: 타임스탬프가 있는 실제 데이터. 시간/완료/횟수/수치/이벤트 모두 기록으로 저장. `source`로 입력 경로(app/telegram/voice/import/ai_applied) 구분.
- **프로젝트(Project)**: 시간계정과 분리된 결과물 단위. 사용자가 프로젝트별로 KPI를 선택한다.
- **KPI 기록(ProjectKpiRecord)**: 프로젝트 KPI의 값 변화(배포, 고유 사용자, 결제, 매출 등).
- **하루 메모(DayNote)**, **오늘 종료(DayClosure)**: 하루 단위 코멘트와 종료 스냅샷.
- **분석 세션(AnalysisSession)** 및 **AI 제안(AiProposal)**: Phase 4.

### 4.2 SQLite 스키마 초안 (에이전트가 세부를 다듬어도 되나, 이력 보존·소프트 삭제·내보내기 범위는 유지)

```sql
-- 공통: id TEXT PRIMARY KEY (uuid v4), created_at/updated_at ISO8601, deleted_at NULL 허용(소프트 삭제)

CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  kind TEXT,                 -- 자유 분류(예: '기반','학업','제품','이동','여가') 표시용, 로직 강제 없음
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  project_id TEXT REFERENCES projects(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('time','completion','count','numeric','event')),
  unit TEXT,                 -- numeric/event 값의 단위(예: 'kg','KRW')
  level_min REAL, level_target REAL, level_max REAL,   -- 모두 nullable (I-5)
  default_duration_min INTEGER,                       -- 수동 입력 기본값
  count_on_complete INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE item_schedules (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  weekday_mask INTEGER NOT NULL,     -- bit0=월 … bit6=일
  planned_value REAL,                -- time: 분, count: 회, 기타: 값
  start_time TEXT,                   -- 'HH:MM' 선택. 있으면 항목 알림에 사용 가능
  auto_create INTEGER NOT NULL DEFAULT 1,   -- 해당 요일 오늘 화면에 자동 표시
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- active/paused/closed
  current_experiment TEXT,
  next_decision_date TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE project_kpis (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  key TEXT NOT NULL,         -- 'deploys','unique_users','returning_users','signups','inquiries','payments','revenue','refunds','interviews','feedback','custom:...'
  label TEXT NOT NULL,
  unit TEXT,
  aggregation TEXT NOT NULL DEFAULT 'sum',  -- sum/last/max
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE project_kpi_records (
  id TEXT PRIMARY KEY,
  kpi_id TEXT NOT NULL REFERENCES project_kpis(id),
  value REAL NOT NULL,
  occurred_at TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE weekly_plans (          -- append-only: 수정 = 새 version 행
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,          -- 'YYYY-MM-DD' (주 시작 요일은 settings)
  version INTEGER NOT NULL,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app',   -- app / copy_last_week / ai_applied
  created_at TEXT NOT NULL
);

CREATE TABLE weekly_plan_lines (
  id TEXT PRIMARY KEY,
  weekly_plan_id TEXT NOT NULL REFERENCES weekly_plans(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  planned_minutes INTEGER NOT NULL
);

CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),   -- 기록 시점의 계정(역정규화)
  type TEXT NOT NULL,
  started_at TEXT,          -- time: 타이머 시작
  ended_at TEXT,            -- time: 종료(NULL이면 진행 중 타이머)
  duration_min INTEGER,     -- time: 분(수동 입력 또는 계산값)
  value REAL,               -- numeric/event 값
  count INTEGER,            -- count/completion(완료=1)
  occurred_at TEXT NOT NULL,-- 집계 기준 시각
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
);

CREATE TABLE day_notes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE day_closures (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  closed_at TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL,
  actual_minutes INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,    -- 당일 항목별 계획/실제
  note TEXT
);

CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);

-- Phase 4
CREATE TABLE analysis_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,               -- audit/pattern/project/optimize/longterm/free
  question TEXT,
  range_start TEXT, range_end TEXT,
  data_snapshot_json TEXT NOT NULL, -- 실제로 AI에 보낸 데이터
  response_text TEXT,
  provider TEXT, model TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE ai_proposals (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES analysis_sessions(id),
  kind TEXT NOT NULL,               -- 'plan_change','item_level_change','note' 등
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending/applied/dismissed
  applied_at TEXT,
  created_at TEXT NOT NULL
);

-- Phase 2: 동기화용 change_log / outbox는 선택한 동기화 방식에 맞춰 추가
```

### 4.3 단위·규칙
- 시간은 **분(정수)**로 저장, 표시는 `h m` 형식(예: 2h 40m).
- 금액은 KRW 정수. 수치형은 REAL + 단위 문자열.
- 주 시작 요일: 설정값(기본 월요일). 하루 경계: 기본 00:00, 설정으로 "하루 종료 시각"(기본 23:00)을 두어 오늘 화면의 남은 가용시간 계산에 쓴다.
- 자정을 넘는 타이머는 분할하지 않고 `occurred_at`(시작일) 기준으로 집계하되, 주 경계를 넘는 경우는 `started_at` 기준일에 귀속(결정은 `docs/DECISIONS.md`에 기록).
- 삭제는 `deleted_at` 설정. 기본 조회에서는 제외, 설정의 "삭제된 기록 보기"에서 복구 가능.

### 4.4 초기 시드 데이터(사용자 수정 가능 — 앱 첫 실행 시 생성, 언제든 편집/삭제 가능)

계정과 기본 주간 예산(합계 168h). 사용자가 확정한 현행 배분을 그대로 초기값으로 쓴다.

| 계정 | 주간 예산 |
|---|---|
| 수면 | 49h |
| 기상 후 준비 | 4h |
| 필수 블록(월~토 1.5h) | 9h |
| 식사·세면·기본생활 | 13h |
| 운동 | 4h |
| 통학(양주↔개포) | 15h |
| 편입 학업 | 24h |
| 코디세이 | 15h |
| 개인제품·창업·시장검증 | 13h |
| AI·진로 옵션관리 | 2h |
| 봉사·사회접촉 | 4h |
| 유한 여가 | 6h |
| 착륙·저자극 전환 | 4h |
| 미예약 버퍼 | 6h |

항목 시드(예시, 모두 수정 가능):
- 편입 공부 — `time`, 계정=편입 학업, level_min 120 / target 240 / max 270(분)
- 운동 — `time` + `count_on_complete`, 계정=운동, target 60 / max 90(분), 주 4회 목표는 항목 설명에 기재(집계는 주간 화면에서 횟수 합계로 표시)
- 코디세이 미션 — `completion`, 계정=코디세이, 일정 월·화
- 통학 — `time`, 계정=통학, 일정 월·화·목·금 225분 자동 생성
- 필수 일정 — `time`, 계정=필수 블록, 일정 월~토 90분 자동 생성
- 개인 프로젝트 — `time`, 계정=개인제품·창업, 프로젝트 연결 가능
- 유료 결제 — `event`, 단위 KRW, 프로젝트 KPI와 연결 가능
- 체중 — `numeric`, 단위 kg
- 하루 메모 — 별도 화면 요소(항목 아님)

프로젝트 시드(예시): "2027 편입"(KPI: 누적 공부시간(파생), 문제풀이 세트, 오답 재풀이율, 모의점수), "AI 제품 실험"(KPI: 누적 개발시간(파생), 배포 횟수, 고유 사용자, 재방문 사용자, 유료 사용자, 매출, 현재 실험, 다음 판정일).

---

## 5. 화면 명세

### 5.1 공통
- 하단 탭 5개: **오늘 / 주간 / 프로젝트 / 계획 / 분석** (+ 설정은 헤더 아이콘). Phase 1에서는 분석 탭에 "Phase 4에서 활성화" 안내만 둔다.
- 모든 숫자는 계획 / 실제 / 차이(±)로 일관되게 표시(I-2, I-3).
- 어떤 화면에서도 "저장 불가" 상태를 만들지 않는다(I-1). 경고는 배너 또는 인라인 텍스트로.

### 5.2 오늘(Today) — 첫 화면
**목적**: 기록기. 체크리스트보다 기록이 먼저.
**상단**: 오늘 날짜·요일, **남은 가용시간**(= 하루 종료 설정 시각까지 남은 시간 − 아직 수행되지 않은 자동 생성 고정 일정의 계획 시간), 오늘 계획 합계 → 실제 합계.
**본문**: 오늘 수행할 항목만 표시(일정 규칙의 자동 생성 + 사용자가 오늘에 추가한 항목 + 진행 중인 타이머). 각 행은 유형에 맞는 표시:
```
오늘 · 목요일                    남은 가용시간 5h 10m
계획 15h 20m → 실제 14h 45m

편입 공부          2h 40m / 4h 30m      [▶ 타이머] [+ 시간]
개인 프로젝트      1h 10m / 2h          [▶] [+]
운동               완료 · 1h            [✓]
통학               3h 52m               [+]
필수 일정          1h 30m               [✓]
체중               —                    [값 입력]
```
**하단 고정 버튼**: `+ 기록` · `작업 시작` · `오늘 종료`
**동작/탭 예산**(I-9):
- 타이머 시작 1탭(행의 ▶). 진행 중 타이머는 상단에 고정 표시, 정지 1탭.
- 완료형/횟수형 1탭. 되돌리기 1탭.
- 수동 시간 입력 2~3탭: `+ 시간` → 기본값(항목 기본시간 또는 최근값) 제시 → 조정/확인.
- `+ 기록`: 오늘 목록에 없는 항목을 검색·선택해 기록.
- `오늘 종료`: 종료 화면으로 이동(5.3).
- 항목 길게 누르기: 오늘 계획값 수정, 항목 설정으로 이동.
**수용 기준**: 새 기기에서 시드 로드 후 편입 타이머 시작까지 앱 실행 포함 2탭 이내, 기록 하나 5~10초 이내.

### 5.3 오늘 종료(Day Close)
- 자동 계산 결과 표시: `계획 15h 20m → 실제 14h 45m`, 항목별 계획/실제/차이.
- 한 줄 메모 입력(기본 한 줄, 확장 시 길이 제한 없음). 예: `목 통학 지연 +40m. 제품 30m 밀림.`
- `종료` 누르면 `day_closures`에 스냅샷 저장. 종료 후에도 기록 추가·수정 가능(종료는 잠금이 아니다).
- 알림(§7) 탭 시 이 화면으로 딥링크.

### 5.4 주간(Week) — 이 앱의 중심
- 주 선택(이전/다음, 이번 주 기본).
- 표: 계정 / 계획 / 실제 / 차이. **총계 행 필수**(계획 총계, 실제 총계, 차이).
```
계정        계획    실제    차이
수면        49h     47.2h   -1.8
편입        24h     22.5h   -1.5
코디세이    15h     16.3h   +1.3
통학        15h     15.8h   +0.8
제품·창업   13h     12.2h   -0.8
운동        4h      4h       0
봉사·사회   4h      4.5h    +0.5
여가        6h      5.2h    -0.8
…
합계        168h    165.9h  -2.1
```
- 계정 행 탭 → 그 계정의 항목별·요일별 분해(실제 시간, 횟수, 완료).
- 요일별 합계 보기(토글): 월~일 각 날의 계획/실제.
- 주간 코멘트(길이 제한 없음, 선택).
- `지난주 계획 복사` 1탭(다음 주 계획이 없을 때 제안).
- 주간 화면은 "해석"을 넣지 않는다. 숫자와 차이만 보여 주고 해석은 사용자/분석 탭의 몫.

### 5.5 프로젝트(Projects)
- 프로젝트 목록 → 상세.
- 상세 상단: 누적 투입시간(연결된 항목의 시간 합, 파생), 이번 주 투입시간.
- KPI 카드: 사용자가 선택한 KPI만 표시. 값 기록은 카드에서 1~2탭(`+ 기록`).
- 기본 제공 KPI 선택지: 배포됨, 고유 사용자, 재사용자, 가입, 문의, 결제, 매출, 환불, 인터뷰, 피드백, 그리고 사용자 정의 KPI(이름·단위 입력).
- 프로젝트별 필드: 현재 실험, 다음 판정일, 상태.
- 시간계정과 결과물은 분리되어 있다: 같은 계정(예: 개인제품)에 여러 프로젝트가 있을 수 있다.

### 5.6 계획(Plan)
- 이번 주(또는 선택한 주)의 168시간을 직접 만진다. 계정별 숫자 입력 또는 슬라이더/드래그.
- 실시간 합계와 상태 배지: `현재 계획: 170h · 초과 +2h` / `현재 계획: 165h · 미배분 3h`.
- 저장은 항상 가능. 합계가 168h와 다르면 선택지를 제시한다:
  > 이번 주 제품개발을 13h → 18h로 변경하면 현재 총계가 173h입니다. 5시간을 어디에서 조정할지 선택하거나, 초과 계획으로 그대로 저장하십시오.
  선택지: `조정하기`(다른 계정 선택해 차감) / `그대로 저장`.
- 저장할 때마다 새 버전(`weekly_plans.version`). 버전 이력 화면에서 과거 버전 열람·복원(복원도 새 버전).
- `AI 추천` 버튼: Phase 4에서 활성화. 여러 시나리오를 제안하고 사용자가 하나를 고르면 새 버전으로 적용(`source='ai_applied'`). 무시 가능.
- 계정 추가/보관/정렬, 항목 추가/편집(유형, 목표 수준, 일정 규칙)은 이 탭 또는 설정에서.

### 5.7 분석(Analysis) — Phase 4
- 분석 모드 선택(사용자가 고른다):
  - **감사**: 계획과 실제의 차이만 냉정하게 분석
  - **패턴**: 시간·성과·수면·운동·요일 사이의 반복 관계 탐색
  - **프로젝트**: 특정 프로젝트의 투입 대비 결과
  - **최적화**: 다음 주 시간배분 추천(시나리오 여러 개)
  - **장기**: 최근 1~3개월 방향성
  - **자유질문**: 저장된 모든 데이터에 대해 자유롭게 질의
- 기간 선택(기본: 최근 4주), 데이터 자동 첨부(§9.2), 질문 입력.
- 결과 표시 + 제안 카드(`적용` / `무시`). 적용은 사용자 버튼으로만(I-6).
- 세션 이력 저장·검색.
- 예시 질문(이 앱이 답할 수 있어야 하는 것): "최근 8주를 보고 편입 시간을 25시간 계속 유지하는 게 맞는지 분석해", "제품 개발시간이 매출이나 사용자 증가와 관계가 있었는지 봐", "내 예상시간과 실제시간 오차가 가장 큰 활동은?", "이번 달에 계획만 세우고 완료하지 못한 프로젝트는?"

### 5.8 설정(Settings)
- 주 시작 요일, 하루 종료 시각, 알림 시각(오늘 종료 알림 기본 21:30), 항목별 알림 on/off
- 계정·항목·프로젝트 관리
- 데이터: 내보내기(JSON 전체 + CSV 테이블별), 삭제된 기록 보기/복구, 전체 초기화(2단계 확인)
- 동기화(Phase 2): 로그인, 마지막 동기화 시각, `지금 동기화`, 충돌 로그
- Telegram(Phase 3): 연결 상태, 허용 chat_id, 봇 알림 시각
- AI(Phase 4): 제공자 선택, API 키(보안 저장소), 모델, 데이터 첨부 범위 기본값, 비용 표시
- 앱 정보, 로그 내보내기

---

## 6. 핵심 계산 규칙 (순수 함수로 구현, 단위 테스트 필수)

- `weekRange(date, weekStartDay)`: 주 시작/끝.
- `planForWeek(weekStart)`: 최신 버전의 계획 라인. 없으면 빈 계획(총계 0h, "미배분 168h" 표시).
- `actualForWeek(weekStart)`: 계정별 실제 분(time 합), 횟수·완료·수치·이벤트는 별도 집계.
- `diff = actual − plan` (분). 표시는 h 단위 소수 1자리 또는 `h m`.
- `todayItems(date)`: 일정 규칙(auto_create)으로 생성되는 항목 + 오늘 수동 추가 + 진행 중 타이머. 같은 항목 중복 생성 금지.
- `remainingAvailableToday(now, dayEndTime, todayItems, entries)`: 하루 종료 시각까지 남은 분 − 미수행 고정 일정 계획 분(음수면 0 표시하되 실제값은 분석용으로 보존).
- 타이머: 시작 시 `entries`에 `started_at`, 종료 시 `ended_at`, `duration_min` 계산. 앱이 종료되어도 진행 중 타이머는 DB 기준으로 복원.
- 계획 합계 경고: `total ≠ 168h`일 때 초과/미배분 계산. 경고만, 차단 없음.
- 모든 계산은 시간대 Asia/Seoul 고정(설정으로 바꿀 수 있게 상수화).

---

## 7. 알림과 딥링크 (Phase 1)

- 라이브러리: `expo-notifications`의 로컬 예약 알림. 원격 푸시는 Phase 1 범위 아님.
- 기본 알림: 매일 설정 시각(기본 21:30) "오늘 기록이 아직 끝나지 않았습니다" → 탭 시 `오늘 종료` 화면으로 딥링크(`expo-router` 경로, 예 `/today/close`).
  - 이미 `day_closures`에 오늘 종료가 있으면 그날 알림은 취소(사용자 설정으로 항상 받기 선택 가능).
- 항목 알림(선택): `item_schedules.start_time`이 있는 항목은 해당 시각 알림 → 해당 항목이 선택된 오늘 화면으로.
- 타이머 알림(선택): 항목 상한(level_max) 도달 시 1회 알림(정보 제공, 타이머는 멈추지 않음).
- 구현 필수사항:
  - Android 알림 채널 생성(없으면 조용히 실패함), importance HIGH.
  - 권한 요청은 온보딩에서 1회 + 설정에서 재요청 경로.
  - 반복 알림은 플랫폼 공통 트리거(DAILY/WEEKLY) 사용. iOS 전용 CALENDAR 트리거 금지.
  - 앱 시작 시 예약 상태 점검·재예약(재설치·재부팅 대비). 예약 ID는 settings에 보관.
  - 콜드 스타트(앱이 꺼진 상태)에서 알림 탭 처리: 마지막 알림 응답을 읽어 딥링크 라우팅.
  - 실기기 테스트 필수(시뮬레이터·Expo Go만으로 완료 판정 금지). 로컬 알림은 Expo Go에서도 동작하지만 최종 검증은 개발 빌드(dev build)에서 한다.

---

## 8. 동기화 (Phase 2) — Supabase

- 목표: 백업·복구·다기기(휴대폰+추후 웹)·봇 연동의 공용 저장소. **로컬이 진실의 원천이며, 동기화 실패가 기록을 막지 않는다(I-7).**
- 인증: 단일 사용자. 이메일 OTP/매직링크 또는 소셜 로그인 중 사용자가 고른 것(질문 영역). 세션은 기기에 유지.
- 스키마: SQLite 테이블을 Postgres에 미러링 + `user_id` + RLS(본인 행만).
- 동기화 엔진 선택(자율 영역, 단 아래 조건 충족 시): 자체 outbox + `updated_at` 최종쓰기승(last-write-wins) + 삭제 묘비(tombstone), 또는 검증된 라이브러리(Legend-State, WatermelonDB, RxDB, PowerSync 등). 조건:
  - 오프라인 기록 → 온라인 복귀 시 자동 전송
  - 충돌은 조용히 덮어쓰지 않고 `충돌 로그`에 남김(사용자가 설정에서 확인)
  - `지금 동기화` 수동 버튼과 마지막 동기화 시각 표시
  - 로컬 데이터 손실 0(마이그레이션·재로그인 포함)
- 선택한 방식과 이유는 `docs/DECISIONS.md`에 기록.
- 참고: Expo 공식 Supabase 가이드, Supabase의 Expo RN 퀵스타트, Expo의 local-first 가이드(§13).

---

## 9. Telegram 봇(Phase 3)과 AI 분석(Phase 4)

### 9.1 Telegram 봇 — 같은 데이터베이스의 두 번째 인터페이스
- 원칙: 앱과 봇을 경쟁시키지 않는다. 봇은 Supabase에 쓰고, 앱은 동기화로 받는다(또는 앱이 봇 이벤트를 구독). 모든 봇 기록은 `source='telegram'` 또는 `'voice'`.
- 보안: `ALLOWED_CHAT_ID`와 일치하는 대화만 처리. 토큰·키는 서버 환경변수. 앱에 봇 토큰을 넣지 않는다.
- 호스팅: Supabase Edge Function(웹훅) 또는 소형 서버(Cloudflare Workers/VPS) — 자율 영역. 예약 발송은 cron.
- 기능:
  - 예약 메시지(기본 21:30, 설정 연동): 오늘 기록 요약 + 버튼 `[오늘 종료] [수정] [나중에]`. 버튼 한 번으로 앱 데이터 갱신(오늘 종료 스냅샷 생성).
  - 명령: `/today`(오늘 요약), `/study 90`(편입 90분 추가), `/log <항목> <분>`, `/done <항목>`, `/count <항목>`, `/end`(오늘 종료), `/plan`(이번 주 계획 요약), `/week`(주간 표).
  - 자유 문장: 규칙 기반 파서 우선("운동 완료", "편입 1시간 20분") → 실패 시 AI 구조화(JSON) → **확인 버튼 후 기록**(정확한 명령 구문은 즉시 기록, 자유 문장은 확인 필수).
  - 음성 메시지: 음성 파일 → 전사(transcription) → 동일 파이프라인 → 확인 후 기록. 예: "오늘 편입 세 시간 반 했고 코디세이 네 시간 정도 했어" → 편입 210분, 코디세이 240분 제안.
  - 봇은 판정 문구를 쓰지 않는다(I-3, I-13). 요약은 숫자와 항목명으로만.

### 9.2 AI 분석 서비스
- 제공자 중립 클라이언트(OpenAI/Anthropic/기타 호환). 사용자 API 키는 기기 보안 저장소(expo-secure-store)에만 보관. 봇 경유 분석은 서버 환경변수 키 사용.
- 데이터 첨부기(packager): 선택 기간의 계정/계획 버전/기록 집계(일·주 단위)/항목별 실제/프로젝트 KPI/하루 메모/주간 코멘트를 JSON으로 구성. 토큰 예산을 넘으면 집계 수준을 올리고(일→주) 원문 메모는 최근 것부터 포함. 실제 전송 데이터는 `analysis_sessions.data_snapshot_json`에 저장(투명성).
- 분석 시스템 프롬프트의 고정 규칙(코드에 상수로 두고 테스트로 보호):
  1. 첨부된 데이터와 계산에 근거해서만 답한다. 데이터가 부족하면 부족하다고 말한다.
  2. 어떤 숫자를 썼는지 밝힌다(기간, 계정, 합계).
  3. 결론은 선택지로 제시한다. 결정은 사용자가 한다.
  4. 사용자의 성향·심리·동기·위험을 서술하지 않는다. 도덕적·격려적·질책적 표현을 쓰지 않는다(I-13).
  5. 변경을 "적용했다"고 말하지 않는다. 제안은 구조화된 `proposals` 배열로 함께 반환한다.
  6. 감정이나 과거 프로파일이 아니라 누적 데이터로 답한다.
- 출력 형식: `{ "answer": "...", "numbers_used": [...], "proposals": [ { "kind": "plan_change", "payload": {...}, "rationale": "..." } ] }`. 파싱 실패 시 원문 표시 + 제안 없음.
- 제안 적용: `적용` 버튼 → 해당 변경을 새 계획 버전/항목 설정으로 반영, `ai_proposals.status='applied'`, `source='ai_applied'`.
- 비용 표시: 세션별 토큰/추정 비용을 설정에서 볼 수 있게.

---

## 10. 에이전트 작업 프로토콜 (하네스)

### 10.1 시작 조건
1. 이 문서 전체를 읽는다.
2. `docs/` 폴더에 다음 파일을 만든다: `PLAN.md`, `DECISIONS.md`, `QUESTIONS.md`, `CHANGELOG.md`, `TESTPLAN.md`, `FUTURE.md`.
3. 저장소 루트에 `README.md`(실행 방법, 개발 빌드 방법, 환경변수 목록)를 만든다.

### 10.2 계획서(`docs/PLAN.md`) 작성 규칙
- 단계별(Phase 1→5) 체크리스트. 각 체크 항목은 §11의 수용 기준 번호와 연결한다.
- 각 단계의 "게이트 통과 증빙" 칸을 둔다(명령 출력, 스크린샷 경로, 테스트 결과).
- 사용자가 순서를 바꾸면 PLAN.md를 고치고 CHANGELOG에 기록.

### 10.3 단계 게이트 (다음 단계로 가기 전 전부 통과)
- `tsc --noEmit` 오류 0, ESLint 오류 0.
- 도메인 계산(§6) 단위 테스트 통과, 커버리지는 도메인 모듈 기준 90% 이상.
- 해당 단계의 수용 기준(§11) 전부 "통과" 또는 "사용자 승인된 보류".
- `TESTPLAN.md`의 수동 테스트를 실기기(또는 최소 개발 빌드)에서 수행하고 결과 기록.
- `expo-doctor` 경고 검토(무시한 경고는 이유 기록).
- 게이트 결과를 §10.7 형식으로 보고.

### 10.4 정지 조건 — 작업을 멈추고 `docs/QUESTIONS.md`에 적은 뒤 사용자 답을 기다린다
- 스택(I-12) 변경이 필요해 보일 때.
- 어떤 구현이 불변조건(§2)과 충돌할 때(예: 어떤 라이브러리가 입력 차단을 강제).
- 사용자 입력을 제한·차단·경고 이상으로 막아야만 구현되는 기능.
- 데이터 삭제·병합·마이그레이션에서 데이터 손실 가능성이 있을 때.
- 비용이 발생하는 외부 서비스(유료 플랜, API 과금) 도입.
- 인증 방식, 동기화 충돌 정책, AI 제공자 등 사용자 선호가 필요한 결정.
- 명세의 모호함이 제품 동작(사용자가 보는 행동)을 바꿀 때. 기술 내부의 모호함은 자율로 결정하고 DECISIONS에 기록.
- 메타설계와 이 문서가 충돌할 때.
- 한 단계의 작업량이 처음 계획의 2배를 넘어설 때(범위 드리프트 점검 목적).

질문은 번호·맥락·선택지·에이전트의 기본 제안·결정 전 임시 조치를 포함한다. 답이 올 때까지 다른 독립 작업은 계속한다.

### 10.5 금지 목록 — 어떤 이유로도 하지 않는다
- 게임화 요소 추가(연속일수 배지, 점수, 레벨, 보상, 칭찬/질책 문구).
- 숫자·집계 숨기기, "사용자 보호" 명목의 정보 축소.
- 저장 차단, 초과 계획 금지, 항목 추가 강제 차단.
- 사용자를 평가·서술하는 문구(UI, 주석, 프롬프트, 로그 어디든).
- 스택 교체, 원격 텔레메트리 추가, 광고/계정 연동 추가.
- 기능을 "단순화"한다며 불변조건에 연결된 기능을 제거.
- 명세 밖 기능을 임의 구현(아이디어는 `docs/FUTURE.md`에만 적는다).
- 테스트를 통과시키기 위한 테스트 약화, 게이트 건너뛰기.
- 비밀값(토큰·키)을 코드·저장소·앱 번들에 포함.

### 10.6 코드 품질 최소선
- TypeScript strict, `any` 금지(불가피하면 주석으로 이유).
- 마이그레이션은 버전 번호 + 상향 스크립트. 파괴적 변경 없음.
- 도메인 계산은 UI와 분리된 순수 함수. 저장소 접근은 repository 계층으로.
- 커밋은 작게, 메시지는 "무엇/왜". 각 단계 끝에 태그.
- 접근성: 터치 영역 44pt 이상, 대비 충분, 폰트 크기 설정 존중.

### 10.7 보고 형식 (단계 끝·게이트 시·질문 발생 시)
```
[단계] Phase N — 상태: 진행중/게이트통과/대기(질문 #k)
[완료] 수용 기준 번호 목록 + 증빙 경로
[미완/보류] 번호 + 이유
[결정] DECISIONS.md 신규 항목 요약
[질문] QUESTIONS.md 미답 항목 요약
[다음] 다음 작업 1~3개
```

### 10.8 범위 드리프트 방지
- 새로 떠오른 좋은 아이디어는 구현하지 않고 `FUTURE.md`에 적는다.
- 명세에 없는 화면·필드·자동화는 사용자 승인 없이 만들지 않는다.
- "편의상" 불변조건을 어기는 임시 코드를 두지 않는다(TODO로 남기는 것도 금지).

---

## 11. 수용 기준 (Acceptance Criteria)

### Phase 1 — 초안(v0.1)
- AC-1 앱이 개발 빌드로 사용자 휴대폰(iOS 또는 Android, 사용자 지정)에 설치되고 아이콘으로 실행된다.
- AC-2 첫 실행 시 §4.4 시드가 생성되고, 모든 시드는 편집·보관·삭제 가능하다.
- AC-3 오늘 화면에서 타이머 시작이 1탭, 정지 1탭, 완료형/횟수형 기록 1탭, 수동 시간 입력 2~3탭으로 된다.
- AC-4 다섯 유형(time/completion/count/numeric/event) 각각 항목을 만들고 기록·수정·삭제·복구할 수 있다.
- AC-5 일정 규칙이 있는 항목(통학 등)이 해당 요일 오늘 화면에 자동 표시되고 중복 생성되지 않는다.
- AC-6 오늘 화면 상단에 남은 가용시간과 오늘 계획→실제 합계가 표시된다.
- AC-7 오늘 종료 화면에서 자동 계산 결과가 보이고 한 줄 메모(무제한 확장)가 저장되며, 종료 후에도 기록 수정이 가능하다.
- AC-8 주간 화면에 계정별 계획/실제/차이 표와 총계 행이 표시되고, 계정 행에서 항목·요일 분해가 열린다.
- AC-9 계획 화면에서 숫자를 바꾸면 실시간 합계와 초과/미배분 배지가 즉시 갱신되며, 168h가 아니어도 "그대로 저장"이 가능하다(차단 없음).
- AC-10 계획 저장마다 새 버전이 생성되고 버전 이력 열람·복원이 가능하다.
- AC-11 `지난주 계획 복사`가 1탭으로 동작한다.
- AC-12 프로젝트를 만들고 KPI를 선택·추가하고 값을 1~2탭으로 기록하며, 누적 투입시간이 연결 항목에서 파생되어 표시된다.
- AC-13 매일 설정 시각(기본 21:30)에 로컬 알림이 오고, 탭하면 앱이 꺼져 있어도 오늘 종료 화면으로 이동한다(실기기 검증).
- AC-14 Android 알림 채널·권한 처리, 앱 재시작 후 알림 재예약이 동작한다.
- AC-15 설정에서 JSON 전체 내보내기와 CSV 테이블별 내보내기가 되며, 내보낸 파일에 소프트 삭제 행과 계획 전 버전이 포함된다.
- AC-16 비행기 모드에서 모든 기록이 동작한다.
- AC-17 UI 어디에도 판정 문구·점수·연속일수 강조가 없다(수동 점검 체크리스트).
- AC-18 §6 계산 규칙의 단위 테스트가 존재하고 통과한다(주 경계, 168 합계, 차이, 자정 넘는 타이머, 요일 템플릿, 남은 가용시간).

### Phase 2 — 동기화
- AC-19 로그인 후 로컬 데이터가 Supabase에 올라가고, 앱 재설치 후 복구된다.
- AC-20 오프라인 기록 → 온라인 복귀 시 자동 동기화, 충돌은 로그에 남는다.
- AC-21 `지금 동기화`와 마지막 동기화 시각 표시.
- AC-22 RLS로 본인 행만 접근.

### Phase 3 — Telegram
- AC-23 허용된 chat_id만 처리. 다른 대화는 무응답 또는 거절.
- AC-24 21:30 예약 메시지에 오늘 요약과 `[오늘 종료][수정][나중에]` 버튼이 오고, 버튼이 앱 데이터를 갱신한다.
- AC-25 `/study 90` 등 명령이 즉시 기록되고 앱에 반영된다(`source='telegram'`).
- AC-26 자유 문장과 음성은 구조화 제안 후 확인 버튼을 거쳐 기록된다.

### Phase 4 — AI 분석
- AC-27 여섯 분석 모드와 기간 선택, 데이터 자동 첨부, 세션 저장이 동작한다.
- AC-28 응답의 제안 카드에 `적용`이 있고, 적용 시 새 계획 버전(`source='ai_applied'`)이 생기며 적용 전에는 데이터가 바뀌지 않는다.
- AC-29 분석 프롬프트 고정 규칙(§9.2)이 코드 상수로 존재하고 테스트로 보호된다. 출력에 사용자 성향·심리 서술이 없는지 샘플 점검 절차가 TESTPLAN에 있다.
- AC-30 §5.7의 예시 질문들에 대해 실제 저장 데이터 기반 답이 생성된다(샘플 데이터로 검증).

---

## 12. 문구 가이드 (UI·알림·봇·AI 공통)

- 서술형·정보형으로 쓴다: "계획 4h 30m · 실제 2h 40m · 차이 −1h 50m".
- 금지: "잘했어요", "아쉬워요", "N일 연속!", "무너지지 마세요", "~하는 경향이 있어요", "~를 조심하세요", 이모지 보상.
- 경고는 사실+선택지: "현재 계획 173h(초과 +5h). 조정하기 / 그대로 저장".
- 빈 상태: "이번 주 계획이 없습니다. 지난주 계획 복사 / 새로 만들기".
- 알림: "오늘 기록이 아직 끝나지 않았습니다. 탭하면 오늘 종료로 이동합니다."
- 봇 요약: 항목명과 숫자만. 해석 없음.

---

## 13. 기술 참고 (에이전트가 확인할 1차 문서)

- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/ — 로컬 예약 알림, 트리거 유형, Android 채널. (원격 푸시는 Android SDK 53+에서 Expo Go 미지원 → 개발 빌드 필요. 로컬 알림은 Expo Go 가능하나 최종 검증은 개발 빌드.)
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Router(딥링크 포함): https://docs.expo.dev/router/introduction/
- Expo 로컬 우선 가이드: https://docs.expo.dev/guides/local-first/
- Expo × Supabase 공식 가이드: https://docs.expo.dev/guides/using-supabase/
- Supabase Expo RN 퀵스타트: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase 오프라인 우선(WatermelonDB) 예시: https://supabase.com/blog/react-native-offline-first-watermelon-db
- Supabase × Legend-State 로컬 우선: https://supabase.com/blog/local-first-expo-legend-state
- Telegram Bot API: https://core.telegram.org/bots/api — `sendMessage`, `InlineKeyboardMarkup`, `callback_query`, 웹훅, 음성 파일 다운로드
- expo-secure-store: https://docs.expo.dev/versions/latest/sdk/securestore/
- EAS Build / 개발 빌드: https://docs.expo.dev/develop/development-builds/introduction/

---

## 14. 사용자 결정 필요 목록 (에이전트는 기본값으로 시작하고, 답이 오면 반영)

| 항목 | 기본값 | 비고 |
|---|---|---|
| 대상 휴대폰 OS | 양쪽 빌드 준비, 실기기 검증은 사용자 기기 | iOS면 개발자 계정/개발 빌드 절차 안내 필요 |
| 주 시작 요일 | 월요일 | 설정에서 변경 가능 |
| 하루 종료 시각 | 23:00 | 남은 가용시간 계산용 |
| 오늘 종료 알림 시각 | 21:30 | 설정에서 변경 가능 |
| 초기 계정·예산 | §4.4 표 | 언제든 수정 |
| Supabase 프로젝트 | 사용자 생성 | Phase 2 전 필요 |
| 인증 방식 | 이메일 매직링크 | Q-007 사용자 확정 |
| Telegram 봇 토큰·chat_id | 사용자 발급 | Phase 3 전 필요 |
| AI 제공자·모델·키 | 미정 | Phase 4 전 필요 |
| 앱 이름·아이콘 | 임시 "POS" | 사용자 지정 |

---

## 15. 킥오프 프롬프트 (사용자가 에이전트에게 붙여 넣을 첫 지시문)

```
너는 이 저장소의 구현 에이전트다. docs/SPEC.md(이 문서)를 끝까지 읽고 §10의 작업 프로토콜을 따른다.
1) 코드를 쓰기 전에 docs/PLAN.md, DECISIONS.md, QUESTIONS.md, CHANGELOG.md, TESTPLAN.md, FUTURE.md와 README.md를 먼저 만든다.
2) Phase 1(초안 v0.1)부터 시작한다. §2 불변조건은 변경 권한이 없다. §10.4 정지 조건에 해당하면 멈추고 QUESTIONS.md에 적은 뒤 나에게 묻는다. 기술 내부 결정은 자율로 하고 DECISIONS.md에 기록한다.
3) 각 단계는 §10.3 게이트를 전부 통과한 뒤에만 다음 단계로 간다. 보고는 §10.7 형식으로 한다.
4) 명세 밖 기능은 만들지 말고 FUTURE.md에만 적는다. 게임화·판정 문구·숫자 숨기기·저장 차단·사용자 서술은 어떤 경우에도 금지다.
5) 지금 첫 보고로 PLAN.md 초안과 QUESTIONS.md의 초기 질문(§14 기준)을 보여라.
```

---

## 16. 정의
- **초안(v0.1) 완성**: Phase 1의 AC-1~AC-18 전부 통과 + 게이트 통과 + 사용자 기기에 설치되어 하루치 실제 기록이 문제없이 수행됨.
- **메타설계**: 사용자가 확정한 "개인 운영체제" 방향 문서. 이 명세서의 상위 문서.
- **하네스**: 이 문서의 §2, §10, §11, §12 — 에이전트가 자율적으로 일하되 벗어나지 않게 하는 경계와 검증 장치.
