# Docs Commit Workflow Standard

Written by OpenCode on 2026-07-12 via Local Runner.

Defines the automated pipeline for committing, validating, and pushing documentation changes across four enforcement layers.

---

## Overview

The old `docs/Prompts/prompt-git-docs-commit.md` required manual invocation. This standard replaces it with a 5-layer automated system:

| Layer | File | Trigger | What it does |
|-------|------|---------|-------------|
| **Shell Script** | `commit-docs.ps1` | `pwsh ./commit-docs.ps1` or `git commit-docs` | Quick stage + commit + push from terminal |
| **Agent** | `.opencode/agents/git-workflow-master.md` | `@git-workflow-master` mention | Full commit + push with secret scan |
| **Command** | `.opencode/commands/commit-docs.md` | `/commit-docs` in chat | Delegates to the agent above |
| **Hook** | `.githooks/pre-push` | `git push` (local) | Validates commit message format + secrets |
| **CI** | `.github/workflows/docs-commit.yml` | Push/PR to `main` affecting `docs/` | Server-side validation |

All five enforce the same rules:
- **HARD RULE: Every commit message MUST start with a gitmoji. No exceptions.**
- Commit format: `<gitmoji> <type>(<scope>): <subject>` (≤72 chars)
- No secrets in diffs (keys, PEMs, credentials)

---

## How to trigger each layer

### 1. Shell Script (`commit-docs.ps1`)

The fastest way to commit and push from any terminal. Two options:

**Option A — Direct PowerShell:**
```powershell
pwsh ./commit-docs.ps1
```

**Option B — Git alias (registered in this repo):**
```bash
git commit-docs
```

What it does:
1. Stages all changes (`git add -A`)
2. Detects what type of files changed (docs, source code, config)
3. Determines appropriate gitmoji + type + scope:
   - `docs/` only → `📝 docs(standard)`
   - Source code → `🐛 fix(module)` or `✨ feat(module)` based on change type
   - Config files → `🔧 chore(config)`
4. Commits and pushes to `main`

**Tradeoff:** The message is auto-generated from file patterns — it won't explain *what* the changes are about. For smarter messages, use the agent or slash command.

**Setup:** Already configured. The git alias `commit-docs` runs `pwsh -File commit-docs.ps1`.

### 2. Agent (`@git-workflow-master`)

Type `@git-workflow-master` followed by your request in any OpenCode conversation. The agent reads its persona from `.opencode/agents/git-workflow-master.md` and runs the full workflow: inspect → secret scan → stage → commit → push.

### 3. Slash Command (`/commit-docs`)

Type `/commit-docs` in an OpenCode conversation. This dispatches the commit workflow to the `git-workflow-master` subagent automatically. No arguments needed — it commits everything.

### 4. Pre-push Hook (automatic on `git push`)

Every `git push` runs `.githooks/pre-push` locally. It checks:
- The commit message matches `<gitmoji> <type>(<scope>): <subject>` format
- The subject is ≤72 characters
- No known secret patterns exist in staged diffs

If validation fails, the push is rejected with an error message. Fix the issue and retry.

The hooks path was set with:
```bash
git config core.hooksPath .githooks
```
This is already configured for this repo.

### 5. CI Workflow (automatic on GitHub)

`.github/workflows/docs-commit.yml` runs on GitHub when:
- **Push** to `main` that touches `docs/**`
- **PR** targeting `main` that touches `docs/**`

It validates the same rules server-side. If a push's commit message fails validation, the workflow fails and you'll see a red ❌ on the commit.

---

## What happens when it runs

**Shell script flow:**
```
You run pwsh ./commit-docs.ps1 (or git commit-docs)
  → git add -A
  → git diff --cached --name-only (detect file types)
  → Determine gitmoji + type + scope based on change type
  → Generate message: <gitmoji> <type>(<scope>): update files + file list
  → git commit -m "<generated message>"
  → git push origin main
```

**Agent / Command flow:**
```
You type /commit-docs
  → OpenCode reads .opencode/commands/commit-docs.md
  → Dispatches to git-workflow-master subagent
  → git status + git diff --stat
  → Secret scan on diff
  → git add -A
  → git commit -m "<gitmoji> <type>(<scope>): <subject>"
  → git push origin main
  → Reports commit hash + summary
```

