# P5 Visual v2 Maestro boundary

Golden screenshot과 flow는 승인된 Figma `P5 Visual v2` frame이 생긴 뒤 추가한다.

- 대상은 합성 데이터가 들어간 전용 emulator 또는 별도 test build다.
- 개인용 `com.oosops.app`이 설치된 실기기에서 `clearState`를 사용하지 않는다.
- `assertScreenshot`은 동일 해상도·density·font scale·theme에서 drift를 찾는 보조 검사다. 고정 유사도 수치만으로 디자인을 승인하지 않는다.
- 로컬 실행은 `npm run maestro -- <flow>`를 사용해 remote analytics가 꺼진 runner를 거친다.
- screenshot·debug output·개인정보가 포함될 수 있는 임시 산출물은 커밋하지 않는다.
