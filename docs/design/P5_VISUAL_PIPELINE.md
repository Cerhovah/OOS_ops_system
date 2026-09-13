# P5 Visual v3 UI/UX 설계·구현 파이프라인

이 문서는 v0.6.0의 기능·데이터 구조를 유지하면서 Today의 정보 밀도, 조작 비용, Android navigation 구분을 다시 설계하는 현재 파이프라인이다. 제품 동작은 `../SPEC.md`가 우선한다.

## 현재 판정

- 상태: `제품 기획·Figma v3·사용자 승인 완료 / Claude 읽기 전용 조건부 승인 사항 교정 완료 / implementation gate open / device comparison pending`
- 현재 설치 앱: `0.6.0(13)` P5 Visual v2 personal standalone
- 보존할 것: 계정→항목 구조, 오늘 항목 선택, 직접 기록, 단일 running timer, 여러 paused session, 재시작 복원, 기록 원장과 더보기 기능
- 바꿀 것: 반복 지표, 중첩 카드, 시작까지의 불필요한 선택, 현재 세션 중복, 내비게이션 아이콘과 시스템 bar의 시각 분리
- 바꾸지 않을 것: SQLite v6, repository 쓰기 의미, Supabase/sync 계약, applicationId/signing, 개인 데이터
- 기존 `P5 Visual v2` Figma와 gate는 구현 이력·전후 비교 자료이며 새 구현 source of truth가 아니다.

## 제품 목표

Today가 첫눈에 답할 질문은 하나다.

> 지금 무엇을 시작하거나 이어갈 것인가?

사용자는 앱 실행 뒤 목록을 훑고, 원하는 항목의 재생 버튼을 눌러 바로 시작하며, 실행 중에는 같은 화면에서 일시정지·재개·종료·다른 항목 전환을 처리한다. 계획·실제·차이의 전체 설명은 Records와 상세에 남긴다.

`One thing per One page`는 기능을 한 화면에 하나만 두라는 뜻이 아니라, 화면의 주 질문과 1차 행동을 하나로 제한하는 기준이다.

| 화면 | 한 가지 사용정보 흐름 | 1차 행동 |
|---|---|---|
| Today | 지금 시작하거나 이어갈 일 | 재생 또는 일시정지/재개 |
| Records | 선택 날짜에 실제로 기록된 내용 | 기록 확인·수정 |
| 더보기 | 들어갈 기능 선택 | 한 route 선택 |
| 계정/항목 관리 | 기록 구조 설정 | 저장 |
| 주간 시간 분배 | 계정별 주간 상한 배분 | 계획 버전 저장 |
| 지표 | 선택 날짜·주의 사실적 집계 확인 | 날짜 또는 주 선택 |
| AI 분석 | 선택한 데이터로 분석 요청·확인 | 분석 실행 |

## 레퍼런스 역할

