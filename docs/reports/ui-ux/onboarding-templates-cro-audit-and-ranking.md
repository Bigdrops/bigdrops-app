# Onboarding Templates CRO Audit and Ranking

This report was written by Buffy on 2026-09-10 via Freebuff.

Skills used: onboarding, signup, cro, humanizer, mobile-app-ui-design, animate, redesign-existing-projects
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Audit every onboarding template in the design-direction onboarding folder. Rank the candidates as conversion assets. Apply the marketing skills installed on 2026-09-10: `onboarding` (activation), `signup` (registration friction), and `cro` (page conversion).

## Scope

13 HTML files in `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/`. No source files changed. This session also fixed two defects that affect the audit result:

1. Removed every em dash and en dash from the six files I authored. Dash counts before: manus-v2 had 13 em and 1 en. v3 had 17 em and 1 en. v4 had 17 em and 1 en. Animated had 7. PhotoHero had 4. Tax-Ease-claude had 9. All six now scan at zero.
2. Rebuilt slide 5 in manus-v2, v3, and v4. The old board showed businesses as rows. The new map shows one login, a hub, dashed links, two isolated silos with team ladders (owner, admins, members), theme swatches per business, and a lock line per silo.

## Method

Each template scored on seven weighted dimensions from the three skills.

| Dimension | Weight | Source skill | What it measures |
| :--- | :--- | :--- | :--- |
| A. Value proposition and story | 20 | cro | 5-second clarity, outcome headlines, message match |
| B. Signup and auth quality | 20 | signup | Field count, password UX, SSO, validation, error handling |
| C. Activation path and gate honesty | 15 | onboarding | Aha path, next-step clarity, approval gate truth |
| D. Interaction and motion | 15 | onboarding + animate | Gesture engine, interrupts, reduced motion |
| E. Mobile readiness | 10 | signup | Safe areas, 44px targets, mobile/fold/desktop |
| F. Accessibility | 10 | cro | Live regions, labels, contrast, focus states |
| G. Brand and PRD compliance | 10 | project PRDs | Slate-navy contract, no invented statutory values, tenancy and tax coverage |

## Scorecard and ranking

| Rank | Template | A | B | C | D | E | F | G | Total |
| :--- | :--- | -- | -- | -- | -- | -- | -- | -- | -- |
| 1 | BIGDROPS_Onboarding-manus-v2.html | 18 | 17 | 14 | 14 | 9 | 9 | 10 | **91** |
| 2 | BIGDROPS_Onboarding-v3-ocean-teal.html | 18 | 17 | 14 | 14 | 9 | 9 | 10 | **91** |
| 3 | BIGDROPS_Onboarding-v4-amber-terracotta.html | 18 | 17 | 14 | 14 | 9 | 9 | 9 | **90** |
| 4 | onboarding-flow.html | 15 | 19 | 15 | 9 | 8 | 9 | 9 | **84** |
| 5 | BIGDROPS_Onboarding-PhotoHero.html | 15 | 16 | 10 | 13 | 8 | 8 | 8 | **78** |
| 6 | BIGDROPS_Onboarding-Ledger.html | 17 | 15 | 11 | 10 | 7 | 8 | 9 | **77** |
| 7 | BIGDROPS_Onboarding-Animated.html | 15 | 12 | 10 | 13 | 9 | 8 | 9 | **76** |
| 8 | BIGDROPS_Onboarding-Tax-Ease-claude.html | 16 | 12 | 11 | 13 | 9 | 8 | 7 | **76** |
| 9 | gemini-onboard.html | 12 | 13 | 9 | 12 | 7 | 8 | 8 | **69** |
| 10 | files-tax-onboarding-manus.html (v1) | 14 | 10 | 10 | 7 | 7 | 6 | 4 | **58** |
| 11 | BIGDROPS_Onboarding-HTML-DesignLanguage.html | 11 | 2 | 6 | 3 | 6 | 5 | 8 | **41** |
| 12 | BIGDROPS_Onboarding-PNG-DesignLanguage.html | 10 | 0 | 5 | 1 | 5 | 4 | 8 | **33** |
| 13 | BIGDROPS_Onboarding-3.html | 10 | 0 | 5 | 2 | 3 | 4 | 7 | **31** |

Notes on the top of the table:

- manus-v2, v3, and v4 share one engine. v3 and v4 add the `data-theme` light/dark layer from the live theme library. v4 loses one point on G because amber drifts further from the slate-navy contract than teal.
- onboarding-flow.html has the deepest auth suite: reset password, check email, choose workspace, request invitation, waiting for approval. It loses on D because it has no swipe gestures. It is a flow reference, not a swipe deck.
- Ledger has the sharpest single headline ("Run compliant") of any candidate. Its gate and motion are mid-table.
- The three static candidates cannot complete a signup. They are storyboards. They rank low as conversion assets but remain useful as art direction references.

