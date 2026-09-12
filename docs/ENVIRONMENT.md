# ENVIRONMENT

## 고정 도구

- Node.js: 24.19.0 LTS (`.nvmrc`)
- npm: 11.17.0
- 패키지 관리자: npm만 사용
- Expo CLI: 전역 설치 금지, `npx expo` 사용
- EAS CLI: 23.2.0 (`mobile/eas.json`)
- Supabase CLI: 2.116.0 (CI와 원격 명령 공통)
- 앱 경로: `mobile/`
- 소스 줄바꿈: LF (`.gitattributes`)
- Android 개발 빌드: EAS Cloud development build 우선

## Windows 10/11 x64

아래 `npm run verify`는 새 환경 복구 또는 Phase 종료용 전체 기준선이다. 일반 UI 변경에는 루트 `AGENTS.md`와 SPEC §8의 최소 검증 원칙(typecheck/lint와 관련 테스트)을 우선 적용하며, 매 편집마다 전체 검증이나 APK 빌드를 반복하지 않는다.

필수 설치:

1. Git for Windows
2. Node.js 24.19.0 LTS x64(설치 프로그램에 포함된 npm 사용)
3. VS Code 또는 다른 편집기

저장소 루트의 VS Code 터미널은 Command Prompt를 기본으로 사용한다. PowerShell에서 실행 정책으로 `npm.ps1`이 차단돼도 시스템 정책을 바꾸지 않는다.

```bat
git --version
node --version
npm --version
cd mobile
npm ci
npm run verify
npx expo start --dev-client
```

LAN QR 연결이 공용 Wi-Fi/라우터 격리/Windows 방화벽 때문에 실패하면 프로젝트에 고정된 `@expo/ngrok`을 사용해 터널로 시작한다.

```bat
cd mobile
npx expo start --dev-client --tunnel --clear
```

터널은 인터넷을 경유하므로 LAN보다 느릴 수 있다. 종료 후에는 생성된 URL이 더 이상 동작하지 않으며 다음 실행에서 새 QR을 사용한다.

기대 버전:

```text
node v24.19.0
npm 11.17.0
```

## macOS

필수 설치:

1. Xcode Command Line Tools: `xcode-select --install`
2. Git
3. nvm
4. VS Code 또는 다른 편집기

저장소 루트에서 zsh로 실행한다.

```zsh
nvm install 24.19.0
nvm use 24.19.0
node --version
npm --version
cd mobile
npm ci
npm run verify
npx expo start --dev-client
```

## 최초 앱 생성 명령

앱이 없을 때 저장소 루트에서 한 번만 실행한다.

```bat
npx create-expo-app@latest mobile
```

생성 후 `mobile/package-lock.json`을 반드시 유지한다. yarn, pnpm, bun 명령과 잠금 파일을 사용하지 않는다.

## 패키지 설치 규칙

정상 복구는 개별 패키지를 다시 고르지 않고 `mobile/package-lock.json`을 기준으로 `npm ci`를 실행한다. 새 Expo SDK 패키지를 추가할 때만 `mobile/`에서 SDK 호환 버전을 선택하는 `npx expo install`을 사용한다.

```bat
npm ci
npx expo install <새 Expo 패키지>
```

Router는 create-expo-app 기본 템플릿의 `expo-router` 구성과 entry 설정을 확인한다. 일반 테스트·개발 도구만 `npm install --save-dev`로 설치한다.

## EAS Cloud development build

Android Studio와 JDK는 현재 요구하지 않는다. `mobile/eas.json`은 SDK 57 Cloud 이미지, development client, internal APK를 고정한다. EAS 사용 시점에는 Expo 계정 로그인과 실제 기기 설치가 필요하므로 에이전트가 그 직전에 멈추고 안내한다.

```bat
cd mobile
npx eas-cli@23.2.0 login
npx eas-cli@23.2.0 whoami
set EAS_NO_VCS=1
npx eas-cli@23.2.0 build --platform android --profile development --non-interactive --wait
set EAS_NO_VCS=
```

현재 Windows 저장소 경로의 대괄호 때문에 기본 EAS 로컬 git archive가 실패하므로 이 경로에서만 `EAS_NO_VCS=1`을 사용한다. 대괄호 없는 경로에서는 먼저 기본 명령을 사용한다. PowerShell에서는 build 전 `$env:EAS_NO_VCS = '1'`, build 후 `Remove-Item Env:EAS_NO_VCS`로 같은 범위를 적용한다.

