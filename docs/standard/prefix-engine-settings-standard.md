# Prefix Engine Settings Standard — BIGDROPS

> **Version:** 1.0
> **Last Updated:** 2026-06-16
> **Scope:** All document types that generate auto-incrementing serial numbers (Invoice, Quotation, Waybill, RFQ, CSR, BOQ, Project).

---

## 1. Runtime Prefix & Fallback Configuration

Every document generator MUST resolve its prefix at runtime through `resolvePrefix`. Hardcoded prefix strings are forbidden in generation logic.

### 1.1 Canonical Source

```ts
// src/domain/prefixConstants.ts

export const DEFAULT_PREFIXES = {
  waybill: 'WBL',
  invoice: 'INV',
  boq: 'BOQ',
  rfq: 'RFQ',
  quotation: 'QTN',
  project: 'PRJ',
  csr: 'CSR',
} as const

export type DocumentPrefixKey = keyof typeof DEFAULT_PREFIXES
export type DocumentPrefixes = Record<DocumentPrefixKey, string>

export function resolvePrefix(
  documentPrefixes: Record<string, string> | null | undefined,
  key: DocumentPrefixKey,
): string {
  const value = documentPrefixes?.[key]
  if (typeof value === 'string' && /^[A-Z0-9]{2,6}$/.test(value)) {
    return value
  }
  return DEFAULT_PREFIXES[key]
}
```

### 1.2 Binding Rules

| Context | How prefix is obtained | Import |
|---|---|---|
| React component / page | `const { settings } = useSettings()` then `resolvePrefix(settings?.document_prefixes, key)` | `useSettings` + `resolvePrefix` |
| Non-React domain function | Accept `prefixes?: DocumentPrefixes \| null` parameter, call `resolvePrefix(prefixes, key)` at call site | `resolvePrefix` only |
| Domain mutation file (e.g. `waybillMutations.ts`) | Accept `prefixes?: DocumentPrefixes \| null` in params object, resolve inside | `resolvePrefix` + `DocumentPrefixes` type |

**Never** call `useSettings()` outside a React component or hook. Non-React files receive prefixes as a parameter.

### 1.3 Fallback Parameter Convention

Utility number generators MUST define a fallback default matching `DEFAULT_PREFIXES`:

```ts
// CORRECT — fallback matches canonical default
export function getNextInvoiceNumber(
  rows: { invoice_number?: string | null }[],
  prefix: string = 'INV',  // matches DEFAULT_PREFIXES.invoice
): string { ... }

// CORRECT
export function getNextRfqNumber(
  rows: { rfq_number: string | null }[],
  prefix: string = 'RFQ',
): string { ... }

// CORRECT
export function getNextCsrNumber(
  lastValue: string | null,
  prefix: string = 'CSR',
): string { ... }
```

This ensures offline/detached resilience — if prefixes are null or the settings table is empty, generators produce correct default sequences.

### 1.4 Serial Code Layout

All serial codes MUST use 6-digit zero-padded sequences:

```ts
padStart(6, '0')
```

Examples: `INV-000001`, `WBL-E-000001`, `CSR-M-000001`, `QTN-000001`.

**Exception:** Waybill routing tokens (`-E-`, `-I-`, `-ME-`, `-MI-`) are injected between the prefix and serial — the serial itself remains 6-digit zero-padded.

```ts
// Waybill — prefix resolves, routing token appended, serial is 6-digit
const prefix = resolvePrefix(prefixes, 'waybill') // → 'WBL'
const number = `${prefix}-E-000001`               // external waybill
const number = `${prefix}-ME-000001`              // blank external waybill
```

### 1.5 Input Sanitization

Settings UIs MUST enforce uppercase alphanumeric input with a 6-character max:

```ts
function sanitizePrefixInput(value: string): string {
  return value.replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
```

The DB enforces this via a Postgres CHECK constraint:
```sql
(document_prefixes->>'<key>') ~ '^[A-Z0-9]{2,6}$'
```

---

## 2. Application-Level Collision Resilience (`withUniqueRetry`)

Every document INSERT path MUST be wrapped with `withUniqueRetry` to handle PostgreSQL unique constraint violations (`23505`) automatically.