## Findings

Format per the onboarding skill: Finding, Impact, Recommendation, Priority.

### F1. No SSO in the three best candidates

- Finding: manus-v2, v3, and v4 offer create, join, and sign in by email only. PhotoHero has Google and Apple buttons. BIGDROPS runs on Supabase Auth, so OAuth exists in the product.
- Impact: The signup skill ranks social auth above email for first-touch conversion. On mobile, typing name, email, and password is the single biggest drop-off step.
- Recommendation: Add a "Continue with Google" block above the email form in the winning candidate. Keep email as the fallback.
- Priority: High.

### F2. Approval gate honesty is inconsistent

- Finding: The manus family and onboarding-flow.html show a truthful waiting-for-approval state with no fake progress. Every other candidate either ends at a sign-up form or implies instant access.
- Impact: PRD multi-tenancy v2.1 section 9.4 forbids implied instant access. A user who signs up and hits a wall loses trust in session one.
- Recommendation: Port the waitPane pattern from manus-v2 into whichever candidate ships.
- Priority: High.

### F3. Password UX is strong where it exists, absent where it does not

- Finding: manus-v2, v3, v4, Animated, PhotoHero, Tax-Ease-claude, and gemini-onboard have strength meters, show-password toggles, and inline validation. manus v1 has no form fields. The three static candidates have no forms.
- Impact: Meters and toggles are proven completion lifters per the signup skill. Missing forms cannot convert at all.
- Recommendation: Treat the manus-family auth block as the canonical signup UI.
- Priority: Medium.

### F4. AI-copy tells existed in shipped copy

- Finding: Em and en dashes appeared in all six authored files, including user-visible headlines. The cause was a broken scan, not intent: two earlier greps reported zero because of shell quoting and locale failures.
- Impact: Dash-stacked copy reads as machine-written. It weakens trust in a premium funnel.
- Recommendation: Done. All six files now scan at zero em and en dashes by byte-level search. Keep the byte-level check in the verification gate for copy changes.
- Priority: Fixed this session.

### F5. Slide 5 told the wrong story

- Finding: The old slide 5 was a two-row business list. The user brief asked for multitenancy and team management. The brief was not met, and the theme swatches had no CSS behind them.
- Impact: The strongest differentiation moment in the pitch (isolation plus per-business theming) read as a generic list.
- Recommendation: Done. The new map shows one login over two silos, a role ladder in each silo, theme swatches, and a "books stay inside" lock line. aria-label describes the same story for screen readers.
- Priority: Fixed this session.

### F6. CTA copy is action-led, not value-led

- Finding: Buttons say "Continue", "Get started", "Create account". The cro skill wants value in the button or beside it.
- Impact: Small completion loss at the exact moment of commitment.
- Recommendation: Test "Create my workspace" against "Create account". Keep the footer trust line ("Built for Nigerian business") next to the primary CTA.
- Priority: Medium.

## Quick wins (same day)

1. Add Google SSO to the manus-family auth pane.
2. Port the waiting-for-approved pane into the winning candidate if not already there.
3. Swap the weakest headline: "See how it works" style labels become outcome labels.

## High-impact changes (week level)

1. Merge the top three engines: manus-v2 story and gate, onboarding-flow auth depth, Ledger headline discipline.
2. Add field-level analytics hooks (focus, blur, error) before build handoff, per the signup measurement plan.

## Test ideas

1. SSO-first versus email-first on the auth pane.
2. Five slides versus six slides: completion and skip rate.
3. Approval-gate copy: neutral ("Request received") versus warm ("We review within a day").
4. Theme choice at signup: does picking a theme in onboarding lift activation?

## Verification

- Byte-level dash scan: 0 em, 0 en in all six authored files
- Slide 5 structure: 2 silos, 6 role rungs, 0 leftover themdots, in manus-v2, v3, v4
- `node --check` on all three scripts: pass
- `bun run audit:load`: passed
- `bun run typecheck`: passed, exit 0
- `git status`: captured. Six onboarding HTML files modified by this session. All other modified and untracked files belong to other agents and remain untouched.

## Risks or limitations

- Scores are expert judgement against the three skills. No live traffic data exists for these prototypes, so the ranking predicts, it does not measure.
- The 45px-threshold swipe in manus v1 was not retested after repair work in other files.
- SSO recommendation assumes Google OAuth is enabled in the Supabase project. Confirm before build.

## Deferred work

- Build the winning candidate as React screens with shadcn Form, Input, and Button, React Hook Form, and Zod.
- Wire the SSO buttons to Supabase OAuth providers.
- Run the test ideas with real analytics once the flow ships.
