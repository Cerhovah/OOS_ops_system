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

#### 2026-09-04 재검토

- 잠금 파일 안의 `@xmldom/xmldom`은 선언된 호환 범위 안에서 `0.8.15`와 `0.9.12`로 올려 해당 경고를 제거했다.
- 온라인 `npm audit --omit=dev`의 잔여 16 moderate는 서로 다른 결함 16개가 아니라 두 root advisory가 전이 패키지까지 집계된 결과다.
- 런타임 경로 `expo-router@57.0.19 -> query-string@7.1.3 -> decode-uri-component@0.2.2`에는 조작된 percent-encoding으로 CPU 사용량을 높일 수 있는 가용성 위험이 남는다. 수정 버전 `decode-uri-component@0.5.0`은 ESM default export라 CommonJS 함수 자체를 요구하는 `query-string@7.1.3`에 직접 override하면 호출 호환성을 깨뜨린다.
- 도구 경로 `@expo/config-plugins -> xcode@3.0.1 -> uuid@7.0.3`의 advisory는 caller-supplied buffer를 받는 UUID v3/v5/v6에 해당한다. 현재 xcode/ngrok 경로는 `v4()`만 호출하고 Android 실행 번들에는 포함되지 않으므로 도달 가능한 앱 취약점으로 보지 않는다.
- 따라서 검증되지 않은 major override와 Expo SDK를 낮추는 `npm audit fix --force`는 적용하지 않는다. Expo Router가 호환 수정판을 내면 우선 갱신하고 전체 게이트와 deep-link 회귀를 다시 수행한다.

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
- 상태: 부분 대체
- 맥락: 잠금 파일 재현 후 현재 Expo 호환성 메타데이터가 SDK 57 패키지 18개를 오래된 패치로 판정해 `npm run verify`가 `expo install --check`에서 중단됐다.
- 결정: 스택과 SDK 주 버전을 유지한 채 공식 `npx expo install --fix`로 SDK 57 호환 패치만 적용한다. 공식 명령이 추가한 `expo-image` config plugin을 유지한다. 네이티브 패키지와 app config가 바뀌었으므로 현재 소스용 Android development build를 다시 생성한다.
- 대안: 오래된 패치를 유지하고 호환성 게이트를 무시, Expo SDK 변경, 수동 버전 override.
- 근거: Expo 문서는 `expo install`로 React Native/SDK 호환 버전을 선택하고 네이티브 라이브러리 또는 app config 변경 뒤 개발 클라이언트를 재빌드하도록 안내한다. 수정 후 전체 자동 게이트와 Metro 기동이 통과했다.
- 결과 및 위험: 새 잠금 파일과 개발 build가 기준이 된다. 2026-08-20 APK는 원상 복구용으로 로컬 보존했지만 현재 패치 소스의 최종 실기기 검증에는 새 build를 사용한다.
- 되돌림/재검토 조건: 새 build 실패 또는 실기기 회귀가 있으면 원본 APK와 이전 잠금 상태를 비교하고, 데이터 손실 없는 범위에서 패치별 원인을 분리한다.
- 관련 불변조건/AC: I-7, I-10, I-12, AC-1, AC-13, AC-14, §10.3
- 대체 관계: ADR-001·ADR-005를 유지하며 복구 절차를 구체화했다. 미사용 `expo-image` plugin 유지 결정만 ADR-015가 대체한다.

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
- 대체 관계: 인증 방식은 ADR-011, 세션 저장 경계는 ADR-020이 대체. 기기 로컬 초기화 결정은 유지

#### 2026-09-02 배포 제약 재검토

- Supabase Free 프로젝트의 기본 메일 제공자는 커스텀 confirmation/magic-link 템플릿 배포를 HTTP 400으로 거부했다.
- 기본 원격 템플릿은 링크형이며 OTP 길이도 현재 앱의 6자리 입력과 일치하지 않아 ADR-009를 그대로 실기기 검증할 수 없다.
- 인증 방식은 질문 영역이고 유료 플랜·SMTP는 비용 또는 자격증명이 필요하므로 Q-007 답변 전까지 인증 UI 변경을 중지한다. 기본 제안은 무료 이메일 매직링크다.

### ADR-011 — 무료 이메일 매직링크와 전용 앱 callback

