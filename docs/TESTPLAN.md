# TESTPLAN

## 원칙

- TP-AC-01~TP-AC-18은 AC-1~AC-18과 1:1로 대응한다.
- 자동테스트·번들 성공만으로 알림, 공유 sheet, 오프라인, 탭 수, 아이콘 실행을 통과 처리하지 않는다.
- 최종 대상은 EAS development build가 설치된 Android 실기기다. 기기 모델, Android 버전, 앱 build URL/ID, 실행 날짜를 결과에 남긴다.
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
- 네이티브 패치가 바뀌었으므로 TP-AC-01~TP-AC-17은 새 build `5448b354-f54f-4d17-b657-36f8b97afa48`로 수행한다.
- 정적 감사 보완 후 `npm run verify` 종료 코드 0: 22 tests, 도메인 커버리지 99.07/93.33/100/100, Android HBC 1,374 modules.
- 사용자는 TP-AC-01~TP-AC-17 실기기 검증을 이전에 이미 완료했다고 2026-09-02 재확인했다. 현재 추가 확인 범위는 그 이후 코드로 보완된 RA-01~04와 Android 버전 기록이다.
- Metro tunnel을 통한 Android bundle 요청·완료를 확인해 기기↔Metro 연결을 통과 처리했다. 시작 중 발견된 SDK 57 `SQLiteProvider` Suspense 옵션 충돌은 수정했고, 수정 후 `npm run verify`도 종료 코드 0으로 통과했다. 기기 재접속 후 시작 화면 확인은 대기 중이다.

## AC별 검증

| ID | 자동/코드 증빙 | development build 수동 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-01 | app/eas config, Android bundle, EAS build `FINISHED` | APK 설치 → 홈의 OOS Ops 아이콘 탭 → 한국어 오늘 화면 확인 | SM-S721N 업데이트 설치·Metro 연결 통과/시작 오류 수정 후 화면 재확인 대기 |
| TP-AC-02 | §4.4 seed manifest 3 tests | 첫 실행 시 14계정·168h·8항목·2프로젝트 확인 → 시드 계정/항목 편집·보관·삭제·복구, 프로젝트 상태/삭제·복구, KPI 편집·삭제·복구 | Q-003 대기 |
| TP-AC-03 | Today actions 구현 | 아이콘→`작업 시작`으로 편입 타이머 시작(총 2탭), 정지 1탭, 완료/횟수/되돌리기 1탭, 수동 시간 2~3탭과 5~10초 측정 | Q-003 대기 |
| TP-AC-04 | repository lifecycle | 5개 유형을 각각 생성·기록·수정·삭제·복구하고 값/단위/횟수/시간 보존 확인 | Q-003 대기 |
| TP-AC-05 | 요일/dedupe tests | 해당 요일의 통학/필수 일정 확인 → 같은 항목 수동 추가·재실행 후 한 행만 표시 확인 | Q-003 대기 |
| TP-AC-06 | 남은 시간 경계값 tests | 하루 종료 시각 변경, 미수행 일정/완료 기록 변경 후 상단 남은 시간·계획→실제 즉시 반영 및 음수 표시 0 확인 | Q-003 대기 |
| TP-AC-07 | close repository/UI | 오늘 종료에서 계산·긴 메모 저장 → 종료 후 기록 수정 → 종료 화면/주간 실제 변화와 비잠금 확인 | Q-003 대기 |
| TP-AC-08 | week aggregates/UI | 계정 표와 합계 대조 → 항목·요일 분해 열기 → 요일 토글 → 긴 코멘트 저장/재시작 보존 | Q-003 대기 |
| TP-AC-09 | 168 상태 tests | 168h 미만·초과·음수 계획에서 배지/합계 즉시 변경, `조정하기`와 `그대로 저장` 확인 | Q-003 대기 |
| TP-AC-10 | append-only repository | 계획 2회 저장 → 모든 버전 열람 → 과거 복원 후 새 버전 증가와 이전 버전 불변 확인 | Q-003 대기 |
| TP-AC-11 | copy repository/UI | 다음 주로 이동해 `지난주 계획 복사` 1탭 → source와 값 확인, 원본 불변 확인 | Q-003 대기 |
| TP-AC-12 | KPI aggregation tests/UI | 프로젝트/KPI 추가 → 카드에서 값 기록 → 합계 확인 → 연결 time 기록 후 누적/이번 주 투입시간 대조 | Q-003 대기 |
| TP-AC-13 | DAILY/DATE route code | 알림 시각을 3~5분 뒤로 설정 → 앱 완전 종료 → 알림 탭 → 오늘 종료 콜드 진입. 종료한 날 건너뜀/항상 받기 각각 확인 | Q-003 대기 |
| TP-AC-14 | HIGH channel/permission/rebook code | 최초 허용, OS 설정에서 채널 중요도 확인, 거부 후 설정 재요청, 앱 강제종료·재시작 후 예약 복구 확인 | Q-003 대기 |
| TP-AC-15 | CSV/JSON 3 tests | 삭제 행과 계획 여러 버전 생성 → JSON 전체/각 CSV 공유·저장 → 원본 SQLite 값/행과 대조 | Q-003 대기 |
| TP-AC-16 | 원격 API 없음/SQLite 구조 | 비행기 모드 ON → 기록·수정·삭제·복구·계획·프로젝트·종료 → 앱 재시작 후 보존 → 비행기 모드 OFF | Q-003 대기 |
| TP-AC-17 | 금지문구 정적 검색 | 오늘/주간/프로젝트/계획/분석/설정/모달/빈 상태/오류/알림 전체에서 판정·점수화·연속일수·사람 서술 0건 확인 | Q-003 대기 |
| TP-AC-18 | 계산·export·seed 22 tests, 90% gate | 수동 절차 없음 | **통과** |

