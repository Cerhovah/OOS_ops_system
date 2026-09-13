# CHANGELOG

- 2026-09-05: `0.4.3(10)` personal release에서 Metro 독립 실행, offline 기록·재시작·내보내기·로컬 알림, online 동기화·AI를 확인해 Phase 4R AC-31~35와 Phase 4S AC-36~39를 최종 통과

사용자에게 의미 있는 제품·범위·계획·검증 변경을 날짜별로 기록한다. 테스트 실행 결과 자체는 `TESTPLAN.md`, 기술적 선택은 `DECISIONS.md`에 기록한다.

## Unreleased

### v0.7 profile workspace — 2026-09-13

- 더보기 → 관리에 프로필 화면을 추가했다. 새 프로필 추가, 현재 프로필 변경, non-current 프로필 soft delete와 복구를 지원한다.
- 기존 모든 계정·항목·기록·프로젝트·주간 계획은 `백업용 프로필`에 보존하고, `연습용 프로필`을 현재 프로필로 추가했다.
- 연습용 프로필은 편입 4시간/25시간, 코디세이 미션 3시간/12시간, 사업 3시간/18시간, 수익화 2시간/10시간의 일간/주간 상한과 각각의 실행 항목을 갖는다.
- Today·Records·관리·프로젝트·주간 계획은 활성 프로필 기준으로 분리한다. 프로필 전환 전 running timer는 pause하며 삭제된 프로필의 하위 데이터는 파괴하지 않는다.
- 프로필 소속과 반복 주간 상한은 로컬 전용으로 추가했다. 기존 SQLite account/item/entry sync payload와 Supabase `oos_sync_v1` 계약은 변경하지 않았다.
- `0.7.0(15)` personal standalone을 기존 `0.6.0(14)` 위에 데이터 보존 설치했다. 원본 DB/WAL/SHM을 먼저 백업하고 기존 기록을 보존한 채 연습용 프로필 활성화와 백업용 왕복 전환을 실기기에서 확인했다.

### P5 Visual v3 UI/UX product plan — 2026-09-13

- v0.6.0의 기능·계정→항목 구조·SQLite v6·sync 계약을 보존하면서 Today를 `지금 무엇을 시작하거나 이어갈 것인가` 한 흐름으로 축소하는 제품 기획을 승인했다.
- 전체·계정·항목·상세가 각각 한 단계의 지표만 소유하게 하고, 계정 공용 상한, 평면 항목 행, trailing play 즉시 시작, 단일 current session, 여러 paused session과 `오늘 돌아보기` 재배치를 확정했다.
- Rubit은 Today 평면 목록·밀도, Todoist는 group/row 위계, Tiimo는 실행 연속성만 참고한다. Toss의 `One thing per One page`는 정보 감축 rubric으로 사용하고 브랜드·문구·화면을 복제하지 않는다.
- 기존 P5 Visual v2 Figma와 `0.6.0(13)`은 비교 기준선으로 남기되 공개 시각 source of truth 승인을 철회했다. 새 v3 Figma·읽기 전용 검수·사용자 승인 전 implementation gate를 닫았다.
- `P5 Visual v3`의 390dp Galaxy core/edge frame, 360dp·200% 적응형 증거, 실제 3-button navigation 경계를 완성하고 사용자가 승인했다. Claude 읽기 전용 대칭 검수의 13dp 제목축과 paused secondary-action 대비 지적을 Figma에 교정해 implementation gate를 열었다.
- `P5 Visual v3`를 Today의 평면 계정·항목 목록, 즉시 실행 icon, 단일 current-session, 다중 오늘 항목 선택, 간결한 돌아보기와 계정별 Records 원장으로 구현했다. 두 읽기 전용 구현 검수가 current paused session 선택, 중첩 pressable, 현재 행 중복 조작, Records 3열·그룹 대칭과 큰 글씨 적응 문제를 찾아 모두 교정했다.
- Figma 계정 header의 연결 대상 없는 화살표를 제거해 코드와 source of truth를 맞췄다. `0.6.0(14)` personal standalone을 기존 설치 위에 데이터 보존 update하고 Today→타이머 복원·전환→직접 기록→종료→Records→sync를 실기기에서 통과했다. SQLite v6와 Supabase/sync 계약은 변경하지 않았다.

### P5 Visual v2 implementation — 2026-09-13

- 승인된 `P5 Visual v2`를 Today·실행/일시정지·항목 동작 sheet·Records·하단 2탭에 구현했다. 기능 흐름은 유지하면서 360dp 기준 정보 밀도, warm stone 표면, moss 단일 강조색, 계정→항목 위계와 시스템 navigation inset 분리를 맞췄다.
- Noto Sans KR 400/500/700 세 굵기만 앱에 내장하고 글꼴 로드 전 splash를 유지해 첫 화면의 타이포그래피 흔들림을 막았다. 큰 글씨의 우측 숫자와 기록 지표는 숨기지 않고 필요한 행만 세로 배치한다.
- 앱을 `0.6.0(13)`으로 올렸다. SQLite v6, migration, repository 쓰기 의미, Supabase/sync 계약은 변경하지 않았다.

