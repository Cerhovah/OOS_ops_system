# DECISIONS

기술적 자율 결정과 근거를 ADR로 기록한다. 제품 철학, §2 불변조건, 사용자 권한, 데이터 소유권, 승인된 범위는 이 문서로 변경할 수 없다.

## 기록 원칙

- 폴더 구조, 상태 관리, 보조 라이브러리, 테스트 도구, 인덱스, 성능·접근성 구현처럼 §0.3 자율 영역의 선택만 기록한다.
- 사용자 선호나 제품 동작을 바꾸는 결정은 ADR로 대신하지 않고 `QUESTIONS.md`에 올린다.
- 명세에 이미 확정된 Expo/React Native, Expo Router, expo-sqlite, 로컬 알림, append-only 계획, 소프트 삭제는 ADR의 신규 결정이 아니다.
- 대체된 결정도 삭제하지 않고 `대체` 상태와 후속 ADR 번호를 남긴다.

## 결정 목록

### ADR-001 — 루트 관리 문서와 `mobile/` Expo 앱 분리

- 날짜: 2026-08-20
- 상태: 승인
- 맥락: 저장소 루트의 명세·계획·검증 문서를 유지하면서 Windows/macOS에서 동일한 Expo 앱과 잠금 파일을 재현해야 한다. Android Studio/JDK는 현재 설치하지 않는다.
- 결정: 루트에는 `docs/`와 프로젝트 관리 파일을 두고 Expo 앱은 `mobile/`에 `npx create-expo-app@latest mobile`로 생성한다. Node.js 24.19.0 LTS와 npm 11.17.0을 기준으로 npm만 사용하고 `mobile/package-lock.json`을 커밋한다. Expo CLI는 전역 설치하지 않고 `npx expo`를 사용한다. Phase 1 Android 실기기 빌드는 EAS Cloud development build를 우선한다.
- 대안: 저장소 루트에 앱 생성, yarn/pnpm/bun 사용, Android Studio/JDK를 설치한 로컬 네이티브 빌드.
- 근거: 루트 문서와 앱 의존성의 경계를 명확히 하고, 단일 잠금 파일로 운영체제 간 설치를 재현하며, 현재 승인 범위에서 로컬 Android 도구 설치를 피한다.
- 결과 및 위험: 앱 명령은 `mobile/`에서 실행한다. EAS 빌드 시 Expo 로그인·네트워크·실기기 설치가 필요하고 서비스 플랜에 따라 비용 정지 조건이 생길 수 있다.
- 되돌림/재검토 조건: EAS로 필수 AC를 검증할 수 없거나 로컬 Android SDK가 반드시 필요한 경우 `QUESTIONS.md`에 기록하고 사용자 결정을 기다린다.
- 관련 불변조건/AC: I-7, I-10, I-12, AC-1, AC-13, AC-14, §10.3
- 대체 관계: 없음

### ADR-002 — SQLite v1 로컬 저장소와 기록 이력 경계

- 날짜: 2026-08-20
- 상태: 승인
- 맥락: Phase 1은 인터넷과 무관하게 기록·계획·프로젝트·종료·내보내기가 동작해야 하며 삭제와 계획 변경 이력을 보존해야 한다.
- 결정: `SQLiteProvider` 초기화에서 버전 1 상향 마이그레이션과 §4.4 시드를 실행하고, 모든 DB 접근을 `AppRepository`에 둔다. 일반 삭제는 `deleted_at` 소프트 삭제, 계획 저장·복원·지난주 복사는 항상 새 버전 삽입으로 처리한다. 자정을 넘는 타이머는 분할하지 않고 시작 타임스탬프/`occurred_at`의 Asia/Seoul 날짜에 귀속한다.
- 대안: 화면별 직접 SQL, 계획 행 덮어쓰기, 자정 자동 분할.
- 근거: I-7·I-8과 §4.3·§6을 직접 보존하고 UI와 계산/저장소를 분리한다.
- 결과 및 위험: 전체 초기화만 예외적으로 2단계 확인 후 물리 삭제하고 즉시 시드를 재생성한다. DB 실제 동작은 development build 실기기 검증이 남아 있다.
- 되돌림/재검토 조건: Phase 2 상향 마이그레이션이나 동기화 outbox가 추가될 때 새 DB 버전 ADR로 확장한다.
- 관련 불변조건/AC: I-7, I-8, AC-2, AC-4, AC-7, AC-10, AC-15, AC-16, AC-18
- 대체 관계: 없음

