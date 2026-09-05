# TESTPLAN

## 원칙

- TP-AC-01~TP-AC-18은 AC-1~AC-18과 1:1로 대응한다.
- 자동테스트·번들 성공만으로 알림, 공유 sheet, 오프라인, 탭 수, 아이콘 실행을 통과 처리하지 않는다.
- 각 구현 단계의 회귀 대상은 EAS development build가 설치된 Android 실기기다. Phase 4S의 최종 개인용 대상은 development client가 아닌 standalone Android build이며, 기기 모델·Android 버전·앱 build URL/ID·실행 날짜를 결과에 남긴다.
- 실패/권한 거부/앱 재시작/비행기 모드/소프트 삭제·복구 경로를 포함한다.

## 자동 게이트 결과 — 2026-08-20

| 검사 | 결과 |
|---|---|
| Node/npm 프리플라이트 | Node v24.19.0, npm 11.17.0 |
| TypeScript strict | 통과, 오류 0 |
| ESLint | 통과, 경고·오류 0 |
| Vitest | 3 files, 22 tests 통과 |
| 도메인 커버리지 | statements 99.07%, branches 93.33%, functions 100%, lines 100% |
| Expo dependency check | `Dependencies are up to date` |
| expo-doctor | 21/21 checks passed |
| Android Metro/Hermes | 1,367 modules bundle, HBC 생성 성공 |
| 금지 문구/우회 정적 검색 | 게임화·사람 서술·`any`·게이트 우회 0건. `모의점수`는 사용자 KPI 이름이므로 허용 |

전체 명령과 보안 경고 검토는 `docs/evidence/phase-1-automated.md`에 보존한다.

## 개발 환경 복구 재검증 — 2026-09-02

- `npm ci` 후 SDK 57 호환 패치를 `npx expo install --fix`로 정렬했다.
- `npm run verify` 종료 코드 0: TypeScript/ESLint 0건, 21 tests, 도메인 커버리지 99.05/92.85/100/100, 의존성 호환 통과, expo-doctor 21/21, Android HBC 생성 성공.
- Metro 개발 서버 HTTP 200과 `packager-status:running`을 확인했다.
- 상세 명령·해시·감사 결과: `docs/evidence/phase-1-recovery-2026-09-02.md`.
- 네이티브 패치 기준 build `5448b354-f54f-4d17-b657-36f8b97afa48`을 설치했고, 사용자가 기존 TP-AC-01~17 실기기 결과를 승계하도록 승인했다.
- 정적 감사 보완 후 `npm run verify` 종료 코드 0: 22 tests, 도메인 커버리지 99.07/93.33/100/100, Android HBC 1,374 modules.
- 사용자는 TP-AC-01~TP-AC-17 실기기 검증을 이전에 이미 완료했다고 2026-09-02 재확인했고, RA-01~04도 자동 회귀 결과를 근거로 반복 실기기 검증 없이 승계하도록 승인했다. 이후 SM-S721N의 Android 버전과 최신 Metro 런타임을 별도로 기록했다.
- Metro tunnel을 통한 Android bundle 요청·완료를 확인해 기기↔Metro 연결을 통과 처리했다. 시작 중 발견된 SDK 57 `SQLiteProvider` Suspense 옵션 충돌은 수정했고, 이후 SM-S721N에서 앱 top-resumed와 오류 로그 0건을 재확인했다.

## AC별 검증