### P5 Visual v2 design environment — 2026-09-13

- 기존 P5 기능·SQLite v6·Supabase/sync 계약을 유지하고, 앱 코딩·개발 빌드 전에 reference→high-fidelity Figma→읽기 전용 검수→코드→기기 비교의 단계형 디자인 gate를 추가했다.
- timespent는 시각 master, Tiimo는 interaction master, Equinox+는 Records/Dark 보조, 하단 오늘·기록 2탭은 OOS 소유로 두는 Phase 0 계약을 사용자 승인으로 확정하고 Figma Phase 1을 시작했다.
- Figma의 기존 `P5 Approved` 페이지가 실제 존재함을 재확인했지만 잘린 목록, 불완전한 컴포넌트 표본, 4탭 충돌과 낮은 완성도로 구현 승인을 철회했다. 새 source of truth는 별도 `P5 Visual v2`다.
- Figma `Pro / Full`, Mobbin 호출, Claude Cowork의 Figma connector를 확인하고, 로컬 checksum 검증 JDK 17·Maestro runner와 read-only Claude visual reviewer를 준비했다. 개인 기기 초기화와 개인 screenshot 외부 전송은 금지한다.
- 새 `P5 Visual v2`에 52개 변수, 9개 텍스트·2개 effect style, 8개 로컬 component API, 5개 core frame, 5개 edge frame과 Today→선택→실행→일시정지/재개→종료→기록 clickable prototype을 만들었다.
- Claude 읽기 전용 검수는 blocker 없이 조건부 승인했고, 큰 글씨 숫자 말줄임·paused 구분·초과 의미·전환 시트 합성 문구를 Figma source에 최소 수정했다. 재수집한 design context/screenshot과 사용자 전체 승인으로 구현 gate를 열었다.
- 이전 public-readiness 시각 변경은 기능 기준선으로만 유지하며 새 Figma·기기 대조 전에는 공개 시각 승인으로 간주하지 않는다.

### P5 public-readiness visual refinement — 2026-09-13 (P5 Visual v2로 대체)

- Tiimo의 Today 행 밀도, timespent의 따뜻한 중립 그룹 표면·캡슐 내비게이션, Equinox+의 절제된 단색 위계를 역할별로 혼합했다.
- 포화 파랑 실행 면과 갈색 일시정지 면을 저채도 잉크 바이올렛 한 계열과 중립 상태로 바꾸고, 계정별 항목 카드를 하나의 그룹 표면·행 구분선으로 압축했다.
- 하단 탭을 시스템 inset까지 채우는 전체 폭 직사각형에서 safe-area 위의 2분할 캡슐로 바꾸고 큰 글씨 높이와 본문 footprint를 별도로 계산한다.
- 더보기의 반복 `열기` 버튼을 전체 행 터치와 단일 chevron으로 바꿔 관리 화면의 시각 소음을 줄였다.
- 기능 흐름, SQLite v6, Supabase/sync 계약은 변경하지 않았다. Figma 재조회에서는 legacy `P5 Quiet Routine`만 확인되어 과거 승인 페이지 추가 기록을 현재 디자인 증빙으로 사용하지 않는다.

### P5 Today-first personal qualification — 2026-09-12

- Expo SDK 57이 요구한 13개 patch dependency만 일괄 정렬하고 기능 코드·SQLite v6·Supabase/sync 계약은 유지했다.
- clean install 전체 자동 게이트, Expo dependency check, Doctor 21/21과 새 `0.6.0(12)` personal standalone 빌드를 통과했다.
- 기존 사용자 DB/WAL/SHM을 해시 대조 백업한 뒤 데이터 보존 업데이트 설치하고, cold start부터 일시정지 복원·타이머 전환·직접 기록·종료·원장·기존 sync까지 실기기 흐름을 통과했다.
- 현재 일상 사용 기준선을 `0.5.0(11)`에서 동일 applicationId/signing의 `0.6.0(12)` personal release로 올렸다.

### P5 Today-first redesign implementation — 2026-09-12

- `0.6.0(12)` 소스 후보에서 오늘 목록을 첫 화면에 계정→항목으로 노출하고 항목 행→compact action sheet→타이머/직접 기록 흐름을 구현했다.
- 열린 `entries` 행과 로컬 전용 `timer_runtime:{entryId}` 상태를 결합해 실행·일시정지·재개·언제든 종료를 추가했다. 중지 시 누적 active 시간만 분으로 저장하고 runtime 설정은 같은 transaction에서 제거한다.
- 다른 항목을 시작하거나 재개할 때 현재 실행으로 돌아가거나 일시정지 후 전환하도록 했고, 타이머 중 직접 기록은 현재 타이머가 계속 흐른다는 중립 안내를 거친다.
- 기존 Figma 초안은 보존하고 `P5 Approved · Foundations/Components/Screens`에 Light/Dark 토큰, 핵심 컴포넌트 5종, 승인 상태 9개를 편집 가능한 구조로 추가했다.
- active/paused 다중 기기 동기화, 서버 schema/payload/RPC 변경, 원격 EAS APK와 기존 데이터 설치는 수행하지 않았다.

