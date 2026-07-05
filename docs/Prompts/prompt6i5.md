You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================

Read AGENTS.md first and follow it completely.

Load the required skills:
- Karpathy
- supabase-postgres-best-practices

====================================================================
CONTEXT
====================================================================

Financial Operations Phase 2.1 introduced a Compliance Service/Repository layer.

Phase 2.2 introduced the Reporting Projection Layer.

Phase 1 already persists:

- payments.wht_amount
- payments.wht_rate
- payments.wht_type

The remaining manual step in the WHT evidence chain is creating the draft WHT receipt after a payment containing WHT has been recorded.

The business already supports manual WHT receipt creation.

This task only automates that existing manual action.

No UI changes.
No workflow changes.
No business rule changes.

====================================================================
OBJECTIVE
====================================================================

Automatically create a draft WHT receipt after a successful payment recording whenever:

    wht_amount > 0

The payment flow must remain authoritative.

Receipt creation is best-effort only.

Failure to create a receipt must never fail payment recording.

====================================================================
TARGET FILES
====================================================================

Read:

- src/modules/invoices/services/paymentService.ts
- src/modules/compliance/services/complianceService.ts
- src/modules/compliance/repositories/complianceRepository.ts
- src/domain/compliance/types.ts
- src/components/compliance/WhtReceiptsPanel.tsx

Modify only:

- src/modules/compliance/services/complianceService.ts
- src/modules/invoices/services/paymentService.ts

Do not modify:

- paymentRepository.ts
- audit.ts
- Calculations.ts
- database migrations
- SQL views
- UI components

====================================================================
TASK 1
Compliance Service Automation
====================================================================

Add:

autoCreateWhtReceiptDraft(...)

Responsibilities:

- accept:
    paymentId
    invoiceId
    whtAmount
    whtRate
    whtType

- build the same draft receipt structure currently created manually

- delegate persistence to the existing Compliance Repository

- status must be:

    pending

The function should contain no UI logic.

====================================================================
TASK 2
Idempotency
====================================================================

First inspect the existing schema.

If a UNIQUE constraint already guarantees one receipt per payment:

- safely treat duplicate insert attempts as a no-op.

Otherwise:

- perform an existence check before inserting.

Do not introduce new migrations.

Duplicate receipt creation must never throw into the payment pipeline.

====================================================================
TASK 3
Hook into Payment Flow
====================================================================

After all existing payment work completes successfully:

- payment insert
- audit recording
- invoice status synchronization

trigger:

autoCreateWhtReceiptDraft()

ONLY when:

wht_amount > 0

The automation must be:

- fire-and-forget
- non-blocking

Never await it.

Never delay payment completion.

If automation fails:

- log the error
- preserve existing payment success

====================================================================
PRESERVE EXISTING BEHAVIOUR
====================================================================

Do not change:

- payment validation
- payment UI
- loading states
- audit behaviour
- invoice status synchronization
- manual WHT receipt creation
- Calculation Engine
- Financial State

====================================================================
CONSTRAINTS
====================================================================

Keep changes minimal.

Do not introduce new abstractions.

Reuse the Compliance Service and Repository added during Phase 2.1.

====================================================================
REQUIRED VERIFICATION
====================================================================

Run:

- bun run audit:load
- bun run typecheck
- git status

Do NOT run:

- bun run build

Manual verification:

1. Record payment with WHT.
   Draft receipt should automatically appear.

2. Record payment without WHT.
   No receipt should be created.

3. Attempt duplicate automation.
   Confirm idempotent behaviour.

4. Confirm manual receipt creation still behaves exactly as before.

====================================================================
OUTPUT
====================================================================

Save:

docs/Reports/FinancialOperations/phase-2-3-wht-auto-receipt-report.md

Include:

- Summary
- Files modified
- Idempotency strategy
- Verification
- Deferred work

====================================================================
SUCCESS CRITERIA
====================================================================

A payment containing WHT automatically creates one pending WHT receipt through the Compliance Service without changing payment behaviour, UI behaviour, audit behaviour, or financial calculations.