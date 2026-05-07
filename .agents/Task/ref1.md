Use skill at C:\Users\DELL\Desktop\bigdrops-app\skills\Karpathy
To execute this task:


Implement only the first safe consolidation slice.

Scope:
Create a frontend invoice payment module seam and route both payment UIs through it.

Files to create:
- src/modules/invoices/types/paymentTypes.ts
- src/modules/invoices/repositories/paymentRepository.ts
- src/modules/invoices/services/paymentService.ts

Files to edit:
- src/components/RecordPaymentModal.tsx
- src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx

Files to inspect if needed, but avoid broad edits:
- src/hooks/useInvoiceMutations.ts
- src/pages/viewInvoiceActions.ts
- src/lib/supabase.ts or current Supabase client file
- existing invoice/payment type definitions

Do not edit:
- backend/BigDrops.Api/*
- src/pages/ViewInvoice.tsx
- src/pages/ViewQuotation.tsx
- src/components/document/SharedDocumentForm.tsx
- RFQ, BOQ, CSR, waybill files
- database migrations

Goal:
Both payment UI surfaces must call the same invoice payment service instead of each owning payment persistence/status logic.

Implementation rules:
- Preserve current UI and behavior.
- Move Supabase payment writes into paymentRepository.
- Put workflow rules and payload normalization in paymentService.
- Keep React components responsible only for form state, submit handling, loading/error UI, and callbacks.
- Do not introduce new dependencies.
- Keep every new file under 550 lines.
- Prefer narrow functions over broad generic helpers.
- Do not change database schema.
- Do not add backend endpoints in this pass.

Expected service shape:
- recordInvoicePayment(input)
- voidInvoicePayment(input), only if existing UI currently supports voiding through this path
- refreshInvoicePaymentState(invoiceId), only if needed to preserve current behavior

Expected repository shape:
- insertPayment(payload)
- updateInvoicePaymentStatus(invoiceId, status/fields)
- fetchInvoicePaymentSummary(invoiceId), only if currently required
- updatePaymentVoidState(paymentId), only if currently required

After implementation:
Run:
- npm run audit:load
- npm run typecheck
- npm run lint
- npm run build

Output:
1. Summary of files changed
2. Exact behavior preserved
3. Any behavior intentionally not changed
4. Verification results
5. Follow-up recommendation for the backend/RPC financial boundary