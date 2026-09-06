# PLAN

## 현재 단계

- 단계: **Phase 5 완료 — 다음 단계는 Phase 6 서버 선행 준비**
- 상태: **Mobbin Tiimo flow와 Figma Quiet Routine 4화면을 기준으로 P5 UI를 구현했고, 전체 자동 게이트·Android 개발 빌드 핵심 흐름·200% 글꼴·데이터 복원·`0.5.0(11)` personal standalone 설치/콜드 스타트를 통과했다. P6~P8 구현과 공개 배포는 미착수다.**
- 최초 PLAN/구현 승인 이력: 2026-08-20. 2026-09-06 명세 보정과 디자인 선행 게이트 뒤 P5를 완료했다.
- Phase 종료 커밋 규칙: `docs/COMMIT_WORKFLOW.md`
- 주 검증 플랫폼: Android 실기기, iOS 호환성 유지
- 고정값: 월요일 시작, 하루 종료 23:00, 오늘 종료 알림 21:30, §4.4 시드, 앱 이름 `OOS Ops`
- Phase 경계: 2026-09-06 요청으로 P5 UI/UX, P6 핵심 기능, P7 배포 준비, P8 공개/유지보수 리팩터를 명세했다. 과거 게이트 이력·데이터는 보존하고 화면 위치는 SPEC §17로 변경한다. 결제·Telegram·동시 다기기 작성은 범위 밖이다.
- 사용자 확정: 목표 도달 후 알림만·계속 측정·종료 시 실제 기록; 80,000원은 레퍼런스·MCP에만 사용; 첫 공개판은 public-local이며 모든 사용자 데이터는 기기 로컬에만 둔다.

## Phase 1 AC-1~AC-18 1:1 구현·증빙

아래 표는 Phase 1 종료 판정이다. 2026-09-02 사용자가 TP-AC-01~17 기존 실기기 검증 완료를 재확인하고 반복 검증 없이 결과를 승계하도록 승인했으며, 이후 Phase 2·3 회귀에서 SM-S721N 실행과 오류 로그를 다시 확인했다.

