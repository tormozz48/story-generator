---
name: git-commit-helper
description: Generate descriptive commit messages by analyzing git diffs for the Numica Platform. Use when writing commit messages or reviewing staged changes. Follows conventional commits format aligned with project CI/CD workflows.
license: Apache-2.0
metadata:
  author: numica
  version: '1.0.0'
  tags: git commits workflow versioning
compatibility: Requires git access
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Git Commit Helper

## Quick Start

```bash
# View staged changes
git diff --staged

# Generate commit message based on changes
# (analyze the diff and suggest a message)
```

## Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type         | Use For                             |
| ------------ | ----------------------------------- |
| **feat**     | New feature                         |
| **fix**      | Bug fix                             |
| **docs**     | Documentation changes               |
| **style**    | Code style (formatting, semicolons) |
| **refactor** | Code refactoring                    |
| **test**     | Adding or updating tests            |
| **chore**    | Maintenance tasks                   |
| **perf**     | Performance improvements            |
| **ci**       | CI/CD changes                       |

### Scopes (Numica Platform)

| Scope          | When                                    |
| -------------- | --------------------------------------- |
| **core**       | `apps/core/` backend changes            |
| **client-web** | `apps/client-web/` frontend             |
| **agent-web**  | `apps/agent-web/` frontend              |
| **ui**         | `packages/ui/` component library        |
| **sdk**        | `packages/sdk/` API contracts           |
| **web-kit**    | `packages/web-kit/` shared utilities    |
| **ai-agent**   | `apps/ai-agent-office/` Python/Temporal |
| **helm**       | `.helm/` deployment configs             |
| **ci**         | `.github/workflows/` CI changes         |
| **storybook**  | `apps/storybook/` stories               |

### Examples

**Feature:**

```
feat(client-web): add bank account creation form

Implement form with Zod validation for bank account details.
Includes proper error handling and success notifications.
```

**Bug fix:**

```
fix(core): handle null values in client profile

Prevent crashes when client profile fields are null.
Add null checks before accessing nested properties.
```

**Refactor:**

```
refactor(sdk): simplify counterparty schema

Extract common fields into base schema using z.extend().
Reduce duplication across create/update schemas.
```

## Guidelines

**DO:**

- Use imperative mood ("add feature" not "added feature")
- Keep first line under 50 characters
- Capitalize first letter
- No period at end of summary
- Explain WHY not just WHAT in body
- Reference issue numbers when applicable

**DON'T:**

- Use vague messages ("update", "fix stuff")
- Include implementation details in summary
- Write paragraphs in summary line
- Use past tense

## Multi-File Commits

```
refactor(core): restructure authentication module

- Move auth logic from controllers to service layer
- Extract validation into separate validators
- Update tests to use new structure

Breaking change: Auth service now requires config object
```

## Breaking Changes

```
feat(sdk)!: restructure API response format

BREAKING CHANGE: All API responses now follow new contract

Migration guide: Update client code to handle new structure
```

## Commit Checklist

- [ ] Type is appropriate (feat/fix/docs/etc.)
- [ ] Scope matches Numica monorepo area
- [ ] Summary is under 50 characters
- [ ] Summary uses imperative mood
- [ ] Body explains WHY not just WHAT
- [ ] Breaking changes clearly marked
- [ ] Related issue numbers included
- [ ] Atomic: one logical change per commit
