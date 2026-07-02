# Bicolor Template — Header Missing Company Info

**Date Created:** 2026-06-24
**Status:** Open
**Severity:** Medium
**Component:** `src/components/waybill/BicolorTemplate.tsx`

## Description

The Bicolor waybill template header currently shows only the logo and document title. The company name, address, phone number, email, and tagline are not visible.

## Cause

A previous fix applied a `maxHeight: 42` constraint to the `bannerText` container to prevent header overflow beyond 4 lines. The constraint was applied too aggressively and truncated all text content, not just the overflow portion.

## Impact

- Generated Bicolor waybill PDFs do not show the issuing company identity in the header
- Visual identity is reduced to logo only
- Customers receiving the PDF cannot identify the source company from the header alone (they must look at the body or footer)

## Suggested Fix

Restore the company info text (name, address, phone, email, tagline) inside the header while preserving the 4-line height constraint. Likely approach:
- Reduce font size of address/contact lines
- Use tighter lineHeight values
- Possibly stack the logo above the text in a column layout instead of row

## Acceptance Criteria

- Bicolor template header shows: logo + company name + address + phone/email + tagline
- Header height does not exceed 42pt
- No truncation of any visible text

## Related Files

- `src/components/waybill/BicolorTemplate.tsx`
- `src/components/waybill/waybillUtils.ts` (template id: `bicolor`)
