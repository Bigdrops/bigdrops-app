# pdfcn Registry Resolution Verification Report

This report was written by Muse Spark on 2026-09-07 via Opencode.

## Objective

Register the `@pdfcn` namespace in `components.json`. Prove the shadcn CLI resolves `@pdfcn/takumi/text` without installing anything.

## Scope

Config-only change plus read-only resolution check. No component install. No dependency install. No React-PDF change. No proof-of-concept.

## Files Changed

See section 7.

## Skills Used

Skills used: shadcn
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Before State

Existing `components.json` registry configuration:

```json
"registries": {
  "@componentry": "https://componentry.fun/r/{name}.json",
  "@unlumen-ui": "https://ui.unlumen.com/r/{name}.json"
}
```

No `@pdfcn` entry was present. All other keys (style, aliases, tailwind, iconLibrary) were intact.

Relevant pre-existing git changes (belong to concurrent agents, left untouched):

- Staged new file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/settings-redesign-candidate-v4-android.html`
- Staged new file: `src/tests/critical/record-capture.test.js`
- Unstaged modification to the same HTML file.
- Untracked: `docs/reports/pdf/pdfcn-installation-integration-discovery.md` (prior discovery report).
- Untracked: `docs/reports/settings/settings-v4-candidate-correction-report.md` (another agent).

## 2. Configuration Change

Exact mapping added to `components.json` under `registries`:

```json
"@pdfcn": "https://pdfcn.dev/r/{name}.json"
```

Resulting block:

```json
"registries": {
  "@componentry": "https://componentry.fun/r/{name}.json",
  "@unlumen-ui": "https://ui.unlumen.com/r/{name}.json",
  "@pdfcn": "https://pdfcn.dev/r/{name}.json"
}
```

Confirmation of preservation:

- `@componentry` entry is byte-identical.
- `@unlumen-ui` entry is byte-identical.
- All aliases, paths, and unrelated keys are unchanged.
- `git diff -- components.json` shows one added line only.

## 3. Resolution Test

Exact command used (read-only, Bun-compatible, no `add`):

```bash
bunx --bun shadcn@latest view @pdfcn/takumi/text
```

Result: success. The CLI resolved the item and printed the full registry payload:

- `name`: `takumi/text`, `title`: `Text`, `type`: `registry:ui`.
- `dependencies`: `takumi-pdf`, `@takumi-rs/helpers`.
- `registryDependencies`: `@pdfcn/takumi/utils`.
- `files`: one component targeting `components/pdf/text/text.tsx`, with full source content.
- No project files were written by the command. No component source was copied. No dependency was installed.

This confirms: the registry URL resolves; the item is recognized; the item identifies its Takumi dependencies.

## 4. Filesystem / Dependency Check

| Area | Changed |
|---|---|
| `package.json` | No. `git diff` shows no entry. |
| Lockfile (`bun.lock` / equivalents) | No. No lockfile diff exists. The `bunx` "Saved lockfile" message refers to its own transient resolution cache, not the repo. |
| Source files (`src/`, `components/`) | No. No `components/pdf` directory was created. |
| Generated pdfcn files | None. `view` copies nothing. |
| Unrelated files | None touched. Pre-existing concurrent-agent changes remain exactly as found. |

## 5. Verdict

REGISTRY RESOLUTION VERIFIED

## 6. Next Step

The next step is an isolated Takumi proof-of-concept. No production migration is authorized by this task.

## Verification

- `git status` before: pre-existing staged/unstaged/untracked entries only; `components.json` clean.
- `git diff -- components.json` after: one added line (`@pdfcn` mapping).
- `git status` after: `M components.json` plus this new report; all other entries unchanged from baseline.
- Excluded commands were not run: no build, no typecheck, no lint, no tests, no audit:load, no `add`, no `bun add`.

## Risks and Limitations

- Verification covers namespace resolution only. It proves nothing about render quality, font parity, waybill compliance, or device performance.
- The upstream registry can change item contents at any time. Pin and re-verify before any proof-of-concept.

## Deferred Work

- Isolated Takumi proof-of-concept (needs separate approval).
- Takumi versus Forme base decision.
- Font, layout, and performance evaluation.

## 7. Files Changed

- Files created: `docs/reports/pdfcn-registry-resolution-verification.md` (this report).
- Files modified: `components.json` (one registry line added).
- Files deleted: none.
