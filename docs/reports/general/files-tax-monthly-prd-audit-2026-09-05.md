# Files.tax Monthly Compliance Document PRD — Audit and Infrastructure Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Audit the existing notification, reminder, and dashboard infrastructure. Then write the Files.tax monthly compliance document PRD inside the existing Taxation Made Easy Engine PRD folder.

## Scope

- Audit six propagation channels with file and line evidence.
- Write `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md`.
- Extend the folder `Readme.md` in its existing format.
- No schema, migration, or application code changes.

## Baseline Git Status

Captured before any change:

```
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
M  src/pages/viewQuotationActions.ts
?? docs/Reports/general/invoice-to-quotation-revert-fix.md
?? supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
```

These are pre-existing changes from other agents. This task left them untouched.

## Files Changed

- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md` — created.
- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md` — extended.

## Skills Used

`writing-clearly-and-concisely`

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Step 1 — Propagation channel audit

Each channel was checked independently. Evidence is cited.

**a. Push notifications — EXISTS AND USABLE**

- `@capacitor/push-notifications@^8.0.3` is installed (`package.json`).
- Runtime mounted in `src/App.tsx` via `PushNotificationRuntime`.
- Token registration in `src/domain/notifications/pushRegistration.ts`, stored in `push_device_tokens`.
- Sender edge function `supabase/functions/dispatch-push-notifications/index.ts` sends via FCM.
- Android Firebase config present (`android/app/google-services.json`).
- Caveat: the client helper `sendPushForNotification` invokes a function named `send-push`, which does not exist in `supabase/functions/`. Only `dispatch-push-notifications` exists. The names must be aligned.

**b. In-app notification center — EXISTS AND USABLE**

- `notifications` table with `notification_preferences` and `push_delivery_logs` (migration `20260520090007_notifications.sql`).
- `NotificationBell`, `NotificationDrawer`, `NotificationItem` — mounted in `src/components/dashboard/DashboardOverview.tsx`.
- `RecentAlertsCarousel` renders the same notification feed on the dashboard.
- Toast system exists (`src/lib/feedback.ts`, goey-toast).

**c. Dashboard — EXISTS, WITH A CARD SLOTTING SYSTEM**

- `src/pages/DashboardRedesign.tsx` renders `DashboardOverview.tsx`.
- Shows KPI cards, alerts carousel, payment-reminder banner, recent documents, and activity.
- KPI cards are config-driven (`src/config/kpiCards.ts`): metric registry, default list, per-user storage key.
- A new tile can slot into the KPI registry or as a section beside `PaymentReminderBanner` / `RecentAlertsCarousel`.

**d. Email — DOES NOT EXIST**

- No SMTP configuration, no transactional email service, and no email template in `src/` or in the edge functions.

**e. Scheduled / cron — DOES NOT EXIST**

- `pg_cron` was added, then removed. Migration `20260903100000_pgrst_queue_not_cron.sql` records that `pg_net` is unavailable and that external cron provides server-side recovery.
- No scheduled edge function exists in `supabase/config.toml`.
- `dispatch-push-notifications` is a poll-style function with no scheduler attached.

**f. Compliance Hub — EXISTS**

- `src/pages/ComplianceHub.tsx` is implemented and routed at `/compliance` in `src/components/app/AppShell.tsx`.
- Panels: `VatInputsPanel`, `WhtReceiptsPanel`, `TaxFilingsPanel`, `TaxRemindersPanel`.
- Services in `src/modules/compliance/services/complianceService.ts`.

### Step 2 — Data mapping verification

Each mapping row was verified against current code. Two working assumptions were corrected:

- **Input VAT paid**: the table `tax_input_entries` is not unused. The Compliance Hub `VatInputsPanel` already consumes it via `fetchTaxInputEntries`.
- **Period**: period fields already exist in `tax_filings` and `tax_reminders` (`period_start`, `period_end`). Only the invoice-side monthly aggregation query is new.

The VAT return deadline at day 21 is confirmed from NTAA §22(1), gazette page A 278. The NTAA text is converted but not yet committed to `NRS-docs/`. The WHT remittance deadline is delegated to "regulations relating to deduction of tax at source" (NTAA §51(1), §51(9)) and stays pending.

### Step 3 — PRD and Readme

- Created `Files-tax-monthly-v1.md` with: objective and scope, consolidated open decisions, verified data mapping, propagation requirements per channel, a hard rule against fabricated values for the two blocked fields, and a build order ranked by readiness.
- Extended `Readme.md` in its existing format: new file-directory row, TL;DR summary, dependency note on `Technical-plan-v1.2.md`, and a dated Update Log row.

## Verification

- `bun run audit:load`: passed (exit 0; existing warnings present)
- `bun run typecheck`: passed
- `git status` after changes:

```
 M docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
 M src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/viewQuotationActions.ts
?? docs/Reports/general/invoice-to-quotation-revert-fix.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
?? supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
```

- `bun run build`: not run, per project hardware policy.

Scope check: the only task-caused changes are the new PRD file and the Readme edit. All other entries are pre-existing concurrent-agent changes. One new pre-existing change appeared during the session (`src/modules/invoices/services/invoiceConversionService.ts`); this task did not touch it.

## Risks or Limitations

- The NTAA 2025 text is not yet committed to `NRS-docs/`. The day-21 citation resolves only in the external conversion until it is committed.
- The push client invokes a function name that does not exist. The real dispatcher is named differently.
- The WHT remittance deadline depends on a subsidiary regulation that has not been located.
- `bun run typecheck` covers `src/`; it does not validate the new documentation files.

## Deferred Work

Channels marked DOES NOT EXIST in Step 1:

- **Email** — no outbound email mechanism exists. The project lead must decide whether to build one before or alongside this feature.
- **Scheduled / cron** — no active scheduler exists. The lead must choose a monthly trigger: client-side generation, external cron, or a Supabase scheduled function.

Additional deferred items:

- Commit the NTAA 2025 conversion to `NRS-docs/`.
- Source the WHT subsidiary regulation "regulations relating to deduction of tax at source".
- Align the push function name (`send-push` vs `dispatch-push-notifications`).