| AC | 구현 결과 | 현재 상태 | 증빙 |
|---|---|---|---|
| AC-1 | Expo Router 앱, OOS Ops 아이콘/식별자, EAS development APK profile | **통과**: SDK 57 build·SM-S721N 설치·아이콘 실행 | `mobile/app.json`, `mobile/eas.json`, EAS build `5448b354-f54f-4d17-b657-36f8b97afa48`, TP-AC-01 |
| AC-2 | SQLite v1, 멱등 시드, 계정·항목·프로젝트·KPI 편집/상태·보관/소프트 삭제·복구 | **통과(사용자 승인 승계)** | `src/data/migrations.ts`, `migrations.test.ts`, TP-AC-02 |
| AC-3 | 작업 시작·타이머 시작/정지 1탭, 완료/횟수 1탭·되돌리기, 수동 시간 sheet | **통과(사용자 승인 승계)** | `src/app/(tabs)/index.tsx`, TP-AC-03 |
| AC-4 | time/completion/count/numeric/event 생성·기록·수정·삭제·복구 | **통과(사용자 승인 승계)** | `settings.tsx`, `repository.ts`, TP-AC-04 |
| AC-5 | 요일 mask 자동 노출 + 수동/진행 중 병합, 항목 ID dedupe | **통과**: 자동 단위검사·사용자 승인 승계 | `calculations.ts`, `calculations.test.ts`, TP-AC-05 |
| AC-6 | 설정된 하루 종료 시각 기반 남은 가용시간, 계획→실제 합계 | **통과**: 자동 경계값·사용자 승인 승계 | `calculations.test.ts`, `index.tsx`, TP-AC-06 |
| AC-7 | 항목별 종료 계산, 무제한 메모, upsert 스냅샷, 기록 비잠금 | **통과(사용자 승인 승계)** | `today/close.tsx`, `repository.ts`, TP-AC-07 |
| AC-8 | 계정별 계획/실제/차이·총계, 항목/요일 분해, 요일 토글·코멘트 | **통과(사용자 승인 승계)** | `week.tsx`, TP-AC-08 |
| AC-9 | 실시간 168h 상태, 조정/그대로 저장, 유효 숫자 비차단 | **통과**: 자동 계산·사용자 승인 승계 | `plan.tsx`, `calculations.test.ts`, TP-AC-09 |
| AC-10 | 저장/복원 모두 append-only 새 버전, 이력 열람 | **통과(사용자 승인 승계)** | `repository.ts`, `plan.tsx`, TP-AC-10 |
| AC-11 | 계획 없음/계획 화면의 지난주 최신 버전 1탭 복사 | **통과(사용자 승인 승계)** | `repository.ts`, `week.tsx`, TP-AC-11 |
| AC-12 | 프로젝트·기본/사용자 KPI·값 기록, 연결 항목 누적/주간 파생시간 | **통과**: 자동 집계·사용자 승인 승계 | `projects.tsx`, `calculations.test.ts`, TP-AC-12 |
| AC-13 | 설정 시각 DAILY 알림, 종료 시 건너뜀/항상 받기, `/today/close` 콜드 딥링크 | **통과(사용자 승인 승계)** | `notifications.ts`, TP-AC-13 |
| AC-14 | Android HIGH 채널, 최초 권한/설정 재요청, 예약 ID·시작 재예약 | **통과(사용자 승인 승계)** | `notifications.ts`, `app-context.tsx`, TP-AC-14 |
| AC-15 | 전체 테이블 JSON, 테이블별 UTF-8 BOM CSV, 삭제 행·전 계획 버전 포함 | **통과**: 변환 단위검사·사용자 승인 승계 | `export.ts`, `export.test.ts`, TP-AC-15 |
| AC-16 | Phase 1 경로가 SQLite/로컬 API만 사용, 원격 서비스 없음 | **통과(사용자 승인 승계)** | `repository.ts`, TP-AC-16 |
| AC-17 | 정보형 숫자/차이 문구, 게임화·사용자 서술 없음 | **통과**: 정적 검색·사용자 승인 승계 | `src/`, TP-AC-17 |
| AC-18 | 주 경계, 설정형 주 시작, 168 합계, 차이, 자정 타이머, 요일, 남은 시간 테스트 | **통과** | 22 tests, 도메인 statements 99.07%/branches 93.33%/functions 100%/lines 100% |

## §10.3 Phase 1 게이트

| 게이트 | 상태 | 증빙 |
|---|---|---|
| `tsc --noEmit` 오류 0 | 통과 | `docs/evidence/phase-1-automated.md` |
| ESLint 경고·오류 0 | 통과 | 같은 문서 |
| 도메인 단위테스트/커버리지 90% 이상 | 통과 | 22 tests, 99.07/93.33/100/100 |
| Expo SDK 의존성 호환 | 통과 | `Dependencies are up to date` |
| `expo-doctor` 검토 | 통과 | 21/21 checks |
| Android Hermes 번들 | 통과 | `npm run bundle:android` |
| AC-1~AC-18 | 통과(사용자 승인 승계) | AC-18 자동 통과, TP-AC-01~17 기존 실기기 완료 사용자 재확인, RA-01~04 별도 반복 없이 Phase 2 진입 승인 |
| EAS Android development build | 통과 | build `67a46042-d559-42ee-a321-dd6db1101431`, `FINISHED` |
| SDK 57 패치 재검증 | 통과 | `docs/evidence/phase-1-recovery-2026-09-02.md` |
| SDK 57 패치 Android development build | 통과 | build `5448b354-f54f-4d17-b657-36f8b97afa48`, `FINISHED`, APK 로컬 보존 |
| 실기기 수동 테스트 | 통과(사용자 승인 승계) | SM-S721N(Galaxy S24 FE), 기존 전체 수기 검증 완료를 2026-09-02 재확인 |
| 사용자 기기 하루치 실제 기록 | 통과(사용자 확인 승계) | 사용자가 이전 수기 검증을 완료했다고 재확인하고 Phase 2 진입 지시 |