### P5 Today-first redesign approval — 2026-09-12

- 첫 화면에 계정→항목 오늘 목록을 즉시 노출하고 행 선택 뒤 compact action sheet에서 시작 또는 직접 기록을 고르는 흐름을 승인했다.
- 단일 로컬 타이머의 실행·일시정지·재개·부족해도 종료, 경과·남은 또는 signed 초과 표시, 종료 뒤 오늘/기록 동시 반영을 P5 계약으로 확정했다.
- active timer의 다중 기기 동기화와 server schema/payload/RPC 호환은 P6로 분리하고, 계약 변경 전에 사용자에게 서버 준비 사항을 알리도록 고정했다.
- Tiimo를 주 레퍼런스로 유지하고 timespent와 Equinox+를 각각 계획 진입과 완료 복귀의 제한적 보조 레퍼런스로 확정했다. 기존 Figma 정적 4화면은 legacy 비교용으로 보존한다.
- Figma 연결을 `Pro / Full`로 재확인했으며 추가 결제·재연결은 필요하지 않다.

### Current-state documentation reset — 2026-09-09

- 미구현 기능과 출시 일정을 정의하던 계획·질문·예산·상용화 사전 문서를 제거했다.
- SPEC, README, AGENTS와 검증·결정 문서를 현재 구현과 이미 수행한 증빙만 남도록 정리했다.
- 코드, dependency, SQLite, Supabase, 기기 설치 상태와 과거 구현 증빙은 변경하지 않았다.
- Mobbin 호출이 정상임을 재확인하고 최신 Tiimo 9화면 흐름을 대조했다. Figma는 연결됐지만 `Starter / View` 좌석이라 네이티브 캔버스 쓰기 요건을 충족하지 않는다는 진단을 기록했다.

### Phase 6-1 implementation — 2026-09-08

- 더보기를 안정된 id/route/capability 설정으로 기능·관리·시스템 9개 진입점에 나누고 시간과 알림·항목·계정·기록·AI 설정을 각각 전용 화면으로 옮겼다.
- 오늘 선택·저장된 항목 불러오기·직접 기록·항목 관리·기록 원장을 계정→항목 계층으로 바꾸고, 기록에 계정별 소계와 보존된 계획이 없는 과거 날짜의 `계획 미보존`을 유지했다.
- `주간`을 `지표`로 바꾸고 날짜 선택 달력, 기록 점, 2026 공식 공휴일 이름, 선택 날짜 한 건 상세, `주간보기`와 달력 접기를 추가했다. 개인 일정/OAuth/runtime 공휴일 API는 추가하지 않았다.
- `계획`을 `주간 시간 분배`로 바꾸고 공통 정수 분 parser와 `분`·`시간` formatter를 입력→저장→집계 경계에 연결했다.
- Galaxy 기종 상수 대신 safe-area inset·글꼴 배율로 탭 높이와 본문 하단 여백을 계산하도록 바꿨다.
- SQLite schema/repository 쓰기/sync/server/타이머 계약은 변경하지 않았다. Android 개발 빌드 핵심 화면과 3-button 하단 safe-area를 통과하고 기존 personal standalone 설치를 복구했다.

### Phase 5 completed — 2026-09-06

- P5 시각 설계 전에 Mobbin의 출시 모바일 앱 연속 flow 하나를 주 레퍼런스로 확인하고 Figma OOS 4화면으로 번역했다. 데이터·sync 계약은 바꾸지 않았다.
- 당시 Figma MCP와 Mobbin ChatGPT 플러그인 설치를 확인했으나 Mobbin callable 도구가 노출되지 않아, 확인한 Tiimo 링크와 합성 데이터 Figma 4화면만 기준으로 사용했다.
- Mobbin의 Tiimo `Completing a task` 5화면을 P5 주 레퍼런스로 정하고 Quiet Routine 번역 규칙을 추가했다. 하위 작업·진행률·게임화는 제외했다.
- theme/token과 공용 UI, 오늘·기록 2탭, TaskSheet, P5 경과 TimerView, 날짜별 기록 원장, 기존 기능의 더보기 이동을 구현했다.
- 자동 전체 게이트와 Android 개발 빌드 핵심 흐름·200% 글꼴·DB 원본 복원을 통과하고, 최종 `0.5.0(11)` personal standalone을 데이터 보존 설치해 Metro 독립 콜드 스타트와 기존 타이머 지속을 확인했다.
- P5는 오늘/기록 2탭, 할일 자동 시트, 명시적 재열기 버튼과 기존 경과 타이머를 구현했다.
- 수동 과거 기록을 임의 기간으로 제한하지 않는 원칙을 유지했다.
- 외부 앱 비교와 구현 감사를 기록하고 기존 기록·계획·개인용 sync/AI를 보존하는 기준을 적용했다.

