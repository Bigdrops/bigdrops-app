

```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
Before writing any code, you MUST:

1. Read `docs/PROJECTSKIILINDEX.md`
2. Load these skills:
   - `Karpathy` — coding discipline, surgical changes, no scope creep
   - `frontend-design` — visual design standards
   - `tailwind-css-patterns` — Tailwind v3 patterns
   - `shadcn` — shadcn/ui components
3. Fallback to direct file read if skill tool fails. Stop if unreadable.
4. Read `AGENTS.md` before editing anything.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Task/reports/prefix-engine-steps7-8-info.md`

==================================================
TASK: Info Popovers + Steps 7 & 8 — Wire Prefix Engine to Generators
==================================================

READ FIRST (mandatory, before editing):
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx` (read fully)
- `src/domain/prefixConstants.ts` (read fully)
- `src/hooks/useSettings.js` (read fully)
- `src/components/waybill/waybillUtils.ts` (find getNextWaybillNumber — read signature)
- `src/components/csr/csrUtils.ts` (find getNextCsrNumber — read signature)
- `src/domain/documentConversion.ts` (find getNextInvoiceNumber — read signature)
- `src/domain/quotation/normalize.ts` (find getNextQuotationNumber — read signature + all call sites)
- `src/domain/rfq/normalize.ts` (find getNextRfqNumber — read signature + all call sites)
- `src/domain/projects.ts` (find generateNextProjectCode and getProjectCodePrefix — read both)
- `src/pages/NewInvoice.tsx` (find getNextInvoiceNumber call site)
- `src/pages/Invoices.tsx` (find getNextInvoiceNumber call site)
- `src/pages/NewWaybill.tsx` (find getNextWaybillNumber call site)
- `src/pages/NewCSR.tsx` (find getNextCsrNumber call site)
- `src/pages/NewRfq.tsx` (find getNextRfqNumber call site)
- `src/pages/viewQuotationActions.ts` (find getNextQuotationNumber call site)
- `src/pages/viewRFQActions.ts` (find getNextQuotationNumber call site)
- `src/pages/viewBOQActions.ts` (find getNextQuotationNumber call site)
- `src/modules/invoices/services/invoiceConversionService.ts` (find getNextQuotationNumber call site)
- `src/modules/quotations/services/quotationService.ts` (find getNextQuotationNumber call site)
- `AGENTS.md`
- `docs/PROJECTSKIILINDEX.md`

==================================================
CHANGE 1 — Info Popovers on Prefix Rows
==================================================

SCOPE: `src/pages/settings/DocumentPrefixesSettingsSection.tsx` ONLY

Add a small `i` icon button next to the label of each prefix row. Tapping it opens a small popover explaining what documents that prefix affects.

### Popover behavior
- Opens on tap/click only — no hover
- Closes when user clicks/taps anywhere outside the popover
- Has an X button in the top-right corner to close explicitly
- Small and compact — not a modal, not full-screen
- Only one popover open at a time

### Implementation
Use shadcn `Popover` and `PopoverContent` from `@/components/ui/popover`.
- Trigger: a small ghost `Button` with `Info` icon from lucide-react, size `xs` or `icon`
- PopoverContent: `w-64 p-3` — compact
- Inside: short title (bold, small) + 1-2 sentence description
- X button: top-right corner, `absolute top-1.5 right-1.5`, closes the popover

### Info content per field

Define these as a constant object at the top of the component:

```typescript
const PREFIX_INFO: Record<DocumentPrefixKey, { title: string; description: string }> = {
  waybill: {
    title: 'Waybill Numbers',
    description: 'Used for External Delivery Notes, Internal Transfer Notes, and their blank manual variants. Changing this prefix starts a new sequence for all four formats.',
  },
  invoice: {
    title: 'Invoice Numbers',
    description: 'Used for all invoices generated in this workspace.',
  },
  quotation: {
    title: 'Quotation Numbers',
    description: 'Used for all quotations and price proposals.',
  },
  rfq: {
    title: 'RFQ Numbers',
    description: 'Used for all Request for Quotation documents.',
  },
  boq: {
    title: 'BOQ Numbers',
    description: 'Used for all Bill of Quantities documents.',
  },
  project: {
    title: 'Project Codes',
    description: 'Used for all project codes generated in this workspace.',
  },
  csr: {
    title: 'CSR Numbers',
    description: 'Used for Customer Service Reports and blank manual CSR forms.',
  },
}
```

==================================================
CHANGE 2 — Step 7: Add Prefix Parameter to Waybill and CSR Generators
==================================================

2a — getNextWaybillNumber in src/components/waybill/waybillUtils.ts

Current signature:

```ts
function getNextWaybillNumber(type: WaybillType, existingNumbers: string[]): string
```

New signature:

```ts
function getNextWaybillNumber(
  type: WaybillType,
  existingNumbers: string[],
  prefix: string = 'WBL',
): string
```

Inside the function, replace the hardcoded 'AWB-I-' and 'AWB-E-' strings with:

· External:  `${prefix}-E-` 
· Internal:  `${prefix}-I-` 

The serial padding stays at 4 digits (padStart(4, '0')). Keep all other logic identical.

2b — getNextCsrNumber in src/components/csr/csrUtils.ts

Current signature:

```ts
function getNextCsrNumber(lastValue: string | null | undefined): string
```

New signature:

```ts
function getNextCsrNumber(
  lastValue: string | null | undefined,
  prefix: string = 'CSR',
): string
```

Inside the function, replace the hardcoded 'CSR-001' fallback with  `${prefix}-000001` .

The function already preserves whatever prefix exists in lastValue by incrementing in-place — this change only affects the fallback when lastValue is empty or null.

==================================================
CHANGE 3 — Step 8: Wire All Generators to Settings Prefix
==================================================

Every call site must now read the prefix from useSettings() via resolvePrefix() from src/domain/prefixConstants.ts and pass it to the generator.

Pattern for every call site:

```ts
import { resolvePrefix } from '@/domain/prefixConstants'
// settings comes from useSettings() already present in the component/file

