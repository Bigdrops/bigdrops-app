```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
Before writing any code, you MUST:

1. Read the project skills index: `docs/PROJECTSKIILINDEX.md`
2. Load the skills relevant to this task:
   - `Karpathy` — coding discipline, surgical changes, no scope creep
   - `using-superpowers` — meta-skill: how to find and use skills
3. If a skill fails to load via tool, FALL BACK to reading the SKILL.md file directly using the path from the index.
4. If SKILL.md cannot be read, STOP IMMEDIATELY. Task = FAILED.
5. Read AGENTS.md at project root before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save a markdown work report to `Task/reports/waybill-logo-and-bicolor-ticket.md` including: date, agent, files touched, what was done per change, verification results, done-criteria checklist, any deviations.

==================================================
TASK: 2 independent changes
==================================================

CHANGE 1 — Fix logo background bleed on coloured templates (Slate and Modern ONLY)
CHANGE 2 — Create Bicolor header ticket (DOCUMENTATION ONLY, NO CODE)

READ FIRST (mandatory):
- `src/components/waybill/SlateTemplate.tsx` (find logo image container)
- `src/components/waybill/ModernTemplate.tsx` (find logo image container)
- `src/components/waybill/BicolorTemplate.tsx` (for ticket context)
- `AGENTS.md`
- `docs/PROJECTSKIILINDEX.md`

==================================================
CHANGE 1 — Logo Background Fix (Slate and Modern ONLY)
==================================================

SCOPE — Touch ONLY these 2 files:
- `src/components/waybill/SlateTemplate.tsx`
- `src/components/waybill/ModernTemplate.tsx`

For EACH template, find the innermost View (or container) that wraps the logo image. Add `backgroundColor: '#ffffff'` to that wrapper via inline style merge.

Example pattern:
```tsx
// Before
<View style={styles.logoContainer}>
  <Image src={logoUrl} style={styles.logo} />
</View>

// After
<View style={[styles.logoContainer, { backgroundColor: '#ffffff' }]}>
  <Image src={logoUrl} style={styles.logo} />
</View>
```

If the logo is currently inside a coloured header banner, give the INNERMOST logo wrapper its own white background — NOT the outer coloured container. The goal: a white backdrop directly behind the logo image so the template's accent colour does not tint or bleed through.

Do NOT change logo size, position, or any other template styling.
Do NOT add backgrounds to EvergreenTemplate, PremiumTemplate, BicolorTemplate, MinimalTemplate, ClassicTemplate, or ThermalTemplate. Only Slate and Modern.
Do NOT touch BicolorTemplate.tsx — that is the ticket's work.

==================================================
CHANGE 2 — Bicolor Header Ticket (DOCUMENTATION ONLY)
==================================================

SCOPE — Create ONLY this one new file:
- `docs/Task/Tickets/bicolor-header-missing-company-info.md`

Create the file with EXACTLY this content:

```markdown
# Bicolor Template — Header Missing Company Info

**Date Created:** 2026-06-24
**Status:** Open
**Severity:** Medium
**Component:** `src/components/waybill/BicolorTemplate.tsx`

## Description

The Bicolor waybill template header currently shows only the logo and document title. The company name, address, phone number, email, and tagline are not visible.

## Cause

A previous fix applied a `maxHeight: 42` constraint to the `bannerText` container to prevent header overflow beyond 4 lines. The constraint was applied too aggressively and truncated all text content, not just the overflow portion.

## Impact

- Generated Bicolor waybill PDFs do not show the issuing company identity in the header
- Visual identity is reduced to logo only
- Customers receiving the PDF cannot identify the source company from the header alone (they must look at the body or footer)

## Suggested Fix

Restore the company info text (name, address, phone, email, tagline) inside the header while preserving the 4-line height constraint. Likely approach:
- Reduce font size of address/contact lines
- Use tighter lineHeight values
- Possibly stack the logo above the text in a column layout instead of row

## Acceptance Criteria

- Bicolor template header shows: logo + company name + address + phone/email + tagline
- Header height does not exceed 42pt
- No truncation of any visible text

## Related Files

- `src/components/waybill/BicolorTemplate.tsx`
- `src/components/waybill/waybillUtils.ts` (template id: `bicolor`)
```

Do NOT modify any code file. Do NOT add to other files. This is documentation only.

==================================================
VERIFICATION
==================================================

1. `bun run audit:load`
2. `bun run typecheck` — must pass with zero errors
3. `bun run lint` — focused on changed files is acceptable

Visual verification (document in report):
- `SlateTemplate.tsx` logo wrapper has `backgroundColor: '#ffffff'`
- `ModernTemplate.tsx` logo wrapper has `backgroundColor: '#ffffff'`
- `docs/Task/Tickets/bicolor-header-missing-company-info.md` exists with the exact content above
- BicolorTemplate.tsx was NOT modified
- No other files modified

==================================================
DONE WHEN
==================================================
- [ ] Logo wrapper has white background in SlateTemplate.tsx
- [ ] Logo wrapper has white background in ModernTemplate.tsx
- [ ] `docs/Task/Tickets/bicolor-header-missing-company-info.md` exists with the exact content above
- [ ] BicolorTemplate.tsx NOT modified
- [ ] No other templates touched (Evergreen, Premium, Bicolor, Minimal, Classic, Thermal)
- [ ] `bun run audit:load` passes
- [ ] `bun run typecheck` passes with zero errors
- [ ] `bun run lint` shows zero new errors on changed files
- [ ] Work report saved to `Task/reports/waybill-logo-and-bicolor-ticket.md`
- [ ] No files outside the documented scope were modified

==================================================
DO NOT
==================================================
- Do NOT run `bun run dev`
- Do NOT touch BicolorTemplate.tsx (it is the ticket's work, not this task)
- Do NOT touch any other template file (Evergreen, Premium, Minimal, Classic, Thermal)
- Do NOT add anything not in the paste-exact ticket content
- Do NOT claim verification you did not perform
- Do NOT skip the work report
```

Target: Kilocode / Opencode / Any agent | Strategy: Surgical 2-file logo fix (Slate + Modern only) plus a documentation-only ticket. No scope creep — the previous prompt's 4-template scope is reduced to the 2 the user confirmed have the issue.