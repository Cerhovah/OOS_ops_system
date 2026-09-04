# Phase 4 동작 보존 리팩터 readiness — 2026-09-04

## 판정

현재 판정은 **자동·clean DB CI·linked 원격 hardening·native build 통과, 실기기와 인증 실호출 대기**다. 기존 `0.4.0(7)` Phase 4의 AC-27~AC-30 통과 기록은 유효하지만, `0.4.1(8)` 리팩터 결과를 새 native build 실기기 검증과 남은 인증 실호출 없이 최종 통과로 승격하지 않는다.

이번 범위는 새 사용자 기능을 늘리는 작업이 아니라 Phase 1·2·4의 동작과 데이터를 유지하면서 후속 standalone 개발의 결합도·중복·보안 위험을 줄이는 Phase 4R이다. PC·Metro 없이 실행되는 개인용 binary는 다음 Phase 4S에서 만든다.

## 기준선과 버전

- 기준 commit: `cc90db1 feat(phase-4): complete grounded AI analysis`
- 기준 기능: Phase 1 AC-1~AC-18, Phase 2 AC-19~AC-22, Phase 4 AC-27~AC-30 통과
- 현재 소스: `0.4.1`, Android `versionCode 8`, iOS `buildNumber 8`
- 로컬 DB: SQLite schema v5
- native 차이: `expo-secure-store`와 config plugin 추가. 과거 `0.2.0(3)` development client는 현재 소스의 최종 실기기 증빙으로 사용할 수 없음
- 원격 기준: `20260904020000_harden_sync_rpc.sql`까지 적용되고 재 dry-run이 up to date다. `ai-analysis` v3는 `verify_jwt=true`로 ACTIVE

## 리팩터 범위

### 저장소와 동기화

- `AppRepository` 공개 facade를 유지하면서 activity/catalog/plan/project/settings domain repository, SQLite row mapper, weekly plan writer로 책임을 분리했다.
- `SyncRepository`를 local/remote sync store, record codec, SQL/type 경계로 분리했다.
- outbox 성공 ACK는 record ID뿐 아니라 전송 당시 `local_updated_at`까지 같을 때만 삭제한다.
- 최초 동기화 user ID를 로컬 DB owner로 고정하고 legacy 단일 cursor만 안전하게 이관한다. owner가 다른 로그인은 같은 로컬 데이터를 섞지 않는다.
- 알 수 없는 local/remote table·setting은 무시하지 않고 동기화를 중단해 cursor 유실을 막는다.
- 여러 settings 저장, 이전 주 계획 복사, account/KPI 정렬 insert, export와 전체 snapshot 읽기를 transaction 경계로 묶었다.
- 분석 세션 삭제는 활성 자식 제안을 동일 tombstone 시각으로 묶고, 복구는 같은 시각의 자식만 되살린다. 삭제 부모의 제안은 조회·적용·무시하지 않으며 설정에서 세션을 복구한다.
- 타이머 행과 `last_timer_item_id`를 같은 transaction으로 저장하고, 원격에서 내려온 삭제된 하루 종료 tombstone은 활성 snapshot에서 제외한다.

### SQLite migration

- migration 실행과 `PRAGMA user_version` 상향을 같은 transaction으로 처리한다.
- v5 migration은 기존 v4 기기의 settings capture trigger를 재생성해 `item_notification:`만 정확히 동기화한다. SQL `LIKE`의 `_` wildcard에 의한 유사키 포함을 제거했다.
- fresh v5, v4→v5, 실패 rollback과 기존 데이터/outbox 보존 검증이 최종 자동 게이트 대상이다.

### 인증과 비밀 저장

- 매직링크 callback은 PKCE authorization code만 수락하며 URL fragment의 access/refresh token은 거부한다.
- Supabase Auth는 `flowType:'pkce'`, `shouldCreateUser:false`를 사용한다.
- 네이티브 session/PKCE key는 SecureStore 앱 전용 service에 저장한다. 기존 Expo SQLite KV key는 SecureStore 쓰기 성공 뒤 제거하며 평문 fallback은 없다.
- key별 저장 작업을 직렬화하고 logout 시 legacy key도 지워 refresh/logout 경합에 의한 session 복원을 막는다.
- 잘못된 Supabase 공개 URL은 원격 기능만 비활성화하고 SQLite 기반 앱 시작을 중단시키지 않는다.
- 웹은 browser localStorage를 유지하므로 이 native 보안 판정에 포함하지 않는다.

### 화면과 분석