const prefix = resolvePrefix('invoice', settings?.document_prefixes)
const nextNumber = getNextInvoiceNumber(rows, prefix)
```

Wire each generator:

Invoice — getNextInvoiceNumber

· src/pages/NewInvoice.tsx — pass resolvePrefix('invoice', settings?.document_prefixes) as second argument
· src/pages/Invoices.tsx — same

Quotation — getNextQuotationNumber

· src/pages/viewQuotationActions.ts — pass resolvePrefix('quotation', settings?.document_prefixes) as second argument
· src/pages/viewRFQActions.ts — same
· src/pages/viewBOQActions.ts — same
· src/modules/invoices/services/invoiceConversionService.ts — same
· src/modules/quotations/services/quotationService.ts — same

RFQ — getNextRfqNumber

· src/pages/NewRfq.tsx — pass resolvePrefix('rfq', settings?.document_prefixes) as second argument

Waybill — getNextWaybillNumber

· src/pages/NewWaybill.tsx — pass resolvePrefix('waybill', settings?.document_prefixes) as third argument
· src/domain/waybill/waybillMutations.ts — same

CSR — getNextCsrNumber

· src/pages/NewCSR.tsx — pass resolvePrefix('csr', settings?.document_prefixes) as second argument

Settings access in non-component files

Some call sites are in service files or action files that don't use React hooks. For these files:

· If settings is already passed as a parameter or available in scope, use it directly
· If not, add settings as a parameter to the function and update its callers to pass it through
· Do NOT call useSettings() inside non-React files — hooks are React-only

Document in the report which files needed settings passed through as a parameter vs which already had access.

==================================================
CHANGE 4 — Step 9: Project Document Sequence Generation
==================================================

SCOPE: src/domain/projects.ts

Current state: getProjectCodePrefix(date) returns PRJ-{year}- hardcoded. generateNextProjectCode() uses this internally.

Fix:

· Modify getProjectCodePrefix to accept an optional prefix parameter:

```ts
function getProjectCodePrefix(date = new Date(), prefix: string = 'PRJ'): string {
  return `${prefix}-${date.getFullYear()}-`
}
```

· Modify generateNextProjectCode to accept an optional prefix parameter:

```ts
async function generateNextProjectCode(
  supabaseClient: ...,
  date: Date = new Date(),
  prefix: string = 'PRJ',
): Promise<string>
```

Pass prefix through to getProjectCodePrefix(date, prefix) inside the function.

· At the call site in src/domain/projects.ts (inside createProjectWithGeneratedCode):
  · Add settings parameter to createProjectWithGeneratedCode or fetch prefix from wherever settings are available in that context
  · Pass resolvePrefix('project', settings?.document_prefixes) as the prefix argument

==================================================
VERIFICATION
==================================================

1. bun run audit:load
2. bun run typecheck — must pass with zero errors
3. bun run lint — focused on changed files

Manual verification (document in report):

· Info popover opens on tap, closes on outside click and X button
· Only one popover open at a time
· Waybill generator uses WBL-E- and WBL-I- format (not AWB-E- / AWB-I-)
· CSR fallback produces CSR-000001 not CSR-001
· Every generator call site passes the resolved prefix from settings
· Non-hook files pass settings as a parameter — document which ones

==================================================
DONE WHEN
==================================================

· Info popover on every prefix row label
· Popover closes on outside click and X button
· One popover open at a time
· PREFIX_INFO constant defined with content for all 7 keys
· getNextWaybillNumber accepts prefix parameter, uses it internally
· getNextCsrNumber accepts prefix parameter, uses it for fallback
· All Invoice call sites pass resolved prefix
· All Quotation call sites pass resolved prefix
· All RFQ call sites pass resolved prefix
· All Waybill call sites pass resolved prefix
· All CSR call sites pass resolved prefix
· Project generator accepts prefix parameter and is wired to settings
· No hardcoded AWB-, SASINV-B, SASIQUO, CSR-001, PRJ-{year} strings remain at call sites
· bun run audit:load passes
· bun run typecheck passes with zero errors
· Work report saved to docs/Task/reports/prefix-engine-steps7-8-info.md
· All changes pushed to main

==================================================
DO NOT
==================================================

· Do NOT run bun run dev
· Do NOT call useSettings() inside non-React service or action files
· Do NOT change serial padding or number format logic inside generators
· Do NOT touch offline generators (csrOffline.ts, quotationOffline.ts)
· Do NOT modify the AlertDialog pattern in the settings card
· Do NOT add new dependencies
· Do NOT use Tailwind v4 syntax
· Do NOT skip the work report

```

Target: Any agent | Strategy: Three concerns in one pass — UI popover (one file), generator signature updates (two files), and call site wiring (11 files). Non-hook files identified upfront so agent handles settings pass-through correctly instead of guessing.