### ADR-003 — 비차단 타이머와 로컬 알림 예약

- 날짜: 2026-08-20
- 상태: 승인
- 맥락: 명세는 타이머 정지를 강제하지 않고 상한 알림도 정보 제공만 허용한다. 로컬 알림은 앱 재시작과 콜드 스타트 딥링크를 처리해야 한다.
- 결정: 진행 중 타이머는 DB 행으로 복원하며 다른 타이머 시작을 강제 차단하지 않는다. 시간형 `count_on_complete`는 타이머 정지 또는 수동 시간 기록 완료 시 횟수 1을 함께 저장한다. 오늘 종료·항목 일정·타이머 상한 알림의 예약 ID를 settings에 보관하고 Android HIGH 채널을 사용한다. 알림 실패는 이미 저장된 기록을 롤백하거나 차단하지 않는다.
- 대안: 단일 타이머 강제, 상한 도달 시 자동 정지, 알림 실패 시 기록 실패.
- 근거: I-1 사용자 주권, I-7 로컬 우선, I-10 로컬 알림을 함께 만족한다.
- 결과 및 위험: 플랫폼이 앱을 오래 실행하지 않은 상태의 예약 복원은 OS 정책 영향을 받으므로 AC-13·AC-14 실기기 검증이 필수다.
- 되돌림/재검토 조건: 실기기에서 중복 또는 누락 예약이 재현되면 예약 알고리즘을 새 ADR로 변경한다.
- 관련 불변조건/AC: I-1, I-7, I-9, I-10, AC-3, AC-13, AC-14, AC-16
- 대체 관계: 없음

### ADR-004 — npm audit 강제 수정 보류

- 날짜: 2026-08-20
- 상태: 승인
- 맥락: 2026-08-20 `npm audit --omit=dev`는 Expo/Metro 빌드 도구 경로의 `image-size` high 및 Xcode 구성 경로의 `uuid` moderate를 포함해 17건을 보고했다.
- 결정: `npm audit fix --force`를 실행하지 않는다. 제안된 자동 수정은 Expo 57을 Expo 53으로 낮추는 breaking change이며 I-12와 현재 SDK 호환성을 깨뜨린다. 현재 경로는 번들에 포함된 고정 자산을 처리하는 Metro 및 iOS 빌드 구성 도구이고, 앱이 사용자 입력 파일을 해당 파서에 전달하는 런타임 경로는 없다.
- 대안: 강제 수정으로 SDK 하향, 검증되지 않은 npm override.
- 근거: `expo install --check`와 `expo-doctor` 21/21이 통과했고 강제 수정은 스택 변경과 더 큰 호환성 위험을 만든다.
- 결과 및 위험: 경고를 숨기지 않고 게이트 증빙에 남긴다. Expo SDK/Metro가 수정 버전을 배포하면 정상 업그레이드 경로로 재검토한다.
- 되돌림/재검토 조건: 앱이 외부 이미지를 빌드 파서로 처리하게 되거나 Expo 공식 호환 업데이트가 나오면 즉시 재감사한다.
- 관련 불변조건/AC: I-12, §10.3, §10.5
- 대체 관계: 없음

#### 2026-09-02 재검토

- SDK 57 호환 패치 적용 후 `npm audit --omit=dev`는 15건의 moderate를 보고했다.
- 경로는 `expo-router -> query-string -> decode-uri-component`와 Expo config/Xcode 도구의 `uuid`다.
- npm의 강제 수정은 SDK 57 호환 패치가 아니라 `expo-router@5.1.11`, `expo-sharing@14.0.8`로 바꾸는 breaking change를 제안한다.
- `expo install --check`, `expo-doctor`, 전체 자동 게이트가 통과했으므로 강제 수정 보류를 유지하고 Expo SDK 57의 공식 호환 업데이트에서 재검토한다.

### ADR-005 — EAS 프로젝트 연결과 Windows 빌드 아카이브 방식

