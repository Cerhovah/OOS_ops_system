# OOS Ops mobile

이 디렉터리는 Expo SDK 57 기반 모바일 앱입니다. 제품·실행·검증 지침은 저장소 루트의 `README.md`, `docs/SPEC.md`, `docs/ENVIRONMENT.md`를 기준으로 합니다.

```bash
npm ci
npm run verify
npx expo start --dev-client
```

LAN 연결이 막힌 환경에서는 `npx expo start --dev-client --tunnel`을 사용합니다. 앱 버전·빌드 ID·환경변수와 EAS 절차는 중복 기재하지 않고 루트 문서만 기준으로 합니다.
