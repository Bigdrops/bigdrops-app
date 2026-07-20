# CSR & Waybill Activity & History Cards

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective & Scope

Add Activity & History sections (collapsible audit trail feeds) to the CSR and Waybill detail pages, matching the existing pattern used by Invoice and Quotation modules. Only read-side UI — no audit writing code was touched.

**Intentionally excluded:** Writing audit data, modifying the `useAuditTrail` hook, touching Invoice/Quotation ActivityCards, changing business logic, schema changes, new dependencies.

## Changes Made

### 1. Type Expansion — `src/domain/audit/auditTypes.ts:6`
Added `'csr' | 'waybill'` to the `AuditEntityType` union type. This is the only TypeScript-level change needed — the `useAuditTrail` hook already passes `entityType` as a parameterized string in SQL queries.

### 2. Action Label Coverage — `src/domain/audit/auditFormatters.ts:53-64`
Added `csr` and `waybill` entries to `ACTION_LABELS` so audit log actions (CREATE, UPDATE, DELETE, STATUS_CHANGE, LINK, UNLINK) render meaningful labels like "created this service report" instead of the fallback "updated this record".

### 3. New Components
- **`src/components/document-view/csr/sections/ActivityCard.tsx`** — CSR ActivityCard following the Quotation pattern. Calls `useAuditTrail({ entityType: "csr", ... })`, reuses `InvoiceWorkspace.module.css` styles.
- **`src/components/document-view/waybill/sections/ActivityCard.tsx`** — Same structure, entityType: "waybill".

### 4. View Page Wiring
- **`CsrViewPage.tsx`** — Added `activityHistory?: ReactNode` prop, rendered after `DocumentSection`.
- **`WaybillViewPage.tsx`** — Same pattern, rendered after `DocumentSection`.

### 5. Caller Page Wiring
- **`ViewCSR.tsx`** — Imports `CsrActivityCard`, passes `<CsrActivityCard documentId={docProps.id} />` as `activityHistory`.
- **`ViewWaybill.tsx`** — Imports `WaybillActivityCard`, passes `<WaybillActivityCard documentId={docProps.id} />` as `activityHistory`.

## Evidence & Verification

- **`bun run typecheck`** — Passed (no errors, clean output).
- **`bun run audit:load`** — Passed. All 39 warnings are pre-existing (bloat, broad selects, architecture) — none related to this change.
- **`git status`** — Shows exactly 6 modified files + 2 untracked directories with 2 new component files. No unintended modifications.

## Risks & Limitations

- **Existing audit coverage:** If no audit data exists for a given CSR or Waybill (as noted in `docs/standard/audit-trail-standard.md`), the card will show "No history recorded yet." This is by design — the component is a transparent view into existing data.
- **Performance:** The `useAuditTrail` hook only queries data when the accordion is expanded (`enabled: isOpen`). No loading cost on initial page render.
- **Action labels for future actions:** If new action types (beyond CREATE/UPDATE/DELETE/STATUS_CHANGE/LINK/UNLINK) are added for CSR/Waybill, they'll fall back to "updated this record" unless `ACTION_LABELS` entries are added in `auditFormatters.ts`.

## Deferred Work

- No shared/abstract ActivityCard component was created — CSR and Waybill each have their own file following the existing module-specific pattern. If a fourth+ module needs one, consider extraction.
