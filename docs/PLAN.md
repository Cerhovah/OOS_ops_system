# PLAN

## 현재 단계

- 단계: Phase 3 — Telegram
- 상태: **개인 bot·예약 발송 통과 — 수신 명령/버튼 대조와 음성 전사 제공자(Q-009) 대기**
- PLAN/구현 승인: 2026-08-20
- Phase 종료 커밋 규칙: `docs/COMMIT_WORKFLOW.md`
- 주 검증 플랫폼: Android 실기기, iOS 호환성 유지
- 고정값: 월요일 시작, 하루 종료 23:00, 오늘 종료 알림 21:30, §4.4 시드, 앱 이름 `OOS Ops`
- Phase 3 경계: Supabase Edge Function + Telegram Bot API를 사용하며, 봇 토큰은 서버 secret에만 저장한다. Phase 4 분석 기능은 구현하지 않는다.

## Phase 1 AC-1~AC-18 1:1 구현·증빙

`구현 완료/실기기 대기`는 코드와 자동 검사가 끝났으나 §10.3의 development build 수동검증 전이라 AC 통과로 확정하지 않았다는 뜻이다.

2026-09-02 사용자는 기존 TP-AC-01~17 실기기 검증을 이미 완료했다고 재확인했다. 아래의 기존 `실기기 대기` 표기는 당시 세부 증빙이 문서에 회수되지 않은 상태를 뜻하며, 현재 남은 실기기 범위는 이후 코드 감사로 추가된 RA-01~04뿐이다.

| AC | 구현 결과 | 현재 상태 | 증빙 |
|---|---|---|---|
| AC-1 | Expo Router 앱, OOS Ops 아이콘/식별자, EAS development APK profile | SDK 57 패치 build 통과/SM-S721N 업데이트 설치 완료, 아이콘 실행 확인 대기 | `mobile/app.json`, `mobile/eas.json`, EAS build `5448b354-f54f-4d17-b657-36f8b97afa48`, TP-AC-01 |
| AC-2 | SQLite v1, 멱등 시드, 계정·항목·프로젝트·KPI 편집/상태·보관/소프트 삭제·복구 | 구현 완료/실기기 대기 | `src/data/migrations.ts`, `migrations.test.ts`, TP-AC-02 |
| AC-3 | 작업 시작·타이머 시작/정지 1탭, 완료/횟수 1탭·되돌리기, 수동 시간 sheet | 구현 완료/실기기 탭 측정 대기 | `src/app/(tabs)/index.tsx`, TP-AC-03 |
| AC-4 | time/completion/count/numeric/event 생성·기록·수정·삭제·복구 | 구현 완료/실기기 대기 | `settings.tsx`, `repository.ts`, TP-AC-04 |
| AC-5 | 요일 mask 자동 노출 + 수동/진행 중 병합, 항목 ID dedupe | 자동 단위 통과/실기기 대기 | `calculations.ts`, `calculations.test.ts`, TP-AC-05 |
| AC-6 | 설정된 하루 종료 시각 기반 남은 가용시간, 계획→실제 합계 | 자동 경계값 통과/실기기 대기 | `calculations.test.ts`, `index.tsx`, TP-AC-06 |
| AC-7 | 항목별 종료 계산, 무제한 메모, upsert 스냅샷, 기록 비잠금 | 구현 완료/실기기 대기 | `today/close.tsx`, `repository.ts`, TP-AC-07 |
| AC-8 | 계정별 계획/실제/차이·총계, 항목/요일 분해, 요일 토글·코멘트 | 구현 완료/실기기 대기 | `week.tsx`, TP-AC-08 |
| AC-9 | 실시간 168h 상태, 조정/그대로 저장, 유효 숫자 비차단 | 자동 계산 통과/실기기 대기 | `plan.tsx`, `calculations.test.ts`, TP-AC-09 |
| AC-10 | 저장/복원 모두 append-only 새 버전, 이력 열람 | 구현 완료/DB 실기기 대기 | `repository.ts`, `plan.tsx`, TP-AC-10 |
| AC-11 | 계획 없음/계획 화면의 지난주 최신 버전 1탭 복사 | 구현 완료/실기기 대기 | `repository.ts`, `week.tsx`, TP-AC-11 |
| AC-12 | 프로젝트·기본/사용자 KPI·값 기록, 연결 항목 누적/주간 파생시간 | 자동 집계 통과/실기기 대기 | `projects.tsx`, `calculations.test.ts`, TP-AC-12 |
| AC-13 | 설정 시각 DAILY 알림, 종료 시 건너뜀/항상 받기, `/today/close` 콜드 딥링크 | 구현 완료/실기기 필수 | `notifications.ts`, TP-AC-13 |
| AC-14 | Android HIGH 채널, 최초 권한/설정 재요청, 예약 ID·시작 재예약 | 구현 완료/실기기 필수 | `notifications.ts`, `app-context.tsx`, TP-AC-14 |
| AC-15 | 전체 테이블 JSON, 테이블별 UTF-8 BOM CSV, 삭제 행·전 계획 버전 포함 | 변환 단위 통과/실기기 공유·대조 대기 | `export.ts`, `export.test.ts`, TP-AC-15 |
| AC-16 | Phase 1 경로가 SQLite/로컬 API만 사용, 원격 서비스 없음 | 구현 완료/비행기 모드 실기기 대기 | `repository.ts`, TP-AC-16 |
| AC-17 | 정보형 숫자/차이 문구, 게임화·사용자 서술 없음 | 정적 검색 통과/전 화면 수동 점검 대기 | `src/`, TP-AC-17 |
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

