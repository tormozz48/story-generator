# Generation Pipeline

## Flow

The pipeline is structured so a single planning step upfront makes all downstream consistency possible.

```
User prompt
  │
  ▼
1. SafetyModule.checkPrompt(prompt, language='ru')
  │
  ▼
2. TextAiModule.plan(prompt, options)
     → { title, characterSheet, styleDescription, sceneOutline[], imagePrompts[] }
  │
  ▼
3. TextAiModule.writeStory(plan, targetLength)
     → ≤4K words: single call
     → 4K–10K words: chunked with running-context
  │
  ▼
4. ImageAiModule.generateReferencePortrait(characterSheet)
     → stored in MinIO
  │
  ▼
5. ImageAiModule.generateSceneImages(imagePrompts, referencePortrait)
     → parallel, 3–5 images
  │
  ▼
6. Assemble, persist, notify frontend via Server-Sent Events
```

## The Planning Step

Step 2 is the mechanism for downstream consistency. It produces:

- Story title
- Character sheet (appearance, personality, identifying details — e.g., "25-year-old woman, long dark brown hair, green eyes, small mole on left cheek, slim athletic build…")
- Style descriptor (single preset for the whole story)
- Scene-by-scene outline
- Per-scene image prompts derived from the outline

The character sheet flows into the reference-portrait prompt (step 4). The reference portrait flows into every scene image (step 5). The style descriptor locks the aesthetic across all images. This is how character and style stay coherent.

Skip this step and you get random characters, inconsistent aesthetics, and drifting scene descriptions. This is the core piece of "secret sauce," not the model choice.

## Story Length Strategy

**≤4,000 words:** single LLM call. Most capable models handle this range cleanly in one shot.

**4,000–10,000 words:** chunked scene-by-scene using the outline from the planning step, passing previous scenes or a running summary as context. Quality degrades past ~5,000 output tokens regardless of model; chunking almost always wins at the long end.

Chunking is not built on day one. Single-call ships first; chunking is added when long-story quality becomes a real user-facing issue.

## Character and Style Consistency

The PoC approach is **IPAdapter-based face reference + style preset locking**.

One "hero" portrait is generated from the planning step's character sheet. Every subsequent scene image conditions on that portrait via IPAdapter. This gives strong character fidelity without training a per-story character LoRA.

Style consistency is enforced by locking a single base model + fine-tune + style LoRA combination for the full story. Users pick from 4–6 preset styles (e.g., photorealistic, anime, painterly) rather than mixing within a story.

Full character LoRA training — better quality, $1–5 per character, meaningful training time — is explicitly out of scope for the PoC but a known upgrade path.

## Latency Expectations

Rough per-generation time for a 2,000–3,000-word story with 3–5 illustrations:

- Planning: ~10–30 seconds
- Story writing: ~30–90 seconds
- Reference portrait: ~10–30 seconds
- Scene images (parallel): ~30–60 seconds

Total: ~2–4 minutes. This is why generation runs in a BullMQ worker, not in a request-response cycle, and why SSE is used for progress updates.