`npm audit --omit=dev`의 잔여 16 moderate는 Expo SDK 57 전이 의존성의 두 root advisory를 중복 집계한 결과다. 호환 범위 안의 `@xmldom/xmldom`은 패치했고, Expo Router의 `decode-uri-component` 가용성 위험과 빌드 도구의 도달 불가능한 `uuid` 경고는 ADR-004에 경로·영향·보류 근거를 기록했다. SDK를 낮추는 강제 수정이나 CommonJS/ESM 계약을 깨는 override는 적용하지 않는다.

## Phase 2 AC-19~AC-22 구현·증빙

| AC | 구현 결과 | 현재 상태 | 증빙 |
|---|---|---|---|
| AC-19 | Supabase 이메일 매직링크·앱 callback 세션 유지, 전체 로컬 데이터 최초 업로드, pristine 재설치 DB의 시드 원자 교체·pull 복구 | **통과**: 원격 63행과 초기화 후 로컬 사용자 데이터 63행 대조, 계획 1/14·기록 4·outbox 0·충돌 0 | `auth-callback.ts`, `sync-context.tsx`, `sync-service.ts`, `sync-repository.ts`, `20260902053000_phase_2_sync.sql` |
| AC-20 | SQLite v2 trigger outbox, pull→LWW/conflict→push, online/foreground/로컬 변경 자동 재시도 | **통과**: 오프라인 기록에서 outbox 0→1, 온라인 복귀 후 1→0·원격 +1, 실기기 충돌 7건 표시와 최종쓰기 확인 | `migrations.ts`, `sync-repository.ts`, `merge.test.ts` |
| AC-21 | 설정의 로그인 상태, 마지막 동기화, 전송 대기, 지금 동기화, 최근 충돌 표시 | **통과**: 최종 복원 후 로그인·대기 0·충돌 없음, 수동 동기화 시각 23:03:46→23:05:38 갱신 | `settings.tsx` |
| AC-22 | `(user_id,table_name,local_id)` PK, `auth.uid()` RLS와 인증 사용자 전용 RPC | **통과**: 원격 적용·DB lint·익명 REST/RPC 거부와 소유자/타 사용자 역할의 SELECT·UPDATE·DELETE·INSERT 격리 검증 통과 | `supabase/migrations/20260902053000_phase_2_sync.sql`, `20260902060000_fix_apply_oos_sync_records_conflict_target.sql`, `supabase/tests/phase_2_rls.sql` |

## Phase 3 철회·제거 증빙

| 범위 | 결과 | 상태 | 증빙 |
|---|---|---|---|
| 제품 범위 | SPEC에서 Telegram 스택·설정·AC-23~AC-26 제거 | **완료** | SPEC v0.2.1, ADR-014 |
| 모바일 | 설정 UI·context·service·Telegram 테스트 제거 | **완료** | app 0.3.2(6), 12 files/59 tests, Android bundle·실기기 오류 0 |
| 원격 | webhook·봇 명령, cron, Vault, 전용 DB 테이블, Edge Functions, Telegram secrets 제거 | **완료** | removal migration, resource 0, DB lint 0, `upToDate:true` |
| 사용자 데이터 | Telegram/voice 출처 core entry 0건 확인 뒤 전용 metadata 2행 제거 | **완료** | 제거 전 inventory와 migration 결과 |
| 코드 정리 | 템플릿 자산·미사용 직접 의존성·죽은 export 제거, SQLite 테스트 어댑터 통합 | **완료** | app 0.3.2(6), strict unused gate |
| 스키마 정리 | 사용 중인 `oos_sync_records`와 중복된 초기 sync schema의 0행 확인 후 guarded migration으로 제거 | **완료** | migration `20260903030000`, active records 63행 보존 |
| 문서 정합성 | README·SPEC·PLAN·TESTPLAN·ENVIRONMENT의 단계·빌드·상태 표현 통일 | **완료** | Phase 3 마감 감사 증빙 |

