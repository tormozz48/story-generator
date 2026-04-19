# Image Generation Prompt — Story Generator Week 3

_Copy everything below this line into a fresh session._

---

You are joining an existing project at the current working directory. The project is **Story Generator**, a PoC for an AI service that generates adult-content stories with consistent illustrations in Russian. Week 1 (skeleton) and Week 2 (end-to-end text generation) are complete. Week 3 delivers illustrated stories: reference portrait plus per-scene images, character- and style-consistent, linked to the story. The design is documented in the repo and is authoritative.

## Step 1 — Read Before You Code

Read these in order. Do not re-decide anything they have already decided.

1. `CLAUDE.md` — project context + behavioral guidelines. Follow strictly.
2. `docs/pipeline.md` — full flow, planning step, character sheet + reference portrait + scene images, latency expectations
3. `docs/models.md` — image candidates, evaluation process, consistency method
4. `docs/architecture.md` — `ImageAiModule`, `StorageModule` (MinIO), worker → Redis pub/sub → SSE flow
5. `docs/frontend.md` — reader component structure, hooks, folder conventions
6. `docs/safety.md` — image prompts also go through safety; Week 4 expands, Week 3 keeps parity with Week 2
7. `docs/testing.md` — integration mocks at provider boundary, Polly cassettes for e2e, no live APIs in `npm test`
8. `docs/roadmap.md` — Week 3 scope and explicit deferrals
9. `docs/tooling.md` — libraries and conventions

Then explore the existing codebase to see what Week 2 delivered and what remains as stubs. In particular: the Week 2 generation pipeline, the `ImageAiModule` stub, the `stories` Drizzle schema, and the frontend reader.

## Step 2 — What to Build

**Scope: Week 3, illustrated end-to-end generation shipped.** Per `docs/roadmap.md`:

> `ImageAiModule` integrated with Replicate. Base image model chosen (candidates in `models.md`). IPAdapter-based character consistency wired in. Images generated in parallel, stored in MinIO, linked to the story. Full generation pipeline works end-to-end, illustrations are character- and style-consistent.

Concretely, deliver:

### Backend — ImageAiModule (Replicate adapter)

- Replace the Week-1/2 stub with a real Replicate HTTP client using native fetch (or the official `replicate` npm client if its footprint is small — flag if adding a library per constraints below)
- Expose an `ImageAiService` with two methods:
  - `generateReferencePortrait(characterSheet, styleDescription): Promise<{ url: string; storageKey: string }>` — one image, returns MinIO-backed URL + key
  - `generateSceneImages(imagePrompts, referencePortrait, styleDescription): Promise<Array<{ url: string; storageKey: string; sceneIndex: number }>>` — parallel per-prompt generation, IPAdapter-conditioned on the reference portrait
- Both methods upload the fetched image bytes to MinIO via `StorageModule` and return the resulting keys/URLs; callers never deal with Replicate URLs directly
- IPAdapter conditioning is wired through the selected model's parameters (reference image input + weight). If the chosen model does not accept an IPAdapter-compatible reference image input, document that in `models.md` and pick one that does — the consistency mechanism is non-negotiable per `docs/pipeline.md`
- Style preset (one of ~4–6 presets) maps to a fixed `{ baseModel, loras, negativePrompt, sampler, steps, cfg }` combination. Hardcode the presets in a `packages/shared` constants file; users pick a preset name, the backend looks up the config
- Model + preset configuration is swappable via config, not code changes

### Backend — StorageModule extensions

- Add `uploadImageFromUrl(sourceUrl, key)` that streams the Replicate output into the configured MinIO bucket and returns the accessible URL
- Bucket layout: `images/{storyId}/reference.png`, `images/{storyId}/scene-{index}.png`
- Public URL strategy per the existing `StorageModule` convention — do not reinvent

### Backend — GenerationModule (pipeline orchestration)

Extend the Week 2 BullMQ processor to run the full pipeline per `docs/pipeline.md`:

