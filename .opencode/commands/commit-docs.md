---
description: Commit docs changes with Gitmoji + Conventional Commits and push to main
---

# /commit-docs

Delegates to the `git-workflow-master` subagent to commit and push the current repository state with a docs-focused commit message.

Do NOT run this yourself. Dispatch it via the Task tool to the `git-workflow-master` subagent with the full prompt from `.opencode/agents/git-workflow-master.md`.

Steps:
1. Read `.opencode/agents/git-workflow-master.md` for the full workflow.
2. Dispatch the workflow content as a task to the `git-workflow-master` subagent.
3. Report back the result (commit hash, push confirmation, summary).
