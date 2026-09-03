# Layout Immersive Mode Header Fix

This report was written by MiMoCode on 2026-07-10 via Local Runner.

---

## 1. Objective

Resolve a high-priority layout boundary regression where Document Form pages (Quotation, Invoice, CSR, RFQ, BOQ) inherited the Dashboard Layout shell — specifically the mobile `MobilePageHeader` (hamburger menu) and desktop page header bar — despite using `<Layout immersive>`.

## 2. Scope

- **Covered:** `src/components/Layout.tsx` (immersive prop gating), `src/pages/QuotationFormPage.tsx` (hidePageHeader consistency).
- **Intentionally excluded:** View pages (`DocumentPage`), Waybill form pages (no Layout wrapper), list pages, Dashboard page.

## 3. Root Cause Analysis

### 3.1 Layout.tsx — Immersive Incomplete

The `immersive` prop in `Layout.tsx` (line 69–77) was defined to hide `DesktopSidebar` and `MobileBottomNav`, but the mobile header block (lines 189–213) and desktop header block (lines 216–224) were **not gated by `immersive`**. They only checked `isHome`, `hideMobileHomeHeader`, and `hidePageHeader`.

Result: Form pages using `<Layout immersive>` still rendered:
- **Mobile:** `MobilePageHeader` with hamburger menu (when `!isHome && !hidePageHeader`)
- **Desktop:** Header bar with page title (when `!isHome && !hidePageHeader`)

### 3.2 QuotationFormPage — Missing hidePageHeader

`QuotationFormPage.tsx` used `<Layout title={pageTitle} session={null} immersive>` without `hidePageHeader`, unlike `InvoiceFormPage`, `NewCSR`, `NewRfq`, and `NewBoq` which all passed `hidePageHeader`. This caused the mobile page header to render even without the `immersive` fix.

## 4. Fix Applied

### 4.1 Layout.tsx — Gate headers behind `!immersive`

Wrapped both the mobile header section and the desktop header section inside `{!immersive && (...)}` guards. This ensures `immersive` mode provides a completely clean workspace with zero dashboard chrome.

**Before:**
```tsx
<div data-bd-shell="main">
  {/* Mobile Header — always rendered */}
  <div className="md:hidden">...</div>
  {/* Desktop Header — always rendered */}
  <div className="hidden md:block">...</div>
  {/* Content */}
</div>
```

**After:**
```tsx
<div data-bd-shell="main">
  {/* Mobile Header — hidden in immersive mode */}
  {!immersive && <div className="md:hidden">...</div>}
  {/* Desktop Header — hidden in immersive mode */}
  {!immersive && <div className="hidden md:block">...</div>}
  {/* Content */}
</div>
```

### 4.2 QuotationFormPage.tsx — Added hidePageHeader

Added `hidePageHeader` prop to both `<Layout>` usages (loading state and main render) for consistency with all other form pages.

## 5. Verification Gate

| Check | Status |
|-------|--------|
| `bun run typecheck` | ✅ Passed (no errors) |
| `bun run audit:load` | ⏭️ Skipped (no query-pattern changes) |
| `git status` | ✅ Confined to `Layout.tsx` and `QuotationFormPage.tsx` |
| `bun run build` | ⏭️ Excluded per hardware policy |

## 6. Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Quotation forms no longer display dashboard header | ✅ Met — `immersive` gates all headers |
| Dashboard header remains functional on Dashboard/List pages | ✅ Met — `immersive` is false for those pages |
| Document View pages retain bottom navigation | ✅ Met — `DocumentPage` is unchanged |
| Fix via React composition, not CSS | ✅ Met — JSX conditional rendering only |

## 7. Risks & Limitations

- **Risk:** If any form page omits the `immersive` prop, it will still get the dashboard header. Mitigation: all form pages already pass `immersive` (verified by grep).
- **Risk:** `MobileChromeContext.Provider` still wraps form page content even in immersive mode. Form pages don't consume this context, so no functional impact.

## 8. Deferred Work

- None. Fix is complete and self-contained.
