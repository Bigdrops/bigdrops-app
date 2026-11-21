# BOUXRE — Release Changelog Content Pipeline Audit and Correction Report

**Date:** 2026-11-20  
**Repository:** `bigdrops-app` · **Branch:** `main` · **HEAD:** `8a828de020178347fd91086c47016176556951c4`  
**Task Classification:** Investigation + Narrowly Scoped Implementation  
**Status:** Completed & Verified  

---

## 1. Executive Summary

This investigation and implementation task addresses two distinct issues observed in the Android update dialog and Web release notes:

1. **Problem 1 (Content Quality & Provenance):** Customer-facing Android update dialogs and Web What's New notes displayed internal engineering stage names and task titles (e.g. `"stage 3d lifecycle, attachments and intelligence"`, `"Android update experience prototype"`, `"stage 3c pdf presentation and signatory controls"`).
2. **Problem 2 (Entry-Detail Interaction):** Tapping or selecting individual release entries in the Android update dialog does not open additional details.

### Key Investigation Discoveries:
- **Exact Provenance of the 10 Problematic Entries:** The entries were not authored by an automated agent in real time or pulled from report summaries. They originated as git commit subjects (`feat(assistant): stage 3d...`, `feat(update): Android update experience prototype...`) authored across commits `e099eab2` to `4a231424`. In commit `b8d70edd` ("📝 docs(changelog): approve release-notes PRD, backfill Unreleased"), these stripped commit subjects were backfilled verbatim into [CHANGELOG.md](file:///c:/Users/DELL/Desktop/bigdrops-app/CHANGELOG.md) under `## Unreleased` with minted IDs (`rel_03837681`, `rel_156a17ef`, etc.).
- **How They Reached the Device:** In GitHub Actions Run 31 (`test-release-run31`, build 1031, published 2026-11-20T06:13:27Z), `releaseGate.mjs build-notes` loaded `CHANGELOG.md` at SHA `8a828de`. Because the consumed-ID ledger was bootstrapped empty for the transition, all 10 unreleased entries were packaged into the GitHub Release body and synced via PostgREST to `public.app_release_policy.release_notes` (`id = 1`). Android's `UpdateDialogCard` fetches this row and renders it directly.
- **Why Tapping Does Not Open Details:**
  1. *Data Model:* The database table `app_release_policy` has only a single flat text column: `release_notes text`. There is no structured JSON, relational detail table, or external article URL.
  2. *Parser:* `parseReleaseNotes()` in [src/domain/appUpdate/changelog.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/appUpdate/changelog.ts) only splits a bullet into `title` and `detail` when a separator (`—`, ` - `, or `:`) is present. For single-phrase bullets, `detail` is `null`.
  3. *UI Component:* [src/components/app/update/ChangelogTimeline.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/app/update/ChangelogTimeline.tsx) renders entries as static HTML `<li>` elements containing `<h3>` and optional `<p>`. There are no click handlers, disclosure `<details>`, accordion components, or navigation routes. Tapping has no effect by design, and for these entries, no underlying detail text exists.

### Safeguards Implemented:
- Implemented `evaluateChangelogEntryQuality(text)` in [scripts/release/changelog.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/changelog.mjs) to evaluate user-facing quality and reject internal stage markers, conventional commit syntax, commit SHAs, code file names, engineering jargon (`prototype`, `remediation`, `blueprint`, `wip`), and uninformative brevity.
- Integrated quality validation into `curateProposals()` and `appendEntries()` in [scripts/release/changelog.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/changelog.mjs) so non-compliant proposals are refused with explicit reasons.
- Hardened [scripts/release/reportProposals.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/reportProposals.mjs) to ignore markdown headings of any level and filter proposals through `evaluateChangelogEntryQuality`.
- Enforced quality checks in `validateReleaseNotes()` in [scripts/release/releaseGate.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/releaseGate.mjs) so the release gate fails closed if any entry in release notes fails quality evaluation.
- Added comprehensive unit and regression tests in [src/tests/critical/changelogFoundation.test.js](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/changelogFoundation.test.js), [src/tests/critical/releaseGate.test.js](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/releaseGate.test.js), and [src/tests/critical/changelogWorkerIntegration.test.js](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/changelogWorkerIntegration.test.js).
- Verified full test suite (88/88 tests pass), `node scripts/release/changelog.mjs verify`, `bun run audit:load`, and `bun run typecheck`.

---

## 2. Working Tree & Boundary Compliance

- **Initial Git Status:** 7 modified files from concurrent work were preserved without modification:
  - `.github/workflows/build-android-debug.yml`
  - `api/bolu-provider-config.ts`
  - `src/lib/ai-assistant/bolu-transport.ts`
  - `src/lib/ai-assistant/hooks/useBoluThread.ts`
  - `src/pages/settings/bolu-provider/AiUsagePanel.tsx`
  - `src/pages/settings/bolu-provider/api.ts`
  - `src/tests/ai-assistant/server.test.ts`
- **Execution Rules Followed:**
  - Zero executions of `bun run build` or `bun run lint` (strictly respecting the 4 GB RAM host constraint).
  - No git staging, committing, pushing, resetting, or stashing performed.
  - No mutation of live Supabase tables or GitHub release records without explicit user authorization.
  - All edits strictly confined to release scripts (`scripts/release/`) and critical tests (`src/tests/critical/`).

---

## 3. Problem 1: Root Cause & Exact Provenance of Displayed Entries

### 3.1 Trace of the 10 Displayed Entries
In the captured Android update screenshot, the dialog displays:
1. `stage 3d lifecycle, attachments and intelligence`
2. `stage 3c pdf presentation and signatory controls`
3. `Android production update dialog and download speed`
4. `stage 3b custom fields, groups and item images`
5. `Android update experience prototype`
6. `editorial redesign and release discovery`
7. `stage 3a2 modify remediation`
8. `stage 3a2 existing-doc field and charges`
9. `stage 3a1 core contract, stage 3 blueprint`
10. `conversational advance invoice + warnings`

### 3.2 Git History Audit
- **Originating Commits:**
  - `e099eab2` ("✨ feat(assistant): stage 3d lifecycle, attachments and intelligence")
  - `6f9c9330` ("✨ feat(documents): stage 3c pdf presentation and signatory controls")
  - `14e7aeb9` ("✨ feat(update): Android production update dialog and download speed")
  - `198c6978` ("✨ feat(invoice): stage 3b custom fields, groups and item images")
  - `b1bb3fa5` ("✨ feat(update): Android update experience prototype")
  - `f19f2a4b` ("✨ feat(changelog): editorial redesign and release discovery")
  - `dbd4e565` ("✨ feat(modify): stage 3a2 modify remediation")
  - `d360ad47` ("✨ feat(modify): stage 3a2 existing-doc field and charges")
  - `8ff3dbfa` ("✨ feat(modify): stage 3a1 core contract, stage 3 blueprint")
  - `4a231424` ("✨ feat(invoice): conversational advance invoice + warnings")
- **Commit `4cbf3dd4`:** Introduced a script that stripped conventional commit prefixes (`feat(...): `) directly from `git log` without validating whether the remaining subject text was user-facing.
- **Commit `b8d70edd`:** In "📝 docs(changelog): approve release-notes PRD, backfill Unreleased", the stripped subjects were manually backfilled into `CHANGELOG.md` under `## Unreleased` and committed to `main`.
- **Run 31 Execution:** During workflow run 31 on GitHub Actions:
  - `releaseGate.mjs build-notes` loaded `CHANGELOG.md` at BUILD_SHA.
  - Because all 10 entries were in `## Unreleased` and not in `consumed-ids.json`, they were compiled into the release notes.
  - The previous release gate only verified `!isLegacyPlaceholder(notes)` (checking for the single sentence "maintenance and performance update"). Because the 10 bullets were not that exact placeholder, `validateReleaseNotes` returned `{ ok: true }`.
  - The workflow published the notes to GitHub Release `test-release-run31` and synced them to PostgREST `app_release_policy.release_notes`.
  - The Android client on launch queried `app_release_policy`, parsed the 10 bullets, and rendered them in `ChangelogTimeline`.

---

## 4. Problem 2: Entry-Detail Interaction & Data Model Audit

### 4.1 Supabase Schema
The database table `app_release_policy` is defined with the following schema:
- `id`: integer (primary key, row 1)
- `min_version_code`: integer
- `min_version_name`: text
- `latest_version_code`: integer
- `latest_version_name`: text
- `is_mandatory`: boolean
- `release_notes`: text (single plain-text column)
- `enforcement_deadline`: timestamp with time zone
- `apk_asset_prefix`: text
- `created_at` / `updated_at`: timestamp with time zone

There are no subsidiary tables (`release_note_details`, `changelog_items`), no JSONB payload columns, and no link to external changelog documents.

### 4.2 Frontend Parsing: `parseReleaseNotes`
In [src/domain/appUpdate/changelog.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/appUpdate/changelog.ts):
```typescript
export interface ChangelogEntry {
  title: string
  detail: string | null
}
```
`splitEntry(line)` checks for separators:
- `DETAIL_SEPARATORS`: `['—', ' - ']`
- Or a `:` within the first 60 characters.

When a bullet line has a separator (e.g. `- New Export — Export your invoices to landscape PDF`), `title` is `"New Export"` and `detail` is `"Export your invoices to landscape PDF"`.
When a bullet line has no separator (e.g. `- stage 3d lifecycle, attachments and intelligence`), `title` receives the full text and `detail` is `null`.

### 4.3 UI Presentation: `ChangelogTimeline`
In [src/components/app/update/ChangelogTimeline.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/app/update/ChangelogTimeline.tsx):
- Lines 69–80 render:
  ```tsx
  <li key={`${entry.title}-${index}`} className="py-4 first:pt-0 last:pb-0 md:py-5">
    <h3 className="text-base font-semibold leading-tight tracking-tight text-bd-overlay-text md:text-lg">
      {entry.title}
    </h3>
    {entry.detail ? (
      <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-bd-overlay-muted">
        {entry.detail}
      </p>
    ) : null}
  </li>
  ```
- The `<li>` is a static HTML list item. It has no `onClick`, no disclosure `<details>`, no modal/sheet route, and no interactive styling (e.g. no hover/active cursor or chevron).
- When a user taps an entry, nothing happens because no interactive handler was ever built.
- Furthermore, because all 10 published entries lacked a delimiter, `detail` was `null` for every item. Even if an expander existed, there was zero additional detail data to reveal.

---

## 5. Safeguards Implemented Across the Release Pipeline

### 5.1 Quality Evaluation Function (`evaluateChangelogEntryQuality`)
Added to [scripts/release/changelog.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/changelog.mjs):
```javascript
export const INTERNAL_STAGE_PATTERN =
  /^(?:stage|phase|sprint|milestone|step)\s+\d+[a-z0-9._-]*\b/i

export const CONVENTIONAL_COMMIT_PREFIX_PATTERN =
  /^(?:(?:feat|fix|perf|revert)\s*\([^)]+\)\s*!?\s*:|feat\s*!?\s*:|(?:chore|docs|refactor|ci|test|build|style|deps|wip)(?:\([^)]*\))?\s*!?\s*:)/i

export const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}\b/i

export const CODE_OR_FILE_PATTERN =
  /\b[a-zA-Z0-9_\-\/]+\.(?:tsx?|jsx?|mjs|cjs|java|kt|py|sql|gradle|ya?ml|json|css|scss|md)\b/i

export const INTERNAL_JARGON_PATTERN =
  /\b(wip|prototype|remediation|blueprint|backfill|scaffolding|mockup|hotfix|stub)\b/i

export function evaluateChangelogEntryQuality(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'entry text must be a string' }
  const clean = text.replace(/^\s*[-*•]\s+/, '').trim()
  if (!clean) return { ok: false, reason: 'entry text is empty' }
  if (isLegacyPlaceholder(clean)) return { ok: false, reason: 'entry contains generic legacy placeholder' }
  if (/^#+\s+/.test(clean)) return { ok: false, reason: 'entry contains markdown heading syntax' }
  if (INTERNAL_STAGE_PATTERN.test(clean)) return { ok: false, reason: 'entry contains internal stage or phase marker' }
  if (CONVENTIONAL_COMMIT_PREFIX_PATTERN.test(clean)) return { ok: false, reason: 'entry contains raw commit prefix' }
  if (COMMIT_SHA_PATTERN.test(clean)) return { ok: false, reason: 'entry contains commit SHA' }
  if (CODE_OR_FILE_PATTERN.test(clean)) return { ok: false, reason: 'entry contains source code file name or path' }
  const jargonMatch = clean.match(INTERNAL_JARGON_PATTERN)
  if (jargonMatch) return { ok: false, reason: `entry contains internal engineering jargon (${jargonMatch[1].toLowerCase()})` }
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length < 2 || clean.length < 5) return { ok: false, reason: 'entry is too short or lacks sufficient detail' }
  return { ok: true, reason: null }
}
```

### 5.2 Curation & Append Gating
- `curateProposals(proposals)` filters proposals to require `evaluateChangelogEntryQuality(p.text).ok`.
- `appendEntries(text, proposals, tombstonesText)` checks each proposal and adds failing proposals to `refused` with their specific rejection reason.

### 5.3 Report Proposal Parsing
- Updated [scripts/release/reportProposals.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/reportProposals.mjs):
  - Ignores markdown headings (`/^#+\s+/`) so section headers in reports are never parsed as entries.
  - Filters all extracted bullets through `evaluateChangelogEntryQuality(text).ok`.

### 5.4 Release Gate Fail-Closed Validation
- Updated `validateReleaseNotes(notes, { ids })` in [scripts/release/releaseGate.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/releaseGate.mjs):
  - In addition to checking legacy placeholders and ID counts, extracts all candidate lines and evaluates each with `evaluateChangelogEntryQuality(cleanLine)`.
  - If any line fails, `validateReleaseNotes` returns `{ ok: false, reason: 'release notes entry rejected: "<line>" (<reason>)' }`.
  - The CLI `validate-notes` exits with code 1, which immediately halts GitHub Actions workflow step 3d before APK build/release.

---

## 6. Verification Results

### 6.1 Unit & Regression Test Suite
Executed:
```bash
node --experimental-loader ./src/tests/resolve-alias.js --test \
  src/tests/critical/releaseGate.test.js \
  src/tests/critical/changelogFoundation.test.js \
  src/tests/critical/changelogWorkerIntegration.test.js \
  src/tests/critical/releaseNotificationStorage.test.js
```
**Outcome:**
- `releaseGate.test.js`: 44 tests passed (including new tests rejecting stage markers, jargon, commit syntax, and file names).
- `changelogFoundation.test.js`: 23 tests passed (including new tests for `evaluateChangelogEntryQuality`, `curateProposals`, and `appendEntries` refusal).
- `changelogWorkerIntegration.test.js`: 14 tests passed (including new tests for heading suppression and jargon rejection).
- `releaseNotificationStorage.test.js`: 7 tests passed.
- **Total: 88 passing tests, 0 failures, 0 skipped.**

### 6.2 Changelog Integrity
Executed:
```bash
node scripts/release/changelog.mjs verify
```
**Outcome:** Exited 0 with `changelog OK`.

### 6.3 Performance Audit & Typecheck
- `bun run audit:load`: Exited 0.
- `bun run typecheck` (`tsc --noEmit`): Exited 0 with zero type errors.

---

## 7. Status of Published Content & Remediation Options

### 7.1 Current Live State
- **GitHub Release:** `test-release-run31` (versionCode 1031) on GitHub holds the 10 entries in its release notes.
- **Supabase Policy:** `public.app_release_policy` row `id = 1` holds the 10 entries in `release_notes`.
- **Local Repository:** [CHANGELOG.md](file:///c:/Users/DELL/Desktop/bigdrops-app/CHANGELOG.md) still lists the 10 entries under `## Unreleased` because GitHub Actions runner builds do not push to `origin/main`.

### 7.2 Safe Remediation Path for Future Releases
Per project guardrails, historical release records and live database rows are not mutated without explicit user authorization. For the upcoming release (Run 32 or next):
1. **Clean [CHANGELOG.md](file:///c:/Users/DELL/Desktop/bigdrops-app/CHANGELOG.md):** The 10 internal entries in `## Unreleased` can be removed or replaced with customer-facing release highlights (e.g. `- Document Signatures — Signatory controls and PDF presentation enhancements`, `- Update Experience — In-app download speed tracking and seamless installation dialog`).
2. **Sync Tombstones:** Running `node scripts/release/changelog.mjs sync` will tombstone any removed IDs so they can never be re-introduced.
3. **Pipeline Protection:** With the new safeguards in place, any attempt to publish entries containing `stage 3d`, `prototype`, `remediation`, or raw commit syntax will be blocked automatically at Step 3d before publication.
4. **Detail View Consideration (Problem 2):** If collapsible or expandable release note details are desired for future mobile releases, a two-tier bullet format (`- Feature Title — Feature Description`) is already supported by `parseReleaseNotes()`. An interactive disclosure component (`<details>` or Radix Collapsible) could be added to `ChangelogTimeline.tsx` in a future authorized UI task.
