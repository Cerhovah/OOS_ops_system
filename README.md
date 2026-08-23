# OOS Ops

자신의 168시간, 기록, 프로젝트와 계획 변경을 직접 지휘하는 Expo/React Native 로컬 우선 앱입니다. 현재 범위는 Phase 1이며, 데이터의 진실 원천은 기기 안의 SQLite입니다.

## 현재 상태

- Phase 1 AC-1~AC-18 구현 완료, Android 실기기 게이트 검증 중
- 기존 Android development APK에서 한국어 앱 화면과 아이콘 콜드 스타트 확인
- TypeScript, ESLint, 36개 자동 테스트, 의존성 검사, Android JS bundle 통과
- Phase 2의 Supabase 동기화·인증은 시작하지 않았으며 현재 앱에서 비활성화

상세 상태와 실제 결과는 `docs/PLAN.md`, `docs/TESTPLAN.md`, `docs/evidence/phase1-android-2026-08-23.md`에서 확인합니다.

## 요구 환경

- Node.js `24.19.x`
- npm `11.17.x`
- Android 최종 검증: 설치된 development build와 실기기

## 실행

의존성이 이미 설치된 현재 개발 환경에서는 `mobile` 디렉터리에서 실행합니다.

```powershell
cd mobile
npx expo start --dev-client --tunnel
```

현재 복구 세션에서는 Metro tunnel과 기존 APK를 그대로 사용합니다. 캐시·서버 장애가 실제로 재현되지 않는 한 재설치, 재빌드, `npm ci`, EAS 재연결을 반복하지 않습니다.

## 자동 검증

```powershell
cd mobile
npm run typecheck
npm run lint
npm run test:coverage
npm run deps:check
npm run bundle:android
```

전체 묶음은 `npm run verify`로 실행할 수 있습니다. `expo-doctor`는 Phase 1 게이트에서 21/21 통과한 상태입니다.

## 개발 빌드

현재 Android development APK는 이미 설치되어 있어 Phase 1 검증 중에는 다시 만들지 않습니다. 새 기기나 native dependency 변경으로 실제 재빌드가 필요할 때만 `mobile/eas.json`의 `development` 프로필과 EAS Build를 사용합니다. 이는 빌드 시간이나 서비스 사용량이 들 수 있으므로 사용자와 필요성을 확인한 뒤 수행합니다.

## 데이터와 환경변수

- Phase 1 데이터: `expo-sqlite` 로컬 DB
- 알림: `expo-notifications` 로컬 예약 알림
- 내보내기: 전체 JSON, 테이블별 CSV
- Phase 1 외부 서비스 환경변수: 없음

Supabase, Telegram, AI 제공자 키는 후속 Phase 승인 전에는 필요하지 않으며 코드·문서·앱 번들에 넣지 않습니다.

## 문서

- `docs/SPEC.md`: 제품 명세와 수용 기준
- `docs/PLAN.md`: 현재 Phase와 게이트 상태
- `docs/TESTPLAN.md`: AC별 자동·실기기 결과
- `docs/DECISIONS.md`: 기술 결정
- `docs/QUESTIONS.md`: 사용자 결정이 필요한 항목
- `docs/CHANGELOG.md`: 사용자에게 의미 있는 변경
- `docs/FUTURE.md`: 승인 범위 밖 후보
