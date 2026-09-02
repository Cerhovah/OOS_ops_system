# 개발·개인 사용·상용 배포 전략 감사 — 2026-09-02

## 판정

현재 명세주도개발은 **핵심 제품과 로컬 데이터 계층을 만드는 방식으로는 적절하다.** strict TypeScript, 순수 도메인 계산, SQLite repository, 비파괴 migration, 소프트 삭제·내보내기, Phase별 AC/TESTPLAN은 이후 리팩터링과 서버 연결에 유리하다.

그러나 현재 SPEC만 그대로 Phase 4까지 완료해도 **유지보수 없는 개인용 독립 앱 또는 상용 배포·결제 준비 완료 상태가 되지는 않는다.** SPEC §3.3이 앱 스토어 공개 배포 준비를 비목표로 두고 있고, 현재 `eas.json`도 development profile만 갖는다. 개인 사용용 standalone preview/release, EAS Update, production AAB, 환경 분리, 운영·결제 게이트를 명세에 추가해야 사용자의 최종 목표와 일치한다.

## 세 빌드의 역할

| 빌드 | 목적 | Metro 필요 | 설치·갱신 방식 | 현재 상태 |
|---|---|---:|---|---|
| Development | 개발·디버깅·실기기 검증 | 필요(또는 호환 update) | 내부 APK, 개발 서버 연결 | 구현·설치됨 |
| Preview/Personal release | 개인이 일상에서 production과 유사하게 사용 | 불필요 | standalone APK 직접 설치; 새 native binary는 재설치 | 미구현 |
| Production | Google Play/App Store 공개·테스트 트랙 | 불필요 | Android AAB를 스토어가 설치·자동 업데이트 | 미구현 |

Development build는 개발 과정의 정상적인 도구이지만 최종 개인용 결과물이 아니다. 개인 사용 전환 시 developer tools가 없는 standalone preview APK를 생성해야 한다. 공개 배포 시에는 production AAB가 별도로 필요하다.

## “APK 관리 없이 사용”의 정확한 범위

- standalone APK를 한 번 설치하고 앱·OS·서버를 바꾸지 않으면 계속 사용할 수 있다. EAS 다운로드 링크 만료가 설치된 앱을 삭제하지 않는다.
- 앱 기능을 변경하면서 스토어를 쓰지 않으면 새 APK를 직접 설치해야 한다. EAS Update를 추가하면 JS·스타일·이미지 변경은 앱 안에서 받을 수 있지만 native dependency, 권한, Expo SDK 변경에는 새 binary가 필요하다.
- Google Play에 production으로 배포하면 사용자는 APK 파일을 직접 관리하지 않고 스토어 업데이트를 받는다. 개발자는 버전, 서명, 심사, SDK·정책 대응을 계속 관리해야 한다.
- 서버가 붙는 순간 “유지보수 0”은 현실적인 완료 조건이 아니다. 비용·인증·마이그레이션·백업·복구·정책 변경은 운영 대상이다. 대신 자동화·문서·테스트로 유지보수 부담을 낮출 수 있다.

## 현재 SDD의 강점과 부족한 부분

| 영역 | 평가 | 근거/보완 |
|---|---|---|
| 제품 불변조건·범위 통제 | 강함 | SPEC §2, 금지 문구, Phase gate가 명확함 |
| 로컬 우선·데이터 소유권 | 강함 | SQLite, soft delete, append-only plan, export |
| 리팩터링 기반 | 양호 | strict TS, pure calculation, repository 분리. Phase 2에서 transport/sync port를 UI와 분리해야 함 |
| 실기기·자동 검증 | 양호 | 자동 gate와 수동 AC가 있으나 결과 증빙을 build별로 더 엄격히 보존해야 함 |
| 빌드·릴리스 전략 | 부족 | development만 존재. preview/personal/production profile과 version/channel 정책 필요 |
| 운영 서버 | 부족 | Phase 2 기능 기준은 있으나 dev/preview/prod 분리, backup drill, monitoring, runbook은 없음 |
| 상용 사용자 수명주기 | 없음 | 가입·탈퇴·계정 삭제·지원·다중 사용자 운영 기준 필요 |
| 실제 결제 | 없음 | KPI의 `결제`와 Play Billing/IAP는 별개. 상품·구매 검증·entitlement·환불·복원 필요 |
| 법무·스토어 준비 | 없음 | 개인정보 처리방침, 이용약관, 스토어 metadata·심사·데이터 안전 양식 필요 |