### 2.1 Utility Blueprint

```ts
// src/lib/withUniqueRetry.ts

import type { PostgrestError } from '@supabase/supabase-js'

export async function withUniqueRetry<T>(
  insertFn: (candidateValue: string) => Promise<{ data: T | null; error: PostgrestError | null }>,
  regenerateValue: () => Promise<string>,
  maxRetries = 3,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  let candidate = await regenerateValue()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await insertFn(candidate)

    if (!result.error) {
      return result
    }

    if (result.error.code === '23505') {
      if (attempt < maxRetries) {
        candidate = await regenerateValue()
        continue
      }
    }

    return result
  }

  return { data: null, error: null as unknown as PostgrestError }
}
```

### 2.2 Operational Flow

1. **Generate candidate** — `regenerateValue()` is called once before the loop.
2. **Attempt insert** — `insertFn(candidate)` runs the Supabase `.insert()` with the candidate number.
3. **On success** — return immediately.
4. **On `23505`** — the unique constraint was violated (another row claimed the number first). Call `regenerateValue()` again to get a fresh candidate. Retry from step 2.
5. **On any other error** — return immediately, no retry.
6. **After maxRetries exhausted** — return the last error.

### 2.3 Standard Insert Wrapper Pattern

```ts
const { data, error } = await withUniqueRetry(
  // insertFn: receives candidate, mutates payload, runs insert
  async (candidateNumber: string) => {
    payload.document_number = candidateNumber
    return supabase.from('table_name').insert([payload]).select().single()
  },
  // regenerateValue: fetches existing rows, computes next number
  async () => {
    const { data: rows } = await supabase
      .from('table_name')
      .select('document_number')
    return getNextDocumentNumber(rows || [], resolvePrefix(prefixes, 'docKey'))
  },
)
```

### 2.4 Per-Module Implementations

| Module | File | Table | Number Generator | Prefix Key |
|---|---|---|---|---|
| Invoice | `src/pages/NewInvoice.tsx:596` | `invoices` | `getNextInvoiceNumber(rows, prefix)` | `'invoice'` |
| Quotation | `src/components/quotation/QuotationForm.tsx:580` | `quotations` | Manual regex + padStart(4, '0') | `'quotation'` |
| Waybill | `src/domain/waybill/waybillMutations.ts:77` | `waybills` | `getNextWaybillNumber(type, existing, prefix)` | `'waybill'` |
| RFQ | `src/pages/NewRfq.tsx:27` | `rfqs` | `getNextRfqNumber(rows, prefix)` | `'rfq'` |
| CSR | `src/pages/NewCSR.tsx:295` | `csrs` | `getNextCsrNumber(lastValue, prefix)` | `'csr'` |
| Project | `src/domain/projects.ts` | `projects` | Built-in retry loop (maxRetries=2) | `'project'` |

**Project module** has its own retry mechanism inside `createProjectWithGeneratedCode()` — do not double-wrap.

### 2.5 Edit Mode

Edit (update) paths MUST NOT use `withUniqueRetry`. The number is immutable after creation:

```ts
if (isEdit && documentId) {
  const result = await supabase.from('table').update(payload).eq('id', documentId)
  // no retry needed — number doesn't change
} else {
  const result = await withUniqueRetry(
    async (candidate) => { /* insert */ },
    async () => { /* regenerate */ },
  )
}
```

---

## 3. Mobile-First UI/UX Form Layouts

Settings surfaces and document forms MUST follow the vertical stacking paradigm to eliminate horizontal truncation on compact screens.

### 3.1 Input + Preview Vertical Layout

Each prefix field uses a vertical stack: label row → input → preview badges below. Never place input and preview side-by-side in a single row on mobile.

