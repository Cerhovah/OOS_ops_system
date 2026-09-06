# mobile/AGENTS.md — Expo 앱 세부 규칙

루트 `../AGENTS.md`와 `../docs/SPEC.md`를 적용한다. 이 파일은 별도 제품 범위를 만들지 않는다.

## 버전

- 현재 Expo 57/RN 0.86.3/React 19.2.3/Reanimated 4.5.1/Worklets 0.10.1. 실제 package.json과 lockfile을 확인한다.
- 코드를 쓰기 전에 사용 범위의 정확한 버전 문서 `https://docs.expo.dev/versions/v57.0.0/`를 읽는다. latest 예제가 설치 버전과 같다고 가정하지 않는다.
- npm/`npx expo`만 사용. native 패키지는 expo install 호환 확인과 새 release 빌드·실기기 검증이 필요하다.

## 책임

- `src/app/`: route와 화면 조합. 오늘/기록 두 탭, 보조 기능 Stack, 기존 auth/notification URL·뒤로 가기 보존.
- `src/features/`: today/timer/records controller·view-model·draft. refresh로 입력을 덮지 않는다.
- `src/components/`, `src/theme/`: 의미 부품/토큰, DB/Auth/API import 금지. 시트의 focus/back/keyboard/safe-area를 공통 처리한다.
- `src/domain/`: 순수 시간/날짜/집계. now/clock을 전달받아 테스트한다.
- `src/data/`: SQL/transaction/migration/row validation. 최신 row/revision 확인, SQL에 사용자 값 보간 금지.
- `src/services/`: 알림/auth/export/sync adapter. 직렬 queue/보상 취소 유지, 비밀값 UI 전달 금지.
- `src/sync/`: version별 schema/merge. 서버 allowlist/trigger/codec exact-set 동반 변경.
- `src/analysis/`: 현재 개인용 package/proposal. 새 타이머 집계와 연결되는 부분만 수정하고 AI 고도화를 섞지 않는다.

## 구현·검증

- DB commit 뒤 타이머 성공, 목표 후 계속 측정, pause 제외, 종료 재시도 no-op, 수동은 별도 행.
- P6에서 추가할 다음 버전 migration은 열린 타이머/삭제 기록/계획 이력을 보존한다. manifest/reset/export/bootstrap/mapper/sync를 함께 검사한다.
- rendering tick으로 전체 AppSnapshot refresh나 DB 쓰기 금지. records 페이지의 합계를 하루 전체 합계로 표시하지 않는다.
- P5는 경과 표시, P6 완료 뒤 남은/초과·pause 제어를 노출한다. 빈 버튼/가짜 기능으로 배포하지 않는다.
- 새 핵심 화면 48dp/200% 글씨/dark/TalkBack/Reduce Motion/키보드 상태 확인. 4색/5칩을 데이터 삭제 근거로 쓰지 않는다.
- 변경 범위에 맞춰 최소 검증을 한다. 일반 UI는 typecheck/lint와 관련 테스트, 데이터·타이머·동기화 변경은 관련 단위·저장·migration 보존 테스트와 Phase 종료 시 전체 `npm run verify`를 실행한다. 연타/재시도/transaction 실패, pause, 목표 전후, 자정/주 경계, 시계 변경, 재부팅, 알림 거부/중복/누락, stale 딥링크, 구 schema sync, soft delete/restore/export 중 변경 범위에 해당하는 항목만 검증한다.
- 실제 타이머/알림/설치는 Phase 종료 시 Android 개발 빌드에서 핵심 흐름을 한 번 확인하며 build/OS/기기를 기록한다. public에 personal 서버 설정이 자동 상속되지 않는지 P7에서 확인한다.
