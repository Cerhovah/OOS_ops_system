# CHANGELOG

사용자에게 의미 있는 제품·범위·계획·검증 변경을 날짜별로 기록한다. 테스트 실행 결과 자체는 `TESTPLAN.md`, 기술적 선택은 `DECISIONS.md`에 기록한다.

## Unreleased

### Added

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
- 2026-08-20: FUTURE 후보에 ID·명세 근거·착수 조건을 추가하고 비목표와 분리
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
