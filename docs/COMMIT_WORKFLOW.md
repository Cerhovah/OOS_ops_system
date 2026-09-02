# Phase 커밋 워크플로

## 목적

Phase 종료 시 구현, 결함 수정, 테스트, 문서 증빙을 검토 가능하게 남긴다. 기본은 검토한 경로만 stage한다. 다만 Phase 시작 때 작업 트리가 깨끗했고 `git status --short`의 모든 변경이 해당 Phase 작업임을 확인한 경우에는 간단한 `git add -A`도 허용한다.

## 커밋 유형

| 유형 | 사용 시점 | 예시 |
|---|---|---|
| `feat(phase-N)` | 해당 Phase의 새 기능 | `feat(phase-2): add local-first Supabase sync` |
| `fix(phase-N)` | 해당 Phase 기능의 결함 보완 | `fix(phase-1): restore schedules and KPI record ownership` |
| `test(phase-N)` | 테스트·fixture만 변경 | `test(phase-2): cover offline retry and conflicts` |
| `docs(phase-N)` | PLAN/TESTPLAN/증빙만 변경 | `docs(phase-1): record final Android gate` |
| `refactor(phase-N)` | 사용자 동작 변화 없는 구조 개선 | `refactor(phase-2): isolate sync transport` |
| `build(phase-N)` | package/app/EAS build 구성 | `build(phase-2): add compatible Supabase dependencies` |
| `chore(repo)` | 저장소 관리·개발환경 | `chore(repo): document phase commit workflow` |

하나의 커밋에 기능과 문서가 함께 있어도 문서가 그 기능의 필수 증빙이면 주 변경인 `feat` 또는 `fix`를 사용한다. 문서만 후속 보완하면 `docs`를 사용한다.

## 공통 상태·검증 명령

Windows Command Prompt에서 저장소 루트 기준으로 실행한다.

```bat
git status --short --branch
git diff --stat
git diff --check
cd mobile
npm run verify
cd ..
git status --short
```

스테이징 후 반드시 확인한다.

```bat
git diff --cached --stat
git diff --cached --check
git diff --cached
```

커밋 후 확인한다.

```bat
git status --short --branch
git log -1 --oneline --decorate
```

## Phase 종료 순서

### 1. 기능·수정 커밋

아래 `<검토한 코드 경로>`는 실제 Phase에서 바뀐 파일만 나열한다.

```bat
git add -- <검토한 코드 경로> <관련 테스트 경로> mobile/package.json mobile/package-lock.json
git diff --cached --stat
git diff --cached --check
git commit -m "feat(phase-2): add local-first Supabase sync"
```

이전 Phase의 수용 결함만 보완했다면:

```bat
git add -- <검토한 수정 경로> <관련 테스트 경로>
git diff --cached --stat
git diff --cached --check
git commit -m "fix(phase-1): close final acceptance gaps"
```

### 2. Phase 게이트 문서 커밋

```bat
git add -- docs/PLAN.md docs/TESTPLAN.md docs/CHANGELOG.md docs/DECISIONS.md docs/QUESTIONS.md docs/evidence
git diff --cached --stat
git diff --cached --check
git commit -m "docs(phase-2): record final gate evidence"
```

### 3. 저장소 규칙만 변경한 경우

```bat
git add -- docs/COMMIT_WORKFLOW.md
git diff --cached --check
git commit -m "chore(repo): document phase commit workflow"
```

## 현재 Phase별 권장 메시지

| 시점 | 권장 메시지 |
|---|---|
| Phase 1 최신 결함 보완 코드 | `fix(phase-1): close final acceptance gaps` |
| Phase 1 실기기 최종 증빙 | `docs(phase-1): record final Android gate` |
| Phase 2 패키지·환경 기반 | `build(phase-2): add Supabase sync dependencies` |
| Phase 2 동기화 구현 | `feat(phase-2): add local-first Supabase sync` |
| Phase 2 재시도·충돌 결함 | `fix(phase-2): preserve offline writes and conflict logs` |
| Phase 2 최종 증빙 | `docs(phase-2): record final sync gate` |
| Phase 3 구현/종료 | `feat(phase-3): add authorized Telegram interface` / `docs(phase-3): record final bot gate` |
| Phase 4 구현/종료 | `feat(phase-4): add grounded AI analysis` / `docs(phase-4): record final analysis gate` |
| 상용화 Phase 구현/종료 | `feat(commercial): add production release foundation` / `docs(commercial): record release readiness gate` |

## Phase 2 종료 명령 기록

원격 migration·development APK·실기기 AC-19~22가 모두 통과했다. 아래 명령을 저장소 루트에서 실행하되, 각 `git diff --cached` 결과에 Phase 2 외 변경이 섞이지 않았는지 확인한다.

```bat
git status --short --branch
git diff --check
cd mobile
npm run verify
cd ..

git add -- mobile/app.json mobile/package.json mobile/package-lock.json mobile/src/app/_layout.tsx mobile/src/app/auth/callback.tsx mobile/src/app/settings.tsx mobile/src/context/app-context.tsx mobile/src/context/sync-context.tsx mobile/src/data/migrations.ts mobile/src/data/migrations.test.ts mobile/src/data/repository.ts mobile/src/data/sync-repository.ts mobile/src/services/auth-callback.ts mobile/src/services/auth-callback.test.ts mobile/src/services/supabase.ts mobile/src/services/sync-service.ts mobile/src/sync supabase/config.toml supabase/migrations supabase/tests
git diff --cached --stat
git diff --cached --check
git commit -m "feat(phase-2): add local-first Supabase sync"

git add -- README.md docs/PLAN.md docs/TESTPLAN.md docs/CHANGELOG.md docs/DECISIONS.md docs/QUESTIONS.md docs/ENVIRONMENT.md docs/evidence/phase-2-readiness-2026-09-02.md docs/evidence/commercial-readiness-gap-2026-09-02.md docs/COMMIT_WORKFLOW.md
git diff --cached --stat
git diff --cached --check
git commit -m "docs(phase-2): record final sync gate"

git status --short --branch
git log -2 --oneline --decorate
```

## 현재 Phase 3 간단 명령

현재 Phase 3은 에이전트가 시작 전 clean 상태와 전체 변경을 확인한 뒤 직접 커밋·푸시한다. 수동 복구가 필요하고 `git status --short`의 변경이 모두 Phase 3 작업일 때만 아래의 짧은 형태를 사용한다.

```bat
git add -A
git diff --cached --check
git commit -m "feat(phase-3): add authorized Telegram interface"
git pull --rebase origin main
git push origin main
```

원격이 앞서 있어도 `git pull --rebase`가 로컬 Phase 3 커밋을 최신 `origin/main` 위로 옮기므로 일반적인 `fetch first` 거절을 피한다. 충돌이 표시되면 임의로 강제 push하지 않고 충돌 파일을 검토한다.

## 금지 사항

- 작업 트리의 모든 변경이 현재 Phase 것인지 확인하지 않은 상태의 `git add .`, `git add -A`
- 게이트 실패 상태에서 `docs(...): record final gate` 커밋
- 비밀값이 있는 `.env*`, Supabase secret/service-role key, Telegram token, AI key 스테이징
- unrelated 변경을 Phase 커밋에 함께 포함
- 검사 결과를 숨기기 위한 `--no-verify`
