# DECISIONS

기술적 자율 결정과 근거를 ADR로 기록한다. 제품 철학, §2 불변조건, 사용자 권한, 데이터 소유권, 승인된 범위는 이 문서로 변경할 수 없다.

## 기록 원칙

- 폴더 구조, 상태 관리, 보조 라이브러리, 테스트 도구, 인덱스, 성능·접근성 구현처럼 §0.3 자율 영역의 선택만 기록한다.
- 사용자 선호나 제품 동작을 바꾸는 결정은 ADR로 대신하지 않고 `QUESTIONS.md`에 올린다.
- 명세에 이미 확정된 Expo/React Native, Expo Router, expo-sqlite, 로컬 알림, append-only 계획, 소프트 삭제는 ADR의 신규 결정이 아니다.
- 대체된 결정도 삭제하지 않고 `대체` 상태와 후속 ADR 번호를 남긴다.

## 결정 목록

### ADR-001 — Android 하단 탭의 글자 배율·안전영역 대응

- 날짜: 2026-08-23
- 상태: 승인
- 맥락: Android 실기기에서 시스템 글자 배율이 큰 경우 하단 5개 탭 라벨이 시스템 탐색 영역과 겹쳤다. 기존 고정 `paddingBottom: 8`은 React Navigation이 계산한 bottom safe-area padding을 덮어썼다.
- 결정: `useWindowDimensions().fontScale`과 `useSafeAreaInsets().bottom`으로 탭 높이를 계산하고, 고정 bottom padding을 제거한다. `tabBarAllowFontScaling`은 유지한다.
- 대안: 탭 글자 배율을 끄기, 고정 높이·여백 늘리기.
- 근거: 글자 배율을 끄면 §10.6의 폰트 크기 설정 존중을 어기고, 고정값은 기기별 시스템 탐색 높이와 접근성 배율을 안정적으로 처리하지 못한다.
- 결과 및 위험: 큰 글자에서 탭 바가 높아져 본문 세로 공간은 줄지만 라벨과 시스템 버튼은 분리된다.
- 되돌림/재검토 조건: 실기기에서 과도한 탭 높이 또는 다른 Android 탐색 모드의 여백 문제가 확인될 때.
- 관련 불변조건/AC: I-9, §10.6, AC-1
- 대체 관계: 없음

### ADR-002 — Node 24 내장 SQLite를 이용한 repository 통합 검증

- 날짜: 2026-08-23
- 상태: 승인
- 맥락: 기존 자동 테스트는 시드 배열과 순수 함수만 검사해 실제 migration SQL, transaction, soft delete, append-only 계획, 전체 테이블 내보내기의 회귀를 잡지 못했다. 환경 복구가 끝난 상태이므로 새 패키지 설치도 피해야 했다.
- 결정: 테스트 전용 어댑터에서 Node 24의 `node:sqlite` 메모리 DB를 Expo SQLite의 비동기 인터페이스로 감싸고, 제품 repository와 migration 코드를 그대로 실행한다. 제품 런타임은 계속 `expo-sqlite`만 사용한다.
- 대안: 모든 repository 경로를 mock 처리, 별도 SQLite 테스트 패키지 설치, 실기기 수동 검증에만 의존.
- 근거: 실제 SQLite 제약과 SQL을 실행하면서 의존성·앱 번들·운영 DB를 변경하지 않는다. 테스트마다 메모리 DB를 새로 만들어 사용자 기기 데이터에는 접근하지 않는다.
- 결과 및 위험: Node 24 실행 환경이 필요하며 Expo SQLite와 Node SQLite의 드라이버 차이는 실기기 최종 점검으로 보완한다.
- 되돌림/재검토 조건: Expo SQLite가 Node 환경 공식 테스트 드라이버를 제공하거나 SQL 동작 차이가 발견될 때.
- 관련 불변조건/AC: I-7, AC-2, AC-4, AC-7, AC-10, AC-11, AC-12, AC-15
- 대체 관계: 없음

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
