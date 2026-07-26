# Notification, Toast & Dashboard System Investigation

This report was written by OpenCode on 2026-07-26 via Local Runner.

## Objective & Scope

**Covered:** All notification components, hooks, domain logic, push registration/delivery, toast/feedback system, dashboard integration points in the BIGDROPS app.

**Excluded:** Email template rendering, Supabase Edge Function internals (`send-push`), database RLS policies, dashboard financial calculations.

---

## 1. Notification Hub (In-App)

### Architecture

React hooks + Supabase query-on-open pattern. No persistent global state.

```
NotificationBell
  -> useNotifications() -> supabase.from('notifications').select().limit(30).order('created_at', desc)
  -> NotificationDrawer -> NotificationItem
```

### Key Files

| File | Lines | Role |
|------|-------|------|
| `src/hooks/useNotifications.ts` | 146 | Fetch, markRead, markAllRead with optimistic updates |
| `src/components/notifications/NotificationBell.tsx` | 68 | Bell icon + unread badge, triggers drawer |
| `src/components/notifications/NotificationDrawer.tsx` | 122 | Sheet-based list with loading/empty/error states |
| `src/components/notifications/NotificationItem.tsx` | 78 | Single notification row with icon, time, route |
| `src/domain/notifications/notificationRoutes.ts` | 32 | Maps entity_type -> frontend route |

### Behaviors

- Fetches up to 30 notifications, newest first.
- Optimistic mark-as-read. Falls back to full refresh if DB update fails.
- `isNotificationUnread()` check: `!read_at && !dismissed_at && state !== 'resolved'`.
- `getNotificationRoute()` maps `invoice` -> `/invoices/:id`, `waybill` -> `/waybills/:id`, etc.

### Gaps

- **No real-time subscription.** Relies on manual refresh when drawer opens. Unread badge does not update unless user opens the drawer.
- **No pagination.** Hard limit of 30 — no "load more".

---

## 2. Push Notifications

### Client Registration

| File | Lines | Role |
|------|-------|------|
| `src/components/notifications/PushNotificationRuntime.tsx` | 25 | Zero-render component inside router context |
| `src/hooks/usePushNotifications.ts` | 64 | Capacitor permission -> register -> listeners |
| `src/domain/notifications/pushRegistration.ts` | 34 | Upserts device tokens to `push_device_tokens` |

Flow: `PushNotificationRuntime` calls `usePushNotifications(userId)` which:
1. Checks `Capacitor.isNativePlatform()`
2. Requests permission
3. Registers via `PushNotifications.register()`
4. Saves token via `registerPushToken()`
5. Listens for `pushNotificationActionPerformed` to route navigation

### Server Send

| File | Lines | Role |
|------|-------|------|
| `src/domain/notifications/sendPushForNotification.ts` | 75 | Fetch tokens -> invoke edge function -> log delivery |

Design is async fire-and-forget. Calls `supabase.functions.invoke('send-push')` and writes to `push_delivery_logs`.

### Gaps

- **No registration retry.** If token upsert fails, the device is silently unregistered.
- **No token invalidation.** Stale tokens are not cleaned up.

---

## 3. Notification Preferences

| File | Lines | Role |
|------|-------|------|
| `src/hooks/useNotificationPreferences.ts` | 138 | Load/save preferences, diff calculation |
| `src/domain/notifications/notificationPreferences.ts` | 176 | UI state <-> DB row transforms |
| `src/components/notifications/settings/NotificationSettingsPanel.tsx` | 403 | Full settings panel with test push |
| `src/components/notifications/settings/NotificationChannelToggles.tsx` | 43 | Channel toggle switches |

### Event Types

`invoice_unpaid_after`, `invoice_due_before`, `invoice_due_today`, `invoice_overdue_after`, `monthly_report`

### Channels

`in_app`, `push`, `email` (invoice alerts: `in_app` + `push` only)

### Storage

`notification_preferences` table — one row per `(user_id, event_key, threshold_days, channel)` -> `enabled`.

### Key Functions

