# Ledger Pagination Hardening

## Root Cause

Ledger's Page component lacked bottom padding, allowing body content to flow into the absolute-positioned footer zone on multi-page documents.

### Comparative Analysis

| Property | Industry (working) | Ledger (broken) |
|---|---|---|
| Page `paddingBottom` | `64` | `0` (via `padding: 0`) |
| Footer positioning | `position: absolute; bottom: 14` | `position: absolute; bottom: 0` |
| Footer height | ~50pt | ~53pt |
| Inner container `paddingBottom` | — (no wrapping container) | `60` |

**Mechanism:** React-PDF paginates content against the **Page's padded boundary**, not interior View padding. Industry's `paddingBottom: 64` creates a true reservation zone at the page bottom where flowing content cannot enter. Ledger's `padding: 0` meant content filled the full page, and the absolute footer at `bottom: 0` overlapped with the content region. The `invoiceContainer`'s `paddingBottom: 60` was irrelevant for pagination boundaries — React-PDF doesn't respect interior View padding for page-breaking decisions.

## Fix

Two changes to `src/components/pdf-new/templates/LedgerStyles.ts` only:

### 1. Page — add footer reservation zone
```
-    padding: 0,
+    paddingTop: 0,
+    paddingHorizontal: 0,
+    paddingBottom: 55,
```
Replaced `padding: 0` with explicit paddings plus `paddingBottom: 55`. The 55pt value matches the footer's height (~53pt estimated: `24pt bottom padding + ~12pt text + 16pt top padding + 1pt border`) with a 2pt safety buffer.

### 2. invoiceContainer — offset reduction
```
-    paddingBottom: 60,
+    paddingBottom: 5,
```
Reduced from 60 to 5 to preserve the original visual gap. The total distance from last content element to page bottom remains 60pt (55pt page padding + 5pt container inner padding = 60pt).

## Verification

- `bun run audit:load` — passes, no new warnings
- `bun run typecheck` — passes, no type errors
- `bun run build` — pre-existing timeout (unrelated to these changes)

## Design Decisions

- **No new files created.** Both edits are in the single stylesheet. No `pageConstants.ts` was needed — there is no duplication to extract (Industry uses `64`, Ledger needs `55` — different layouts, different values).
- **No template JSX changes.** The fix is purely stylistic. `Ledger.tsx` is untouched.
- **Preserves original visual appearance.** The total bottom gap (last content → page edge) remains 60pt, identical to the original. No excessive whitespace added.
- **Minimal footprint.** Two value changes, net −4 lines of code.
