# Files.tax Manus Onboarding Candidate Evaluation Report

This report was written by Buffy on 2026-09-10 via Freebuff.

## Objective

Extract the design system of `files-tax-onboarding-manus.html` into `design.md` and evaluate that template as an onboarding candidate against the multi-tenancy PRD and the Taxation Made Easy PRD.

## Scope

Design-direction documents only. No source files changed. No prototype files changed.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/design.md` — new extraction
- `docs/reports/ui-ux/files-tax-manus-candidate-evaluation-report.md` — this report

Skills used: design-system-starter
Documentation standard: ASD-STE100 Simplified Technical English

---

## Part A — What the template is

`files-tax-onboarding-manus.html` is a 3-slide Files.tax-branded onboarding carousel with an auth overlay:

1. **Tax filing made easy** — rotated filing checklist card, "72% ready" note
2. **Know what is ready before you file** — review snapshot card, bar chart, "READY TO FILE" stamp
3. **One workspace. Every entity in its lane.** — dark tenant board with two workspace cards, Books/VAT/WHT chips, "Foolproof isolation" badge
4. **Auth overlay** — "Create a workspace" / "Sign in" choice cards

Companion extraction: `design.md` in the same folder records the full token inventory.

---

## Part B — PRD catch check

### B1. Does it catch the Taxation Made Easy PRD?

Reference guardrails: compliance is a side effect of recording activity; no invented statutory values (no rates, no deadline dates); Files.tax monthly position document (VAT position, WHT position, attention items); plain language, no tax jargon; "make tax easy for an ordinary Nigerian business".

| Guardrail | Template evidence | Verdict |
|---|---|---|
| Compliance as side effect of recording | Filing checklist: "Income and expenses — Done", "Tax details — Done", "Final review — Next". Progress bar at 72%. Recording is implied as the source of readiness | ⚠️ Partial |
| No invented statutory values | "2025 filing", "6 months reviewed", "72% ready" are demo facts, not statutory claims. No rates, no deadline dates anywhere | ✅ Pass |
| Files.tax monthly position document shape | Review card = "Filing snapshot" with amount and readiness stamp. Closest analog: VAT/WHT position rows exist on no slide. The "deducted by you" WHT field is absent. Attention items are absent | ⚠️ Partial |
| Plain language, no jargon | "Collect what matters, spot what is missing, file with a clear view". Terms used: VAT chip, WHT chip on the tenant board. No rate talk, no form-number talk | ✅ Pass |
| "Tax easy for ordinary Nigerian business" | Entire narrative arc is "calm review → ready → file" | ✅ Pass |
| Records drive compliance (Record → Reconcile → Explain → Optimise → Comply → Transmit) | Not represented. No record-payment flow, no explain layer, no transmit step | ⚠️ Gap |

**Tax verdict: catches the philosophy and the tone. Misses two signature surfaces: the monthly position document (VAT/WHT/attention rows) and the record-to-comply flow.** The tenant board's VAT/WHT chips gesture at it but are static labels.

### B2. Does it catch the Multi-Tenancy PRD?

Reference criteria from v2.1: workspace is approved before it is usable (§9.4 pending_approval, no success claim precedes approval); zero-entity users route into create-first-company (§9); provisioning is observable status, never fake progress (§9.1); entity isolation is the security story (§8A, RLS); Create/Join choice exists in the frontend PRD (§12.4).

| Criterion | Template evidence | Verdict |
|---|---|---|
| Workspace approval gate | Absent. "Create your workspace" implies immediate use. No pending-approval state, no waiting surface, no approval notification | ❌ Miss |
| Zero-entity → create first company | Auth says "Set up your first entity" — the routing intent exists in one line | ⚠️ Partial (one line) |
| Provisioning status honesty | Not represented. The 72% progress bar is a filing-progress metaphor, not provisioning. It would need care to not read as fake progress, which §9.4.3 forbids for provisioning | ⚠️ Not represented (risk noted) |
| Entity isolation story | Strong. Dedicated slide 3: dark board, two workspaces, entity rows, "Foolproof isolation" badge, "Every entity in its lane" headline | ✅ Strong pass |
| Create/Join choice | "Create a workspace" and "Sign in" only. No "Join an existing workspace" path | ⚠️ Partial (Join missing) |
| Workspace switcher / multi-workspace | Not represented | ⚠️ Gap |
| Level model compliance (no fake %, no tips below L4) | 72% bar is a filing metaphor on a marketing slide, not a loading claim. Acceptable as marketing, but a reviewer could misread it | ⚠️ Borderline |
| A11y per §9.4.4 (role=alert/status, no raw errors) | No live region for slide changes; step label not announced; auth focus handling is present | ⚠️ Partial |

**Multi-tenancy verdict: catches the isolation story strongly, misses the approval gate entirely, and only gestures at create-first-entity and Join.** Slide 3 is the template's best PRD catch. The auth flow is where it falls short of v2.1.

### B3. Does it catch the Facelift Design.md contract?

| Contract rule | Template | Verdict |
|---|---|---|
| Slate-navy palette | Warm cream/coral/sage | ❌ |
| Manrope + DM Mono | Space Grotesk + DM Sans | ❌ |
| 18px card radius | 24px | ⚠️ |
| Primary-tinted shadows | Neutral warm shadows | ⚠️ |
| 135° gradient identity | None | ❌ |
| Bottom-sheet overlays | Full-screen overlay | ⚠️ |
| Grain texture | None | ❌ |
| Compact density | Editorial scale | ⚠️ |

**Contract verdict: fails the visual contract.** Same semantic-token architecture, wrong values. It is a Files.tax skin, not a BIGDROPS skin.

---

## Part C — Scorecard

| Dimension | Score | Note |
|---|---|---|
| Tax PRD philosophy catch | 7/10 | Right story, missing position-document and record flow |
| Multi-tenancy catch | 5/10 | Isolation slide strong; approval gate absent |
| Design.md contract | 3/10 | Wrong palette, type, gradient, grain |
| Accessibility | 6/10 | Good bones; rail targets 28px, no live region |
| Motion quality | 4/10 | Near-static slides; only auth animates |
| Prototype honesty | 9/10 | No fabricated statutory values |
| Distinctiveness | 9/10 | Rotation/stamp motif is memorable |

**Overall: 6.1/10 as a candidate. Adopt structure, reject skin.**

---

## Part D — Recommendation

**Do not adopt as-is. Port the structure.**

1. **Keep**: slide 3 (tenant board) — re-skin to slate-navy; art-card composition method; tappable progress rail; auth choice-cards; status pill vocabulary; "no invented values" discipline
2. **Fix before adoption**: add pending-approval surface per §9.4; add Join-workspace path; replace dollar amounts with ₦ or no amounts; re-skin all tokens to Design.md; raise rail targets to 44px; add live region
3. **Add to fully catch the PRDs**: a Files.tax position card slide (VAT position / WHT position / Attention items — states only, no values); a record-payment mention ("every payment you record keeps taxes on track") to represent the side-effect philosophy

## Verification

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: two new files; gemini-onboard.html remains modified from the previous task (untouched here)

## Risks or limitations

- The evaluation reads the template as a design artifact. It was not rendered in a browser during this task.
- Contrast figures are computed from hex values, not measured on-screen.

## Deferred work

- None for this task. Re-skinning the template into a BIGDROPS-compliant candidate is a separate decision.
