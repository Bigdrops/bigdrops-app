# Forme Image-Href and Footer Keep Proof Report

This report was written by Muse Spark on 2026-10-05 via Opencode.

## Objective

- Prove or disprove two claims from the CPS PDF v1 review: clickable item thumbnails and footer keep-together.
- Render minimal Forme PDFs, inspect output bytes, record verdicts.

## Scope

- Scratch proof only. No production code touched. No CPS code imported.
- Scratch script created, run, then deleted. Proof PDFs live outside the repo in the pre-approved temp dir.

## Files Changed

- NONE in the repository. This report is the only file created.
- Note: four CPS PRD files now show as modified in worktree status. Another agent changed them during this task. They were read only, never written.

## Skills Used

Skills used: pdf-rendering-correctness, karpathy, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- No application changes. Method: `bun` script using `@formepdf/core` `renderDocument` (same entry as the repo POC runner), `pdf-lib` annotation inspection, `pdf-parse` text extraction.

## Proof 1: Clickable Image — CONFIRMED

- Document: one text line plus one 40x40 data-URI PNG with `href="https://example.com/original-image.png"`.
- Output: exactly one `/Link` annotation on page 1. URI decodes exactly. Raw bytes contain the URI.
- Annotation Rect is `[54, 731.09, 94, 771.09]`: a 40x40 pt box at the left content edge. That is the image geometry, not the text line. The image itself is the tap target.
- No network occurred. `src` stayed a data URI; `href` is annotation-only, never fetched.
- Tapping opens the URL in any compliant viewer (standard URI action; some viewers confirm first).

## Proof 2: Footer Keep-Together — NO ATTACH MECHANISM

- Swept filler counts 30-90 to find a baseline orphan. At 50 fillers, the last item lands on page 1 with the footer alone on page 2.
- `wrap: false` on the footer alone: orphan persists. No change.
- `wrap: false` on footer plus last row: orphan persists. No change.
- Pagination stayed normal in all variants: exact row counts, same page counts, no errors, no lost content.
- Verdict: `wrap: false` stops a node splitting internally. It does not attach a row to its preceding sibling. No keep-with-previous exists through row style.

## Verification

Verification:

- Proof PDFs generated and byte-inspected: passed (link present, rect exact, URI exact)
- Orphan reproduced at baseline then retested with flags: passed (flags change nothing)
- Production code modified: none (zero)
- HTML reference modified: none (zero)
- bun run audit:load: not run per task scope
- bun run typecheck: not run per task scope
- lint: not run per task scope
- supabase db push: not applicable
- bun run build: not run per task scope

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- Annotation rendering depends on the viewer. Structure is proven; tap behavior per viewer is standard PDF semantics, not tested here.
- Table rows cannot be wrapped in a container View, so group-level keep-together has no structural path either. Segmented wall remains the recommendation.
- Proof artifacts live at `C:/Users/DELL/AppData/Local/Temp/opencode/forme-proof/` (`proof-link.pdf`, `summary.json`). Regenerate by re-running the method above; the scratch script was deleted.

## Deferred Work

- Update the v1 review recommendation: the link proof test now passes. Recommendation C exit criterion is met for thumbnails.
- Group footer rule stays as designed: let the footer flow; do not require attachment.
- Design council may now approve the reference contingent on the remaining minor items (street-address line, currency row, compact relationship).

## RECOMMENDATION

- Thumbnails: approved for implementation via `<Image src={dataUri} href={originalUrl}>` with `https`-only validation.
- Footers: no implementation can force attachment; accept flow in the design.
