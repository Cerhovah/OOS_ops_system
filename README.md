# OOS Ops

168시간 계획, 실제 기록, 프로젝트 KPI와 변경 이력을 사용자가 직접 관리하는 로컬 우선 모바일 앱입니다. `docs/SPEC.md`가 제품과 구현의 source of truth입니다.

## 현재 상태

- **2026-09-06 Phase 5 완료:** Tiimo 연속 flow와 합성 데이터 Figma 시안을 기준으로 미니멀 UI를 구현하고 자동·Android 실기기·personal standalone 게이트를 통과했습니다. 다음은 Phase 6이며, sync 계약을 바꾸기 전에 서버 준비 범위와 배포 순서를 먼저 확정합니다. [명세 §17~§22](docs/SPEC.md#17-phase-5--uiux-개선-상세) → [구현 계획](docs/PLAN.md) → [디자인 조사](docs/design-research.md) → [Phase 5 증빙](docs/evidence/phase-5-ui-2026-09-06.md) 순으로 읽습니다.

- Phase 1 AC-1~AC-18 게이트 통과(기존 수기 검증 사용자 승인 승계)
- TypeScript strict와 미사용 코드 검사, ESLint, 단위테스트·커버리지, Expo 패키지 검사, `expo-doctor`, Android Hermes 번들 검사 통과
- Phase 2 SQLite outbox/LWW/충돌 로그, Supabase 매직링크/RLS, 자동·수동 동기화 구현 및 자동 게이트 통과
- Phase 2 원격 migration 적용, 0.2.0 development APK, SM-S721N 실기기 AC-19~AC-22 게이트 완료
- Phase 3 철회 마감: Telegram 제거와 함께 레거시 동기화 스키마·템플릿 잔여물·중복 테스트 기반·문서 드리프트 정리
- Phase 4 여섯 분석 모드, 기간별 데이터 package, SQLite 세션·제안, 명시적 계획 적용과 Supabase 동기화 구현 및 AC-27~AC-30 게이트 통과
- Q-010에서 OpenAI Responses API·`gpt-5.6-terra`·API 과금을 확정했다. 단일 소유자 Supabase Edge Function에서 6개 모드를 포함한 실세션 9건, 제안 적용·무시, 원격 동기화를 SM-S721N으로 검증했다.
- Phase 4R 동작 보존 리팩터와 Phase 4S 개인용 standalone의 자동·clean DB·원격·실기기 게이트를 완료했다. SQLite v6, PKCE-only callback·네이티브 SecureStore 세션, repository/sync/UI/분석 모듈 분리, 동기화·RPC·AI 요청 보안 경계와 고정 버전 CI를 유지한다.
- Phase 4S `personal` release APK `0.4.3(10)`을 SM-S721N에 데이터 보존 업데이트로 설치했다. APK에 `assets/index.android.bundle`이 포함되고, 앱은 non-debuggable이며 Metro listener·ADB reverse 없이 launcher cold start가 됐다. 오프라인 5탭·기록 저장/재시작·JSON 내보내기·로컬 알림, 온라인 복귀 동기화 10→0과 personal build AI 실호출까지 AC-36~AC-39를 통과했다.
- Phase 5는 오늘·기록 2탭, TaskSheet, 경과 TimerView, 날짜별 기록 원장, 기존 기능의 더보기 이동을 구현했다. P6의 countdown·pause/resume·날짜 귀속 편집과 schema/sync 변경은 포함하지 않았다.

현재 앱 버전은 `0.5.0(11)`입니다. EAS `personal` build `fa8d2cf2-478b-4b62-8afd-1302ab7721a9`를 데이터 보존 업데이트로 설치했으며 이 빌드는 PC·USB·Metro 없이 로컬 기능을 실행하도록 JavaScript bundle을 내장합니다. 로그인·동기화는 Supabase 인터넷 연결이, AI 분석은 Supabase Edge Function과 OpenAI 연결이 필요합니다. Phase 5 상세 판정은 `docs/evidence/phase-5-ui-2026-09-06.md`를 기준으로 합니다.

Phase 2·4의 실기기 결과와 철회된 Phase 3의 구현·제거 이력은 `docs/TESTPLAN.md`, `docs/evidence/phase-2-readiness-2026-09-02.md`, `docs/evidence/phase-3-readiness-2026-09-03.md`, `docs/evidence/phase-4-readiness-2026-09-04.md`에 기록되어 있습니다.

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
4. 모바일과 Supabase Edge Function의 요청·보안 계약 테스트
5. 현재 Expo SDK 의존성 호환성 검사
6. `expo-doctor`
7. Android Hermes 번들 생성

깨끗한 체크아웃은 `mobile/.env.example`의 변수 이름만 참고하고 실제 공개 Supabase 값은 ignore된 `.env.local` 또는 EAS environment에서 공급합니다. GitHub Actions도 잠금 파일 설치·전체 모바일 게이트와 깨끗한 Supabase DB migration/RLS 테스트를 실행합니다.

## 개발 빌드 실행

Android Studio/JDK 로컬 환경은 현재 개발 흐름에 요구하지 않습니다. `mobile/eas.json`의 `development` 프로필은 EAS Cloud에서 SDK 57 이미지로 설치 가능한 development-client APK를 생성합니다.

EAS 프로젝트는 `@ljh951206/oos-ops`에 연결됐습니다. Phase 5용 `0.5.0(11)` development build `f9ff3f21-45f2-4e1f-a682-06e3fe18d4c6`에서 핵심 흐름을 확인했습니다. 일상 사용 대상은 이 개발 클라이언트가 아니라 현재 설치된 `0.5.0(11)` personal release입니다. 빌드 ID·해시·APK 경로는 `docs/TESTPLAN.md`와 `docs/evidence/`의 이력만 기준으로 합니다.

개발 클라이언트가 기기에 설치된 뒤 PC에서 다음 명령으로 개발 서버를 시작합니다.

```bat
cd mobile
npx expo start --dev-client
```

휴대폰과 PC를 같은 네트워크에 연결하고 설치된 `OOS Ops` 아이콘으로 실행합니다. 네트워크 연결이 어려우면 개발 서버 실행 방법을 별도로 점검하며, 로컬 기록 자체는 SQLite에서 오프라인으로 동작합니다.

LAN 연결이 되지 않으면 다음 터널 명령을 사용합니다. `@expo/ngrok`은 이 경로를 재현하기 위해 유지하는 개발 의존성입니다.

```bat
cd mobile
npx expo start --dev-client --tunnel
```

이 절차는 개발 클라이언트용이므로 평상시 실행에 Metro가 필요합니다. 일상 사용에는 `personal` 프로필로 만든 `0.5.0(11)` release APK를 사용합니다. 이 APK는 Metro가 필요 없으며 EAS artifact URL이 만료되어도 이미 설치된 앱은 계속 실행됩니다. 로그인·동기화에는 Supabase 인터넷 연결, AI 분석에는 Supabase Edge Function과 OpenAI 연결이 필요하지만 기록·계획·프로젝트·로컬 알림은 SQLite 기반으로 오프라인 동작합니다.

## 구현 기능

- 오늘: 날짜 우선 화면, 자동 TaskSheet·명시적 재열기, 항목 선택·경과 타이머·종료, 직접 기록 진입
- 기록: 날짜별 실제 기록 원장과 오늘/어제/날짜 선택 이동
- 더보기: 주간·계획·프로젝트·분석·설정·오늘 종료 진입
- 주간: 계정별 계획·실제·차이, 총계, 항목·요일 분해, 주간 코멘트
- 계획: 168시간 실시간 계산, 비차단 저장, append-only 버전·복원·지난주 복사
- 프로젝트: 프로젝트 상태·실험·판정일, KPI 선택/기록, 연결 항목의 파생 투입시간
- 설정: 계정·항목·프로젝트·KPI 관리, 소프트 삭제 복구, JSON/CSV 내보내기, 2단계 초기화
- 알림: 오늘 종료, 선택형 항목 일정, 선택형 타이머 상한, Android HIGH·PRIVATE v3 채널, 콜드 스타트 딥링크, 단일 예약 큐와 초기화 중단에도 재시도되는 고아 예약 정리
- 동기화: 이메일 매직링크의 PKCE code callback과 네이티브 SecureStore 세션, SQLite outbox, online/foreground 자동 재시도, 수동 동기화, 마지막 동기화 시각, 충돌 로그, Supabase RLS
- 분석: 감사·패턴·프로젝트·최적화·장기·자유질문, 완료된 최근 4·8·12주 데이터 첨부, 세션 검색·소프트삭제·설정 복구, 전송 snapshot 열람, 비용 기록, 사용자 확인 뒤에만 새 계획 버전 적용

## 환경변수와 비밀값

Phase 2는 EAS 프로젝트의 `EXPO_PUBLIC_SUPABASE_*` 변수 두 개를 사용합니다. 로컬 개발값은 `npx eas-cli@23.2.0 env:pull development --non-interactive --path .env.local`로 받고 `.env.local`은 커밋하지 않습니다. 공개 URL/publishable key는 앱 배포용 값이며 데이터 보호는 RLS가 담당합니다. database password, service-role key, secret key는 앱이나 저장소에 넣지 않습니다.

| Phase | 값 | 정책 |
|---|---|---|
| 2 | Supabase URL/공개 클라이언트 키 | EAS environment + ignore된 `.env.local`, RLS 필수 |
| 4 | AI provider/model/key | `openai`/`gpt-5.6-terra` 일반 설정, API 키는 인증된 Supabase Edge Function의 서버 secret에만 저장 |

토큰, 개인 키, 서비스 역할 키는 코드·문서·커밋·앱 번들에 넣지 않습니다.

## 기준 문서

- `docs/SPEC.md`: 불변조건, 기능, 수용기준
- `docs/PLAN.md`: AC별 구현 상태와 게이트
- `docs/TESTPLAN.md`: 자동·실기기 검증 절차와 결과
- `docs/DECISIONS.md`: 기술 ADR
- `docs/QUESTIONS.md`: 현재 사용자 행동/결정이 필요한 항목
- `docs/ENVIRONMENT.md`: Windows/macOS 재현 절차
