# investigation
- For root-cause/bug investigations, do read-only analysis first and produce a report before modifying any application code or database data. Confidence: 0.70
- In investigation reports, report exact file paths, functions, migrations, and line numbers; never hallucinate paths. Confidence: 0.65
- After a read-only investigation, use `git status`/`git diff` to confirm the working tree remains unchanged (zero modifications). Confidence: 0.60

# git
- Use Gitmoji + Conventional Commits format (`<gitmoji> <type>(<scope>): <subject>`) for commit messages. Confidence: 0.80
- Verify commit message stays under 72 bytes (count bytes with PowerShell) before committing. Confidence: 0.70
- Use the git-workflow-master subagent workflow (`.opencode/agents/git-workflow-master.md`) for commit-and-push tasks. Confidence: 0.75

# workflow
- Use bun as the only runtime for application commands; never use npm, yarn, or pnpm. Confidence: 0.80
- This is a Windows environment: use `findstr` or PowerShell instead of grep for text processing in shell commands. Confidence: 0.60
- Never run `bun run build`; verify with `bun run typecheck` and `bun run audit:load` instead. Confidence: 0.80
