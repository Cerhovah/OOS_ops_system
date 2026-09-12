# OOS Ops UI/UX 레퍼런스 감사

감사일: 2026-09-12

이 문서는 현재 UI가 만들어진 근거와 실패 지점을 기록한다. 구현되지 않은 제품 기능이나 출시 일정은 정의하지 않는다.

## 결론

과거의 주 레퍼런스 선택 자체보다 **레퍼런스를 코드로 번역한 과정**이 문제였다. Tiimo의 실제 장점은 오늘 할 일이 첫 화면에 보이고, 항목 맥락이 시작→집중→완료까지 이어지는 것이다. 현재 OOS는 목록을 `오늘의 할일 확인` 뒤에 숨기고, 공통 카드·보조 버튼을 거의 모든 기능에 반복해 그 장점을 잃었다. 미니멀리즘이 정보 위계 정리가 아니라 빈 공간과 기능 숨김으로 구현됐다.

따라서 현재 UI는 기능 검증을 통과했더라도 상용 루틴 앱과 비교할 수 있는 디자인 완성본으로 보지 않는다.

## 이전 작업이 막힌 위치

1. **Mobbin 호출 경로 부재**
   2026-09-06 당시 플러그인 설치는 확인했지만 Codex 작업에 전용 callable 도구가 노출되지 않았다. 실제 화면 연속성을 도구로 재확인하지 못한 채 구 Tiimo 5화면 링크와 공개 자료를 기준으로 결정했다.

2. **과거 Figma 쓰기 권한·한도 부족**
   당시 인증 상태는 `Starter / View`였고 첫 화면 뒤 일반 MCP 쓰기가 제한되어, 네이티브 Figma 컴포넌트와 프로토타입 대신 로컬 HTML 4화면을 capture해 전송했다. 2026-09-12에는 동일 계정이 `Pro / Full`로 확인되어 이 제약은 해소됐다.

3. **정적 4화면으로 범위를 축소**
   [기존 Quiet Routine Figma 파일](https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F?node-id=13-2)은 `Today idle`, `Task sheet`, `Timer running`, `Records ledger`만 담는다. 현재 지표 달력, 더보기 9개 진입점, 관리 화면, 긴 목록, 빈 상태, 오류·로딩·키보드 상태와 실제 전환이 없다.

4. **흐름보다 컴포넌트 외형을 먼저 구현**
   범용 `Card`, `AppButton`, `Section`, `Sheet`를 넓게 재사용하면서 화면별 1차 행동과 정보 밀도가 평준화됐다. 기능은 이동했지만 사용자가 무엇을 먼저 보고 눌러야 하는지 약해졌다.

5. **검증 기준의 한계**
   typecheck, lint, 자동 테스트, safe-area, 큰 글씨와 핵심 기능 흐름은 검증했지만, 첫 실행 이해도·반복 사용 속도·상태 전환의 자연스러움·상용 앱 대비 시각 완성도는 검증하지 않았다.

## 현재 도구 상태