- 설정·프로젝트·분석 화면을 orchestration, section/editor, draft, selector/view-model로 분리했다.
- AppContext busy 상태는 ref-count, snapshot refresh는 sequence로 관리해 중첩 작업과 오래된 비동기 결과의 역전 반영을 막는다.
- 계획·주간·설정·AI draft 저장 완료가 저장 도중 사용자가 입력한 새 값을 덮지 않도록 적용 조건을 둔다.
- 분석 package를 snapshot type/budget/calculation/proposal 경계로 분리하고 전송 크기 절감 순서를 테스트 가능하게 만들었다.
- 4·8·12주 범위는 현재 진행 중인 부분 주가 아니라 직전까지 완료된 calendar week만 사용한다.
- snapshot과 자유질문은 각각 외부 전송 직전, 자유질문은 SQLite 저장 직전에 한 번 더 redaction한다. 이름형 `*_KEY/TOKEN/SECRET/PASSWORD`와 OpenAI/JWT/Telegram/GitHub/AWS/Stripe/Supabase credential 원시 패턴을 제거한다.
- `answer`, 각 `rationale`, 각 `note`를 독립적으로 검사해 안전한 필드가 다른 필드의 위험 문구를 가리지 못하게 한다. 모든 서술은 데이터·계정·항목·기간·계획·실제·차이·KPI 같은 객관 데이터 anchor를 포함해야 한다. 집계 사용자 KPI와 데이터 주체의 사실형 추세 문장은 허용한다.
- 과거·원격 제안도 렌더링 직전과 계획 적용 transaction에서 같은 규칙을 다시 검사한다. 숫자를 문장 사이에 섞은 사용자 서술 우회도 차단하며, 표시 중인 최대 50개 세션에 속한 제안만 조회한다.
- 공통 제목·선택 UI와 동적 오류에 header/radio/selected/live-region 의미를 부여해 TalkBack 탐색을 보완했다.

### 로컬 알림 수명주기

- close/item reconciliation뿐 아니라 test/timer/reset 예약 작업도 하나의 queue로 직렬화하고 관련 입력 fingerprint가 같으면 snapshot refresh 때 전량 재예약하지 않는다.
- 예약 ID 저장에 실패하면 방금 만든 OS 예약을 보상 취소한다. 전체 초기화는 OS 예약 ID를 먼저 수집해 DB 초기화 transaction의 `notification_cleanup_pending` manifest로 원자 저장한 뒤 OS 예약을 취소하고, 성공한 뒤에만 manifest를 비운다. 취소 실패나 중간 종료는 다음 reconciliation에서 재시도한다.
- 종료된 타이머의 남은 예약 ID도 정리 실패 상태를 유지해 다음 실행에서 다시 취소한다.
- 오늘 종료 후 항상 받기가 꺼진 경우 다음 30일의 알림을 미리 예약하고 앱이 열린 날짜마다 horizon을 갱신한다. 그 밖에는 daily 반복을 유지한다.
- 기존 Android PUBLIC 채널 속성이 남는 것을 피하려 `daily-records-v3` HIGH·PRIVATE 채널로 상향했다.

### 서버와 재현성

- RPC는 인증 owner, 허용 table/setting, batch 1~250, ID/record/batch 크기, timestamp·deleted envelope, 반환 ID 정확성을 검증한다.
- 인증 role의 동기화 테이블 직접 DML을 회수하고 검증된 SECURITY DEFINER RPC만 사용한다.
- Edge Function은 JSON content type, streaming body 상한, snapshot 상한, 날짜 순서, mode/question을 provider 호출 전에 검증한다.
- `mobile/.env.example`에는 공개 변수 이름만 두고 Node/npm, EAS CLI, Supabase CLI와 GitHub Action commit을 고정했다.
- 19개 앱 데이터 테이블 manifest에서 전체 export/reset 순서를 파생하고 실제 SQLite schema와 exact-set 계약을 검사한다. seed bootstrap subset은 별도 명명 정책으로 고정하며 모바일의 16개 동기화 table·11개 setting allowlist와 최신 서버 RPC SQL도 exact-set 계약으로 묶었다.
- GitHub Actions는 잠금 설치의 `npm run verify`와 깨끗한 Supabase DB의 migration/RLS 검사를 분리 실행한다. Dependabot은 자동 반영하지 않고 검토 PR만 만든다.

## 검증 현황

