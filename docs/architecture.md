# Architecture

## Tech Stack

Backend is **NestJS + TypeScript**, running in two modes from a single codebase: an HTTP API process and a BullMQ worker process. Shared modules, different bootstrap entrypoints. This avoids premature microservices while separating request handling from slow generation work.

Frontend is **Next.js** (App Router) with **MUI** components and Emotion styling. Client-rendered; no SSR is needed for the PoC. Details in `frontend.md`.

Data layer:

- **Postgres** — stories, jobs, metadata (accessed via **Drizzle ORM**)
- **Redis** — BullMQ queue and general cache
- **MinIO** — S3-compatible object storage for images and story JSON blobs

Validation throughout the backend uses **zod**, with schemas shared between backend and frontend via `packages/shared`.

MinIO is used rather than local filesystem storage so that migration to real S3 (AWS, Backblaze B2, Hetzner Object Storage) is a configuration change, not a refactor.

## Repository Layout

A single monorepo managed with **npm workspaces + Turborepo**:

```
/
├── apps/
│   ├── backend/            # NestJS (API + worker)
│   └── frontend/           # Next.js
├── packages/
│   └── shared/             # types, zod schemas, constants
├── turbo.json
└── package.json
```

See `tooling.md` for the full library and tooling stack.

## docker-compose Services

All components are containerized. The full PoC runs end-to-end with `docker compose up`.

| Service | Purpose |
| --- | --- |
| `postgres` | stories, jobs, metadata |
| `redis` | BullMQ queue and cache |
| `minio` | object storage for images and story blobs |
| `minio-console` | dev-only admin UI for MinIO |
| `backend` | NestJS HTTP API process |
| `worker` | NestJS BullMQ worker process |
| `frontend` | Next.js |

## NestJS Module Structure

Modules follow the product domain, not technical layers.

- `StoriesModule` — CRUD, listing, reading
- `GenerationModule` — orchestrates the pipeline, owns the BullMQ queue
- `TextAiModule` — OpenRouter adapter; single `generateStory(prompt, options)` surface
- `ImageAiModule` — Replicate adapter; single `generateImages(prompts, referenceImage)` surface
- `StorageModule` — MinIO wrapper; abstracts bucket/key for painless S3 migration
- `DatabaseModule` — provides the Drizzle instance as an injectable
- `SafetyModule` — prompt filters, keyword blocklists, CSAM pre-checks; runs before any AI call

Explicitly absent: `AuthModule`, `UsersModule`. See the Identity section.

## Provider Adapters

Both `TextAiModule` and `ImageAiModule` present a narrow, provider-agnostic surface to callers. The rest of the codebase does not care which provider is in use.

This is intentional: model selection is validated empirically during Week 2 (text) and Week 3 (images), and re-evaluation should be inexpensive. Swapping between OpenRouter, Together, Fireworks, or self-hosted should be a configuration change plus one adapter file.

## Identity (PoC)

No authentication, no signup, no sessions for the PoC.

Identity is anonymous-browser-UUID: the first page load sets a UUID cookie; stories are tagged with that UUID; the frontend shows a "my stories" history scoped to the cookie.

The `stories` table has a nullable `owner_id` column today. When real auth is added later, a `users` table joins it and registered users can claim their anonymous history via UUID linkage. The migration is trivial.

Rate limiting is IP-based via `@nestjs/throttler`, with a reasonable default of ~10 generations per IP per hour. This exists to prevent runaway AI spend from a misbehaving client, not to enforce product quotas.

## Logging

Standard NestJS `Logger`. One small adjustment: a custom logger formats output as JSON in production mode and pretty-prints in development. Roughly 20 lines of code. Avoids a painful migration when logs eventually need to ship to Loki, CloudWatch, or similar.

No APM, tracing, or metrics stack for the PoC. Docker captures stdout; `docker compose logs -f` is the dev workflow.

## Frontend ↔ Backend Communication

REST for command/query. **Server-Sent Events** for generation progress updates. SSE is chosen over WebSockets because the channel is one-way (backend → frontend for progress), simpler, and proxy-friendly.

The worker publishes progress events to Redis pub/sub; the API process forwards them over SSE to connected clients.

## See Also

- `tooling.md` — libraries, linters, commit conventions, CI, Docker
- `frontend.md` — Next.js + MUI architecture, component structure, state management
- `pipeline.md` — generation pipeline flow
- `testing.md` — four-tier testing strategy
