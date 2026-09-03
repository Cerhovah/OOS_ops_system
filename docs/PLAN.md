# PLAN

## 현재 단계

- 단계: Phase 4 — AI 분석
- 상태: **AC-27~AC-30 게이트 통과**
- PLAN/구현 승인: 2026-08-20
- Phase 종료 커밋 규칙: `docs/COMMIT_WORKFLOW.md`
- 주 검증 플랫폼: Android 실기기, iOS 호환성 유지
- 고정값: 월요일 시작, 하루 종료 23:00, 오늘 종료 알림 21:30, §4.4 시드, 앱 이름 `OOS Ops`
- Phase 경계: 앱 자체 로컬 알림과 Phase 2 동기화는 유지한다. Telegram은 Phase 4의 선행조건이 아니다. Q-010의 AI 제공자·모델·과금과 서버 secret을 확정하고 SM-S721N 실호출 게이트까지 완료했다.

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

`npm audit --omit=dev`의 moderate 경고는 Expo SDK 57 전이 의존성 경로이며 자동 수정 제안이 호환되지 않는 구버전으로 바뀐다. ADR-004에 검토와 보류 근거를 기록했으며 게이트를 숨기거나 약화하지 않았다.

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

## 다음 작업

1. Q-005에서 개인용 production 배포를 먼저 할지, 다중 사용자·결제를 포함한 상용화 명세를 먼저 확정할지 결정한다.
2. 승인된 다음 범위에 신규 AC와 TESTPLAN을 정의한 뒤 구현한다.

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
- [ ] 상용화 명세 확장 — 앱 스토어 production 배포, 결제, 운영 서버·보안·백업·모니터링. 현재 SPEC §3.3 비목표이므로 Q-005 승인 뒤 별도 AC를 정의.
- [ ] Phase 5 — 확장: 사용자 승인된 `FUTURE.md` 항목만 진행.
