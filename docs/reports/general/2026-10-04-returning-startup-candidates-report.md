# Returning-User Startup Candidates Report

This report was written by Muse Spark on 2026-10-04 via OpenCode.

## Objective

- Create three standalone HTML candidates for the BIGDROPS returning-user startup experience.
- Make loading feel alive. Show BIGDROPS doing business while BIGDROPS loads.
- Use looping motion only. Show no fake progress and no completion state.

## Scope

- Create three files under `docs/templates/html-temps/onboarding-candidates/`.
- Change no production application source code.
- Change no existing reference design.
- Run no build, no typecheck, no lint. This task assigns no build duties.

## Files changed

- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-document-workflow.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-operations-waybill.html` (new)
- `docs/templates/html-temps/onboarding-candidates/bigdrops-returning-tax-desk.html` (new)
- This report (new)

## Skills used

Skills used: animate, design-artifact, html-prototype, mobile-app-ui-design
Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

- ASD-STE100 Simplified Technical English.

## Changes made

- Studied the Amber/Terracotta reference for visual DNA only. Reused Manrope/DM Mono type, HSL theme tokens, restrained shadows, and `html[data-theme]` light/dark contract. Copied no layout.
- Candidate 1 (document workflow) uses vertical depth choreography. Quotation lands, approval stamp drops, invoice crossfades in, payment chip attaches, receipt sinks into the records tray. Loop period is 14 seconds.
- Candidate 2 (operations waybill) uses a horizontal route composition. Parcels pop in with stagger, the van travels a dashed depot-to-customer track, the waybill tag rides with it, the delivery badge pops, and the signed proof files itself. Loop period is 15 seconds.
- Candidate 3 (tax desk) uses a convergent top-down desk tableau. Invoices fall from the left chute, expenses from the right chute, ledger rows assemble in the center, a hinged clerk arm reviews, a seal lands, and pages file into the archive. Loop period is 16 seconds. This candidate takes the greatest creative risk.
- Each candidate shows one stable contextual tip. Each tip is integrated into the scene (attached caption, dispatch note bar, margin annotation). A discreet demo `<select>` previews alternate tips. Default launch behavior shows one fixed tip. No tip rotates.
- Each candidate shows only the understated status line "Opening your workspace…" with a small breathing dot. The dot signals liveness. It is not a spinner.
- Each file is self-contained. Each file needs no build step and no external service. Each file opens directly in a browser.
- Mobile is the primary target. Each stage is the hero on narrow screens.
- Tablet and desktop use bounded two-column recompositions (max-width 1020px). Stages keep capped sizes. No enlarged mobile canvas.
- All motion uses `transform` and `opacity` only. No blurred surfaces. No particle systems.
- All files support `prefers-reduced-motion`. Motion collapses to a legible static state.
- All files support light and dark themes. A toggle persists the choice to `localStorage`.

## Verification result

- `git status` before changes: recorded. Pre-existing CPS modifications and untracked CPS reports/tests were present. They belong to another workstream. They were not touched.
- `git status` after changes: confirms only three new candidate files plus this report. No production source file changed. No reference design changed.
- Banned-pattern search: passed. No spinner, no progress element, no progress bar, no fake percent, no "Setting Up Your Company", no "Workspace initialization".
- Percent-sign audit: passed. All `%` matches are CSS keyframe stops, HSL tokens, or layout values. "VAT 7.5%" and "WHT 5%" are business data, not loading progress.
- DOM reference check: passed. `themeBtn`, `tipSelect`, and `tipText` exist in all three files. All `getElementById` targets resolve.
- Responsive check: passed. All three files contain the 900px recomposition breakpoint.
- Reduced-motion check: passed. All three files contain a `prefers-reduced-motion` block.
- `bun run audit:load`: not applicable (design HTML only, no app code path).
- `bun run typecheck`: skipped per task instruction (no build duties assigned).
- `git status`: passed, scope confirmed.
- `supabase db push`: not applicable.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

- Not applicable. No schema change. No SQL change.

## Risks or limitations

- Browser rendering was not executed in this session. Visual timing was reviewed by source inspection only. Open each file in a browser at 390px and 1280px widths before user testing.
- Emoji glyphs (van, parcel, pin) render per platform. They are semantic scene props, not loading indicators. Replace with inline SVG if platform variance is unacceptable.
- The van travel distance uses a CSS variable capped by viewport. Very wide stages keep the run bounded. Confirm the run length on tablet widths.
- Theme preference shares one `localStorage` key across the three files. This is intentional for preview consistency.

## Deferred work

- Motion tuning after real-device review (durations, stamp impact, seal timing).
- Inline SVG replacement for emoji scene props, if required.
- Production transition design (fade or morph from loader into the ready application).
- Selection of one winning candidate after stakeholder review.
