# Phase 1 Android 검증 증빙 — 2026-08-23

## 기준

- 커밋: `ced67ac` (`v0.1-phase1`, `main`, `origin/main`)
- 앱: 기존 설치된 OOS Ops Android development APK
- 개발 서버: `npx expo start --dev-client --tunnel`
- 범위: Phase 1 AC-1~AC-18만 검증. Phase 2 미착수
- 기기 모델·Android 버전: 미기록

## 시작 시 사용자 확인 상태

- Node/npm 설치, `npm ci`, EAS 로그인·프로젝트 연결 완료
- `expo-doctor` 21/21 통과
- Android development APK 설치와 아이콘 실행 완료
- Tunnel connected / Tunnel ready, Android bundle 완료
- 휴대폰 화면에는 어두운 빈 화면과 우측 상단 gear만 표시

## 렌더링 진단

- 정상 OOS Ops 첫 화면은 코드와 SPEC §5.1에 따라 한국어 `오늘` 헤더, 날짜, 계획→실제, 오늘 항목, 하단 5개 탭, 우측 상단 `설정` 텍스트가 보여야 한다.
- 관찰된 gear는 앱의 `설정` 텍스트와 다르며 Expo development client launcher UI에 해당한다. 따라서 정상 앱 초기화 화면으로 판정하지 않는다.
- 기존 Metro는 TCP 8081을 열고 있었지만 `http://127.0.0.1:8081/status`에 5초 동안 응답하지 않았다. Node 프로세스는 약 1GB 메모리와 지속 CPU를 사용했다.
- 별도 Android export 번들 시 Metro 캐시에서 `Unable to deserialize cloned data due to invalid or unsupported version`이 재현되었다.
- 기존 Metro/ngrok 프로세스만 종료하고 `npx.cmd expo start --dev-client --tunnel --clear`로 캐시를 정리해 재시작했다. 새 서버에서 `Tunnel connected`, `Tunnel ready`, HTTP 200, `packager-status:running`을 확인했다.
- 기존 APK·의존성·EAS 프로젝트는 재설치·재연결·재빌드하지 않았다.
- Android development client 콜드 스타트에서 `Cannot use onError with useSuspense, use error boundaries instead.` Render Error를 확인했다.
- 원인은 `mobile/src/app/_layout.tsx`의 `SQLiteProvider`에 `useSuspense`와 `onError`를 동시에 전달한 코드다. SDK 57의 Suspense 사용 규칙에 맞춰 `onError`를 제거하고 기존 Expo Router `ErrorBoundary` export를 유지했다.
- 수정 후 Metro reload에서 Android bundle이 완료되고 추가 런타임 오류가 없었다.
- 사용자가 tunnel QR로 다시 연결한 뒤 한국어 `오늘` 화면과 하단 5개 탭, 168h 계획, 계정 목록, 두 프로젝트 시드를 사진으로 확인했다.
- 2026-08-23은 일요일이며 시드 자동 일정이 월~토에만 있으므로 `오늘 자동 항목이 없습니다` 표시는 기대값과 일치한다.
- 화면 확인 시각 기준 23:00까지 약 7h 35m였고 UI의 `남은 가용시간 7h 35m`, `계획 0m → 실제 0m`가 일치했다.
- 사용자 사진에서 큰 Android 글자 배율 때문에 하단 탭 라벨이 시스템의 최근 앱/홈/뒤로 탐색 영역과 겹치는 문제를 확인했다.
- 원인은 탭 바에 고정 `paddingBottom: 8`을 지정해 React Navigation의 safe-area padding을 덮어쓰고, 글자 배율에 맞춰 높이를 확장하지 않은 것이다.
- `fontScale`과 Android bottom inset을 반영한 동적 높이를 적용하고 시스템 글자 배율은 계속 허용했다. 고정 bottom padding은 제거했다.
- QR을 다시 사용하지 않고 홈 화면의 OOS Ops 아이콘만으로 콜드 스타트해 최소 앱 화면이 렌더링되는 것을 확인했다.
- 사용자는 세부 UI/UX 정렬 조정을 전체 기능 검증 뒤 수행하기로 했다. Phase 1 게이트 전 최종 화면 점검에 포함한다.
- TP-AC-01 / AC-1 판정: 통과.

