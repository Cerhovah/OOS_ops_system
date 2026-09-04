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

## Not executed

- No paid OpenAI request, Edge Function deployment, or device request was made by this change.
- The production secret and model-policy configuration must be present before a live analysis request. This is intentionally separate from source verification.
