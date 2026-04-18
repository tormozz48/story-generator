# Testing Strategy

Four layers, each with a distinct purpose, cost profile, and run cadence.

The design is built around a specific problem: AI model calls are slow, expensive, non-deterministic, and depend on external providers that change without warning. Naive "test everything against real APIs" approaches burn money and produce flaky tests that teams eventually ignore. The strategy below avoids that.

## Layer 1 — Unit Tests

Pure logic, no I/O, mock everything. Covers:

- Safety filter rules
- Prompt template rendering
- Chunking logic (once implemented)
- Story assembly
- Frontend component behavior (React Testing Library)
- Hooks (via `renderHook`)

Run on every commit. Target: full unit suite in seconds.

## Layer 2 — Integration Tests

Routes and worker behavior, with real Postgres, Redis, and MinIO via **Testcontainers**.

For HTTP routes: Supertest against a booted `TestingModule`.

For the worker: boot a real BullMQ queue against real Redis, enqueue a job, assert the state machine (queued → active → completed/failed), assert DB writes and MinIO uploads happened.

**Critical rule:** at this layer, `TextAiModule` and `ImageAiModule` are mocked at the NestJS provider boundary. Testing orchestration, not AI output. This keeps integration tests fast, deterministic, and free.

For the frontend, API calls are intercepted by **MSW** (Mock Service Worker). Same principle: testing orchestration, not the backend.

Run on every commit, same `npm test` invocation as unit tests.

## Layer 3 — E2E Tests with Recorded AI Responses

Exercises the full backend pipeline from HTTP request through stored story and images, using **record-and-replay** for AI calls.

**Tooling:** Polly.js or nock with recording.

**Workflow:**

1. First run with `RECORD=true` — real API calls happen, responses captured as JSON cassettes under `__fixtures__/`, committed to git.
2. Every subsequent run replays from cassettes. No network, no cost, deterministic.
3. When a prompt or model changes, the relevant cassettes are re-recorded deliberately.

**Assertion rules:** never assert exact AI-generated text. Assert structure and invariants — language detected as Russian, length within bounds, images stored, counts correct, schema valid.

Run on PR checks and before releases.

## Layer 4 — Live Contract and Quality Tests

Run on a schedule, not on every commit.

**Contract tests:** daily, tiny fixed prompt, hits real APIs. Asserts response shape. Catches provider API changes, schema drift, and model deprecations.

**Quality evals:** LLM-as-judge pattern. A generated story plus a rubric is fed to a strong evaluator model, which returns a pass/fail and score. Run manually before model switches, or weekly to catch drift. Budget: ~$0.50–2 per eval-suite run.

**Image quality evals:** CLIP or VLM-based scoring of "does this image match the prompt description?" — optional for PoC, human spot-checks suffice at PoC volume.

## Directory Layout

```
apps/
  backend/
    src/
    test/
      unit/                 # fast, no I/O
      integration/          # Testcontainers, mocked AI
      e2e/                  # Polly cassettes, full pipeline
      fixtures/             # cassettes
      evals/                # live quality evals, manual run
      contract/             # live API shape checks, scheduled
    vitest.config.ts
    vitest.integration.config.ts
    vitest.e2e.config.ts
  frontend/
    src/
      # component and hook tests colocated with source (*.test.tsx)
    test/
      setup/                # MSW handlers, test providers
    vitest.config.ts
```

## Commands

- `npm test` — unit + integration, fast, every commit
- `npm run test:e2e` — cassette-based e2e, PR checks
- `npm run test:contract` — live API shape checks, nightly CI
- `npm run test:eval` — quality evals, manual before releases

Turborepo orchestrates these across the monorepo so running `npm test` at the root fans out to `apps/backend`, `apps/frontend`, and `packages/shared` in parallel with cached results.

## Tools

- **Vitest** — test runner (replaces Jest; same API for `describe`/`it`/`expect`, `vi.mock` instead of `jest.mock`)
- **React Testing Library** — frontend component testing
- **MSW** — HTTP mocking for frontend tests
- **Supertest** — HTTP route testing (backend)
- **Testcontainers for Node** — real Postgres/Redis/MinIO in integration tests
- **Polly.js** or **nock** with recording — HTTP cassettes for AI calls
- **@nestjs/testing** — `TestingModule` and provider overrides
- **BullMQ built-in test helpers** — worker job assertions

## Guardrails

- Never hit real AI APIs on every commit. Cost and flakiness will make tests useless.
- Never use in-memory Postgres fakes (pg-mem and similar). They always diverge from real behavior.
- Never assert exact AI-generated text. Assert structure, language, presence, length ranges.
- Skipping integration tests "until later" means they never get written.
