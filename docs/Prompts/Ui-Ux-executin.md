PR-X: ERP-Wide Operation Feedback & Loading UX Standardization

You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.

Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE

OpenCode has full repository access.

Read AGENTS.md immediately.

Load the relevant skills from "docs/PROJECTSKILLINDEX.md", especially those covering frontend UX, React architecture, asynchronous state management, and design system consistency.

====================================================================
A. CONTEXT & OBJECTIVE

BIGDROPS already contains nearly all of the infrastructure required for excellent loading feedback:

- Button loading state
- Feedback toast system
- Confirmation dialogs
- Page loading components

However, these primitives are inconsistently applied.

Many business operations appear frozen for several seconds before completing, especially:

- Convert Quotation → Invoice
- Convert BOQ/RFQ
- Archive
- Restore
- Delete
- Duplicate
- Save
- Upload
- Import
- Export
- PDF generation

The objective is not to build another loading system.

The objective is to standardize usage of the existing one across the application.

Users must always receive immediate confirmation that an action has started.

====================================================================
B. EXISTING INFRASTRUCTURE (USE THESE)

Already available:

• Button loading prop
"src/components/ui/button.tsx"

• ConfirmActionDialog loading support
"src/components/ConfirmActionDialog.tsx"

• feedback.loading()

• feedback.promise()

• feedback.success()

• feedback.error()

• App loading components

Do NOT introduce:

- new loading components
- new spinner systems
- duplicated loading implementations

Reuse existing infrastructure everywhere.

====================================================================
C. IMPLEMENTATION PLAN

---

Phase 1

Enhance:

"src/components/document-view/shared/DocumentConfirmDialog.tsx"

Add:

- loading prop
- loading button support
- disable cancel while loading

This immediately improves all document confirmation dialogs.

---

Phase 2

Audit every document action hook.

Examples include:

- useQuotationActions
- useInvoiceActions
- ViewCSR
- ViewWaybill
- ViewBOQ
- ViewRFQ

For every async business operation:

Add loading state if missing.

Wrap operations using existing loading infrastructure.

Prevent duplicate execution.

---

Phase 3

Wire loading state into UI.

Every button initiating long-running work should:

- display spinner
- display contextual loading label
- disable itself
- preserve width to prevent layout shift

Examples:

Creating Invoice...

Saving...

Generating PDF...

Uploading Logo...

Archiving...

Restoring...

Deleting...

Converting...

Importing...

Exporting...

Never use generic:

Loading...

Please Wait...

Processing...

Use action-specific language.

---

Phase 4

Review all document list pages.

Verify Archive/Delete/Duplicate loading.

Fill missing gaps only.

Do not rewrite existing working implementations.

---

Phase 5

Audit all major form pages.

Examples:

- Client
- Project
- RFQ
- CSR
- Waybill
- BOQ
- Banking
- Signatories
- Branding
- Notifications
- Compliance

Ensure Save buttons always communicate progress.

---

Phase 6

Standardize long-running operations.

For operations expected to exceed roughly one second:

Prefer

feedback.promise()

instead of manually managing loading/dismiss toasts.

Examples:

PDF generation

Imports

Exports

Large saves

Conversions

Uploads

Navigation-triggering operations

This provides:

Loading

↓

Success

↓

Error

using one consistent API.

====================================================================
D. UX STANDARD

Every long-running action must follow this lifecycle:

User Clicks

↓

Immediate acknowledgement

↓

Button enters loading state

↓

Optional application-level loading toast

↓

Operation completes

↓

Success or Error feedback

Never leave users wondering whether the application received their click.

====================================================================
E. INTERACTION RULES

While loading:

Disable:

- primary action
- duplicate triggers
- destructive confirmations
- cancel buttons when abandoning the operation could create inconsistent state

Prevent duplicate submissions.

Do not allow multiple conversions or saves to execute simultaneously.

====================================================================
F. DESIGN SYSTEM

Remain entirely within the BIGDROPS Clinical Design System.

Reuse:

- Button loading
- Feedback API
- Existing icons
- Existing typography
- Existing semantic tokens

Do not introduce:

- hardcoded colours
- new loading animations
- new spinner implementations
- inconsistent button styles

====================================================================
G. CONSTRAINTS

Preserve:

- business logic
- navigation
- validation
- permissions
- APIs
- Supabase integration
- document numbering
- audit behavior

This is strictly a UX feedback renovation.

No backend changes.

No schema changes.

No unrelated refactoring.

====================================================================
H. TARGET FILES

Primary:

- src/components/document-view/shared/DocumentConfirmDialog.tsx

Document actions:

- src/hooks/useQuotationActions.ts
- src/components/document-view/invoice/useInvoiceActions.ts
- src/pages/ViewQuotation.tsx
- src/pages/ViewInvoice.tsx
- src/pages/ViewCSR.tsx
- src/pages/ViewWaybill.tsx
- src/pages/ViewBoq.tsx
- src/pages/ViewRfq.tsx

List pages:

- QuotationList
- Invoice list
- BOQ list
- RFQ list
- CSR list
- Waybill list

Form pages:

Audit all major save flows and fill only missing loading states.

Settings:

Verify Branding, Banking, Notifications, Compliance, Signatories and other remaining settings panels for consistency.

====================================================================
I. REQUIRED VERIFICATION

Run:

- bun run typecheck

Run:

- git status

Run audit commands only if AGENTS.md requires them.

EXPLICITLY DO NOT RUN:

- bun run build

====================================================================
J. ACCEPTANCE CRITERIA

✓ No long-running business action appears unresponsive.

✓ Every async action immediately acknowledges user interaction.

✓ Loading buttons display contextual action labels.

✓ Duplicate submissions are prevented.

✓ Confirmation dialogs support loading.

✓ Existing Button and feedback infrastructure is reused.

✓ feedback.promise() is used where appropriate for long-running operations.

✓ Existing business behavior remains unchanged.

✓ No unnecessary files are modified.

✓ Typecheck passes.

✓ Changes are minimal, consistent, reusable, and backward compatible.