현재 연결된 프로젝트는 `@ljh951206/oos-ops`, project ID는 `a0b6c215-c87a-40ff-b749-b715d1ed9352`다. Expo SDK 57 patch 정렬 소스의 backup helper development build `1ccfb2da-eb2b-41b4-985b-5fdb98fb3509`로 SQLite DB/WAL/SHM을 추출했고, 일상 사용용 `0.6.0(12)` personal build `769d5e3e-6df8-49ae-9994-11458c7fe8a4`를 SM-S721N에 데이터 보존 업데이트로 설치했다. 이후에도 native dependency·권한·config plugin을 바꾸면 새 binary가 필요하다. 비용·계정 플랜·자격증명 선택이 나타나면 임의로 진행하지 않는다.

development client는 JavaScript를 받기 위해 Metro가 필요하다. `personal` profile은 developer launcher 없이 release APK와 embedded JavaScript bundle을 생성한다. 2026-09-06 설치본은 non-debuggable, `assets/index.android.bundle` 포함, Metro 8081 listener와 ADB reverse가 없는 상태에서 launcher cold start를 확인했다. USB는 설치·로그 확인에만 사용됐고 실행 의존성이 아니다.

개인용 APK를 다시 만들 때는 `mobile/`에서 아래 명령을 사용한다. 앱 자체를 변경하지 않으면 다시 발급받을 필요가 없다.

```bat
set EAS_NO_VCS=1
npx eas-cli@23.2.0 build --platform android --profile personal --non-interactive --wait
set EAS_NO_VCS=
```

현재 보존 artifact는 `C:\Users\skljh\Downloads\OOS-Ops-0.6.0-build12-personal.apk`, SHA-256은 `7F1F0CEC62FAE557ED1C830FF749648E44F9215180F4ED8F83AC7395589A3FF1`이다. 설치 전 SQLite DB/WAL/SHM 백업은 `C:\Users\skljh\Downloads\OOS-Ops-user-data-backup-20260912-1132`에 보존한다. native rollback은 동일 EAS Android keystore를 유지한 채 알려진 정상 commit을 더 높은 `versionCode`로 다시 빌드하고 `adb install -r` 또는 스토어 업데이트로 설치한다. SQLite migration은 전진형이므로 오래된 낮은 versionCode APK를 강제 downgrade하지 않는다.

`0.6.0(12)` Today-first 소스는 Expo SDK 57 expected patch 기준의 13개 Expo package를 정렬했고 clean `npm ci`, 전체 verify, Expo dependency check, Doctor 21/21, personal standalone 빌드와 데이터 보존 실기기 검증을 통과했다. 기능 코드·SQLite schema·Supabase/sync 계약은 이 정렬에서 변경하지 않았다.

## Phase 2 Supabase 개발 환경

EAS development 환경의 공개 URL/publishable key를 ignore된 로컬 파일로 가져온다. 값은 터미널·문서에 출력하지 않는다.

```bat
cd mobile
npx eas-cli@23.2.0 env:pull development --non-interactive --path .env.local
```

처음 구성할 때는 커밋된 `mobile/.env.example`의 변수 이름만 복사한다. 이 예제 파일에는 값이나 secret을 넣지 않는다.

원격 migration은 Supabase CLI 로그인 뒤 저장소 루트에서 적용한다. `supabase login`만 사용자가 완료하면 이후 init/link/push는 에이전트가 실행한다. database password, service-role key, secret key는 앱이나 저장소에 넣지 않는다.

```bat
npx supabase@2.116.0 login
```

Phase 2 인증은 Supabase Free 기본 메일의 매직링크와 PKCE code callback만 사용한다. 네이티브 세션은 `expo-secure-store`에 `WHEN_UNLOCKED_THIS_DEVICE_ONLY`로 저장하고, 기존 Expo SQLite KV 평문 세션은 보안 저장소 쓰기에 성공한 뒤 제거한다. 보안 저장 실패 시 평문 fallback은 사용하지 않는다. 웹 대상은 브라우저 localStorage를 사용하므로 native SecureStore와 같은 보안 경계로 간주하지 않는다.

