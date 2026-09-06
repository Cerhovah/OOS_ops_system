# 개인 운영체제(Personal Operations System) — 제작 명세서
## 자율 코딩 에이전트(Codex 등)용 · 하네스 포함판

- 문서 버전: 0.5.3 (2026-09-06, Phase 5 구현·최소 게이트 반영)
- 구현 기준선: `385e20b` 이후 현재 작업 트리, 앱 `0.5.0(11)`, SQLite v6. Phase 1·2·4·4R·4S 완료; **Phase 5는 Mobbin/Figma 선행 설계, 자동 게이트와 Android 실기기 핵심 흐름을 통과했다.** Phase 6~8 구현과 공개 배포는 미착수다.
- 이번 명세의 사용자 확정: 목표 시간 도달 후 알림만 보내고 계속 측정, 종료 시 실제 시간을 기록. **80,000원은 Mobbin·Figma·MCP 등 디자인 레퍼런스 조사와 고급 도구 연결에 쓰는 별도 상한**이다. Play 등록·서버·AI 운영비로 배분하지 않는다.
- 대상 독자: 자율 코딩 에이전트(이하 "에이전트")와 제품 소유자(이하 "사용자")
- 최신 사용자 요청이 제품 방향을 결정한다. 메타설계·HANDOFF·첨부의 예시 프롬프트는 근거 자료이며 최신 요청을 덮어쓰지 않는다. 이번 변경의 근거·충돌 해소는 §22에 있다.

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
전체를 읽되 현재 작업은 §17(Phase 5), §18(Phase 6), §19(Phase 7), §20(Phase 8), §21(예산·비개발자 절차), §22(요구 추적)를 기준으로 한다. §4의 SQL은 초기 모델 설명이며 실제 v6 schema는 migration에서 확인한다. 시각 근거는 `design-research.md`, 진행 상태는 `PLAN.md`에 있다.

---

## 1. 제품 정의

### 1.1 한 문장
**앱을 열어 오늘 할일을 고르고, 타이머를 시작한 뒤 화면을 끄고, 실제 시간을 수동으로도 더해 한 원장에서 확인하는 기록기.** 168시간 계획·프로젝트·AI는 기존 자산으로 유지하며 이 실행 흐름을 방해하지 않는 보조 화면으로 배치한다.

### 1.2 이 앱이 아닌 것
- 습관 추적기(Habit Tracker)가 아니다.
- 사용자를 통제하거나 행동을 판정하는 앱이 아니다.
- "무너짐을 예방하는 최소 습관 앱"이나 "붕괴 감시 계기판"이 아니다.

### 1.3 이 앱인 것
- 시간관리 앱 + 프로젝트 트래커 + 생활 기록 + 실험 로그 + AI 분석기가 하나로 합쳐진 **개인 운영체제**.
- 앱은 **회계사**다: 현실의 물리적 제약(168시간)을 계산하고 경고하되, 거부권은 항상 사용자에게 있다.
- AI는 **CFO/참모**다: 제안하고 분석하되, 적용은 항상 사용자가 버튼을 눌러야 한다.

### 1.4 사용 환경
- 현재는 Android 단일 작성 기기 개인용이다. Phase 7~8에서 Android 공개 배포를 준비·수행한다. 공개 앱의 계정 제공 범위는 §19.1의 변형 계약을 따른다. iOS 호환 소스는 유지하되 이번 예산에 iOS 출시를 포함하지 않는다.
- 아이콘을 누르면 열리고, OS 알림이 오고, 오프라인에서도 기록된다.
- UI 언어: 한국어. 시간대: Asia/Seoul.

---

## 2. 불변조건 (Invariants) — 변경 불가, 모든 단계에 적용

| 번호 | 불변조건 | 구현상 의미 |
|---|---|---|
| I-1 | **사용자 주권**: 유효한 계획·실제 기록의 저장을 임의로 막지 않는다. | 168h 초과·초과 시간·임의 과거 날짜를 저장할 수 있다. 형식 오류, 처리 중 중복 mutation, 타인 데이터 접근 거부는 별도다. 새 집중 타이머는 하나로 조정하며 전환 시 현재 시간 저장/계속 선택을 제공한다. 수동 기록은 동시에 가능하다. |
| I-2 | **데이터 투명성**: 숫자를 삭제하거나 판정 목적으로 숨기지 않는다. | 오늘은 실행, 기록은 날짜별 계획/실제/차이와 남은 가용시간, 주간은 주간 숫자를 보여준다. 이동한 집계는 명시적 진입점으로 접근 가능하다. 원자료가 없는 과거 계획은 0을 만들어내지 않고 미보존으로 표시한다. |
| I-3 | **판정 언어 금지**: "잘했다/못했다", 점수, 등급, 연속일수 강조, 색으로 하는 도덕적 판정 없음. | 표시하는 것은 계획 / 실제 / 차이(±). 차이는 부호와 숫자로만. 강조색은 정보 구분용이지 칭찬·질책용이 아니다. |
| I-4 | **항목 유형 다양성**: 시간형·완료형·횟수형·수치형·이벤트형을 별도로 지원한다. | 모든 항목을 하나의 습관 모델에 끼워 넣지 않는다. 각 유형은 고유한 기록 UI와 집계 규칙을 가진다. |
| I-5 | **목표 수준은 사용자 설정**: 최소/목표/상한은 각각 선택적이며 강제되지 않는다. | 항목마다 min/target/max 중 아무것도 안 넣어도, 하나만 넣어도 된다. 미달/초과는 정보로만 표시한다. |
| I-6 | **AI 제안 → 사용자 적용**: AI는 데이터를 직접 쓰지 않는다. | AI 출력은 "제안" 객체로 저장되고, 사용자가 "적용" 버튼을 눌러야 데이터에 반영된다. 적용된 변경도 이력으로 남는다. |
| I-7 | **로컬 우선(local-first)**: 인터넷 없이도 모든 기록이 가능하다. | 기본 저장소는 기기 내 SQLite. 동기화는 부가 기능이며 실패해도 기록은 유지된다. |
| I-8 | **데이터 소유권**: 전체 내보내기(CSV/JSON), 수정·삭제 가능, 계획 수정 이력 전부 보존. | 일반 기록 삭제는 소프트 삭제(복구 가능), 계획은 버전으로 누적, 내보내기에 모든 테이블 포함. 사용자가 요청한 전체 초기화/복구 교체 및 공개 계정 영구 삭제는 §19의 명시적 별도 절차를 따른다. |
| I-9 | **기록 비용 상한**: 준비된 오늘 시트에서 타이머 시작 1탭, 종료 1탭, 기본 수동 기록 3탭 이내. | 앱 아이콘 1탭은 별도 표기. 기본값·칩 경로는 5~10초 이내, 임의 날짜·메모·키보드 경로는 추가 조작 수를 숨기지 않고 별도 측정한다. 모달 중첩 금지. |
| I-10 | **알림은 앱 자체 로컬 예약 알림**, 탭하면 해당 화면으로 딥링크. | expo-notifications 로컬 스케줄 알림 사용. 휴대폰 기본 알람에 의존하지 않는다. |
| I-11 | **메모는 기본 짧게, 길이 제한 없음.** | 한 줄 입력이 기본 UX이되 확장 가능. 글자 수 상한 없음. |
| I-12 | **기술 스택 고정**: Expo/React Native + expo-sqlite(로컬) + Supabase(동기화) + AI 분석 서비스. | 스택 변경은 질문 영역. 스택 안에서의 보조 라이브러리 선택은 자율 영역. |
| I-13 | **사람에 대한 서술 금지**: UI 문구, 코드 주석, AI 분석 프롬프트·출력 어디에도 사용자의 성향·심리·동기·위험에 대한 서술을 넣지 않는다. | AI 분석은 저장된 데이터·계산·선택지만 말한다. "~하는 경향이 있다", "~를 조심해야 한다" 류의 문장은 생성·표시하지 않는다. |
| I-14 | **레퍼런스·고급 도구 예산 80,000원**: Mobbin·Figma·관련 MCP 연결/사용에 우선 배정한다. | 앱스토어 등록·서버·AI 운영비와 별도다. 무료 기능을 먼저 확인하고, 유료 도구는 실제 결제 총액과 자동 갱신을 확인해 합계 80,000원을 넘지 않는다. 예산을 쓰는 목적은 핵심 4화면의 실제 레퍼런스 조사와 구현 전달력을 높이는 것이다. |

---

## 3. 범위와 단계

### 3.1 전체 범위(모두 이 제품의 일부)
A. 오늘 화면(기록기) · B. 주간 화면(계획 vs 실제 회계) · C. 프로젝트 화면(KPI) · D. 계획 화면(168시간 편집) · E. 분석 화면(AI 질의) · F. 설정 · G. 로컬 알림+딥링크 · H. 로컬 DB+이력+내보내기 · I. Supabase 동기화/백업 · J. AI 분석 서비스 · K. (후순위) 웹 대시보드, 외부 데이터 연동(GitHub 등)

### 3.2 제작 단계(에이전트의 작업 순서 제안 — 사용자가 순서를 바꿀 수 있음)
- **Phase 1 — 초안(v0.1)**: A, B, C, D, F, G, H. (이 단계가 끝나면 "초안 완성"으로 본다.)
- **Phase 2 — 동기화**: I.
- **Phase 3 — 철회됨**: Telegram 보조 인터페이스는 2026-09-03 사용자 지시로 제품 범위에서 제거했다. 다음 단계의 선행 게이트가 아니다.
- **Phase 4 — 분석**: E, J.
- **Phase 4R — 동작 보존 리팩터**: Phase 1·2·4의 사용자 동작과 데이터를 유지하면서 저장소·동기화·화면·분석 경계를 분리하고 보안·재현성 회귀 게이트를 통과한다.
- **Phase 4S — 개인용 standalone**: Android에서 PC·Metro 없이 실행되는 비개발용 개인 설치 빌드와 오프라인 콜드 스타트·온라인 복귀를 검증한다. 앱 스토어 공개 배포·결제는 포함하지 않는다.
- **Phase 5 — UI/UX 개선**: 오늘/기록 2탭, 자동 할일 시트·재열기 버튼, 미니멀 토큰·원장·기존 기능 진입 재배치. 기존 타이머 의미는 이 단계에서 보존한다(§17).
- **Phase 6 — 주요 기능 추가**: 계획 기반 카운트다운→초과 측정, 일시정지/재개, 신뢰 가능한 알림·복구, 수동 시간/날짜 입력, 출처·과거 계획 보존(§18).
- **Phase 7 — 배포 준비**: production 빌드·업그레이드/복구·권한/정책·비공개 테스트·예산·운영 절차(§19).
- **Phase 8 — 공개 배포 및 유지보수 리팩터**: 배포 전 필수 구조 정리, Play 공개 출시, 장애 대응·업데이트·장기 데이터 성능/복구 검증(§20).

