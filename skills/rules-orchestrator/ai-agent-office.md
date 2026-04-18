---
description: General guidance
globs:
  - 'apps/ai-agent-office/**'
alwaysApply: Always
---

After the task is done:

1. Ask Simplifier to simplify the code
2. Ask Reviewer mode to do code review
3. If Reviewer finds problems, fix them
4. Run tests and fix until they pass
5. Run `precommit run --all-files` and fix until it passes