`npm audit --omit=dev`의 17건은 강제 수정 시 Expo 53으로 하향되는 빌드 도구 경로다. ADR-004에 검토와 보류 근거를 기록했으며 게이트를 숨기거나 약화하지 않았다.

## Phase 2 AC-19~AC-22 구현·증빙

| AC | 구현 결과 | 현재 상태 | 증빙 |
|---|---|---|---|
| AC-19 | Supabase 이메일 매직링크·앱 callback 세션 유지, 전체 로컬 데이터 최초 업로드, pristine 재설치 DB의 시드 원자 교체·pull 복구 | **통과**: 원격 63행과 초기화 후 로컬 사용자 데이터 63행 대조, 계획 1/14·기록 4·outbox 0·충돌 0 | `auth-callback.ts`, `sync-context.tsx`, `sync-service.ts`, `sync-repository.ts`, `20260902053000_phase_2_sync.sql` |
| AC-20 | SQLite v2 trigger outbox, pull→LWW/conflict→push, online/foreground/로컬 변경 자동 재시도 | **통과**: 오프라인 기록에서 outbox 0→1, 온라인 복귀 후 1→0·원격 +1, 실기기 충돌 7건 표시와 최종쓰기 확인 | `migrations.ts`, `sync-repository.ts`, `merge.test.ts` |
| AC-21 | 설정의 로그인 상태, 마지막 동기화, 전송 대기, 지금 동기화, 최근 충돌 표시 | **통과**: 최종 복원 후 로그인·대기 0·충돌 없음, 수동 동기화 시각 23:03:46→23:05:38 갱신 | `settings.tsx` |
| AC-22 | `(user_id,table_name,local_id)` PK, `auth.uid()` RLS와 인증 사용자 전용 RPC | **통과**: 원격 적용·DB lint·익명 REST/RPC 거부와 소유자/타 사용자 역할의 SELECT·UPDATE·DELETE·INSERT 격리 검증 통과 | `supabase/migrations/20260902053000_phase_2_sync.sql`, `20260902060000_fix_apply_oos_sync_records_conflict_target.sql`, `supabase/tests/phase_2_rls.sql` |

