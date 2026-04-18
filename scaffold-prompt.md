# Scaffold Prompt — Story Generator Week 1

_Copy everything below this line into a fresh session._

---

You are joining an existing project at the current working directory. The project is **Story Generator**, a PoC for an AI service that generates adult-content stories with consistent illustrations in Russian. The full design is already documented in the repo. Your job is to scaffold the Week 1 skeleton defined in `docs/roadmap.md` — nothing more, nothing less.

## Step 1 — Read Before You Code

Read these in order. They are authoritative. Do not re-decide anything they've already decided.

1. `CLAUDE.md` — project context + behavioral guidelines. Follow the guidelines strictly.
2. `docs/architecture.md` — system shape, services, module structure
3. `docs/tooling.md` — every library, linter, build tool, and config
4. `docs/frontend.md` — Next.js + MUI architecture and folder structure
5. `docs/testing.md` — test harness layout and commands
6. `docs/roadmap.md` — Week 1 scope (what to build, what to defer)
7. Skim `docs/pipeline.md`, `docs/models.md`, `docs/safety.md`, `docs/constraints.md`, `docs/product.md` for context

Then `ls` the existing folder to see what's already present.

## Step 2 — What to Build

**Scope: Week 1 skeleton only.** Per `docs/roadmap.md`:

> docker-compose running Postgres, Redis, MinIO. NestJS backend with a health endpoint and one stub `/stories` endpoint. Next.js frontend with a form page and a reader page. No AI yet. Goal: everything talks to everything, runs cleanly on `docker compose up`, integration test harness works against Testcontainers.

Concretely, deliver:

**Root monorepo**

- `package.json` as npm workspaces root; `turbo.json` with `build`, `dev`, `lint`, `test`, `typecheck` pipelines
- Shared `tsconfig.base.json`, ESLint config, Prettier config (rules per `docs/tooling.md`), `.editorconfig`
- `commitlint.config.js` with Conventional Commits
- `.husky/` with pre-commit (lint-staged → Prettier + ESLint + `tsc --noEmit`) and commit-msg (commitlint)
- `docker-compose.yml` with the six services listed in `docs/architecture.md`
- `.env.example` documenting every required variable
- `.dockerignore`, updated `.gitignore`

**apps/backend (NestJS)**

- Scaffold with SWC compiler
- Split entrypoints: `src/main.ts` for API, `src/worker.ts` for BullMQ worker
- `AppModule` wiring every module stub listed in `docs/architecture.md` (`StoriesModule`, `GenerationModule`, `TextAiModule`, `ImageAiModule`, `StorageModule`, `DatabaseModule`, `SafetyModule`). Stubs only — real logic marked `// TODO: Week N`.
- Working `GET /health` returning `{ status: 'ok' }` and a stub `POST /stories` that zod-validates the request and returns `{ storyId, jobId }` without generating anything
- `@nestjs/config` loading `.env` through a zod schema; boot must fail loudly on missing vars
- Drizzle configured: `drizzle.config.ts`, minimal `stories` table in `src/db/schema.ts`, `DatabaseModule` providing the Drizzle instance as an injectable
- MinIO client in `StorageModule` with a health check against the container
- BullMQ queue + stub processor in `GenerationModule`
- Helmet + `@nestjs/throttler` wired
- Custom JSON logger for production mode (spec in `docs/architecture.md`)
- Multi-stage `Dockerfile`, Node 20 Alpine, non-root user
- Three Vitest configs (`vitest.config.ts`, `vitest.integration.config.ts`, `vitest.e2e.config.ts`) with correct roots
- Test directory skeleton: `test/{unit,integration,e2e,fixtures}`
- One smoke test per tier proving the harness works (unit passes; integration spins up Testcontainers and hits `/health`)

**apps/frontend (Next.js)**

- Next.js 14+ App Router
- MUI with Emotion + `@mui/material-nextjs` wired in `src/app/providers.tsx` with `ThemeProvider`
- `src/lib/theme.ts` with a dark theme and Inter font via `next/font/google`
- TanStack Query `QueryClient` in providers
- Folder structure exactly as in `docs/frontend.md` — `app/`, `components/{ui,features,layout}/`, `hooks/`, `lib/`, `types/`
- Three pages: `/` (form stub), `/stories` (history stub), `/stories/[id]` (reader stub)
- `src/lib/api-client.ts` using native fetch
- `useGenerateStory` hook using TanStack Query mutation
- Working form at `/` that POSTs to the backend `/stories` and navigates to `/stories/[id]` — this proves end-to-end plumbing
- Multi-stage `Dockerfile`
- Vitest + React Testing Library + MSW configured

**packages/shared**

- Vite library-mode package exporting zod schemas and types
- At minimum: `StoryGenerationRequestSchema` consumed by both backend validation and frontend form validation (shape per `docs/pipeline.md` — prompt + options)
- Builds into ESM + types; consumable by both apps via workspace reference

## Step 3 — Quality Bar

Before declaring done, verify all of the following and report results:

1. `docker compose up --build` — every service starts, no crash loops in logs
2. `curl http://localhost:PORT/health` returns 200 with `{ status: 'ok' }`
3. The frontend loads in a browser and submitting the form on `/` POSTs to the backend and navigates to `/stories/[id]` successfully
4. `npm test` at the root runs unit + integration tests across all workspaces in parallel via Turborepo; all green
5. `npm run lint` and `npm run typecheck` at the root pass cleanly
6. `git commit -m "test"` is rejected by commitlint; `git commit -m "chore: init scaffold"` passes
7. Pre-commit hook runs Prettier, ESLint, and `tsc --noEmit` on staged files

## Step 4 — Constraints

- Follow `CLAUDE.md` behavioral guidelines strictly. Simplicity first. No speculative abstractions. No "improvements" outside the request.
- Do not implement AI integration. `TextAiModule` and `ImageAiModule` are empty stubs.
- Do not implement safety filters. `SafetyModule` is a stub signature.
- Do not add auth anywhere.
- Do not add observability beyond the JSON logger.
- Do not add libraries beyond those listed in `docs/tooling.md` without stopping to ask.
- Do not overwrite or rewrite any existing file in `docs/`, `CLAUDE.md`, or `README.md`. You may extend `README.md` with build/run instructions if needed.
- Do not commit `.env`; commit `.env.example` only.

## Step 5 — Working Style

- Build in this order: root configs → packages/shared → apps/backend → apps/frontend → docker-compose → integration verification.
- After each major section, run the relevant commands and confirm they succeed before moving on. Do not batch failures.
- If you hit a genuine decision not covered in the docs, stop and ask. Do not silently pick.
- Use Conventional Commits. Commit logical units of work as you go (`chore: init workspaces`, `feat(backend): scaffold NestJS skeleton`, etc.).

## Step 6 — Deliverable

At the end, produce a short summary containing:

- What was scaffolded (one-line per workspace)
- The exact commands to verify the scaffold works
- Results of the Quality Bar checks above
- Any TODOs left behind that are not already captured in `docs/roadmap.md`

Do not write narrative explanations of the stack — the docs already cover that. Your summary is a handoff, not a design doc.

---

_End of prompt._