| 역할 | 근거 | 채택 | 배제 |
|---|---|---|---|
| Today 시각 master | 사용자 제공 Rubit Today 화면 | 평면 목록, 짧은 보조 문구, 행 끝 단일 동작, 한 viewport의 높은 실제 항목 밀도 | 레벨·보상·캐릭터·광고·4탭·큰 FAB·완료 취소선 남용 |
| 목록 보조 | [Todoist compact task list](https://mobbin.com/screens/7ff218cf-1ddd-47ee-9123-72535e5f9283) | 그룹을 타이포와 여백으로 구분, 제목 우선, 제한된 metadata | 여러 색 아이콘·날짜·tag를 한 행에 누적 |
| 흐름 보조 | [Tiimo · Completing a task](https://mobbin.com/flows/5b4c73db-d619-4f47-a666-5663d1b65ce3) | 현재 시간 맥락, Today→실행→종료 뒤 같은 목록 복귀 | 브랜드 색·축하 효과·체크리스트·4탭 |
| 정보 감축 rubric | Toss의 `One thing per One page` | 첫 질문·1차 CTA·다음 상태를 즉시 구분 | 상용 화면·문구·브랜드 복제 |

timespent와 Equinox+는 P5 Visual v2의 Records/Dark 비교 근거로만 남긴다. v3 Today의 화면 밀도나 navigation을 결정하지 않는다.

## Today 정보 소유권

같은 파생값을 여러 계층에 반복하지 않는다.

| 계층 | 기본 노출 | 접거나 상세로 이동 |
|---|---|---|
| 전체 | 오늘 총 기록, 오늘 항목 수 | 전체 계획·실제·차이 |
| 계정 | 계정 실제 / 공용 상한 | signed 차이와 이력 |
| 항목 | 이름, 오늘 실제, running/paused 상태 | 항목 계획·차이·세션 목록 |
| 현재 세션 | 계정·항목, 경과시간, pause/resume/end | 시작시각·세부 원장 |

- 계정 공용 상한은 오늘 선택된 하위 시간형 항목의 계획 합계로 파생한다.
- `초과`, `계획 없음`, `기록 없음`은 상단·계정·항목에 반복하지 않는다.
- 계획이 없는 계정은 필요할 때 계정 header에만 `자유 기록`으로 표시한다.
- 기록이 없는 실행 가능 항목은 별도 `기록 없음` 문구 없이 재생 동작으로 상태를 설명한다.
- Today 항목 행은 최대 두 줄과 trailing 동작 하나를 기본으로 한다.
- 정확한 계획·실제·signed 차이와 단위는 상세와 Records에서 유지한다.

## Today 상태별 화면

### Idle

1. 앱 bar: `오늘`, 현재 날짜
2. 한 줄 요약: 예) `3시간 20분 기록 · 5개 항목`
3. 계정 header: 예) `편입 공부 2시간 10분 / 4시간`
4. 평면 항목 행: 제목, 선택적 보조 정보, trailing 재생
5. 목록 끝 보조 동작: `오늘 항목 추가`, `오늘 돌아보기`

첫 viewport는 적어도 한 계정의 실제 항목을 보여야 한다. 빈 현재 실행 placeholder와 큰 summary card는 두지 않는다.

### Running

- 현재 세션은 Today 상단의 유일한 강조 표면이다.
- 계정·항목, 초 단위 경과, 1차 `일시정지`, 2차 `기록 종료`만 먼저 보여준다.
- 전체 요약은 한 줄로 접거나 현재 세션에 흡수한다.
- 아래 목록의 동일 항목에는 같은 시간·상태를 다시 크게 표시하지 않는다.
- 목록은 남겨 다른 항목으로 전환할 수 있게 한다.

### Paused

- 상단 현재 세션은 경과 증가를 멈추고 1차 `다시 시작`, 2차 `기록 종료`를 보여준다.
- 다른 paused session은 해당 항목 행의 작은 중립 상태로만 표시한다.
- warning 색이나 실패 문구를 쓰지 않는다.

### Start, switch, direct record

- 시간형 항목의 trailing 재생은 다른 running session이 없을 때 즉시 시작한다.
- 행 본문은 항목 상세와 `직접 기록`으로 이동한다.
- 다른 session이 running이면 `현재 기록을 일시정지하고 새 항목 시작`과 `취소`만 확인한다.
- 확인 시 기존 session은 종료되지 않고 paused로 남는다.
- 직접 기록 중 running timer는 계속 흐르며 이를 짧고 중립적으로 알린다.

### Today selection and reflection

- 예정 항목과 사용자가 추가한 오늘 항목을 한 목록에 합친다.
- `오늘 항목 추가`는 목록 뒤의 보조 동작이며 시간형 항목의 완료 checkbox가 아니다.
- `오늘 돌아보기`는 기존 Today close snapshot/note를 사용하는 재배치다. 사실적 당일 합계와 한 개의 메모 입력면만 제공한다.

## 시각 시스템

- Light: warm off-white 배경, 밝은 주 표면, 짙은 neutral text, 저채도 eucalyptus accent 하나
- Dark: near-black neutral 배경과 같은 의미 토큰을 별도로 조정
- accent filled surface: 한 화면에서 현재 세션 또는 유일한 primary CTA 하나
- 계정 구분: 카드 중첩 대신 20~24dp section gap, header type, 선택적 hairline divider
- 항목: compact row, 제목 우선, metadata 한 줄 이하, 보이는 컨트롤 20~24dp, 실제 hit area 48dp 이상
- 아이콘: 한 vector family와 동일 stroke 사용. Unicode symbol·font glyph·임시 emoji 금지
- navigation: 전체 폭 OOS 2탭, 앱 bar와 Android system navigation 사이의 safe inset 분리, 상단 hairline, active icon/label만 accent
- 긴 이름과 큰 글씨는 숨기거나 말줄임으로 의미를 잃지 않는다. 필요한 행은 자연스럽게 높아지되 전체 화면의 고정 card 높이에 맞추지 않는다.
- 초과·일시정지는 중립 상태다. error 색은 저장 실패·권한 실패·데이터 손실 위험에만 사용한다.

