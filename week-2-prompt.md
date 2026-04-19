# Text Generation Prompt — Story Generator Week 2

_Copy everything below this line into a fresh session._

---

You are joining an existing project at the current working directory. The project is **Story Generator**, a PoC for an AI service that generates adult-content stories with consistent illustrations in Russian. Week 1 (skeleton scaffolding) is complete. Week 2 delivers end-to-end text-only story generation. The design is documented in the repo and is authoritative.

## Step 1 — Read Before You Code

Read these in order. Do not re-decide anything they have already decided.

1. `CLAUDE.md` — project context + behavioral guidelines. Follow strictly.
2. `docs/pipeline.md` — planning step, story length strategy, overall flow
3. `docs/models.md` — text model selection process and candidates
4. `docs/architecture.md` — module structure; note the worker → Redis pub/sub → SSE flow
5. `docs/safety.md` — Week 2 is the first real generation, so basic safety must exist
6. `docs/testing.md` — how to test AI-adjacent code (mock at provider boundary for integration, Polly cassettes for e2e)
7. `docs/roadmap.md` — Week 2 scope and explicit deferrals
8. `docs/tooling.md` — libraries and conventions

Then explore the existing codebase to see what Week 1 scaffolded and what remains as stubs.

## Step 2 — What to Build

**Scope: Week 2, end-to-end text-only generation shipped.** Per `docs/roadmap.md`:

> `TextAiModule` integrated with OpenRouter. Planning and story-writing flow implemented. Ten-plus Russian test prompts run through three or four candidate models (see `models.md`). One model selected as PoC default, with notes on why. End-to-end text-only generation shipped.

Concretely, deliver:

### Backend — TextAiModule (OpenRouter adapter)

- Replace the Week-1 stub with a real OpenRouter HTTP client using native fetch
- Expose a `TextAiService` with two methods:
  - `plan(prompt, options): Promise<StoryPlan>` — returns `{ title, characterSheet, styleDescription, sceneOutline[], imagePrompts[] }` per `docs/pipeline.md`
  - `writeStory(plan, targetLength): Promise<string>` — single-call generation for targets up to 4000 words. Do not implement chunking (deferred per `docs/pipeline.md`).
- Both methods return data validated with zod schemas from `packages/shared`
- Model name comes from configuration; swapping is a config change, not a code change

### Backend — GenerationModule (pipeline orchestration)

Implement the BullMQ processor to run the pipeline per `docs/pipeline.md`:

```
1. SafetyModule.checkPrompt(prompt)
2. TextAiService.plan(prompt, options)
3. TextAiService.writeStory(plan, targetLength)
4. ImageAiService — no-op pass-through this week (Week 3)
5. Persist the completed story
6. Emit progress events at each step via Redis pub/sub
```

Progress event states: `queued → planning → writing → done | failed`. (`imaging` pass-through.)

### Backend — SafetyModule

Week 2 is the first real generation, so basic safety must exist per `docs/safety.md`:

- Russian + English CSAM-focused keyword blocklist
- Age-term pattern filters
- `checkPrompt(prompt, language)` throws a typed `UnsafePromptError` when blocked
- Blocked attempts are logged
- Week 4 expands this; for now, a defensible minimum

### Backend — SSE endpoint

- `GET /api/jobs/:id/events` opens an SSE stream that forwards Redis pub/sub events for that job id to the client
- Stream ends cleanly on `done` or `failed`

### Backend — Persistence

- Extend the Drizzle `stories` schema to hold the plan, generated text, status, and timestamps
- Add a migration via `drizzle-kit generate`
- On `done`, the story is readable via `GET /api/stories/:id`

### Frontend — Generation progress and reader

- `useGenerationProgress(jobId)` hook per `docs/frontend.md` — opens `EventSource`, tracks the state machine, exposes current state and percentage
- `<GenerationProgress>` component under `components/features/story-reader/` renders live pipeline status
- `<StoryReader>` renders completed story text when status is `done` (no images yet; Week 3)
- `<StoryForm>` submits, navigates to `/stories/[id]?pending=true`, and the reader takes over rendering

### Shared — Schemas

- Add `StoryPlanSchema`, `StorySchema`, `GenerationProgressEventSchema`, and an expanded `StoryGenerationRequestSchema` in `packages/shared`
- Consumed by backend validation, frontend RHF forms, and SSE payload typing