- 날짜: 2026-09-02
- 상태: 부분 대체
- 맥락: Supabase Free 기본 메일 제공자는 6자리 OTP 템플릿 수정을 거부하지만 기본 `ConfirmationURL` 매직링크는 제공한다. 재설치 복구와 RLS 사용자 ID는 계속 필요하다.
- 결정: `signInWithOtp`에 `emailRedirectTo: oosops://auth/callback`을 전달해 기본 매직링크를 보내고, Expo Linking으로 콜드 스타트와 실행 중 callback을 처리한다. callback은 전용 경로만 허용하며 implicit access/refresh token 또는 향후 PKCE code를 세션 API로 전달하고 URL·토큰을 로그에 남기지 않는다.
- 대안: 커스텀 SMTP OTP, Supabase 유료 플랜 OTP, 이메일·비밀번호, 익명 인증.
- 근거: §8이 허용하는 무비밀번호 인증이며 추가 비용·메일 자격증명 없이 동일 `auth.uid()`와 기기 세션 복구를 유지한다.
- 결과 및 위험: 사용자는 이메일 앱에서 링크를 한 번 눌러야 하고 custom scheme가 포함된 native build가 필요하다. 앱 미설치 상태에서는 custom scheme callback이 열리지 않으므로 설치 후 로그인한다.
- 되돌림/재검토 조건: 공개 배포에서 Universal/App Links를 갖춘 도메인이 준비되거나 custom SMTP/유료 Auth를 승인하면 callback을 상향한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19, AC-22
- 대체 관계: ADR-009의 OTP 인증 부분을 대체하며 기기 로컬 초기화 결정은 유지. ADR-020이 implicit token callback과 SQLite 세션 저장 부분만 대체

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
- 상태: 대체
- 맥락: Phase 3은 앱과 같은 원격 데이터를 Telegram에서 조회·기록하고 21:30 요약을 자율 발송해야 하지만 bot token을 앱에 포함하거나 자유 문장·음성을 즉시 적용하면 안 된다.
- 결정: Supabase Edge Function 하나가 Telegram webhook과 Vault secret으로 인증된 cron 요청을 처리한다. webhook secret, 정확히 하나의 `allowed_chat_id`, 단일 owner user ID를 모두 확인한다. 정확 명령만 즉시 `source='telegram'`으로 쓰고 자유 문장·음성은 만료되는 proposal을 만든 뒤 확인 callback에서만 쓴다. update 상태와 결정적 record ID로 실패 재시도를 중복 없이 처리한다.
- 대안: token을 모바일 앱에 포함, polling worker 상시 운영, 자유 문장/음성을 즉시 적용, 사용자별 다중 bot.
- 근거: 기존 `oos_sync_records`와 RLS 경계를 유지하고 별도 상시 서버 없이 AC-23~AC-26을 구현한다. Telegram의 webhook secret header와 Supabase의 외부 webhook/cron 패턴을 사용한다.
- 결과 및 위험: token·webhook/cron secret은 Supabase secret/Vault에만 있고 앱은 비민감 연결 상태와 발송 시각만 본다. 실제 음성은 Q-009 제공자·비용 승인 전 호출하지 않는다. cron은 매분 실행하되 각 사용자 시간대/분과 delivery unique key로 하루 한 번만 발송한다.
- 되돌림/재검토 조건: 다중 사용자/봇, 고가용성 queue, retry dead-letter, 별도 운영 서버가 상용화 AC로 승인되거나 현재 Edge 실행 한도가 부족할 때 분리한다.
- 관련 불변조건/AC: I-1, I-2, I-7, I-8, I-10, I-12, AC-23~AC-26
- 대체 관계: ADR-014가 Telegram 제품 범위와 구현을 제거해 이 결정을 대체함

### ADR-014 — Telegram 범위 철회와 앱 자체 알림 유지

- 날짜: 2026-09-03
- 상태: 승인
- 맥락: Telegram Phase는 앱 외부에서 조회·기록·서버 요약을 제공하지만, 사용자가 원하는 알림은 이미 AC-13~AC-14의 앱 자체 로컬 알림으로 충족된다. 봇은 token, webhook, cron, 외부 대화 채널이라는 별도 운영·보안 표면을 추가한다.
- 결정: Telegram을 제품 범위와 후속 Phase 게이트에서 제거한다. 앱의 로컬 알림, SQLite 기록, Supabase 동기화는 그대로 유지한다. webhook과 봇 명령을 먼저 해제하고, Telegram 전용 cron·Vault secret·DB 테이블·Edge Functions·Supabase secrets 및 모바일 UI/서비스를 제거한다. 이미 원격에 적용된 migration은 이력 재현을 위해 보존하고 상향 제거 migration으로 닫는다.
- 대안: Telegram을 선택 기능으로 비활성화만 유지, Phase 3 실대화 검증 완료 후 유지.
- 근거: Telegram은 로컬 알림이나 앱 배포·결제에 필수가 아니며, 사용자가 명시적으로 제거를 지시했다. 핵심 데이터에 Telegram/voice 출처 기록이 0건임을 삭제 전에 확인했다.
- 결과 및 위험: 외부 봇을 통한 명령·음성 입력과 서버 요약은 제공하지 않는다. 앱의 21:30 로컬 알림은 계속 동작한다. Telegram 계정에 생성된 bot 자체 삭제는 BotFather 계정 권한이 필요한 사용자 작업이지만 webhook·token·서버 리소스는 제거되어 앱과 연결되지 않는다.
- 되돌림/재검토 조건: 사용자가 외부 입력 채널을 새 명세와 AC로 다시 승인할 때 처음부터 보안·비용 범위를 재정의한다.
- 관련 불변조건/AC: I-7, I-10, I-12, AC-13~AC-14; 철회된 AC-23~AC-26
- 대체 관계: ADR-013을 대체