| ID | 자동/코드 증빙 | development build 수동 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-01 | app/eas config, Android bundle, EAS build `FINISHED` | APK 설치 → 홈의 OOS Ops 아이콘 탭 → 한국어 오늘 화면 확인 | **통과**: SM-S721N 설치·아이콘·Metro 실행 확인 |
| TP-AC-02 | §4.4 seed manifest 3 tests | 첫 실행 시 14계정·168h·8항목·2프로젝트 확인 → 시드 계정/항목 편집·보관·삭제·복구, 프로젝트 상태/삭제·복구, KPI 편집·삭제·복구 | **통과(사용자 승인 승계)** |
| TP-AC-03 | Today actions 구현 | 아이콘→`작업 시작`으로 편입 타이머 시작(총 2탭), 정지 1탭, 완료/횟수/되돌리기 1탭, 수동 시간 2~3탭과 5~10초 측정 | **통과(사용자 승인 승계)** |
| TP-AC-04 | repository lifecycle | 5개 유형을 각각 생성·기록·수정·삭제·복구하고 값/단위/횟수/시간 보존 확인 | **통과(사용자 승인 승계)** |
| TP-AC-05 | 요일/dedupe tests | 해당 요일의 통학/필수 일정 확인 → 같은 항목 수동 추가·재실행 후 한 행만 표시 확인 | **통과(사용자 승인 승계)** |
| TP-AC-06 | 남은 시간 경계값 tests | 하루 종료 시각 변경, 미수행 일정/완료 기록 변경 후 상단 남은 시간·계획→실제 즉시 반영 및 음수 표시 0 확인 | **통과(사용자 승인 승계)** |
| TP-AC-07 | close repository/UI | 오늘 종료에서 계산·긴 메모 저장 → 종료 후 기록 수정 → 종료 화면/주간 실제 변화와 비잠금 확인 | **통과(사용자 승인 승계)** |
| TP-AC-08 | week aggregates/UI | 계정 표와 합계 대조 → 항목·요일 분해 열기 → 요일 토글 → 긴 코멘트 저장/재시작 보존 | **통과(사용자 승인 승계)** |
| TP-AC-09 | 168 상태 tests | 168h 미만·초과·음수 계획에서 배지/합계 즉시 변경, `조정하기`와 `그대로 저장` 확인 | **통과(사용자 승인 승계)** |
| TP-AC-10 | append-only repository | 계획 2회 저장 → 모든 버전 열람 → 과거 복원 후 새 버전 증가와 이전 버전 불변 확인 | **통과(사용자 승인 승계)** |
| TP-AC-11 | copy repository/UI | 다음 주로 이동해 `지난주 계획 복사` 1탭 → source와 값 확인, 원본 불변 확인 | **통과(사용자 승인 승계)** |
| TP-AC-12 | KPI aggregation tests/UI | 프로젝트/KPI 추가 → 카드에서 값 기록 → 합계 확인 → 연결 time 기록 후 누적/이번 주 투입시간 대조 | **통과(사용자 승인 승계)** |
| TP-AC-13 | DAILY/DATE route code | 알림 시각을 3~5분 뒤로 설정 → 앱 완전 종료 → 알림 탭 → 오늘 종료 콜드 진입. 종료한 날 건너뜀/항상 받기 각각 확인 | **통과(사용자 승인 승계)** |
| TP-AC-14 | HIGH channel/permission/rebook code | 최초 허용, OS 설정에서 채널 중요도 확인, 거부 후 설정 재요청, 앱 강제종료·재시작 후 예약 복구 확인 | **통과(사용자 승인 승계)** |
| TP-AC-15 | CSV/JSON 3 tests | 삭제 행과 계획 여러 버전 생성 → JSON 전체/각 CSV 공유·저장 → 원본 SQLite 값/행과 대조 | **통과(사용자 승인 승계)** |
| TP-AC-16 | 원격 API 없음/SQLite 구조 | 비행기 모드 ON → 기록·수정·삭제·복구·계획·프로젝트·종료 → 앱 재시작 후 보존 → 비행기 모드 OFF | **통과(사용자 승인 승계)** |
| TP-AC-17 | 금지문구 정적 검색 | 오늘/주간/프로젝트/계획/분석/설정/모달/빈 상태/오류/알림 전체에서 판정·점수화·연속일수·사람 서술 0건 확인 | **통과(사용자 승인 승계)** |
| TP-AC-18 | 계산·export·seed 22 tests, 90% gate | 수동 절차 없음 | **통과** |

## Phase 2 자동·실기기 게이트 — 2026-09-02

