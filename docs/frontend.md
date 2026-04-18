# Frontend

## Framework

**Next.js 14+** with the App Router. Client-side rendered by default for the PoC. No SEO considerations (NSFW content), no SSR or SSG needed for the three pages we ship.

## UI Library

**MUI** (`@mui/material`, `@mui/icons-material`) with **Emotion** as the styling engine. MUI's official **`@mui/material-nextjs`** package handles the App Router SSR cache.

Rationale: MUI provides a complete, accessible design system out of the box. The PoC's time budget is better spent on the AI pipeline than on designing bespoke components. Dark theme aligns with adult-content conventions and is easier on the eyes during long reads.

## Theme

- **Dark theme by default.** Light mode toggle deferred to post-PoC.
- Primary font: **Inter**, self-hosted via `next/font/google` — strong Cyrillic coverage, no CDN dependency, no layout shift.
- Theme defined in `src/lib/theme.ts`, wrapped via `ThemeProvider` inside `src/app/providers.tsx`.

## Folder Structure

```
apps/frontend/
  src/
    app/                            # Next.js App Router
      layout.tsx                    # root layout, ThemeProvider, QueryClient
      page.tsx                      # / → generation form
      stories/
        page.tsx                    # /stories → history list
        [id]/page.tsx               # /stories/:id → reader
      providers.tsx                 # Theme + Query client wrapper
    components/
      ui/                           # reusable primitives
        LoadingState.tsx
        ErrorState.tsx
        EmptyState.tsx
      features/                     # feature-scoped composite components
        story-form/
          StoryForm.tsx
          LengthSlider.tsx
          StylePicker.tsx
          PromptField.tsx
        story-reader/
          StoryReader.tsx
          SceneImage.tsx
          GenerationProgress.tsx
        story-list/
          StoryList.tsx
          StoryCard.tsx
      layout/
        AppShell.tsx
        Header.tsx
    hooks/
      useGenerateStory.ts
      useStory.ts
      useGenerationProgress.ts
    lib/
      api-client.ts
      theme.ts
      query-client.ts
    types/                          # local UI types only; shared types in packages/shared
```

## Component Principles

- **`components/ui/` is for reusable primitives only** — things that could live on any page. Kept thin on purpose. Extending MUI, not reinventing it.
- **`components/features/` is feature-scoped.** No cross-feature imports. If two features need the same thing, lift it into `ui/` or into `packages/shared`.
- **One concern per component.** `StoryForm` orchestrates; `LengthSlider`, `StylePicker`, `PromptField` each own a single input. Small, composable, testable in isolation.
- **Hooks own server-state logic.** Components receive data as props or call a typed hook. No raw `fetch` or `QueryClient` calls inside component bodies.
- **Page components are route mounts, nothing more.** `app/stories/[id]/page.tsx` renders `<StoryReader storyId={params.id} />` and returns. All logic lives in the feature component it mounts.
- **Type all props, no `any`.** Prefer `type` aliases over `interface` for props; composition is cleaner.

## State Management

- **Server state:** TanStack Query. All API calls go through hooks (`useGenerateStory`, `useStory`) that wrap Query mutations and queries.
- **Client state:** React Context where needed (theme, anonymous UUID, UI preferences). Zustand is not used for the PoC; add only if client state becomes nontrivial.
- **Forms:** React Hook Form with the zod resolver. Validation schemas come from `packages/shared` where possible, so frontend and backend share identical validation rules.

## Generation Progress via SSE

The NestJS worker publishes progress events to a Redis pub/sub channel; the API backend exposes an SSE endpoint (`GET /api/jobs/:id/events`) that forwards those events to the client.

The frontend uses `useGenerationProgress(jobId)` to open an `EventSource`, maintain a local state machine (`queued → planning → writing → imaging → done | failed`), and expose current state and progress percentage to the reader component.

On completion, TanStack Query is invalidated for the story, triggering a final fetch of the complete story payload.

## Typical Page Flow

```
User lands on /
  ↓
StoryForm renders (prompt, length slider, style picker)
  ↓ submit (validated via zod + RHF)
useGenerateStory mutation → POST /api/stories
  ↓
server returns { storyId, jobId }
  ↓
router.push(`/stories/${storyId}?pending=true`)
  ↓
StoryReader mounts
  ↓
useGenerationProgress(jobId) opens SSE
  ↓
progress updates → <GenerationProgress> renders state
  ↓
on done → Query invalidated → useStory fetches final story
  ↓
Reader renders story text with inline <SceneImage> components
```

## Accessibility

MUI components meet WCAG AA by default. Keep keyboard navigation working and do not override default focus states without replacing them with equivalent or better styles. Content warnings (adult content) are clear and dismissible on first visit.

## Testing (Frontend)

Vitest + React Testing Library. Component tests live alongside components (`StoryForm.test.tsx` next to `StoryForm.tsx`). Hook tests use `renderHook` from RTL. MSW (Mock Service Worker) intercepts API calls in component tests.

See `testing.md` for the overall testing strategy; the rules there apply equally to the frontend.
