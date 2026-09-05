# Phase 4S AI model policy implementation — 2026-09-05

## Implemented

- OpenAI is the initial server provider. `standard` resolves to Terra/medium and `deep` to Sol/high through `supabase/functions/_shared/model-policy.ts`.
- Luna is restricted to a future lightweight preprocessing seam and cannot produce final analysis responses.
- `ai-analysis` uses server configuration for model ID, effort and per-million-token prices, retains strict Responses JSON schema, and returns actual provider/model/usage/cost/response ID/timing metadata.
- SQLite v6 is additive. Existing analysis sessions are retained and gain nullable audit columns; old sessions receive `total_tokens` when both prior token fields exist.
- Sync payload and repository mappings include the new audit fields. Existing app-side model/provider settings are no longer used for routing.
- The analysis screen offers standard and explicit deep analysis. Model names never control UI behavior.

## Automated verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run verify` components — passed: strict typecheck, lint, 35 files / 221 tests, 99.07% statements, 94.93% branches, 100% functions/lines, Supabase contracts, dependency check, Expo Doctor 21/21, and Android bundle (1,493 modules).

## Server deployment

- Saved the nine server-side `AI_MODEL_*` and `AI_PRICE_*` configuration values to Supabase project `majwsffhmbjwinvmxqzj`.
- Deployed Edge Function `ai-analysis` with the model-policy shared module. Supabase CLI confirmed `Deployed Functions.`

## SM-S721N live verification

- Connected authorized device: `R5CY31QP08W`, model `SM-S721N`; installed development client reports `0.4.1 (8)`.
- Started Metro through USB reverse forwarding and loaded the current source in the development client without a render or runtime error.
- Confirmed the analysis UI exposes both standard and deep choices.
- Ran one standard analysis against the signed-in device data. The UI confirmed: `분석 세션을 저장했습니다. 제안은 아직 데이터에 적용되지 않았습니다.` No proposal was applied.
- The returned result correctly reported that one minute of actual weekly record is insufficient for an account-level change rationale, preserving the data-insufficient behavior.

## Standalone follow-up

- EAS internal non-development APK `0.4.2 (9)` build `8deb4d4b-3747-4073-9f06-c7b9b2ed9f09` finished and was installed over the prior package without clearing data.
- The APK is non-debuggable, contains `assets/index.android.bundle`, and launches with no Metro listener or ADB reverse. Full offline interaction and online-return evidence remains in `phase-4s-standalone-2026-09-05.md`.