`supabase/config.toml`은 `oosops://auth/callback` 추가 리디렉션과 신규 가입 차단을 저장소 기준으로 둔다. hosted Auth의 신규 가입 스위치는 별도 원격 설정이며 Q-013 사용자 확인 뒤 일치시킨다. 전체 hosted config를 무심코 push하면 로컬 `site_url` 등 다른 값을 덮을 수 있으므로 필요한 설정만 확인·적용한다. 커스텀 스킴이나 SecureStore plugin 변경 뒤에는 development build를 새로 생성한다.

OTP 구현 build `1ead311c-9397-4f53-8893-36193025ab02`는 과거 이력이며, 매직링크 전환 뒤에는 `0.2.0(3)` build `154087e2-b93d-451a-b62c-ba6e988f4592`를 기준으로 한다. 로컬 APK 파일 경로는 기기별 정보이므로 재현 기준으로 사용하지 않고 EAS build ID와 `docs/evidence/phase-2-readiness-2026-09-02.md`의 해시를 사용한다.

## Phase 4 AI 개발 환경

- provider와 model은 `openai`와 `gpt-5.6-terra`로 Q-010에서 확정됐고 앱의 `설정 → AI 분석`에 표시된다. 일반 설정값은 기존 Supabase 동기화 대상이다.
- 앱은 로그인 JWT로 `ai-analysis` Supabase Edge Function을 호출한다. 함수는 `verify_jwt=true`와 단일 `OOS_OWNER_USER_ID`를 확인한다.
- API 키는 `OPENAI_API_KEY` Supabase Edge secret에만 저장하며 앱, `.env`, SQLite, 동기화 데이터, 로그, JSON/CSV export, 번들에는 넣지 않는다.
- 기본 분석 기간은 4주이고 8주·12주를 선택할 수 있다. 메모 첨부는 같은 화면에서 끌 수 있다.
- OpenAI Platform에서 키를 만든 뒤 저장소 루트에서 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\supabase\scripts\configure-openai.ps1`을 실행해 보안 프롬프트에 붙여넣는다. 스크립트는 Windows PowerShell 5.1에서도 깨지지 않는 ASCII 안내를 사용하고, 화면·명령 기록에 키를 표시하지 않으며 임시 파일을 덮어쓴 뒤 제거한다. 2026-09-04 Phase 4의 `ai-analysis` v2에서 원격 secret 등록과 인증 실호출을 완료했지만, 현재 v3 보안 변경 뒤 인증 회귀 호출은 아래와 같이 별도 대기다.
- 서버 함수 코드는 `npx supabase@2.116.0 functions deploy ai-analysis --use-api`로 배포한다. secret 변경 뒤 함수 재배포는 필요하지 않다.
- 2026-09-04 Phase 4R 원격 기준은 migration `20260904020000` 적용·재 dry-run up to date·DB lint 0·`phase_2_rls_passed`, `ai-analysis` v3 ACTIVE와 무인증 401이다. 인증된 최신 함수 실호출은 아직 대기다.

## 재현 및 검증

### 선택 사항: Android 실기기 ADB 자동 검증

Android Studio 전체 없이 Windows 사용자 범위에 공식 Platform-Tools를 설치할 수 있다.

```bat
winget install --id Google.PlatformTools --exact --scope user --silent --accept-source-agreements --accept-package-agreements
adb version
adb devices -l
```

2026-09-02 이 PC에는 Platform-Tools 37.0.1(`adb` 1.0.41)을 사용자 범위로 설치했다. SM-S721N에서 개발자 옵션과 USB 디버깅을 켜고 최초 RSA 허용을 완료한 뒤 `adb devices -l`에 `device`로 표시되어야 한다. `fastboot`는 설치 패키지에 포함되지만 이 프로젝트 검증에서는 사용하지 않는다.

깨끗한 체크아웃에서는 `npm install` 대신 잠금 파일을 그대로 재현하는 `npm ci`를 사용한다.

```bat
cd mobile
npm ci
npm run verify
```

`verify`는 TypeScript, ESLint, 단위테스트·커버리지, 모바일↔Supabase Edge 요청·보안 계약, Expo 의존성 검사, 잠금 파일에 고정한 `expo-doctor`, Android Hermes 번들을 실행한다. Expo 의존성 메타데이터 확인에는 네트워크가 필요하다. 결과는 `docs/TESTPLAN.md`에 기록한다.

Docker가 있는 환경에서는 저장소 루트에서 깨끗한 Supabase DB에 전체 migration을 적용하고, 트랜잭션 안에서 임시 Auth 사용자를 만드는 RLS assertion SQL을 실행한다. 원격 검증과 달리 로컬 컨테이너 데이터만 사용한다.

```bat
npx supabase@2.116.0 db start
docker exec -i supabase_db_oos_ops_system psql --username postgres --dbname postgres --set ON_ERROR_STOP=on < supabase/tests/phase_2_rls.sql
npx supabase@2.116.0 stop --no-backup
```

`db query --local --file`은 여러 SQL 문장을 하나의 prepared statement로 보내므로 이 트랜잭션형 assertion 파일에는 사용하지 않는다. CI는 Supabase가 시작한 격리 Postgres 컨테이너 안의 `psql`을 사용하고 `ON_ERROR_STOP`으로 첫 assertion 실패에서 종료한다.

GitHub Actions의 `Verify` workflow도 고정된 Node/npm·Supabase CLI와 잠금 파일로 모바일 전체 게이트와 clean database 검사를 재현한다. 실행 전용 secret은 CI에 추가하지 않았으며 Edge의 실제 과금 호출은 자동 CI 범위가 아니다.

## 현재 검증된 프리플라이트

2026-09-02 Windows 환경에서 다음 버전을 직접 확인했다.

```text
git version 2.50.0.windows.2
node v24.19.0
npm 11.17.0
```

PowerShell에서 `npm.ps1`이 실행 정책으로 차단될 때는 정책을 바꾸지 말고 VS Code 프로젝트 기본 터미널인 Command Prompt를 사용한다.

Windows 긴 경로는 OS에서 `LongPathsEnabled=1`, 이 저장소의 로컬 Git 설정에서 `core.longpaths=true`로 확인했다. 현재 의존성·Metro·자동 게이트의 복구 결과는 `docs/evidence/phase-1-recovery-2026-09-02.md`를 참조한다.

2026-09-05 최신 소스에서는 `npm run verify` 종료 코드 0, 35 files/221 tests, coverage 99.07/94.93/100/100, Supabase 계약 2 files/8 tests, dependency up to date, doctor 21/21, Android Hermes 1,493 modules를 확인했다. `ai-analysis` v5는 ACTIVE이고, personal release APK의 설치·embedded bundle·non-debuggable·Metro 독립 cold start를 확인했다. Phase 4S의 전체 오프라인 조작과 온라인 복귀 회귀는 별도 게이트로 남긴다.

## Phase 5 환경·종료 산출물 (2026-09-06)

- Node.js `24.19.0`, npm `11.17.0`, Expo CLI `57.0.22`, EAS 계정 연결을 확인했다. `npm run deps:check`와 `npm run doctor`는 각각 종료 코드 0, Doctor 21/21이다.
- Figma MCP 연결은 정상이며 2026-09-12 인증 결과는 `이준혁의 팀`의 `Pro / Full` 좌석이다. 기존 [4화면 node 13:2](https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F?node-id=13-2)는 과거 쓰기 제한 뒤 HTML capture로 만든 정적 산출물이므로 비교용으로 보존하고 새 네이티브 재설계와 분리한다.
- Mobbin 월 구독과 전용 호출 도구가 정상이다. 2026-09-09 최신 [Tiimo `Completing a task` 9화면](https://mobbin.com/flows/5b4c73db-d619-4f47-a666-5663d1b65ce3)을 실제 조회했다. Mobbin/Figma를 앱 runtime dependency로 추가하지 않는다.
- ADB Platform-Tools와 SM-S721N(Android 16) 연결을 사용해 `com.oosops.app`만 설치·실행·로그 확인했다. 다른 앱이나 기기 개인 데이터는 조사하지 않았다.
- 로컬 JDK와 Android SDK 환경 변수는 준비되지 않았다. P5는 EAS development build를 기준으로 진행하므로 차단 항목이 아니며, 로컬 Gradle 빌드가 실제로 필요해질 때만 설치한다.
- 기존 React Native `Modal` adapter가 접근성·스크롤·Android back 요구를 충족해 새 native bottom-sheet dependency는 추가하지 않았다.
- development build `f9ff3f21-45f2-4e1f-a682-06e3fe18d4c6`, fingerprint `2d19dc65c8fb455462b2960a2d8d4e08e7a19363`, APK SHA-256 `E58044F2994683F04282965FB756D58F296D8D38BD8B8F53F9FA091FF73E5955`에서 Phase 5 핵심 흐름을 확인했다.
- 최종 personal build `fa8d2cf2-478b-4b62-8afd-1302ab7721a9`는 위 보존 artifact와 같고, embedded bundle·non-debuggable·Metro/ADB reverse 독립 실행과 기존 데이터 보존을 확인했다.
- 해당 UI 변경에서는 schema, sync payload, 서버를 변경하지 않았다.

## Phase 6-1 환경 (2026-09-08)

- Expo `57.0.21`, Expo Router `57.0.20`, React Native `0.86.3`으로 호환 검사를 맞췄다. `react-native-calendars@1.1314.0`은 exact pin한 MIT 순수 JS 의존성이므로 P6-1용 새 native binary가 필수는 아니다.
- 공휴일 asset은 앱 실행 중 네트워크를 쓰지 않는다. 공식 API로 갱신할 때만 개발 셸에 `DATA_GO_KR_SERVICE_KEY`를 저장소 밖 환경변수로 두고 `npm run holidays:generate -- 2026 2027`처럼 필요한 연도를 명시한다. 키는 `.env`, JSON asset, 로그, 앱 bundle에 넣지 않는다.
- 현재 저장소 asset은 2026년만 지원한다. 지원 범위 밖에서도 달력과 로컬 기록은 정상 동작하며 공휴일 이름만 표시하지 않는다.
- ADB `37.0.1`과 SM-S721N 연결을 확인했다. 로컬 JDK/Android SDK는 계속 미설치이며 기존 development client+Metro와 EAS 빌드 흐름에는 차단 항목이 아니다.
- `npm audit --omit=dev`는 moderate 15건, high/critical 0건이다. 호환 계약을 깨는 강제 수정을 하지 않으며 기존 ADR-004 검토 원칙을 유지한다.

## P5 Visual v2 디자인 환경 (2026-09-13)

- Figma 계정 `이준혁의 팀`은 `Pro / Full`이고 파일 `Be9DsWkov1vg3ptUFPpj6F`의 읽기·쓰기와 local variable/component 조회가 된다. 추가 결제나 재연결은 필요하지 않다.
- Mobbin 전용 도구로 timespent `Creating a recurring plan`, Tiimo 완료 흐름, Equinox+ `Completed daily activities`의 실제 screenshot을 다시 조회했다. 만료되는 image URL이나 상용 앱 screenshot은 저장소에 복사하지 않는다.
- Claude 웹의 기존 `Quiet Routine UX 검수` Cowork는 완료 상태이고 세션 활동 패널에서 Figma connector 1개를 확인했다. 새 시각 검수자는 `.claude/agents/oos-visual-reviewer.md`로 읽기 전용 정의했고 Cowork 입력은 `design/CLAUDE_COWORK_REVIEW_PROMPT.md`에 고정했다.
- 사용자 로컬 `C:\Users\skljh\AppData\Local\OOSDesignTools`에 checksum을 확인한 Temurin `17.0.20+101`과 Maestro CLI `2.10.0`을 설치했다. 시스템 PATH는 바꾸지 않았고 user 환경과 `mobile/scripts/run-maestro.ps1`에서 analytics·AI 분석 알림을 비활성화한다. Java 경로는 runner 프로세스 안에서만 설정한다.
- 공식 [Maestro Windows 설치 문서](https://docs.maestro.dev/getting-started/installing-maestro/windows)는 Java 17 이상을 요구한다. `assertScreenshot`은 제공되지만 고정 match 수치를 제품 승인으로 사용하지 않고, 승인된 합성 데이터 환경의 drift 탐지에만 사용한다.
- 공식 [Expo EAS Maestro 예시](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)의 원격 job은 alpha·빌드 비용·GitHub 연결 경계가 있어 이번 로컬 준비 범위에는 추가하지 않았다.
- ADB `R5CY31QP08W`는 연결됐고 `com.oosops.app`이 설치돼 있다. 화면이 잠긴 상태라 개인 데이터 screenshot은 수집하지 않았다. 개인용 실기기에서 Maestro `clearState`를 실행하지 않는다.
- 디자인 gate는 `npm run design:status`로 읽고, `npm run design:gate -- --stage implementation`은 새 Figma와 사용자·Claude 승인이 기록되기 전 의도적으로 실패한다.
