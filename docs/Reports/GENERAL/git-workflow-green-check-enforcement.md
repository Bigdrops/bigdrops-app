# Git Workflow — Green Check Enforcement (Red X to Green Tick)

This report was written by Buffy on 2026-08-09 via Freebuff.

## A. Objective & Scope

Fix GitHub showing a red X next to pushed commits. The user wanted a green
tick. The work covered commit-message rule enforcement in the
`git-workflow-master` agent and the local `pre-push` hook, then a compliant
commit and push to demonstrate the green check.

## B. Evidence — Root Cause

Facts (verified via `gh api` on `Bigdrops/bigdrops-app`):

- The `docs-commit` workflow runs a `validate` job on every push that touches
  `docs/**`.
- The check requires a Gitmoji + Conventional Commits subject
  (`^[^\x00-\x7F]+ [a-z]+\([a-z\-]+\): .+$`) with a maximum length of 72 bytes.
- Check runs on the last 6 commits: 5 failures, 1 success.
  - `c73e3a64` (89-byte subject) → failure
  - `0adcf591`, `1c23e6a0`, `5f05f72c`, `f983d247` (no gitmoji) → failure
  - `c2bd8441` (compliant, 64 bytes) → success
- The local `.githooks/pre-push` hook (active via `core.hooksPath`) only
  warned and never blocked these violations.

Conclusion: the red X was caused by commit messages exceeding 72 bytes or
missing the gitmoji format. The GitHub check is correct; the commits were not.

## C. Changes

1. `.opencode/agents/git-workflow-master.md`
   - New HARD RULE: complete commit message must be 72 bytes or fewer.
   - Added the byte-count command (`printf '%s' "<message>" | wc -c`) and a
     note that the gitmoji itself consumes 3 bytes.
   - Report-driven and fallback modes now shorten subjects to fit.
   - Pre-commit VALIDATE now checks format and length and stops on failure.
2. `.githooks/pre-push`
   - Upgraded format and length checks from warnings to hard blocks that mirror
     `docs-commit.yml` exactly.
   - Fixed a `grep -P` locale bug: the emoji pattern only matches under a UTF-8
     locale, so the hook now runs `LC_ALL=C.UTF-8 grep -qP`.

## D. Fact vs. Conclusion

Facts:

- Hook syntax passes (`sh -n`).
- End-to-end hook test in a scratch repo:
  - `📝 docs(tenant): phase 2 read migration` (41 bytes) → accepted
  - 88-byte subject → blocked with error
  - `Create pdf-custom.md` (no gitmoji) → blocked with error
- Push of `99645477` (`✨ feat(tenant): phase 2 settings and clients reads`,
  52 bytes) → GitHub `validate` check: **success**.

Conclusion: future commits pushed through the agent/hook pass the check and
show a green tick.

## E. Risks & Limitations

- Past commits with red X marks remain red. History is not rewritten (no
  force-push, per workflow rules).
- The pre-push hook now blocks non-compliant messages locally. This is
  intentional and mirrors the GitHub check.

## F. Verification

- `bun run typecheck`: PASS
- `bun run audit:load`: PASS
- GitHub check on `99645477`: `validate` = success
- `bun run build`: NOT run (prohibited)

## G. Deferred Work

- None.