- 날짜: 2026-08-20
- 상태: 승인
- 맥락: 인증된 Expo 계정으로 Android development build를 생성해야 한다. 현재 Windows 체크아웃 경로에 대괄호가 포함되어 있어 EAS CLI의 기본 로컬 `git clone file:///...` 아카이브 단계가 종료 코드 128로 실패했다.
- 결정: EAS 프로젝트를 `@ljh951206/oos-ops`(project ID `a0b6c215-c87a-40ff-b749-b715d1ed9352`)로 연결한다. 이 체크아웃 경로에서 EAS build를 제출할 때만 Expo의 공식 아카이브 문제 해결 옵션인 `EAS_NO_VCS=1`을 사용하고, 소스 포함 범위는 저장소 ignore 규칙으로 관리한다. build 전에는 `npm run verify`를 통과시킨다.
- 대안: 대괄호가 없는 경로로 저장소를 새로 체크아웃, Android Studio/JDK를 설치한 로컬 build, 기본 VCS 아카이브를 반복 시도.
- 근거: 애플리케이션이나 Cloud worker 오류 없이 로컬 git URL 해석에서만 실패했고, `EAS_NO_VCS=1` 재제출은 동일 구성으로 build `67a46042-d559-42ee-a321-dd6db1101431`을 성공시켰다.
- 결과 및 위험: 현재 development APK는 SDK 57, `com.oosops.app`, 앱 버전 0.1.0(1)로 생성됐다. no-VCS 모드는 Git 커밋 상태 대신 로컬 작업 트리를 패키징하므로 제출 전 ignore 규칙과 변경 상태를 확인해야 한다.
- 되돌림/재검토 조건: 저장소가 대괄호 없는 경로로 이동하거나 EAS CLI의 로컬 git URL 처리가 수정되면 기본 VCS 아카이브로 되돌린다.
- 관련 불변조건/AC: I-7, I-10, I-12, AC-1, AC-13, AC-14, §10.3
- 대체 관계: ADR-001의 EAS Cloud 선택을 구체화하며 대체하지 않음

### ADR-006 — Expo SDK 57 호환 패치 재정렬과 개발 클라이언트 재빌드

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: 잠금 파일 재현 후 현재 Expo 호환성 메타데이터가 SDK 57 패키지 18개를 오래된 패치로 판정해 `npm run verify`가 `expo install --check`에서 중단됐다.
- 결정: 스택과 SDK 주 버전을 유지한 채 공식 `npx expo install --fix`로 SDK 57 호환 패치만 적용한다. 공식 명령이 추가한 `expo-image` config plugin을 유지한다. 네이티브 패키지와 app config가 바뀌었으므로 현재 소스용 Android development build를 다시 생성한다.
- 대안: 오래된 패치를 유지하고 호환성 게이트를 무시, Expo SDK 변경, 수동 버전 override.
- 근거: Expo 문서는 `expo install`로 React Native/SDK 호환 버전을 선택하고 네이티브 라이브러리 또는 app config 변경 뒤 개발 클라이언트를 재빌드하도록 안내한다. 수정 후 전체 자동 게이트와 Metro 기동이 통과했다.
- 결과 및 위험: 새 잠금 파일과 개발 build가 기준이 된다. 2026-08-20 APK는 원상 복구용으로 로컬 보존했지만 현재 패치 소스의 최종 실기기 검증에는 새 build를 사용한다.
- 되돌림/재검토 조건: 새 build 실패 또는 실기기 회귀가 있으면 원본 APK와 이전 잠금 상태를 비교하고, 데이터 손실 없는 범위에서 패치별 원인을 분리한다.
- 관련 불변조건/AC: I-7, I-10, I-12, AC-1, AC-13, AC-14, §10.3
- 대체 관계: ADR-001·ADR-005를 유지하며 현재 복구 절차만 구체화