### Added

- 2026-09-05: `0.4.3(10)` personal release APK 생성·데이터 보존 설치와 embedded bundle·non-debuggable·PC/Metro 독립 cold start 증빙 추가

### Fixed

- 2026-09-05: SQLite v6 이전에 동기화된 AI 세션이 새 nullable 감사 필드를 갖지 않아 pull을 중단하던 문제를 명시적 legacy 호환 정규화로 수정
- 2026-09-04: 사용자 지시에 따라 기존 Phase 1·2·4 의미를 보존하는 Phase 4R과 PC·Metro 없는 Android 개인용 Phase 4S를 SPEC v0.3.0의 AC-31~AC-39로 추가
- 2026-09-04: PKCE code-only callback, 네이티브 SecureStore session adapter, 기존 Expo SQLite Auth key의 선이관·후삭제와 경합 회귀 테스트 추가
- 2026-09-04: SQLite v5 상향 migration과 v4→v5 데이터 보존·정확한 settings prefix·migration rollback 회귀 테스트 추가
- 2026-09-04: Supabase RPC의 owner/schema/settings allowlist·batch/record 크기 제한과 Edge Function의 JSON/body/snapshot/date/mode/question 검증, RLS 보안 회귀 테스트 추가
- 2026-09-04: 요청 snapshot과 자유질문의 전송·저장 이중 credential redaction, 완료된 4·8·12주 기간 계산, 출력 필드별 객관 데이터 anchor와 사용자 서술 금지 검증 추가
- 2026-09-04: 공개 변수 이름만 담은 `mobile/.env.example`, 고정 action/Node/npm/Supabase CLI 기반 GitHub Actions와 Dependabot 설정 추가
- 2026-09-04: Phase 4R의 자동·원격·새 build 실기기 결과를 분리 기록하는 readiness 증빙과 Phase 4S standalone 검증 계획 추가
- 제품 전체 명세와 Phase 1~5 개발 구조
- 계획, 결정, 질문, 테스트, 미래 범위 관리 문서
- 저장소 기본 README와 `.gitignore`
- 2026-08-20: Phase 1 AC-1~AC-18 각각의 구현 결과·완료 조건·검증 증빙 계획
- 2026-08-20: AC-1~AC-18과 1:1로 연결된 TP-AC-01~TP-AC-18 검증 계획 및 하루치 실기기 시나리오
- 2026-08-20: Phase 1 실기기 검증 대상을 정하는 Q-001
- 2026-08-20: VS Code 프로젝트 터미널 설정, LF 정책, AGENTS/CLAUDE 역할 지침, Windows/macOS 재현 환경 문서
- 2026-08-20: Expo SDK 57 앱을 `mobile/`에 생성하고 SQLite v1 마이그레이션·§4.4 시드·repository 계층 추가
- 2026-08-20: 오늘/주간/프로젝트/계획/설정과 분석 비활성 안내의 5탭 Router UI 추가
- 2026-08-20: 다섯 기록 유형, 타이머·수동 기록, 소프트 삭제·복구, append-only 계획, KPI, 종료 스냅샷, JSON/CSV 내보내기 추가
- 2026-08-20: 오늘 종료·항목 일정·타이머 상한 로컬 알림, Android HIGH 채널과 콜드 스타트 딥링크 추가
- 2026-08-20: TypeScript/ESLint/Vitest 90% 커버리지/Expo 검사/doctor/Android Hermes bundle을 `npm run verify`로 통합
- 2026-08-20: EAS 프로젝트 `@ljh951206/oos-ops` 연결 및 설치 가능한 Android development APK build `67a46042-d559-42ee-a321-dd6db1101431` 생성
- 2026-09-02: 기존 development APK를 만료 전 로컬 보존하고 개발 환경 복구 증빙 문서 추가
- 2026-09-02: SDK 57 호환 패치 기준 Android development build `5448b354-f54f-4d17-b657-36f8b97afa48` 완료 및 APK 로컬 보존
- 2026-09-02: SQLite v2 outbox·충돌 로그·동기화 상태, Supabase OTP 세션·RLS/RPC, 자동/수동 동기화와 설정 UI를 Phase 2로 추가
- 2026-09-02: 실제 SQLite v2 migration/trigger, LWW 충돌 적용·기록, 설정 allowlist, RLS migration 보호를 포함한 Phase 2 테스트 17개 추가
- 2026-09-02: 기존 Supabase migration 이력 3건을 저장소에 회수하고 Phase 2 원격 schema·RLS/RPC migration 2건을 적용
- 2026-09-02: 원격 인증 역할 시뮬레이션 RLS 검사를 추가하고 소유자 접근 허용·타 사용자 SELECT/UPDATE/DELETE/INSERT 차단을 데이터 변경 없이 확인
- 2026-09-03: 단일 허용 대화 Telegram Edge Function, 8개 정확 명령, 자유 문장 확인 제안, 음성 전사·구조화 provider adapter, 21:30 오늘 요약과 종료 버튼 추가
- 2026-09-03: Telegram connection/proposal/update/delivery schema와 RLS, Vault cron·webhook·명령 메뉴를 한 번에 연결하는 보안 PowerShell 스크립트 추가
- 2026-09-03: 앱 설정에 Telegram 연결 상태, 발송 시각, 활성화 저장·새로고침 UI 추가
- 2026-09-04: Phase 4 여섯 분석 모드, 4·8·12주 데이터 package, 세션 검색·전송 snapshot 열람, 구조화 계획 제안과 명시적 적용/무시 UI 추가
- 2026-09-04: SQLite v4 분석 세션·제안 저장, 사용량·예상 비용, 확정 provider/model 기본값과 Phase 2 동기화 확장 추가
- 2026-09-04: Q-010 승인으로 OpenAI Responses API `gpt-5.6-terra`와 현재 단가를 확정하고 `store:false`·strict JSON Schema 서버 adapter 추가
- 2026-09-04: OpenAI 공식 모바일 키 보안 지침과 상용 서버 목표에 맞춰 기기 직접키 방식을 단일 소유자 인증 Supabase Edge Function·서버 secret 방식으로 대체
- 2026-09-04: SM-S721N에서 6개 분석 모드와 §5.7 네 질문을 포함한 실세션 9건, 제안 적용·무시, 원격 동기화를 검증해 Phase 4 AC-27~AC-30 완료