## Phase 3 AC-23~AC-26 구현·증빙

| AC | 구현 계획 | 현재 상태 | 예정 증빙 |
|---|---|---|---|
| AC-23 | Telegram webhook secret 검증, 서버 `ALLOWED_CHAT_ID` 일치 확인, update id 처리 상태·결정적 record ID로 재시도 멱등 보장 | **연결 통과/수신 명령 대기** | 16 Telegram tests, Edge Function v2 ACTIVE·health 200, 단일 chat/webhook 설정 완료 |
| AC-24 | Supabase Cron이 설정 시각(기본 21:30)에 오늘 숫자 요약과 `[오늘 종료][수정][나중에]`를 발송하고 종료 버튼이 `day_closures`를 생성 | **예약 발송 통과/버튼 대기** | 21:19 임시 예약 실발송·delivery 완료 후 21:30 복원, 종료 버튼·앱 pull 대조 대기 |
| AC-25 | `/today`, `/study`, `/log`, `/done`, `/count`, `/end`, `/plan`, `/week` 파싱과 `source='telegram'` 원격 기록 | **파서·번들 통과/실명령 대기** | 명령 파서 테스트, 결정적 upsert, 실제 명령·앱 동기화 대조 대기 |
| AC-26 | 자유 문장 규칙 파서와 pending 제안·확인 버튼, 음성 다운로드·전사 어댑터·동일 확인 흐름 | **텍스트 구현 통과/음성 제공자·실대화 대기** | 실제 텍스트 확인과 Q-009 음성 전사 후 앱 대조 |

## 다음 작업

1. 실제 Telegram에서 `/today`, `/study 1`, 자유 문장 제안·확인, 오늘 종료 버튼을 실행하고 앱의 `지금 동기화` 뒤 값을 대조한다.
2. Q-009 전사 제공자 결정과 secret 등록 뒤 실제 음성 제안·확인을 검증해 AC-23~AC-26 최종 게이트를 닫는다.

## 2026-09-02 정적 구현 감사 후속

아래 항목은 2026-09-02 코드 보완과 자동 게이트를 통과했다. Phase 1 완료 전에 실기기 재현은 여전히 필요하다.

- [x] 항목 복구 트랜잭션이 동일 삭제 시각의 일정만 함께 복구하도록 수정했다(기존에 따로 삭제한 일정은 복구하지 않음).
- [x] 설정에서 7개 주 시작 요일을 선택·저장하고 주간·계획·프로젝트 집계 범위와 요일 mask에 적용했다.
- [x] KPI 값 기록의 수정·소프트 삭제·설정 화면 복구 경로를 추가했다.
- [x] 알림 권한 재요청과 설정 변경 재예약이 당일 종료 상태를 전달하도록 수정했다.

사용자는 2026-09-02 기존 수기 검증을 승계하고 반복 단계를 줄여 Phase 2를 즉시 시작하도록 승인했다. 기기 로컬 초기화 결정은 유지하고, 무료 기본 메일 제약에 따라 Q-007에서 이메일 매직링크로 인증 방식을 전환했다.

## 후속 Phase

- [x] Phase 2 — 동기화: AC-19~AC-22. 구현·자동·원격·SM-S721N 실기기 게이트 통과.
- [ ] Phase 3 — Telegram: AC-23~AC-26. 구현·서버·bot·예약 발송 통과, 수신 명령/버튼·음성 실연동 게이트 대기.
- [ ] Phase 4 — 분석: AC-27~AC-30. 진입 시 AI provider/model/key 결정.
- [ ] 상용화 명세 확장 — 앱 스토어 production 배포, 결제, 운영 서버·보안·백업·모니터링. 현재 SPEC §3.3 비목표이므로 Q-005 승인 뒤 별도 AC를 정의.
- [ ] Phase 5 — 확장: 사용자 승인된 `FUTURE.md` 항목만 진행.
