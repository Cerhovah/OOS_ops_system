# Phase 4S Android personal standalone — 2026-09-05

## 판정

AC-36과 AC-39는 통과했다. AC-37의 전체 오프라인 조작·재시작 보존과 AC-38의 personal release 온라인 복귀 회귀는 진행 중이므로 Phase 4S 전체 완료로 판정하지 않는다.

## Artifact와 설치

- EAS project: `@ljh951206/oos-ops`
- Build profile/status: `personal` / `FINISHED`
- Build ID: `8deb4d4b-3747-4073-9f06-c7b9b2ed9f09`
- Source commit: `b15500cd1a0fa4fb63190641a26924694e6e992a`
- Package/version: `com.oosops.app`, `0.4.2`, versionCode `9`
- Device: Samsung `SM-S721N`, serial `R5CY31QP08W`
- Preserved file: `C:\Users\skljh\Downloads\OOS-Ops-0.4.2-build9-personal.apk`
- SHA-256: `569108C00792314451FF443D4563E66194FD1A07E6B1F0E73A27EC6BD3641253`
- Install: `adb install -r` succeeded. `firstInstallTime` stayed at 2026-08-23 and `lastUpdateTime` became 2026-09-05, confirming a replace without app-data clearing.

## PC·Metro 독립 증빙

- PC ports 8081 and 8082 had no listening process.
- `adb reverse --list` returned no mapping.
- Installed package flags do not include `DEBUGGABLE`; `run-as` returned `package not debuggable`.
- APK archive contains `assets/index.android.bundle`.
- After force-stop, Android launcher intent started `com.oosops.app`; logcat recorded `ReactNativeJS: Running "main"` and no `Failed to connect`, `Unable to load script`, `FATAL EXCEPTION`, or Metro error.
- The USB cable was used only to install and observe logs. No byte path from the app to the PC was configured, so it is not a runtime dependency.

## Server boundary

- Local records, plans, projects, settings, history, notifications, and exports use the on-device SQLite database.
- Login and sync call the public Supabase HTTPS endpoint with the publishable client key and the user's persisted PKCE session. RLS and the `apply_oos_sync_records` RPC enforce the owner boundary.
- AI calls the authenticated Supabase `ai-analysis` Edge Function. The function verifies the JWT and configured owner, then calls the OpenAI Responses API with a server-only key.
- Therefore standalone means no PC/USB/Metro dependency. It does not mean that cloud sync or AI works without internet or without the hosted Supabase/OpenAI services.

## Signing, distribution, and rollback

- EAS internal distribution produced an APK signed by the EAS-managed Android keystore; Android reports APK signing scheme v2. Preserve the Expo account, project, and Android credential because an update must use the same signing identity.
- The EAS artifact URL expires, but the preserved local APK and an already installed app do not expire.
- For rollback, check out a known-good commit, keep the same application ID and signing credential, raise `versionCode`, build again with the `personal` profile, and install it as an update. Do not force-install a lower version over a newer SQLite schema.
- JavaScript, assets, native dependencies, permissions, config plugins, Expo SDK, and embedded bundle are currently delivered together in the APK. Any change requires a new build. EAS Update has not been configured.

## Remaining device gate

- AC-37: with Wi-Fi and mobile data disabled, exercise local record/plan/project edits, local notification and export, force-stop/relaunch, and confirm persistence.
- AC-38: restore network, confirm the persisted login, manual/automatic sync and pending count, run one AI analysis, then confirm a simulated server failure does not block a new local record.
