# Phase 3 Telegram 서버 준비 증빙 — 2026-09-03

## 판정

- **서버 준비 게이트: 통과**
- **AC-23~AC-26 최종 게이트: 아직 미확정**
- 대기 사유는 코드 결함이 아니라 외부 소유권·비용 경계다. Q-008의 개인 bot token/chat 대화와 Q-009의 음성 전사 제공자는 사용자가 직접 소유·승인해야 한다.

## 구현 범위

- Supabase Edge Function `telegram-bot`: webhook/cron 분기, webhook secret, 단일 allowed chat, owner user 매핑
- 명령: `/today`, `/study`, `/log`, `/done`, `/count`, `/end`, `/plan`, `/week`, `/help`
- 자유 문장: 규칙 파서 우선, 구조화 결과 proposal 표시, `[확인][무시]` 전에는 DB 미변경
- 음성: Telegram file 다운로드와 OpenAI 호환 전사/구조화 adapter, provider secret 없으면 미적용 안내
- 예약: 사용자 시간대·설정 시각 확인, 하루 1회 delivery ledger, `[오늘 종료][수정][나중에]`
- 앱 설정: 연결된 bot/chat, 시간대, 발송 시각, 활성화 상태 조회·저장
- 보안 연결: token 숨김 입력, 임시 파일 정리, Edge secret, Vault cron secret, webhook secret token

## 로컬 자동 검증

`mobile/`에서 `npm run verify` 종료 코드 0.

| 검사 | 결과 |
|---|---|
| TypeScript strict | 오류 0 |
| ESLint | 경고·오류 0 |
| Vitest | 14 files, 74 tests 통과 |
| Telegram parser/server contract | 2 files, 16 tests 통과 |
| 도메인 커버리지 | statements 99.07%, branches 93.33%, functions 100%, lines 100% |
| Expo dependency | `Dependencies are up to date` |
| expo-doctor | 21/21 checks passed |
| Android Hermes export | 1,441 modules, HBC 생성 성공 |
| PowerShell setup parser | 오류 0 |
| SM-S721N + Metro 재실행 | 앱 top-resumed, Android/React Native/Expo error log 0 |

## 원격 Supabase 검증

| 검사 | 결과 |
|---|---|
| migration `20260903010000_phase_3_telegram.sql` | 적용 완료 |
| migration `20260903011000_phase_3_retry_safe_updates.sql` | 적용 완료 |
| 재확인 `db push --dry-run` | `upToDate: true` |
| linked DB lint | schema errors 0 |
| 실제 RLS 역할 검사 | `phase_3_telegram_rls_passed`, transaction rollback |
| Edge Function | `telegram-bot` v2, `ACTIVE`, JWT 검증 대신 custom webhook/cron secret 사용 |
| health | HTTP 200, `{"ok":true,"service":"telegram-bot"}` |

RLS 검사는 소유자가 자기 Telegram 설정·proposal만 읽고 허용된 두 설정 열만 수정할 수 있는지, 다른 인증 사용자가 이를 읽거나 수정할 수 없는지, 모바일 클라이언트가 서버 proposal을 직접 삽입할 수 없는지를 원격 DB에서 확인했다.

## 재시도·데이터 안전성

- Telegram `update_id`는 `processing/completed/failed` 상태로 보존한다.
- 실패 update는 Telegram 재전송에서 다시 claim할 수 있다.
- 즉시 기록과 proposal은 update/proposal 기반 결정적 UUID를 사용한다.
- 원격 record는 `(user_id, table_name, local_id)` conflict key로 upsert하므로 동일 update 재시도가 기록을 늘리지 않는다.
- 자유 문장·음성 proposal은 원자적으로 `pending → confirmed`를 claim하고 쓰기 실패 시 `pending`으로 되돌린다.

실기기 재실행 중 Android 알림 채널의 `sound: 'default'`가 SDK 57에서 커스텀 음원 조회로 처리되는 기존 오류 로그를 발견했다. 채널 sound 필드를 생략해 Android 시스템 기본음을 사용하도록 수정했고 Metro reload 후 동일 오류가 사라지고 앱이 top-resumed 상태임을 ADB로 확인했다.

## 남은 실제 게이트

1. Q-008: 사용자가 Phase 3 전용 bot을 만들고 token을 로컬 보안 입력에 한 번 붙여넣은 뒤 봇 대화에서 `/start`를 보낸다.
2. 자동 설정 완료 뒤 허용 chat, 위조/다른 chat 차단, 정확 명령, 자유 문장 확인, 21:30 또는 임시 설정 시각 발송, 오늘 종료와 앱 pull을 대조한다.
3. Q-009: 음성 전사/구조화 provider와 key 사용을 승인하고 실제 음성 proposal·확인을 대조한다.

token, service-role key, webhook/cron secret의 실제 값은 이 문서와 로그에 기록하지 않는다.

## 최초 연결 시도 후속

Windows PowerShell 5가 Supabase CLI의 정상 진행 문구 `Initialising login role...`를 `NativeCommandError`로 승격해 사용자 조회 직전에 스크립트가 중단됐다. 중단 시점은 secret·DB·cron·webhook 쓰기 전이며 원격 재검사에서 Telegram custom secret 0, settings 0행, cron 0건을 확인했다. CLI 호출부가 stderr 내용이 아니라 `$LASTEXITCODE`로 성공 여부를 판정하도록 수정하고 PowerShell parser와 계약 테스트를 재통과시켰다.
