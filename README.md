# Story Generator

PoC for an AI service that generates adult-content stories with consistent illustrations in Russian. Architected to support additional languages later.

## Status

Pre-implementation. Design phase complete. Scaffolding is the next step.

## Thesis

Better Russian-language output and better illustration consistency than existing competitors. Thesis validation (competitor research) is still pending.

## Quick Orientation

Stack: NestJS + TypeScript backend (API + BullMQ worker processes from one codebase), Next.js frontend, Postgres, Redis, MinIO — all in docker-compose. Text generation routes through OpenRouter behind an adapter; images through Replicate behind an adapter. No auth during PoC. Anonymous browser-UUID cookies scope per-browser history.

Run target: `docker compose up` brings the entire PoC online end-to-end.

## Documentation

Design lives in `docs/`:

- [product.md](docs/product.md) — product vision, scope, thesis, competitor-research TODO
- [constraints.md](docs/constraints.md) — non-negotiables and deferred compliance work
- [architecture.md](docs/architecture.md) — stack, services, module structure, identity, logging
- [tooling.md](docs/tooling.md) — libraries, linters, commit conventions, CI, Docker
- [frontend.md](docs/frontend.md) — Next.js + MUI architecture, component structure, state management
- [pipeline.md](docs/pipeline.md) — generation pipeline, length strategy, consistency approach
- [models.md](docs/models.md) — text and image model selection and evaluation process
- [safety.md](docs/safety.md) — CSAM prevention and compliance posture
- [testing.md](docs/testing.md) — four-tier testing strategy
- [roadmap.md](docs/roadmap.md) — week-by-week plan, deferred scope, open questions

For behavioral guidelines when working on this project with Claude, see `CLAUDE.md`.
