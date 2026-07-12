# Document Form Consolidation Standard

> Mandates a single-form-page pattern for all document modules (Invoice, Quotation, CSR, Letter, BOQ, RFQ, Waybill). Every document module MUST have exactly one `*FormPage.tsx` component with a `mode` prop, and zero inline orchestration in `New`/`Edit` delegators.

## 1. Motivation

Before this standard, each document module had two separate pages (`NewX.tsx` and `EditX.tsx`) with duplicated orchestration logic (save, load, redirect, offline drafts, prefix resolution, import handling). This caused:

- Bug fixes applied to one page but not the other
- Leaky abstractions — form UI could not be shared because orchestration was tangled
- Unnecessary cognitive load when onboarding to a new document module

The consolidated pattern extracts all orchestration into a single `*FormPage.tsx`, leaving `NewX.tsx` and `EditX.tsx` as ~3-line delegators.

## 2. Pattern

### 2.1 File Layout

```
src/pages/
  InvoiceFormPage.tsx    # single form page, ~400-550 lines
  NewInvoice.tsx          # 3-line delegator: <InvoiceFormPage mode="create" />
  EditInvoice.tsx         # 3-line delegator: <InvoiceFormPage mode="edit" />
  CsrFormPage.tsx         # single form page
  NewCSR.tsx              # 3-line delegator
  EditCSR.tsx             # 3-line delegator
  LetterFormPage.tsx      # single form page
  NewLetter.tsx           # 3-line delegator
  EditLetter.tsx          # 3-line delegator
```

### 2.2 Component Interface

```tsx
interface *FormPageProps {
  mode: 'create' | 'edit'
}
```

### 2.3 Route Registration

Routes keep their existing paths. `AppShell.tsx` still lazy-loads `NewX` / `EditX` independently — no router changes needed.

```tsx
const NewInvoice = lazy(() => import('@/pages/NewInvoice'))
const EditInvoice = lazy(() => import('@/pages/EditInvoice'))
// ...
<Route path="/invoices/new" element={withBoundary(<NewInvoice />)} />
<Route path="/invoices/edit/:id" element={withBoundary(<EditInvoice />)} />
```

### 2.4 Mode Responsibilities

| Concern | `create` | `edit` |
|---------|----------|--------|
| Document number generation | Yes (query next number) | No (loaded from DB) |
| Route state prefills | Yes (project, client, import) | No |
| Data loading | No | Yes (by `:id` param) |
| Identity lock on client/number fields | No | Yes |
| Duplicate from editable | No | Yes |

## 3. Rules

1. **Orchestration lives in `*FormPage.tsx`** — save/load/redirect/prefix resolution/offline draft logic MUST NOT appear in `NewX.tsx` or `EditX.tsx`.
2. **`NewX.tsx` and `EditX.tsx` MUST be thin delegators** — exactly one import, one component call, no logic.
3. **Form UI is already shared** — `*FormPage.tsx` delegates rendering to a shared form component (e.g., `CsrFormScreen`, `SharedDocumentForm`). Only Letter currently renders its form UI inline in `LetterFormPage.tsx` — this is acceptable because the form UI is simple and mode branching is minimal.
4. **No CSS file changes** — the consolidation is structural, not visual.
5. **No route changes** — existing `/new` and `/edit/:id` routes remain unchanged.

## 4. Adding a New Document Module

When adding a new document type (e.g., `WaybillFormPage`):

1. Create `WaybillFormPage.tsx` with `mode: 'create' | 'edit'` prop
2. Create `NewWaybill.tsx` → `<WaybillFormPage mode="create" />`
3. Create `EditWaybill.tsx` → `<WaybillFormPage mode="edit" />`
4. Register lazy imports in `AppShell.tsx`
5. If the module already has separate `New`/`Edit` pages, consolidate them into the above pattern

## 5. Conformance

This standard is normative. All existing document form pages MUST conform. Any new document form page that does not follow this pattern will be rejected during code review.