### Changed

- 2026-09-04: 앱 소스 버전을 Phase 4R 기준 `0.4.1(8)`로 상향하고 `expo-secure-store` native plugin을 추가해 새 development binary를 필수 게이트로 지정
- 2026-09-04: 큰 `AppRepository`를 도메인 repository와 공용 row mapper/writer로, sync repository를 local/remote persistence·codec으로, 분석 package를 계산·예산 경계로 분리
- 2026-09-04: 설정·프로젝트·분석 화면을 orchestration과 section/draft/view-model로 나누고 snapshot·refresh·draft 저장의 비동기 경합을 명시적으로 제어
- 2026-09-04: 분석 기간을 진행 중인 경계 주가 아닌 직전까지 완료된 최근 4·8·12주로 정의하고 UI 문구와 snapshot preview를 실제 첨부 범위에 맞춤
- 2026-09-04: Supabase Auth client를 PKCE와 `shouldCreateUser:false`로 제한하고 local config의 신규 가입 기본값을 비활성화. hosted Auth 적용은 Q-013 확인 대기
- 2026-09-04: `npm run verify`에 모바일↔Supabase Edge 요청·보안 계약 테스트를 포함하고 EAS CLI 23.2.0·Supabase CLI 2.116.0·npm 11.17.0을 재현 기준으로 고정
- 2026-09-04: GitHub Actions 런타임 경고를 없애기 위해 Dependabot이 검증한 Checkout 7·Setup Node 7·Supabase Setup 3의 정확한 commit SHA로 갱신
- 2026-09-04: sync RPC hardening migration `20260904020000`과 `ai-analysis` v3를 원격 배포하고 migration up to date·DB lint 0·RLS 회귀·익명 direct DML/함수 호출 401을 확인
- 2026-09-04: Expo SDK 57 최신 호환 패치(`expo` 57.0.20, notifications 57.0.17, router 57.0.19, sharing 57.0.18)를 잠금 파일에 정렬하고 GitHub Actions run `33856353851`의 mobile·clean database 작업을 모두 통과
- 2026-09-04: SecureStore 포함 EAS development build `ce72a92f-6fe5-456f-9a48-d9863788abaf` 생성을 완료하고 APK와 SHA-256을 로컬 보존. 설치·세션 이관·실기기 회귀는 별도 대기
- 2026-09-04: 실제 전송 snapshot을 포함한 분석 세션과 자식 제안을 같은 tombstone으로 소프트삭제·복구하고, 설정 복구 UI와 표시 세션 범위 제안 조회를 추가
- 2026-09-04: 앱 데이터 table manifest에서 export/reset을 파생하고 실제 SQLite schema, seed bootstrap 정책, 모바일↔서버 동기화 allowlist의 exact-set 계약을 추가
- 2026-08-20: Phase 1을 사용자 구현 승인 대기 상태로 명시하고 승인 후 작업 순서를 고정
- 2026-08-20: 후속 Phase의 수용 기준 범위를 SPEC에 맞게 Phase 2 AC-19~AC-22, Phase 3 AC-23~AC-26, Phase 4 AC-27~AC-30으로 수정
- 2026-08-20: README에 현재 문서 전용 상태, 실행·개발 빌드 절차의 적용 시점, 환경변수·비밀값 정책을 명시
- 2026-08-20: 사용자 결정값과 PLAN 승인·Phase 1 착수 상태 반영
- 2026-08-20: 루트 관리 문서와 `mobile/` Expo 앱 분리, npm 단일 사용, EAS development build 우선 결정을 ADR-001로 확정
- 2026-08-20: Phase 1 자동 구현 완료, EAS 로그인·Android development build·실기기 게이트 대기 상태로 변경
- 2026-08-20: Phase 1을 EAS build 통과·Android 실기기 설치 및 TP-AC-01~TP-AC-17 검증 대기(Q-003) 상태로 변경
- 2026-09-02: Expo SDK 57 내부 호환 패치를 공식 `expo install --fix`로 정렬하고 자동 게이트·Metro 기동을 재검증
- 2026-09-02: EAS development 환경의 기존 Supabase 변수 처리 결정을 Q-004로 분리
- 2026-09-02: Phase 1 정적 구현 감사에서 일정 포함 항목 복구, 주 시작 요일 설정, KPI 값 이력 관리, 종료 후 알림 재예약을 수동 재현·보완 항목으로 추가
- 2026-09-02: SM-S721N(Galaxy S24 FE)에 0.1.0 development build 업데이트 설치 완료를 반영하고 Metro 연결·Android 버전·실기기 게이트를 남은 단계로 좁힘
- 2026-09-02: 사용자가 요청한 앱 스토어 배포·결제·운영 서버 완결 목표가 현재 SPEC §3.3 밖임을 확인하고 Q-005/F-005로 명세 확장 결정을 분리
- 2026-09-02: Phase별 `feat`/`fix`/`docs` 커밋 유형, 상태·검증 명령, 명시적 staging 규칙을 `docs/COMMIT_WORKFLOW.md`에 추가
- 2026-09-02: 기존 EAS-Supabase 연결을 Phase 2에서 유지하기로 하고, SQLite 보존형 자체 outbox/LWW/충돌 로그 동기화 결정을 ADR-007로 기록
- 2026-09-02: LAN QR 실패에 대비해 재현 가능한 로컬 `@expo/ngrok` devDependency와 Metro tunnel 절차를 추가
- 2026-09-02: development/개인용 standalone/production 빌드와 EAS Update·상용 결제까지의 정밀 전략 감사를 추가하고 현재 SDD의 강점·부족 범위를 구분
- 2026-09-02: 기존 수기 검증 결과를 사용자 승인으로 승계해 Phase 1 게이트를 확정하고 Phase 2로 전환
- 2026-09-02: 인증은 명세 기본값인 이메일 OTP, 전체 초기화는 원격 백업을 삭제하지 않는 기기 로컬 초기화로 확정
- 2026-09-02: 앱 버전을 Phase 2 development build용 `0.2.0(2)`로 상향
- 2026-09-02: Phase 2 네이티브 네트워크 모듈을 포함한 Android development build `1ead311c-9397-4f53-8893-36193025ab02` 제출
- 2026-09-02: Supabase Free 기본 메일 제공자의 OTP 템플릿 제한을 확인하고 무료 매직링크 전환 결정을 Q-007로 분리
- 2026-09-02: Q-007 승인에 따라 이메일 매직링크, `oosops://auth/callback`, implicit/PKCE 세션 처리와 전용 callback 화면으로 인증을 전환
- 2026-09-02: hosted Supabase Auth의 허용 redirect에 `oosops://auth/callback`을 추가하고 Android build 번호를 3으로 상향
- 2026-09-02: 매직링크 callback 기준 Android development build `154087e2-b93d-451a-b62c-ba6e988f4592` 완료 및 APK 로컬 보존
- 2026-09-02: 남은 Android 실기기 게이트 자동화를 위해 공식 ADB Platform-Tools 37.0.1 개발 환경 추가
- 2026-09-03: 앱 버전을 Phase 3 기준 `0.3.0(4)`로 상향하고 Supabase `telegram-bot` Edge Function v2와 두 Phase 3 migration을 원격 배포
- 2026-09-03: Telegram 제거 릴리스 기준 앱 버전을 `0.3.1(5)`로 상향하고 Phase 4를 다음 활성 단계로 지정
- 2026-09-03: Phase 3 마감 정리 릴리스 기준 앱 버전을 `0.3.2(6)`로 상향
- 2026-09-03: 앱 이름 문자열을 공통 상수로 통합하고 두 SQLite 통합테스트의 메모리 어댑터를 공용 테스트 유틸리티로 합침
- 2026-09-03: TypeScript 미사용 local/parameter 검사를 상시 typecheck 게이트에 포함하고 README·SPEC·PLAN·TESTPLAN·ENVIRONMENT의 현재 단계·빌드 안내를 일치시킴
- 2026-09-03: Phase 종료 시 에이전트가 검증·커밋·rebase·push를 자동 수행하도록 커밋 워크플로를 간소화
- 2026-09-04: Phase 4 실제 AI 호출만 Q-010 제공자·모델·과금 결정으로 분리하고, 독립적인 앱·데이터·테스트·실기기 작업은 계속 진행하도록 단계 경계를 명시
- 2026-09-04: 분석 첨부 데이터에 계정별 계획·실제뿐 아니라 항목별 일정/기본 예상시간 차이, 프로젝트별 주간 투입과 KPI 이력을 포함해 §5.7 예시 질문 네 종류를 지원
- 2026-09-04: 기존 v3 기기에 확정 provider/model 기본값을 추가하는 SQLite v4 상향 migration과 모바일/서버 프롬프트 계약 드리프트 테스트 추가
- 2026-09-04: Phase 4 완료 릴리스 기준 앱 소스 버전을 `0.4.0(7)`로 상향