## 자동 게이트 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| TypeScript | `npm.cmd run typecheck` | 통과, exit 0 |
| ESLint | `npm.cmd run lint` | 통과, exit 0, warning 0 |
| 테스트·커버리지 | `npm.cmd run test:coverage` | 8 files, 40 tests 모두 통과 |
| 도메인 statements | Vitest v8 coverage | 99.05% |
| 도메인 branches | Vitest v8 coverage | 92.85% |
| 도메인 functions | Vitest v8 coverage | 100% |
| 도메인 lines | Vitest v8 coverage | 100% |
| 의존성 일치 | `npm.cmd run deps:check` | `Dependencies are up to date` |
| Android JS bundle | `npm.cmd run bundle:android` | 통과, 1371 modules, Hermes bytecode 3.1MB |
| expo-doctor | 사용자 실행 결과 | 21/21 통과 |

## 추가 자동 통합 검증

- Node 24 내장 SQLite 메모리 DB에 Expo SQLite 호환 어댑터를 붙여 제품의 migration과 repository SQL을 그대로 실행했다. 새 패키지 설치나 사용자 기기 DB 접근은 하지 않았다.
- 첫 migration의 14계정, 8항목, 2프로젝트, 8 KPI, 14개 계획 라인과 168h 합계, 기본 설정을 확인했다. migration을 다시 실행해 중복이 생기지 않음을 확인했다.
- 계정·항목 편집/보관/소프트 삭제/복구, 다섯 기록 유형, 기록 수정/삭제/복구, 일정 포함 항목 복구, 오늘 수동 항목 중복 방지, 종료 스냅샷과 메모를 실제 SQLite에서 확인했다.
- 같은 주 계획 v1→v2→v3 증가와 과거 불변, 지난주 최신 계획의 `copy_last_week` 복사, 프로젝트·사용자 KPI·값 기록·삭제·복구를 확인했다.
- 전체 14개 export 테이블에 소프트 삭제 행과 계획 v1/v2가 함께 남는지 확인했다.
- Android 알림 서비스 mock으로 HIGH 채널, 최초 1회 권한 요청, 기본 21:30 DAILY, 종료한 날 다음 날 DATE, 월·일 WEEKLY, 타이머 상한 알림 취소, 마지막 알림 응답과 수신 listener 딥링크를 검증했다.
- native 파일·공유 mock으로 전체 JSON, UTF-8 BOM CSV의 한글·쉼표·줄바꿈 escape, 공유 시트 옵션과 공유 불가 오류를 검증했다.
- `mobile/src` 정적 검색에서 게임화·칭찬/질책·사용자 성향/심리 서술 문구와 네트워크 호출을 찾지 못했다. `모의점수`는 시험 KPI이며 `다음 판정일`은 사용자의 프로젝트 의사결정 날짜다.
- 이전 sandbox 권한 오류와 분리해 Android export를 다시 실행했고 Hermes bundle이 성공했다. 실행 중 Metro `/status`도 계속 `packager-status:running`이다.

## 자동 감사에서 발견·수정한 회귀

- 항목을 소프트 삭제하면 활성 일정도 같은 시각으로 삭제되지만 기존 복구는 항목 행만 되살렸다. 항목 삭제 시각과 같은 일정만 transaction 안에서 복구해, 사용자가 과거에 별도로 끈 일정은 되살리지 않도록 수정했다.
- `event`는 값이 선택 사항인데 오늘 기록과 최근 기록 수정 UI가 빈 값을 막고 있었다. 값 없이 메모만 저장·수정할 수 있게 하고 실제 SQLite 회귀 테스트를 추가했다.
- 오늘 종료 후 설정 저장이나 알림 권한 재요청 경로가 `todayClosed=false`로 재예약해 그날 알림을 되살릴 수 있었다. 현재 snapshot의 종료 여부를 전달하도록 수정했다.

