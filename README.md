# OOS Ops

168시간 계획, 실제 기록, 프로젝트 KPI와 변경 이력을 사용자가 직접 관리하는 로컬 우선 모바일 앱입니다. `docs/SPEC.md`가 제품과 구현의 source of truth입니다.

## 현재 상태

- Phase 1 AC-1~AC-18 게이트 통과(기존 수기 검증 사용자 승인 승계)
- TypeScript strict, ESLint, 단위테스트·커버리지, Expo 패키지 검사, `expo-doctor`, Android Hermes 번들 검사 2026-09-02 재통과
- Phase 2 SQLite outbox/LWW/충돌 로그, Supabase 매직링크/RLS, 자동·수동 동기화 구현 및 자동 게이트 통과
- Phase 2 원격 migration 적용, 0.2.0 development APK, SM-S721N 실기기 AC-19~AC-22 게이트 완료
- Phase 3 Telegram, Phase 4 AI는 구현하지 않음

Phase 2의 로그인·최초 업로드·오프라인 복귀·재설치 복구·RLS 실기기/원격 검증 결과는 `docs/TESTPLAN.md`와 `docs/evidence/phase-2-readiness-2026-09-02.md`에 기록되어 있습니다.

## 고정 환경

- Node.js 24.19.0 LTS
- npm 11.17.0만 사용 (`yarn`, `pnpm`, `bun` 금지)
- Expo SDK 57 / React Native 0.86 / Expo Router
- 앱 경로: `mobile/`
- 패키지 잠금: `mobile/package-lock.json`
- Expo CLI: 전역 설치하지 않고 `npx expo` 사용

운영체제별 설치 절차는 `docs/ENVIRONMENT.md`를 참조합니다.

## 설치와 전체 검증

저장소 루트에서 다음 명령을 실행합니다.

```bat
cd mobile
npm ci
npm run verify
```

`verify`는 다음을 순서대로 실행합니다.

1. `tsc --noEmit`
2. ESLint(경고 포함 0건)
3. Vitest와 도메인 커버리지 90% 게이트
4. 현재 Expo SDK 의존성 호환성 검사
5. `expo-doctor`
6. Android Hermes 번들 생성

## 개발 빌드 실행

Android Studio/JDK 로컬 환경은 Phase 1에 요구하지 않습니다. `mobile/eas.json`의 `development` 프로필은 EAS Cloud에서 SDK 57 이미지로 설치 가능한 development-client APK를 생성합니다.

EAS 프로젝트는 `@ljh951206/oos-ops`에 연결됐습니다. 현재 소스용 Android development build `5448b354-f54f-4d17-b657-36f8b97afa48`은 완료됐고 APK는 `C:\Users\skljh\Downloads\OOS-Ops-0.1.0-development-5448b354.apk`에도 보존했습니다. 설치 절차는 `docs/QUESTIONS.md` Q-003과 `docs/TESTPLAN.md`를 따릅니다. APK가 기기에 설치된 뒤 PC에서 다음 명령으로 개발 서버를 시작합니다.

```bat
cd mobile
npx expo start --dev-client
```

휴대폰과 PC를 같은 네트워크에 연결하고 설치된 `OOS Ops` 아이콘으로 실행합니다. 네트워크 연결이 어려우면 개발 서버 실행 방법을 별도로 점검하며, 로컬 기록 자체는 SQLite에서 오프라인으로 동작합니다.

## 구현 기능

- 오늘: 일정/수동/진행 중 항목, 타이머, 5개 기록 유형, 남은 가용시간, 오늘 종료
- 주간: 계정별 계획·실제·차이, 총계, 항목·요일 분해, 주간 코멘트
- 계획: 168시간 실시간 계산, 비차단 저장, append-only 버전·복원·지난주 복사
- 프로젝트: 프로젝트 상태·실험·판정일, KPI 선택/기록, 연결 항목의 파생 투입시간
- 설정: 계정·항목·프로젝트·KPI 관리, 소프트 삭제 복구, JSON/CSV 내보내기, 2단계 초기화
- 알림: 오늘 종료, 선택형 항목 일정, 선택형 타이머 상한, Android HIGH 채널, 콜드 스타트 딥링크
- 동기화: 이메일 매직링크와 앱 딥링크 복귀, SQLite outbox, online/foreground 자동 재시도, 수동 동기화, 마지막 동기화 시각, 충돌 로그, Supabase RLS

## 환경변수와 비밀값

Phase 2는 EAS 프로젝트의 `EXPO_PUBLIC_SUPABASE_*` 변수 두 개를 사용합니다. 로컬 개발값은 `npx eas-cli@latest env:pull development --non-interactive --path .env.local`로 받고 `.env.local`은 커밋하지 않습니다. 공개 URL/publishable key는 앱 배포용 값이며 데이터 보호는 RLS가 담당합니다. database password, service-role key, secret key는 앱이나 저장소에 넣지 않습니다.

| Phase | 값 | 정책 |
|---|---|---|
| 2 | Supabase URL/공개 클라이언트 키 | EAS environment + ignore된 `.env.local`, RLS 필수 |
| 3 | Telegram token/chat_id | 서버 환경변수 전용, 앱 번들 금지 |
| 4 | AI provider/model/key | 기기 키는 SecureStore, 서버 키는 서버 환경변수 |

토큰, 개인 키, 서비스 역할 키는 코드·문서·커밋·앱 번들에 넣지 않습니다.

## 기준 문서

- `docs/SPEC.md`: 불변조건, 기능, 수용기준
- `docs/PLAN.md`: AC별 구현 상태와 게이트
- `docs/TESTPLAN.md`: 자동·실기기 검증 절차와 결과
- `docs/DECISIONS.md`: 기술 ADR
- `docs/QUESTIONS.md`: 현재 사용자 행동/결정이 필요한 항목
- `docs/ENVIRONMENT.md`: Windows/macOS 재현 절차