- `buildNotificationPreferenceRules()` — flattens UI state into DB rows
- `deriveNotificationPreferenceState()` — merges DB rows into UI state
- `normalizeThresholdDays()` — deduplicates, sorts, filters positive integers

### Gaps

- Upsert with `onConflict` has no ordering guarantee. Race condition possible under concurrent writes.

---

## 4. Toast / Feedback System

Status: **MIGRATED** from shadcn toast to `goey-toast` library.

### Layer Cake

| Layer | File | Role |
|-------|------|------|
| Core | `src/lib/feedback.ts` (285 lines) | Central API: `success`, `error`, `warning`, `info`, `loading`, `promise`, `dismiss` |
| Shim | `src/hooks/use-toast.ts` (59 lines) | Deprecated shadcn-compatible proxy over `feedback` |
| Render | `src/components/ui/toaster.tsx` (29 lines) | Renders `<GoeyToaster position="top-center" visibleToasts={3} maxQueue={6}>` |
| Dead | `src/components/ui/toast.tsx` (37 lines) | Deprecated shim exports |

### Feedback API

```ts
feedback.success('Saved')
feedback.error(error)    // normalizes via normalizeError(), renders ExpandableErrorDetails
feedback.promise(promise, { loading, success, error })
feedback.loading('Saving...')
feedback.dismiss()
```

### Gaps

- `toast.tsx` is dead code if nothing imports it. Should verify and delete.

---

## 5. Dashboard Integration

| File | Lines | Role |
|------|-------|------|
| `src/pages/DashboardRedesign.tsx` | — | Page wrapper |
| `src/components/dashboard/DashboardOverview.tsx` | 385 | Mobile-first dashboard |
| `src/components/dashboard/DashboardDesktopView.tsx` | 252 | Desktop dashboard |
| `src/hooks/useDashboardData.ts` | 551 | Dashboard data with 2-min cache |

Both dashboards render `NotificationBell` independently:
- `DashboardOverview.tsx:219` -> `<NotificationBell className="h-8 w-8" />`
- `DashboardDesktopView.tsx:87` -> `<NotificationBell className="h-9 w-9" />`

The bell uses its own `useNotifications()` — independent of dashboard data loading.

---

## 6. Database Tables (from code references)

| Table | Purpose | Referenced In |
|-------|---------|---------------|
| `notifications` | In-app notification rows | `useNotifications.ts` |
| `notification_preferences` | Per-user preference rules | `useNotificationPreferences.ts` |
| `push_device_tokens` | Registered push devices | `pushRegistration.ts`, `sendPushForNotification.ts` |
| `push_delivery_logs` | Push send audit trail | `sendPushForNotification.ts` |
| `invoice_financials_v` | Dashboard summary metrics (view) | `useDashboardData.ts` |

---

## 7. Identified Gaps & Risks

1. **No real-time notifications.** `useNotifications` polls on mount/open only. Supabase Realtime is not used.
2. **No pagination.** Hard 30-item limit.
3. **Push token registration is fire-and-forget.** No retry on failure. No stale token cleanup.
4. **Optimistic update risk.** `markRead` assumes `refresh()` can roll back. If `refresh` itself fails, UI state diverges from DB.
5. **Race condition in preference upsert.** No ordering guarantee in `onConflict` upsert.
6. **Deprecated toast code.** `toast.tsx` may be deletable — needs import check.
7. **No test coverage.** No tests for `useNotifications`, `useNotificationPreferences`, or `feedback.ts`.
8. **No subagent delegation was used.** This investigation was done generically. A `backend-architect` or `frontend-developer` subagent may produce deeper findings if re-run.

---

## 8. Verification Gate

- `bun run typecheck`: NOT RUN (read-only investigation)
- `bun run audit:load`: NOT RUN
- `bun run build`: SKIPPED (per AGENTS.md §3 hardware policy)

---

## 9. Deferred Work

- Check if `toast.tsx` imports are still used anywhere
- Add real-time subscription to `useNotifications`
- Add pagination to notification list
- Add push token cleanup/retry logic
- Write tests for notification hooks