## 실기기 결과 누적

| 시각(KST) | TP/AC | 사용자 동작 | 기대 결과 | 실제 결과 | 판정 |
|---|---|---|---|---|---|
| 시작 상태 | TP-AC-01 / AC-1 | 기존 APK 아이콘 실행·tunnel 연결 | OOS Ops 한국어 첫 화면 | dev-client 어두운 launcher 화면과 gear만 표시 | 실패(서버 복구 후 재시험) |
| Metro 복구 후 | TP-AC-01 / AC-1 | 앱 완전 종료 후 아이콘 실행 | OOS Ops 한국어 첫 화면 | `Cannot use onError with useSuspense` Render Error | 실패(원인 확정·코드 수정) |
| 수정 후 | TP-AC-01·02·06 / AC-1·2·6 | tunnel QR 연결 후 탭 화면 확인 | 한국어 앱 셸·시드·오늘 합계 | 5개 탭, 168h 계획, 계정·프로젝트 시드, 일요일 0m→0m와 남은 7h 35m 확인 | 부분 통과 |
| 화면 점검 | TP-AC-01 / AC-1 | 하단 탭과 Android 시스템 탐색 영역 확인 | 라벨과 시스템 버튼 분리 | 큰 글자 배율에서 일부 겹침 | 실패(동적 높이 수정 후 재시험) |
| 수정 후 재실행 | TP-AC-01 / AC-1 | QR 없이 홈 화면 아이콘 실행 | 한국어 앱 화면 | 최소 앱 화면 정상 렌더 | 통과(세부 정렬은 게이트 전 재점검) |
| 설정 화면 | TP-AC-02·04·14·15 | 설정 진입·전체 섹션 확인 | Phase 1 관리 경로 노출 | 시간·알림, 항목·계정, 기록 수정·삭제·복구, JSON·CSV UI 확인 | 부분 통과(실제 실행 대기) |
| 계정 시드 | TP-AC-02 / AC-2 | `수면` 계정 편집창 열기 | 시드 필드 일치 | `수면` / `기반` / `#526D82` 및 저장·삭제 버튼 확인 | 부분 통과 |
| 계정 편집 | TP-AC-02 / AC-2 | `수면`→`수면 테스트`, 계정 저장 | 목록에 변경 반영 | 편집창 닫힘·목록 반영 확인 | 통과(재시작 보존 대기) |
| 재시작 보존 | TP-AC-02 / AC-2 | 완전 종료·아이콘 재실행·주간 조회 | 편집값 유지·시드 비덮어쓰기 | 첫 계정 `수면 테스트` 유지 | 통과 |
| 계정명 복원 | TP-AC-02 / AC-2 | `수면 테스트`→`수면`, 저장 | 원래 시드명 복원 | 저장 후 편집창 닫힘 | 통과 |
| 계정 보관 | TP-AC-02 / AC-2 | `수면` 보관 | 보관 상태와 해제 경로 표시 | `보관됨`·`보관 해제` 확인 | 통과(원상복구 대기) |
| 계정 보관 해제 | TP-AC-02 / AC-2 | `수면` 보관 해제 | 활성 상태 복원 | `사용 중`·`보관` 확인 | 통과 |
| 계정 삭제 확인 | TP-AC-02 / AC-2 | `수면` 계정 삭제 선택 | 소프트 삭제·연결 기록 보존 안내 | 정확한 확인 문구 노출 | 부분 통과(실제 삭제는 자동 검증 전환으로 중지) |
| 빠른 기록·타이머 | TP-AC-03·05 / AC-3·5 | 코디세이 완료, 편입 수동 1m, 타이머 시작 뒤 앱 완전 종료·아이콘 재실행·정지 | 1탭 기록, 진행 타이머 DB 복원과 중복 0 | 코디세이 2회, 편입 1m, 재실행 후 타이머 정상 유지, 정지 정상 | 통과 |
| 종료·계획·프로젝트·공유 | TP-AC-07~12·15 / AC-7~12·15 | 남은 묶음 흐름 수행 | 각 화면 저장·복원·공유 정상 | 실제 알림과 비행기 모드·최종 화면 외 모두 정상이라고 사용자 종합 확인 | 통과 |
| 실제 알림 1차 | TP-AC-13·14 / AC-13·14 | DAILY 시각 임시 변경, 앱 종료, 재예약 | 알림 수신·탭으로 오늘 종료 진입, 같은 날 새 예약 시험 가능 | 첫 알림 수신 후 탭 완료 실패, 변경한 두 번째 시각에는 미수신 | 실패·보강 후 재시험 |
| 실제 알림 2차 | TP-AC-13·14 / AC-13·14 | 버튼식 시각 UI 확인, 30초 독립 알림, 본문 탭, 잠금화면 | 수신·오늘 종료 이동·잠금 상태 알림 | 버튼 UI·수신·본문 탭 이동 정상, 잠금화면에서 소리 없음 | 부분 통과·채널 v2 수정 후 재시험 |
| 최종 알림·오프라인 | TP-AC-13·14·16 / AC-13·14·16 | v2 채널 잠금화면 알림과 비행기 모드 기록·재시작 보존 | 잠금 상태 알림 동작·오프라인 데이터 보존 | 사용자가 두 검증 모두 완료했다고 확인 | 통과 |

