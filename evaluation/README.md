# Text Model Evaluation Outputs

Outputs from the Week 2 model evaluation run. Each subdirectory contains one markdown file per prompt for that model.

## How to regenerate

```bash
cd apps/backend
OPENROUTER_API_KEY=sk-... npx ts-node --project tsconfig.json scripts/eval-text-models.ts
```

## Models evaluated

| Directory | OpenRouter slug |
|---|---|
| `qwen-2.5-72b-instruct/` | `qwen/qwen-2.5-72b-instruct` |
| `deepseek-v3/` | `deepseek/deepseek-chat` |
| `magnum-v4-72b/` | `anthracite-org/magnum-v4-72b` |
| `midnight-miqu-70b/` | `neversleep/midnight-miqu-70b` |

## Prompts

11 prompts across: romance, explicit, dialogue-heavy, narration-heavy, historical, fantasy, slow-burn, male POV, short-form, summer romance, long-form multi-scene.

See `apps/backend/scripts/eval-text-models.ts` for full prompt text.

## Status

⚠️ Outputs not yet recorded — run the eval script with a live `OPENROUTER_API_KEY` to populate.
Interim default model selected: **qwen/qwen-2.5-72b-instruct** (see `docs/models.md`).