### ADR-007 — 기존 SQLite를 보존하는 자체 outbox 동기화

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: Phase 1의 SQLite 스키마·repository·오프라인 동작과 사용자 데이터를 보존하면서 Phase 2의 자동 동기화, 수동 동기화, tombstone, LWW, 충돌 로그를 추가해야 한다. 프레임워크 교체는 기존 데이터를 위험하게 하고 Phase 1 구조를 크게 바꾼다.
- 결정: SQLite를 계속 로컬 진실의 원천으로 사용하고 자체 outbox + `updated_at` 최종쓰기승(last-write-wins) 동기화 엔진을 추가한다. 로컬 변경은 동일 트랜잭션의 outbox에 기록하고, 업로드 성공 뒤에만 outbox를 제거한다. 원격에서 더 최신인 서로 다른 값은 조용히 덮지 않고 `sync_conflicts`에 양쪽 snapshot과 적용 결과를 기록한다. 원격 Postgres는 모든 사용자 데이터 키를 `(user_id, local_id)` 복합 유일키로 분리해 사용자마다 같은 seed ID를 가질 수 있게 한다.
- 대안: PowerSync/Legend-State/WatermelonDB/RxDB로 저장 계층 교체, 원격 우선 CRUD, 타임스탬프만 비교하고 충돌 기록 생략.
- 근거: 현재 repository와 마이그레이션을 파괴하지 않으며 I-7의 오프라인 기록과 AC-19~22를 직접 검증할 수 있다. 별도 라이브러리의 저장 모델에 종속되지 않는다.
- 결과 및 위험: 모든 mutation 경로가 outbox와 같은 트랜잭션을 써야 하며 누락 테스트가 필요하다. 기기 시계 오차가 LWW에 영향을 줄 수 있어 서버 수신 시각과 충돌 로그를 함께 저장한다. 알림 예약 ID·권한 상태 같은 기기 전용 setting은 동기화하지 않고 사용자 선호 setting만 allowlist로 동기화한다.
- 되돌림/재검토 조건: outbox 누락을 구조적으로 방지할 수 없거나 대용량 성능이 수용 기준을 못 통과할 때 검증된 local-first 라이브러리를 재평가한다.
- 관련 불변조건/AC: I-2, I-7, I-8, I-12, AC-19~AC-22
- 대체 관계: 없음

### ADR-008 — SQLite v2 trigger 캡처와 원격 record envelope

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: repository의 모든 mutation마다 outbox 코드를 반복하면 새 경로에서 캡처가 누락될 수 있고, Phase 1의 14개 사용자 데이터 테이블을 파괴 없이 원격으로 옮겨야 한다.
- 결정: SQLite v2에서 누락된 `updated_at`/`deleted_at`을 상향 추가하고 각 사용자 데이터 테이블의 INSERT/UPDATE trigger가 동일 DB 작업 안에서 `sync_outbox`를 upsert한다. 원격 Postgres는 `(user_id, table_name, local_id)`를 PK로 하고 로컬 전체 행을 `payload jsonb`에 보존하는 `oos_sync_records`를 사용한다. 서버 RPC는 더 오래된 client timestamp가 새 행을 덮지 못하게 한다.
- 대안: 모든 repository 메서드에 수동 outbox 삽입, 원격 테이블 14개에 동일한 RLS/RPC 반복, 저장 계층 교체.
- 근거: trigger가 기존·향후 로컬 mutation을 구조적으로 포착하고, record envelope가 모든 계획 버전·소프트 삭제 행·설정 allowlist를 손실 없이 복제하면서 RLS 정책을 한 곳에서 검증하게 한다.
- 결과 및 위험: Phase 3의 서버측 집계가 JSON 필드 쿼리를 많이 사용하면 typed view 또는 mirror table을 상향 migration으로 추가한다. 알림 예약 ID·권한·기기별 notification ID는 trigger 조건에서 제외한다.
- 되돌림/재검토 조건: 원격 JSON 질의 성능이나 무결성 검사가 Phase 3 수용 기준을 충족하지 못할 때 typed view/table을 추가하되 로컬 ID와 payload 원본은 보존한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19~AC-22
- 대체 관계: ADR-007의 구현 형식을 구체화하며 대체하지 않음

### ADR-009 — 이메일 OTP 사용자 식별과 기기 로컬 초기화

- 날짜: 2026-09-02
- 상태: 대체
- 맥락: 재설치 복구와 본인 행 RLS에는 재현 가능한 사용자 ID가 필요하지만 앱이 비밀번호를 저장하거나 매직링크 딥링크를 추가할 필요는 없다.
- 결정: SPEC §14 기본값대로 이메일 6자리 OTP를 사용하고 Supabase 세션은 `expo-sqlite/localStorage`에 유지한다. 앱의 전체 초기화는 SQLite만 재시드하며 원격 삭제 요청을 만들지 않는다. 로그인·동기화 실패는 로컬 기록을 차단하지 않는다.
- 대안: 매직링크, 소셜 로그인, 익명 인증, 이메일·비밀번호, 로컬 초기화와 원격 삭제 결합.
- 근거: OTP는 비밀번호 저장 없이 재설치 후 같은 `auth.uid()`를 복구하고, RLS가 사용자 행을 분리하게 한다. 익명 인증은 앱 삭제 후 같은 계정을 복구할 수 없다.
- 결과 및 위험: Supabase Auth 이메일 템플릿에 `{{ .Token }}` 설정이 필요하다. 향후 소셜 로그인을 추가해도 동기화 엔진은 session user ID만 사용하므로 교체 범위가 인증 UI로 제한된다.
- 되돌림/재검토 조건: 사용자가 매직링크/소셜 로그인을 선택하거나 OTP 메일 전달 신뢰성이 수용 기준을 못 통과할 때 인증 UI만 교체한다.
- 관련 불변조건/AC: I-7, I-8, AC-19, AC-22
- 대체 관계: 없음

