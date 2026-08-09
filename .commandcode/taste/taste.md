# git
- Use Gitmoji + Conventional Commits format (`<gitmoji> <type>(<scope>): <subject>`) for commit messages. Confidence: 0.80
- Use the git-workflow-master subagent workflow (`.opencode/agents/git-workflow-master.md`) for commit-and-push tasks. Confidence: 0.75

# workflow
- Use bun as the only runtime for application commands; never use npm, yarn, or pnpm. Confidence: 0.80
- Never run `bun run build`; verify with `bun run typecheck` and `bun run audit:load` instead. Confidence: 0.80
