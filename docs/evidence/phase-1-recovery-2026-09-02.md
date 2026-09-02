# Phase 1 개발 환경 복구 증빙 — 2026-09-02

## 복구 전 상태

- Git: `main` / `ced67ac` (`v0.1-phase1`), 원격 `origin/main`과 동일한 커밋
- 중단 지점: Q-003 Android development APK 설치와 TP-AC-01~TP-AC-17 실기기 검증
- 로컬 도구: Git 2.50.0.windows.2, Node v24.19.0, npm 11.17.0
- 기존 EAS build: `67a46042-d559-42ee-a321-dd6db1101431`, `FINISHED`, 2026-09-03 만료 예정

## 수행한 복구

1. `npm ci`로 `mobile/package-lock.json`을 재현했다.
2. 첫 `npm run verify`에서 TypeScript, ESLint, 21개 테스트와 커버리지는 통과했으나 `expo install --check`가 SDK 57 패치 의존성 18개를 오래된 버전으로 판정했다.
3. Expo 공식 절차인 `npx expo install --fix`로 SDK 57 범위 안에서 패치 의존성을 정렬했다. `expo-image` config plugin도 공식 명령이 `mobile/app.json`에 추가했다.
4. 저장소 로컬 Git 설정 `core.longpaths=true`를 적용했다. Windows `LongPathsEnabled=1`도 확인했다.
5. Metro development server를 CI 모드로 기동하고 `http://127.0.0.1:8081/status`의 HTTP 200과 `packager-status:running` 응답을 확인한 뒤 종료했다.
6. 기존 APK를 만료 전에 다음 로컬 파일로 보존했다.
   - 파일: `C:\Users\skljh\Downloads\OOS-Ops-0.1.0-development-67a46042.apk`
   - 크기: 262,986,683 bytes
   - SHA-256: `E09385094DDE7FA8F860615D3BA0E119DC4ED332135D409A81DB6ECAE1191BE0`
7. 네이티브 라이브러리와 `app.json`이 바뀌었으므로 현재 소스용 새 EAS Android development build를 제출했다.
   - Build ID: `5448b354-f54f-4d17-b657-36f8b97afa48`
   - Build page: <https://expo.dev/accounts/ljh951206/projects/oos-ops/builds/5448b354-f54f-4d17-b657-36f8b97afa48>
   - 상태: `FINISHED`
   - fingerprint: `0668842a14ccfdacce6088a43baa0fc190bdea90`
   - 완료 시각: 2026-09-02 03:51:02 KST
   - 만료 예정: 2026-09-16 03:24:16 KST
8. 새 APK도 만료와 무관하게 설치할 수 있도록 로컬에 보존했다.
   - 파일: `C:\Users\skljh\Downloads\OOS-Ops-0.1.0-development-5448b354.apk`
   - 크기: 263,084,991 bytes
   - SHA-256: `311A16C583BE5988891EBFE8BFF5A11E7867F2E4BEE872F9EF7EEFDE9520CF19`

## 복구 후 자동 게이트

```bat
cd mobile
npm run verify
```

종료 코드: `0`

SDK 57 패치와 잠금 파일 갱신 뒤 `npm ci && npm run verify`를 다시 실행해 같은 결과와 종료 코드 0을 재현했다.

| 단계 | 결과 |
|---|---|
| `tsc --noEmit` | 오류 0 |
| `expo lint --max-warnings=0` | 경고·오류 0 |
| `vitest run --coverage` | 3 files, 21 tests 통과 |
| 도메인 커버리지 | statements 99.05%, branches 92.85%, functions 100%, lines 100% |
| `expo install --check` | `Dependencies are up to date` |
| `expo-doctor .` | 21/21 checks passed |
| Android Hermes bundle | 1,374 modules, HBC 생성 성공 |

정적 구현 감사 4건을 보완한 뒤 같은 게이트를 다시 실행했다.

- 항목과 같은 삭제 시각의 일정 복구
- 7개 주 시작 요일 설정과 주간 범위 적용
- KPI 값 기록 수정·소프트 삭제·복구
- 오늘 종료 상태를 보존한 알림 재예약

재검증 종료 코드도 `0`이며 3 files/22 tests, statements 99.07%, branches 93.33%, functions 100%, lines 100%, Expo Doctor 21/21, Android 1,374 modules 번들 성공이다.

번들:

- 파일: `dist/_expo/static/js/android/entry-707ebdd8f25ca9ec3d67117dd672912b.hbc`
- 크기: 3,127,350 bytes
- SHA-256: `5FD75C0395B864CB1E3A6A5E2F6604E82C04519CA967A589A1BFCA9DF275C617`

정적 감사 보완 후 번들:

- 파일: `dist/_expo/static/js/android/entry-72b38a4a4b3bd1b279a35319697c9c4d.hbc`
- 크기: 3,135,591 bytes
- SHA-256: `D85FB7380D0C66683BBEEC325D82B5A8B849D1A5C9A09802C127B97BEB6937A3`

## 보안·외부 환경 검토

- `npm audit --omit=dev`: 15 moderate. `decode-uri-component`는 `expo-router -> query-string`, `uuid`는 Expo/Xcode config 도구 경로다. 자동 강제 수정은 SDK 57 호환 버전 대신 `expo-router@5.1.11`, `expo-sharing@14.0.8`을 제안하므로 실행하지 않았다. ADR-004 재검토 기록을 따른다.
- npm 11은 `unrs-resolver@1.12.2`의 선택적 postinstall 승인을 대기 상태로 표시했다. 이 패키지는 ESLint TypeScript resolver의 개발 의존성이며 postinstall 없이 lint와 전체 게이트가 통과했다. 불필요한 스크립트 권한은 추가하지 않았다.
- EAS 로그인은 `ljh951206`으로 유지되어 있다.
- EAS의 `development` 환경에 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 이름이 이미 등록되어 있었다. 값은 조회·기록하지 않았고 Phase 1 소스에는 해당 변수나 Supabase 클라이언트 참조가 없다. 삭제 여부는 Q-004에서 사용자 결정 전까지 보류한다.
- 새 APK 원본 바이트와 `assets/app.config`에서도 `EXPO_PUBLIC_SUPABASE`/`supabase` 문자열이 검출되지 않았다.

## 설치 기기와 남은 게이트

- 사용자 보고: 기존 OOS Ops에 version 0.1.0을 업데이트 설치
- 모델: `SM-S721N`(Samsung 공식 모델명 Galaxy S24 FE)
- Android 버전: 기기 설정에서 확인 대기
- Metro 개발 서버: `172.30.1.12:8081`에서 실행 중, 기기 연결 대기
- TP-AC-01~TP-AC-17 수동 검증
- 사용자 기기에서 하루치 실제 기록