| 게이트 | 명령/절차 | 상태 |
|---|---|---|
| TypeScript·ESLint·단위/통합·커버리지·계약·Expo·Android bundle | `cd mobile && npm ci && npm run verify` | **통과**: 종료 코드 0, 34 files/222 tests, coverage statements 99.07%·branches 94.93%·functions 100%·lines 100%, 계약 2 files/8 tests, dependency up to date, doctor 21/21, Android Hermes 1,493 modules |
| SQLite v5와 migration rollback | migration/repository 집중 Vitest + `PRAGMA quick_check` | **자동 통과·기기 대기**: 전체 222 tests에 fresh/v4→v5·rollback·정확 prefix·schema/manifest exact-set 회귀 포함. SM-S721N 상향은 대기 |
| 정적 품질 | `git diff --check`, dead code/의존성, 금지 문구, secret scan | **통과**: diff/secret 0, source dead export 4개 제거, production import graph 85 modules/234 internal edges/0 cycle/0 unresolved, 11 route에서 85/85 reachable. knip 잔여는 의도적 `@expo/ngrok`과 `expo-updates` false positive |
| 분석 데이터 수명주기·출력 방어 | real SQLite session/proposal 삭제·복구·outbox, 삭제 부모 차단, legacy/synced 제안 문구 재검사 | **통과**: 원자 tombstone/선별 복구, 표시 세션 범위 조회, 질문 이중 redaction, 필드별 객관 anchor·렌더링·적용 검증 회귀 포함 |
| 알림 수명주기 | 중복 reconciliation, 부분 실패, ID 저장 실패, reset manifest, 종료일 horizon, fingerprint·PRIVATE v3 채널 | **자동 통과·기기 대기**: 단일 queue·보상 취소·원자 cleanup manifest/재시도·30일 horizon 회귀 통과. 잠금화면 표시와 OS 예약은 TP-R-08 대기 |
| 공급망 검토 | `npm audit --omit=dev` 결과와 실제 도달 경로 검토 | **검토 완료**: 잔여 16 moderate는 두 root advisory의 전이 집계다. xmldom은 호환 범위 내 패치 완료. Expo Router의 `decode-uri-component`는 조작된 URI에 대한 가용성 위험이지만 0.5.0 직접 override가 CJS/ESM 계약을 깨므로 공식 호환판 대기, UUID 경고는 Android 번들 밖 도구 경로이며 현재 호출은 영향 없는 v4뿐. SDK 하향 `--force` 없음 |
| clean Supabase DB | `npx supabase@2.116.0 db start`, container `psql` RLS assertion, `stop --no-backup` | **통과**: 전체 migration 적용 뒤 자체 임시 Auth 사용자·전체 rollback fixture와 컨테이너 `psql`·`ON_ERROR_STOP` RLS assertion 성공 |
| linked 원격 DB | migration dry-run/push, lint, `phase_2_rls.sql`, RPC 제한 확인 | **통과**: `20260904020000` 적용, 재 dry-run up to date, DB lint 0, `phase_2_rls_passed`, 익명 direct DML 401 |
| Edge Function | 최신 `ai-analysis` 배포, 무인증 거부와 인증 1회 실호출 | **자동 통과·원격 부분 통과**: 계약 2 files/8 tests, v3 ACTIVE·`verify_jwt=true`·무인증 401. 인증 실호출 대기 |
| hosted Auth | 기존 사용자 유지·신규 가입 차단 | **Q-013 사용자 확인 대기** |
| Android native | 새 `0.4.1(8)` development build·SM-S721N 설치·SecureStore 이관·핵심 회귀·ADB error log | **native build 통과·실기기 대기**: `ce72a92f-6fe5-456f-9a48-d9863788abaf` `FINISHED`, fingerprint `0fd3776c2e02c5cfa31162fe208d1c9c59685526`; APK 255,973,313 bytes, SHA-256 `BE1B577B1212F9B6D4D051A602062BAA38034C29D5AB2472E87D7DE5308C39B7` |
| GitHub Actions | commit/push 뒤 mobile/database job | **직전 기준 통과·현재 refactor push 대기**: run `33856353851`에서 mobile·database 모두 success |

## 남은 위험과 경계

- SecureStore 실제 session payload와 기존 설치 이관은 새 Android binary에서 아직 확인하지 않았다. iOS keychain payload/재설치 동작도 별도 플랫폼 검증이 필요하다.
- custom URL scheme callback은 개인 설치에는 사용할 수 있지만 공개 배포에서는 Universal/App Links로 재검토한다.
- 두 기기에서 같은 자연키 데이터를 동시에 만드는 병합 정책은 Q-011이므로 현재는 단일 작성 기기를 기준으로 한다.
- 현재 pull의 timestamp+offset pagination은 동시 원격 writer가 앞 페이지 행을 갱신하면 경계 행을 건너뛸 수 있다. 단일 작성 기기에서는 pull 뒤 push 순서로 제한되지만, 다기기 작성 전에는 복합 keyset과 실행 상한을 사용하는 owner RPC로 교체해야 한다.
- AI rate limit·월 비용·idempotency는 Q-012가 열려 있어 현재 단일 소유자의 수동 요청만 범위다.
- hosted Auth 신규 가입 차단은 저장소와 앱에는 반영됐지만 public settings는 `signupDisabled=false`다. Dashboard 변경은 Q-013 확인 전 실행하지 않는다.
- Expo Router 57의 `query-string -> decode-uri-component`에는 조작된 percent-encoding으로 앱 응답성을 떨어뜨릴 수 있는 upstream 가용성 위험이 남는다. 공개 배포 전 공식 호환판으로 갱신하고 deep-link·전체 게이트를 재검증한다.
- 현재 `eas.json`은 development profile뿐이다. Phase 4R 통과가 standalone 설치 파일의 존재를 뜻하지 않는다.
- 종료일 뒤 알림은 앱이 열린 날짜마다 30일 horizon을 다시 채운다. 앱을 30일 넘게 한 번도 열지 않았을 때의 무기한 재예약은 Phase 4S에서 Android background 방식과 플랫폼 예약 한도를 확정한다.

## 통과 조건

AC-31~AC-35는 위 검증 표가 실제 결과로 채워지고, 새 build의 기존 데이터·인증 이관과 Phase 1·2·4 핵심 동작에 회귀가 없을 때만 통과한다. 그 뒤 Phase 4S AC-36~AC-39에서 PC·Metro 없는 콜드 스타트, 오프라인 기록, 온라인 복귀, artifact/rollback을 별도로 검증한다.