### ADR-015 — Phase 4 전 저장소와 레거시 동기화 스키마 정리

- 날짜: 2026-09-03
- 상태: 승인
- 맥락: Phase 1·2 구현 뒤 Expo 템플릿 자산·직접 의존성·테스트 SQLite 어댑터가 중복으로 남았고, 초기 Phase 2 시도의 `sync_*` 원격 테이블은 후속 `oos_sync_records`와 별개로 0행 상태에서 사용되지 않았다. README와 PLAN/TESTPLAN에도 이미 통과한 게이트를 대기 상태로 표현하는 드리프트가 있었다.
- 결정: 참조가 없는 템플릿 자산·스크립트와 불필요한 직접 의존성·export를 제거하고 앱 이름 상수를 재사용한다. 두 테스트의 메모리 SQLite 어댑터를 하나로 통합하고 TypeScript 미사용 검사 옵션을 상시 적용한다. 레거시 `sync_*` 세 테이블은 합계 0행을 원격에서 확인하고, 데이터가 한 행이라도 있으면 중단하는 guarded migration으로 함수·sequence와 함께 제거한다. 이미 적용된 migration 파일은 재현 이력으로 보존한다.
- 대안: 동작에 영향이 없으므로 모두 유지, 원격 migration 이력을 삭제·squash, 테스트 중복만 유지.
- 근거: 현재 동기화는 `oos_sync_records` 63행과 `apply_oos_sync_records`만 사용한다. 활성 경로와 과거 이력을 분리하면 Phase 4 변경 범위와 빌드 입력이 명확해진다.
- 결과 및 위험: 현재 사용자 데이터와 Phase 1·2 동작은 바뀌지 않는다. 제거된 파일은 Git 이력에서 복구할 수 있다. 레거시 원격 스키마에 예상 밖 데이터가 생기면 migration이 실패해 삭제를 막는다.
- 되돌림/재검토 조건: 과거 `apply_sync_mutation` 규격을 다시 사용해야 하는 승인된 요구가 생길 때 새 migration과 클라이언트 명세로 재도입한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19~AC-22
- 대체 관계: ADR-006의 미사용 `expo-image` plugin 유지 결정을 대체하며, ADR-007~ADR-012의 활성 `oos_sync_records` 결정은 변경하지 않음

### ADR-016 — 투명한 분석 snapshot과 명시적 계획 적용 경계

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: Phase 4는 저장 데이터를 외부 AI에 첨부하면서 실제 전송 범위와 비용을 확인할 수 있어야 하고, AI 제안이 사용자 확인 없이 기존 계획을 바꾸면 안 된다. 제공자·모델·과금은 Q-010의 사용자 결정 영역이다.
- 결정: SQLite v4에 `analysis_sessions`와 `ai_proposals`를 상향 추가하고 두 테이블을 기존 outbox/RLS envelope에 포함한다. 선택 기간의 계정, 모든 계획 버전, 일·주 실제, 항목별 일정/기본 예상과 실제 차이, 프로젝트별 주간 투입·KPI, 선택적 메모를 provider-neutral JSON snapshot으로 만든다. 전송 JSON을 세션에 그대로 저장하며 토큰 예산을 넘으면 오래된 메모 제거 후 일 집계를 주 집계로 올린다. 응답 제안은 pending으로만 저장하고, 사용자 `적용` 확인 트랜잭션에서만 모든 활성 계정이 포함됐는지 검증한 뒤 `source='ai_applied'`인 새 계획 버전을 만든다. 모바일 transport는 인증된 Supabase Edge Function을 사용하고 API 키는 서버 secret에만 보관한다.
- 대안: AI가 기존 계획을 직접 UPDATE, 전송 snapshot 미보관, API 키를 SQLite/동기화 설정 또는 모바일 SecureStore에 저장, 제공자 SDK를 UI에 직접 결합.
- 근거: I-6·I-8의 사용자 결정권과 이력을 보존하고, §9.1의 투명성·토큰 예산·provider-neutral 요구를 repository와 순수 packager 경계로 검증할 수 있다.
- 결과 및 위험: 제공자 adapter가 없어도 저장·검색·적용 전 불변성은 테스트할 수 있다. Q-010 확정 뒤 서버 adapter를 연결했으며 외부 전송에는 사용자가 선택한 기간의 메모가 포함될 수 있으므로 설정에서 포함/제외를 선택하고 snapshot을 세션에서 열람하게 한다.
- 되돌림/재검토 조건: 승인된 제공자의 구조화 출력·사용량 형식이 현재 transport 계약을 충족하지 못하거나 운영 서버를 Supabase 밖으로 이전할 때 adapter와 가격표만 재검토한다.
- 관련 불변조건/AC: I-2, I-6, I-7, I-8, I-13, AC-27~AC-30
- 대체 관계: 없음

