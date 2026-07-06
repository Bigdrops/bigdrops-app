Document Save Orchestration Standard — v1.0

This standard defines the generic save lifecycle for ALL document types: Invoice,
Quotation, Waybill, CSR, BOQ, RFQ.

---

1. Purpose

Every document type performs the same save orchestration:
1. Validate user input
2. Build a persistence payload
3. Write to Supabase (create or update)
4. Persist child rows (items, line items, etc.)
5. Record an audit trail
6. Navigate to the document view

useDocumentSave centralises this lifecycle so new document types never
duplicate Supabase error handling, saving-state management, save-timer
lifecycle, or navigation boilerplate.

---

2. The Strategy Interface

File: src/hooks/useDocumentSave.ts

```
DocumentSaveStrategy<TInput> {
  validate?(input: TInput): Promise<ValidationResult | null> | ValidationResult | null
  buildPayload(input: TInput, ctx: { status: string }): any
  persist(input: TInput, payload: any, ctx: { isCreate: boolean; isEdit: boolean; id?: string }): Promise<{ data: any; error: any }>
  afterSave?(input: TInput, ctx: { effectiveId: string; isCreate: boolean; createResult?: any }): Promise<void>
  getNavigationTarget(effectiveId: string): string
}
```

2.1 validate (optional)

Called first. Return null or { valid: true } to proceed. Return
{ valid: false, error, errorDescription } to show an error and abort.

Use for: client-selection checks, item-validity checks, identity-immutability
checks, project-assignment validation.

On failure: the hook shows feedback.error() and does NOT call setSaving(true).

2.2 buildPayload

Synchronous map from TInput to a plain object that will be passed to
persist() as the row payload.

Receives ctx.status — the save status string from the UI (e.g. "unpaid",
"draft", "sent").

Must NOT perform async work (use validate or afterSave for that).

Must NOT call computeDocument or any financial-calculation pipeline. The
strategy receives pre-computed totals from the caller.

2.3 persist

Executes the Supabase insert or update.

For create flows: the strategy owns numbering (withUniqueRetry, prefix
resolution, sequence generation).

Return shape: { data: any, error: any }.
· On create success: data must contain the inserted row (id is read from
  data.id).
· On update success: data may be null; id is read from ctx.id.
· On error: the hook calls feedback.error() and aborts navigation.

2.4 afterSave (optional)

Called after a successful persist.

Use for: persisting child rows (items), recording audit logs, triggering
post-save side-effects.

If this method throws, the hook calls setSaving(false) and DOES NOT
navigate. This preserves the "items-failed → don't leave the form"
behaviour.

2.5 getNavigationTarget

Returns the URL path to navigate to after a successful save. Called after
afterSave completes (or immediately if afterSave is not defined).

---

3. Lifecycle (exact order)

```
┌─ validate ──────────────┐  optional; abort on { valid: false }
├─ setSaving(true) ───────┤  owned by the hook
├─ createSaveTimer ───────┤  owned by the hook
├─ buildPayload ──────────┤  synchronous
├─ persist ───────────────┤  async; withUniqueRetry in create
├─ afterSave ─────────────┤  optional; throw to abort navigation
├─ setSaving(false) ──────┤  owned by the hook
├─ navigate ──────────────┤  owned by the hook
└─ timer.finish ──────────┤  owned by the hook
```

---

4. Creating a Strategy for a New Document Type

4.1 Define TInput

Create an interface that carries every value the strategy needs:
form fields, items, computed totals, metadata, UI callbacks.

```
interface UseXxxSaveParams {
  document: XxxFormFields
  items: XxxItem[]
  documentTotals: DocumentTotals
  isCreate: boolean
  isEdit: boolean
  id: string | undefined
  navigate: (path: string) => void
  // … other fields
}
```

4.2 Write the Strategy Object

Use module-level variables for data shared between strategy methods
(e.g. validated project, computed audit snapshot).

```
let _validatedResource: any = null

const xxxStrategy: DocumentSaveStrategy<UseXxxSaveParams> = {
  async validate(input) { … },
  buildPayload(input, ctx) { … },
  async persist(input, payload, ctx) { … },
  async afterSave(input, ctx) { … },
  getNavigationTarget(id) { return '/xxx/' + id },
}
```

4.3 Create the Hook Wrapper

```
export function useXxxSave(params: UseXxxSaveParams) {
  return useDocumentSave({
    input: params,
    strategy: xxxStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
```

Callers receive { save, saving } — identical API across all document types.

---

5. Rules

5.1 No Financial Logic

Strategies must not import or call computeDocument, calcTotals, or
resolveRowVat. Financial calculation is the exclusive domain of
src/lib/Calculations.ts. Strategies receive pre-computed totals from the
caller.

5.2 No Invoice-Specific Code in the Core Hook

useDocumentSave contains zero business logic. All document-type behaviour
lives in strategy objects.

5.3 Error Handling Convention

· Validation errors → strategy.validate returns { valid: false, … }.
· Persistence errors → strategy.persist returns { error: … }.
· Item/child-row errors → strategy.afterSave throws.
The core hook handles feedback and saving-state transitions.

5.4 save Timing

The core hook creates one top-level timer per save call. Strategies that
need sub-phase granularity may create their own timer instances inside
buildPayload or afterSave — the timer utility is side-effect-free
(no logging, no persistence).

5.5 Identity Immutability

Saved-document identity checks (client, number, lineage) belong in
strategy.validate. The strategy holds a reference to the initial snapshot
via TInput.

---

6. Current Implementations

· src/hooks/useInvoiceSave.ts — Invoice save strategy.
· (New document types add their own strategy files in src/hooks/.)
