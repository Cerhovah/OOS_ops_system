# ENVIRONMENT

## 고정 도구

- Node.js: 24.19.0 LTS (`.nvmrc`)
- npm: 11.17.0
- 패키지 관리자: npm만 사용
- Expo CLI: 전역 설치 금지, `npx expo` 사용
- 앱 경로: `mobile/`
- 소스 줄바꿈: LF (`.gitattributes`)
- Android 개발 빌드: EAS Cloud development build 우선

## Windows 10/11 x64

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
npx eas-cli@latest login
npx eas-cli@latest whoami
set EAS_NO_VCS=1
npx eas-cli@latest build --platform android --profile development --non-interactive --wait
set EAS_NO_VCS=
```

현재 Windows 저장소 경로의 대괄호 때문에 기본 EAS 로컬 git archive가 실패하므로 이 경로에서만 `EAS_NO_VCS=1`을 사용한다. 대괄호 없는 경로에서는 먼저 기본 명령을 사용한다. PowerShell에서는 build 전 `$env:EAS_NO_VCS = '1'`, build 후 `Remove-Item Env:EAS_NO_VCS`로 같은 범위를 적용한다.

현재 연결된 프로젝트는 `@ljh951206/oos-ops`, project ID는 `a0b6c215-c87a-40ff-b749-b715d1ed9352`다. SM-S721N에서 검증한 최신 네이티브 개발 클라이언트는 매직링크 callback 기준 `0.2.0(3)` build `154087e2-b93d-451a-b62c-ba6e988f4592`다. 현재 JavaScript 소스 `0.3.2(6)`은 이 클라이언트에 이미 포함된 네이티브 모듈 범위에서 Metro로 검증한다. 새 native dependency·권한·config plugin을 추가하면 새 development build가 필요하다. 비용·계정 플랜·자격증명 선택이 나타나면 임의로 진행하지 않는다.

## Phase 2 Supabase 개발 환경

EAS development 환경의 공개 URL/publishable key를 ignore된 로컬 파일로 가져온다. 값은 터미널·문서에 출력하지 않는다.

```bat
cd mobile
npx eas-cli@latest env:pull development --non-interactive --path .env.local
```

원격 migration은 Supabase CLI 로그인 뒤 저장소 루트에서 적용한다. `supabase login`만 사용자가 완료하면 이후 init/link/push는 에이전트가 실행한다. database password, service-role key, secret key는 앱이나 저장소에 넣지 않는다.

```bat
npx supabase@latest login
```

Phase 2 인증은 Supabase Free 기본 메일의 매직링크를 사용한다. `supabase/config.toml`의 hosted Auth mirror를 유지한 채 `oosops://auth/callback`만 추가 리디렉션으로 배포한다. 커스텀 스킴이 네이티브 설정이므로 callback 변경 뒤에는 development build를 새로 생성한다.

OTP 구현 build `1ead311c-9397-4f53-8893-36193025ab02`는 과거 이력이며, 매직링크 전환 뒤에는 `0.2.0(3)` build `154087e2-b93d-451a-b62c-ba6e988f4592`를 기준으로 한다. 로컬 APK 파일 경로는 기기별 정보이므로 재현 기준으로 사용하지 않고 EAS build ID와 `docs/evidence/phase-2-readiness-2026-09-02.md`의 해시를 사용한다.

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

`verify`는 TypeScript, ESLint, 단위테스트·커버리지, Expo 의존성 검사, 잠금 파일에 고정한 `expo-doctor`, Android Hermes 번들 생성을 실행한다. Expo 의존성 메타데이터 확인에는 네트워크가 필요하다. 결과는 `docs/TESTPLAN.md`에 기록한다.

## 현재 검증된 프리플라이트

2026-09-02 Windows 환경에서 다음 버전을 직접 확인했다.

```text
git version 2.50.0.windows.2
node v24.19.0
npm 11.17.0
```

PowerShell에서 `npm.ps1`이 실행 정책으로 차단될 때는 정책을 바꾸지 말고 VS Code 프로젝트 기본 터미널인 Command Prompt를 사용한다.

Windows 긴 경로는 OS에서 `LongPathsEnabled=1`, 이 저장소의 로컬 Git 설정에서 `core.longpaths=true`로 확인했다. 현재 의존성·Metro·자동 게이트의 복구 결과는 `docs/evidence/phase-1-recovery-2026-09-02.md`를 참조한다.
