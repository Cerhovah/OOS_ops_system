# Phase 4S Android personal standalone — 2026-09-05

## 판정

AC-36과 AC-39는 통과했다. AC-37의 전체 오프라인 조작·재시작 보존과 AC-38의 personal release 온라인 복귀 회귀는 진행 중이므로 Phase 4S 전체 완료로 판정하지 않는다.

## Artifact와 설치

- EAS project: `@ljh951206/oos-ops`
- Build profile/status: `personal` / `FINISHED`
- Build ID: `6eb9e668-8af4-4e87-9243-bcbaf2be9f0c`
- Source commit: `46c523ca732002e8a952f60c048282ce89343dde`
- Package/version: `com.oosops.app`, `0.4.3`, versionCode `10`
- Device: Samsung `SM-S721N`, serial `R5CY31QP08W`
- Preserved file: `C:\Users\skljh\Downloads\OOS-Ops-0.4.3-build10-personal.apk`
- SHA-256: `F3122C838F3F75146886CA15D856C7AD4FAB87EBEC73746048A197C081FB1B9F`
- Install: `adb install -r` succeeded. `firstInstallTime` stayed at 2026-08-23 and `lastUpdateTime` became 2026-09-05, confirming a replace without app-data clearing.

## PC·Metro 독립 증빙

- PC ports 8081 and 8082 had no listening process.
- `adb reverse --list` returned no mapping.
- Installed package flags do not include `DEBUGGABLE`; `run-as` returned `package not debuggable`.
- APK archive contains `assets/index.android.bundle`.
- After force-stop, Android launcher intent started `com.oosops.app`; logcat recorded `ReactNativeJS: Running "main"` and no `Failed to connect`, `Unable to load script`, `FATAL EXCEPTION`, or Metro error.
- The USB cable was used only to install and observe logs. No byte path from the app to the PC was configured, so it is not a runtime dependency.

## Offline and online-return observations

- With Wi-Fi disabled and mobile data set to 0, the Today, Week, Projects, Plan, and Analysis routes rendered local data and scheduled Android alarms remained registered.
- A one-minute local record was saved offline. After force-stop and launcher restart, the Today view still showed `1h 30m → 1m` and the item showed `1m`.
- Online return of build 9 exposed `analysis_sessions 원격 행에 필요한 열이 없습니다.` because pre-v6 remote JSON lacks five newly nullable audit fields. Commit `46c523c` limits backward filling to those fields and still rejects missing required fields; 36 files/223 tests and the full gate passed.
- Build 10 retained the login session and automatically cleared the existing sync queue from 10 to 0 without the compatibility error.

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