## 실제 알림 1차 실패 진단과 보강

- Expo SDK 57 문서상 DAILY는 예약 하나가 지정 시각에 하루 한 번 반복되는 트리거다. 앱 전체가 하루 한 알림으로 제한되는 것은 아니며, 별도 일회성 알림은 같은 날 여러 번 예약할 수 있다.
- 반복 일정을 취소·재생성하는 방식은 실제 기능에는 맞지만 짧은 수동 시험에는 시각 입력·저장 지연·종료 상태가 섞여 원인 분리가 어렵다.
- 기존 notification handler의 `shouldPlaySound:false`는 Android에서 채널 priority와 무관하게 상단 drop-down 표시를 막을 수 있다는 SDK 57 주의사항과 충돌했다. 이를 `true`로 바꾸고 content와 HIGH 채널에 기본 sound/priority를 명시했다.
- `daily_close` category와 `오늘 종료 열기` action을 추가했다. 알림 본문 탭과 action 모두 기존 `data.url=/today/close` 라우팅을 사용한다.
- 처리한 마지막 알림 응답을 `clearLastNotificationResponseAsync`로 지워 재실행 때 오래된 응답이 반복 적용되지 않게 했다.
- 반복 예약과 별개인 30초 TIME_INTERVAL 테스트 알림을 추가했다. 하루에 두 번 호출해 서로 다른 두 예약이 생성되고 daily 예약 ID는 바뀌지 않는 자동 테스트를 통과했다.
- 하루 종료 시각과 알림 시각은 직접 문자열 입력 대신 시·분 버튼형 선택 UI로 변경했다. 5분 단위 선택과 ±1분 미세 조정을 제공한다.
- 2차 실기기에서 시각 버튼, 30초 알림 수신, 본문 탭 후 오늘 종료 이동은 통과했다.
- 잠금화면에서 알림음이 나지 않았다. Android는 생성된 알림 채널의 sound와 importance를 앱이 나중에 변경할 수 없으므로, 기존 `daily-records`를 덮어쓰지 않고 `daily-records-v2`를 새로 만들었다. 새 채널은 HIGH, 기본 sound, 진동, PUBLIC 잠금화면 표시를 처음부터 설정한다.
- 방해금지·휴대폰 무음·사용자가 바꾼 시스템 채널 설정은 앱이 우회하지 않는다.

## 남은 사용자 실기기 검증

없음. 2026-08-24 잠금화면 알림과 비행기 모드 검증까지 사용자 확인을 받아 Phase 1 실기기 게이트를 통과했다.

## Git 체크포인트

- 커밋: `560e621` (`test: complete phase 1 android validation`)
- `main`과 `origin/main`: `560e621`
- 태그: `v0.2-phase1.5` → `560e621`, origin에 게시 확인
