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

*To be filled in after Week 2 evaluation.*

- **Chosen model:** TBD
- **Rationale:** TBD
- **Alternatives tested:** TBD
- **Known weaknesses:** TBD

### Image

*To be filled in after Week 3 evaluation.*

- **Chosen model:** TBD
- **Style LoRAs in use:** TBD
- **Consistency method:** IPAdapter (planned)
- **Rationale:** TBD
- **Alternatives tested:** TBD
- **Known weaknesses:** TBD

## Cost Profile

Rough per-generation cost for a 2,000–3,000-word story with 3–5 illustrations:

- Text (planning + writing): $0.01–0.05
- Images (3–5 consistent illustrations via Replicate): $0.10–1.00

Per generation, expect $0.15–1.50 of compute before margin. These numbers drive post-PoC pricing decisions.