```tsx
<div key={key} className="px-5 py-4 space-y-2">
  {/* Label row — horizontal, wraps on small screens */}
  <div className="flex items-center gap-2">
    <label className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {LABELS[key]} Prefix
    </label>
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="..." aria-label={`Info about ${LABELS[key]} prefix`}>
          <Info size={13} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-72 text-xs">
        {PREFIX_INFO[key].description}
      </PopoverContent>
    </Popover>
  </div>

  {/* Input — full width on mobile, constrained on desktop */}
  <input
    type="text"
    value={prefix}
    onChange={(e) => handleFieldChange(key, e.target.value.toUpperCase())}
    className="w-full max-w-[120px] rounded-lg border bg-background px-3 py-2 text-sm font-mono font-bold ..."
    maxLength={6}
  />

  {/* Preview — vertical stack on mobile, horizontal wrap on sm+ */}
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted opacity-70">
      Preview
    </p>
    <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
      {previews.map((p) => (
        <span key={p} className="inline-block rounded-md border ... font-mono text-xs font-bold">
          {p}
        </span>
      ))}
    </div>
  </div>
</div>
```

### 3.2 Responsive Breakpoint Rules

| Element | Mobile (< `sm`) | Desktop (`sm+`) |
|---|---|---|
| Preview badges | `flex-col gap-1.5` (vertical stack) | `sm:flex-row sm:flex-wrap sm:gap-2` |
| Input field | `w-full max-w-[120px]` | Same — max-width prevents oversized inputs |
| Label + info icon | `flex items-center gap-2` | Same |
| Conflict warning | Below preview, full width | Same |

### 3.3 Contextual Sticky Action Bar

When the form has unsaved changes, show a floating action bar pinned below the viewport header. It must:
- Appear only when dirty (`isDirty === true`)
- Use `sticky top-0 z-10` positioning
- Contain a "Dismiss" ghost button and a "Save Changes" primary button
- Show saving state text when saving

```tsx
{isDirty && (
  <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-3
    rounded-lg border border-amber-200 bg-amber-50 px-5 py-3
    animate-in slide-in-from-top-2 fade-in duration-200
    dark:border-amber-900/50 dark:bg-amber-950/30">
    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
      Unsaved changes
    </span>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleDismissChanges} disabled={saving}>
        Dismiss
      </Button>
      <Button size="sm" onClick={() => setPendingAction({ kind: 'save' })} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </div>
)}
```

### 3.4 Confirmation Dialogs

All destructive or irreversible actions (save, reset) MUST use shadcn `AlertDialog` — never `window.confirm()`:

```tsx
<AlertDialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{dialogMeta.title}</AlertDialogTitle>
      <AlertDialogDescription className="whitespace-pre-line">
        {dialogMeta.description}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>{dialogMeta.confirmLabel}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 4. Blank Template Logging Hooks

Blank administrative PDF downloads MUST allocate a tracked sequence number bound to the tenant prefix and immediately log the assignment to a tracking table.

### 4.1 Registration Pattern

Each document type that supports blank downloads needs:

1. A `blank_<type>_logs` table in Supabase (e.g. `blank_csr_logs`, `blank_waybill_logs`).
2. A `handleDownloadBlank<Type>` handler in the page component.
3. A download button wired in the form screen component.

### 4.2 Database Tables

```sql
-- blank_csr_logs
CREATE TABLE blank_csr_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_csr_number TEXT UNIQUE NOT NULL,
  downloaded_by UUID REFERENCES auth.users(id),
  downloaded_at TIMESTAMPTZ DEFAULT now(),
  linked_csr_id UUID REFERENCES csrs(id),
  reconciled_at TIMESTAMPTZ
);