### ADR-017 — OpenAI 키의 서버 격리와 단일 소유자 Edge Function

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: Q-010에서 OpenAI Responses API와 `gpt-5.6-terra` 과금을 승인했다. 기존 §9.1의 기기 SecureStore 방식은 키를 저장 시 암호화하지만 모바일 프로세스가 직접 Bearer 키를 사용하므로 공개 배포 시 추출·과금 악용 위험이 남는다. OpenAI 공식 보안 지침도 모바일 클라이언트에 API 키를 배포하지 말고 자체 백엔드를 통하도록 요구한다.
- 결정: 모바일은 Supabase 로그인 JWT로 `ai-analysis` Edge Function만 호출한다. Edge Function은 `verify_jwt=true`와 `auth.getUser`를 모두 검사하고 `OOS_OWNER_USER_ID` secret과 일치하는 기존 단일 사용자만 허용한다. `OPENAI_API_KEY`는 Supabase Edge secret에만 저장한다. 서버는 모델·고정 프롬프트·JSON Schema·`store:false`·저추론·출력 한도 3,000을 강제하고 자동 재시도하지 않는다.
- 대안: 모바일 SecureStore에서 OpenAI 직접 호출, 앱 번들 환경변수, 인증 없는 Edge Function, 별도 신규 서버 도입.
- 근거: 기존 Supabase 스택을 재사용해 추가 서버 사업자 없이 키를 클라이언트와 Git에서 격리한다. 이 구조는 개인 앱뿐 아니라 향후 공개 배포에서도 서버측 사용량 제한·결제 검증을 추가할 수 있는 경계를 제공한다.
- 결과 및 위험: ChatGPT 구독과 API 요금은 별도이며 OpenAI Platform 결제·한도가 필요하다. 현재는 단일 소유자만 허용하므로 다중 사용자 상용화 때 사용자별 할당량·구독 권한·rate limit를 별도 AC로 추가해야 한다. 분석 데이터는 요청 시 Supabase Edge와 OpenAI에 전송된다.
- 되돌림/재검토 조건: OpenAI 키 없는 사용자별 OAuth/위임 방식이 공식 제공되거나, Q-005에서 별도 운영 백엔드를 확정하거나, 다중 사용자 과금 정책을 승인할 때.
- 관련 불변조건/AC: I-2, I-6, I-7, I-8, I-12, I-13, AC-27~AC-30
- 대체 관계: ADR-016의 모바일 SecureStore 키 보관 결정을 대체

### ADR-018 — Phase 4 이후 동작 보존 리팩터와 동기화 안전 경계

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: Phase 4 기능 게이트는 통과했지만 큰 화면·repository에 표시와 저장 책임이 모였고, 비동기 저장 중 draft 덮어쓰기, 전송 중 재수정된 outbox 삭제, 로그아웃 뒤 다른 계정과의 로컬 데이터 혼합 가능성이 후속 개발 위험으로 남았다.
- 결정: 화면은 orchestration과 순수 view-model/editor section으로 나누고, SQLite 행 변환·주간 계획 writer·도메인 repository를 분리한다. 분석 package도 계산·snapshot 예산·proposal 검증 경계로 나눈다. 여러 설정과 일관 snapshot은 한 트랜잭션으로 처리한다. outbox ACK는 전송 당시 `local_updated_at`까지 일치할 때만 삭제하며, 기기 데이터는 최초 Supabase user ID에 고정한다. migration과 `user_version`은 같은 트랜잭션에서 올린다. 미지원 로컬/원격 sync schema는 조용히 건너뛰지 않고 오류로 중단한다.
- 대안: Phase 4 화면·repository를 유지한 채 기능을 계속 추가, outbox 전체 ID 삭제와 계정별 cursor만으로 사용자 구분.
- 근거: 순수 selector와 draft state는 기존 의미를 characterization test로 고정할 수 있고, 조건부 ACK·owner binding은 데이터 손실과 계정 간 혼합을 직접 차단한다.
- 결과 및 위험: 현재 단일 기기 동작과 AC-1~AC-30의 의미는 유지하면서 변경 범위가 작아졌다. 자연키가 다른 UUID와 충돌하는 다중 기기 생성 정책은 데이터 의미 결정이 필요해 Q-011로 분리한다.
- 되돌림/재검토 조건: 성능 계측에서 전체 snapshot facade가 실제 병목으로 확인되면 화면별 query/read model을 추가하되 공개 `AppRepository` 계약은 단계적으로 축소한다.
- 관련 불변조건/AC: I-1~I-14, AC-1~AC-35
- 대체 관계: ADR-007·ADR-008·ADR-012를 유지하며 안전 경계를 강화