## Phase 4 AC-27~AC-30 구현·증빙

| AC | 구현 결과 | 현재 상태 | 증빙 |
|---|---|---|---|
| AC-27 | 여섯 분석 모드, 4·8·12주 기간 선택, 실제 로컬 데이터 package, 세션 저장·검색 | **통과** | 6개 모드별 실세션 1건 이상, 총 9세션·원격 동기화 |
| AC-28 | 구조화 제안 저장, 적용 전 원본 불변, 사용자 버튼으로만 새 `ai_applied` 계획 버전 생성, 무시 상태 저장 | **통과** | 제안 3건 중 적용 1·무시 1·대기 1, 기존 계획 보존·신규 계획/14개 라인 생성 |
| AC-29 | 시스템 프롬프트 고정 규칙, 구조화 출력 검증·금지 문구 방어, 실제 응답 샘플 점검 | **통과** | 83 tests, 실응답 숫자 근거 86개, 금지 문구·secret marker 0 |
| AC-30 | SPEC §5.7 네 질문을 저장 데이터 snapshot에 결합하고 실제 provider 응답 검증 | **통과** | 네 질문 모두 실응답·세션 저장, 부족한 데이터는 추측 없이 명시 |

## Phase 4R AC-31~AC-35 리팩터·증빙

기존 Phase 4 통과 결과는 역사적 기준선이다. 아래 상태는 `0.4.1(8)` 리팩터 소스에 대한 별도 판정이며, 과거 `0.2.0(3)` development client에서의 Metro 검증으로 대체하지 않는다.

