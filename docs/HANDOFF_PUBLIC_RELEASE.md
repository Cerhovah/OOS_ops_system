# OOS Ops 개인용 기준선 동결·공개판 전환 인수인계

- 기준일: 2026-09-15 (Asia/Seoul)
- 문서 성격: 배포 운영 계획과 인수인계. 제품 동작은 `SPEC.md`가 우선하며, 이 문서만으로 공개 기능·서버 계약을 승인하지 않는다.
- 현재 브랜치: `main` 기준선 위 문서 정리 브랜치
- 현재 상태: 개인용 source/APK와 현재 실사용 DB raw snapshot까지 동결·복원 검증을 마쳤다. 공개판은 새 비공개 GitHub 저장소의 별도 애플리케이션으로 진행하는 것이 승인됐다.

## 1. 동결 기준선

| 대상 | 동결 값 | 상태 |
|---|---|---|
| 기능 source | `7194acea579018f2af93752864148f2aad9813de` | 검증 완료 |
| 자격증명 ignore 포함 source | `2f9ef1044ff5ea4a41d25ebaf70f021fe0e573c6` | 검증 완료 |
| 검증 문서 기준 | `37724ffacb58adf1844d0f220282e6b19fe2826e` | 원격 브랜치와 일치 |
| 앱 | `com.oosops.app`, `0.7.0(15)`, SQLite v7 | personal standalone |
| APK | `C:\Users\skljh\Downloads\OOS-Ops-0.7.0-build15-personal.apk` | 123,410,290 bytes |
| APK SHA-256 | `E214F39E6532B4BFED36FBEE51CB35BD96A23CB0E09C43683008BFA5CC3AFC6A` | 실제 파일 재확인 |
| signer certificate SHA-256 | `DBAE45735905DA3432CF9BC3F43AEFA56E66C673A47DD45E39C6F01C39E19716` | APK v2 서명 |
| local keystore SHA-256 | `635FEC490F66236790F84EF308C7501149DB18F542CBC309D0769BE39066DE40` | Git ignore 확인; 파일·비밀번호 업로드 금지 |
| 설치 전 raw DB backup ZIP | `C:\Users\skljh\Downloads\OOS-Ops-user-data-backup-before-0.7.0-20260913-232414-raw.zip` | v0.6.0(14) → v0.7.0 이전 상태 |
| backup ZIP SHA-256 | `72824341A8AF712F1865956ABFA53838DF00386566772C52229F81DD92AF8E31` | 내부 DB/WAL/SHM 해시 일치 |
| 현재 실사용 raw DB backup ZIP | `C:\Users\skljh\Downloads\OOS-Ops-user-data-backup-0.7.0-build15-20260915-095331-raw.zip` | post-v0.7 실사용 상태 |
| 현재 backup ZIP SHA-256 | `0D9979E442232433AA5D0A8D07974F35F8B9659FE0D8800370102D618587F748` | DB/WAL/SHM 기기·로컬 해시 일치 |

동결 태그는 `personal-v0.7.0-build15`를 사용한다. APK는 GitHub의 일반 Git blob에 넣지 않는다. 100MB를 넘고 개인용 환경을 포함할 수 있기 때문이다. raw DB와 자격증명은 개인 데이터·비밀이므로 GitHub Release에도 업로드하지 않는다.

### 현재 실사용 동결 완료

2026-09-15 SM-S721N에서 동일 applicationId·versionCode·signer의 실행하지 않은 helper로 DB/WAL/SHM을 raw 추출했다. 세 파일의 기기·로컬 크기와 SHA-256이 일치했고 `PRAGMA quick_check=ok`, SQLite v7, active profile `profile-practice`, 핵심 행 감소 없음을 확인했다. 정확한 personal APK를 `adb install -r`로 복원한 뒤 APK 해시, non-debuggable, 최초 설치일, cold start와 오류 0건을 다시 확인했다. helper와 임시 자격증명 사본은 삭제했다.

Android Keystore 기반 SecureStore 세션과 예약 알림은 bit-for-bit snapshot 대상이 아니다. raw snapshot과 ZIP은 암호화되지 않은 개인 데이터이므로 GitHub, EAS, Figma, Claude 또는 공개 저장소로 전송하지 않는다.

## 2. 로컬 Android 빌드 정리

2026-09-14 Downloads에서 확인한 APK는 다음과 같다. 파일 삭제는 최신 실사용 DB snapshot이 끝난 뒤 별도 확인을 거친다.