### Removed

- 2026-09-04: 사용하지 않는 `expo-status-bar`와 source dead export 4개, 중복 화면/저장 로직, module 전역 AppState listener를 제거하고 provider 수명주기로 통합
- 2026-09-04: 매직링크 URL fragment의 access/refresh token 수락과 인증 세션의 SQLite 평문 fallback 경로 제거
- 2026-09-03: 사용자 지시에 따라 Telegram을 제품 범위에서 철회하고 모바일 설정 UI·서비스·파서/서버 코드와 테스트를 제거
- 2026-09-03: Telegram webhook·봇 명령, 예약 cron, Vault secret, 전용 DB 테이블, Edge Functions와 Supabase Telegram secret 5개 제거
- 2026-09-03: 제거 후 12 files/58 tests, Expo Doctor 21/21, Android bundle·SM-S721N 런타임 오류 0, 원격 Telegram resource 0을 재검증
- 2026-09-03: 참조되지 않는 Expo 템플릿 이미지 14개와 초기화 스크립트, 중복 직접 의존성 7개, 죽은 export 제거
- 2026-09-03: 활성 `oos_sync_records` 63행을 보존하고 0행인 초기 `sync_*` 원격 테이블 3개·legacy RPC·sequence를 guarded migration으로 제거

### Fixed