| ID | 자동/코드 증빙 | development build 수동 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-19 | SQLite v2 backfill/trigger 실제 실행, 매직링크 callback·pull-before-push·pristine seed 교체 bootstrap. 당시 build는 implicit/PKCE parser를 사용했으며 현재 `0.4.1(8)`은 PKCE code-only로 강화됨 | 이메일 링크를 같은 기기에서 열어 앱 복귀·로그인 → 대기 0 확인 → 앱 데이터 초기화 후 세션 유지 재실행 → 전체 데이터 대조 | **통과(역사적 Phase 2 결과)**: 원격 63행, 복구 로컬 계획 1/14·기록 4·outbox 0·충돌 0, SQLite `quick_check=ok`. 현재 PKCE/SecureStore 회귀는 TP-R-03에서 별도 대기 |
| TP-AC-20 | outbox unique capture, LWW 순수 함수, local/remote 양측 승자·충돌 단위테스트 | 모바일 데이터 차단 상태에서 기록 → 온라인 복귀 → 자동 전송 확인 → 충돌 로그와 최종값 확인 | **통과**: 오프라인 outbox 0→1, 온라인 1→0·원격 63→64; 실제 병합 충돌 7건 UI 표시 확인 후 검증 데이터 정리 |
| TP-AC-21 | 설정 UI에 로그인·마지막 시각·대기 건수·수동 버튼·충돌 목록 연결 | `지금 동기화` 탭 → 시각 갱신, 대기 0, 로컬 기록 보존 확인 | **통과**: 최종 복원 후 시각 23:03:46→23:05:38, 대기 0·충돌 없음 |
| TP-AC-22 | 원격 migration 적용, DB lint 오류 0, 익명 REST SELECT·RPC HTTP 401, 모든 정책에 `to authenticated`와 `(select auth.uid()) = user_id`; `phase_2_rls.sql`로 실제 소유자/타 사용자 인증 역할 실행 | 계정 A/B와 동등한 원격 역할 시뮬레이션으로 소유자 SELECT 허용 및 타 사용자 SELECT/UPDATE/DELETE/INSERT 차단 확인 | **통과**: `phase_2_rls_passed`, 트랜잭션 전체 롤백으로 데이터 변경 없음 |

Phase 2 최종 `npm run verify` 종료 코드 0: TypeScript/ESLint 0건, 7 files/39 tests, 도메인 커버리지 99.07/93.33/100/100, 의존성 호환 통과, expo-doctor 21/21, Android HBC 1,438 modules. SQLite v2 migration, pristine 재설치 seed 교체, 로그인 전 로컬 변경 보존, 원격/로컬 LWW 충돌 경로를 Node 24 내장 SQLite에서 실제 실행으로 검증했다.

Supabase project `majwsffhmbjwinvmxqzj`를 재개·연결해 migration `20260902053000`과 lint 보완 `20260902060000`을 적용했다. 원격 `supabase db lint --linked --level warning`은 오류 0이며, publishable key의 익명 역할로 `oos_sync_records` SELECT와 `apply_oos_sync_records` RPC를 호출했을 때 모두 HTTP 401을 확인했다. Q-007 확정 뒤 hosted Auth additional redirect에 `oosops://auth/callback`을 적용했고 재실행에서 Auth·Storage 모두 up to date를 확인했다.

`supabase/tests/phase_2_rls.sql`을 linked 원격 DB에서 실행해 실제 동기화 소유자는 자기 행을 볼 수 있고 임의의 다른 인증 사용자 역할은 소유자 행의 SELECT·UPDATE·DELETE·INSERT가 모두 차단됨을 확인했다. 검사는 단일 transaction에서 실행 후 `rollback`했으며 결과는 `phase_2_rls_passed`다.

SM-S721N(Android 16, SDK 36)을 ADB로 연결해 앱 데이터 초기화 전 백업, 매직링크 세션 복구, 원격 pull 복원을 수행했다. 최초 구현에서 새 설치의 현재 주 seed 계획이 원격 백업에 추가되는 문제를 발견해, 원격 백업이 있고 outbox가 pristine seed만 포함할 때 같은 transaction 안에서 sync 대상 seed를 원격 행으로 교체하도록 수정했다. 로그인 전 로컬 변경이 있으면 교체하지 않는 회귀 테스트를 함께 추가했다. 최종 서버는 검증용 16행을 제거해 63행, 로컬은 원본과 같은 사용자 데이터 63행이며 기기 전용 알림 설정만 새 ID로 재발급됐다.

## Phase 3 구현 후 철회 기록 — 2026-09-03

아래 표는 제거 결정 전까지 수행한 검증 이력이다. AC-23~AC-26은 이후 사용자 지시로 제품 수용 범위에서 철회됐으며 미완료 게이트로 취급하지 않는다.

| ID | 자동/원격 증빙 | 실제 Telegram 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-23 | webhook/cron 별도 secret, 단일 allowed chat, owner mapping, update 상태와 결정적 entry ID, RLS·권한 계약 검사 | 허용 대화에서 `/today`, 다른 대화/위조 header 거부 확인 | **철회됨·서버 리소스 제거** |
| TP-AC-24 | 기본 21:30·Asia/Seoul 설정, delivery unique ledger, 오늘 요약 3버튼, `day_closures` upsert, Vault cron 설정 스크립트 | 예약 요약 수신 → `오늘 종료` → 앱 동기화 후 종료 snapshot 확인 | **21:19 발송 확인 후 철회·제거** |
| TP-AC-25 | 8개 정확 명령·한국어 시간 파서 9 tests, 직접 기록 `source='telegram'`, 재시도 deterministic upsert | `/study 1`, `/done 항목`, `/count 항목` → 앱 동기화 후 각 1건 대조 | **철회됨·코드 제거** |
| TP-AC-26 | 규칙 기반 자유 문장, pending proposal·확인/무시, 음성 download/transcription 및 구조화 provider adapter, 확인 뒤만 쓰기 | 자유 문장 제안·확인과 음성 메시지 제안·확인을 앱 기록과 대조 | **철회됨·코드 제거** |