### Model Evaluation

Per `docs/models.md`, this is Week 2 work and must produce a concrete decision.

- Build an eval script at `apps/backend/scripts/eval-text-models.ts`
- Write 10+ Russian test prompts covering the diverse scenarios called out in `docs/models.md` (romance, explicit, dialogue-heavy, narration-heavy, various settings and characters)
- Run each prompt through 3–4 candidate models via OpenRouter: Qwen 2.5 72B uncensored variants, DeepSeek V3, and at least one NSFW fine-tune (Magnum, Midnight Miqu, or similar from the current OpenRouter catalog)
- Save every output as a markdown file under `evaluation/text-models/{model}/{prompt-id}.md` for founder review
- **Do not judge quality yourself.** Pick a reasonable interim default (Qwen 2.5 72B uncensored is a safe starting point) so end-to-end generation works, and leave the final choice to the founder after they review the evaluation outputs
- Update the "Selected Models → Text" section of `docs/models.md` with: chosen interim model, rationale for the interim pick, full list of alternatives tested, and any known weaknesses observed during evaluation. Mark the choice as "interim, pending founder review" if the founder hasn't confirmed

### Tests

- Unit tests for SafetyModule rules, zod schemas, and any pure pipeline logic
- Integration tests for the pipeline with `TextAiService` mocked at the NestJS provider boundary per `docs/testing.md`; Testcontainers for Postgres/Redis/MinIO
- E2E test with Polly.js cassettes for one full pipeline run. Record once with `RECORD=true` against real OpenRouter; commit the cassette; subsequent runs replay
- Do not hit real AI APIs in `npm test`

## Step 3 — Quality Bar

Before declaring done, verify and report:

1. `docker compose up --build` — every service healthy
2. Submitting the form on `/` leads to a rendered Russian-language story at `/stories/[id]` with live progress via SSE
3. `POST /api/stories` with a prompt that trips the safety blocklist returns a structured 4xx error (not a 500)
4. `npm test` at the root — all green (unit + integration + e2e with cassettes)
5. `npm run lint` and `npm run typecheck` — clean
6. Evaluation outputs for 10+ prompts across 3–4 models exist under `evaluation/text-models/`
7. `docs/models.md` "Selected Models → Text" section is filled in
8. Drizzle migration applies cleanly to an empty Postgres

## Step 4 — Constraints

- Follow `CLAUDE.md` strictly. Simplicity first. No speculative abstractions. Touch only what Week 2 requires.
- Do not implement image generation. `ImageAiModule` stays stubbed.
- Do not implement chunked generation for 4K+ word stories. Single-call only.
- Do not expand safety beyond the basic blocklist + age-term patterns. Week 4 expands.
- Do not add libraries beyond those in `docs/tooling.md` without stopping to ask.
- Do not hit real AI APIs in automated tests. The evaluation script is the only place that hits live APIs, and it is not part of `npm test`.
- Do not overwrite `docs/` files other than `docs/models.md` (filling in the TBD section). If a doc genuinely needs to change because of something learned during implementation, flag it in the summary rather than silently editing.

## Step 5 — Working Style

- Build in this order: shared schemas → Drizzle schema + migration → TextAiService + its tests → SafetyModule → GenerationModule processor + its tests → SSE endpoint → frontend progress/reader → evaluation script.
- After each major section, run `npm test` and spot-check with `docker compose up` to confirm nothing regressed. Do not batch failures.
- Stop and ask if you hit a genuine decision not covered in the docs.
- Use Conventional Commits. Commit logical units of work as you go (`feat(backend): implement TextAiService planning`, `feat(backend): wire generation pipeline`, `feat(frontend): live progress via SSE`, `chore(eval): text model outputs`, etc.).

## Step 6 — Deliverable

Produce a short summary:

- What was implemented, one line per module
- Commands to verify (mirror the Quality Bar checks)
- Results of each Quality Bar check
- The interim text model selected and a one-sentence rationale
- Where the evaluation outputs live for founder review
- Any TODOs left behind that are not already in `docs/roadmap.md`
- Any decisions where you had to pick without docs coverage, flagged for founder confirmation

Do not write a narrative explanation of the stack — the docs cover that. Your summary is a handoff.

---

_End of prompt._
