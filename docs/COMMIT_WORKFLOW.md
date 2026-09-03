# Phase 커밋 워크플로

## 기본 원칙

Phase 종료를 사용자가 지시하면 에이전트가 검사·커밋·푸시까지 자동으로 수행한다. 사용자가 직접 긴 파일 목록이나 `git diff` 명령을 입력할 필요는 없다.

- 작업 시작 때 `main`과 `origin/main`, 작업 트리 상태를 확인한다.
- 기존 사용자 변경은 건드리거나 섞지 않는다.
- 전체 변경이 현재 작업에서 만든 것임을 확인한 경우에만 `git add -A`를 사용한다.
- `git diff --check`와 테스트가 실패하면 커밋하지 않는다.
- credential 값이 staged diff에 있으면 커밋하지 않는다.
- 원격이 앞서 있으면 강제 push하지 않고 `git pull --rebase origin main`으로 통합한다.

## 에이전트 자동 종료 절차

1. `git fetch origin main`과 `git status --short --branch`로 기준선을 확인한다.
2. 해당 Phase의 자동·원격·실기기 게이트를 수행하고 `docs/TESTPLAN.md`에 결과를 기록한다.
3. 변경 범위와 비밀값 부재를 확인한 뒤 전체가 현재 작업이면 `git add -A`로 stage한다.
4. staged whitespace·통계·credential 검사를 통과시킨다.
5. 아래 규칙으로 한 개의 주 커밋을 만든다. 문서가 구현·정리의 필수 증빙이면 같은 커밋에 포함할 수 있다.
6. `git pull --rebase origin main`, `git push origin main`을 수행한다.
7. `main...origin/main` 일치와 깨끗한 작업 트리를 사용자에게 보고한다.

## 커밋 유형

| 유형 | 사용 시점 | 예시 |
|---|---|---|
| `feat(phase-N)` | 해당 Phase의 새 기능 | `feat(phase-4): add grounded AI analysis` |
| `fix(phase-N)` | 해당 Phase 기능의 결함 보완 | `fix(phase-2): preserve offline writes and conflict logs` |
| `test(phase-N)` | 테스트만 변경 | `test(phase-4): cover proposal safety rules` |
| `docs(phase-N)` | 문서·증빙만 변경 | `docs(phase-4): record final analysis gate` |
| `refactor(phase-N)` | 사용자 동작 변화 없는 구조·중복 정리 | `refactor(phase-3): close repository cleanup gate` |
| `build(phase-N)` | 패키지·앱·EAS 구성 | `build(phase-4): add analysis runtime dependencies` |
| `chore(repo)` | Phase와 무관한 저장소 관리 | `chore(repo): align development workflow` |

현재 Phase 4 기능과 서버 adapter는 `feat(phase-4)`, 실제 응답 게이트 증빙만 별도 변경하면 `docs(phase-4)`를 기본으로 한다.

## 수동 복구용 최소 명령

에이전트가 실행할 수 없는 상황에서만 저장소 루트에서 다음 최소 명령을 사용한다. 작업 트리에 다른 변경이 섞였으면 `git add -A`를 사용하지 않는다.

```bat
cd mobile
npm run verify
cd ..
git add -A
git commit -m "feat(phase-4): add grounded AI analysis"
git pull --rebase origin main
git push origin main
```

`git diff`는 필수 입력 단계가 아니라 커밋에 섞인 변경·공백 오류·비밀값을 에이전트가 확인하는 안전 검사다.

## 금지 사항

- 현재 작업과 무관한 변경을 함께 stage
- 게이트 실패 상태에서 완료 커밋
- `.env*`, Supabase secret/service-role key, AI key 등 비밀값 stage
- 충돌을 무시한 force push
- 검사 우회를 위한 `--no-verify`
