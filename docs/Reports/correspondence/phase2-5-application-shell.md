# Correspondence Module — Phase 2.5: Application Shell Integration

This report was written by OpenCode on 2026-07-10 via Local Runner.

---

## Scope

Phase 2.5 exposes the Official Letter module inside the application shell — navigation, routes, placeholder pages, quick tiles, and icon registration — with zero business logic, persistence, or rendering.

**Covered:**
- 4 placeholder pages: list, new, edit, view
- Lazy-loaded route registration in `AppShell.tsx`
- Navigation entry in sales picker
- Quick tile registration for create action
- Icon registration (`Mail` → `Icons.letter`)
- Prefix configuration screen (`letter: 'LTR'`)

**Intentionally excluded (deferred to future phases):**
- Save orchestration hooks (Phase 4)
- Rich text editor (Phase 6)
- PDF rendering (Phase 6)
- React Email rendering (Phase 6)
- Audit trail integration (Phase 3)

---

## Placeholder Pages

### `src/pages/Letters.tsx`

Standalone list page using `ModuleShell` with empty state ("Coming Soon"), violet tone, and `Mail` icon. Includes `searchValue`/`onSearchChange` for future filtering.

### `src/pages/NewLetter.tsx`

Minimal new-letter page wrapping `DocumentPage` title="New Letter" with empty content area.

### `src/pages/EditLetter.tsx`

Edit-letter page wrapping `DocumentPage` title="Edit Letter" with empty content area.

### `src/pages/ViewLetter.tsx`

View-letter page wrapping `DocumentPage` title="View Letter" with violet-accented empty state.

---

## Route Registration

### `src/components/app/AppShell.tsx`

Lazy imports added (lines 59-62), routes registered inside the sales section (lines 212-215):

| Route | Component |
|-------|-----------|
| `/letters` | `<Letters />` |
| `/letters/new` | `<NewLetter />` |
| `/letters/edit/:id` | `<EditLetter />` |
| `/letters/:id` | `<ViewLetter />` |

All wrapped in `withBoundary()` for error handling.

---

## Navigation

### `src/components/layout/navData.ts`

- Added `letters` entry to `salesPicker` array (after waybills) with `icon: 'letter'`, `label: 'Official Letters'`, `path: '/letters'`
- Added `/letters` to `getSalesPath()` pathByKey lookup
- Added `/letters` route to `getActiveTab()` sales detection

---

## Quick Tiles

### `src/config/quickTiles.js`

- Registered `letters` and `new_letter` in `QUICK_TILE_REGISTRY`
- Added `new_letter` to `DEFAULT_CREATE_ACTION_TILES` array

---

## Icon Registry

### `src/lib/iconRegistry.ts`

- Added `Mail` import from `lucide-react`
- Registered `letter: Mail` in `Icons` object

---

## Prefix Configuration

### `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

Added `letter` to all `DocumentPrefixKey`-typed objects:
- `PREFIX_KEYS` array
- `LABELS` map (`'Letter'`)
- `PREFIX_INFO` map (title: `'Letter Numbers'`, description: `'For generating official letter numbers.'`)
- `PREVIEW_TEMPLATES` map (`(p) => [\`${p}-000001\`]`)
- `savedPrefixes` memo to fall back to `DEFAULT_PREFIXES.letter`

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Letters.tsx` | **NEW** — Placeholder list page with ModuleShell |
| `src/pages/NewLetter.tsx` | **NEW** — Placeholder new-letter page |
| `src/pages/EditLetter.tsx` | **NEW** — Placeholder edit-letter page |
| `src/pages/ViewLetter.tsx` | **NEW** — Placeholder view-letter page |
| `src/components/app/AppShell.tsx` | **MODIFIED** — Lazy imports + Route entries |
| `src/components/layout/navData.ts` | **MODIFIED** — salesPicker, getSalesPath, getActiveTab |
| `src/config/quickTiles.js` | **MODIFIED** — Registry entries + DEFAULT_CREATE_ACTION_TILES |
| `src/lib/iconRegistry.ts` | **MODIFIED** — Mail icon import + Icons.letter |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | **MODIFIED** — Added letter prefix entries |

---

## Verification

| Check | Status |
|-------|--------|
| `bun run typecheck` | Passed — no new type errors. Only pre-existing error in `PdfOutputCustomizeSheet.tsx` (receipt type unrelated). |
| `git status` | Clean — all changes committed in HEAD. Only intended files modified. |

---

## Deferred Work (Future Phases)

| Phase | Item |
|-------|------|
| Phase 3 | Audit trail — `'letter'` entity_type, RPCs |
| Phase 4 | Save orchestration — `useLetterSave()` hook |
| Phase 4 | Repository service for CRUD |
| Phase 6 | Rich text editor (TipTap/ProseMirror) |
| Phase 6 | PDF renderer |
| Phase 6 | React Email HTML output |

---

## Risks & Limitations

1. **No business logic** — Pages are pure shells; any navigation to them shows placeholder content only.
2. **Prefix screen entry** — The letter prefix now renders in the settings UI but has no backend wiring until Phase 4 save orchestration is implemented.
