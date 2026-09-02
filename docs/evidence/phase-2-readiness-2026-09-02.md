# Phase 2 최종 게이트 증빙 — 2026-09-02

## 진입 상태

- Phase 1 기존 실기기 TP-AC-01~17 완료: 사용자 재확인.
- Phase 1 이후 추가된 JS/SQLite 수정 4건: 사용자가 기존 수기 검증을 승계하고 별도 반복 없이 Phase 2 진입 승인.
- 앱 시작 오류: SDK 57에서 금지된 `SQLiteProvider`의 `onError`+`useSuspense` 조합을 제거했고 자동·실기기 게이트를 재통과함.
- Phase 2 구현 지시: 사용자 승인.
- Supabase 연결: EAS project `@ljh951206/oos-ops`에 Supabase project ref `majwsffhmbjwinvmxqzj` 연결 확인.
- 환경변수: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 이름 존재. 값은 출력·문서화하지 않음.
- 인증/초기화 제품 결정: 무료 이메일 매직링크 + 기기 로컬 초기화로 Q-007 확정.

## 구현 진행 — 2026-09-02

- `@supabase/supabase-js`와 Expo SDK 57 호환 `@react-native-community/netinfo` 설치.
- EAS development 변수 2개를 `mobile/.env.local`로 내려받았고 파일은 ignore 상태다. 값은 출력하지 않았다.
- SQLite v2 상향 migration: 누락 timestamp/tombstone 열, `sync_outbox`, `sync_conflicts`, `sync_state`, 14개 사용자 데이터 테이블 trigger 캡처.
- Supabase client/session, 이메일 매직링크와 `oosops://auth/callback` 세션 처리, pull→LWW/conflict→push, 앱 시작·foreground·online 복귀·로컬 변경 자동 동기화, 수동 동기화 구현.
- 원격 `oos_sync_records`, 인증 사용자 RPC, `auth.uid()` SELECT/INSERT/UPDATE/DELETE RLS migration 작성.
- 설정 화면에 로그인, 마지막 동기화 시각, 대기 건수, `지금 동기화`, 최근 충돌 로그 표시 추가.
- 앱 버전 `0.2.0`, Android versionCode 3, iOS buildNumber 2로 상향.

## 현재 검증 결과

- `npm run verify` 종료 코드 0.
- TypeScript strict 및 ESLint 경고·오류 0.
- 7 files / 39 tests 통과. Node SQLite로 fresh v2 migration, 기존 시드 outbox backfill, pristine 재설치 원격 교체, 로그인 전 로컬 변경 보존, 이후 UPDATE trigger payload 갱신, 원격/로컬 LWW·충돌 기록을 실제 실행하고 RLS migration·후속 conflict target, 매직링크 fragment/PKCE/error 파서를 검사.
- 도메인 커버리지 statements 99.07%, branches 93.33%, functions 100%, lines 100%.
- Expo dependency check 통과, expo-doctor 21/21, Android Hermes 1,438 modules bundle 성공.
- 최종 검증 전 제출본 `c19c3baa-7b80-42d3-8897-738c11f0fd0e`은 큐에서 취소하고, 최종 소스 EAS development build `1ead311c-9397-4f53-8893-36193025ab02`를 완료함.
- APK를 `C:\Users\skljh\Downloads\OOS-Ops-0.2.0-dev-1ead311c.apk`로 내려받음. 크기 263,166,955 bytes, SHA-256 `8209BFC51DC6E5C882F337CD88E7B0D59B9E3932B3AE7EC2C9444F5B1FBEF5A4`.
- 매직링크 callback과 Android versionCode 3을 포함한 development build `154087e2-b93d-451a-b62c-ba6e988f4592`를 완료함. fingerprint `fb26070b68affc0b81688e5919bddff6ea886343`.
- APK를 `C:\Users\skljh\Downloads\OOS-Ops-0.2.0-magic-link-dev-154087e2.apk`로 내려받음. 크기 263,166,951 bytes, SHA-256 `C70E4CA727CE67CD8FE2DCBA8FF54AB764D7F138D3C7F61B1363AE41777863C0`.
- Metro tunnel을 기동하고 현재 개발 서버 접속용 QR을 `C:\Users\skljh\Downloads\OOS-Ops-Metro-z811odm-QR.png`로 생성함.
- SM-S721N에서 매직링크 로그인, 마지막 동기화 표시, 전송 대기 0건을 사용자·ADB로 확인함. Metro는 Android 1,601 modules 실기기 bundle 완료를 기록했다.
- Windows 사용자 범위에 공식 Android SDK Platform-Tools 37.0.1(`adb` 1.0.41)을 설치했고, `R5CY31QP08W device product:r12sksx model:SM_S721N` 연결을 확인함.

