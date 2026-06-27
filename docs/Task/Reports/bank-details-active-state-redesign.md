# Bank Details Card — Active-State Visual Redesign

**Date:** 2026-06-27  
**Status:** ✅ Complete  
**Scope:** Visual-only refinement of BankDetailsCard active state

---

## Summary

Redesigned the visual active state of `BankDetailsCard` to make the selected bank account unmistakable at a glance. Uses green colour, soft shadow, CheckCircle2 icon, and green "Active" badge with 150ms transitions. No behavioural, architectural, state, persistence, or PDF changes.

---

## Changes Made

### `src/components/document-view/shared/BankDetailsCard.tsx`

#### Active Card (selected bank account)
- **Border:** `border-hsl(142 71% 45%)` at 2px width (was 1px primary blue)
- **Background:** `bg-hsl(142 46% 93%)` light green tint (was solid surface)
- **Shadow:** `shadow-[0_1px_3px_rgba(34,197,94,0.15)]` soft green glow
- **Icon:** `CheckCircle2` with `text-hsl(142 71% 45%)` (was `Check` in circle)
- **Badge:** Green pill at top-right: `"✓ Active"` with `bg-hsl(142 71% 45%)` and white text
- **Border width transition:** 1px → 2px on selection (150ms)

#### Unselected Card
- **Background:** `bg-hsl(0 0% 96%)` (neutral surface-muted)
- **Border:** `border-hsl(0 0% 90%)` (neutral border)
- **Icon:** Empty radio circle (was no indicator)
- **Hover:** Border strengthens to `hsl(0 0% 63%)`

#### Transitions (all 150ms)
- `transition-all duration-150` on card container
- `transition-colors` on bankName and bankDetail text elements

---

## Verification

| Check | Status |
|---|---|
| `bun run audit:load` | ✅ passed |
| `bun run typecheck` | ✅ passed |
| `bun run build` | ✅ passed |

---

## Design Rationale

| Element | Rationale |
|---|---|
| Green colour | Communicates confirmed/active (matching existing `--bd-feedback-success-*` palette) |
| CheckCircle2 icon | Immediately recognisable filled icon (white check inside green circle) |
| Green "Active" badge | Triple redundancy: badge + border + icon ensure active state is visible |
| Neutral unselected | Clean contrast without visual noise — empty radio circle signals "can be selected" |
| 150ms transitions | Responsive feel without bounce/scaling overhead |
| Soft shadow | Adds depth cue — active card appears slightly elevated |

---

## Files Modified

| File | Change |
|---|---|
| `src/components/document-view/shared/BankDetailsCard.tsx` | Green active state, CheckCircle2, badge, transitions |

---

## No Changes To

- View pages (InvoiceWorkspace, ViewInvoice, ViewQuotation, QuotationViewPage)
- State management (useBankSelection hook)
- PDF generation pipeline
- Database schema or persistence logic