- 2026-09-05: AI model selection and cost calculation moved from mobile constants to a server-owned OpenAI policy. Analysis records now retain resolved model, reasoning effort, total tokens, estimated cost, provider response ID, and request timing without changing proposal-application authority.

- 2026-09-04: 전송 도중 같은 record가 다시 수정되면 오래된 성공 응답이 최신 outbox를 지우던 경로를 `id + local_updated_at` 조건부 ACK로 수정
- 2026-09-04: 로그아웃 뒤 다른 계정이 같은 로컬 DB와 cursor를 재사용할 수 있던 경계를 최초 owner binding과 legacy 단일 cursor 이관 검증으로 차단
- 2026-09-04: unknown local/remote table·setting을 건너뛰고 cursor가 전진할 수 있던 경로를 명시적 실패로 변경
- 2026-09-04: SQL `LIKE 'item_notification:%'`의 `_` wildcard 때문에 유사 settings key가 동기화될 수 있던 문제를 SQLite/Postgres 모두 정확한 prefix 비교로 수정
- 2026-09-04: migration과 `user_version`, 설정 묶음 저장, 이전 주 계획 복사, export/snapshot 읽기 중 일부만 반영될 수 있던 경계를 transaction으로 수정
- 2026-09-04: 오래 끝난 refresh가 최신 snapshot을 덮거나 저장 완료가 사용자의 새 draft를 덮는 화면 경합, 중첩 busy 상태 조기 해제를 sequence/ref-count로 수정
- 2026-09-04: 분석 결과의 `numbers_used`와 한국어·영어 사용자 서술이 금지 검사를 우회할 수 있던 경계를 확장하고 server/mobile prompt를 정렬
- 2026-09-04: 잘못된 Supabase URL이 로컬 우선 앱 시작까지 중단시키던 경로를 안전한 설정 파싱으로 수정
- 2026-09-04: 보관 계정·항목의 기록과 계획이 AI snapshot·제안 적용에 다시 섞이던 범위를 활성 화면과 일치시킴
- 2026-09-04: 주간 코멘트 조회 실패 뒤 빈 값을 저장하거나 오늘 종료 콜드 스타트에서 기존 메모를 덮을 수 있던 hydration·저장 경합을 차단
- 2026-09-04: clean Supabase CI가 기존 Auth 사용자를 요구하던 테스트 결합을 자체 임시 사용자·전체 rollback fixture로 수정하고, multi-statement assertion은 격리 DB 컨테이너의 `psql`·`ON_ERROR_STOP`으로 실행
- 2026-09-04: Windows PowerShell 5.1에서 UTF-8 no-BOM 스크립트의 한국어 안내가 깨지던 문제를 ASCII 프롬프트와 명시적인 실패 종료 코드로 수정했다.
- 2026-09-04: 저장·동기화된 AI 제안도 렌더링과 적용 transaction에서 I-13 문구를 다시 검사하고, 삭제된 부모 세션의 제안 적용·무시를 차단
- 2026-09-04: 숫자를 문장 사이에 섞어 I-13 사용자 서술 검사를 우회하는 변형도 차단하고 회귀 사례 2개를 추가
- 2026-09-04: 삭제된 하루 종료 tombstone이 활성 snapshot에 재등장하던 문제와 타이머 행·최근 항목 설정의 부분 저장 가능성을 transaction으로 수정
- 2026-09-04: 모든 알림 예약을 단일 queue·입력 fingerprint로 직렬화하고, 예약 ID 저장 실패 보상 취소·DB 초기화 transaction의 cleanup manifest·실패 재시도·종료 뒤 30일 rolling horizon을 추가. 기존 PUBLIC 채널 재사용을 피하도록 `daily-records-v3` PRIVATE 채널로 상향
- 2026-09-04: AI 누적 사용량 조회 실패를 0건으로 위장하지 않고 오류로 표시하며, 공통 제목·선택·오류 UI의 TalkBack 의미를 보강
- 2026-09-04: 호환 범위 안의 `@xmldom/xmldom`을 보안 패치하고, 남은 npm audit 경고를 Expo Router 런타임 가용성 경로와 실행 번들에 포함되지 않는 UUID 도구 경로로 분류. Expo SDK 하향이나 CJS/ESM 계약을 깨는 강제 override는 적용하지 않고 공식 호환판 갱신 조건을 기록
- 2026-09-04: Phase 4R 수명주기·보안 리팩터 커밋 `686eb1e`를 원격 `main`에 반영하고 GitHub Actions run `33864610433`의 mobile·clean database 작업을 모두 통과

