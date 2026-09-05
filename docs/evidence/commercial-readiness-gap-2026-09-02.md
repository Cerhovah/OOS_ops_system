# 상용 완결성 범위 감사 — 2026-09-02

## 결론

기존 SPEC의 활성 Phase 1·2·4 완료는 개인용 로컬 앱, Supabase 동기화·백업, AI 분석까지의 기능 게이트 통과를 뜻한다. 앱 스토어 공개 배포와 실제 결제, 다중 사용자 상용 운영 서버의 완결을 뜻하지 않는다. Telegram Phase 3은 2026-09-03 사용자 지시로 철회됐다.

2026-09-04 사용자 지시로 Phase 4R 동작 보존 리팩터와 Phase 4S Android 개인용 standalone을 SPEC v0.3.0에 추가했다. 2026-09-05 `0.4.3(10)` personal release APK로 PC·Metro 독립 cold start, 오프라인 5탭·기록/재시작·내보내기·알림, 온라인 복귀 동기화와 AI 실호출을 확인해 두 Phase를 닫았다.

개발/개인용 standalone/상용 production의 권장 전환 전략은 `docs/evidence/build-release-strategy-2026-09-02.md`에 별도로 기록한다.

근거:

- SPEC §3.2: Phase 1 초안, Phase 2 동기화, 철회된 Phase 3, Phase 4 분석, Phase 4R 리팩터, Phase 4S 개인용 standalone, Phase 5 후순위 확장.
- SPEC §3.3: 앱 스토어 공개 배포·결제·다중 사용자 상용 운영을 Phase 4S와 분리해 비목표로 두며 Q-005 승인 뒤 확장한다.
- SPEC의 `결제`, `매출`, `유료 결제`는 사용자가 기록하는 event/KPI 데이터이며 결제 처리 API나 상품 판매 기능이 아니다.
- `mobile/eas.json`에는 Metro용 `development`와 비개발 internal APK용 `personal` profile이 있다. Google Play용 production AAB profile은 아직 없다.
- 현재 소스에는 Supabase client/auth/sync와 단일 owner AI Edge Function이 있다. 결제 SDK·구매 검증·결제 webhook·구독 권한(entitlement) 코드는 없다.

## 현재 Phase가 제공하는 범위

| 단계 | 명세상 결과 | 2026-09-04 구현 상태 |
|---|---|---|
| Phase 1 | 개인 설치용 v0.1 초안, 로컬 SQLite, 기록·계획·KPI·알림·내보내기 | 자동 게이트와 실기기 TP-AC-01~17 완료 |
| Phase 2 | 단일 사용자 Supabase 백업·복구·동기화·RLS | AC-19~AC-22 자동·SM-S721N 실기기 게이트 완료. 동시 다기기 작성은 Q-011 대기 |
| Phase 3 | 사용자 결정으로 제품 범위에서 철회 | 앱·서버·원격 리소스 제거 완료 |
| Phase 4 | 제공자 중립 AI 분석, 세션·비용·사용자 승인형 제안 적용 | OpenAI/Supabase 단일 사용자 서버, 실응답 9세션, 제안 적용·무시와 동기화 게이트 완료 |
| Phase 4R | Phase 1·2·4 동작 보존, 구조 분리·보안·재현성 강화 | `0.4.3(10)` 자동·clean DB CI·linked 원격·로그인 유지·AI 실호출·실기기 회귀 통과 |
| Phase 4S | PC·Metro 없는 Android 개인용 standalone | `0.4.3(10)` release APK 생성·설치, AC-36~AC-39 통과 |
| Phase 5 | 웹 대시보드·외부 데이터 등 승인된 후순위 후보 | 미구현, 상용화는 기존 후보가 아니었음 |

## 상용 출시 목표에 추가로 필요한 범위

1. 제품·계정: 개인용/다중 사용자 결정, 가입·탈퇴·계정 복구, 데이터 삭제, 관리자·지원 범위.
2. 운영 서버: production/staging 분리, RLS·비밀값, 마이그레이션, 자동 백업·복구 훈련, 로그·모니터링·알림, 장애 대응과 비용 상한.
3. 배포: production EAS profile, Android AAB와 Google Play Console, 필요 시 iOS archive/App Store Connect, 서명·버전·스토어 메타데이터·심사·내부/비공개/공개 테스트.
4. 결제: 판매 대상과 가격 모델, Play Billing/IAP 또는 외부 결제의 정책 적합성, 상품·구독 상태, 서버 영수증 검증, webhook/RTDN, entitlement, 보류·취소·환불·복원·테스트.
5. 법무·보안: 개인정보 처리방침·이용약관·결제/환불 안내, 데이터 보존·삭제, 최소 권한, 위협 모델·보안 점검.
6. 출시 품질: 실기기/OS 매트릭스, 회귀·E2E, 성능·접근성, crash reporting(사용자 동의와 SPEC의 텔레메트리 금지 범위 재결정), 운영 runbook.

## 빌드 수명 구분

- development APK: 개발 도구와 launcher가 포함된 내부 테스트용이며 JavaScript 실행에는 Metro가 필요하다.
- 현재 Phase 4S personal APK: `0.4.3(10)` embedded bundle로 PC·Metro 없이 열린다. 스토어를 쓰지 않으므로 앱 변경 때 새 APK를 직접 설치해야 한다. Supabase 동기화·AI는 인터넷과 운영 중인 서버가 필요하고, 로컬 기록은 연결 없이 유지된다.
- production 앱: 스토어에 제출할 별도 production build가 필요하다. 사용자는 설치 후 평상시마다 새 APK를 발급받지 않는다. 기능 업데이트, 네이티브 변경, 정책·서명·SDK 변경 때 새 버전을 빌드·심사·배포한다.
- 운영 서버: 앱 바이너리와 별개로 계속 호스팅·백업·모니터링되어야 하며, 서버 비용과 자격증명 승인 없이는 자동으로 완결되지 않는다.

## 다음 결정

Phase 4S는 닫혔다. 다음은 Q-005에서 공개 플랫폼, 판매 대상, 사용자 범위, 유료 계정·인프라 범위를 확정하고 신규 상용화 Phase와 AC/TESTPLAN을 추가하는 것이다. Phase 1~4S의 의미를 소급해 `상용 출시 완료`로 바꾸지는 않는다.

공식 참고:

- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo internal distribution: https://docs.expo.dev/build/internal-distribution/
- Expo app store production builds: https://docs.expo.dev/deploy/build-project/
- Google Play Billing architecture: https://developer.android.com/google/play/billing/
