# Developer Tooling

The complete stack of libraries, configs, and conventions used across the codebase. Locked during design; change only with clear rationale.

## Package Manager and Monorepo

- **npm** as package manager
- **npm workspaces** for shared dependencies
- **Turborepo** on top for task orchestration, caching, and parallel execution

Repository layout:

```
/
├── apps/
│   ├── backend/            # NestJS (API + worker, same codebase)
│   └── frontend/           # Next.js
├── packages/
│   └── shared/             # types, zod schemas, shared constants
├── turbo.json
└── package.json
```

Turborepo pipeline covers `build`, `dev`, `lint`, `test`, `typecheck`. `turbo prune` is used in Docker builds to produce per-app dependency trees and keep image sizes down.

## Language and Runtime

- **TypeScript** everywhere, `strict: true`, `noImplicitAny`, `strictNullChecks`
- Target **ES2022**
- Runtime: **Node 20+**

## Backend (NestJS)

- **NestJS** framework
- **SWC** as the NestJS compiler (native NestJS option, faster than tsc)
- **Drizzle ORM** with `drizzle-kit` for migrations
- **zod** for validation (request bodies, env config, AI output parsing), with a small NestJS pipe adapter
- **@nestjs/config** for env loading, validated through a zod schema at boot
- **BullMQ** queue via `@nestjs/bullmq`
- **MinIO JS SDK** (S3-compatible client) for object storage
- **Native fetch** for outgoing HTTP; no axios
- **Helmet** for HTTP security headers
- **@nestjs/throttler** for IP-based rate limiting
- Logging: NestJS default `Logger`, custom JSON formatter in production

## Frontend (Next.js)

- **Next.js 14+** with App Router
- **MUI** (`@mui/material`, `@mui/icons-material`) with **Emotion** styling
- **`@mui/material-nextjs`** for App Router SSR cache integration
- **TanStack Query** for server state
- **React Hook Form + zod resolver** for forms (schemas shared from `packages/shared`)
- **Inter** font, self-hosted via `next/font/google`

See `frontend.md` for component architecture and folder structure.

## Shared Packages

- Built with **Vite** in library mode (standard for TypeScript libraries)
- `packages/shared` exports typed API contracts, zod schemas, and constants consumed by both backend and frontend

## Testing

- **Vitest** as test runner
- **Supertest** for HTTP route testing
- **Testcontainers** for real Postgres/Redis/MinIO in integration tests
- **Polly.js** (or **nock** with recording) for HTTP cassettes in e2e tests
- **@nestjs/testing** for `TestingModule` and provider overrides
- **BullMQ built-in test helpers** for worker tests

See `testing.md` for the four-tier strategy.

## Linting and Formatting

- **ESLint** with `@typescript-eslint/recommended`, `eslint-config-next` (frontend), `eslint-plugin-import`
- **Prettier** owns formatting; ESLint does not duplicate format rules (`eslint-config-prettier` disables overlap)
- Prettier config: 100-char line width, single quotes, semicolons, trailing commas (`es5`), LF line endings

## Pre-commit and Commit Conventions

- **husky** for git hooks
- **lint-staged** to run formatters and linters only on changed files
- Pre-commit runs: Prettier format, ESLint fix, `tsc --noEmit` scoped to the affected app
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- **commitlint** enforces commit message format via `commit-msg` hook

## Common Utilities

- **date-fns** — date handling (not Moment, not dayjs)
- **UUIDs** — `crypto.randomUUID()` (native, no library)
- **Schema sharing** — zod schemas in `packages/shared`, consumed by both apps

## CI

- **GitHub Actions**
- Workflows:
  - **On PR (fast):** lint + typecheck + unit + integration tests (Vitest, Testcontainers)
  - **On PR (slower):** e2e tests with recorded cassettes
  - **Scheduled (nightly):** contract tests against live AI APIs
  - **Manual trigger:** quality eval suite

## Docker

- Multi-stage builds for backend and frontend
- Base image: **Node 20 Alpine**
- Non-root user in final stages
- `turbo prune` produces per-app dependency trees to minimize image size
- `docker compose up` brings the full PoC online (service layout in `architecture.md`)