#### 2026-09-02 배포 제약 재검토

- Supabase Free 프로젝트의 기본 메일 제공자는 커스텀 confirmation/magic-link 템플릿 배포를 HTTP 400으로 거부했다.
- 기본 원격 템플릿은 링크형이며 OTP 길이도 현재 앱의 6자리 입력과 일치하지 않아 ADR-009를 그대로 실기기 검증할 수 없다.
- 인증 방식은 질문 영역이고 유료 플랜·SMTP는 비용 또는 자격증명이 필요하므로 Q-007 답변 전까지 인증 UI 변경을 중지한다. 기본 제안은 무료 이메일 매직링크다.

### ADR-011 — 무료 이메일 매직링크와 전용 앱 callback

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: Supabase Free 기본 메일 제공자는 6자리 OTP 템플릿 수정을 거부하지만 기본 `ConfirmationURL` 매직링크는 제공한다. 재설치 복구와 RLS 사용자 ID는 계속 필요하다.
- 결정: `signInWithOtp`에 `emailRedirectTo: oosops://auth/callback`을 전달해 기본 매직링크를 보내고, Expo Linking으로 콜드 스타트와 실행 중 callback을 처리한다. callback은 전용 경로만 허용하며 implicit access/refresh token 또는 향후 PKCE code를 세션 API로 전달하고 URL·토큰을 로그에 남기지 않는다.
- 대안: 커스텀 SMTP OTP, Supabase 유료 플랜 OTP, 이메일·비밀번호, 익명 인증.
- 근거: §8이 허용하는 무비밀번호 인증이며 추가 비용·메일 자격증명 없이 동일 `auth.uid()`와 기기 세션 복구를 유지한다.
- 결과 및 위험: 사용자는 이메일 앱에서 링크를 한 번 눌러야 하고 custom scheme가 포함된 native build가 필요하다. 앱 미설치 상태에서는 custom scheme callback이 열리지 않으므로 설치 후 로그인한다.
- 되돌림/재검토 조건: 공개 배포에서 Universal/App Links를 갖춘 도메인이 준비되거나 custom SMTP/유료 Auth를 승인하면 callback을 상향한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19, AC-22
- 대체 관계: ADR-009의 OTP 인증 부분을 대체하며 기기 로컬 초기화 결정은 유지

### ADR-010 — 원격 migration 이력 보존과 lint 후속 수정

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: 연결된 Supabase에 로컬 저장소에 없던 migration `202608240001`~`003`이 존재했고, 신규 RPC를 적용한 뒤 원격 lint가 PL/pgSQL 반환 열과 `ON CONFLICT` 열의 이름 모호성을 검출했다.
- 결정: 원격 migration 원문을 CLI history에서 저장소로 가져와 이력을 보존한다. 이미 적용된 `20260902053000`은 수정하지 않고 `ON CONFLICT ON CONSTRAINT oos_sync_records_pkey`를 사용하는 비파괴 후속 migration `20260902060000`으로 함수만 교체한다.
- 대안: 원격 migration 이력 repair로 삭제, 적용된 migration 파일 직접 수정, lint 오류 방치.
- 근거: 원격의 기존 상태를 재현 가능하게 보존하며 적용 이력의 불변성과 상향 migration 원칙을 지킨다.
- 결과 및 위험: 원격/로컬 migration 버전이 모두 일치하고 DB lint 오류가 0이다. 기존 `sync_records` 계열과 신규 `oos_sync_records` 계열이 함께 남으므로 Phase 3 서버 작업 전 사용 경로를 다시 확인한다.
- 되돌림/재검토 조건: 과거 `sync_records` 계열이 사용되지 않음이 운영 데이터로 확인되고 삭제가 필요할 때 별도 보존·삭제 migration과 사용자 승인을 사용한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19~AC-22
- 대체 관계: ADR-008을 보완하며 대체하지 않음