## 외부 게이트 최종 결과

- Supabase project `majwsffhmbjwinvmxqzj`는 `ACTIVE_HEALTHY`이며 CLI 연결을 완료했다.
- 기존 원격 migration `202608240001`~`003`을 이력 저장소에서 가져온 뒤 신규 `20260902053000`을 적용했다. 원격 lint가 발견한 RPC conflict target 모호성은 비파괴 후속 migration `20260902060000`으로 수정했다.
- 원격 `supabase db lint --linked --level warning` 결과 오류 0. publishable key의 익명 역할로 테이블 SELECT와 RPC를 호출해 둘 다 HTTP 401을 확인했다.
- 무료 Supabase 기본 메일 제공자가 커스텀 OTP 템플릿 변경을 HTTP 400으로 거부했고, 사용자가 Q-007에서 이메일 매직링크 전환을 승인했다. hosted Auth에 `oosops://auth/callback`을 적용하고 재확인했다.
- 오프라인 기록에서 outbox 0→1, 온라인 복귀 뒤 1→0과 원격 63→64를 확인했다. 재설치 복구 검증 뒤 시험 기록과 fresh seed 15행을 정확히 제거해 원격을 원본 63행으로 복구했다.
- 앱 DB 초기화 뒤 보존된 매직링크 세션으로 자동 로그인·pull을 실행했다. 최종 로컬은 계획 1/14, 기록 4, outbox 0, 충돌 0, SQLite `quick_check=ok`이며 원본 백업과 사용자 데이터 행 수가 일치한다.
- `지금 동기화` 탭으로 마지막 동기화 시각이 23:03:46→23:05:38로 바뀌고 대기 0·충돌 없음이 유지됨을 확인했다.
- 23:40 재검증에서 ADB가 `R5CY31QP08W / SM-S721N / Android 16(API 36)`을 `device`로 인식했고, 포그라운드 `com.oosops.app` 화면에 로그인 계정, 마지막 동기화 23:40:07, 전송 대기 0건, 충돌 없음이 표시됐다. 같은 시점 `npm run verify`도 39개 테스트와 Android bundle까지 종료 코드 0으로 재통과했다.

## AC 최종 판정

| AC | 필요한 결과 | 최종 판정 |
|---|---|---|
| AC-19 | 로그인, 최초 업로드, 재설치 복구 | **통과**: 원격 63행과 초기화 후 사용자 데이터 대조, pristine seed 원자 교체 회귀 테스트 포함 |
| AC-20 | 오프라인 기록 후 자동 전송, 충돌 로그 | **통과**: outbox 0→1→0, 원격 +1, 실제 충돌 7건 UI 표시·LWW 확인 |
| AC-21 | 지금 동기화, 마지막 동기화 시각 | **통과**: 수동 탭 시각 갱신, 대기 0, 최종 충돌 없음 |
| AC-22 | 본인 행만 접근하는 RLS | **통과**: 원격 적용·lint·익명 역할 거부, 소유자/타 사용자 인증 역할의 SELECT·UPDATE·DELETE·INSERT 격리와 rollback 확인 |

## 복구 안전장치와 최종 스냅샷