| AC | 현재 코드 범위 | 현재 상태 | 남은 증빙 |
|---|---|---|---|
| AC-31 | Phase 1·2·4 공개 동작을 유지하는 characterization/integration test, 화면 busy·draft·refresh 경합 방지 | **통과** | `npm run verify` 36 files/223 tests, coverage 99.07/94.93/100/100, doctor 21/21, Android 1,493 modules; `0.4.3(10)` 실기기 회귀 통과 |
| AC-32 | SQLite v5 상향, migration+`user_version` 원자성, 정확한 `item_notification:` prefix, 기존 v4 상향 회귀 | **통과** | fresh/v4→v6·rollback·prefix 회귀와 SM-S721N 데이터 보존 업데이트 통과 |
| AC-33 | PKCE code-only callback, `shouldCreateUser:false`, native SecureStore와 기존 SQLite 세션 선이관·후삭제 | **통과** | auth storage/callback 회귀, native build, 설치 후 기존 로그인 세션 유지 통과 |
| AC-34 | AppRepository 도메인 분리, sync persistence/codec 분리, 분석 packager·UI section/selector 분리, 공통 table manifest, 조건부 outbox ACK·owner binding·unknown schema 실패 | **통과** | repository/sync/draft/refresh 회귀와 오프라인 기록·재시작·온라인 복귀 동기화 10→0 통과 |
| AC-35 | RPC 크기/개수/소유자·settings allowlist, Edge JSON·요청/snapshot 한도, 질문·snapshot secret redaction, client/server exact-set 계약, 고정 CLI·CI·환경 예시 | **통과** | migration `20260904020000`, 계약 2 files/8 tests, RLS/lint, Edge v5·무인증 401·인증 Terra 실호출. GitHub Actions [run 33864610433](https://github.com/Cerhovah/OOS_ops_system/actions/runs/33864610433) mobile/database 통과 |

상세 범위와 대기/통과 기록은 `docs/evidence/phase-4-refactor-readiness-2026-09-04.md` 한 곳에서 갱신한다.

## Phase 4S AC-36~AC-39 개인용 standalone

`personal` profile과 `0.4.3(10)` release APK 생성·설치·Metro 독립 cold start, 오프라인 조작과 온라인 복귀 게이트를 완료했다.

- [x] AC-36 — 비개발용 Android 설치 파일 생성·설치, PC와 Metro를 끈 콜드 스타트.
- [x] AC-37 — 네트워크 차단 상태에서 5개 로컬 화면, 기록 저장·재시작 보존, JSON 내보내기 chooser, 예약 alarm과 30초 테스트 알림을 확인했다. 계획·프로젝트 쓰기 경로와 30일 horizon은 자동 repository/알림 회귀와 결합 판정했다.
- [x] AC-38 — 온라인 복귀 후 인증·동기화 복구, AI의 서버 의존성과 로컬 기록 비차단 확인.
- [x] AC-39 — build ID·버전·SHA-256·서명/배포·rollback·native 재빌드 조건 기록.

## Phase 4S AI model policy (2026-09-05)

- [x] OpenAI server policy: standard Terra/medium and deep Sol/high; lightweight Luna is limited to non-final preprocessing.
- [x] Provider/model routing, price calculation, and response metadata are server-owned; the mobile binary has no production key or model-routing logic.
- [x] SQLite v6 and sync payloads preserve provider, model, reasoning effort, token totals, estimated cost, provider response ID, and request timing.
- [x] Standard/deep choice and strict structured-output handling pass the full automated gate.
- [x] Edge Function v5 deployment and an authenticated standard device request completed; personal release online-return repetition remains AC-38 evidence.

## 다음 작업

1. 완료: Phase 4R 자동·clean DB·원격 게이트와 새 build 로그인 유지·AI model policy 배포·실호출을 기록했다.
2. 완료: `0.4.3(10)` personal release에서 오프라인 기록·재시작·내보내기·알림, 구버전 AI 세션 호환 동기화 10→0, online AI와 수동 동기화를 확인했다.
3. 완료: `0.5.0(11)` development build에서 `오늘의 할일 확인 → 선택/시작 → 종료 → 직접 기록 → 원장 확인`, 날짜 이동, 긴 목록/접근성, 200% 글꼴을 확인하고 임시 검증 뒤 원본 DB를 복원했다.
4. 완료: 최종 personal build `fa8d2cf2-478b-4b62-8afd-1302ab7721a9`를 데이터 보존 업데이트로 설치하고 embedded bundle·non-debuggable·Metro/ADB reverse 독립 콜드 스타트와 기존 타이머 지속을 확인했다.
5. 다음: P6 코드나 동기화 계약을 바꾸기 전에 사용자에게 서버 준비 범위를 알린다. server migration, RPC allowlist/protocol version fence, RLS, client/server 계약 테스트, 배포 순서와 구버전 앱 영향을 먼저 확정한 뒤 구현한다.

## 2026-09-02 정적 구현 감사 후속

아래 항목은 2026-09-02 코드 보완과 자동 게이트를 통과했고, 사용자가 기존 실기기 결과 승계를 승인해 Phase 1 종료 판정에 포함됐다.

- [x] 항목 복구 트랜잭션이 동일 삭제 시각의 일정만 함께 복구하도록 수정했다(기존에 따로 삭제한 일정은 복구하지 않음).
- [x] 설정에서 7개 주 시작 요일을 선택·저장하고 주간·계획·프로젝트 집계 범위와 요일 mask에 적용했다.
- [x] KPI 값 기록의 수정·소프트 삭제·설정 화면 복구 경로를 추가했다.
- [x] 알림 권한 재요청과 설정 변경 재예약이 당일 종료 상태를 전달하도록 수정했다.

사용자는 2026-09-02 기존 수기 검증을 승계하고 반복 단계를 줄여 Phase 2를 즉시 시작하도록 승인했다. 기기 로컬 초기화 결정은 유지하고, 무료 기본 메일 제약에 따라 Q-007에서 이메일 매직링크로 인증 방식을 전환했다.

## 후속 Phase

- [x] Phase 2 — 동기화: AC-19~AC-22. 구현·자동·원격·SM-S721N 실기기 게이트 통과.
- [x] Phase 3 — 철회: Telegram 구현과 원격 리소스를 사용자 지시에 따라 제거. 후속 Phase의 게이트가 아님.
- [x] Phase 4 — 분석: AC-27~AC-30 자동·원격·SM-S721N 실기기 게이트 통과.
- [x] Phase 4R — 동작 보존 리팩터: 코드·자동·clean DB CI·linked 원격·native build, 로그인 유지·AI 실호출·실기기 회귀 통과.
- [x] Phase 4S — 개인용 standalone: `0.4.3(10)`에서 AC-36~AC-39 통과.
- [x] Phase 5 — UI/UX: Tiimo 연속 flow와 Figma OOS 4화면을 근거로 theme/token, 오늘·기록 2탭, TaskSheet, 경과 TimerView, 기존 기능의 더보기 이동을 구현했다. 자동·실기기·standalone 게이트를 통과했고 schema·repository 명령·sync·알림·기록 귀속 날짜는 바꾸지 않았다.
- [ ] Phase 6 — 실행·수동 입력·기록: P5 완료 뒤 entries 확장, daily_plan_versions, timer state, 목표 알림, 날짜별 수동 기록과 개인용 sync 호환을 한 변경 묶음으로 구현한다. 서버 계약을 먼저 준비하고 기존 데이터·내보내기·동기화를 보존한다.
- [ ] Phase 7 — 공개 준비: personal과 public-local 변형의 capability·환경·application ID를 분리하고, 공개 빌드에는 개인 Supabase/AI 설정을 넣지 않는다. JSON restore, production AAB, 로컬 데이터 보존을 설명하는 정책 자료를 준비한다.
- [ ] Phase 8 — 공개·유지보수: 실제 병목과 중복 코드만 정리한 뒤 사용자의 공개 지시가 있을 때 배포한다. 데이터 손실·시작 불가·보안 결함을 우선 복구한다.

각 Phase는 SPEC §10.3의 최소 검증을 따른다. 저장 계약상 함께 바뀌는 client/server/test만 한 변경 단위로 묶고, 고정 성능 수치·반복 기간·반복 횟수는 완료 조건으로 두지 않는다.

## 2026-09-06 명세 세션 증빙

- [x] 첨부·사전 고려사항과 사용자의 최신 요청을 구분하고 현재 저장소 상태와 대조.
- [x] 실제 파일/저장 schema/오늘 항목/알림/색상/sync 감사.
- [x] 공식 외부 레퍼런스·가격/배포 요건 조사, 관찰 한계 기록.
- [x] Figma MCP 계정 연결과 빈 P5 디자인 파일 생성 확인.
- [x] Mobbin에서 Tiimo `Completing a task` 5화면을 주 레퍼런스로 선정하고 TIDE·Opal과 비교해 채택/배제 근거 기록.
- [x] Mobbin Pro 결제 활성 상태 확인.
- [x] ChatGPT Mobbin 플러그인 설치와 권한 화면 노출 확인. 현재 Codex 작업에는 Mobbin 전용 callable 도구가 없음을 기록.
- [x] 선정 flow를 합성 데이터 Figma OOS 4화면으로 번역하고 코드의 시각 구조 확정.
- [x] 최종 `npm run verify`: 37 files/225 tests + 2 files/8 contracts, coverage 99.07/94.93/100/100, Doctor 21/21, Android 1,499 modules.
- [x] 어두운 모드 primary 대비 보정 뒤 typecheck, lint, layout 1 file/3 tests를 다시 통과.
- [x] Android development build 핵심 흐름·날짜 이동·200% 글꼴·데이터 원본 복원과 personal standalone 데이터 보존 설치·콜드 스타트 통과.
- [x] 문서 링크·형식과 `git diff --check`를 최종 변경에 다시 적용.
- P5 기존 코드 판정 결과: 2탭 route·stack 이동·records view-model/테스트·저장 명령 연결은 유지했고, 오늘/기록 레이아웃·TaskSheet 표시 정보·theme/token·중복 설정 진입·과거 날짜 행동은 Figma 시안에 맞춰 선별 재작성했다. schema·repository·sync·알림·기록 귀속 날짜는 변경하지 않았다.
