# Waybill Print Layout — Deterministic Lockdown

**Date:** 2026-06-17
**Type:** Structural lockdown — 5-zone vertical model, spacing scale, typography system, table flex proportions

## Changes Made

### 1. `waybillMinimalStyles.ts` — Full rewrite

**Spacing scale enforcement:**
- All `margin`, `padding`, `gap` values replaced with fixed scale: `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`
- Every raw numeric value purged — no ad-hoc spacing remains

**Typography system:**
- Title: 16pt bold centered
- Company Name: 13pt bold
- Tagline/Body: 10pt
- Contact/Table header: 9pt
- Footer: 8pt

**Table column flex proportions (5/70/12/13):**
- `colNum`: `flex: 1` (~5%)
- `colDesc`: `flex: 14` (~70%)
- `colQty`: `flex: 2.4` (~12%)
- `colUnit`: `flex: 2.6` (~13%)

**Padding standardization:**
- `3pt` → `4pt`, `5pt` → `8pt`, `6pt` → `8pt`, `10pt` → `12pt`

### 2. `blankWaybillTemplate.tsx` — Structural rewrite

**5-zone vertical model:**
- Zone 1 (Title): Centered "WAYBILL" at top, owns the title — never inside brand row
- Zone 2 (Brand): Logo + company info in flex row, gap handles spacing conditionally
- Zone 3 (Metadata): Pills + grids (client, destination, vehicle, driver, mode, reason)
- Zone 4 (Content): Table + notes, `flex: 1` to fill remaining vertical space
- Zone 5 (Signature + Footer): Signature cards (equal height via `flex: 1, minHeight: 140`) + footer

**Logo rendering:**
- Renders `<Image>` only — no border, no wrapper
- When absent — renders nothing, no placeholder, no gap (gap handled by `brandZone` flex `gap`, which only applies between children)

**Contact format:**
- Removed "Phone:" and "Email:" label prefixes — raw values only
- Format: `+2348066XXXXXX  |  email@domain.com`

**Root layout:**
- Root `<View>` uses `flexDirection: 'column'` with `flex: 1` to enable content zone growth

### 3. `WaybillPDF.tsx` — Minimal path aligned

- Minimal template path now uses `WaybillMinimalContent` with the new 5-zone structure
- Contact line in default template path already used raw values (no change needed)

### 4. Label prefix removal

- "Phone:" and "Email:" prefixes removed from `blankWaybillTemplate.tsx:51-52` (contact line assembly)
- No "Address:" label prefix existed in rendered output (only in `companyAddress` variable name and `destinationAddress` box header, which are structural, not labels)

## Verification

- `bun run audit:load` — OK (no new warnings)
- `bun run typecheck` — zero errors
- `bun run lint` — clean on all 3 changed files

## Files Changed

| File | Lines |
|---|---|
| `src/components/waybill/waybillMinimalStyles.ts` | 162 |
| `src/components/waybill/blankWaybillTemplate.tsx` | 259 |
| `src/components/waybill/WaybillPDF.tsx` | 244 |

## Preserved Features

- Blank prefix tokens ME/MI — untouched
- Unicode→View checkbox replacement — kept as-is
- Tagline in header — kept in brand zone, below company name
- Signature cards: "Name:", "Time:", "Signature:" form field labels — retained (not in banned "Phone/Email/Address" set)
- Numbering system, download pipeline, prefix engine — not modified