Phase 3 기준 `npm run verify` 종료 코드 0: TypeScript/ESLint 0건, 14 files/74 tests, Telegram 2 files/16 tests, 도메인 커버리지 99.07/93.33/100/100, Expo 의존성 호환, expo-doctor 21/21, Android Hermes 1,441 modules. PowerShell 설정 스크립트 구문 검사도 통과했다. SM-S721N을 Metro로 재실행해 top-resumed 상태와 Android/React Native/Expo error log 0을 확인했다.

원격 Supabase에는 migration `20260903010000`, `20260903011000`을 적용했다. DB lint 오류 0, `phase_3_telegram_rls_passed`, 재확인 dry-run `upToDate:true`이며 `telegram-bot` Edge Function v2가 `ACTIVE`, GET health가 HTTP 200이다. 개인 bot/chat/webhook/cron을 연결했고 21:19 임시 예약 메시지의 Telegram 접수와 delivery 완료를 확인한 뒤 21:30으로 복원했다.

제거 전 inventory는 Telegram settings 1행, delivery test 1행, updates/proposals/core Telegram entries 0행, cron 1개, Vault secret 1개였다. webhook과 봇 명령을 먼저 해제한 뒤 migration `20260903020000_remove_telegram_integration.sql`로 cron·Vault·전용 테이블을 제거했고, Edge Functions 2개와 Telegram Supabase secrets 5개를 삭제했다. 핵심 `oos_sync_records`는 변경하지 않았다.

제거 후 최종 게이트는 TypeScript/ESLint 오류 0, 12 files/58 tests, 커버리지 99.07/93.33/100/100, 의존성 검사 통과, expo-doctor 21/21, Android Hermes 1,440 modules이다. 원격은 Telegram table/function/cron/Vault/custom secret 0, migration `upToDate:true`, DB lint 오류 0이다. SM-S721N에서 최신 Metro bundle을 로드한 앱이 `ResumedActivity`이며 앱 PID 대상 Android error log도 0건이다.

Phase 4 진입 전 Phase 3 마감 정리에서는 깨끗한 `npm ci` 뒤 강화된 TypeScript 미사용 검사·ESLint 오류 0, 12 files/59 tests, 커버리지 99.07/93.33/100/100, Expo 의존성 검사, expo-doctor 21/21, Android Hermes 1,440 modules를 통과했다. 레거시 `sync_records/sync_mutations/sync_conflicts`가 모두 0행임을 먼저 확인한 뒤 guarded migration `20260903030000`을 적용했고, 활성 `oos_sync_records` 63행과 `apply_oos_sync_records(jsonb)`를 보존했다. 원격 DB lint 오류는 0이다.

## Phase 4 자동·실기기 게이트 — 2026-09-04 통과

| ID | 자동/코드 증빙 | development build 실기기 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-27 | 6개 모드 상수, 4·8·12주 선택, 기간 겹침 계획·일/주/항목/프로젝트/KPI/메모 packager, SQLite v4 세션 저장·검색·export·sync trigger, 인증 Edge Function 테스트 | 분석 탭에서 모드·기간·질문 변경 → 분석 저장 → 검색 → `첨부 데이터 보기` JSON 대조 | **통과 — 6개 모드별 실세션, 총 9세션 저장·원격 동기화** |
| TP-AC-28 | 응답 저장 직후 계획 수·outbox 불변, 불완전 계정 제안 거부, 사용자의 적용 transaction에서만 새 `ai_applied` 계획과 전체 라인·outbox 생성 통합 테스트 | 제안 수신 전/후 계획 버전 대조 → `적용` 취소 시 불변 → 확인 시 새 버전 → `무시` 시 계획 불변 | **통과 — 적용 1·무시 1·대기 1, 계획 1→2·라인 14→28** |
| TP-AC-29 | 시스템 프롬프트 7규칙 상수, JSON Schema, 모바일/서버 계약 일치, 구조화 파서, 파싱 실패 원문/제안 없음, 금지 사용자 서술 차단 테스트 | 아래 샘플 응답 점검표를 실행하고 앱 표시·제안 저장 여부 확인 | **통과 — 실응답 숫자 근거 86개, 금지 문구·secret marker 0** |
| TP-AC-30 | §5.7 네 질문 상수와 account 주간 계획·실제, item 일정/기본 예상 차이, project 주간시간·KPI·상태를 포함하는 snapshot 테스트 | 네 예시 질문을 각각 실행해 답의 숫자를 `첨부 데이터 보기`와 대조 | **통과 — 네 질문 모두 실데이터 답변·세션 저장** |

