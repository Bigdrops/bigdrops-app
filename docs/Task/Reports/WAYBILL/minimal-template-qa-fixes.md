# Minimal Waybill Template — QA Fixes

**Date:** 2026-06-17
**Type:** Visual QA — Bordered-checkbox, logo, header/footer, spacing, date pill

## Changes Made

### 1. Checkboxes — Unicode `☐`/`☑` replaced with bordered `View` squares

**Files:** `blankWaybillTemplate.tsx`, `waybillMinimalStyles.ts`

- Removed `c()` function that rendered `. ☐`/`. ☑` characters
- Added `Checkbox` component rendering a 10×10pt bordered `<View>` square
- When checked, square fills with black (`backgroundColor: '#000'`)
- Added `checkboxBox` style: `{ width: 10, height: 10, border: '1pt solid #000' }`
- Removed `checkboxChar` style (no longer needed)

### 2. Logo — border removed when present, nothing rendered when absent

**Files:** `blankWaybillTemplate.tsx`, `waybillMinimalStyles.ts`

- Removed `logoBox` wrapper View (no more border container)
- When `companyLogoUrl` is set: renders `<Image>` directly inside `brand` row with `objectFit: 'contain'`
- When `companyLogoUrl` is falsy: renders nothing — no frame, no text, no empty box
- Removed `logoBox` and `logoText` styles from stylesheet

### 3. Date pill — minimum width increased

**Files:** `blankWaybillTemplate.tsx`, `waybillMinimalStyles.ts`

- Added `datePill` style: `{ minWidth: 80 }`
- Applied `[minimalStyles.metaPill, minimalStyles.datePill]` to the date pill View

### 4. Height reallocation — Client/Destination boxes larger, Vehicle/Driver smaller

**Files:** `waybillMinimalStyles.ts`

- `topBox` (Client/Destination): `minHeight` 55 → 70
- `secondBox` (Vehicle/Driver): `minHeight` 50 → 35
- Total vertical height of top section kept the same

### 5. Signature cards — expanded for handwriting

**Files:** `waybillMinimalStyles.ts`

- `sigMetaCell` / `sigMetaCellBorder` (Name/Time row): `minHeight` 24 → 32
- `sigArea` (Signature area): `minHeight` 48 → 64

### 6. Header — tagline and contact info added

**Files:** `blankWaybillTemplate.tsx`, `WaybillPDF.tsx`, `NewWaybill.tsx`

- Moved `tagline` from footer to header (rendered below company name)
- Added `companyPhone` and `companyEmail` to `MinimalContentData` and `BlankTemplateOptions`
- Contact info rendered as a single line: `"Phone: [phone]  |  Email: [email]"` below address
- Added `brandTagline` style: `{ fontSize: 10, color: '#444444', marginBottom: 1 }`
- Added `brandContact` style: `{ fontSize: 9, color: '#444444', marginTop: 2 }`

### 7. Footer — simplified

**Files:** `blankWaybillTemplate.tsx`, `waybillMinimalStyles.ts`

- Footer now renders only the company name (no tagline)
- Footer `fontSize` reduced from 9 to 8

## Verification

- `bun run audit:load` — OK (no new warnings)
- `bun run typecheck` — zero errors
- `bun run lint` — no errors in changed files (all 1279 errors pre-existing)