각 단계는 §10.3의 게이트를 통과해야 다음 단계로 간다. 단계 안에서의 순서는 에이전트 자율.

### 3.3 비목표(이번 명세에서 만들지 않음)
- 팀 협업, 소셜 기능, 공유 리더보드, 동시 다기기 작성(별도 정책 확정 전)
- 게임화 요소(연속일수 배지, 점수, 레벨, 보상)
- 광고, 분석용 원격 수집(텔레메트리)
- 결제·구독·광고 수익화, 웹 대시보드, 건강/외부 API 연동, AI 기능 고도화. **공개 배포 준비와 공개 출시 자체는 Phase 7~8 범위**다. FUTURE 등록은 자동 구현 승인이 아니다.

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
- **기록(Entry)**: 타임스탬프가 있는 실제 데이터. 시간/완료/횟수/수치/이벤트 모두 기록으로 저장. `source`로 입력 경로(app/import/ai_applied) 구분.
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

## 5. 화면 의미와 Phase 4S 기준선

§5.1~5.2는 Phase 5부터 아래 규칙으로 대체한다. §5.3~5.8의 기능 의미는 유지하며 진입 위치는 §17.2로 옮긴다. 과거 화면 배치를 회귀 기준으로 강제하지 않는다.

### 5.1 공통
- 하단 탭은 **오늘 / 기록**. 주간·프로젝트·계획·분석·설정은 `기록 > 더보기`로 이동한다. 오늘 시트의 `할일 추가`는 항목 관리로도 연결한다.
- 모든 숫자는 계획 / 실제 / 차이(±)로 일관되게 표시(I-2, I-3).
- 어떤 화면에서도 "저장 불가" 상태를 만들지 않는다(I-1). 경고는 배너 또는 인라인 텍스트로.

### 5.2 오늘(Today) — 첫 화면
**Phase 5 이후 목적**: 저장된 할일을 확인하고 선택해 작업을 시작한다. 정확한 새 화면은 §17.3. 아래 구성/동작은 Phase 4S의 역사적 기준선이며 새 화면에 그대로 구현하지 않는다.
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

### 5.4 주간(Week) — 기록의 보조 상세
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
- 기간 선택(기본: 최근 4주), 데이터 자동 첨부(§9.1), 질문 입력.
- 결과 표시 + 제안 카드(`적용` / `무시`). 적용은 사용자 버튼으로만(I-6).
- 세션 이력 저장·검색.
- 예시 질문(이 앱이 답할 수 있어야 하는 것): "최근 8주를 보고 편입 시간을 25시간 계속 유지하는 게 맞는지 분석해", "제품 개발시간이 매출이나 사용자 증가와 관계가 있었는지 봐", "내 예상시간과 실제시간 오차가 가장 큰 활동은?", "이번 달에 계획만 세우고 완료하지 못한 프로젝트는?"

### 5.8 설정(Settings)
- 주 시작 요일, 하루 종료 시각, 알림 시각(오늘 종료 알림 기본 21:30), 항목별 알림 on/off
- 계정·항목·프로젝트 관리
- 데이터: 내보내기(JSON 전체 + CSV 테이블별), 삭제된 기록 보기/복구, 전체 초기화(2단계 확인)
- 동기화(Phase 2): 로그인, 마지막 동기화 시각, `지금 동기화`, 충돌 로그
- AI(Phase 4): 확정 제공자·모델, 서버 연결 상태, 데이터 첨부 범위 기본값, 비용 표시. API 키는 모바일에 저장하지 않는다.
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

## 7. 알림과 딥링크 (기존 기능)

Phase 6 목표 시간 알림은 §18.4가 우선한다. 아래 level_max 알림과 목표 시간은 서로 다른 개념이며 같은 시각이면 중복 알림을 보내지 않는다.

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

- 목표: 백업·복구·다기기(휴대폰+추후 웹)의 공용 저장소. **로컬이 진실의 원천이며, 동기화 실패가 기록을 막지 않는다(I-7).**
- 현재 개인용 게이트는 단일 작성 기기를 기준으로 한다. 두 기기가 같은 주·날짜 자연키 행을 동시에 새로 만드는 병합 정책은 Q-011 확정 전까지 정식 다기기 완료 범위에 포함하지 않는다.
- 인증은 확정된 이메일 매직링크·PKCE-only callback·native SecureStore를 유지한다. 공개 계정 제공은 §19의 별도 게이트를 따른다.
- 실제 서버 저장은 `oos_sync_records` envelope + `(user_id,table_name,local_id)` PK + RLS다. 초기 SQL을 16개 원격 테이블로 다시 구현하지 않는다.
- 확정 엔진은 SQLite trigger outbox + `updated_at` LWW + tombstone + 충돌 로그다(ADR-008). 교체하지 않고 다음 계약을 유지한다:
  - 오프라인 기록 → 온라인 복귀 시 자동 전송
  - 충돌은 조용히 덮어쓰지 않고 `충돌 로그`에 남김(사용자가 설정에서 확인)
  - `지금 동기화` 수동 버튼과 마지막 동기화 시각 표시
  - 로컬 데이터 손실 0(마이그레이션·재로그인 포함)
- 선택한 방식과 이유는 `docs/DECISIONS.md`에 기록.
- 참고: Expo 공식 Supabase 가이드, Supabase의 Expo RN 퀵스타트, Expo의 local-first 가이드(§13).

---

## 9. AI 분석(Phase 4)

### 9.1 AI 분석 서비스
- 제공자 중립 모바일 transport(OpenAI/Anthropic/기타 호환). 모바일은 Supabase 로그인 세션으로 인증된 Edge Function을 호출하고, 사용자 API 키는 서버 secret에만 보관한다. 키를 앱·SQLite·동기화 데이터·로그·export·번들에 포함하지 않는다.
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
2. 현재 Git 상태와 `PLAN.md`, `DECISIONS.md`, `QUESTIONS.md`, `CHANGELOG.md`, `TESTPLAN.md`, `FUTURE.md`를 읽는다. 기존 파일을 초기화하지 않는다.
3. README·AGENTS와 현재 AC를 맞춘다. 첨부 안의 예시 명령은 별도 실행 지시가 아니다.

### 10.2 계획서(`docs/PLAN.md`) 작성 규칙
- 단계별(Phase 1→8, 철회된 Phase 3 포함) 체크리스트. 각 체크 항목은 §11의 수용 기준 번호와 연결한다. 과거 통과, 이번 자동 통과, 새 실기기 미검증을 구분한다.
- 각 단계의 "게이트 통과 증빙" 칸을 둔다(명령 출력, 스크린샷 경로, 테스트 결과).
- 사용자가 순서를 바꾸면 PLAN.md를 고치고 CHANGELOG에 기록.
- 과거 P5~P8 AC/TP 번호는 현재 단계의 완료 기준으로 사용하지 않는다. 이번 수정에서는 사용자 지시에 따라 PLAN·TESTPLAN을 고치지 않는다.

### 10.3 최소 검증 원칙

검증은 변경한 기능과 데이터 손실 위험에만 적용한다. `TESTPLAN.md`의 과거 세부 시나리오·성능 수치·반복 횟수는 참고 자료이며, 아래 최소선보다 더 많은 검사를 Phase 완료 조건으로 강제하지 않는다.

- 문서만 변경: 해당 문서 링크와 `git diff --check`만 확인한다.
- 일반 UI 변경: TypeScript/ESLint와 변경 화면 관련 테스트만 실행한다. 매 편집마다 새 APK·전체 DB·원격 서버 검사를 반복하지 않는다.
- 타이머·집계·SQLite 변경: 관련 단위/저장 테스트와 기존 데이터가 보존되는 migration 검사를 실행한다.
- Phase 5 종료: Android 개발 빌드 한 번에서 `오늘의 할일 확인 → 선택/시작 → 종료 → 직접 기록 → 원장 확인`을 확인한다.
- Phase 6 종료: 같은 기기에서 화면 끄기 후 시간 복원, 일시정지/재개, 작업 전환, 목표 알림 후 계속 측정, 종료 실제시간, 수동 기록을 각각 한 번 확인한다.
- Phase 7~8 출시 후보: production 산출물의 설치/업데이트, 기존 기록 보존, export/restore, 공개판의 개인 서버 설정 미포함만 확인한다. Play가 실제로 요구하는 계정·정책 검사는 제출 시점에만 수행한다.
- 전체 `npm run verify`는 Phase 종료, dependency/native/schema/sync 계약 변경, 또는 관련 회귀가 의심될 때만 실행한다. 커버리지 숫자를 올리기 위한 중복 테스트는 만들지 않는다.

반복 기간·반복 횟수·고정 성능 수치는 필수 게이트가 아니다. 실제 문제를 발견했을 때 필요한 범위에서만 진단한다.

### 10.4 정지 조건 — 작업을 멈추고 `docs/QUESTIONS.md`에 적은 뒤 사용자 답을 기다린다
- 스택(I-12) 변경이 필요해 보일 때.
- 어떤 구현이 불변조건(§2)과 충돌할 때(예: 어떤 라이브러리가 입력 차단을 강제).
- 사용자 입력을 제한·차단·경고 이상으로 막아야만 구현되는 기능.
- 데이터 삭제·병합·마이그레이션에서 데이터 손실 가능성이 있을 때.
- 승인된 목적·접근 범위를 넘어서는 서비스 과금·구독·공개 권한 확대. 레퍼런스·MCP 예산 80,000원을 Play·서버·AI 비용으로 전용하거나, 실제 checkout 합계가 예산을 넘을 때. 이미 승인된 행위를 같은 이유로 다시 묻지 않는다.
- 인증 방식, 동기화 충돌 정책, AI 제공자 등 사용자 선호가 필요한 결정.
- 기존 승인과 이 명세의 기본값으로도 풀 수 없는 중요한 제품 모호함이 있을 때. 기술 내부 선택·접근성 예외·기본값 적용은 근거를 기록하며 자율 진행한다.
- 최신 사용자 요청으로 해소되지 않은 상위 자료 충돌이 있을 때. 이번 요청이 명시적으로 바꾼 §22 항목은 재승인 사유가 아니다.
- 한 단계의 작업량이 처음 계획의 2배를 넘어설 때(범위 드리프트 점검 목적).