### ADR-019 — 재현 가능한 도구 버전과 자동 회귀 게이트

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: 문서와 보안 설정 스크립트의 `@latest` 명령, 로컬에만 의존한 Supabase 계약 검증, 예제 환경파일 부재가 깨끗한 체크아웃과 후속 유지보수의 재현성을 낮췄다.
- 결정: Node/npm, EAS CLI, Supabase CLI와 GitHub Action commit을 고정한다. `mobile/.env.example`에는 공개 변수 이름만 둔다. GitHub Actions에서 잠금 설치·전체 모바일 gate·Supabase 계약 테스트와 깨끗한 PostgreSQL migration/RLS 테스트를 실행하고 Dependabot은 별도 검토 PR만 만든다.
- 대안: 매 실행 최신 CLI 사용, 로컬 수동 gate만 유지, 자동 의존성 강제 업데이트.
- 근거: 고정 버전은 같은 입력의 차이를 줄이고, clean database test는 SQLite 단위테스트가 찾을 수 없는 PostgreSQL 문법·권한 회귀를 잡는다.
- 결과 및 위험: 공식 호환 업데이트는 자동 반영되지 않고 검토 PR을 거친다. npm advisory endpoint 장애는 별도 기록하며 `audit fix --force`는 ADR-004에 따라 실행하지 않는다.
- 되돌림/재검토 조건: Expo SDK 상향 또는 고정 CLI 지원 종료 시 공식 호환표와 전체 gate를 통과한 버전으로 함께 갱신한다.
- 관련 불변조건/AC: I-7, I-8, I-10, I-12, §10.3, §10.5
- 대체 관계: ADR-001·ADR-004·ADR-005의 도구 원칙을 구체화

### ADR-020 — 네이티브 PKCE-only 인증과 SecureStore 세션 이관

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: 기존 매직링크 callback은 URL fragment의 access/refresh token도 수락했고 Expo SQLite KV에 인증 세션을 평문으로 저장했다. 앱 데이터의 local-first SQLite와 인증 비밀의 저장 경계를 분리하고, 기존 설치의 세션을 데이터 손실 없이 상향해야 한다.
- 결정: 매직링크 방식과 `oosops://auth/callback`은 유지하되 callback은 PKCE authorization code만 교환한다. 네이티브 세션은 `expo-secure-store`의 앱 전용 service와 `WHEN_UNLOCKED_THIS_DEVICE_ONLY`로 저장한다. Supabase URL에서 storage key를 안전하게 파생하고, 잘못된 공개 환경값은 앱의 로컬 기능을 crash시키지 않는다. 기존 Supabase Auth SQLite KV key는 SecureStore 쓰기 성공 뒤에만 삭제하며, 보안 저장 실패 시 SQLite로 fallback하지 않는다. key별 비동기 작업을 직렬화하고 로그아웃은 legacy key까지 지워 세션 재생성을 막는다. 웹은 플랫폼 제약상 browser localStorage를 유지한다.
- 대안: implicit fragment token 유지, AsyncStorage/SQLite 평문 유지, migration 실패 시 평문 fallback, 기존 세션 일괄 폐기.
- 근거: PKCE는 URL에 장기 세션 token을 싣지 않고, OS 보안 저장소는 로컬 업무 데이터와 인증 비밀을 분리한다. 선이관·후삭제와 직렬화는 기존 사용자 재로그인 비용과 refresh/logout 경합을 함께 줄인다.
- 결과 및 위험: `expo-secure-store`는 native module이므로 `0.4.1(8)` 새 binary가 필요하다. Android 실기기 이관은 Phase 4R 게이트에서 확인 전이며, 웹 localStorage와 iOS keychain payload 한도는 별도 플랫폼 검증 대상이다. custom scheme는 공개 배포에서 Universal/App Links보다 callback 가로채기 방어가 약하므로 Q-005에서 재검토한다.
- 되돌림/재검토 조건: SecureStore가 실제 Supabase session 크기를 저장하지 못하거나 공개 배포 도메인·Universal/App Links를 준비할 때 인증 storage/callback adapter만 교체한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-19, AC-22, AC-33
- 대체 관계: ADR-009의 SQLite 세션 저장과 ADR-011의 implicit fragment callback 부분을 대체. 이메일 매직링크와 기기 로컬 초기화 결정은 유지