| 파일 | 분류 | 정리 상태 |
|---|---|---|
| `OOS-Ops-0.1.0-development-67a46042.apk` | 초기 development | 역사 archive 후보 |
| `OOS-Ops-0.1.0-development-5448b354.apk` | 초기 development | 역사 archive 후보 |
| `OOS-Ops-0.2.0-dev-1ead311c.apk` | OTP development | 역사 archive 후보 |
| `OOS-Ops-0.2.0-magic-link-dev-154087e2.apk` | Auth development | 역사 archive 후보 |
| `OOS-Ops-0.4.1-build8.apk` | Phase 4R development | 역사 archive 후보 |
| `OOS-Ops-0.4.2-build9-personal.apk` | personal | 역사 archive 후보 |
| `OOS-Ops-0.4.3-build10-personal.apk` | personal | 역사 archive 후보 |
| `OOS-Ops-0.5.0-build11-development.apk` | development/backup | 역사 archive 후보 |
| `OOS-Ops-0.5.0-build11-personal-final.apk` | personal | 역사 archive 후보 |
| `OOS-Ops-0.6.0-build12-development-backup-helper.apk` | backup helper | 역사 archive 후보 |
| `OOS-Ops-0.6.0-build12-personal.apk` | personal | 역사 archive 후보 |
| `OOS-Ops-0.6.0-build13-personal.apk` | P5 Visual v2 | 역사 archive 후보 |
| `OOS-Ops-0.6.0-build14-development.apk` | v3 backup helper | 직전 schema 기준 보존 |
| `OOS-Ops-0.6.0-build14-personal.apk` | v3 personal | 직전 정상판 보존 |
| `OOS-Ops-0.7.0-build15-personal.apk` | 현재 personal | 필수 보존 |

권장 보존 세트는 현재 v15 APK, 직전 v14 personal APK, 현재 실사용 raw DB/WAL/SHM+ZIP, 설치 전 v14 backup, EAS/로컬 서명 자격증명의 암호화된 오프라인 복사본, 이 문서와 Git tag다. 낮은 versionCode APK는 전진 migration 뒤 직접 downgrade 복구에 쓰지 않는다.

## 3. 5분 최소 충돌 감사

검증 명령·실제 결과·미확인 항목은 `TESTPLAN.md`의 `공개판 인수인계 최소 감사 — 2026-09-14`에만 기록한다. 이번 감사 범위는 핵심 데이터·타이머·Today/Records·Supabase 계약과 문서 정합성이며, 기능 코드·migration·native dependency·Supabase 원격 상태는 변경하지 않는다.

## 4. 공개판에서 먼저 결정할 경계

### D1. 개인판과 공개판의 applicationId