### ADR-012 — Pristine 재설치 seed를 원격 백업으로 원자 교체

- 날짜: 2026-09-02
- 상태: 승인
- 맥락: 새 설치는 로컬 우선 사용을 위해 현재 주 계획까지 즉시 시드한다. 그러나 기존 원격 백업이 있는 재설치에서는 원격에 없던 새 현재 주 시드가 pull 뒤 push되어 복구 전 상태와 달라졌다.
- 결정: 첫 동기화이고 원격 행이 있으며 outbox의 모든 `local_updated_at`이 고정 seed 시각인 경우에만 pristine bootstrap으로 판정한다. 같은 SQLite transaction에서 동기화 대상 seed·outbox·임시 충돌 로그를 제거하고 원격 전체 행을 적용한다. 기기 전용 설정은 유지한다.
- 대안: 복구 뒤 중복 seed를 수동 삭제, 원격 우선으로 항상 로컬 초기화, 앱 시작 시 seed 생성을 지연.
- 근거: 원격 백업이 없는 최초 사용은 그대로 로컬 우선으로 동작하고, 로그인 전 사용자가 한 변경은 timestamp가 달라 교체하지 않으면서 재설치 복구는 원본과 일치한다.
- 결과 및 위험: seed 고정 시각 정책이 바뀌면 pristine 판정도 함께 갱신해야 한다. 원격 적용과 로컬 정리는 한 transaction이므로 중간 실패 시 기존 로컬 seed가 보존된다.
- 되돌림/재검토 조건: 설치 식별자나 서버측 snapshot 세대가 추가되어 더 명시적인 bootstrap 판정이 가능할 때 교체한다.
- 관련 불변조건/AC: I-7, I-8, AC-19, AC-20
- 대체 관계: ADR-008의 bootstrap 동작을 보완하며 대체하지 않음

### ADR-013 — 단일 허용 대화의 Telegram Edge Function과 확인형 쓰기

- 날짜: 2026-09-03
- 상태: 승인
- 맥락: Phase 3은 앱과 같은 원격 데이터를 Telegram에서 조회·기록하고 21:30 요약을 자율 발송해야 하지만 bot token을 앱에 포함하거나 자유 문장·음성을 즉시 적용하면 안 된다.
- 결정: Supabase Edge Function 하나가 Telegram webhook과 Vault secret으로 인증된 cron 요청을 처리한다. webhook secret, 정확히 하나의 `allowed_chat_id`, 단일 owner user ID를 모두 확인한다. 정확 명령만 즉시 `source='telegram'`으로 쓰고 자유 문장·음성은 만료되는 proposal을 만든 뒤 확인 callback에서만 쓴다. update 상태와 결정적 record ID로 실패 재시도를 중복 없이 처리한다.
- 대안: token을 모바일 앱에 포함, polling worker 상시 운영, 자유 문장/음성을 즉시 적용, 사용자별 다중 bot.
- 근거: 기존 `oos_sync_records`와 RLS 경계를 유지하고 별도 상시 서버 없이 AC-23~AC-26을 구현한다. Telegram의 webhook secret header와 Supabase의 외부 webhook/cron 패턴을 사용한다.
- 결과 및 위험: token·webhook/cron secret은 Supabase secret/Vault에만 있고 앱은 비민감 연결 상태와 발송 시각만 본다. 실제 음성은 Q-009 제공자·비용 승인 전 호출하지 않는다. cron은 매분 실행하되 각 사용자 시간대/분과 delivery unique key로 하루 한 번만 발송한다.
- 되돌림/재검토 조건: 다중 사용자/봇, 고가용성 queue, retry dead-letter, 별도 운영 서버가 상용화 AC로 승인되거나 현재 Edge 실행 한도가 부족할 때 분리한다.
- 관련 불변조건/AC: I-1, I-2, I-7, I-8, I-10, I-12, AC-23~AC-26
- 대체 관계: ADR-007·ADR-008의 원격 record 형식을 확장하며 대체하지 않음

## 기록 형식

### ADR-NNN — 제목

- 날짜:
- 상태: 제안 / 승인 / 대체
- 맥락:
- 결정:
- 대안:
- 근거:
- 결과 및 위험:
- 되돌림/재검토 조건:
- 관련 불변조건/AC:
- 대체 관계:
