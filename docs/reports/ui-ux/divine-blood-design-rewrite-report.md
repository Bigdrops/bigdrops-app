# Divine Blood Design System Rewrite Report

This report was written by opencode on 2026-08-14 via opencode CLI.

## Objective

Rewrite `docs/TEMPLATES/Designsdotmds/Divine-blood.md` in place.

The document must become an implementation-ready design system specification.

It must preserve the core principle:

> The interface is rational. The environment is occasionally irrational.

It must preserve the Whisper, Presence, and Event living material system.

It must fix the structural defects of the previous version.

## Scope

This report covers:

- The document rewrite
- The structural fixes
- The accessibility fixes
- The shadcn/ui foundation rules
- The final verification checklist

This task changes documentation only.

It does not change application code.

## Files Changed

- Modified: `docs/TEMPLATES/Designsdotmds/Divine-blood.md`
- Added: `docs/Reports/Ui-Ux/divine-blood-design-rewrite-report.md`

## Skills Used

- shadcn
- accessibility

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

The previous document was 1411 lines with 55 sections.

The rewritten document is 1866 lines with 39 numbered sections.

The rewrite fixes the following structural defects.

### Theme Structure

The previous version nested the Dark theme inside the Light theme.

The new version separates Light and Dark in:

- Section 3: Theme Philosophy
- Section 4: Color System
- Section 10: Surfaces and Elevation

The document now states exactly two modes.

It forbids separate Gold Light and Crimson Dark themes.

### Steward Section

The previous version over-specified the Steward persona, writing style, and actions.

The new Section 19 is visual guidance only.

It defines the avatar concept, sizes, and presence locations.

It explicitly does not define persona, writing style, or feature behavior.

### Berkeley Mono Licensing

The previous version buried the licensing caveat at the end of the document.

The new version moves it to Section 5, directly after the font decision.

### Living Material

The document now defines three levels with precise rarity:

- Level 1 Whisper: opacity 0.04-0.10, amplitude up to 4px, continuous
- Level 2 Presence: opacity 0.12-0.22, amplitude up to 12px, 6-16s passes
- Level 3 Event: opacity 0.20-0.35, amplitude up to 24px, at most once per session

Level 3 triggers only on meaningful achievements.

It never triggers on routine actions.

### No-Go Zones

The document lists 15 prohibited surfaces for living material.

These include data tables, financial summaries, metric displays, charts, and forms.

### Component Foundation

Section 13 states that shadcn/ui is the component foundation.

The document applies through the shadcn CSS-variable layer.

It forbids hand-built replacements for covered primitives.

It defines the variant color mapping.

### Measurable Language

The document replaces vague words with measurable definitions.

- Opacity ranges for living material levels
- Motion durations: fast 120-180ms, standard 200-350ms, slow 400-700ms
- Living flow durations: 6-16s and 12-30s
- Motion amplitudes: up to 4px, 12px, and 24px
- Border thickness: 1px
- Table row height: 40-44px desktop, 48px and above on touch

### Accessibility

Section 25 states WCAG 2.2 Level AA compliance.

The contrast tables in Section 4 use computed ratios.

The rewrite flags the tokens that fail AA:

- Light `--db-focus` (#C98A16) fails 3:1 on white. Use `--db-gold-700` or update the token.
- Light `--db-success` (#218A45) fails 4.5:1 for normal text. Pair with icon and text, or use a darker token.
- `--db-ink-faint` fails normal text in both modes. Large text and non-text only.

The rewrite defines the focus indicator: 2px thick, offset 2px, gold in both modes.

It defines target sizes: 24 x 24px minimum, 44 x 44px on coarse pointers.

It covers reduced motion, keyboard operation, text scaling, and reflow.

### Other Sections

The rewrite adds:

- Section 15: Data Display (financial data, tables, charts, status)
- Section 16: Dashboards
- Section 17: Search
- Section 18: Navigation and States
- Section 25: Accessibility WCAG 2.2 AA
- Section 30: Responsive Architecture (including fold and flip devices)
- Section 31: Print
- Section 32: Localization
- Section 38: Design Review Checklist
- Section 39: Pre-Implementation Verification

## Final Verification Checklist

The rewrite passes the following checks.

1. No internal contradictions found.
2. Light and Dark structure is fully separated.
3. All 15 no-go zones are listed in Section 20.
4. shadcn/ui foundation is explicit in Section 13.
5. Iconography has two distinct roles in Section 12.
6. Tables, dashboards, and search have dedicated sections.
7. The Steward section is brief and visual-only.
8. Berkeley Mono licensing caveat is in Section 5.
9. Motion, opacity, and amplitude values are measurable.
10. The premium non-fantasy positioning is explicit in Section 36.
11. The do-not list blocks gothic, vampire, and gaming drift.
12. Token values, type scale, and breakpoints are implementation-ready.
13. The core principle is preserved at the start and the end.
14. The rewrite is in place. No separate replacement document was created.
15. Contrast figures are computed and the failing tokens are flagged.

## Verification Result

- `bun run audit:load`: passed
- `bun run typecheck`: passed
- `git status`: modified `docs/TEMPLATES/Designsdotmds/Divine-blood.md`
- `bun run build`: skipped due to hardware policy

## Risks or Limitations

- Berkeley Mono is a commercial font. Confirm its license before production use.
- The app currently uses blue as its brand primary. The rewrite forbids blue.
- The app uses a preset theme system. The rewrite defines exactly two modes.
- The app uses the `.dark` class. The rewrite uses `[data-theme="dark"]`.
- Steward and living material are new product surfaces. The app has no assistant today.

## Deferred Work

- The actual UI implementation
- The theme token migration in the app
- The font loading setup
- The Steward surface build
- The living material implementation