# AGENTS.md

## 기준 문서와 역할

- `docs/SPEC.md`가 이 저장소의 source of truth다.
- 작업 전에 SPEC 전체를 읽고 특히 §2 불변조건, §10 작업 프로토콜, 현재 Phase의 §11 수용 기준, §12 문구 가이드를 따른다.
- 사용자의 최신 명시 지시가 우선하며, §2 불변조건은 임의로 바꾸지 않는다.
- 주 구현 에이전트는 `docs/PLAN.md`의 현재 Phase와 AC 연결을 유지하고 구현·테스트·증빙·문서를 함께 갱신한다.

## 작업 경계

- 현재 앱 코드는 `mobile/` 아래에 둔다. 루트에는 `docs/`와 프로젝트 관리 파일을 유지한다.
- 패키지 관리자는 npm만 사용한다. `package-lock.json`을 유지하고 yarn/pnpm/bun 잠금 파일을 만들지 않는다.
- Expo CLI를 전역 설치하지 않는다. Expo 명령은 `npx expo`, EAS 명령은 `npx eas-cli@latest`로 실행한다.
- Phase 1에서는 Supabase, Telegram, AI API를 구현하거나 자격증명을 추가하지 않는다.
- 명세 밖 기능은 구현하지 않고 `docs/FUTURE.md`에만 기록한다.
- 게임화, 판정 문구, 숫자 숨기기, 저장 차단, 사용자 성향·심리 서술, 원격 텔레메트리는 금지한다.

## 품질과 기록

- TypeScript strict를 유지하고 `any`를 쓰지 않는다.
- 도메인 계산은 UI와 분리한 순수 함수로, SQLite 접근은 repository 계층으로 구현한다.
- 마이그레이션은 버전형 상향 스크립트이며 파괴적 변경을 하지 않는다.
- Phase 1 검증은 `mobile/`에서 npm 스크립트로 수행하고 §10.3 게이트를 건너뛰지 않는다.
- 기술 내부 결정은 `docs/DECISIONS.md`, 사용자 결정 질문은 `docs/QUESTIONS.md`, 결과는 `docs/TESTPLAN.md`, 사용자 의미 변경은 `docs/CHANGELOG.md`에 기록한다.
- §10.4 정지 조건이 발생하면 해당 범위를 멈추고 §10.7 형식으로 보고한다.