**2026-09-15 사용자 승인: 개인판과 공개판을 분리한다.** 현재 `com.oosops.app`은 그대로 보존하고 공개판은 새 비공개 GitHub 저장소 [Cerhovah/harugochim](https://github.com/Cerhovah/harugochim)의 `com.cerhovah.harugochim`을 applicationId 후보로 사용한다. 문법·현재 연결 기기·공개 검색 충돌은 없었지만 전역 유일성은 Play Console 앱 생성이 성공할 때 확정하며, 첫 AAB 전까지만 변경할 수 있다.

- 장점: 현재 개인 데이터와 앱을 그대로 유지하면서 두 앱을 동시에 설치할 수 있다. 개인용 Supabase·seed·서명 실험이 공개 사용자에게 섞이지 않는다.
- 비용: 공개판은 빈 데이터로 시작하며 별도 앱 링크·Supabase redirect·Play 등록·EAS 환경이 필요하다.

같은 `com.oosops.app`으로 공개하면 Play 앱이 현재 sideload 설치본을 업데이트하며 두 앱을 함께 둘 수 없다. 이 경우 Play App Signing 설정에서 Google 생성 키를 기본 선택하지 말고 기존 EAS signing key를 app signing key로 제공해야 기존 설치 위 업데이트 가능성을 유지할 수 있다. 첫 AAB 전에 이 결정을 끝낸다.

### D2. 첫 공개 범위

권장 공개 순서는 다음과 같다.

1. `Public alpha`: 로그인 없이 Today·기록·프로필·계정/항목·계획·지표·내보내기가 동작하는 local-first 핵심
2. `Public beta`: P6 server-first profile/sync 계약과 계정 삭제를 통과한 선택적 로그인·백업
3. `AI beta`: 단일 소유자 제한을 제거하고 사용자별 quota·비용 상한·동의·개인정보 문구를 갖춘 AI 분석

초기 공개판은 1단계 local-first 범위로 확정한다. 로그인·동기화는 현재 공개 범위가 아니며, P6 server-first 계약과 사용자 승인 전에 새 공개 앱에 연결하지 않는다.

기존 기능 코드는 보존하되 공개 환경에서 준비되지 않은 sync/AI를 조용히 실패시키거나 개인 owner 설정으로 노출하지 않는다. 공개 v1에 sync를 약속하려면 `profiles`, `profile_id`, `weekly_target_minutes`, active profile을 포함하는 P6 서버 migration→RLS/RPC→구버전 client 호환→새 client 순서를 먼저 사용자에게 보고하고 승인받는다.

### D3. 공개 기본 데이터

현재 새 DB에 들어가는 `연습용 프로필`의 편입·코디세이·사업·수익화 항목은 개인 설정이다. 공개 clean install에는 빈 온보딩 또는 명확히 합성된 예시만 제공해야 한다. 기존 사용자의 행을 수정·삭제하지 않고 clean-install seed 경계로 분리한다.

### D4. 공개 앱 기본 배포 정보

- 앱 이름: `하루고침`
- 지원 이메일: `ljh951206@gmail.com`
- 초기 배포 국가: 대한민국
- 미국 등 추가 국가: 스토어 문구·법적 요건·지원 범위를 재검토한 뒤 별도 확장
- 초기 인증·동기화: 미제공

### D5. 인증과 계정 삭제

- 저장소 `supabase/config.toml`은 신규 가입 차단이지만 hosted 상태는 독립적이다. 공개 가입 정책을 확정하고 원격 상태를 다시 읽는다.
- 이메일 magic link를 공개하려면 custom SMTP와 발신 도메인이 필요하다. Supabase 기본 SMTP는 production 용도가 아니다.
- `oosops://` custom scheme은 공개 인증 callback 가로채기 방어가 약하다. 소유 도메인의 Android App Link와 fallback을 설계한다.
- 앱에서 계정을 만들 수 있으면 앱 안의 계정 삭제와 앱 밖에서 접근 가능한 삭제 요청 URL을 모두 제공한다. 원격 데이터 삭제·보존 예외·완료 통지 계약도 함께 만든다.

### D6. AI 공개 경계

현재 `ai-analysis`는 `OOS_OWNER_USER_ID` 한 명만 허용한다. 그대로 공개하면 일반 사용자는 사용할 수 없다. 공개 AI를 승인할 때는 인증 사용자별 권한, request/range 한도, 사용자별 비용 quota, abuse 방어, 장애 시 로컬 기록 비영향, 삭제·보존 정책을 server-first로 만든다. OpenAI API 결제는 ChatGPT 구독과 별도다.

### D7. 개인정보와 관측

- privacy policy를 앱 내부와 Play listing 모두에서 열 수 있는 실제 HTTPS URL로 제공한다.
- Play Data safety에는 Supabase 동기화, 인증 이메일, AI 요청·응답, 포함 SDK가 기기 밖으로 보내는 데이터를 실제 동작과 일치하게 신고한다.
- 원격 행동 telemetry는 추가하지 않는다. 초기 운영은 Google Play Android Vitals, Supabase/Auth/Edge Function 운영 로그와 사용자 제보를 사용한다. 추가 crash SDK는 별도 개인정보·동의 검토 뒤 승인한다.

## 5. 권장 환경 구성

| 영역 | personal/개발 | 공개 production 권장 |
|---|---|---|
| Git | 현재 feature branch | main 병합 후 `codex/public-release` |
| EAS | 현재 project의 development/personal APK | production environment + AAB profile; preview와 분리 |
| Android ID | `com.oosops.app` | 새 applicationId 권장; 같은 ID면 기존 key를 Play app-signing key로 등록 |
| Supabase | 현재 개인 데이터가 있는 프로젝트 | 별도 production project, schema만 migration하고 개인 데이터는 복사하지 않음 |
| Auth | owner 중심 magic link | 공개 가입 정책, custom SMTP, verified App Link, CAPTCHA/rate limit 검토 |
| Secrets | ignore된 local/EAS/Edge secrets | publishable key만 앱; secret/OpenAI key는 Edge Function에만 |
| CI | PR/main 전체 verify | production AAB 전 verify + clean migration/RLS + release manifest |
| 배포 | internal APK | Play internal/closed track AAB → production |
| 관측 | ADB/로컬 로그 | Play Vitals + Supabase 운영 로그; 행동 telemetry 없음 |

현재 Node `24.19.0`, npm `11.17.0`, Expo SDK 57, target SDK 36, EAS project와 local production signing material은 준비돼 있다. `mobile/eas.json`에는 아직 production AAB·submit profile이 없다.

현재 personal APK는 embedded bundle과 SQLite로 로컬 기능을 수행하며 `expo-updates`를 사용하지 않아 설치본에 고정 만료일이 없다. Expo·Supabase·OpenAI 상태는 재빌드, 로그인·동기화, AI에만 영향을 준다. 실제 계정·artifact 조회 결과는 `TESTPLAN.md`에 남긴다.

## 6. 연결·MCP 상태

2026-09-14 실제 읽기 호출 결과 Figma, Mobbin, Supabase 연결은 정상이다. 앱 runtime이나 Play 배포에는 셋 모두 필요하지 않다.

| 연결 | 용도 | 공개판 필수 여부 |
|---|---|---|
| Figma | 화면 source·검수 | 선택; 디자인 변경 때만 사용 |
| Mobbin | 상용 흐름 reference | 선택; 구독이 끊겨도 앱 동작 무관 |
| Supabase MCP/CLI | schema·RLS·advisor·function 관리 | 도구는 선택, production Supabase 자체는 sync/AI 공개 시 필요 |
| Expo MCP | EAS 관리 자동화 | 불필요; 현재 EAS CLI로 충분 |
| Google Play service account | EAS Submit 자동화 | 선택; 첫 제출은 Play Console 수동 업로드 권장 |
| SMTP provider | 공개 magic-link 이메일 | 공개 Auth를 켜면 사실상 필수 |

MCP를 앱 dependency에 넣거나 개인 데이터·secret을 디자인 도구로 보내지 않는다.

## 7. 비용·구독 판단 (2026-09-15 확인)

| 항목 | 최소 | 권장 시점 |
|---|---|---|
| Google Play Console | US$25 일회 등록비 | Android 공개에 필수 |
| Expo EAS | 현재 Free: Android 월 15 builds, 낮은 우선순위 | 큐·빌드 한도가 실제 장애일 때만 Starter US$19/월 |
| Supabase | 현재 Free, OOS project `ACTIVE_HEALTHY` | 실제 공개 동기화 사용자와 복구 책임을 지면 Pro US$25/월부터 권장 |
| SMTP | 제공자별 무료/유료 | 공개 이메일 Auth 전에 발신 도메인과 함께 구성 |
| 도메인/정적 웹 | 기존 도메인 또는 무료 hosting 가능 | privacy/delete/support/App Link를 한 도메인으로 운영하면 편함 |
| OpenAI API | 사용량 과금, ChatGPT와 별도 | AI 공개 승인 뒤 billing·프로젝트 예산을 설정 |
| Figma/Mobbin | 이미 연결된 개발 도구 | 공개 runtime 비용 아님; 디자인 작업 종료 뒤 선택 유지 |

가격·quota·정책은 결제와 제출 직전에 공식 페이지에서 다시 확인한다.

OOS personal의 운영 재검토 시점은 고정 종료일이 아니라 유지보수 경계다. 2026년 말 전 AI Edge Function의 legacy Supabase key를 교체하고, 2027년 6월 전후 Expo SDK 57 상향 필요성을 다시 판단한다. 설치된 로컬 앱의 사용은 이 시점들에 자동 종료되지 않는다.

## 8. Google Play 공개 절차

1. 사용자: 개인/조직 Play 개발자 계정 유형 결정, 신원 확인, US$25 등록비 결제
2. 사용자+설계자: 공개 앱명, applicationId, 국가, 대상 연령, 무료/유료, 지원 이메일, 도메인 확정
3. 설계자: SPEC에 공개 범위·데이터·sync/AI·삭제 계약 반영 후 승인
4. 개발자: 별도 production Supabase/EAS 환경, 공개 seed, Auth/App Link, account deletion, privacy 화면 구현
5. 개발자: `production` AAB profile과 release manifest 추가; native/dependency/schema 변경에 맞는 전체 verify
6. 검수: clean install, upgrade 경계, offline-first, auth/sync/AI 실패 격리, 삭제/export, 권한, 큰 글씨/dark mode, Android 16 실기기 확인
7. 사용자: Play listing, Data safety, content rating, app access, privacy/delete URL 제출
8. 개발자: 첫 AAB는 수동으로 internal testing track에 올리고 Play App Signing certificate와 package를 대조
9. 사용자+테스터: 계정 조건에 따라 closed testing 수행. 2023-11-13 이후 생성한 개인 개발자 계정에는 현재 외부 정책상 최소 12명이 14일 연속 opt-in하는 요구가 있다. 이는 제품 내부 완료 수치가 아니라 Google Play 계정 조건이다.
10. 사용자 승인 뒤 production rollout. 공개·과금·서버 migration은 자동 진행하지 않는다.

현재 target SDK 36은 2026-08-31 이후 Play의 일반 모바일 새 앱/API 요구를 충족한다. 새 Play 앱은 AAB와 Play App Signing이 필요하다.

## 9. 역할 분담

### 사용자가 반드시 맡을 최소 역할

- 휴대폰 재연결·USB 디버깅 허용으로 최신 실사용 DB snapshot 완료
- 개인판/공개판 applicationId 분리 여부 승인
- Play 계정 유형·신원·등록비와 필요 시 테스터 모집
- 공개 앱명·지원 이메일·국가·연령·수익화 여부 승인
- 도메인·SMTP·Supabase/OpenAI 유료 전환과 예산 승인
- privacy policy의 사업자/연락처·보존 기간·국외 처리 등 법적 사실 확인
- Play Console의 Data safety/콘텐츠 선언과 최종 production 공개 승인

### 에이전트가 자율 처리할 영역

- source/tag/release manifest, 오래된 문서 정합성, build inventory
- 공개 package flavor, clean-install seed, production EAS profile
- 승인 뒤 Supabase migration/RLS/RPC/Edge Function과 계약 테스트
- privacy/delete 정적 페이지와 앱 내 진입점의 기술 구현
- AAB 생성, 서명·target SDK·manifest 검사, 내부/비공개 track 후보 검증
- 실제 결과를 `TESTPLAN.md`, 기술 결정을 `DECISIONS.md`, 사용자 의미를 `CHANGELOG.md`에 기록

### 멈추고 사용자에게 보고할 경계

- Play/Supabase/Expo/SMTP/OpenAI의 신규 결제
- 새 production project·도메인·공개 리소스 생성
- P6 sync 계약과 remote migration 배포
- app signing key 선택·업로드
- 개인 데이터 이동·삭제, 공개 제출과 rollout

## 10. 다음 작업 인수인계 프롬프트

> `personal-v0.7.0-build15`과 `docs/HANDOFF_PUBLIC_RELEASE.md`를 기준으로 시작한다. 먼저 ADB 재연결 뒤 현재 실사용 DB/WAL/SHM을 데이터 보존 절차로 동결하고 personal APK를 복구한다. 그 다음 사용자가 승인한 applicationId와 공개 v1 범위를 SPEC에 반영한다. 현재 개인 Supabase 프로젝트와 데이터를 건드리지 말고 별도 production 환경을 설계한다. 공개 sync가 포함되면 P6 server-first migration/RLS/RPC/구버전 client 배포 순서를 먼저 보고하고 승인받는다. 공개 AI가 포함되면 `OOS_OWNER_USER_ID`를 제거하기 전에 사용자별 권한·quota·비용·삭제·개인정보 계약을 승인받는다. production AAB, Play App Signing, privacy/delete URL, Data safety, custom SMTP가 준비되기 전 production 제출을 하지 않는다. 최소 검증 원칙을 적용하고 공개·과금·원격 migration 경계에서 멈춘다.`

## 11. 공식 확인 링크

- Google Play 계정·등록비: <https://support.google.com/googleplay/android-developer/answer/6112435>
- 개인 계정 testing 조건: <https://support.google.com/googleplay/android-developer/answer/14151465>
- 2026 target API: <https://developer.android.com/google/play/requirements/target-sdk>
- Android App Signing: <https://developer.android.com/studio/publish/app-signing>
- Google Play User Data: <https://support.google.com/googleplay/android-developer/answer/10144311>
- 계정 삭제: <https://support.google.com/googleplay/android-developer/answer/13327111>
- EAS Android submit/AAB: <https://docs.expo.dev/submit/android/>
- Expo 가격: <https://expo.dev/pricing>
- EAS 환경변수: <https://docs.expo.dev/eas/environment-variables/>
- Supabase production checklist: <https://supabase.com/docs/guides/deployment/going-into-prod>
- Supabase Auth SMTP: <https://supabase.com/docs/guides/auth/auth-smtp>
- Supabase API keys/RLS: <https://supabase.com/docs/guides/getting-started/api-keys>
- Supabase 가격: <https://supabase.com/pricing>
- OpenAI API billing 분리: <https://help.openai.com/en/articles/9039756>
- OpenAI API data controls: <https://developers.openai.com/api/docs/guides/your-data>
