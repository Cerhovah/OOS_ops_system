# CHANGELOG

사용자에게 의미 있는 제품·범위·계획·검증 변경을 날짜별로 기록한다. 테스트 실행 결과 자체는 `TESTPLAN.md`, 기술적 선택은 `DECISIONS.md`에 기록한다.

## Unreleased

### Added

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

### Changed

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

### Fixed

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
