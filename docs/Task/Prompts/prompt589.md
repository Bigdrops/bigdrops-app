

```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
Before writing any code, you MUST:
1. Read `docs/PROJECTSKIILINDEX.md`
2. Load: `Karpathy` (coding discipline)
3. Fallback to direct file read on failure. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Task/reports/prefix-engine-awb-popover-fix.md`

==================================================
TASK: Two Surgical Fixes — Generator Default + Popover Copy
==================================================

READ FIRST:
- `src/components/waybill/waybillUtils.ts` (find getNextWaybillNumber)
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx` (find PREFIX_INFO constant)

==================================================
CHANGE 1 — Fix Waybill Generator Default from AWB to WBL
==================================================

SCOPE: `src/components/waybill/waybillUtils.ts` ONLY

Find `getNextWaybillNumber`. Change its default parameter from:
```

prefix: string = 'AWB'

```
to:
```

prefix: string = 'WBL'

```

No other changes. Do not touch padding, logic, or other parameters.

==================================================
CHANGE 2 — Update PREFIX_INFO Popover Copy
==================================================

SCOPE: `src/pages/settings/DocumentPrefixesSettingsSection.tsx` ONLY

Replace the entire `PREFIX_INFO` constant with exactly this:

```typescript
const PREFIX_INFO: Record<DocumentPrefixKey, { title: string; description: string }> = {
  waybill: {
    title: 'Waybill Numbers',
    description: 'For generating: External Delivery Notes (-E-), Internal Transfer Notes (-I-), Blank External Waybills (-ME-), Blank Internal Waybills (-MI-).',
  },
  invoice: {
    title: 'Invoice Numbers',
    description: 'For generating invoices.',
  },
  quotation: {
    title: 'Quotation Numbers',
    description: 'For generating quotations.',
  },
  rfq: {
    title: 'RFQ Numbers',
    description: 'For generating Request for Quotation documents.',
  },
  boq: {
    title: 'BOQ Numbers',
    description: 'For generating Bill of Quantities documents.',
  },
  project: {
    title: 'Project Codes',
    description: 'For generating project codes.',
  },
  csr: {
    title: 'CSR Numbers',
    description: 'For generating: Service Reports (base prefix), Blank CSR Forms (-M-).',
  },
}
```

No \n characters, no bullet symbols. Plain sentences only.

==================================================
VERIFICATION
==================================================

1. bun run audit:load
2. bun run typecheck — must pass with zero errors

==================================================
DONE WHEN
==================================================

· getNextWaybillNumber default is 'WBL'
· PREFIX_INFO matches the new mobile-safe copy exactly
· bun run typecheck passes with zero errors
· Work report saved to docs/Task/reports/prefix-engine-awb-popover-fix.md
· Changes pushed to main

==================================================
DO NOT
==================================================

· Do NOT run bun run dev
· Do NOT change layout, popover component, or button behavior
· Do NOT modify any other files
· Do NOT skip the work report

```

Target: Any agent | Strategy: Two one-line fixes — default string swap and constant replacement. Type-correct TypeScript with no newline escapes ensures mobile popovers render clean single-sentence descriptions without layout breakage.