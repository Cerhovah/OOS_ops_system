# AI Model Policy — Phase 4S

The initial production provider is OpenAI. Provider selection, model IDs, reasoning effort, token accounting, and estimated cost are server-owned. The app binary contains no production API key and does not use model IDs as business logic.

| Tier | Server configuration | Default effort | Use |
|---|---|---:|---|
| lightweight | `AI_MODEL_LIGHT=gpt-5.6-luna` | low | Only simple normalization or structuring after deterministic code; never a final analysis response. |
| standard | `AI_MODEL_STANDARD=gpt-5.6-terra` | medium | Audit, patterns, projects, free questions, optimization, and ordinary long-term analysis. |
| deep | `AI_MODEL_DEEP=gpt-5.6-sol` | high | Explicit precision analysis or complex cross-period/scenario work. |

Final analysis accepts only `standard` and `deep`. A deep result is still a proposal: it cannot alter local or remote data until the user explicitly applies a validated proposal.

The Edge Function calls the OpenAI Responses API with strict JSON Schema output. Every successful `AnalysisSession` retains provider, resolved model, reasoning effort, input/output/total tokens, estimated cost, provider response ID, and start/finish timestamps. The client re-validates model text before treating any proposal as actionable.

Input packaging remains bounded: raw records are compacted into daily, weekly, then KPI/exception summaries. If the available bounded pack is insufficient, the response must state that the data is insufficient rather than infer missing facts.

Configure the initial server policy after Supabase login:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\supabase\scripts\configure-ai-model-policy.ps1
```

This writes only Supabase server configuration. `configure-openai.ps1` remains the separate, hidden-input command for the API key. Before a model replacement, run the fixed regression dataset and verify structured-output success, numeric citation accuracy, proposal safety, latency, and cost. Anthropic remains a later adapter evaluation, not a Phase 4S completion requirement.