## Figma v3 필수 frame

### Core

1. Foundations / icon and navigation system
2. Today idle / regular data
3. Today running
4. Today paused with another paused item
5. Switch confirmation
6. Item detail and direct record
7. Today item selection
8. Today reflection
9. Records return state

### Edge

1. no-plan account / over-plan detail
2. long account and item names
3. 200% font scale
4. completion/count/numeric/event item rows
5. empty Today and many-account scroll
6. Light/Dark
7. Galaxy 3-button and gesture-navigation safe area

핵심 Galaxy 기준 frame은 실제 검수 폭인 390dp와 합성 데이터로 만들었다. 360dp compact width는 별도 적응형 증거와 코드 검증 대상으로 유지하며, 어느 폭도 특정 기기 pixel 상수로 제품 코드에 고정하지 않는다.

## Figma v3 승인 기록

- 사용자 승인: 2026-09-13. 현재 `P5 Visual v3`를 구현 source of truth로 확정했다.
- Claude Cowork 읽기 전용 검수: `post-Figma / pre-implementation`, Blocker 없음, 조건부 승인.
- Claude가 찾은 계정 header와 항목 title의 13dp 시작축 차이는 Account Header의 왼쪽 거터를 13dp로 맞춰 교정했다. 우측 합계와 48dp 상세 hit area의 축은 유지했다.
- Paused current-session의 secondary action은 배경과 같은 표면색에 묻히지 않도록 semantic border 1dp를 추가했고, Light와 Dark paused proof를 모두 만들었다.
- Claude가 본 이전 revision의 23/24dp 비대칭은 최종 revision에서 좌우 24dp, 본문 342dp로 통일했다. 최종 node 검사에서 343dp 잔여 본문은 0개다.
- 긴 이름은 두 줄 자연 높이, sheet handle은 중앙, running action pair는 동일 폭과 8dp gap, 3-button navigation은 앱 탭 56dp와 OS inset 48dp 분리를 확인했다.

## 승인·구현 순서

1. 이 제품 기획과 reference 역할을 `p5-visual-v3.gate.json`에 고정한다.
2. Figma `P5 Visual v3` Foundations, components, core/edge frame과 prototype을 만든다.
3. 같은 revision의 design context와 screenshot을 수집한다.
4. Codex가 SPEC, 정보 소유권, 상태 전이, 접근성을 자체 점검한다.
5. Claude `oos-visual-reviewer`가 읽기 전용으로 밀도·위계·잘림·행동 경쟁을 검수한다.
6. 사용자가 Figma를 최종 승인한다.
7. `npm run design:gate -- --stage implementation`이 통과한 뒤 화면 단위로 구현한다.
8. typecheck, lint, 관련 Today/Records 테스트를 먼저 실행하고 큰 UI 묶음 종료 때만 전체 verify를 실행한다.
9. 합성 데이터 screenshot과 Galaxy 실기기에서 icon, safe-area, 첫 viewport 밀도, 핵심 고객여정을 대조한 뒤 release gate를 연다.

Figma 승인 전에는 앱 코드·dependency·APK를 반복 변경하지 않는다. 개인 기기 데이터와 screenshot은 Figma, Mobbin, Claude로 보내지 않는다.

## 현재 범위 밖

- Google/기기 Calendar OAuth와 일정 읽기·쓰기
- 직접 입력하는 별도 일일 account cap schema
- 새 산출물/checklist schema
- active/paused timer의 다중 기기 동기화
- 감정 점수·AI 회고·게임화

이 항목들은 현재 화면에 placeholder로도 노출하지 않는다. 서버·sync 계약 변경이 필요한 항목은 별도 명세와 서버 준비 승인 뒤에만 시작한다.