```
1. SafetyModule.checkPrompt(prompt)
2. TextAiService.plan(prompt, options)
3. TextAiService.writeStory(plan, targetLength)
4. ImageAiService.generateReferencePortrait(plan.characterSheet, plan.styleDescription)
5. ImageAiService.generateSceneImages(plan.imagePrompts, referencePortrait, plan.styleDescription)  // parallel
6. Persist story + images
7. Emit progress events at each step via Redis pub/sub
```

Progress event states expand to: `queued → planning → writing → portrait → scenes → done | failed`. Scene generation runs in parallel (`Promise.all` or equivalent); a single scene failure does not fail the whole story — it marks that scene as failed with a placeholder and the story still completes. Log the failure.

### Backend — Persistence

- Add an `images` Drizzle table: `id, storyId, kind ('reference' | 'scene'), sceneIndex (nullable), storageKey, url, status, createdAt`
- Generate a migration via `drizzle-kit generate`; verify it applies cleanly on an empty Postgres
- Extend `GET /api/stories/:id` to return the story text interleaved with images: scene index N's image sits between scene N and scene N+1 in the response payload. Exact interleaving shape per the existing `StorySchema` — extend it, don't replace

### Backend — Safety parity

- Pass each `imagePrompts[i]` through `SafetyModule.checkPrompt(prompt, 'ru')` before dispatching it to Replicate
- A blocked image prompt fails that scene (placeholder) but does not fail the whole story
- Week 4 introduces output-side safety; Week 3 stays prompt-side only

### Frontend — Reader renders illustrations

- Extend `<StoryReader>` under `components/features/story-reader/` to render the interleaved scene images inline with the story text
- Add a compact `<ReferencePortrait>` in the header or sidebar of the reader
- Images render as soon as the story payload arrives; no extra fetches
- Extend `useGenerationProgress` to surface the new `portrait` and `scenes` states; `<GenerationProgress>` renders them on the live pipeline status UI
- Do not build a gallery, download, or edit affordance. Reader-only per `docs/roadmap.md`

### Shared — Schemas and constants

- Add `ImageSchema`, extend `StorySchema` with an `images: ImageSchema[]` field, extend `GenerationProgressEventSchema` with the new states, extend `StoryPlanSchema` (if needed) to surface the style preset chosen
- Add a `STYLE_PRESETS` constant: `{ id, label, baseModel, loras[], negativePrompt, sampler, steps, cfg }[]` — hardcoded list of 4–6 presets
- Consumed by backend validation, frontend RHF forms (preset selector in `<StoryForm>`), and SSE payload typing

### Model Evaluation

Per `docs/models.md`, this is Week 3 work and must produce a concrete decision.

- Build an eval script at `apps/backend/scripts/eval-image-models.ts`
- Use 5 reference scenarios covering the diversity called out in `docs/models.md` (different character types, settings, explicitness levels, aesthetics)
- Run each scenario through 2–3 candidate models via Replicate: **Pony Diffusion XL**, at least one **SDXL NSFW fine-tune**, and at least one **Flux NSFW fine-tune** (check current Replicate catalog for availability)
- For each scenario, generate: one reference portrait, then three scene images IPAdapter-conditioned on that portrait. This is how consistency is actually evaluated — a single isolated image proves nothing
- Save every output under `evaluation/image-models/{model}/{scenario-id}/` alongside a `manifest.json` recording the prompts, parameters, and links to the generated files
- **Do not judge quality yourself.** Pick a reasonable interim default (Pony Diffusion XL is a safe starting point — strong NSFW stylistic range, known IPAdapter ecosystem) so end-to-end generation works, and leave the final choice to the founder after they review the outputs
- Update the "Selected Models → Image" section of `docs/models.md` with: chosen interim model, rationale, style LoRAs in use, consistency method (IPAdapter parameters), alternatives tested, and known weaknesses. Mark the choice "interim, pending founder review" if the founder hasn't confirmed

### Tests

