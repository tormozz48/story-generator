# Roadmap

## Week-by-Week Build Plan

### Week 1 — Skeleton

docker-compose running Postgres, Redis, MinIO. NestJS backend with a health endpoint and one stub `/stories` endpoint. Next.js frontend with a form page and a reader page. No AI yet.

**Goal:** everything talks to everything, runs cleanly on `docker compose up`, integration test harness works against Testcontainers.

### Week 2 — Text Generation

`TextAiModule` integrated with OpenRouter. Planning and story-writing flow implemented. Ten-plus Russian test prompts run through three or four candidate models (see `models.md`). One model selected as PoC default, with notes on why.

**Goal:** end-to-end text-only generation shipped, selected model documented.

### Week 3 — Images

`ImageAiModule` integrated with Replicate. Base image model chosen (candidates in `models.md`). IPAdapter-based character consistency wired in. Images generated in parallel, stored in MinIO, linked to the story.

**Goal:** full generation pipeline works end-to-end, illustrations are character- and style-consistent.

### Week 4 — Reader, Polish, Safety

Story reader UI (story text with embedded illustrations). Safety filter keyword lists and pattern rules. Error handling and retry semantics in the worker. IP-based rate limiting. Manual QA pass with real prompts.

**Goal:** functional PoC ready for founder review.

### Target

Functional PoC at end of Week 4. If scope reaches Week 6, scope has crept.

## PoC Simplifications (Deliberate Omissions)

Explicitly not being built during the PoC phase:

- Authentication, user accounts, email verification, OAuth, password reset
- Monetization, billing, subscriptions, credits
- Admin panel (MinIO console and direct `psql` are sufficient)
- Observability beyond stdout logs
- Multi-language support (Russian only for PoC)
- User library features beyond browser-scoped history
- Social or sharing features
- Character LoRA training (IPAdapter is enough for PoC)
- Chunked long-form generation (single-call first; chunking when needed)

## Open Questions

Unresolved at design time, to be resolved during the weeks noted.

- **Best Russian-NSFW text model** — resolved empirically in Week 2
- **Best NSFW image model for Russian-relevant content** — resolved in Week 3
- **Single-call vs chunked default for 4K–6K-word range** — decided during Week 2 testing
- **Anonymous-cookie identity vs fully anonymous with no user concept** — default is anonymous-cookie; revisitable before Week 1 implementation

## Outstanding Non-Technical Work

**Competitor research** — two hours minimum before serious build begins. Flagged in `product.md`. Does not block code, but blocks the founder's ability to judge whether PoC output actually clears the competitor floor.

## Post-PoC Horizon

Not a commitment, just a sketch of what "next" looks like if the PoC validates:

- Real authentication (email + password; optionally OAuth)
- Monetization (subscription or credits, TBD)
- Compliance stack (age verification, jurisdiction, payment processor, ToS-compliant hosting)
- Additional languages (English, then others)
- Character LoRA training for persistent characters across stories
- Output-side safety scanning (classifiers, VLMs)
- Observability stack (structured logs to Loki/CloudWatch, metrics, tracing)
