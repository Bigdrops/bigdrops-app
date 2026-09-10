# Manus Onboarding v2.1 Report

This report was written by Buffy on 2026-09-10 via Freebuff.

## Objective

Take manus v2, the winning onboarding candidate, to a v2.1. Apply the onboarding, signup, and cro skills. Give every page a stronger story. Close the gaps the CRO audit found. Push the candidate toward a 100-point standard.

## Scope

One new candidate: `BIGDROPS_Onboarding-manus-v2.1.html`. It forks v2. No source files changed. Other candidates stay untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-manus-v2.1.html` (new)

## Skills used

Skills used: onboarding, signup, cro, mobile-app-ui-design
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

### Signup upgrades (signup skill)

1. Google and Apple SSO buttons sit above the email choices. The signup skill ranks social auth above email for first-touch conversion. Each button has a busy spinner and a prototype flow that lands on the approval panel.
2. A "or with email" divider separates SSO from the choice list.
3. The sign-in choice card states its real purpose: "Checking an approval? We'll show it here."

### Friction removal (onboarding + cro skills)

4. A Skip control lives in the top bar. The onboarding skill says never trap users. Skip goes straight to the get-started slide.
5. Every CTA now sells the next value, not the mechanics: "See how it works", "See money come in", "See a delivery land", "See taxes get easy", "See teams stay separate", "Create my workspace".
6. The welcome slide sets a time expectation: "A 30-second look before you set up." The cro skill calls this removing uncertainty.

### Story and illustration upgrades (mobile-app-ui-design skill)

7. Personalization. The approval panel greets the user by first name from the signup form. SSO users get the neutral line.
8. Peak moment. The Paid label glows green when the invoice timeline completes. The proof-of-delivery chip pulses once. The NRS chip carries a slow shimmer.
9. End moment. A green confirmation card fades in under the approval panel: "You're on the list. Most workspaces open the same day."
10. Trust. The footer now says "Your records stay yours" with a lock icon.

### Design system integrity

All new UI uses the existing tokens. The SSO row, skip control, end card, and shimmer reuse `--surface`, `--line-strong`, `--primary`, and the established radii. No new colors outside the Design.md contract.

## Verification

- Em dash scan: 0. En dash scan: 0. Byte-level check.
- Structure: 6 slides, 3/3 forms, 14/14 buttons balanced. SSO, skip, and end card present.
- Script extracted and parsed with `node --check`: OK.
- `bun run audit:load`: passed.
- `bun run typecheck`: passed (exit 0).

## Risks or limitations

- SSO and approval flows are prototypes. Buttons simulate latency with timers. Real Supabase OAuth wiring is production work.
- The "Most workspaces open the same day" line is a claim. It needs a true operations number before launch.
- The shimmer uses a white gradient overlay. On the dark board slide it stays subtle, but a high-contrast mode may need a stronger variant.

## Deferred work

- Wire SSO to Supabase OAuth when the candidate graduates to React.
- Replace the same-day claim with a measured figure or soften it.
- A/B test the value-first CTA labels against the plain Continue labels once analytics exist.

## Grade self-check against the audit dimensions

- Story per page: pass. Each CTA names the value the next slide shows.
- Signup suite: pass. SSO, email, join, sign-in, approval reality.
- Motivation mechanics: pass. Skip, time note, personalization, peak, end.
- Living illustration: pass. Every stage now has a second-beat motion.
- Accessibility and motion: unchanged from v2. Reduced motion keeps every new effect safe.