## Phase 2 자동·실기기 게이트 — 2026-09-02

| ID | 자동/코드 증빙 | development build 수동 절차 | 현재 상태 |
|---|---|---|---|
| TP-AC-19 | SQLite v2 backfill/trigger 실제 실행, 매직링크 callback fragment/PKCE/error 파서, pull-before-push 및 pristine seed 교체 bootstrap | 이메일 링크를 같은 기기에서 열어 앱 복귀·로그인 → 대기 0 확인 → 앱 데이터 초기화 후 세션 유지 재실행 → 전체 데이터 대조 | **통과**: 원격 63행, 복구 로컬 계획 1/14·기록 4·outbox 0·충돌 0, SQLite `quick_check=ok` |
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
| RA-01 | AC-2, AC-5, I-8 | 요일 일정이 있는 항목 삭제 → 복구 → 해당 요일 오늘 화면과 항목 편집 재확인 | 항목과 기존 일정 규칙이 함께 복구됨 | 코드 보완·자동 게이트 통과/실기기 재현 대기 |
| RA-02 | SPEC §5.8, §14 | 설정에서 주 시작 요일 변경 → 주간/계획 범위 재확인 | 선택한 요일 기준으로 주 범위와 저장값이 변경됨 | 코드 보완·단위테스트 통과/실기기 재현 대기 |
| RA-03 | I-8, 프로젝트 데이터 | KPI 값 기록 → 수정 → 소프트 삭제 → 복구 | 값·메모·이력이 각 단계에서 보존됨 | 코드 보완·자동 게이트 통과/실기기 재현 대기 |
| RA-04 | AC-13, AC-14 | 오늘 종료 → 알림 권한 다시 요청 → 예약 목록과 당일 알림 확인 | `항상 받기`가 꺼져 있으면 당일 종료 알림을 다시 예약하지 않음 | 코드 보완·자동 게이트 통과/실기기 재현 대기 |

## 결과 기록

| 날짜 | Build ID/URL | 기기·Android | TP/AC | 결과 | 증빙/비고 |
|---|---|---|---|---|---|
| 2026-08-20 | 로컬 Android HBC | Windows 10/11 | TP-AC-18 및 자동 게이트 | 통과 | `docs/evidence/phase-1-automated.md` |
| 2026-08-20 | EAS `67a46042-d559-42ee-a321-dd6db1101431` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/67a46042-d559-42ee-a321-dd6db1101431) | 기기·Android 대기 | TP-AC-01 build, TP-AC-02~17 준비 | build 통과/실기기 대기 | SDK 57, app 0.1.0 (1), `com.oosops.app`, internal APK |
| 2026-09-02 | EAS `5448b354-f54f-4d17-b657-36f8b97afa48` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/5448b354-f54f-4d17-b657-36f8b97afa48) | SM-S721N(Galaxy S24 FE), Android 버전 대기 | TP-AC-01 build·설치, TP-AC-02~17 준비 | build·업데이트 설치 통과/Metro 연결·실기기 검증 대기 | `FINISHED`, fingerprint `0668842a14ccfdacce6088a43baa0fc190bdea90`, build URL 만료 2026-09-16 03:24 KST, APK 로컬 보존 |
| 2026-09-02 | 사용자 기존 검증 재확인 | SM-S721N(Galaxy S24 FE), Android 버전 대기 | TP-AC-01~17 | 기존 실기기 검증 완료 확인/세부 결과 승계 | 이후 수정된 RA-01~04만 Metro로 재확인 필요 |
| 2026-09-02 | EAS `154087e2-b93d-451a-b62c-ba6e988f4592` / [build page](https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/154087e2-b93d-451a-b62c-ba6e988f4592) | SM-S721N(Galaxy S24 FE), Android 버전 대기 | TP-AC-19, TP-AC-21 | 매직링크 로그인·최초 업로드·상태 표시 통과 | Metro Android 1,601 modules bundle 완료, 사용자 `로그인 완료 / 마지막 동기화 표시 / 전송 대기 0건`, 원격 `oos_sync_records` 추정 63행 |
| 2026-09-02 | 같은 0.2.0(3) development build + 최종 Metro source | SM-S721N(Galaxy S24 FE), Android 16/API 36 | TP-AC-19~22 | **Phase 2 통과** | 오프라인 outbox 0→1→0, 원격 원본 63행 복구, 초기화 후 계획 1/14·기록 4·충돌 0, 수동 동기화 23:03:46→23:05:38, `phase_2_rls_passed` |
| 2026-09-03 | app 0.3.0(4), Edge Function `telegram-bot` v2 | 로컬/원격 자동 게이트 | TP-AC-23~26 서버 준비 | **검증 후 철회** | 74 tests, DB lint 0, 예약 발송 확인; 이후 사용자 지시로 제거 |
| 2026-09-03 | app 0.3.1(5), removal migration | SM-S721N + 로컬/원격 제거 게이트 | Phase 3 철회 | **제거 완료** | 12 files/58 tests, Android 1,440 modules·error 0, 원격 Telegram resource 0, core record 보존 |

EAS의 새 build URL은 2026-09-16 03:24 KST에 만료되지만 로컬 APK와 이미 설치된 앱이 그 시각 삭제되는 것은 아니다. Android 버전과 TP-AC-01~TP-AC-17 결과를 같은 표에 이어서 기록한다.