- 2026-08-20: 계획 합계가 168시간과 다르거나 음수여도 형식이 유효하면 저장할 수 있도록 I-1 비차단 동작 수정
- 2026-08-20: 진행 중 타이머를 고정 일정 완료로 오인해 남은 가용시간에서 누락하던 계산 수정
- 2026-08-20: 시간형 `count_on_complete`가 타이머 정지·수동 기록에서 횟수 1을 보존하도록 수정
- 2026-09-02: 항목 복구 시 같은 삭제 작업에서 제거된 일정도 트랜잭션으로 복구하도록 수정
- 2026-09-02: 주 시작 요일을 7개 요일 중 선택하고 주간·계획·프로젝트 주 범위에 적용하도록 수정
- 2026-09-02: KPI 값 기록 수정·소프트 삭제·복구 경로를 추가
- 2026-09-02: 오늘 종료 후 알림 설정 변경·권한 재요청이 당일 종료 상태를 잃지 않도록 수정
- 2026-09-02: Expo SDK 57에서 `SQLiteProvider`의 `useSuspense`와 함께 사용할 수 없는 `onError`를 제거해 Android 시작 시 렌더 오류를 수정
- 2026-09-02: 원격 DB lint가 찾은 `apply_oos_sync_records` conflict target 이름 모호성을 후속 migration으로 수정
- 2026-09-02: 원격 백업이 있는 pristine 재설치에서 현재 주 기본계획 seed가 중복 업로드되던 복원 경계를 원자적 원격 교체로 수정하고, 로그인 전 로컬 변경은 보존하도록 회귀 테스트 추가
- 2026-09-02: SM-S721N에서 오프라인→온라인, 매직링크 세션 복구, 초기화 후 전체 데이터 대조, 수동 동기화와 RLS를 확인해 Phase 2 AC-19~AC-22를 완료
- 2026-09-03: Telegram webhook 실패 update를 재시도 가능 상태로 남기고 결정적 entry/proposal ID를 upsert해 재전송 중복·누락 경계를 보완
- 2026-09-03: Android 알림 채널의 기본음을 커스텀 파일명 `default`로 전달해 런타임 오류 로그가 발생하던 설정을 SDK 기본음 생략 방식으로 수정
- 2026-09-03: Windows PowerShell 5가 Supabase CLI의 정상 stderr 진행 문구를 terminating error로 처리해 Telegram 설정이 중단되던 호환성을 실제 CLI 종료 코드 판정으로 수정
- 2026-09-03: 대화형 Supabase CLI의 JSON wrapper 차이로 `rows` 속성 조회가 중단되던 설정 경로를 전용 SQL alias의 UUID 추출 방식으로 수정
- 2026-09-03: webhook 완료 뒤 선택적 환영 메시지 실패가 전체 연결 실패처럼 보고되던 경로를 제거하고 webhook URL 자체를 최종 성공 조건으로 변경