- 초기화 전 원본 백업: `C:\Users\skljh\Downloads\OOS-Ops-device-data-before-phase2-reset-20260902-161533.tar`, SHA-256 `8227E82984E27F35662B6AB081163A96F189363F0BA1E1D67071E0A210EB680D`.
- 오프라인 시험 후 백업: `C:\Users\skljh\Downloads\OOS-Ops-device-data-before-phase2-restore-20260902-163100.tar`, SHA-256 `2537B5DFA344FCAAA8DCCD3AA7B70A3FA6D6DC283070534C89CB184FDAB4215C`.
- 최종 복원 재시험 직전 백업: `C:\Users\skljh\Downloads\OOS-Ops-device-data-before-final-phase2-restore-20260902-230257.tar`, SHA-256 `F575AF41430FAF77E3DAE6BDADE808DC7D98512AA1DAA75B10DAF09FACC290E7`; SQLite `quick_check=ok`.
- 기기 전용 `ExpoSQLiteStorage` 세션은 유지하고 `oos-ops.db`, WAL, SHM만 제거해 복원을 재시험했다. 삭제 대상은 위 백업으로 복구 가능하다.
- 최종 원격: 63행, 시험용 16행 0건. 최종 로컬: accounts 14, projects 2, items 8, schedules 3, KPI 8, plans 1, plan lines 14, entries 4, today additions 2, outbox 0, conflicts 0.
- 원본과 다른 유일한 설정 행은 동기화 대상이 아닌 `last_timer_item_id`의 부재다. 알림 ID·권한은 새 설치 기기 값으로 정상 재발급했다.

## 구현 순서

1. Phase 1 최신 수정 4건을 실기기 확인하고 최종 게이트 문서를 확정한다.
2. `@supabase/supabase-js`와 네트워크 상태 패키지를 Expo SDK 57 호환 방식으로 설치하고 자동 게이트를 실행한다.
3. 파괴 없는 SQLite v2 migration으로 `sync_outbox`, `sync_conflicts`, `sync_state`와 필요한 sync timestamp를 추가한다.
4. 동일 transaction outbox 기록을 repository mutation에 연결하고 순수 merge/LWW/conflict 함수를 단위 테스트한다.
5. 원격 Postgres mirror schema, `(user_id, local_id)` 키, FK, RLS migration을 `supabase/migrations/`에 추가한다.
6. Supabase client/auth session과 Q-006에서 승인된 로그인 UI를 구현한다.
7. push → pull → conflict 기록 → retry 순서의 sync orchestrator와 앱 시작/온라인 복귀/수동 동기화 경로를 구현한다.
8. 설정에 로그인 상태, 마지막 동기화, 지금 동기화, 충돌 로그를 추가한다.
9. 로컬 자동 게이트, 두 사용자 RLS 음성 테스트, 오프라인→온라인, 재설치 복구 실기기 검증을 수행한다.

## 데이터 설계 주의점

- seed ID가 사용자마다 같으므로 원격 `id` 단일 PK를 사용할 수 없다. `(user_id, id)` 복합 키를 사용한다.
- `weekly_plans`, `weekly_plan_lines`, `day_closures`, `today_item_additions` 등은 현재 공통 `updated_at/deleted_at`이 없어 LWW/tombstone에 필요한 v2 보완이 필요하다.
- `close_notification_id`, `item_notification_ids`, `notification_permission_requested`, `timer_notification:*`는 기기 전용이며 동기화하지 않는다.
- `week_start_day`, `day_end_time`, 알림 시각/on-off, `item_notification:*` 같은 사용자 선호만 allowlist로 동기화한다.
- 원격 pull 적용 중에는 outbox를 다시 만들지 않는 capture suppression 경계가 필요하다.
- 로컬 전체 초기화는 원격 삭제와 동일하게 처리하지 않는다. 최종 동작은 Q-006 답변을 따른다.

## 공식 기준

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Expo Supabase integration: https://docs.expo.dev/guides/using-supabase/
- Supabase Expo quickstart: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase Native Mobile Deep Linking: https://supabase.com/docs/guides/auth/native-mobile-deep-linking
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Expo Linking: https://docs.expo.dev/linking/into-your-app/
