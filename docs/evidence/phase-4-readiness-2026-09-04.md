# Phase 4 게이트 통과 증빙 — 2026-09-04

## 현재 판정

Phase 4의 앱·SQLite·Supabase 동기화·안전 적용 경계와 SM-S721N 실응답 검증을 완료했다. Q-010에서 OpenAI Responses API·`gpt-5.6-terra`·과금을 확정하고 단일 소유자 인증 Supabase Edge Function에 서버 secret을 등록했다. 6개 모드와 §5.7 네 질문, 제안 적용·무시, 원격 동기화까지 확인해 AC-27~AC-30과 SPEC §10.3 단계 게이트를 통과했다.

## 구현 범위

- 감사·패턴·프로젝트·최적화·장기·자유질문 6개 모드와 4·8·12주 기간 선택.
- 선택 기간의 계정, 겹치는 모든 계획 버전, 일·주 실제, 항목별 일정/기본 예상과 실제 차이, 프로젝트 주간 투입·상태·KPI, 선택적 하루 메모·주간 코멘트를 포함하는 JSON packager.
- 토큰 예산 초과 시 오래된 메모를 먼저 제외하고 이후 일 집계를 주 집계로 올리며 omissions에 공개.
- SQLite v4 `analysis_sessions`, `ai_proposals`, provider/model 기본값, 세션 검색, 전송 snapshot 열람, 토큰·예상 비용 기록, JSON/CSV export와 전체 초기화 순서.
- 구조화 제안을 pending으로 저장하고 적용 전 계획을 바꾸지 않는다. 사용자 확인 뒤에만 모든 활성 계정을 검증해 `source='ai_applied'`인 append-only 계획 버전을 생성한다. `무시`는 계획을 바꾸지 않는다.
- 고정 시스템 프롬프트, JSON Schema, 파싱 실패 시 원문만 표시/제안 없음, 사용자 성향·심리·동기·위험 또는 판정 문구 감지 시 응답·제안 차단.
- provider/model은 동기화 가능한 일반 설정이다. API 키는 단일 소유자 JWT를 검증하는 Supabase Edge Function의 `OPENAI_API_KEY` secret에만 저장하고 앱·SQLite·동기화 데이터·로그·export·번들에는 포함하지 않는다.

## 자동 게이트

`mobile/`에서 `npm run verify` 종료 코드 0:

- TypeScript strict 오류 0.
- ESLint 경고·오류 0.
- Vitest 19 files / 83 tests 통과.
- 도메인 커버리지 statements 99.07%, branches 93.33%, functions 100%, lines 100%.
- Expo dependencies up to date.
- expo-doctor 21/21.
- Android Hermes 1,447 modules bundle 성공.

SQLite 통합 테스트는 fresh v4와 v2→v4 상향, 분석/제안 outbox, 역순으로 받은 원격 세션/제안 FK 복원, 세션 저장·검색·비용 합계, 적용 전 계획 불변, 불완전 계정·잘못된 주 시작 제안 거부, 적용 뒤 새 계획/전체 라인/`ai_applied` source 생성을 실제 DB로 검증했다. 모바일/서버 계약 테스트는 모델·고정 프롬프트·JSON Schema가 동일하고 API 키가 호출 body에 포함되지 않음을 보호한다.

## 원격 게이트