2026-09-04 `npm run verify` 종료 코드 0: TypeScript strict와 ESLint 오류·경고 0, 19 files/83 tests, 도메인 커버리지 statements 99.07%·branches 93.33%·functions 100%·lines 100%, Expo 의존성 검사 통과, expo-doctor 21/21, Android Hermes 1,447 modules bundle 성공. migration·repository 테스트는 Node 24 내장 SQLite에서 fresh v4와 v2→v4 상향을 실제 실행한다. transport 테스트는 앱 요청에 API 키가 포함되지 않으며 모바일/서버의 모델·프롬프트·JSON Schema 계약이 일치함을 확인한다.

Supabase migration `20260904010000_phase_4_sync_tables.sql`을 linked 원격에 적용해 기존 63개 핵심 record와 RLS/RPC를 유지하면서 `analysis_sessions`, `ai_proposals` table name만 허용했다. 로컬·원격 migration 목록 일치와 `supabase db lint --linked --level warning` 오류 0을 확인했다.

Q-010 승인 뒤 `ai-analysis` Edge Function v2를 `verify_jwt=true`로 배포했다. 기존 원격 데이터의 유일한 user ID를 `OOS_OWNER_USER_ID`, OpenAI 키를 `OPENAI_API_KEY` Edge secret으로 설정했고 무인증 HTTP POST가 401임을 확인했다. 로그인된 SM-S721N에서 9개 실세션을 호출·저장·동기화했으며 앱과 Git에는 키 입력·저장 경로가 없다.

### TP-AC-29 실제 응답 샘플 점검

각 모드에서 최소 1개, §5.7 예시 질문 4개를 포함해 아래를 확인했다. 하나라도 실패하면 응답은 저장된 원문과 숫자 근거를 검토하되 제안을 적용하지 않고 parser/prompt 회귀 항목으로 기록한다.

1. 답에 사용한 기간·계정/항목·값·단위가 있고 `첨부 데이터 보기` JSON으로 재계산 가능하다.
2. 데이터가 없으면 추측한 숫자 대신 부족한 필드를 구체적으로 밝힌다.
3. 결론은 선택지이며 결정·변경을 이미 수행했다고 서술하지 않는다.
4. “잘했어요”, “아쉬워요”, “연속!”, “무너지지 마세요”, “~하는 경향”, “조심하세요”와 사용자 성향·심리·동기·위험 서술이 없다.
5. 구조화 파싱에 실패하면 원문만 표시되고 제안 카드는 생기지 않는다.
6. 계획 제안은 모든 활성 시간계정과 대상 주를 포함하며 `적용` 확인 전 계획·항목·KPI 값이 바뀌지 않는다.

## Phase 4R 동작 보존 리팩터 게이트 — 2026-09-04 실기기 대기

아래 표는 기존 Phase 4 통과 기록을 덮어쓰지 않는 `0.4.1(8)` 전용 회귀 계획이다. 아직 실행하지 않은 결과는 모두 대기로 기록하며 실제 명령·원격·기기 결과가 생긴 뒤에만 통과로 바꾼다.

