# mobile/AGENTS.md — Expo 앱 세부 규칙

루트 `../AGENTS.md`와 `../docs/SPEC.md`를 적용한다. 이 파일은 별도 제품 범위를 만들지 않는다.

## 버전

- 현재 Expo 57/RN 0.86.3/React 19.2.3/Reanimated 4.5.1/Worklets 0.10.1이다. 실제 `package.json`과 lockfile을 확인한다.
- 사용 범위의 Expo SDK 57 문서를 확인하고 latest 예제가 설치 버전과 같다고 가정하지 않는다.
- npm/`npx expo`만 사용한다. native 패키지 변경은 호환 확인과 새 release build·실기기 검증이 필요하다.

## 책임

- `src/app/`: route와 화면 조합. 오늘/기록 두 탭, 보조 기능 Stack, auth/notification URL·뒤로 가기 보존.
- `src/features/`: controller·view-model·draft. refresh로 입력을 덮지 않는다.
- `src/components/`, `src/theme/`: 의미 부품/토큰. DB/Auth/API import 금지. sheet의 focus/back/keyboard/safe-area 공통 처리.
- `src/domain/`: 순수 시간/날짜/집계. now/clock을 전달받아 테스트한다.
- `src/data/`: SQL/transaction/migration/row validation. 최신 row/revision 확인, SQL에 사용자 값 보간 금지.
- `src/services/`: 알림/auth/export/sync adapter. 직렬 queue/보상 취소 유지, 비밀값 UI 전달 금지.
- `src/sync/`: 현재 schema/merge 계약. 서버 allowlist/trigger/codec exact-set 동반 검증.
- `src/analysis/`: 현재 개인용 package/proposal. AI 고도화나 사용자 서술을 섞지 않는다.

## 구현·검증

- 현재 타이머는 경과 표시와 종료를 제공한다. 미구현 제어를 빈 버튼이나 가짜 기능으로 노출하지 않는다.
- rendering tick으로 전체 AppSnapshot refresh나 DB 쓰기를 하지 않는다.
- records 페이지의 계정·항목 소계와 날짜 합계를 혼동하지 않는다.
- 새 핵심 화면은 48dp, 200% 글씨, dark, TalkBack, Reduce Motion, 키보드 상태를 변경 범위에 맞게 확인한다.
- 일반 UI는 typecheck/lint와 관련 테스트, 데이터·동기화 변경은 관련 단위·저장·migration 보존·계약 테스트를 실행한다.
- 실제 타이머·알림·설치는 큰 기능 묶음 종료 시 Android development build에서 핵심 흐름을 한 번 확인하고 build/OS/기기를 기록한다.