질문은 번호·맥락·선택지·에이전트의 기본 제안·결정 전 임시 조치를 포함한다. 답이 올 때까지 다른 독립 작업은 계속한다.

### 10.5 금지 목록 — 어떤 이유로도 하지 않는다
- 게임화 요소 추가(연속일수 배지, 점수, 레벨, 보상, 칭찬/질책 문구).
- 숫자·집계 숨기기, "사용자 보호" 명목의 정보 축소.
- 저장 차단, 초과 계획 금지, 항목 추가 강제 차단.
- 사용자를 평가·서술하는 문구(UI, 주석, 프롬프트, 로그 어디든).
- 승인 밖 스택 교체·계정 연동, 원격 텔레메트리·광고 추가. 공개 계정은 §19.1에서 선택한 범위와 추가 게이트를 따르며 개인용 계정 기능은 유지한다.
- 기능을 "단순화"한다며 불변조건에 연결된 기능을 제거.
- 명세 밖 기능을 임의 구현(아이디어는 `docs/FUTURE.md`에만 적는다).
- 테스트를 통과시키기 위한 테스트 약화, 게이트 건너뛰기.
- 비밀값(토큰·키)을 코드·저장소·앱 번들에 포함.

### 10.6 코드 품질 최소선
- TypeScript strict, `any` 금지. 외부 payload는 `unknown`에서 검증한다.
- 마이그레이션은 버전 번호 + 상향 스크립트. 파괴적 변경 없음.
- 도메인 계산은 UI와 분리된 순수 함수. 저장소 접근은 repository 계층으로.
- 커밋은 작게, 메시지는 "무엇/왜". 구현 승인 뒤 1기능 또는 1리팩터 단위로 구분한다. 단계 종료/게시 권한은 `COMMIT_WORKFLOW.md`와 현재 요청을 확인하며, 명세 작성만으로 push·태그·배포를 수행하지 않는다.
- 접근성: Android 핵심 조작 48dp 이상, 본문 대비 4.5:1·큰 글씨/컨트롤 3:1 이상, 200% 글씨와 TalkBack/Reduce Motion을 검증한다.

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
- AC-6 Phase 4S까지 오늘 상단 합계를 검증한 역사적 기준. Phase 5 이후 같은 숫자의 `기록` 이동과 접근성은 §17의 최소 검증으로 확인한다.
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

### Phase 3 — 철회됨
- AC-23~AC-26은 2026-09-03 사용자 지시로 수용 범위에서 제거했다. 앱 자체 로컬 알림(AC-13~AC-14)과 Phase 2 동기화는 유지한다.

### Phase 4 — AI 분석
- AC-27 여섯 분석 모드와 기간 선택, 데이터 자동 첨부, 세션 저장이 동작한다.
- AC-28 응답의 제안 카드에 `적용`이 있고, 적용 시 새 계획 버전(`source='ai_applied'`)이 생기며 적용 전에는 데이터가 바뀌지 않는다.
- AC-29 분석 프롬프트 고정 규칙(§9.1)이 코드 상수로 존재하고 테스트로 보호된다. 출력에 사용자 성향·심리 서술이 없는지 샘플 점검 절차가 TESTPLAN에 있다.
- AC-30 §5.7의 예시 질문들에 대해 실제 저장 데이터 기반 답이 생성된다(샘플 데이터로 검증).

### Phase 4R — 동작 보존 리팩터
- AC-31 Phase 1·2·4의 기존 자동·실기기 수용 결과를 보존하고 전체 자동 게이트에서 회귀가 없다.
- AC-32 SQLite v5 상향이 기존 v4 데이터를 파괴하지 않고, migration과 `user_version`을 원자적으로 적용하며 정확한 settings prefix만 동기화 대상으로 처리한다.
- AC-33 네이티브 인증 세션은 PKCE code callback만 수락하고 SecureStore에 저장한다. 기존 SQLite 평문 세션은 보안 저장소로 먼저 이관한 뒤 제거하며, 실패 시 평문 fallback을 사용하지 않는다.
- AC-34 repository·sync persistence·화면 orchestration·분석 package 책임을 분리하고, 미지원 schema·오래된 비동기 결과·전송 중 재수정된 outbox를 조용히 덮어쓰거나 버리지 않는다.
- AC-35 RLS/RPC·Edge Function 요청 경계, secret redaction, 고정 도구 버전과 깨끗한 DB CI를 검증하고 결과를 저장소 증빙에 남긴다.

### Phase 4S — 개인용 standalone
- AC-36 Android 비개발용 설치 파일이 생성·설치되고 PC와 Metro를 끈 상태에서 아이콘 콜드 스타트가 된다.
- AC-37 네트워크를 끈 상태에서 Phase 1의 로컬 기록·계획·프로젝트·알림·내보내기와 앱 재시작 보존이 동작한다.
- AC-38 네트워크 복귀 뒤 로그인 세션·수동/자동 동기화가 복구되고, AI 분석은 서버 연결이 있을 때만 동작하며 실패가 로컬 기록을 막지 않는다.
- AC-39 빌드 ID·버전·SHA-256·서명/배포 경로·embedded bundle rollback 절차와 native 변경 시 재빌드 조건을 기록한다.

---

## 12. 문구 가이드 (UI·알림·AI 공통)

- 서술형·정보형으로 쓴다: "계획 4h 30m · 실제 2h 40m · 차이 −1h 50m".
- 금지: "잘했어요", "아쉬워요", "N일 연속!", "무너지지 마세요", "~하는 경향이 있어요", "~를 조심하세요", 이모지 보상.
- 경고는 사실+선택지: "현재 계획 173h(초과 +5h). 조정하기 / 그대로 저장".
- 빈 상태: "이번 주 계획이 없습니다. 지난주 계획 복사 / 새로 만들기".
- 알림: "오늘 기록이 아직 끝나지 않았습니다. 탭하면 오늘 종료로 이동합니다."

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
- Supabase Edge Function 인증·secrets: https://supabase.com/docs/guides/functions/auth, https://supabase.com/docs/guides/functions/secrets
- EAS Build / 개발 빌드: https://docs.expo.dev/develop/development-builds/introduction/

---

## 14. 사용자 결정 필요 목록 (에이전트는 기본값으로 시작하고, 답이 오면 반영)

| 항목 | 기본값 | 비고 |
|---|---|---|
| 대상 휴대폰 OS | Android 우선, SM-S721N / Android 16 기준 기기 | iOS 코드 호환성 유지, 이번 예산에 iOS 공개 등록/실기기 gate는 포함하지 않음 |
| 주 시작 요일 | 월요일 | 설정에서 변경 가능 |
| 하루 종료 시각 | 23:00 | 남은 가용시간 계산용 |
| 오늘 종료 알림 시각 | 21:30 | 설정에서 변경 가능 |
| 초기 계정·예산 | §4.4 표 | 언제든 수정 |
| Supabase 프로젝트 | 연결 완료 | Phase 2 원격 migration·RLS 게이트 통과 |
| 인증 방식 | 이메일 매직링크 | Q-007 사용자 확정 |
| AI 제공자·모델·키 | 기존 개인용 OpenAI Responses API / 서버 소유 모델 정책 / Supabase secret | Q-010·ADR-024. 앱에는 키를 배포하지 않으며 §21의 신규 비용 한도 적용 |
| 앱 이름·아이콘 | `OOS Ops` | Android 실기기 설치·아이콘 실행 확인 |
| 개인용 standalone | Android 우선, PC·Metro 불필요 | Phase 4S 완료. 기존 기능을 보존하며 공개 스토어는 §19~§20, 결제는 비목표 |
| 목표 시간 도달 | 알림 후 계속 측정, 종료 때 실제 시간 기록 | Q-014 사용자 확정 |
| 레퍼런스·MCP 예산 | 총액 80,000원 | 2026-09-06 최신 사용자 보정. Mobbin·Figma 등 디자인 조사/전달 도구 전용, Play·서버·AI 비용과 별도 |
| 첫 공개판 | public-local 확정 | 공개 배포하되 모든 사용자 데이터는 기기 로컬에만 보존; P7에서 personal과 완전히 분리 |

---

## 15. 킥오프 프롬프트 (사용자가 에이전트에게 붙여 넣을 첫 지시문)

```
너는 이 저장소의 구현 에이전트다. docs/SPEC.md(이 문서)를 끝까지 읽고 §10의 작업 프로토콜을 따른다.
1) 기존 docs/PLAN.md와 관련 기록을 읽고 현재 미완료 AC의 변경 파일·검증 계획을 갱신한다. 문서를 새로 초기화하지 않는다.
2) Phase 5 완료 기준선에서 현재 승인된 단계부터 진행한다. 다음 구현은 Phase 6이며, sync 계약을 바꾸기 전에 서버 migration·RPC/RLS·protocol version·배포 순서·구버전 영향을 준비하고 사용자에게 알린다. §17~§22와 상세 AGENTS.md를 따른다. §10.4에 실제로 해당하는 범위만 멈추고, 기술 내부 결정은 DECISIONS.md에 기록한다.
3) 각 단계는 §10.3 게이트를 전부 통과한 뒤에만 다음 단계로 간다. 보고는 §10.7 형식으로 한다.
4) 명세 밖 기능은 만들지 말고 FUTURE.md에만 적는다. 게임화·판정 문구·숫자 숨기기·저장 차단·사용자 서술은 어떤 경우에도 금지다.
5) 첫 보고에 현재 AC와 변경 범위·남은 최소 실기기 검증을 적고 독립적으로 가능한 구현을 계속한다. 이미 답한 타이머 종료 정책과 레퍼런스·MCP 예산 80,000원의 용도는 다시 묻지 않는다.
```

---

## 16. 정의
- **초안(v0.1) 완성**: Phase 1의 AC-1~AC-18 전부 통과 + 게이트 통과 + 사용자 기기에 설치되어 하루치 실제 기록이 문제없이 수행됨.
- **Phase 4R 완료**: 기존 기능 의미를 바꾸지 않은 리팩터 코드가 AC-31~AC-35와 §10.3 게이트를 통과하고 원격·실기기 증빙까지 갱신된 상태.
- **개인용 standalone 완료**: AC-36~AC-39를 통과해 개발 서버 없이 일상 사용 가능한 개인 설치 빌드가 확보된 상태. 공개 스토어 출시·결제 완료를 뜻하지 않는다.
- **메타설계**: 사용자가 확정한 "개인 운영체제" 방향 문서. 최신 사용자 지시 아래의 배경 자료.
- **하네스**: 이 문서의 §2, §10, §11, §12 — 에이전트가 자율적으로 일하되 벗어나지 않게 하는 경계와 검증 장치.

---

