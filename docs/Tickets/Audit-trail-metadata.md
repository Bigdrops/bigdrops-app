# Audit Trail Display & Metadata Enhancements

**Status:** Open  
**Priority:** Medium  
**Type:** Enhancement  
**Owner:** (unassigned)  
**Related:** docs/STANDARD/audit-trail-standard.md, docs/Reports/Audit-trail/

---

## Problem Statement

The audit trail system is functionally working (records and displays), but the display and metadata are incomplete:

1. **Payment recorded events lack detail** — only shows amount, missing payment mode, account, running balance, WHT
2. **Formatting is redundant** — displays `Amount: — → ₦X` with both dash and arrow; confusing
3. **Advance invoice mislabeled** — displays "created this invoice" instead of "created an advance invoice"

This is a display/UX issue, not a data integrity issue. The audit trail is durable and correct; it just isn't showing the full picture to users.

---

## Acceptance Criteria

### 1. Enhance Payment Event Metadata
When `record_payment_recorded` RPC writes to `activity_events`, include in the metadata JSONB:
- `payment_mode` (bank transfer, cash, cheque, etc.)
- `account_paid_to` (or account reference)
- `running_balance_after` (invoice balance remaining after this payment)
- `wht_amount` (if applicable)

**Current state:** metadata contains `{ amount, status, total }`  
**Target state:** metadata contains the above fields + existing ones

### 2. Fix Audit Display Formatting
In the ActivityCard/auditFormatters rendering logic, remove the dash (`—`) when displaying changes sourced from `activity_events` metadata.

**Current:** `Amount: — → ₦1,826,538,376.24`  
**Target:** `Amount → ₦1,826,538,376.24`

Or if showing a delta is important:
**Target:** `Amount: ₦0 → ₦1,826,538,376.24`

### 3. Label Advance Invoice Creation Distinctly
When an advance invoice is created (detected from metadata or a dedicated event type), the activity entry should read:
**Current:** `jaiyewisdom@gmail.com created this invoice`  
**Target:** `jaiyewisdom@gmail.com created an advance invoice`

This requires either:
- A new event type `ADVANCE_CREATED`, OR
- Detection of advance metadata in the CREATE event and conditional labeling in the UI

---

## Implementation Notes

- **Files likely to touch:** src/lib/audit.ts (enhance metadata in `record_payment_recorded`), src/domain/audit/auditFormatters.ts (formatting), src/hooks/useAuditTrail.ts or ActivityCard component (advance detection)
- **No schema changes required** — metadata is already JSONB, just needs richer content
- **No breaking changes** — existing rows stay as-is; only new payments/advances get the enhanced data
- **Verification:** Manual test of recording a payment, creating an advance, and viewing Activity & History to confirm labels and details appear

---

## Deferred / Out of Scope

- Retroactive enrichment of existing metadata rows (nice-to-have, not required)
- Changing the core audit system (this is display/UX only)