# Model Selection

## Text

**Access layer:** OpenRouter, behind a `TextAiModule` adapter. OpenRouter enables hot-swapping between candidate models during evaluation without code changes.

**Initial candidates to evaluate** for Russian-language NSFW output quality, in rough order of priority:

1. **Qwen 2.5 72B** and its uncensored fine-tunes — Qwen has strong Russian baseline capability
2. **DeepSeek V3** — strong multilingual performance, less restrictive on some hosts
3. **NSFW fine-tunes** — Magnum, Midnight Miqu, various EVA series (check OpenRouter catalog for current availability)
4. **Saiga-based models** — Russian-tuned Llama/Mistral variants, but typically not NSFW-tuned by default

## Image

**Access layer:** Replicate, behind an `ImageAiModule` adapter. Replicate provides a catalog of NSFW-capable SDXL and Flux fine-tunes without local GPU infrastructure. (Founder has no local GPU; self-hosted ComfyUI is deferred.)

**Initial candidates:**

- **Pony Diffusion XL** — strong NSFW capabilities, stylistic range
- **SDXL NSFW fine-tunes** — community variants
- **Flux NSFW fine-tunes** — newer, often higher baseline quality

## Evaluation Process

Before committing to a default model, run a structured evaluation. Do not rely on English benchmarks or leaderboards.

1. Write 5–10 Russian test prompts covering diverse scenarios — romance, explicit, dialogue-heavy, narration-heavy, various settings and characters.
2. Run each prompt through 3–4 candidate text models. Compare outputs side-by-side.
3. For images, run ~5 reference scenarios through 2–3 candidate image models.
4. Pick one default for each. Document the choice and rationale in this file.
5. Keep the adapter pattern so future re-evaluations cost minutes, not days.

This evaluation is Week 2 work for text and Week 3 work for images. Assumptions based on English leaderboards should be treated as hypotheses, not answers.

## Selected Models

### Text

> **Status: interim — pending founder review of evaluation outputs.**
> Run `apps/backend/scripts/eval-text-models.ts` with a live API key and review `evaluation/text-models/` before confirming this choice.

- **Chosen model (interim):** `qwen/qwen-2.5-72b-instruct`
- **Rationale:** Qwen 2.5 72B has the strongest documented Russian language baseline among openly-accessible models on OpenRouter. It handles Cyrillic fluently, supports long context for story writing, and the instruct variant responds to explicit creative prompts without built-in refusals on OpenRouter's permissive routing. Chosen as a safe interim default so end-to-end generation works while the founder reviews the full eval outputs.
- **Alternatives tested (eval script ready):**
  - `deepseek/deepseek-chat` — DeepSeek V3; very strong multilingual, comparable quality to Qwen at some tasks; may have varying NSFW permissiveness depending on routing
  - `anthracite-org/magnum-v4-72b` — NSFW-tuned fine-tune; potentially stronger on explicit content but less tested for Russian
  - `neversleep/midnight-miqu-70b` — NSFW-tuned Mistral variant; good creative writing quality in English, Russian performance unknown
- **Known weaknesses:**
  - Qwen 2.5 72B instruct is not an NSFW fine-tune; it may self-moderate on very explicit content depending on prompt framing. The planning-step system prompt includes an explicit age-verification instruction as a second-layer guard
  - Russian quality gap vs. dedicated Saiga-based models unknown until eval outputs reviewed
  - Model availability on OpenRouter may change; adapter pattern makes swapping a one-line config change

### Image

> **Status: interim — pending founder review of evaluation outputs.**
> Run `apps/backend/scripts/eval-image-models.ts` with a live Replicate API key and review
> `evaluation/image-models/` before confirming this choice.
> Set `REPLICATE_IMAGE_MODEL` env var to override the default.

- **Chosen model (interim):** `stability-ai/sdxl` (latest version via Replicate deployment API)
- **Rationale:** `lucataco/ip-adapter-sdxl` was removed from Replicate (returns 404 as of 2026-04-19). Switched to `stability-ai/sdxl` as a PoC unblock. This model supports img2img conditioning via `image` + `prompt_strength`, which provides some character continuity but is weaker than IPAdapter. A proper IPAdapter-capable NSFW model must be identified for the eval run.
- **Style LoRAs in use:** None in PoC. Style is controlled via style preset `promptSuffix` and `negativePrompt` parameters. LoRA activation can be wired in once a model that supports it is selected.
- **Consistency method:** IPAdapter via `image` + `ip_adapter_scale: 0.6`. Reference portrait URL is passed as `image` input. All scene images are conditioned on the same reference portrait. Style consistency is enforced by locking a single base model + preset combo per story (user selects at story creation time, cannot change mid-story).
- **Alternatives to evaluate** (run eval script against these):
  - SDXL NSFW fine-tune (e.g., `asiryan/reliberate-v3` — check current Replicate catalog; availability changes)
  - Flux NSFW fine-tune (e.g., `xlabs-ai/flux-dev-realism` or a community NSFW Flux variant — higher baseline quality, IPAdapter support varies by model)
  - Pony Diffusion XL (strong NSFW stylistic range; check if current Replicate listing supports `image` input for IPAdapter conditioning)
- **Known weaknesses:**
  - `lucataco/ip-adapter-sdxl` uses base SDXL with Replicate's content policy; explicit NSFW content is filtered. **This model cannot be used for production NSFW generation.** It is suitable only for PoC testing of the consistency mechanism.
  - IPAdapter weight 0.6 is a sensible default but may need tuning per model; too high → character likeness overpowers prompt, too low → drift across scenes.
  - Replicate model availability changes without notice; version hashes can go stale. Using the deployment API (`/v1/models/{owner}/{name}/predictions`) avoids version pinning but may introduce regressions when a model is updated. Pin to a specific version hash after confirming the chosen model via eval.
  - Current implementation passes reference portrait URL directly to Replicate; if the reference portrait is stored in a private MinIO instance, Replicate cannot fetch it. **MINIO_PUBLIC_URL must be set to a publicly-accessible URL** in production, or presigned URLs must be generated for the reference portrait before passing to Replicate.

## Cost Profile

Rough per-generation cost for a 2,000–3,000-word story with 3–5 illustrations:

- Text (planning + writing): $0.01–0.05
- Images (3–5 consistent illustrations via Replicate): $0.10–1.00

Per generation, expect $0.15–1.50 of compute before margin. These numbers drive post-PoC pricing decisions.
