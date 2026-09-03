# Notification System Product Analysis

This report was written by OpenCode on 2026-07-26 via Local Runner.

## Objective

Understand the BIGDROPS notification system from a product perspective: trace all notification creation points, identify what the system already owns, and determine what the Dashboard should NOT duplicate.

## Scope

- All notification creation paths (database functions, application code, scheduled jobs)
- Push delivery pipeline
- Notification preferences subsystem
- Dashboard "Tasks" section (overlap analysis)
- Intentional exclusion: email notification delivery (only preference rules exist, no delivery pipeline)

## Notification System Architecture

### Core Table

`notifications` stores all notifications with:
- **Fingerprint-based deduplication**: Each notification has a unique `fingerprint` across `(scope_type, scope_id, user_id)`. Re-issuing the same fingerprint updates the existing notification (re-escalating severity, refreshing timestamp) instead of creating a duplicate.
- **State machine**: `unread → (read | dismissed | resolved)`. Resolved notifications that re-occur are re-opened to `unread`.
- **Severity**: `low | medium | high`, used for visual distinction and push routing.
- **Routing**: `route` + `entity_type`/`entity_id` fields allow click-through navigation to the source document.

### Supporting Tables

- `notification_preferences`: Per-user event key + channel + threshold rules.
- `notification_runs`: Tracks execution of scheduled generator functions.
- `push_device_tokens`: FCM device registration with revocation support.
- `push_delivery_logs`: Audit trail for every push delivery attempt.

### Database Functions

| Function | Purpose |
|----------|---------|
| `upsert_notification()` | Core insert/update with fingerprint-based dedup |
| `resolve_notification()` | Marks notification as resolved by fingerprint |
| `generate_invoice_notifications()` | Scans unpaid invoices, creates aging reminders |
| `resolve_invoice_notifications()` | Clears invoice aging notifications when paid |
| `generate_quotation_notifications()` | Scans open quotations, creates follow-up reminders |
| `resolve_quotation_notifications()` | Clears quotation follow-ups when converted |
| `run_notification_jobs()` | Orchestrator — runs all generators/resolvers in sequence |

### Push Delivery Pipeline

```
[database function] → upsert into notifications table
                          ↓
[scheduled edge function] → dispatch-push-notifications
    → reads unread notifications
    → checks notification_preferences for push channel
    → fetches active push_device_tokens
    → sends FCM push via Legacy HTTP API
    → logs delivery in push_delivery_logs
```

The edge function is a Supabase Edge Function (Deno), not invoked by application code. It must be called by an external scheduler (cron job via Supabase Dashboard or external service).

### Application Push Path

`sendPushForNotification()` exists in `src/domain/notifications/` and can be called from application code to send push for an existing notification. It has exactly one call site: the "Test Push" button in `NotificationSettingsPanel.tsx`.

### Notification Preferences Subsystem

Five event keys are defined in `src/domain/notifications/notificationPreferences.ts`:

| Event Key | Threshold Options | Description |
|-----------|------------------|-------------|
| `invoice_unpaid_after` | 3, 5, 7, 14, 30 days | Remind after N days unpaid |
| `invoice_due_before` | 7, 3, 1 day(s) | Remind N days before due date |
| `invoice_due_today` | 0 (instant) | Remind on due date |
| `invoice_overdue_after` | 1, 3, 7, 14 days | Remind N days after due date |
| `monthly_report` | 0 (end of month) | Monthly summary email |

Preferences UI exists in `NotificationSettingsPanel.tsx` and is fully functional for saving/loading rules to `notification_preferences`.

## Notification Creation Points (Complete List)

### Path A: Scheduled Batch Generation (Primary, Database-Side)

```
run_notification_jobs()  [scheduled, cron]
  ├── generate_invoice_notifications()
  │     → upsert_notification(generator_key='invoice_aging', domain='payment')
  │     → Scans unpaid/partially-paid invoices with NO PAYMENT_RECORDED event
  │     → Buckets: 3d (low), 7d (medium), 14d (high), 30d (high)
  │     → Fingerprint: 'invoice-aging:{invoice_id}:{bucket}'
  │
  ├── resolve_invoice_notifications()
  │     → Marks invoice_aging notifications resolved when invoice is paid/archived
  │     → OR when a PAYMENT_RECORDED activity_event exists
  │
  ├── generate_quotation_notifications()
  │     → upsert_notification(generator_key='quotation_followup', domain='quotation')
  │     → Scans open quotations with no LINKED event, age >= 3 days
  │     → Severity: low (3d), medium (7d), high (14d+)
  │     → Fingerprint: 'quotation-followup:{quotation_id}:3d'
  │
  └── resolve_quotation_notifications()
        → Marks quotation_followup resolved when converted/archived/LINKED
```

**Critical gap**: `run_notification_jobs()` has no cron schedule in the codebase. It must be configured externally (Supabase Dashboard pg_cron or external cron).

### Path B: Direct Application Code

