# P5 Visual v2 디자인 개발 파이프라인

이 문서는 P5 Today-first의 동작 계약을 바꾸지 않고, 레퍼런스에서 Figma·코드·실기기까지 시각 품질을 잃지 않기 위한 작업 절차다. 제품 동작은 `../SPEC.md`가 우선한다.

## 현재 판정

- 상태: `Phase 0 ready / implementation blocked`
- 앱 기능 코드·SQLite schema·Supabase/sync 계약: 변경하지 않음
- 개발 빌드: 시작하지 않음
- Figma: `Pro / Full`, 파일 `Be9DsWkov1vg3ptUFPpj6F` 읽기·쓰기 가능
- Mobbin: flow·screen 조회 가능
- Claude Cowork: 기존 읽기 전용 검수 세션 완료, Figma connector 1개 확인
- Android: ADB 기기 연결 확인. 현재 잠금 상태라 개인 데이터 화면은 캡처하지 않음
- 시각 자동화: Temurin JDK 17과 Maestro CLI 2.10.0을 사용자 로컬 전용 경로에 설치하고 remote analytics를 끄는 실행 래퍼를 준비함

`P5 Approved · Foundations/Components/Screens`는 파일 안에 실제 존재하지만 구현 source of truth가 아니다. 계정 그룹의 자식이 잘리고, 컴포넌트 표본이 불완전하며, 현재 제품 계약과 다른 4탭이 포함되고, 상용 공개판 수준의 밀도·위계가 검증되지 않았다.

## 레퍼런스 역할 승인 후보