**Hook flow (at push time):**
```
git push
  → pre-push hook runs
  → Reads .git/COMMIT_EDITMSG
  → Validates format with regex
  → Checks subject length
  → Scans staged diff for secret patterns
  → Pass → push proceeds
  → Fail → push rejected, error shown
```

**CI flow (after push):**
```
Push to main (docs/ changed)
  → GitHub runs docs-commit.yml
  → git log -1 --format="%s"
  → Validates message format
  → Scans diff for secrets
  → Green ✅ or red ❌ on commit
```

---

## Quick reference

| Action | Method | Automation |
|--------|--------|-----------|
| Quick commit + push (shell) | `pwsh ./commit-docs.ps1` or `git commit-docs` | Terminal |
| Smart commit + push (agent) | `/commit-docs` or `@git-workflow-master` | Agent-driven |
| Validate message locally | `git push` | Automatic (hook) |
| Validate message in CI | Push to `main` | Automatic (GitHub) |
| Scan for secrets locally | `git push` | Automatic (hook) |
| Scan for secrets in CI | Push/PR to `main` | Automatic (GitHub) |

---

## Troubleshooting

**Shell script not working:**
- Ensure PowerShell is installed: `pwsh --version`
- Run from repo root: `pwsh ./commit-docs.ps1`
- Or use the git alias: `git commit-docs`

**Hook rejects my push:**
- Run `git log -1` to see your last commit message
- Fix it with `git commit --amend -m "<correct format>"`
- Hook only checks the commit message of the commit being pushed

**CI fails:**
- Check the GitHub Actions run log for the exact error
- The commit message format is validated against the same pattern as the hook

**Hook not running:**
- Verify hooks path: `git config core.hooksPath` should return `.githooks`
- Re-run: `git config core.hooksPath .githooks`

**Need to skip hook temporarily:**
```bash
git push --no-verify
```
Only for emergencies — it bypasses secret scanning too.

---

## Tool compatibility

All five layers live in the repo and work regardless of which coding agent tool you use. The **shell script** works in any terminal with PowerShell. The **hook** and **CI** layers run automatically. The **agent** and **command** layers are tool-specific.

| Tool | Shell script | Agent file location | Command file location | Compatible? |
|------|-------------|-------------------|---------------------|-------------|
| **Any terminal** | `pwsh ./commit-docs.ps1` or `git commit-docs` | N/A | N/A | ✅ Works everywhere |
| **OpenCode** | ✅ | `.opencode/agents/git-workflow-master.md` | `.opencode/commands/commit-docs.md` | ✅ Full — designed for this |
| **Claude Code** | ✅ | `.claude/agents/` | `.claude/commands/` | ✅ Copy agent `.md` into `.claude/agents/` and command into `.claude/commands/` for native `@git-workflow-master` and `/commit-docs` |
| **MiMo Code** | ✅ | `.mimocode/agents/` (MD frontmatter) | `.mimocode/commands/commit-docs.md` | ✅ Copy command file; MiMo agents use Markdown frontmatter format (`name`, `description`, `mode`) — adjust header if needed |
| **Codex CLI** | ✅ | `.codex/config.toml` + `AGENTS.md` | N/A | ⚠️ Requires registering the agent in `config.toml` and/or `AGENTS.md`; no native slash commands. The hook + CI layers still cover you. |
| **Antigravity CLI** | ✅ | `.agents/agents/` (JSON or MD frontmatter) | `.agents/commands/` | ⚠️ Copy agent with format conversion to JSON if needed; hook + CI remain active. |
| **Kiro CLI** | ✅ | Built-in guide agent | Built-in slash commands | ⚠️ No custom agent file loading — use `/commit-docs` in Kiro's own format if supported, else rely on hook + CI. |
| **VS Code** | ✅ | N/A | `.vscode/tasks.json` | ⚠️ No agent system. Shell script + hook + CI are the primary layers. Can also define a `tasks.json` terminal task. |
| **Freebuff** | ✅ | Unknown | Unknown | ⚠️ Hook + CI layers work for anyone. Shell script works in any PowerShell terminal. Agent/command layers need Freebuff-specific config files. |

**Bottom line:** `pwsh ./commit-docs.ps1` (or `git commit-docs`) works in any terminal. The `.githooks/pre-push` hook and `.github/workflows/docs-commit.yml` CI workflow protect every push from any tool. The agent + command convenience layers only matter for tools that read `.opencode/` (OpenCode), `.claude/` (Claude Code), or `.mimocode/` (MiMo Code).
