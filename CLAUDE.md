# CLAUDE.md

## Project Context

**Story Generator** — PoC for an AI service that generates adult-content stories with consistent illustrations, primarily for Russian-language users. Architected to support additional languages later.

**Stack:** NestJS + TypeScript backend (API + BullMQ worker processes from a single codebase), Next.js frontend, Postgres + Redis + MinIO, all in docker-compose. Text generation via OpenRouter (adapter pattern, model swappable). Image generation via Replicate. No auth for PoC (anonymous-browser-UUID cookies).

**Critical constraints:** Mainstream AI APIs (Claude, OpenAI, Google, Midjourney, DALL-E, Stability hosted) are NOT usable — their ToS prohibit NSFW content. CSAM prevention must be wired up before the first real generation.

**Documentation** — full design lives in `docs/`. Read relevant sections before making decisions in that area:

- `docs/product.md` — vision, scope, thesis
- `docs/constraints.md` — non-negotiables and deferred compliance work
- `docs/architecture.md` — stack, services, modules, identity, logging
- `docs/tooling.md` — libraries, linters, commit conventions, CI, Docker
- `docs/frontend.md` — Next.js + MUI architecture, component structure, state management
- `docs/pipeline.md` — generation flow, planning step, length strategy, consistency approach
- `docs/models.md` — text and image model selection and evaluation
- `docs/safety.md` — CSAM prevention and compliance posture
- `docs/testing.md` — four-tier testing strategy
- `docs/roadmap.md` — week-by-week plan, PoC scope, deferred features, open questions

Check `README.md` for quick orientation.

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.