| 역할 | 근거 | 채택 | 배제 |
|---|---|---|---|
| 시각 master | [timespent · Creating a recurring plan](https://mobbin.com/flows/4b25d929-de2b-4d37-a017-03c13d9f23fb) | 얕은 surface, compact spacing, 명확한 type hierarchy, row/control의 낮은 시각 무게 | 캐릭터, 장식, 문구, 화면 복제, OOS에 맞지 않는 탭 크기 |
| interaction master | [Tiimo · Completing a task](https://mobbin.com/flows/5b4c73db-d619-4f47-a666-5663d1b65ce3) | Today에서 항목 맥락이 선택·실행·완료까지 이어지는 구조 | 브랜드 색, 4탭, 축하 효과, 체크리스트 |
| Records/Dark 보조 | [Equinox+ · Completed daily activities](https://mobbin.com/flows/e5c30bf9-efe1-4346-a86e-fcecfbc35e4f) | 날짜→그룹→상세 위계, 거의 단색인 dark surface | 피트니스 브랜드 요소, 미디어 카드 복제 |
| Navigation | OOS 소유 | 오늘·기록 2탭, safe-area 분리, 낮은 footprint | reference 앱의 탭을 확대·축소해 그대로 사용 |

timespent 캡처의 최하단 검은 띠는 Mobbin 표식이다. 그 위의 흰색 분할 pill은 실제 timespent UI지만 OOS 내비게이션의 source of truth는 아니다.

이 표는 Phase 0에서 검증된 제안이며 `p5-visual-v2.gate.json`의 `referenceRoles`가 승인되기 전에는 Figma 쓰기 작업에 사용하지 않는다.

## source of truth 순서

1. `SPEC.md`의 제품 동작·불변조건
2. 위 역할표의 실제 Mobbin flow
3. 사용자 승인된 Figma `P5 Visual v2` frame과 연결된 local variables/components
4. Figma frame의 `get_design_context`와 같은 시점의 screenshot
5. 구현 코드
6. 고정된 합성 데이터 상태의 앱 screenshot

현재 코드 토큰을 Figma로 복사한 뒤 다시 코드로 내리는 순환은 금지한다. 기존 토큰은 gap 분석의 입력일 뿐 새 시각 기준이 아니다.

## Figma Phase 1 범위

새 페이지 `P5 Visual v2`를 만들고 다음 순서로 구축한다.

1. Foundations: Light master, Dark mode, type scale, spacing, radius, elevation, icon weight, visible control과 48dp hit area의 분리
2. Components: App bar, account header, Today row, current session, compact action sheet, button hierarchy, ledger row, OOS 2-tab navigation
3. Core frames: Today default, item actions, running, paused, Records
4. Edge variants: switch conflict, direct record while running, no-plan/over-plan, long name/large text, Dark
5. Prototype: Today → item actions → running → paused/resumed → end → Today/Records 반영

모든 데이터는 합성값을 사용한다. frame마다 auto-layout, scrolling frame, safe-area, 실제 text wrapping을 정의한다.

## 시각 승인 rubric

- 앱 진입 첫 viewport에서 날짜, 오늘 실제/남은 시간, 최소 한 계정의 항목이 보인다.
- 각 상태의 1차 행동 하나가 먼저 읽히고 보조 행동은 시각적으로 경쟁하지 않는다.
- 현재 실행은 목록보다 한 단계만 강조하며, paused·over-plan을 경고색으로 판정하지 않는다.
- 48dp hit area 때문에 아이콘·버튼·pill이 커 보이지 않는다.
- 하단 2탭과 Android 시스템 내비게이션이 하나의 두꺼운 띠로 합쳐 보이지 않는다.
- Light의 따뜻한 저채도 surface와 단일 accent가 주 시각안이고, Dark는 별도로 같은 위계를 유지한다.
- 긴 계정·항목명, 큰 글씨, TalkBack 순서에서 정보·행동이 사라지지 않는다.
- 브랜드·문구·캐릭터·화면 배치를 복제하지 않는다.

고정 pixel-match 비율은 합격 기준으로 사용하지 않는다. screenshot 자동 비교는 동일 기기·해상도·font scale·theme의 drift 탐지 보조수단이며, 위 rubric과 사용자·읽기 전용 검수를 대체하지 않는다.

## 검수 순서

1. Figma core/edge frame마다 design context와 screenshot을 같은 revision에서 수집한다.
2. Codex가 SPEC·레퍼런스 역할·rubric과 대조해 자체 검수한다.
3. Claude `oos-visual-reviewer`에는 Mobbin 링크, Figma screenshot, 구현 뒤 앱 screenshot 세 묶음을 제공한다. Claude는 수정하지 않고 차이만 심각도 순으로 반환한다.
4. 사용자 승인 뒤에만 `p5-visual-v2.gate.json`의 Figma 승인 상태와 node id를 갱신한다.
5. `npm run design:gate -- --stage implementation` 통과 뒤 화면 단위 코딩을 시작한다.
6. 구현 뒤 typecheck/lint와 관련 테스트를 우선하고, 큰 묶음 종료 때만 전체 verify와 개발 빌드를 수행한다.
7. 실기기 캡처는 개인 데이터를 저장소·Figma·Claude로 보내지 않는다. 검수용 합성 데이터 또는 가림 처리된 화면만 사용한다.

## Maestro 경계

- 실행: `mobile/`에서 `npm run maestro -- --version` 또는 `npm run maestro -- <flow>`
- runner는 `MAESTRO_CLI_NO_ANALYTICS`와 분석 알림 비활성 값을 설정한다.
- 개인용 standalone이 설치된 실기기에서는 `clearState`를 절대 사용하지 않는다.
- golden 생성과 `assertScreenshot` 도입은 Figma 승인 뒤 별도 합성 데이터 emulator/test build에서만 한다.
- EAS Maestro job은 alpha이며 원격 빌드·과금·GitHub 연결이 필요할 수 있으므로 이번 로컬 디자인 환경의 필수 조건이 아니다.

## Phase 0 종료와 다음 승인점

Phase 0의 도구·연결·문서·검수 runner는 준비됐다. 다음 단계는 Figma 쓰기 작업이다. `P5 Visual v2` Foundations/Components/Core frames를 만든 뒤 screenshot을 사용자에게 먼저 보여주고, 승인 전에는 앱 코드와 개발 빌드로 넘어가지 않는다.