### ADR-021 — 분석 세션의 불변 감사 영수증과 복구 가능한 수명주기

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: `analysis_sessions.data_snapshot_json`에는 실제 외부 전송 데이터와 선택적 메모가 들어가지만 Phase 4에는 세션 삭제·복구 경로가 없었다. 원격에서 복원된 과거 제안이 현재 I-13 문구 검증을 거치지 않고 표시·적용될 가능성도 있었다.
- 결정: 완료된 분석의 질문·응답·첨부 snapshot·사용량은 실제 요청의 감사 영수증이므로 직접 수정하지 않는다. 내용을 바꾸려면 새 세션을 실행한다. snapshot과 자유질문은 외부 전송 직전, 질문은 SQLite 저장 직전에도 credential redaction한다. `answer`, 각 `rationale`, 각 `note`는 서로 독립적으로 객관 데이터 anchor와 I-13 문구를 검사한다. 세션 삭제는 같은 transaction에서 아직 활성인 자식 제안을 동일 tombstone 시각으로 소프트 삭제하고, 복구는 그 시각이 같은 자식만 되살린다. 삭제된 부모의 제안은 조회·무시·적용할 수 없다. 설정에서 삭제 세션을 페이지 단위로 복구하며, 표시 중인 최대 50개 세션의 제안만 조회한다. 저장·동기화된 제안도 표시 직전과 적용 transaction 안에서 같은 규칙을 다시 검증한다.
- 대안: 분석 원문 직접 수정, 즉시 물리 삭제, 부모만 숨기고 제안 유지, 생성 시점 검증만 신뢰.
- 근거: 감사 영수증을 수정하면 실제 외부 전송 내용과 이력이 달라진다. 동일 tombstone과 이중 검증은 I-8의 복구 가능성, §9.1의 투명성, I-13의 출력 경계를 함께 지킨다.
- 결과 및 위험: 소프트 삭제 데이터는 복구·전체 내보내기·동기화를 위해 로컬과 원격에 남는다. 법적 삭제나 저장 공간 회수를 위한 영구 삭제는 상용화 개인정보 정책과 별도 승인 범위다.
- 되돌림/재검토 조건: 규정상 즉시 영구 삭제가 필요하거나 세션 수가 로컬 조회 성능을 해칠 때 보존 기간·purge·pagination AC를 별도로 추가한다.
- 관련 불변조건/AC: I-6, I-8, I-13, AC-27~AC-35
- 대체 관계: ADR-016의 투명한 snapshot 보관 결정을 유지하면서 수명주기와 재검증 경계를 보완

### ADR-022 — 직렬화된 로컬 알림 조정과 비공개 Android 채널

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: snapshot refresh와 설정 저장이 겹치면 같은 알림을 중복 예약할 수 있었고, 예약 뒤 ID 저장 실패·전체 초기화는 추적할 수 없는 OS 알림을 남길 수 있었다. `오늘 종료 후 항상 받기=끔`은 내일 1회만 예약해 앱을 다시 열지 않으면 이후 매일 알림이 끊겼다. 기존 Android v2 채널은 `PUBLIC` 잠금화면 정책을 생성 뒤 유지한다.
- 결정: close/item reconciliation과 test/timer/reset 예약을 단일 queue로 직렬화하고 날짜·종료 상태·관련 설정·활성 항목/일정 fingerprint가 같은 refresh는 재예약하지 않는다. 예약 ID 저장 실패 시 새 OS 예약을 보상 취소한다. 전체 초기화는 OS 예약 ID를 수집해 DB reset transaction의 `notification_cleanup_pending`에 원자 저장한 뒤 취소하며, 성공한 뒤에만 manifest를 비운다. 취소 실패·중간 종료와 종료된 타이머의 남은 ID는 다음 reconciliation에서 재시도한다. 오늘이 종료됐고 항상 받기가 꺼졌으면 다음 30일의 one-off 알림을 미리 예약하고 앱이 열린 날짜마다 horizon을 갱신한다. 그 밖에는 daily 반복을 유지한다. Android 채널은 새 `daily-records-v3`와 `PRIVATE` 잠금화면 가시성을 사용한다. 타이머 행과 최근 항목 설정은 한 SQLite transaction으로 저장한다.
- 대안: 모든 refresh에서 전량 재예약, 내일 1회만 예약, 기존 PUBLIC 채널 재사용, 알림 오류로 핵심 기록 rollback.
- 근거: OS 예약과 SQLite 식별자의 일관성을 높이면서 알림 실패가 I-7의 핵심 기록을 막지 않게 한다. 새 채널 ID는 이미 생성된 Android 채널 속성이 코드 변경만으로 바뀌지 않는 문제를 피한다.
- 결과 및 위험: 앱을 30일 넘게 한 번도 열지 않으면 종료일 뒤 rolling horizon이 소진될 수 있다. Phase 4S에서 Android 장기 재예약과 iOS 예약 수 제한을 실기기로 검증하고, 무기한 보장이 필요하면 플랫폼별 background scheduler를 승인한다.
- 되돌림/재검토 조건: 실기기에서 중복·누락·배터리 영향·플랫폼 예약 상한이 재현되거나 30일 무실행 보장이 제품 요구가 될 때.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-13, AC-14, AC-31, AC-34
- 대체 관계: ADR-003의 알림 저장 비차단 원칙을 유지하면서 예약 수명주기와 개인정보 가시성을 강화

