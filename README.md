# OOS Ops

계획과 실제 시간을 사용자가 직접 기록하고 계정·항목·프로젝트·KPI 이력을 확인하는 Android 우선 로컬 앱입니다. 현재 동작의 source of truth는 [`docs/SPEC.md`](docs/SPEC.md)입니다.

## 현재 상태

- 현재 설치 시각 후보 `0.6.0(13)`, SQLite v6
- 완전 검증된 기능·데이터 기준선: 서명된 personal standalone `0.6.0(12)`
- 현재 기능 기준선: Today-first 계정→항목 목록, 로컬 실행·일시정지·재개·종료, 기록 원장과 더보기 9개 진입점
- 기능 기준선은 TypeScript/ESLint, 40 files/238 tests, Supabase 계약 2 files/8 tests, Expo dependency check, Doctor 21/21, Android Hermes bundle을 통과했습니다.
- SM-S721N(Android 16)에서 기존 데이터를 보존한 `0.6.0(12)` update install과 Today→기록→sync 핵심 흐름을 확인했습니다.

현재 v0.6.0 구조와 기능은 보존하지만 `0.6.0(13)` UI는 공개 시각 승인본이 아닙니다. `P5 Visual v3`는 제품 기획만 승인됐으며 새 Figma·읽기 전용 검수·사용자 승인이 끝나기 전에는 앱 UI 코딩이나 빌드를 진행하지 않습니다. 현재 작업 gate는 [`docs/design/P5_VISUAL_PIPELINE.md`](docs/design/P5_VISUAL_PIPELINE.md)에 있습니다.

## 고정 환경

- Node.js `24.19.x`
- npm `11.17.x`와 `mobile/package-lock.json`
- Expo SDK 57 / React Native 0.86.3 / React 19.2.3
- Expo CLI는 전역 설치하지 않고 `npx expo` 사용
- 앱: `mobile/`, 서버: `supabase/`, 문서: `docs/`

## 설치와 검증

```bat
cd mobile
npm ci
npm run verify
```

개발 클라이언트 실행:

```bat
cd mobile
npx expo start --dev-client
```

LAN 연결이 막히면 `npx expo start --dev-client --tunnel`을 사용할 수 있습니다. 일상 사용용 personal release는 Metro가 필요하지 않습니다.

## 현재 구현 기능

- 오늘: 저장된 항목 불러오기, 계정→항목 선택, 경과 타이머, 종료, 직접 기록
- 기록: 날짜별 원장, 계정·항목 소계, 계획/실제/차이, 편집·삭제
- 지표: 현재 날짜 연동 달력, 기록 점, 2026 공휴일 offline asset, 날짜 한 건 상세, 주간보기
- 주간 시간 분배: 168시간 계산, 계획 저장·버전·복원·지난주 복사
- 프로젝트/KPI: 상태·실험·판정일·KPI 기록과 연결 항목 투입시간
- 관리: 계정·항목·기록 관리, soft delete 복구, JSON/CSV 내보내기, 2단계 초기화
- 알림: 오늘 종료, 항목 일정, 타이머 상한, Android 채널과 딥링크
- 동기화: Supabase PKCE 인증, SecureStore 세션, SQLite outbox, 자동·수동 동기화, 충돌 로그, RLS
- AI 분석: 여섯 분석 모드, snapshot, 세션 이력, 제안 확인 후 계획 적용

## 환경변수와 비밀값

로컬 개발값은 ignore된 `.env.local`, 빌드값은 EAS environment에서 공급합니다. Supabase service-role key, database password, OpenAI secret key는 앱·문서·커밋에 넣지 않습니다. AI provider/model/key는 인증된 Supabase Edge Function에서만 결정합니다.

## 문서

- [`docs/SPEC.md`](docs/SPEC.md): 현재 제품·동작과 불변조건
- [`docs/TESTPLAN.md`](docs/TESTPLAN.md): 실제 검증 결과
- [`docs/DECISIONS.md`](docs/DECISIONS.md): 현재 구현에 적용된 기술 결정
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md): 재현 환경
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md): 사용자 의미 변경 이력
- [`docs/design-research.md`](docs/design-research.md): UI/UX 레퍼런스 감사
- [`docs/design/P5_VISUAL_PIPELINE.md`](docs/design/P5_VISUAL_PIPELINE.md): reference→Figma→검수→구현 시각 gate
