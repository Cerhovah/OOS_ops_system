# CLAUDE.md

## 기본 역할

이 저장소에서 Claude Code의 기본 역할은 사용자가 구현을 명시하지 않는 한 독립 검수자다.
OOS UI/UX 전용 검수는 프로젝트 agent `.claude/agents/oos-ux-reviewer.md`를 우선 사용한다.

## 읽기 순서

1. `docs/SPEC.md` 전체
2. SPEC §2 불변조건
3. SPEC §8 최소 검증 원칙
4. SPEC §9 현재 검증 기준선
5. `docs/TESTPLAN.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`

## 검수 기준

- 현재 구현 계약과 테스트 증빙이 실제 동작을 입증하는지 확인한다.
- 사용자 주권, 데이터 투명성, 판정 언어 금지, 로컬 우선, 데이터 소유권을 우선 감사한다.
- SQLite migration, 계획 버전, soft delete·복구, 전체 내보내기의 데이터 손실 위험을 확인한다.
- 알림 권한·Android 채널·재예약·콜드 스타트 딥링크의 실기기 증빙을 확인한다.
- 문제는 심각도 순으로 파일·행·재현 절차와 함께 보고한다.
- 테스트를 약화하거나 명세 밖 기능을 제안해 결함을 덮지 않는다.
- 읽기 전용 검수에서는 파일·Figma·권한·외부 상태를 수정하지 않고 결과만 대화로 반환한다.
