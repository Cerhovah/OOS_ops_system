# Phase 1 자동 게이트 증빙

- 실행일: 2026-08-20
- 환경: Windows, Node v24.19.0, npm 11.17.0, git 2.50.0.windows.2
- 앱: OOS Ops 0.1.0, Expo SDK 57, React Native 0.86.2

## 최종 단일 게이트

```bat
cd mobile
npm run verify
```

종료 코드: `0`

`verify` 실행 순서와 결과:

| 단계 | 결과 |
|---|---|
| `tsc --noEmit` | 오류 0 |
| `expo lint --max-warnings=0` | 경고·오류 0 |
| `vitest run --coverage` | 3 files, 21 tests 통과 |
| `expo install --check` | `Dependencies are up to date` |
| `expo-doctor .` | 21/21 checks passed, issues 0 |
| `expo export --platform android` | 1,367 modules, Android HBC 생성 성공 |

## 도메인 커버리지

```text
Statements : 99.05% (105/106)
Branches   : 92.85% (65/70)
Functions  : 100% (36/36)
Lines      : 100% (81/81)
```

테스트 파일:

- `mobile/src/domain/calculations.test.ts`: §6 계산, 주/날짜/자정 타이머/168h/요일/남은 시간/KPI
- `mobile/src/domain/export.test.ts`: CSV escaping·BOM, 전체 JSON 삭제 행/버전 보존
- `mobile/src/data/migrations.test.ts`: §4.4 14계정·168h·항목·프로젝트·일정 시드 manifest

## Android 번들

```text
파일: dist/_expo/static/js/android/entry-fba58a1b534d64e687406f6445192852.hbc
크기: 약 3.1 MB
SHA-256: 968D0BFEC21C9420C57654521AEC4FC61CC3824E97A2A31C5AD7DFAFF3A79F7E
```

`dist/`는 재생성 가능한 검증 산출물이므로 Git에서 제외한다.

## 정적 감사

`mobile/src`에서 게임화·사람 서술 금지어, `any`, `eslint-disable`, `ts-ignore`, `TODO/FIXME`를 검색했다. 허용된 사실 문구와 시드 KPI `모의점수` 외 위반은 없었다. TypeScript strict와 ESLint 게이트를 약화하는 예외는 없다.

## npm 보안 감사

```bat
npm audit --omit=dev
```

결과: 17건(9 moderate, 8 high). 보고된 직접 경로는 Metro의 `image-size` 파서와 Xcode 구성의 `uuid`이며, npm의 자동 해결 제안은 Expo 57을 Expo 53으로 낮추는 `--force` breaking change다. 앱 런타임에 외부 파일을 해당 빌드 파서로 전달하는 경로가 없고 `expo-doctor`와 SDK 호환 검사가 모두 통과하므로 강제 수정하지 않았다. 판단과 재검토 조건은 `docs/DECISIONS.md` ADR-004에 기록했다.

## 남은 증빙

자동 게이트는 완료됐다. EAS development APK 설치, 알림/딥링크, 파일 공유, 비행기 모드, 탭 수와 하루치 기록은 Android 실기기에서 `docs/TESTPLAN.md` TP-AC-01~TP-AC-17로 검증해야 한다.

## EAS Cloud Android development build

- 로그인 확인: `npx eas-cli@latest whoami` → `ljh951206`
- EAS 프로젝트: `@ljh951206/oos-ops`
- Project ID: `a0b6c215-c87a-40ff-b749-b715d1ed9352`
- Build ID: `67a46042-d559-42ee-a321-dd6db1101431`
- 상태: `FINISHED`
- 프로필/배포: `development` / `INTERNAL`
- SDK/앱: Expo SDK 57 / OOS Ops 0.1.0 (1)
- Android application ID: `com.oosops.app`
- Fingerprint: `2e6de0193b97df2bfb6e86b56e22ad84be378426`
- 완료 시각: 2026-08-20 13:03:28 UTC
- 아티팩트 만료: 2026-09-03 12:39:13 UTC
- Build page: <https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/67a46042-d559-42ee-a321-dd6db1101431>
- APK: <https://expo.dev/artifacts/eas/Fc5KzqwHDsT9j7BrIewK7b4klAj--XaxV9KgbVqOqbc.apk>

첫 제출은 Windows 체크아웃 경로의 대괄호를 EAS CLI 기본 로컬 git URL이 처리하지 못해 archive 단계에서 종료 코드 128로 중단됐다. 앱 build 오류는 아니었다. Expo의 `EAS_NO_VCS=1` 아카이브 방식을 적용한 재제출은 Cloud worker에서 완료됐다. 실제 APK 설치와 TP-AC-01~TP-AC-17은 Q-003 이후 기록한다.