- Unit tests for style-preset lookup, pipeline scene-failure handling, and any pure image-prompt transformations
- Integration tests for the extended pipeline with `TextAiService` and `ImageAiService` both mocked at the NestJS provider boundary per `docs/testing.md`; Testcontainers for Postgres/Redis/MinIO. Verify that images land in MinIO and that a scene failure produces a placeholder, not a pipeline failure
- E2E test with Polly.js cassettes for one full illustrated pipeline run. Record once with `RECORD=true` against real OpenRouter + Replicate; commit the cassette; subsequent runs replay. The Week 2 cassette is superseded — delete it if it's redundant with the new one, keep it otherwise
- Frontend tests: MSW-mocked story payload with images renders the reader correctly, including interleaved scenes
- Do not hit real AI APIs in `npm test`

## Step 3 — Quality Bar

Before declaring done, verify and report:

1. `docker compose up --build` — every service healthy
2. Submitting the form on `/` with a preset selected leads to a rendered Russian-language story at `/stories/[id]` with a reference portrait plus scene illustrations interleaved, and the SSE stream walks through `queued → planning → writing → portrait → scenes → done`
3. A story where one scene's prompt trips the safety blocklist still completes, with a placeholder for the failed scene and the story text intact
4. `GET /api/stories/:id` returns story text, reference portrait, and scene images with correct ordering
5. MinIO console shows the `images/{storyId}/...` objects for the completed story
6. `npm test` at the root — all green (unit + integration + e2e with cassettes)
7. `npm run lint` and `npm run typecheck` — clean
8. Evaluation outputs for 5 scenarios across 2–3 image models exist under `evaluation/image-models/` with `manifest.json` files
9. `docs/models.md` "Selected Models → Image" section is filled in
10. Drizzle migration for `images` applies cleanly to an empty Postgres

## Step 4 — Constraints

- Follow `CLAUDE.md` strictly. Simplicity first. No speculative abstractions. Touch only what Week 3 requires.
- Do not implement character LoRA training. IPAdapter only, per `docs/pipeline.md`.
- Do not implement chunked text generation. Week 3 keeps the Week 2 single-call text path.
- Do not expand safety beyond prompt-side checks. Output-side scanning is Week 4.
- Do not build a gallery, image download, regenerate-single-image, or edit-and-rerun feature. Reader-only.
- Do not add libraries beyond those in `docs/tooling.md` without stopping to ask. The `replicate` npm client is a reasonable exception to flag — if using it saves meaningful complexity over native fetch, propose it before adding.
- Do not hit real AI APIs in automated tests. The evaluation script is the only place that hits live APIs, and it is not part of `npm test`.
- Do not overwrite `docs/` files other than `docs/models.md` (filling in the Image section). If a doc genuinely needs to change because of something learned during implementation (for example, the consistency method had to deviate from IPAdapter because no candidate model accepts it), flag it in the summary rather than silently editing.

## Step 5 — Working Style

- Build in this order: shared schemas + style presets → Drizzle `images` schema + migration → StorageModule extensions → ImageAiService + its tests → pipeline extension + its tests → SSE/progress events → frontend reader + progress UI → evaluation script.
- After each major section, run `npm test` and spot-check with `docker compose up` to confirm nothing regressed. Do not batch failures.
- Scene-failure semantics are load-bearing for user experience — write the test before the implementation.
- Stop and ask if you hit a genuine decision not covered in the docs (e.g., a candidate model does not support IPAdapter-style reference input, or Replicate's pricing changes materially alter the cost profile).
- Use Conventional Commits. Commit logical units of work as you go (`feat(backend): implement ImageAiService with Replicate`, `feat(backend): parallel scene generation with partial-failure handling`, `feat(frontend): render interleaved illustrations`, `chore(eval): image model outputs`, etc.).

## Step 6 — Deliverable

Produce a short summary:

- What was implemented, one line per module
- Commands to verify (mirror the Quality Bar checks)
- Results of each Quality Bar check
- The interim image model selected, style preset list, and a one-sentence rationale
- Where the evaluation outputs live for founder review
- Any TODOs left behind that are not already in `docs/roadmap.md`
- Any decisions where you had to pick without docs coverage, flagged for founder confirmation (especially: any deviation from IPAdapter, any library addition beyond `docs/tooling.md`, any preset list changes)

Do not write a narrative explanation of the stack — the docs cover that. Your summary is a handoff.

---

_End of prompt._