- linked Supabase에 `20260904010000_phase_4_sync_tables.sql` 적용 완료.
- 기존 envelope·RLS·RPC·핵심 데이터는 유지하고 허용 table name에 `analysis_sessions`, `ai_proposals`만 추가.
- 로컬/원격 migration 목록 일치.
- `supabase db lint --linked --level warning`: schema 오류 0.
- `ai-analysis` Edge Function v2를 `ACTIVE`, `verify_jwt=true`로 배포하고 유일한 기존 사용자 ID를 `OOS_OWNER_USER_ID` secret으로 설정.
- `OOS_OWNER_USER_ID`와 `OPENAI_API_KEY`를 Edge secret으로 설정. 무인증 POST는 HTTP 401이고 로그인된 SM-S721N만 실호출에 성공했다.
- 실세션 9건이 모두 원격 동기화됐다. 모드별 건수는 감사 1·패턴 1·프로젝트 1·최적화 1·장기 1·자유질문 4다.
- 원격 집계는 입력 25,026토큰·출력 7,271토큰·추정 비용 $0.137304, 응답의 `numbers_used` 86개다.
- 제안 3건은 적용 1·무시 1·대기 1이며, 주간 계획은 기존 `app` 1건과 새 `ai_applied` 1건, 라인은 14→28개다.
- 최종 수동 동기화 시각 `2026-09-04 03:34:33`, 전송 대기 0건을 확인했다.

## SM-S721N 실기기 검증

- ADB: serial `R5CY31QP08W`, model `SM-S721N`, Android 16/API 36, 상태 `device`.
- Windows Metro IPv6 localhost 바인딩과 ADB IPv4 reverse 불일치를 확인해 `--host lan`으로 재기동. `adb reverse tcp:8081 tcp:8081` 뒤 Android bundle 1,611 modules 완료.
- `com.oosops.app/.MainActivity`가 resumed이고 React Native render/FATAL 오류 0.
- 기존 v3 DB에서 v4 provider/model 기본값을 적용한 분석 화면이 정상 렌더링되어 상향 migration 실행을 확인.
- 6개 모드, 4·8·12주 선택, 기본 질문, 자동 데이터 수치(시간계정 14·항목 8·기록일 1·주간 집계 1), 예상 토큰, 설정 이동, 세션 검색 빈 상태를 UIAutomator로 확인.
- 자유질문의 §5.7 예시 4개가 표시되고 첫 8주 질문을 누르면 질문 입력과 기간이 8주(`2026-07-11`–`2026-09-04`)로 함께 변경됨을 확인.
- 감사 모드는 2026-08-17 계획 10,080분·실제 1분·차이 -10,079분을 snapshot과 일치하게 답했다.
- 패턴·프로젝트·장기 모드는 각각 실제 데이터가 하루/1분 또는 KPI 0건뿐임을 명시하고 근거 없는 관계·방향성을 만들지 않았다.
- §5.7 네 예시 질문을 모두 실행했다. 편입 시간, 제품 개발과 KPI, 예상·실제 오차, 미완료 프로젝트 질문에서 저장된 숫자와 부족한 필드를 구분했다.
- 최적화 모드가 다음 주 계획 시나리오 3개를 생성했다. 응답 저장 시 계획은 바뀌지 않았고, 확인 후 한 제안만 `2026-09-07`의 `ai_applied` 계획으로 생성됐다. 다른 제안의 `무시`는 계획 수를 바꾸지 않았다.
- 설정에서 `openai`/`gpt-5.6-terra`, 서버 secret 안내, 현재 단가, 4·8·12주 기본값, 메모 포함/제외, 누적 `9세션 · 입력 25026토큰 · 출력 7271토큰 · 추정 $0.137304`를 확인했다.
- 원격 응답 전체를 검사해 금지 문구와 API secret marker가 각각 0건임을 확인했다.

## 최종 판정

- AC-27: **통과** — 여섯 모드, 기간 선택, 자동 첨부, 세션 저장·검색·원격 동기화.
- AC-28: **통과** — 적용 전 불변, 명시적 적용으로만 새 `ai_applied` 버전, 무시 시 계획 불변.
- AC-29: **통과** — 고정 prompt/schema 테스트와 실제 응답 숫자·금지 문구 점검.
- AC-30: **통과** — §5.7 네 질문의 실제 저장 데이터 기반 답변.
- 다음 제품 범위는 Q-005의 개인용 production 배포 및 상용화 명세 확정이다. Phase 4 완료 자체가 앱 스토어·결제·다중 사용자 운영 완료를 뜻하지는 않는다.