### ADR-023 — 단일 앱 데이터 manifest와 client/server 동기화 계약

- 날짜: 2026-09-04
- 상태: 승인
- 맥락: 전체 JSON/CSV export, 전체 초기화, seed 교체, 모바일 동기화 schema와 서버 RPC allowlist가 서로 다른 하드코딩 목록을 사용하면 새 테이블·설정 추가 시 한 경로가 조용히 누락될 수 있다.
- 결정: 19개 로컬 앱 데이터 테이블은 단일 `APP_DATA_TABLE_NAMES` tuple로 선언하고 export와 FK 역순 reset을 파생한다. 실제 migration 뒤 `sqlite_schema`와 exact set이 같은지 통합 테스트한다. seed 교체 13개 테이블은 분석 이력을 의도적으로 제외하는 별도 정책 tuple로 둔다. 모바일 16개 sync table·11개 setting key는 최신 서버 RPC SQL allowlist와 계약 테스트에서 순서까지 일치시킨다. 과거 migration은 수정하지 않는다.
- 대안: 각 기능의 문자열 목록 유지, migration에서 TypeScript 생성, 모든 테이블을 seed 교체 대상으로 취급.
- 근거: 한 선언에서 export/reset을 파생하면 I-8 내보내기와 초기화 누락을 즉시 막고, SQLite·RPC exact-set 테스트는 서로 다른 런타임 경계를 생성 도구 없이 검증한다. seed 교체는 전체 초기화와 의미가 달라 명시적 subset이 더 안전하다.
- 결과 및 위험: 새 테이블·동기화 설정은 typecheck 또는 계약 테스트를 함께 갱신해야 한다. Supabase의 과거 migration은 감사 이력으로 남고 최신 hardening migration만 현재 client 계약과 비교한다.
- 되돌림/재검토 조건: schema가 여러 앱 버전을 동시에 지원해야 하거나 migration 생성기를 도입할 때 version별 manifest로 확장한다.
- 관련 불변조건/AC: I-7, I-8, I-12, AC-15, AC-19~AC-22, AC-31, AC-34, AC-35
- 대체 관계: ADR-008·ADR-018·ADR-019의 schema/repository/재현성 결정을 구체화

### ADR-024 Server-owned AI model policy

- Date: 2026-09-05
- Status: accepted
- Decision: Use OpenAI initially. Resolve `standard` and `deep` only in the Edge Function from server configuration; use Terra/medium and Sol/high as the initial policy. Reserve Luna for preprocessing, never final analysis.
- Consequence: The app persists server-resolved provider/model/effort/usage/cost/response ID/timing per analysis session, without embedding a production key or routing on model IDs. Provider adapters retain a common result contract for later evaluation of a secondary provider.

### ADR-025 — 실행 우선 두 탭과 기존 기능의 하위 진입

- 날짜: 2026-09-06
- 상태: 채택 / Phase 5 구현·게이트 통과
- 결정: Mobbin의 Tiimo `Completing a task` 5화면을 유일한 주 레퍼런스로 삼고, 합성 데이터 Figma Quiet Routine 4화면으로 번역했다. 오늘/기록 2탭, 유휴 시작의 할일 시트, 상시 `오늘의 할일 확인` 버튼, 실행 중 복원으로 핵심 루프를 만들었다. 기존 주간·계획·프로젝트·분석·설정은 기록의 더보기로 이동하고 기능·숫자·데이터는 유지한다.
- 근거/대안: 기존 5탭/다중 카드 첫 화면과 모든 기능 삭제 양쪽을 검토했다. 여러 앱의 장점을 임의 조합하지 않고 Tiimo의 선택→실행→종료 연속성만 채택했으며 브랜드·문구·그래픽·체크리스트·진행률·4탭·FAB는 배제했다. 출처·관찰의 한계와 Figma 링크는 `design-research.md`에 기록한다.
- 결과 및 위험: 공통 Sheet에서 focus/Android back/키보드/스크롤/큰 글씨를 처리하고 실기기 핵심 흐름을 통과했다. P5는 기존 경과 타이머 의미를 유지하며 P6 countdown·초과·pause/resume은 구현하지 않았다.
- 관련 불변조건: I-1, I-2, I-9
- 대체 관계: 과거 화면 배치와 AC-6의 합계 위치만 대체. 도메인 기능 삭제 아님.