## 권장 목표 구조

### 개발 중

- `development`: dev client + Metro tunnel/LAN, development Supabase.
- 모든 Phase는 자동 gate와 development build 수동검증을 통과한다.
- Phase 종료마다 코드/테스트와 gate 문서를 분리 커밋한다.

### 개인용 완결 시점

- `preview` 또는 `personal`: developer tools가 없는 Android APK, preview/personal channel.
- Metro 없이 비행기 모드 재시작과 로컬 기록이 가능해야 한다.
- EAS Update를 구성해 compatible JS hotfix를 받을 수 있게 하되, native 변경은 새 APK가 필요하다고 문서화한다.
- APK, SHA-256, signing credential 관리와 rollback 가능한 embedded bundle을 보존한다.

### 공개 배포 시점

- `staging`: Google Play internal/closed testing, production과 동일 runtime·환경 설정.
- `production`: Android AAB, production Supabase, production update channel.
- 앱 version/versionCode, store submission, privacy/terms, data safety, staged rollout, rollback을 release gate로 둔다.

### 결제 시점

- 제품의 KPI `결제/매출` 기록과 앱 판매 결제를 명확히 분리한다.
- 디지털 기능/구독이면 Play Billing 클라이언트와 secure backend 구매 검증, entitlement, acknowledge, 보류·취소·환불·복원을 구현한다.
- 결제 secret과 service role key는 앱에 넣지 않고 서버에만 둔다.

## 지금 바꿔야 할 명세 경계

Phase 2를 구현하기 전에 전체 Phase 번호를 즉시 바꿀 필요는 없지만, 다음 원칙은 지금부터 반영해야 나중 리팩터링 비용이 줄어든다.

1. Supabase 원격 키를 `(user_id, local_id)`로 설계해 개인용 UI여도 다중 사용자 격리를 보장한다.
2. database migration과 RLS policy를 dashboard 수작업이 아니라 저장소 파일로 관리한다.
3. development/preview/production 환경을 별도 Supabase project와 EAS environment로 분리한다.
4. sync/auth/billing transport를 도메인·SQLite repository와 분리한다.
5. Phase 4 뒤에 `Personal Release`와 `Commercial Release` 게이트를 신설하고 기존 확장 Phase는 뒤로 이동한다.
6. telemetry 금지와 상용 장애 모니터링의 경계를 사용자 승인으로 재정의한다. 행동 분석은 금지하되 최소 crash/서버 운영 로그를 허용할지 결정한다.

## 권장 결론

현재 구현을 버리거나 전면 리팩터링할 필요는 없다. **Phase 1 기반은 유지하고, Phase 2부터 상용 확장 가능한 사용자 격리·환경 분리·migration-as-code를 적용하며, Phase 4 뒤에 개인용 standalone과 상용 release gate를 추가하는 방식**이 가장 비용이 낮다.

공식 근거:

- EAS build profiles: https://docs.expo.dev/build/eas-json/
- Development workflows/tunnel: https://docs.expo.dev/develop/development-builds/development-workflows/
- EAS internal distribution: https://docs.expo.dev/build/internal-distribution/
- App store production build: https://docs.expo.dev/deploy/build-project/
- EAS Update: https://docs.expo.dev/eas-update/introduction/
- EAS Update deployment: https://docs.expo.dev/eas-update/deployment/
- Google Play Billing: https://developer.android.com/google/play/billing/
