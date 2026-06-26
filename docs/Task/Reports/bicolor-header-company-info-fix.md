# Fix: Bicolor Template Header — Company Info Missing

**Date:** 2026-06-26
**Status:** Resolved
**Severity:** Medium
**Component:** `src/components/waybill/BicolorTemplate.tsx`

## Problem

The Bicolor waybill template header only showed the logo and document title. Company name, address, phone, email, and tagline were completely invisible — clipped by an overly aggressive height constraint.

## Root Cause

A previous fix added `maxHeight: 42` and `overflow: 'hidden'` to the `bannerText` style to prevent header overflow. This clipped all text content (company name, address, phone, tagline) rather than just the overflow portion.

## Fix Applied

Removed `maxHeight: 42` and `overflow: 'hidden'` from the `bannerText` style in `BicolorTemplate.tsx:55-59`. No other changes made.

### Before

```typescript
bannerText: {
  flex: 1,
  maxHeight: 42,
  overflow: 'hidden',
},
```

### After

```typescript
bannerText: {
  flex: 1,
},
```

## Verification

- `bun run typecheck` — passed (no errors)
- `bun run lint` — timed out on full project (expected for large codebase); change is two property removals only
- Manual PDF generation: header now renders company name, address, phone, email, and tagline
- Logo and document title remain visible
- No other templates or styles modified

## Files Changed

- `src/components/waybill/BicolorTemplate.tsx` — removed 2 style properties from `bannerText`

## Related

- Ticket: `docs/Task/Tickets/bicolor-header-missing-company-info.md`
