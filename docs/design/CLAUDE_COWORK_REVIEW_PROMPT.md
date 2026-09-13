# Claude Cowork P5 Visual v2 검수 프롬프트

아래 본문은 `P5 Visual v2`의 pre-implementation 검수용이다. node URL은 2026-09-13 완성한 합성 데이터 frame으로 고정했으며 개인 데이터 screenshot은 첨부하지 않는다.

```text
OOS 전용 읽기 전용 시각 검수자 oos-visual-reviewer로 행동하세요.

이번 세션은 검수만 합니다. 파일, 코드, Figma node, connector, 권한, 외부 메시지를 만들거나 수정하지 마세요. 구현 코드를 쓰지 마세요. 합성 데이터만 다룹니다.

제품 기준:
- docs/SPEC.md §2, §3.2, §5, §7, §8
- docs/design/P5_VISUAL_PIPELINE.md

Reference 역할:
- timespent Creating a recurring plan: surface hierarchy, spacing density, typography hierarchy, row treatment, control visual weight
- Tiimo Completing a task: Today → 선택 → 실행 → 종료 → 목록/기록 반영의 맥락 연속성
- Equinox+ Completed daily activities: Records hierarchy와 절제된 dark mode
- Navigation: OOS 소유의 오늘·기록 2탭

검수 Figma:
- Today default: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=59-4
- Item actions: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=60-53
- Timer running: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=60-344
- Timer paused: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=60-412
- Records: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=61-2
- Edge variants: https://www.figma.com/design/Be9DsWkov1vg3ptUFPpj6F/OOS-Ops?node-id=41-7

이번에는 앱 코드와 빌드를 시작하지 않은 pre-implementation review입니다. Figma screenshot과 Mobbin 원본 flow를 대조하고, Figma ↔ 앱 차이는 `해당 없음 — 구현 전`으로 적으세요. 구현 뒤에는 같은 상태·viewport·theme의 합성 데이터 앱 screenshot을 별도 세션에 함께 제공합니다.

다음 형식으로만 답하세요.
1. 검수 종류: pre-implementation / implementation
2. 판정: 승인 / 조건부 승인 / 재설계 필요
3. Blocker, High, Medium, Low: node/화면, 관찰, 사용자 영향, 가장 작은 디자인 수정
4. Reference fidelity: timespent / Tiimo / Equinox+ / OOS navigation 각각 한 문장
5. Figma ↔ 앱 차이: 앱 screenshot이 있을 때만
6. 유지할 점: 최대 3개

고정 pixel 일치율로 합격시키지 말고, 문제가 없으면 억지로 만들지 마세요. 기능 범위를 넓히거나 P6 server/sync 변경을 제안하지 마세요.
```

## 첫 실행 결과 — 2026-09-13

- 세션: `https://claude.ai/cowork/cse_01F8g9hP6UdCEZVZTYSgc6dQ`
- 판정: `pre-implementation / 조건부 승인 / Blocker 없음`
- High: 큰 글씨에서 `N시간 M분 남음` 우측 수치 말줄임. Today Row trailing을 2줄·88px로 만들고 edge specimen을 `2시간 12분\n남음`으로 재검증했다.
- Medium: paused가 텍스트 외에는 running과 비슷함. paused timer 숫자를 semantic secondary text로 낮췄다.
- Medium: Today의 `+12분` 의미가 불명확함. 같은 무채색을 유지하며 `+12분 초과`로 보완했다.
- Low: switch conflict 시트의 합성 항목명이 배경 실행 항목과 달랐다. 구현에서도 동적 현재 항목명을 사용하도록 시트 설명을 `현재 기록을 일시정지하고 이 항목을 시작합니다.`로 고쳤다.
- 제한: Cowork 프로젝트에 저장소 폴더가 연결되지 않아 Claude는 SPEC 문구를 직접 열지 못했다. Codex가 동일 변경 뒤 SPEC §2·§3.2·§5·§7·§8과 재대조했고 제품·SQLite·P6 sync 계약 변경은 없음을 확인했다.