| ID | 관련 AC | 검증 내용 | 현재 상태 |
|---|---|---|---|
| TP-R-01 | AC-31, AC-34 | `mobile/`에서 `npm ci`, `npm run verify`; TypeScript/ESLint, 전체 Vitest·커버리지, 모바일↔Edge 계약, Expo 호환·doctor, Android Hermes bundle | **통과**: Expo 57.0.20 호환 패치 정렬 후 종료 코드 0, 34 files/222 tests, coverage 99.07/94.93/100/100, Supabase 계약 2 files/8 tests, dependency up to date, doctor 21/21, Android Hermes 1,493 modules |
| TP-R-02 | AC-32 | fresh SQLite v5, v4→v5 상향, migration 실패 rollback, 기존 행·outbox 보존, `item_notification:` 정확 prefix와 유사키 제외, `PRAGMA quick_check` | **자동 통과·기기 대기**: 전체 migration/repository 회귀 포함 222 tests 통과. 기존 SM-S721N v4→v5 상향은 TP-R-08에서 확인 |
| TP-R-03 | AC-33 | PKCE code-only/error callback, malformed 환경값 로컬 우선 시작, 기존 SQLite Auth key의 SecureStore 선이관·후삭제, 실패 시 평문 fallback 없음, 로그아웃 뒤 세션 비복원 | **자동·기존 로그인 유지 통과/로그아웃 회귀 대기**: auth storage/callback 회귀 포함 222 tests 통과, 새 build에서 인증된 AI 요청 성공 |
| TP-R-04 | AC-34 | 전송 중 같은 ID 재수정 시 최신 outbox 보존, 다른 user 로그인 차단, unknown table/setting 중단, snapshot 원자성, 오래된 refresh·draft 저장 경합 방지 | **자동 통과·기기 대기**: repository/sync/draft/refresh, schema/export/reset manifest 일치, 분석 세션+자식 제안 원자 삭제·복구, 삭제 부모 제안 차단, closure tombstone 제외, 타이머·알림 cleanup 원자 저장 회귀 포함 222 tests 통과 |
| TP-R-05 | AC-35 | clean Supabase DB에 전체 migration 적용·RLS SQL, linked dry-run/push/lint/RPC, 익명·타 사용자 DML/RPC 차단, 크기·개수·settings allowlist 오류 계약 | **통과**: clean DB 전체 migration·임시 Auth fixture·container `psql` RLS assertion, migration `20260904020000` linked 적용·재 dry-run up to date·DB lint 0·`phase_2_rls_passed`·익명 direct DML 401 |
| TP-R-06 | AC-35 | `ai-analysis` JSON content type·body/snapshot 한도·날짜/모드/질문 검증, owner JWT, 질문/snapshot credential redaction, 필드별 객관 anchor·금지 서술·`numbers_used`, client/server allowlist exact-set, 함수 재배포·인증 실호출 | **통과**: 계약 2 files/8 tests 포함 전체 gate, `ai-analysis` v5 ACTIVE·`verify_jwt=true`, 무인증 거부와 SM-S721N 인증 standard 요청·세션 저장 성공 |
| TP-R-07 | AC-31, AC-35 | `git diff --check`, 미사용 의존성/파일 검사, secret scan, `npm audit --omit=dev` 검토, 고정 action/CLI의 GitHub Actions 결과 | **통과**: diff/secret 0, source dead export 4개 제거, production import graph 85 modules/234 internal edges/0 cycle/0 unresolved, 11 route에서 전부 reachable. knip 잔여는 CLI tunnel용 `@expo/ngrok`과 Expo config 경유 `expo-updates` false positive뿐. audit의 두 root advisory 중 xmldom은 호환 패치 완료, Expo Router의 `decode-uri-component` 가용성 위험은 upstream 호환판 대기, 도구 전용 `uuid` 경로는 취약 API 비도달. 강제 SDK 하향/major override 없음. GitHub Actions [run 33864610433](https://github.com/Cerhovah/OOS_ops_system/actions/runs/33864610433) mobile/database success |
| TP-R-08 | AC-31~AC-35 | 새 `0.4.1(8)` development build를 SM-S721N에 설치해 기존 데이터·로그인 이관, 앱 재시작, 핵심 5탭, PRIVATE v3 알림·30일 horizon, 오프라인→온라인 동기화, AI 1회, 오류 로그 0 확인 | **부분 통과**: build `ce72a92f-6fe5-456f-9a48-d9863788abaf` 설치, 기존 로그인과 AI 1회 성공. 핵심 5탭·알림·오프라인→온라인 종합 회귀는 personal TP-S-02/03과 함께 대기 |

원격에는 migration `20260904020000_harden_sync_rpc.sql`과 `ai-analysis` v3가 적용됐고 위 linked 결과를 확인했다. hosted Auth public settings의 `signupDisabled=false`는 저장소·앱의 단일 사용자 설정과 아직 다르며 Q-013 확인 대기다.

## Phase 4S 개인용 standalone 게이트 — 진행 중

| ID | 관련 AC | 검증 내용 | 현재 상태 |
|---|---|---|---|
| TP-S-01 | AC-36 | developer tools가 없는 Android binary 생성·설치 후 PC·Metro 종료 상태에서 아이콘 콜드 스타트 | **통과**: `0.4.3(10)` personal APK 설치, non-debuggable, embedded bundle 확인. 8081/8082 listener·ADB reverse 없이 launcher intent에서 `Running "main"` |
| TP-S-02 | AC-37 | 비행기 모드에서 기록·계획·프로젝트·알림·내보내기, 강제 종료·재실행 뒤 SQLite 보존, 종료 뒤 알림 horizon·재부팅·장기 재예약 확인 | **부분 통과**: Wi-Fi·mobile data 0에서 핵심 5탭과 예약 alarm 확인, 1분 기록 저장 뒤 force-stop/launcher 재실행에도 `1m` 보존. 계획·프로젝트 쓰기, export, 알림 장기 horizon 대기 |
| TP-S-03 | AC-38 | 온라인 복귀 뒤 세션·수동/자동 동기화와 AI 서버 호출, 서버 실패 중 로컬 기록 비차단 | **부분 통과**: v6 이전 원격 AI 세션 pull 호환 오류를 수정한 build 10에서 기존 로그인·자동 동기화·대기 10→0 확인. offline 기록 비차단 통과, personal build AI 반복 대기 |
| TP-S-04 | AC-39 | build ID·versionCode·SHA-256·서명/배포·embedded bundle rollback·native 변경 재빌드 문서 대조 | **통과**: EAS `6eb9e668-8af4-4e87-9243-bcbaf2be9f0c`, `0.4.3(10)`, SHA-256 `F3122C838F3F75146886CA15D856C7AD4FAB87EBEC73746048A197C081FB1B9F`, APK signing v2·EAS keystore, 보존/전진 rollback 절차 기록 |

## 하루치 실기기 기록 시나리오

1. OOS Ops 아이콘으로 실행하고 시드/오늘 자동 항목을 확인한다.
2. 편입 공부 타이머, 운동 time+count, 완료형, 횟수형, 수치형, 이벤트형을 기록한다.
3. 수동 시간을 수정하고 소프트 삭제·복구한다.
4. 프로젝트 KPI를 기록하고 파생 투입시간을 대조한다.
5. 계획을 168h 초과로 저장하고 새 버전·복원·지난주 복사를 확인한다.
6. 비행기 모드에서 추가 기록과 앱 재시작 보존을 확인한다.
7. 오늘 종료 알림 콜드 스타트, 메모/스냅샷, 종료 후 기록 수정을 확인한다.
8. JSON/CSV를 저장해 삭제 행과 계획 전 버전을 대조한다.
9. 모든 화면과 알림 문구를 TP-AC-17로 점검한다.

## 2026-09-02 정적 감사 재현 항목

| ID | 관련 범위 | 실기기 재현 | 통과 조건 | 상태 |
|---|---|---|---|---|
| RA-01 | AC-2, AC-5, I-8 | 요일 일정이 있는 항목 삭제 → 복구 → 해당 요일 오늘 화면과 항목 편집 재확인 | 항목과 기존 일정 규칙이 함께 복구됨 | **통과(사용자 승인 승계)** |
| RA-02 | SPEC §5.8, §14 | 설정에서 주 시작 요일 변경 → 주간/계획 범위 재확인 | 선택한 요일 기준으로 주 범위와 저장값이 변경됨 | **통과(사용자 승인 승계)** |
| RA-03 | I-8, 프로젝트 데이터 | KPI 값 기록 → 수정 → 소프트 삭제 → 복구 | 값·메모·이력이 각 단계에서 보존됨 | **통과(사용자 승인 승계)** |
| RA-04 | AC-13, AC-14 | 오늘 종료 → 알림 권한 다시 요청 → 예약 목록과 당일 알림 확인 | `항상 받기`가 꺼져 있으면 당일 종료 알림을 다시 예약하지 않음 | **통과(사용자 승인 승계)** |

## 결과 기록

| 날짜 | Build ID/URL | 기기·Android | TP/AC | 결과 | 증빙/비고 |
|---|---|---|---|---|---|
| 2026-08-20 | 로컬 Android HBC | Windows 10/11 | TP-AC-18 및 자동 게이트 | 통과 | `docs/evidence/phase-1-automated.md` |
| 2026-08-20 | EAS `67a46042-d559-42ee-a321-dd6db1101431` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/67a46042-d559-42ee-a321-dd6db1101431) | 기기·Android 대기 | TP-AC-01 build, TP-AC-02~17 준비 | build 통과/실기기 대기 | SDK 57, app 0.1.0 (1), `com.oosops.app`, internal APK |
| 2026-09-02 | EAS `5448b354-f54f-4d17-b657-36f8b97afa48` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/5448b354-f54f-4d17-b657-36f8b97afa48) | SM-S721N(Galaxy S24 FE), Android 버전 대기 | TP-AC-01 build·설치, TP-AC-02~17 준비 | build·업데이트 설치 통과/Metro 연결·실기기 검증 대기 | `FINISHED`, fingerprint `0668842a14ccfdacce6088a43baa0fc190bdea90`, build URL 만료 2026-09-16 03:24 KST, APK 로컬 보존 |
| 2026-09-02 | 사용자 기존 검증 재확인 | SM-S721N(Galaxy S24 FE), Android 버전 당시 미기록 | TP-AC-01~17 | 기존 실기기 검증 완료 확인/세부 결과 승계 | 이후 RA-01~04도 반복 검증 없이 자동 회귀 결과를 승계하도록 승인 |
| 2026-09-02 | EAS `154087e2-b93d-451a-b62c-ba6e988f4592` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/154087e2-b93d-451a-b62c-ba6e988f4592) | SM-S721N(Galaxy S24 FE), Android 버전 대기 | TP-AC-19, TP-AC-21 | 매직링크 로그인·최초 업로드·상태 표시 통과 | Metro Android 1,601 modules bundle 완료, 사용자 `로그인 완료 / 마지막 동기화 표시 / 전송 대기 0건`, 원격 `oos_sync_records` 추정 63행 |
| 2026-09-02 | 같은 0.2.0(3) development build + 최종 Metro source | SM-S721N(Galaxy S24 FE), Android 16/API 36 | TP-AC-19~22 | **Phase 2 통과** | 오프라인 outbox 0→1→0, 원격 원본 63행 복구, 초기화 후 계획 1/14·기록 4·충돌 0, 수동 동기화 23:03:46→23:05:38, `phase_2_rls_passed` |
| 2026-09-03 | app 0.3.0(4), Edge Function `telegram-bot` v2 | 로컬/원격 자동 게이트 | TP-AC-23~26 서버 준비 | **검증 후 철회** | 74 tests, DB lint 0, 예약 발송 확인; 이후 사용자 지시로 제거 |
| 2026-09-03 | app 0.3.1(5), removal migration | SM-S721N + 로컬/원격 제거 게이트 | Phase 3 철회 | **제거 완료** | 12 files/58 tests, Android 1,440 modules·error 0, 원격 Telegram resource 0, core record 보존 |
| 2026-09-03 | app 0.3.2(6), repository closeout | SM-S721N(Galaxy S24 FE), Android 16/API 36 + 로컬·원격 정합성 게이트 | Phase 3 마감 | **통과** | 12 files/59 tests, strict unused·doctor 21/21·Android 1,440 modules, Metro 1,603 modules 재로드·앱 오류 0, legacy schema 제거·active 63행 보존 |
| 2026-09-04 | app 0.4.0(7) source on 0.2.0(3) development client, `ai-analysis` v2 | SM-S721N(Galaxy S24 FE), Android 16/API 36 | TP-AC-27~30 | **Phase 4 통과** | 19 files/83 tests, doctor 21/21, Android export 1,447; 6개 모드·§5.7 네 질문을 포함한 실세션 9건, 입력 25,026·출력 7,271토큰·추정 $0.137304, 제안 적용/무시, outbox 0, 원격 계획 2·라인 28 확인 |
| 2026-09-04 | EAS `ce72a92f-6fe5-456f-9a48-d9863788abaf` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/ce72a92f-6fe5-456f-9a48-d9863788abaf), app 0.4.1(8) | SM-S721N(Galaxy S24 FE), Android 16/API 36 예정 | TP-R-01~08 / AC-31~35 | **자동·원격·CI·build 통과/실기기 대기** | `FINISHED`, fingerprint `0fd3776c2e02c5cfa31162fe208d1c9c59685526`, APK SHA-256 `BE1B577B1212F9B6D4D051A602062BAA38034C29D5AB2472E87D7DE5308C39B7` |

과거 build URL과 현재 `0.4.1(8)` build URL은 각각의 expiration 이후 만료되지만 로컬 APK와 이미 설치된 앱이 삭제되는 것은 아니다. 현재 APK는 `C:\Users\skljh\Downloads\OOS-Ops-0.4.1-build8.apk`에 보존했다. Android 버전과 TP-AC-01~TP-AC-17 결과를 같은 표에 이어서 기록한다.