- Mobbin 월 구독과 호출 도구가 정상이다. 2026-09-09 검색에서 최신 [Tiimo — Completing a task 9화면 흐름](https://mobbin.com/flows/5b4c73db-d619-4f47-a666-5663d1b65ce3)을 열람했다.
- 이 흐름에서는 오늘 목록이 첫 화면에 직접 노출되고, 항목 action에서 시작한 뒤 focus 화면에서도 루틴의 하위 맥락이 유지되며, 완료 항목이 원래 목록의 `DONE` 상태로 돌아온다.
- Figma 원격 연결과 파일 읽기·쓰기 조건은 정상이다. 2026-09-12 `whoami`에서 `이준혁의 팀`, `Pro / Full` 좌석을 확인했다.
- 기존 파일에는 로컬 variable, text/effect/paint style, component가 하나도 없고 정적 frame만 있다. Material 3와 Simple Design System은 연결돼 있으나 OOS 코드 토큰과 상태 API가 일치하지 않아 플랫폼 관례만 참고하고 OOS 로컬 자산을 만든다.

## 다시 설계할 때의 단일 기준

주 레퍼런스는 최신 **Tiimo `Completing a task` 9화면 흐름 하나**로 유지한다. 보조 레퍼런스는 역할을 제한해 두 개만 사용한다.

- [timespent — Creating a recurring plan](https://mobbin.com/flows/4b25d929-de2b-4d37-a017-03c13d9f23fb): 계획 진입과 반복 계획의 위계만 참고한다.
- [Equinox+ — Completed daily activities](https://mobbin.com/flows/e5c30bf9-efe1-4346-a86e-fcecfbc35e4f): 완료 후 원래 목록에 상태가 반영되는 복귀 패턴만 참고한다.

채택:

- 오늘 목록을 첫 화면에 바로 노출
- 항목명, 예정 시간, 상태, 시작 행동의 한눈에 보이는 위계
- 시작 전 항목 맥락이 실행 중에도 유지되는 전환
- 완료 뒤 원래 목록의 완료 상태로 복귀
- 짧은 action sheet와 명확한 destructive action 구분

OOS에 맞게 변환:

- Tiimo의 브랜드 색, 캐릭터, 축하 효과, 4탭, 체크리스트를 복제하지 않는다.
- OOS의 계정→항목 구조, 경과·남은 시간, 실제 기록 원장, 지표 달력과 두 탭을 유지한다.
- 미니멀은 빈 화면이 아니라 `오늘 할 일 → 현재 실행 → 오늘 기록`의 우선순위를 명확히 하는 방식으로 구현한다.
- 저장·동기화·AI·삭제의 기존 데이터 계약은 시각 재설계와 분리한다.

## 승인 wireflow

1. 앱 진입 → 오늘 날짜·실제/남은 시간 → 계정별 오늘 항목 목록을 바로 본다.
2. 항목 행 선택 → compact action sheet → `시작` 또는 `직접 기록`을 고른다. 행 선택만으로 시작하지 않는다.
3. 시작 → 목록 위의 현재 실행 카드에서 경과·남은 시간과 항목 맥락을 본다.
4. 실행 중 → `일시정지` 또는 `종료하고 기록`; 일시정지 중 → `다시 시작` 또는 `종료하고 기록`.
5. 부족한 상태에서도 종료 가능 → SQLite에 먼저 저장 → 오늘 합계·항목 행·기록 원장 갱신.
6. 기록 탭 → 날짜 이동 → 계획/실제/signed 차이 → 계정 소계 → 항목 원장을 확인한다.

## 독립 검수 구조

- 설계·명세·구현 책임자는 Codex다.
- Claude Cowork의 프로젝트 agent `oos-ux-reviewer`는 읽기 전용 검수자다. SPEC과 합성 데이터 Figma를 읽고 UX 흐름, 정보 위계, 접근성, 비판단 문구, P5/P6 경계의 결함만 심각도 순으로 보고한다.
- Claude는 로컬 파일과 Figma를 수정하거나 터미널·외부 메시지·권한 변경을 수행하지 않는다. 최종 반영 여부는 Codex가 근거와 함께 결정한다.

## 첫 Cowork 읽기 전용 검수 결과

2026-09-12 Claude Cowork가 연결된 Figma 파일을 읽기 전용으로 검사했다. 파일·Figma·connector·권한은 수정하지 않았다.

- 판정은 `재설계 필요`다. 기존 4개 화면 개념의 타이포·카드·내비게이션 톤은 참고할 수 있지만, Today·Task sheet·Timer의 정보 구조와 상호작용은 승인 계약을 충족하지 않는다.
- Blocker는 첫 화면의 오늘 목록 부재, 폐기하기로 한 `오늘의 할일 확인` 게이트 잔존, 항목 선택 즉시 실행, 일시정지와 남은/초과 표시 부재, paused 상태 부재, 다른 항목 시작 시 로컬 충돌 분기 부재다.
- High는 타이머 중 직접 기록 경로·중립 안내 부재와 계정→항목 그룹 및 계정 소계 부재다.
- Medium은 signed 초과 상태 예시 부재와 48dp hit area가 노드상 명확하지 않은 점이다. Low는 Task sheet와 Records의 합성 계획 합계가 서로 다른 점이다.
- 누락된 검수 상태는 `paused`, `over-plan`, `long-name`, `large-text`, `dark-mode`다. `running`과 `no-plan`만 확인됐다.
- P6의 서버·동기화 요소가 기존 화면에 섞인 흔적은 없다. 실행 중 다른 항목을 선택하는 분기는 서버 충돌이 아니라 P5 로컬 상태 전환으로 구현해야 한다.
- 유지 후보는 Records의 비판단적 signed 차이, `타이머 기록`/`직접 기록` 출처 표시, 계획 미달이어도 항상 가능한 `종료하고 기록`이다.

따라서 기존 정적 초안을 조금씩 수정하지 않고, 아래 착수 게이트에 따라 새 편집 가능 화면과 상태 변형을 먼저 만든다.

## 승인 Figma 재설계와 검수 통합

2026-09-12 기존 `P5 Quiet Routine` 페이지는 legacy 비교용으로 보존하고 다음 편집 가능 페이지를 같은 파일에 추가했다.

- `P5 Approved · Foundations`: 코드의 Light/Dark 의미 색상 13개, 간격 7개, 반경 4개, 타이포 크기 5개, 48dp hit target과 Roboto 텍스트 스타일 6개
- `P5 Approved · Components`: Button, Today Item Row, Current Session Card, Decision Sheet, Bottom Navigation 컴포넌트·상태 변형
- `P5 Approved · Screens`: Today 기본, 항목 동작, running, paused, 타이머 전환 충돌, 실행 중 직접 기록, no-plan/over-plan, Records ledger, 긴 이름·큰 글자·dark mode 9화면

첫 Claude Cowork 검수의 Blocker/High 항목을 화면별 종료 조건으로 사용했다. Today 목록은 sheet 밖에 직접 배치하고, 항목 탭 즉시 시작을 폐기했으며, pause/remaining/account hierarchy/switch conflict/direct-record notice를 모두 독립 상태로 만들었다. Records는 날짜·계획·실제·signed 차이와 계정 소계를 유지했다. Figma 자체 점검에서 화면당 주 행동, safe-area가 포함된 80dp 하단 내비게이션, 무계획·초과·다크·긴 이름 상태를 확인했다.

연결된 Material 3와 Simple Design System에서 필요한 Button/List item/Bottom sheet/Navigation bar 자산을 검색했지만 현재 파일에서 가져올 수 있는 일치 컴포넌트가 없었다. 따라서 외부 시각 API를 혼합하지 않고 코드 토큰을 로컬 변수와 Android code syntax로 옮겼다. Code Connect는 런타임 선행 조건이 아니므로 이번 P5 범위에 추가하지 않았다.

## 재설계 착수 게이트

코드를 다시 바꾸기 전에 다음 산출물을 한 번에 확인한다.

1. 현재 6-1의 실제 화면과 상태 목록을 캡처한다: 빈 오늘, 항목 있는 오늘, 선택 sheet, 실행 중, 종료 후, 기록, 지표 달력, 더보기, 대표 관리 화면.
2. 위 상태를 하나의 사용자 여정으로 연결한 low-fidelity wireflow를 만든다.
3. 유료 Full 좌석이 연결된 Figma에서 토큰, 텍스트 스타일, 행·버튼·sheet·탭의 component/variant를 먼저 만든다.
4. 360×800dp 기준의 편집 가능한 화면과 클릭 가능한 prototype을 만든다. 합성 데이터만 사용한다.
5. 첫 화면에 저장된 항목이 보이는지, 핵심 행동이 화면당 하나인지, 긴 이름·빈 상태·오류·키보드·200% 글씨에서도 흐름이 유지되는지 검수한다.
6. 사용자 승인 뒤 화면 단위로 코드에 옮기고, 각 묶음은 typecheck/lint와 관련 테스트만 수행한다. 데이터 계약을 바꾸지 않는 한 migration·원격 DB·APK 전체 검증을 반복하지 않는다.

## Figma 계정 상태

- 현재 계정·팀은 `Pro / Full`이며 추가 결제나 재연결이 필요하지 않다.
- Organization/Enterprise와 Code Connect는 이번 모바일 UI 재설계의 선행 조건이 아니다.
- 연결 상태가 바뀌어 쓰기 오류가 발생할 때만 같은 계정의 팀·좌석과 파일 권한을 다시 확인한다.

## 2026-09-13 시각 재정렬

Mobbin에서 합의한 세 흐름을 다시 호출해 실제 화면을 재확인했다. Tiimo `Completing a task`는 오늘 목록과 focus 상태가 같은 맥락을 유지하고 완료 항목이 원래 목록으로 돌아오는 구조, timespent `Creating a recurring plan`은 따뜻한 중립 배경 위의 그룹형 입력과 얕은 표면, Equinox+ `Completed daily activities`는 거의 단색인 화면에서 날짜·기록만 또렷하게 남기는 위계를 채택 근거로 삼았다.

코드에서는 기존의 포화 파랑 실행 카드와 갈색 일시정지 카드를 폐기하고 따뜻한 중립 배경·저채도 잉크 바이올렛 단일 강조색으로 바꿨다. Today의 항목별 독립 카드와 반복 테두리는 계정별 그룹 표면·얇은 행 구분선으로 합쳤으며, 현재 실행만 왼쪽 상태선이 있는 별도 표면으로 남겼다. 하단 탭은 Android 시스템 내비게이션을 포함한 고정 직사각형 띠에서, 동적 safe-area 위에 떠 있는 2분할 캡슐과 별도 본문 footprint 계산으로 바꿨다.

같은 날 Figma MCP로 파일 최상위 페이지를 다시 조회했을 때 확인된 페이지는 `P5 Quiet Routine` 하나뿐이었다. 과거 기록의 `P5 Approved · Foundations/Components/Screens` 세 페이지는 현재 파일에서 검증할 수 없으므로 실제 보존된 디자인 근거로 취급하지 않는다. 이번 시각 재정렬은 재확인한 Mobbin 화면, SPEC 계약, 코드 토큰을 근거로 하며 Figma 일치 완료를 주장하지 않는다.