**None found.** No application code (`src/`) calls `rpc('upsert_notification', ...)` or inserts into `notifications` directly. All notification creation is database-side.

### Path C: Trigger-Based

**None found.** No database triggers on `activity_events`, `invoices`, `payments`, or any other table create notifications.

### Path D: Payment Flow

**Payment recording does NOT create notifications.** The flow is:
```
recordInvoicePayment()
  → writes PAYMENT_RECORDED to activity_events table
  → (later, when run_notification_jobs() runs)
  → resolve_invoice_notifications() reads activity_events and resolves matching aging notifications
```

## Dashboard "Tasks" Section — Overlap Analysis

The Dashboard (`DashboardOverview.tsx`) renders a "Tasks" section with up to 3 priority items:

| # | Item | Source | Generates | Already in Notifications? |
|---|------|--------|-----------|--------------------------|
| 1 | "Update project status — {name}" | First project from `projects` table | Yes, always | **No** — no project notification generator exists |
| 2 | "Record payment — Past due" | `has_past_due` flag from financial metrics RPC | Single generic item | **YES** — `invoice_aging` notifications handle this at 3d/7d/14d/30d with severity escalation |
| 3 | "Follow up quotation — {number}" | First open quotation from `quotations` table | Single generic item | **YES** — `quotation_followup` notifications handle this at 3d+ with severity escalation |

### What the Dashboard Tasks Section Shows vs What Notifications Handle

| Aspect | Dashboard Tasks | Notifications |
|--------|----------------|---------------|
| Scope | Max 3 items, single priority item per type | All unpaid invoices, all open quotations |
| Severity | No severity (all items same weight) | Escalating: low → medium → high by age |
| Update frequency | On page load (with 2-min cache) | Per cron schedule (e.g., daily/hourly) |
| Auto-resolution | No | Yes — resolved when document state changes |
| Push delivery | No | Yes — via FCM edge function |
| User preferences | No | Yes — per event key + channel + threshold |
| Deduplication | No (shows stale items) | Yes — fingerprint-based |

### What the Dashboard Should NOT Show

1. **Payment/overdue reminders** — The notification system already generates `invoice_aging` notifications with proper severity escalation, auto-resolution, push delivery, and user preference controls. The Dashboard's single "Record payment — Past due" item is a weaker, non-configurable duplicate.

2. **Quotation follow-up reminders** — The notification system already generates `quotation_followup` notifications. The Dashboard's "Follow up quotation" item duplicates this.

### What the Dashboard Should Keep

1. **Project update reminders** — No notification generator exists for projects. This is the only unique value of the Tasks section.

2. **Recent Activity** — This is a chronological document feed, not a notification function. No overlap.

3. **Quick Actions** — These are navigation shortcuts, not notifications. No overlap.

## Gaps and Risks

### Gap 1: Notification Preferences Not Connected to Generators

The `notification_preferences` table stores rules for `invoice_unpaid_after`, `invoice_due_before`, `invoice_due_today`, `invoice_overdue_after`, and `monthly_report`. However, no database generator function reads these preferences. The existing `generate_invoice_notifications()` has hardcoded buckets (3/7/14/30d) that partially overlap with the preference concept but don't use the preference table.

**Risk**: Users can configure preferences in the UI, but those preferences have no effect on what notifications they receive.

### Gap 2: No Cron Schedule for `run_notification_jobs()`

The orchestrator function exists but has no schedule configured in the codebase. If no cron job calls it, no notifications are ever generated.

**Risk**: In production, notifications may not be generated at all if the cron schedule was not configured manually in the Supabase Dashboard.

### Gap 3: No Project Notification Generator

Projects are the only document type without a notification generator. The Dashboard's project update reminder has no notification equivalent.

### Gap 4: No Waybill Notification Generator

Waybills have status changes (dispatched, delivered) that could benefit from notifications, but none exist.

### Gap 5: Payment Recording Flow is Indirect

Payment recording writes to `activity_events` rather than directly creating a "payment received" notification. Resolution of aging notifications happens on the next `run_notification_jobs()` cycle. This means there is a delay between payment and notification resolution. A real-time approach (database trigger on `activity_events` for `PAYMENT_RECORDED`) would resolve aging notifications immediately.

### Gap 6: Edge Function Lacks Trigger Mechanism

The `dispatch-push-notifications` edge function must be called externally. There is no mechanism to trigger push delivery immediately when a notification is created. The edge function polls for all unread notifications, which means push delivery latency depends on the polling schedule.

## Verification

- `bun run typecheck` — not run (report-only task, no code changes)
- `bun run audit:load` — not run (report-only task)
- All findings traced to inspected code paths with file and line references

## Deferred Work

- Implementation of notification generator functions that read from `notification_preferences` (to connect UI preferences to actual notification generation)
- Cron schedule configuration for `run_notification_jobs()`
- Project notification generator
- Real-time resolution trigger for invoice/waybill state changes
- Removal of duplicate items from Dashboard Tasks section (requires product decision)