## 17. Phase 5 — UI/UX 개선 상세

### 17.1 범위와 완료 의미

기존 저장/집계 의미를 보존하면서 선택·실행·열람 동선을 정리한다. P5가 끝나면 실제 개인용 빌드에서 2탭과 할일 시트를 쓸 수 있다. **P5는 route·view-model·의미 부품·표시만 바꾸며 SQLite schema, repository 명령, sync 계약, 알림 예약, 기록 귀속 날짜를 바꾸지 않는다.** 카운트다운·pause/resume·새 날짜 입력은 P6이며 P5 화면에서 가짜 기능으로 보이지 않는다. P5에서 기존 타이머는 `경과 시간`을 보여준다. 데이터 손실 방지·접근성·핵심 부품 분리는 지금부터 수행하고 P8까지 미루지 않는다.

**시각 설계 선행 게이트:** P5의 주 레퍼런스는 Mobbin의 [Tiimo — Completing a task](https://mobbin.com/flows/ea7537d2-b745-4764-ab22-dcf5c71b444f) 5화면 flow다. 오늘 목록에서 항목을 시작하고, 실행 상태를 유지하며, 완료로 닫는 연속성과 정보 위계를 참고한다. 합성 데이터만 사용해 Figma의 OOS 4화면 시안으로 번역한 뒤 코드에 반영한다. Tiimo의 브랜드·문구·그래픽·보라색 카드·온보딩 배너·체크리스트·4탭·FAB는 복제하지 않는다. 두 번째 앱은 이 flow에 필수 화면이 없을 때 그 한 화면의 공백을 검증하는 용도로만 허용하며, 여러 앱의 장점을 임의 조합해 주 레퍼런스를 대신하지 않는다.

OOS 번역 방향의 이름은 **Quiet Routine**이다. 날짜와 현재 행동을 먼저 읽히게 하고, 흰색/중립 배경 위의 평면 목록·한 개의 강조색·큰 시간 숫자·고정된 주요 행동·오늘/기록 2탭을 사용한다. 장식 카드나 흐림 배경으로 정보를 묶지 않으며, 화면마다 주요 행동은 하나만 강하게 보인다. `TaskSheet`는 Tiimo의 `Start now` 진입을 OOS의 행 전체 탭으로 단축하고, `TimerView`는 실행 중인 항목을 화면 중심에 유지하며, `기록`은 카드 dashboard가 아니라 반복 가능한 원장 행으로 마감한다.

Mobbin 연결 전 작성된 route·view-model·의미 부품은 데이터/기능 경계를 보존하는 잠정 뼈대로 유지할 수 있다. 그러나 레퍼런스와 Figma 비교 전의 간격·타이포·행 밀도·시트 높이·버튼 위계는 완료로 간주하지 않고 시각 polish를 계속하지 않는다. 이 게이트는 P5 안의 설계 순서이며 P6 기능을 앞당기지 않는다.

### 17.2 내비게이션

| 새 진입점 | 내용 / 이전 route 처리 |
|---|---|
| 오늘 `/` | 날짜, `오늘의 할일 확인`, TaskSheet 또는 TimerView |
| 기록 `/records` | 날짜별 원장, 계획/실제/차이, 오늘 가용시간, 직접 기록, 오늘 종료 |
| 기록 > 더보기 | 주간·계획·프로젝트·분석·설정의 명시적 텍스트 목록 |
| `/week`, `/plan`, `/projects`, `/analysis` | 탭에서 Stack으로 옮기되 외부 경로는 보존. 기능 코드 재작성 없이 wrapper를 먼저 이동 |
| `/today/close`, `/settings`, `/auth/callback` | 기존 의미·딥링크 보존. 인증/알림 목적지가 시작 시트에 가려지지 않음 |

단순히 `href:null`로 숨기고 접근 경로를 잃게 하지 않는다. 뒤로 가기는 호출한 기록/오늘로 돌아온다. 시트→수동 입력은 하나의 overlay 안의 내용 교체이고, 두 Modal을 동시에 열지 않는다.

### 17.3 화면별 위→아래 계약

**오늘/유휴:** 날짜 → 시선 중심의 `오늘의 할일 확인`(48dp 이상, 첫 viewport, 스크롤 불필요) → 오늘/기록 탭. 기본 실행에서 DB가 준비되고 열린 타이머가 없으면 자동으로 시트를 올린다. 버튼은 시트가 닫힌 즉시 같은 자리에서 보인다. 목록을 열기 위해 작은 아이콘을 찾게 하지 않는다.

**TaskSheet:** `오늘 어떤 일을 할까요?` → `항목을 누르면 시작합니다`(시간형일 때) → 항목명+오늘 계획 시간의 단순 행 → 고정 `할일 추가`·`직접 기록`. 유형별 행동은 텍스트로 분명히 한다(time: 시작, completion: 완료 기록, count: 1회 기록, numeric/event: 값 입력). time 이외를 타이머로 변환하지 않는다. 초기 5행 노출 목표, 초과 항목은 스크롤; 목록 개수 제한은 없다. 무의미한 아이콘·계정 색 태그·진행률은 없다.

- 원본은 `buildTodayViewModel`/`todayItems`이며 정렬은 기존 sortOrder, 중복은 itemId로 제거한다. weekly budget을 임의 일일 할일로 나누지 않는다.
- 목록은 `일정 규칙 + 오늘 수동 추가 + 열린 타이머`를 계속 사용한다. 오늘 추가는 기존 `today_item_additions`로 저장한다. 새 항목 생성은 기존 계정 선택·항목 저장을 거쳐 오늘에 추가한다. 빠른 생성 필드는 이름·계정·유형·선택 시간만, 고급 설정은 접는다.
- 빈 상태는 `오늘 할일이 없습니다`와 `할일 추가`, `직접 기록`. 처음에 0건이어도 기록을 시작할 수 있다.
- 시간형 행 1탭 → 로컬 transaction 성공 → 시트 닫힘 → 실행 화면. 저장 실패면 시트와 선택을 유지하고 재시도한다. DB 성공 전에 시작했다고 표시하지 않는다.
- 돌아올 때마다 시트를 다시 띄우지 않는다. 일반 foreground 복귀는 이전 화면을 유지하고 타이머만 복원한다. 자정 이후 유휴 상태에서는 날짜와 목록을 갱신하되 다른 화면 작업을 빼앗지 않는다.
- 실행/일시정지 중이면 타이머 우선. 명시적 인증 callback/알림 딥링크가 있으면 그 목적지가 최우선이며 완료 후 타이머로 돌아갈 수 있다.

**TimerView:** 항목명 → 시간 의미 라벨 → 가장 큰 숫자 → 제어 버튼. P5는 경과+정지, P6는 남은/초과+일시정지/재개+종료. `오늘의 할일 확인`은 작은 텍스트 보조 진입으로도 유지한다. 계획/주간 dashboard·AI 추천 카드를 넣지 않는다. 링/무한 애니메이션은 기본 사용하지 않는다.

**기록:** 날짜(오늘/어제/날짜 선택)·더보기 → 계획/실제/차이 → 원장 행 → 날짜 소계 → 직접 기록/오늘 종료. 행은 항목명·분/h m·출처 텍스트, 탭 시 상세 편집(날짜/시간/메모/삭제). count/numeric/event는 단위를 별도 표시하며 시간 총계에 합산하지 않는다. 삭제 기록은 별도 보기·복구 가능. 가용시간은 오늘 요약의 보조 숫자로 접근 가능하게 둔다. 출처가 확실치 않은 기존 행은 `기존 기록`이며 추측으로 timer/manual 값을 덮어쓰지 않는다. P5에서 과거 날짜를 보고 있을 때는 `직접 기록`과 `오늘 종료`를 숨기거나 `오늘로 이동`으로 바꾼다. 오늘 날짜에 저장될 동작을 과거 날짜 화면에서 실행되는 것처럼 보이게 하지 않는다.

이 기록 화면은 최종 구성이다. P5에서는 조회 날짜 선택과 기존 시간/메모/삭제 기능만 제공한다. 기록의 귀속 날짜 편집·새 provenance·일별 계획 저장은 P6에서 활성화한다. P5에도 보존되지 않은 과거 계획을 현재 일정으로 지어내지 않는다.

### 17.4 디자인 헌법의 적용 범위

`mobile/src/theme/tokens.ts`를 새 단일 토큰 원천으로 만든다. 기존 COLORS는 이전 화면 호환 adapter로 단계적으로 토큰을 참조하게 바꾸고 중복 팔레트는 제거한다. 역할/수치는 `design-research.md`의 토큰 초안을 기준으로 구현 시 대비·실기기 검증하여 확정한다.

- 오늘/시트/타이머/수동은 한 주제와 한 주요 행동. 선택 칩은 한 묶음 최대 5개, **목록 데이터와 내비게이션·접근성 보조 동작은 5개 제한의 대상이 아니다**.
- 숫자·날짜·항목명·저장 상태·오류 설명은 최소화 대상이 아니라 필요한 정보다. 숫자 3열은 기록 화면에 둔다.
- 4색은 테마별 중립 팔레트 기준. 데이터로 저장된 계정 색, 과거 migration, OS 고유 picker·알림 UI, 브랜드 자산은 예외를 명시한다. 사용자 데이터의 색 값을 삭제해 검사 수치를 맞추지 않는다.
- 색/간격/크기/radius/font는 토큰 참조. 규격에 필요한 0, flex, percent, safe-area 값은 일반 layout 값으로 허용한다. 48dp 터치, 충분한 대비, OS 글꼴 확대·Reduce Motion·TalkBack를 우선한다.
- 시트는 기존 Modal로 충분한지 먼저 평가한다. 드래그·스크롤·키보드·접근성을 충족하려면 `@gorhom/bottom-sheet`를 adapter 뒤에 채택할 수 있다. 설치된 Expo 57/Reanimated 4.5/Worklets 호환을 공식 문서·lockfile·native build로 확인한다. 첨부 추천만으로 특정 버전을 고정하지 않는다.
- 시트 열림/닫힘 포커스 이동, Android back 닫힘, 내용 스크롤과 footer 분리, 키보드 회피를 공통 부품에서 처리한다. 200% 글씨에서는 전면 높이 시트로 확장 가능하다.
- Mobbin의 iOS 화면은 정보 위계와 전환만 참고한다. Android back·sheet·키보드·safe area·글꼴 확대 동작은 Expo/Android 기준으로 구현하며 iOS 전용 navigation과 제스처를 복제하지 않는다.

### 17.5 측정 조건

실기기 검증 전에 `design-research.md`에 주 레퍼런스 앱과 flow 이름, 확인한 연속 화면, OOS에 채택/배제한 구조, Figma 파일 링크를 한 번 기록한다. Mobbin 화면과 Figma에는 사용자 실제 기록·메모·계정 정보를 보내지 않고 합성 데이터만 사용한다. 이 산출물이 없으면 P5 시각 설계는 미완료다.

Phase 5 종료 때 Galaxy S24 FE의 Android 개발 빌드에서 핵심 흐름을 한 번 실행한다. 시트가 열리고, 항목을 선택해 타이머가 시작되며, 종료·직접 기록·원장 확인이 가능하면 된다. 긴 목록은 스크롤되고 큰 글씨에서도 주요 버튼을 누를 수 있는지만 함께 본다.

고정 성능 수치·반복 횟수·기간·특정 항목 수를 완료 조건으로 두지 않는다. 사용 중 체감 지연이나 잘림이 실제로 발생하면 그때 해당 화면만 계측하고 수정한다.

---

## 18. Phase 6 — 실행·수동 입력·기록 계약

### 18.1 기본 시간과 계획

새 time 세션의 목표 시간은 **오늘 항목에 명시된 양수 계획 → 항목 기본 시간 → 25분** 순서다. fallback 25분은 측정 목표일 뿐 주간/오늘 계획을 자동 변경하지 않는다. 기존 시간이 소진된 항목도 계속 선택할 수 있으며 계획을 강제 상한으로 쓰지 않는다. 이미 한 실제 시간을 빼서 목표 시간을 몰래 축소하지 않는다.

구현상 오늘 계획은 기존 view-model의 plannedValue(일정 값 또는 levelTarget), 항목 기본 시간은 defaultDurationMin이다. 둘 다 양수의 유효 값인지 검사한다. 별도 기본 목표 설정을 중복 생성하지 않는다.

시트에는 `계획 50분` 또는 `계획 없음 · 기본 25분`으로 시작될 길이를 보인다. 시간 조정은 실행 화면의 접힌 `시간 조정`을 열어 −15/+15분·직접 입력으로 한다. 양수의 유효한 정수 분을 사용하며 0 이하 목표는 형식 오류로 설명한다. 목표 변경이 기존 실제 시간·시작 시각을 초기화하지 않는다. 계획 자체를 바꾸는 동작과 현재 세션 목표 변경을 구분한다.

### 18.2 상태 전이와 저장 시점

```text
idle --항목 탭/DB commit--> running
running --목표 도달--> running (표시만 overtime, 목표 알림 1회)
running --일시정지/commit--> paused
paused --재개/commit--> running
running 또는 paused --종료/commit--> stopped (원장 확정)
running 또는 paused --취소/commit--> cancelled (soft delete, 복구 가능)
stopped/cancelled --같은 종료 요청 재시도--> 상태 불변
```

목표 도달은 **측정 종료·자동 저장 확정·할일 완료가 아니다**. 앱을 2시간 뒤 열면 실제 경과를 계속 보여주고, 사용자 종료 시 pause를 뺀 실제 시간이 남는다. `초과 +12:04`도 같은 중립색이다. 앱을 다시 열거나 알림을 탭했다고 ended_at을 쓰지 않는다.

| 명령 | 필수 transaction / 실패 행동 |
|---|---|
| 시작 | UUID/client operation ID를 한 번 발급, 항목 스냅샷·시각·목표를 entries에 저장. 연타/재시도는 같은 ID를 재사용. commit 뒤 실행 표시; 오류면 원래 선택 유지 |
| 일시정지 | 마지막 실행 구간을 accumulated_ms에 한 번 더하고 resumed_at을 NULL, state=paused. 목표 예약 취소는 commit 후 시도 |
| 재개 | state=paused 조건일 때만 resumed_at=now, state=running. 남은 목표에 맞춰 예약 재생성 |
| 종료 | state가 active일 때만 마지막 구간 합산, ended_at·duration_min·state=stopped 한 번 갱신. count_on_complete는 기존 의미대로 count=1, 호출마다 증가 금지 |
| 취소 | ended_at/실제 길이를 보존하고 state=cancelled + deleted_at. 최근 실행의 `실행 취소`는 최소 10초 표시, 이후에도 원장 삭제/복구 가능. 취소 복구는 정지된 기록으로만 돌아옴 |
| 다른 항목 시작 | 한 확인: `현재 시간을 기록하고 전환 / 현재 작업 계속`. 전환은 현재 종료+새 시작 한 transaction. 실패하면 둘 다 이전 상태. 수동 기록 추가는 이 확인 불필요 |

새 집중 타이머는 기기당 하나다. 기존 v6에서 여러 타이머가 열려 있으면 자동 종료·시간 임의 확정하지 않는다. 복구 화면에서 기존 각 기록의 이름/시작/경과를 보여주고 사용자가 정리하게 한다. 정리 전에는 새 집중 타이머만 보류하고 기존 기록 편집·수동 저장·export는 허용한다. 삭제/보관된 항목의 열린 기록도 누락하지 말고 entry의 항목 snapshot/기존 이름으로 표시한다.

### 18.3 정확성·데이터 계약

`sessions`라는 두 번째 시간 원장을 만들지 않는다. 기존 `entries`를 비파괴 상향한다. 아래는 **구현해야 할 v6 이후 논리 계약**이며 이미 존재하는 열이 아니다. 실제 migration 번호는 착수 시 최신 버전 다음으로 정한다.

| entries 신규 열 | 타입 / 의미 |
|---|---|
| record_method | TEXT NULL: `timer`, `manual`; legacy 미분류는 NULL. 기존 source=`app/import/ai_applied`는 보존 |
| planned_duration_min | INTEGER NULL: 시작/조정한 세션의 목표. NULL은 기존 stopwatch 또는 수동 기록 |
| timer_state | TEXT NULL: running/paused/stopped/cancelled. NULL은 legacy/non-time |
| timer_accumulated_ms | INTEGER NOT NULL DEFAULT 0: 완료된 실행 구간 합, pause 제외 |
| timer_resumed_at | TEXT NULL: 현재 실행 구간의 UTC ISO 시작 시각 |
| timer_revision | INTEGER NOT NULL DEFAULT 0: 각 제어 명령의 낡은 상태 쓰기 방지 |
| item_name_snapshot | TEXT NULL: 시작/수동 생성 당시 항목명, 항목 삭제 뒤에도 원장 식별 |

기존 id/item_id/account_id/type/started_at/ended_at/duration_min/value/count/occurred_at/note/source/created_at/updated_at/deleted_at은 그대로 유지한다. source를 timer/manual로 바꾸면 import/AI·기존 코드 계약이 깨지므로 record_method를 별도 둔다. DB의 synced_at 같은 중복 상태는 추가하지 않고 기존 outbox/ACK를 사용한다.

- running의 유효 시간 `elapsedMs = accumulatedMs + max(0, nowUtc - resumedAtUtc)`. paused/stopped는 accumulatedMs. `remainingMs = max(0, targetMs-elapsedMs)`, `overtimeMs=max(0,elapsedMs-targetMs)`.
- tick은 **화면 갱신용**으로만 허용한다. tick 수를 더해 시간 저장, 매초 DB 쓰기, background JS 실행 의존을 금지한다. 제어 명령은 repository가 최신 행을 읽고 expectedRevision/state 조건으로 원자 적용한다.
- 종료할 때만 `duration_min = max(0,round(elapsedMs / 60000))`. pause 구간마다 반올림하지 않는다. 29초=0분, 30초=1분; 상세에는 실제 초를 볼 수 있다. 기존 종료 기록의 분은 재계산하지 않는다.
- 신규 timer_state가 있으면 이를 우선 판정한다. stopped/cancelled의 resumed_at은 NULL이고 누적값은 마지막 구간까지 포함한다. manual은 timer_state/resumed_at/목표가 NULL, 실제는 duration_min이다. legacy 행은 기존 started_at·ended_at·duration_min 판정으로 읽는다. 새 열의 기본 accumulated_ms=0으로 기존 완료 시간을 덮지 않는다. 수정된 timer 기록의 원장 합계는 duration_min, 원래 측정 상세는 accumulated_ms로 구분한다.
- timestamp는 UTC, 날짜 귀속은 Asia/Seoul의 `occurred_at` 날짜. 자정을 넘어도 시작일 귀속을 유지한다. **신규 원장/주간/AI package 모두 같은 귀속 helper를 쓴다.** 기존 timer의 started_at 기준과 같은 초기 occurred_at을 보존한다. 날짜 수동 수정 시 occurred_at만 이동하고 측정 timestamp는 보존한다.
- 프로세스 제거·재부팅 후 DB를 읽어 계산하므로 일반적으로 이어진다. pause 중 재부팅은 pause 상태를 유지한다. 새 기기에서 복구한 열린 세션은 자동으로 실행 권한을 가져오지 않고 `복구된 측정`으로 확인 후 이어가기/종료를 제공한다. 동시 다기기 측정은 이번 범위 밖이다.
- 같은 실행 중에는 단조 시계와 벽시계 차이를 비교해 큰 시계 변경을 감지할 수 있다. 재부팅/강제 종료 중 수동 시계 변경은 timestamp만으로 완전 복원할 수 없음을 명시한다. 감지된 역행/큰 차이는 원시 시각을 유지하고 `기기 시각이 변경되었습니다 · 시간 확인`을 제공하며 시간 수정 저장을 허용한다. 음수 시간을 생성하거나 24시간으로 강제 잘라내지 않는다.
- raw SQL/시계 읽기는 UI에서 하지 않는다. 순수 `timer-state` 계산과 주입 가능한 clock, `TimerRepository`(또는 ActivityRepository 내부 timer 모듈), 알림 adapter, 화면용 controller로 책임을 나눈다. 전체 상태관리 라이브러리 교체는 필요하지 않다.

### 18.4 목표 알림과 OS 경계

시작/재개/목표 조정 commit 후 OS에 한 번 예약한다. running일 때 `dueAt = now + max(0,targetMs-elapsedMs)`. 이미 지난 목표는 새 알림을 즉시 여러 번 울리지 않고 화면에 초과만 표시한다. 목표 알림은 세션당 한 번이며 목표를 늘려도 이미 알린 세션은 다시 알리지 않는 기본값이다. 알림 문구: `설정한 시간이 지났습니다. 측정은 계속됩니다.`

- `timer_goal:<entryId>` namespace에 기기 전용 예약 ID·dueAt·revision·알림 처리 상태를 보관한다. 동기화/export에서 비밀값은 없지만 복구 후 OS 예약 ID를 유효하다고 재사용하지 않는다.
- 시작/재개 직후 프로세스가 죽어 예약이 없을 수 있다. 다음 실행에서 DB의 active state와 OS 예약 목록을 비교해 미래 목표를 복원하고 중복·stale 예약을 취소한다. DB/OS는 한 transaction이 아니므로 이 조정 절차가 필수다.
- pause/종료/취소/전환/목표 변경은 이전 예약을 취소하고 필요시 새 예약. 실패는 추적 가능한 cleanup 상태로 남겨 재시도하되 이미 저장된 기록을 실패로 뒤집지 않는다.
- 기존 level_max 알림은 설정을 보존한다. 목표와 같으면 합쳐 한 번, 다르면 사용자가 켠 경우에만 별도로 보낸다. 타이머 목표와 항목 상한을 혼동하지 않는다.
- 알림을 탭하면 해당 세션의 실행/일시정지 화면, 이미 종료/삭제됐다면 원장 상세/삭제 안내로 간다. 오래된 알림이 타이머를 재시작하거나 기록을 생성하지 않는다. callback과 시트의 라우팅 경쟁을 테스트한다.
- 진동 중심·소리 선택 가능을 기본 UX로 하되 Android 채널의 사용자 설정을 우선한다. 기존 채널을 강제 재설정하지 않는다. 권한 요청은 첫 타이머 시작 commit 이후 설명과 함께 한 번; 거부해도 시간 기록이 된다. `알림 꺼짐 · 설정`으로 상태를 확인한다.
- [Expo 57 알림 문서](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)와 [Android 알람 문서](https://developer.android.com/develop/background-work/services/alarms)를 구현 시 다시 확인한다. exact-alarm 접근 권한/Play 적격성이 필요한 구현이면 실제 manifest·권한 획득·복구를 검증한다. 설정되지 않은 정확성 권한을 확보됐다고 가정하지 않는다.
- 일반 앱 닫기/잠금/최근 앱 제거 상태에서는 목표시각 알림을 실제 시험한다. OS **강제 중지**, 전원 꺼짐, 권한 철회, 방해금지/제조사 절전 정책은 알림을 막거나 늦출 수 있다. 정시 도착을 보장한다고 표시하지 않는다. 재실행 시간 복원과 알림 전달 성공은 서로 다른 AC다.
- 기준 기기에서 짧은 목표 한 번을 설정하고 화면을 끈 뒤 알림과 타이머 복원을 확인한다. 알림이 늦거나 누락되면 실제 결과와 OS 상태를 기록하고 해당 원인만 조사한다.

### 18.5 수동 입력·원장

기본 경로는 `직접 기록`(1) → 항목(2) → `50분 기록`처럼 **저장을 뜻하는 칩**(3)이다. 일반 선택 칩을 누른 것만으로 몰래 저장하지 않는다. 칩은 현재 계획/최근 수동값/기본값 및 15·30·60분 후보에서 중복 제거한 4개 이내 + `직접 입력`으로 구성한다. 항목이 이미 선택돼 있으면 2탭이 가능하다.

- 수동 화면 위→아래: 항목·선택 날짜 → `실제 시간을 기록합니다` → 시간 기록 칩/직접 시간 입력 → 접힌 날짜 변경·메모. 직접 입력은 시간/분 또는 분 단위와 명시적 저장 버튼, 소수 시간은 분으로 변환해 저장될 값을 먼저 표시한다.
- 기본 날짜 오늘. 빠른 날짜는 오늘/어제/그제/3일 전 + 달력. **3일보다 오래된 날짜도 허용**한다. 미래 실제 날짜는 사실 확인 문구와 그대로 저장을 제공한다. 계획을 실제 기록으로 자동 취급하지 않는다.
- 0분은 허용, 음수 시간/NaN/불가능 날짜는 형식 오류. 24시간 초과·타이머와 중복 추정은 사실 안내만 하며 저장을 막지 않는다. 메모는 선택·길이 제한 없음. 네트워크 payload 크기 제한이 있으면 해당 sync만 보류하고 로컬 원문은 보존한다.
- 매 저장은 새 entries UUID + record_method=manual. 진행 타이머/기존 일합계를 덮어쓰지 않는다. 연타는 동일 operation ID로 1행만 생성하고 저장 확인/되돌리기를 제공한다. 별도로 다시 실행한 같은 시간 기록은 자동 중복 제거하지 않는다.
- 원장 기본 합계는 **확정된 미삭제 time 행**의 duration_min 합이다. 측정 중은 별도 `측정 중 12분 · 합계 제외`로 보인다. 일시정지 구간은 실제에 들어가지 않는다. time 이외의 회/값을 시간에 더하지 않는다.
- 항목 탭 상세에서 시간/귀속 날짜/메모를 수정하고 삭제·복구한다. 타이머 출처와 원래 측정값은 보존하고 수정분임을 표시할 수 있도록 원래 accumulated_ms를 유지한다. 현재 실행 중인 기록의 시간 수정은 먼저 일시정지/종료 동작으로 안내하되 다른 수동 기록은 계속 가능하다.
- 과거 planned/actual/diff에서 actual은 수정된 최신 실제, planned는 아래 일별 계획 버전, diff=actual−planned다. 오늘 종료 snapshot은 당시 값이며 나중 기록 수정으로 몰래 고치지 않는다. `종료 당시`와 `현재 집계`를 구분한다.

### 18.6 일별 계획 보존과 migration

새 `daily_plan_versions`는 일별 계획의 영수증이며 별도 실행 원장이 아니다.

```text
daily_plan_versions(
 id TEXT PK, date TEXT, version INTEGER, items_json TEXT,
 planned_minutes INTEGER, origin TEXT, created_at TEXT,
 updated_at TEXT, deleted_at TEXT NULL,
 UNIQUE(date, version)
)
items_json: [{item_id, item_name, type, planned_value, unit}]
origin: materialized | user_edit | legacy_closure
```

- 오늘 목록이 최초 확정될 때 계산된 계획만 snapshot으로 보존한다. 오늘 항목 추가/계획 편집 시 내용 fingerprint가 다르면 새 버전; 동일 refresh는 새 버전을 만들지 않는다. 계획 0과 계획 미설정 항목은 구분한다. 최신 미삭제 버전의 time planned_value 합이 planned_minutes다.
- 자정에 background 코드가 반드시 실행된다고 가정하지 않는다. 앱을 열지 않은 과거 날짜는 기존 closure가 있으면 `종료 당시 계획`으로 출처를 붙이고, 없으면 `계획 미보존`, 차이 `—`를 표시한다. 그날 기록이 없다는 이유로 0시간 계획을 지어내지 않는다. 실제 합계 숫자는 항상 표시한다.
- v6의 종료된 entries는 그대로 둔다. 명확한 started_at time 행만 timer로 분류할 수 있으며 그 밖의 provenance는 legacy NULL 유지 가능하다. 열린 legacy 타이머는 목표를 소급 추정하지 않고 stopwatch 복구 경로를 제공한다. migration이 열린 타이머를 모두 현재 시각으로 종료하지 않는다.
- daily_plan_versions와 entries 새 열은 row mapper/domain type·manifest·export·reset FK 순서·seed 복구 policy·sync schema에 함께 반영한다. 완료 기록·계획 버전·삭제 행의 row count/IDs·합계를 migration 전후 대조한다. 오류 주입으로 transaction과 user_version 동시 rollback을 검증한다.
- 내보내기에는 schemaVersion, 생성 시각, 테이블별 행 수를 포함하고 비밀값·native session은 제외한다. JSON은 복구용 전체 데이터, CSV는 열람용이다. 과거 export 포맷을 읽을 수 있는 호환 검증은 P7 복구 도구에 포함한다.

### 18.7 동기화 호환과 구현 순서

기존 pull→merge→push와 조건부 ACK를 유지한다. 동일 entry ID의 충돌은 기존 LWW+충돌 로그이고 여러 time entry를 합쳐 덮어쓰지 않는다. daily_plan_versions의 자연키 충돌은 Q-011 경계상 두 작성 기기를 정식 지원하지 않는다; 충돌 시 양쪽 원문을 보존하고 해당 sync 범위 오류를 사용자에게 보여준다.

P6에서 서버 변경을 시작하기 전, 에이전트는 사용자에게 migration·RPC allowlist/version fence·RLS/계약 테스트·배포 순서와 개인용 구 앱의 영향만 짧게 알린다. 서버 변경 자체가 로컬 기록을 막지 않도록 준비한다.

1. **서버 확장 먼저:** 새 RPC/계약 버전이 v1/v2를 명시적으로 구분한다. old payload의 누락된 신규 nullable 열은 정해진 legacy 규칙으로만 수용한다. 모르는 열을 조용히 버리지 않는다.
2. **구버전 쓰기 방어:** v2 데이터를 쓴 계정/레코드를 v1 client가 구 규격으로 덮지 못하게 서버 version fence를 둔다. 최소 sync client 버전·오류 문구·개인용 update 절차를 함께 정한다. 구 앱의 sync가 멈춰도 로컬 기록·outbox는 보존된다.
3. **클라이언트 이관:** 신규 SQLite migration·codec·trigger·RPC manifest·legacy export/restore를 같은 기능 변경 묶음으로 추가한다. 시작 전에 서버 호환 확인을 하되 서버 장애가 로컬 시작을 막지 않는다.
4. **검증:** v6 데이터/NULL legacy/soft delete/열린 타이머/부분 실패/old-new client 조합/전송 중 재수정/owner 전환/알림 설정이 다른 기기를 시험한다. 파괴적 down migration을 rollback으로 사용하지 않는다.

예상 변경 위치: `types/domain.ts`, `domain/calculations.ts`, 신규 `domain/timer-state.ts`, `features/today/`, 신규 `features/timer/`·`features/records/`, `context/app-context.tsx`, `data/app-repository/`, `data/migrations.ts`·`migration/`, `data/app-row-mappers.ts`·`app-data-tables.ts`, `sync/schema.ts`·`sync-persistence/`, `services/notification-*`, `analysis/packager-calculations.ts`, `supabase/migrations/`·`tests/`. 이름은 책임 예시이며 구현 때 실제 변경 목록과 검증 근거를 PLAN·TESTPLAN의 해당 위치에 남긴다.

---

## 19. Phase 7 — 배포 준비

### 19.1 공개 범위와 개인용 보존

첫 공개 목표는 **Android 무료 public-local 앱**이다. 결제·구독은 이번 요청의 Phase 8이 아니며 넣지 않는다. 초보자가 매달 서버를 관리해야만 타이머가 동작하는 구조를 만들지 않는다.

| 변형 | 기능 / 서버 | 완료 조건 |
|---|---|---|
| personal | 현재 사용자의 로컬 전체 기능·Supabase 복사/복구·owner AI 유지 | 기존 설치 식별자/서명·DB·계정 유지, P5/P6 개선 적용 |
| public-local (확정) | 핵심 루프·계획·프로젝트·주간·전체 export/복구, 계정 없음 | 공개 build에서 로그인/AI 요청과 개인 Supabase 설정을 제공하지 않음. 모든 사용자 데이터는 기기 로컬에 보존 |

공개 범위는 Q-016의 public-local 결정으로 고정한다. 서버 연결 여부를 숨긴 기능 오류로 표현하지 않는다. personal의 분석 이력과 코드 경계를 삭제해 public-local을 만들지 않는다.

빌드 변형은 한 codebase의 검증된 capability 설정으로 관리한다. 공개 앱은 개인용 Supabase public URL/key·owner 환경을 자동 상속하지 않는다. 개인용 `com.oosops.app`을 다른 변형으로 바꾸는 업데이트로 기존 데이터를 고립시키지 않는다. 공존이 필요하면 public은 별도 applicationId를 P7에서 확정하고, 이동은 검증된 export/import로만 한다. 분리 저장/서명·Play 앱 ID는 제출 전에 고정한다.

### 19.2 공개 클라우드를 선택했을 때 추가되는 필수 작업

- `shouldCreateUser:false`/개인 owner allowlist를 통째로 제거하지 않는다. public auth capability와 서버 환경을 분리하고 타인 데이터 격리·재설치·복구·logout/login 격리를 검증한다. 공개 사용자에게 Supabase 조직 권한을 주지 않는다.
- [Supabase 기본 SMTP](https://supabase.com/docs/guides/auth/auth-smtp)는 조사일 기준 팀 등록 주소 제한, 시간당 2메일, production 비권장이다. **public magic link에는 커스텀 SMTP가 필요**하다. 발송용 도메인·SPF/DKIM·메일 quota·재시도/지연 안내·다른 메일 앱/기기에서 링크를 열 때 PKCE 실패 경로를 검증한다.
- 공개 계정 삭제는 로컬 초기화와 별개다. 앱 내부 및 외부 요청 경로, 재인증, 세션 무효화·삭제 중 계정 접근 금지, 원격 records/tombstone/AI snapshot/대기 요청 purge, 완료 확인, 서버 backup의 삭제 보존 정책이 필요하다. 운영자 승인 없이 다른 사용자 데이터를 영구 삭제하는 도구를 만들지 않는다.
- 구 access token은 사용자 삭제만으로 즉시 무효가 된다고 가정하지 않는다. 서버의 삭제중/비활성 계정 검증과 JWT/세션 정책을 함께 시험한다.
- 공용 AI endpoint는 owner 기능과 분리하고 사용자별/전체 요청 한도·원가 예약 원장·동시 호출 원자성·idempotency·timeout 정책·운영 kill switch를 갖추기 전 열지 않는다. 공개 AI를 제공하지 않는 동안 호출 권한을 UI 숨김만으로 제한하지 않는다.
- DB RLS는 exposed tables마다 owner 조건의 USING/WITH CHECK, RPC는 auth.uid·role grants·table/setting/size·schema version을 검사한다. 데이터 삭제나 auth 변경도 clean DB·실환경 비파괴 smoke 증빙을 남긴다.
- 무료 Supabase를 항상 켜진 무제한 production 서버라고 약속하지 않는다. 복사 장애와 기록 저장은 분리한다. 서버 원본+Auth 복구 능력은 별도 backup/restore 연습으로 입증한다.

### 19.3 설치·업데이트·정책 게이트

- 개발은 development, 일상 검증은 personal release, Play는 production AAB. 자동 cloud build 남발 없이 변경을 묶어 검증한다. debug bundle·Metro·개인 .env·키·테스트 데이터가 공개 산출물에 들어가지 않게 archive manifest와 bundle을 검사한다.
- source commit SHA·worktree 변경 여부·npm lock hash·도구 버전·build ID·versionCode·artifact hash·서명 인증서 fingerprint·환경 이름을 release manifest에 남긴다. signing key는 저장소가 아닌 안전한 보관 위치와 복구 담당자를 기록한다.
- 동일 서명/식별자의 기존 앱 위에 데이터를 보존하여 설치한다. v6와 직전 release 데이터로 upgrade + 실행중 timer + export/import를 검증한다. keystore가 달라 설치가 안 될 때 uninstall로 해결하지 않는다.
- native 의존성·권한·app config 변경은 새 binary가 필요하다. `expo-updates`가 설치되지 않은 현재 상태에서 OTA가 되는 것처럼 쓰지 않는다. OTA는 별도 채택 근거·runtime 호환 게이트가 있을 때만 추가한다. 기본 복구는 더 높은 versionCode의 수정 빌드다.
- [Play 가입](https://support.google.com/googleplay/android-developer/answer/6112435)은 조사일 기준 US$25 일회 비용이며 §21의 레퍼런스·MCP 예산에는 포함되지 않는다. 신규 개인 계정 요건에 해당하면 [현행 비공개 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465)을 충족한 뒤 production 접근을 신청한다. 실제 계정 자격과 현행 요건은 제출 전에 다시 확인하며, 요건 충족이 심사 승인을 보장하지 않는다.
- 조사일 기준 [새 앱/업데이트 target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-GB_ALL)는 2026-08-31부터 API 36 이상이다. **실제 AAB manifest**에서 확인하며 SDK 번호로 추정하지 않는다. exact alarm/notification 등 쓰는 권한의 정책 적격성을 함께 확인한다.
- [User Data](https://support.google.com/googleplay/android-developer/answer/10144311)와 [계정 삭제 정책](https://support.google.com/googleplay/android-developer/answer/13327111)에 맞춰 실제 변형의 데이터 흐름·보존·제3자 전송·삭제·문의처를 기재한다. public-local도 개인정보 안내와 정확한 Data safety 응답을 준비한다. 계정이 없는 앱에 가짜 계정 삭제 메뉴는 넣지 않는다.
- 스토어 이름/짧은 설명/설명/아이콘/실제 스크린샷/콘텐츠 등급/대상 연령/지역/지원 이메일/개인정보 URL/앱 접근 설명을 묶어 검토한다. 개인 업무 데이터가 찍힌 screenshot을 올리지 않는다. 합성 데이터로 실제 build 화면을 캡처한다.

### 19.4 복구·진단과 사용자 손 작업

P7에서 스키마 버전이 있는 JSON import/restore를 추가한다. 현재는 export만 있다고 가정하고 복구 버튼이 이미 있다고 안내하지 않는다. 사용자가 선택한 파일을 사전 검증→테이블/행 수·대상 데이터 표시→명시적 복구→단일 transaction으로 적용한다. 기본은 **빈 로컬 DB로 복구**, 기존 데이터와의 임의 병합은 하지 않는다. 기존 DB 교체는 먼저 export를 제공하고 원자 교체 실패 시 기존 데이터를 보존한다. 인증 session·OS 예약 ID는 복원하지 않고 owner binding과 알림을 재검증한다. 다른 계정 데이터의 upload를 막는다.

사용자 진단 내보내기는 앱/OS 버전·오류 코드·시각·migration version·알림 권한/예약 수·outbox 개수 등 필요한 상태만 기본 포함한다. 원문 메모·질문·JWT·키·전체 SQL dump는 기본 진단에 넣지 않는다. 사용자가 미리 보고 공유 대상을 선택한다. Sentry/화면 녹화/원격 행동 수집은 추가하지 않는다.

앱 삭제는 로컬 데이터 손실을 일으킬 수 있으므로 사용자 안내의 기본 해결책은 `업데이트`·`진단 저장`·`백업 확인`이다. 개인용 서버 복사와 public-local 파일 백업의 차이를 설치 안내에 명시한다.

---

## 20. Phase 8 — 공개 배포 및 유지보수 리팩터

### 20.1 순서와 코드 제거 규칙

**8A 배포 전 필수 리팩터/회귀 → 8B 검토된 release 공개 → 8C 운영하며 관찰된 병목 정리** 순서다. 데이터/보안 결함을 출시 뒤 리팩터로 미루지 않는다. 동작 변경과 동작 보존 리팩터를 같은 대규모 커밋에 섞지 않는다.

| 유지 | 교체/이동 | 제거 조건 |
|---|---|---|
| SQLite와 repository·기존 UUID·계획 이력·soft delete·outbox ACK·RLS·AI 명시적 적용 | 큰 Today UI→feature controller/의미 부품, 전체 snapshot→화면별 read model, 옛 탭→Stack | 구 UI와 새 UI의 기능/접근 경로/AC 동등성이 검증된 뒤 옛 wrapper 제거 |
| 알림 queue·보상 취소·개인용 cloud 서비스 | 타이머 CRUD→원자적 상태 명령, 색 상수→토큰 adapter | 사용처 검색·타입/번들/실기기·해당 사용자 기능 대체 확인 후 dead export/dependency 제거 |
| 과거 migration 파일·seed/history 원본 | protocol/schema version별 codec | 배포된 schema/계약을 재현하는 과거 migration은 삭제·squash하지 않음 |

각 제거 항목에 파일/상징명·사용처 확인·대체 진입/API·데이터 영향·검증·Git 복구 위치를 남긴다. 일반 리팩터를 이유로 npm 패키지를 전면 최신화하거나 framework를 교체하지 않는다. 화면 SQL·전역 provider에 계속 책임을 추가하는 방식도 피한다.

### 20.2 장기 데이터 성능

- records는 날짜와 `(occurred_at,id)` 등 결정적 정렬키로 keyset 조회. aggregate는 DB/순수 도메인 규칙으로 계산하며 페이지에 보이는 행만 합쳐 일합계를 만들지 않는다.
- 오늘은 오늘 항목·오늘 확정 합계·열린 타이머만 먼저 읽고, 과거 주간/AI 데이터는 해당 화면 진입 시 읽는다. 전체 export는 UI 전체 snapshot을 만들지 않고 chunk로 처리한다.
- 현재 사용자 데이터와 긴 목록 하나에서 시작·원장 스크롤·합계·export가 멈추지 않는지 확인한다. 고정 성능 수치는 완료 기준으로 두지 않는다.
- 실제 지연이나 메모리 문제가 재현될 때만 합성 데이터를 늘려 원인을 찾는다. 최적화 후에는 같은 데이터의 합계가 바뀌지 않았는지만 확인한다.

### 20.3 공개·복구·유지 운영

출시 검토 묶음에는 Phase 상태, 선택한 변형, 실제 개인정보 안내/스토어 자료, 비용/잔액, unresolved 결함, rollback 절차, 게시할 versionCode/서명·소스 SHA를 담는다. **이번 문서 세션에서 제출/공개는 하지 않는다.** 나중에 사용자가 해당 release 공개를 지시하면 이미 승인된 범위의 제출과 확인을 진행하고, 계정 본인 확인·약관·결제 등 사용자가 수행해야 하는 화면만 짧게 안내한다.

- 첫 공개는 선택한 지역/대상으로 production 게시하고 Play 설치 링크에서 설치·시작·수동 기록·원장 확인을 한 번 수행한다. 후속 업데이트 방식은 실제 Console에서 제공하는 선택지를 따른다.
- 데이터 손실/타인 데이터 노출/시작 불가: 즉시 추가 rollout 중단, 가능하면 문제 서버 경로만 비활성화, 로컬 기록은 유지, 영향 버전·재현·복구 상태 기록. 사용자 데이터로 실패를 재현하며 파괴적 reset하지 않는다.
- 수정은 동일 appId/서명·더 높은 versionCode·현재 DB를 읽는 전진 migration으로 배포한다. DB가 이미 올라간 사용자에게 낮은 schema binary를 설치시키지 않는다. 서버 rollback도 새 client가 쓴 필드를 잃지 않는 호환 경로로만 한다.
- 공개 직후와 첫 업데이트 뒤 Console의 crash/ANR·문의만 확인한다. 추가 앱 telemetry 없이 사용자가 공유한 진단과 제공자 운영 지표를 사용한다.
- 결함 우선순위: P0 데이터/보안/전체 시작 불가, P1 핵심 루프 불가, P2 일부 화면/정확한 우회 경로 있음, P3 문구/모양. P0/P1은 다음 기능보다 우선; 고정 24시간 SLA를 약속하지 않고 확인 시각·담당·다음 조치 시각을 남긴다.
- 의존성은 매월 호환 패치·advisory를 검토하고 lockfile·전체 gate 후 적용한다. key 만료·인증/메일·정책/API 변화는 provider 공지를 확인한다. 자동 force update는 금지한다.
- 서비스 종료/예산 소진 때 신규 비용 기능을 중지하고 export·기존 로컬 기록을 유지한다. cloud 제공 중이면 백업 내려받기·계정 데이터 삭제·유지 종료일 안내를 준비하고 서버를 조용히 삭제하지 않는다.

---

## 21. 레퍼런스·MCP 예산 80,000원

### 21.1 예산의 정확한 용도

80,000원은 Phase 5~8의 모든 비용이 아니라 **좋은 앱 레퍼런스를 찾고 설계에 전달하기 위한 Mobbin·Figma·관련 MCP의 연결/단기 사용 예산**이다. Google Play 등록, EAS, Supabase, 도메인, SMTP, AI 사용료는 이 금액에 포함하지 않는다. 그런 비용이 실제로 필요하면 별도 근거와 금액을 제시한다.

| 우선순위 | 도구와 용도 | 배정 상한 |
|---|---|---:|
| 1 | Mobbin Pro: 실제 모바일 앱의 할일 선택·타이머·수동 입력·기록 원장 flow 조사와 MCP 검색 | 기본 50,000원, Figma 미사용분 재배정 가능 |
| 2 | Figma: 조사한 패턴을 OOS 4개 핵심 화면의 wireframe/prototype으로 정리하고 MCP로 구현에 전달 | 기본 30,000원, 무료 Starter 우선 |
| 합계 | 두 도구의 세금·환전·수수료 포함 실제 청구 합계 | **80,000원** |

배정액은 반드시 모두 쓴다는 뜻이 아니다. Figma Starter 연결과 디자인 파일 생성이 무료 범위에서 실제로 확인됐으므로 우선 0원으로 사용한다. MCP 한도나 필요한 편집 기능이 실제로 막힐 때만 [Figma 공식 가격](https://www.figma.com/pricing/)의 당시 checkout 총액을 다시 확인해 유료 좌석을 검토한다.

[Mobbin 공식 가격](https://mobbin.com/pricing)은 Pro에 전체 앱/flow와 MCP를 포함한다. 공식 [결제 안내](https://help.mobbin.com/en/articles/691968)에 따르면 월 결제가 없고 최소 분기 결제이며 자동 갱신된다. 2026-09-06 로그인된 계정의 분기 Pro 결제 63,000원이 완료됐다. Figma를 무료로 쓰면 총 상한 80,000원 안이며 17,000원이 남는다. 갱신 전 계속 사용할 필요를 다시 판단하고, Figma 유료 기능은 남은 상한 안에서 실제 차단이 생길 때만 검토한다.

### 21.2 레퍼런스 사용 기준

- 조사 대상은 `할일을 고르는 시트`, `타이머`, `수동 시간 입력`, `날짜별 기록 원장` 네 화면과 이를 잇는 전환으로 제한한다. P5에서는 타이머를 경과+정지로 번역하고 남은/초과·일시정지/재개는 P6 시안임을 분리 표시한다.
- 하나의 출시 앱에서 확인한 하나의 연속 flow를 주 레퍼런스로 삼고 OOS에 채택할 구조와 배제할 요소만 기록한다. 첫 flow에 필수 화면이 없을 때만 보조 레퍼런스 한 화면을 추가한다. 브랜드·그래픽·문구를 그대로 복제하지 않는다.
- Mobbin/Figma MCP는 에이전트의 조사·설계 전달 도구다. 공개 앱의 runtime dependency나 사용자 필수 가입 조건으로 넣지 않는다.
- 사용자 실제 기록·메모·계정 정보는 외부 디자인 도구에 올리지 않는다. 합성 데이터만 사용한다.
- 무료 기능으로 충분하면 지출은 0원이다. 유료 기간이 끝나도 구현과 유지보수가 가능하도록 최종 결정은 저장소의 명세·토큰·화면 구조에 남긴다.

### 21.3 사용자와 에이전트의 역할

| 사용자 | 에이전트 |
|---|---|
| Mobbin/Figma의 외부 로그인·OAuth 승인과 유료 checkout 최종 확인 | 무료 기능과 연결 가능 여부 확인, 연결·checkout 화면을 준비하고 핵심 4화면에 필요한 최소 이용 기간 제안 |
| 합성 데이터로 만든 화면 방향 확인 | Mobbin/Figma에서 레퍼런스 비교, OOS wireframe과 구현 규칙으로 정리 |
| Play·서버 등 별도 비용이 생기면 그때 범위 결정 | 이 80,000원을 다른 서비스 비용으로 전용하지 않고 별도 비용을 구분해 보고 |

2026-09-06 Figma MCP와 Mobbin ChatGPT 플러그인 설치를 확인했다. Mobbin은 권한 화면에서 설치 상태로 조회되지만 현재 Codex 작업에는 전용 callable 도구가 노출되지 않았다. Tiimo flow 확인 결과는 유지하고, Figma Starter 일반 쓰기 한도에 걸린 뒤에는 추가 결제 없이 합성 데이터 4화면을 기존 파일의 [node 13:2](https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F?node-id=13-2)에 capture해 선행 게이트를 충족했다. 두 도구는 앱 runtime dependency가 아니다.

---

## 22. 요구·첨부 충돌 처리와 추적

| 근거 | 이번 처리 | AC / 상세 |
|---|---|---|
| 사용자 1: 확실한 오늘 할일 확인·슬라이드 | 상시 명시 버튼 + 유휴 콜드 시작 자동 시트 | §17.3 |
| 사용자 2 + 후속 답변: 소진 후 계속 측정 | countdown→overtime, 종료 때 실제 확정 | §18.1~4 |
| 사용자 3: 직접 몇 시간 입력 | 독립 manual entry, 시간 칩·임의 날짜 | §18.5 |
| 사용자 4: 깔끔한 기록 | 통합 entries·날짜 원장·계획 영수증·출처 | §18.5~7 |
| 사용자 5: 외부 극단적 미니멀 참고 | 핵심 4화면에 한정해 실제 레퍼런스를 조사하고 채택 구조만 기록 | §17·§21 |
| 사용자 6: 기존 코드/명세 변경·세밀한 AGENTS | I-1/I-2/I-9/I-14의 적용 의미·단계·화면 위치 변경, 데이터 안전은 유지 | §10, §20.1, 루트/mobile AGENTS |
| 사용자 7~8: P5 UX/P6 기능/P7 배포 준비/P8 공개·유지 | 최소 단계별 수용 기준과 필요한 실기기 확인만 유지 | §17~21 |
| 최신 예산 보정 | 80,000원을 Mobbin·Figma·MCP 레퍼런스 조사/설계 전달 도구에 배정 | I-14, §21 |
| HANDOFF의 새 Phase 미정/변경 금지 | 과거 기준선으로 보존, 새 명세는 이번 명시 요청으로 작성 | 구현 감사·CHANGELOG |
| 사전 문서의 새 sessions 테이블/source timer/manual | 기존 entries 확장 + record_method 추가, source 보존 | §18.3 |
| 사전 문서의 자동 종료/초과 실제 기록 혼재 | 자동 확정 제거, 사용자 후속 답변으로 종료 때 실제 저장 | §18.2 |
| 사전 문서의 단일 타이머 | 새 집중 세션 하나 + 저장하고 전환; 기존 복수 기록 보존 | I-1, §18.2 |
| 사전 문서의 최대 3일 소급 | 빠른 날짜만 4개, 그 이전은 달력으로 가능 | I-1, §18.5 |
| 사전 문서의 4색/5개 선택지/기본 입력만 탭 | 토큰 기본색 4, 칩 묶음 5; 데이터 목록/필요 정보/접근성 예외 명시 | §17.4 |
| 사전 문서의 Mobbin/Sentry/Pretendard/Gorhom 필수 | Mobbin/Figma/MCP는 레퍼런스 조사 예산으로 실제 필요 시 사용; 특정 UI 라이브러리·폰트·telemetry는 자동 채택하지 않음 | §17.4/§21 |
| 사전 문서의 Phase 7 출시·8 결제·5~9 별도 문서 | 최신 요청의 5~8 구분을 사용; 결제·30일 사업 검증은 이번 범위 제외. 제공 안 된 원문은 추정하지 않음 | §3/§20, FUTURE.md |

이 명세는 사용자 목표를 구현 가능한 기본값으로 구체화한 **설계 산출물**이다. §11 새 AC 체크가 완료됐다고 선언하지 않는다. 제품·운영 단계가 실제 통과할 때마다 PLAN/TESTPLAN에 증빙을 연결한다.
