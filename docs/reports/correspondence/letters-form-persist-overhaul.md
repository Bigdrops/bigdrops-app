# Letters Feature — Save, Form, and Editor Overhaul

This report was written by OpenCode on 2026-07-11 via Local Runner.

## Objective & Scope

Implementation of 7 fixes for the Letters module: save hang, recipient/sender toggle redesign, TipTap editor integration, input blur prevention, mobile floating action button, and nav restructuring. Excludes CSR-related changes (separate session).

## Evidence-Based Findings

### Issue 1: Save hang (useDocumentSave.ts)

- **Location:** `src/hooks/useDocumentSave.ts`
- **Finding:** `persist()` was called without `try/catch`, so any rejected promise left `setSaving(false)` unexecuted, permanently disabling the save button.
- **Fix:** Wrapped `persist()` in `try/catch`. On error, shows `toast.error()` and ensures `setSaving(false)` runs in `finally`.

### Issue 7: Nav placement for Letters

- **Location:** `src/components/layout/navData.ts`, `src/components/Layout.tsx`
- **Finding:** Letters was under `salesPicker` group alongside invoices/waybills, but is a correspondence type. `getActiveTab` also checked `/letters` as sales.
- **Fix:** Moved `letters` to new "Correspondence" `moreGroup` with `correspondenceIcon`. Added `letters: '/letters'` to `handleMorePick` pathByKey. Removed `/letters` from sales checks.

### Issue 6: Mobile floating button

- **Location:** `src/pages/Letters.tsx`
- **Finding:** No `onPrimaryAction` or `MobileFab`, so empty-state lacked a create button and mobile had no FAB.
- **Fix:** Added `onPrimaryAction={() => navigate('/letters/new')}` + `MobileFab` from existing pattern.

### Issues 2+3: Recipient/sender toggle with full address fields

- **Locations:** `src/hooks/useLetterSave.ts`, `src/pages/NewLetter.tsx`, `src/pages/EditLetter.tsx`
- **Finding:** `CorrespondenceRecipient` type already supported `clientId`, `companyName`, `contactName`, `address`, `email`, `phone` but the form only had a flat `recipientId` + `recipientName` with no sender section.
- **Fix:**
  - Extended `LetterFormFields` with `recipientType`, `senderType`, `recipientAddress`, `recipientEmail`, `recipientPhone`, `senderName`, `senderAddress`, `senderEmail`, `senderPhone`.
  - Toggle component (Existing Client ↔ Manual) for recipient; profile auto-fills via `ClientSelector` callback.
  - Toggle (Company Profile ↔ Manual) for sender; profile mode auto-fills from `useSettings`.
  - `validate()` skips `recipientId` for manual mode, requires `recipientName` instead.
  - `persist()` sends full recipient/sender objects with all address fields.
  - Edit mode loads fields into the new structure; non-draft shows summary cards instead of editors.

### Issue 4: TipTap editor wrapper

- **Location:** `src/components/correspondence/LetterBodyEditor.tsx`
- **Finding:** Used a plain `<textarea>`, no rich text support.
- **Fix:** Wraps `RichTextEditor` (TipTap-based). Rendering disabled (draft) mode shows plain text from `innerText`. Formatting commands not persisted to LetterBody blocks. **ponytail:** HTML↔text bridge only; no dedicated serializer yet.

### Issue 5: Input blur (async settings root cause)

- **Locations:** `src/pages/NewLetter.tsx`, `src/pages/EditLetter.tsx`
- **Finding:** Default `senderType: "profile"` caused UI to render nothing when `senderName` was empty, then mount profile card when `useSettings` resolved — re-mounting DOM nodes and blurring any focused input.
- **Fix:** Default `senderType` to `"manual"` when settings haven't loaded. Effect only populates fields if `prev.senderName` is empty (user hasn't typed). Stable `key` props on section containers for defense-in-depth.

## Verification

| Command | Result |
|---------|--------|
| `bun run typecheck` | Pass (1 pre-existing error in `PdfOutputCustomizeSheet.tsx`, unrelated) |
| `bun run audit:load` | Pass (no new warnings; all 25 oversized/7 broad-select/3 heavy-limit are pre-existing) |
| `git status` | Only intended files modified |

## Risks & Limitations

- **TipTap serializer:** LetterBody blocks still store flat text; rich formatting (bold, lists) not persisted. Full serializer deferred — requires `docs/standard/document-save-orchestration.md` compliance work.
- **Edit mode non-draft:** Summary cards show but aren't editable; this matches the existing document pattern (Transform only) but could confuse users expecting inline editing.
- **ClientSelector** has a pre-existing ARCH warning for direct Supabase calls — unrelated but noted.

## Deferred Work

- TipTap full serialization (HTML → LetterBody blocks → DB)
- Letter Transform (draft → sent lifecycle)
- Email/PDF send action for completed letters