-- blank_waybill_logs (already exists in codebase)
-- Columns: id, assigned_waybill_number (UNIQUE), downloaded_by, downloaded_at, linked_waybill_id, reconciled_at
```

### 4.3 Handler Implementation

```tsx
const handleDownloadBlankCsr = async () => {
  try {
    // 1. Fetch latest existing number to seed generator
    const { data: existingRows } = await supabase
      .from('csrs')
      .select('csr_number')
      .order('created_at', { ascending: false })
      .limit(1000)
    const latestNumber = existingRows?.[existingRows.length - 1]?.csr_number || null

    // 2. Generate next number using resolved prefix
    const blankNumber = getNextCsrNumber(
      latestNumber,
      resolvePrefix(settings?.document_prefixes, 'csr'),
    )

    // 3. Log the assignment (immutable — number is locked)
    const { error: logError } = await supabase.from('blank_csr_logs').insert([{
      assigned_csr_number: blankNumber,
    }])
    if (logError) {
      console.warn('[NewCSR] Failed to log blank CSR:', logError)
    }

    // 4. Generate PDF and trigger browser download
    const previewData = buildCsrPreviewData(
      { ...createDefaultCsr(isField), csr_number: blankNumber },
      { technicianSignatory: null },
    )
    const blob = await pdf(
      getCsrPdfDocument({ csr: previewData, branding: EMPTY_BRANDING, template: '3', designPreset: {} as any }),
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${blankNumber}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    feedback.success(`Blank CSR ${blankNumber} downloaded`)
  } catch (err) {
    feedback.error(err instanceof Error ? err.message : 'Download failed')
  }
}
```

### 4.4 Wiring in Form Screen

The download button MUST be placed in the floating action bar, adjacent to the Save button:

```tsx
// src/components/csr/CsrFormScreen.tsx

interface CsrFormScreenProps {
  // ... existing props
  onDownloadBlank?: () => void
}

// In the floating action bar:
{onDownloadBlank && (
  <Button
    variant="outline"
    size="icon"
    className="h-8 w-8 shrink-0"
    onClick={onDownloadBlank}
    title="Download blank CSR form"
  >
    <Download className="h-4 w-4" />
  </Button>
)}
```

### 4.5 Synchronization Guarantee

The `INSERT` into `blank_<type>_logs` happens **before** the PDF download. If the insert fails (e.g. duplicate number), the number is still locked by the UNIQUE constraint and the download is blocked. This prevents:
- Two users downloading the same blank number
- Number reuse after a failed download attempt

The `linked_<type>_id` column is populated later when the blank is reconciled with an actual document (if ever).

### 4.6 Future Rendering Canvas Engine

Per `docs/prd/pdf-rendering-roadmap.md`, blank downloads will eventually use a shared rendering canvas engine. The logging hook pattern above is designed to be renderer-agnostic — the tracking table records the number assignment independent of how the PDF is generated.

---

## 5. Automatic vs Manual Number Allocation Contract (Normative)

Automatic sequence progression and manual document numbers are different concepts.

### 5.1 Definitions

- **Automatic allocation**: the application derives the next identifier from the persisted per-family automatic cursor (see §5.4) plus a skip over occupied identifiers.
- **Automatic sequence (cursor)**: a per-family counter tracking automatic allocation progression. It advances only when an automatic allocation succeeds.
- **Manual identifier**: the exact string a user typed into a document-number field. It occupies only itself.
- **Occupied identifier**: any identifier already stored in the family, automatic or manual.
- **Number family**: the exact string prefix of a serial run, including routing or variant tokens (for example `SASINV`, `WBL-E-`, `SASCSR-M-`).

### 5.2 Normative example

Given an empty `K` family:

1. Automatic allocation MUST yield `K-000001`.
2. Automatic allocation MUST yield `K-000002`.
3. Manual `KP-000007` MUST NOT affect the `K` cursor (different family).
4. Automatic allocation MUST yield `K-000003`.
5. Manual `K-000005` MUST NOT move the cursor. The cursor stays at 4.
6. Automatic allocation MUST yield `K-000004`.
7. Automatic allocation MUST yield `K-000006`, skipping occupied `K-000005`.

### 5.3 Binding rules

- A manual number MUST NOT advance the automatic sequence, even when it syntactically belongs to the active automatic family.
- A manual number MUST reserve exactly its own identifier through the existing database uniqueness constraint. Nothing else is reserved.
- Automatic allocation MUST skip occupied identifiers encountered at or above the cursor.
- A duplicate manual identifier MUST fail through the existing duplicate/uniqueness error path. It MUST NEVER silently transform into an automatically generated identifier.
- Automatic collision retry (see §2) remains valid for system-generated candidates only.
- A manual identifier MUST be attempted exactly as entered. No normalization, padding, or prefix repair may alter it before the save attempt.
- Sequence gaps from skips, retries, or abandoned forms are permitted. Duplicate identifiers are forbidden.

### 5.4 Cursor persistence binding (current)

Persisted document rows carry no automatic/manual provenance, and provenance MUST NOT be inferred from number shape. The cursor therefore lives outside document rows:

- Cursors persist in the tenant `settings.document_prefixes` JSONB object under the reserved key `__auto_seq`, mapping family string to next sequence integer (for example `{"SASINV": 4}`).
- The `check_document_prefixes_format` CHECK constraint pattern-checks only the listed prefix keys. The reserved key carries a JSON object and is unaffected by the constraint. No schema migration is required for this binding.
- Cursor values are advisory. The database uniqueness constraint always arbitrates. A stale cursor costs at most retry attempts; it can never produce a duplicate or reuse an occupied identifier, because every candidate is skip-checked against ground-truth rows and every insert runs inside `withUniqueRetry`.
- Cursor writes are monotonic (`max(existing, used + 1)`) and best-effort. A failed bump MUST NOT fail the document creation it follows. The next allocation self-heals through skip plus retry.
- A settings UI save MUST preserve unknown `document_prefixes` keys. Rebuilding the object from known prefix fields only (and thereby dropping `__auto_seq`) is forbidden.
- Resetting a prefix to its default MUST clear that prefix's cursor families, so the promised fresh sequence (`{prefix}-000001`) actually restarts. Occupied historical numbers are still skipped, so a restart can never reuse an existing identifier.

### 5.5 Bootstrap and legacy data

- When no cursor exists for a family, the cursor initializes to one plus the maximum trailing sequence across ALL family rows, manual or automatic. This is a one-time safe over-advance: it can skip unused values but can never reuse an occupied one.
- Historical numbers are never rewritten to fit the cursor.

### 5.6 Concurrency

- Two concurrent automatic allocations may read the same cursor. The uniqueness constraint rejects the loser. The loser regenerates from a freshly re-read cursor plus a fresh row scan and retries. No application-level lock is required.
- Pre-filled but unedited form values are system candidates, not manual identifiers. Only an explicitly typed value is manual. Forms MUST NOT treat an untouched pre-filled value as manual. (Implementation note: compare against the last auto-filled value rather than tracking edit state.)

---

## Appendix A — File Reference Map

| File | Role |
|---|---|
| `src/domain/prefixConstants.ts` | Canonical prefix definitions, `resolvePrefix`, types |
| `src/lib/withUniqueRetry.ts` | Collision retry utility |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Settings UI (reference implementation for Pillar 3) |
| `src/domain/waybill/waybillMutations.ts` | Waybill insert with `withUniqueRetry` |
| `src/pages/NewInvoice.tsx` | Invoice insert with `withUniqueRetry` |
| `src/pages/NewRfq.tsx` | RFQ insert with `withUniqueRetry` |
| `src/pages/NewCSR.tsx` | CSR insert with `withUniqueRetry` + blank download handler |
| `src/components/quotation/QuotationForm.tsx` | Quotation insert with `withUniqueRetry` |
| `src/domain/documentConversion.ts` | `getNextInvoiceNumber(rows, prefix)` |
| `src/domain/rfq/normalize.ts` | `getNextRfqNumber(rows, prefix)` |
| `src/components/csr/csrUtils.ts` | `getNextCsrNumber(lastValue, prefix)` |
| `src/components/waybill/waybillUtils.ts` | `getNextWaybillNumber(type, existing, prefix)` |
| `src/domain/projects.ts` | Project has built-in retry — do not double-wrap |

## Appendix B — Checklist for New Document Types

When adding a new auto-numbered document type:

- [ ] Add key to `DEFAULT_PREFIXES` in `prefixConstants.ts`
- [ ] Add key to `DocumentPrefixKey` type
- [ ] Create `getNext<Type>Number(rows, prefix)` utility with `'DEFAULT'` fallback
- [ ] Wrap INSERT with `withUniqueRetry` in the page/mutation file
- [ ] Add settings UI entry in `DocumentPrefixesSettingsSection.tsx`
- [ ] Add preview template in `PREVIEW_TEMPLATES`
- [ ] If blank downloads are supported: create `blank_<type>_logs` table + handler + button
- [ ] Run `bun run audit:load`, `bun run typecheck`, `bun run lint`
