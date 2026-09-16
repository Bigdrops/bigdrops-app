# Test-Release Workflow VITE_GIT_REPO Report

This report was written by Muse Spark on 2026-09-16 via OpenCode.

## Objective

Supply `VITE_GIT_REPO` to the Vite production build in the
Build Android Test-Release APK workflow. Every APK from this
workflow must contain the repository identity for Android
update discovery.

## Scope

- Add `VITE_GIT_REPO` to the `Build production web assets`
  step only.
- Preserve all release semantics: tag trigger, release guard,
  signing, versioning, artifact upload, release creation.
- No code, schema, policy, or secret changes.

## Files changed

- `.github/workflows/build-android-test-release.yml`
  (one `env` entry plus comment, step 10 only)

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added this line to the build-step environment:
  `VITE_GIT_REPO: https://github.com/${{ github.repository }}.git`
- Source is authoritative GitHub Actions context.
  No new secret was added.
- Format finding: `resolveGithubRepo()` in
  `src/lib/appUpdate/releaseDiscovery.ts` requires a
  `github.com/` or `github.com:` prefix. Bare
  `${{ github.repository }}` (`owner/repo`) does not match
  and returns null. The full-URL form matches the regex and
  matches `.env.example`. The patch therefore composes the
  documented URL form from the authoritative context.

## Verification result

Verification:
- bun run audit:load: not applicable (no schema, query, or data-layer change)
- bun run typecheck: passed
- git diff --check: passed (clean)
- git status: one modified file only (the target workflow)
- supabase db push: not applicable
- bun run build: skipped due to hardware policy

Static checks:
- Expected format confirmed in `releaseDiscovery.ts`,
  `.env.example`, and `vite-env.d.ts`.
- `workflow_dispatch` path unchanged; release step still
  guarded by `startsWith(github.ref, 'refs/tags/test-release-')`.
- Tag trigger `test-release-*` unchanged.
- Signing, keystore handling, versioning, APK naming,
  artifact upload, and release creation unchanged.
- No runtime or GitHub Actions execution validation claimed.

## Supabase push status

Not applicable. No database change was made.

## Risks or limitations

- The value is embedded at build time. A repository rename
  or transfer requires a rebuild to update discovery.
- Workflow was not executed. GitHub-side behavior is
  verified by review only.

## Deferred work

- None. The deferred CI item in
  `android-mandatory-update-system.md` (add `VITE_GIT_REPO`
  to the workflow build env) is now done.
- Human still performs: commit review, `test-release-*`
  tag creation, tag push, device testing.