### ADR-026 — entries 확장과 영속 타이머 상태

- 날짜: 2026-09-06
- 상태: 명세 채택 / 구현 미착수
- 결정: 새 sessions 원장을 만들지 않고 entries에 timer/manual 출처 및 목표·구간·누적 ms·state/revision을 추가한다. source의 기존 의미는 보존한다. 단일 관리 타이머, operation ID/조건부 transaction, 저장 후 OS 알림 조정으로 실행한다. Q-014에 따라 목표 후 계속 측정하며 종료 때 실제 분을 확정한다.
- 근거/대안: source를 timer/manual로 바꾸거나 분 tick을 누적하면 기존 sync/AI/export와 충돌하고 앱 종료 시 시간이 어긋난다. 원장 일원화는 집계/수정/삭제 경로를 재사용한다.
- 결과 및 위험: SQLite v6 보존 upgrade, 기존 복수 열린 entry의 사용자 정리, 시계 변경의 한계 설명, 날짜 helper 통합이 필요하다. OS 강제 중지/전원 꺼짐의 정시 알림은 보장하지 않는다.
- 관련 불변조건: I-1, I-7, I-8
- 대체 관계: ADR-003의 복수 타이머 허용은 새 관리 세션에 대해 SPEC §18로 대체. 기존 행을 삭제하지 않는다. ADR-022의 알림 cleanup 원칙 유지.

### ADR-027 — 일일 계획 버전과 동기화 버전 경계

- 날짜: 2026-09-06
- 상태: 명세 채택 / 구현 미착수
- 결정: daily_plan_versions에 실제 생성 당시의 오늘 계획을 append-only 저장한다. 과거 일정에서 확인할 수 없는 과거 계획은 미확인으로 표시한다. entries 새 필드/일일 계획 table은 전체 manifest·export/reset·codec·trigger·RPC와 함께 도입한다. 구 client가 확장 행을 덮어쓰지 못하도록 서버 protocol 경계를 먼저 준비한다.
- 근거/대안: 최신 schedule로 과거 계획을 재계산하면 그날의 계획이 변한다. client만 nullable 필드를 추가하면 구 client의 전체 row push가 새 필드를 지울 수 있다.
- 결과 및 위험: 공개 서버와 앱의 배포 순서·구 client 차단·오프라인 작성 지속을 실제 계약 테스트로 입증해야 한다. 다기기 동시 작성은 Q-011 해결 전 지원 완료로 표시하지 않는다.
- 관련 불변조건: I-2, I-7, I-8
- 대체 관계: ADR-023의 단일 manifest 원칙 유지, 버전별 호환 계약으로 확장.

### ADR-028 — 총액 예산 안의 공개 변형과 운영 준비

- 날짜: 2026-09-06
- 상태: 사용자 확정 / 구현 미착수
- 결정: Android public-local을 첫 공개 변형으로 확정하며 개인용 sync/AI는 유지한다. 공개판의 사용자 데이터는 기기 로컬에만 두며 개인 Supabase/AI 설정을 포함하지 않는다. P7에서 복구/import·진단·서명·정책을 준비하고 P8에서 필요한 사전 리팩터 후 사용자의 공개 지시가 있을 때 배포한다.
- 근거/대안: 80,000원은 레퍼런스·MCP 예산이며 월 운영비가 아니다. Supabase 무료 기본 SMTP와 단일 owner AI를 그대로 공개 계정 서비스로 제공할 수 없다. 가격 근거·한계는 SPEC §21/BUDGET을 따른다.
- 결과 및 위험: 계정 없는 공개판에는 자동 클라우드 백업/AI가 없다. 로컬 JSON 복구를 먼저 구현해야 한다. 사용자 기기 삭제 전 백업 필요성과 운영 정책을 제품 안내로 제공한다. 등록·본인 확인·tester 확보·심사는 실제 사용자/외부 서비스 단계다.
- 관련 불변조건: I-7, I-8, I-14
- 대체 관계: 공개 스토어 비목표/F-005 일부를 최신 SPEC으로 대체. 결제·구독·광고·텔레메트리 범위를 추가하지 않는다.

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
