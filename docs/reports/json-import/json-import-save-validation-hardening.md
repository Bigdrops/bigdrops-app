# JSON Import Save Validation Hardening Implementation Report

## Architecture summary

The existing JSON import architecture remains unchanged:

JSON → Parse → Zod Schema → Normalize → Resolve → Apply → Adapter → Editor → Save → Database → Reload → Preview/PDF

This implementation only hardens approved boundaries:

- Prompt generation no longer asks AI for `showSubtotal` presentation state.
- Import normalization/apply/adapters force imported groups to `showSubtotal: true` internally.
- Zod schema validation rejects blank or whitespace-only imported descriptions when a description is present.
- Invoice and quotation save paths reject invalid standard rows before persistence and no longer silently filter them out.

No PDF rendering, grouping mechanics, database schema, update-mode architecture, custom-column generation, or runtime identifier architecture was changed.

## Files read

- `docs/PROJECTSKILLINDEX.md`
- `AGENTS.md`
- `.claude/skills/Karpathy/SKILL.md`
- `.agents/skills/typescript-advanced-types/SKILL.md`
- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`
- `docs/standard/json-import-standard.md`
- `src/domain/import/promptGenerator.ts`
- `src/domain/import/schema.ts`
- `src/domain/import/normalize.ts`
- `src/domain/import/apply.ts`
- `src/domain/import/validate.ts`
- `src/domain/invoice/importAdapter.ts`
- `src/domain/quotation/importAdapter.ts`
- `src/pages/EditInvoice.tsx`
- `src/pages/NewInvoice.tsx`
- `src/components/quotation/QuotationForm.tsx`
- `package.json`

## Files modified

- `src/domain/import/promptGenerator.ts`
- `src/domain/import/schema.ts`
- `src/domain/import/normalize.ts`
- `src/domain/import/apply.ts`
- `src/domain/invoice/importAdapter.ts`
- `src/domain/quotation/importAdapter.ts`
- `src/pages/EditInvoice.tsx`
- `src/pages/NewInvoice.tsx`
- `src/components/quotation/QuotationForm.tsx`
- `docs/Reports/json-import-save-validation-hardening.md`

## Exact code changes

### `src/domain/import/promptGenerator.ts`

- Removed `showSubtotal: false` from the generated Add-mode grouped JSON example.
- The generated prompt still includes explicit group `id`, `name`, and `itemIds`, but no longer requests subtotal visibility from AI.

### `src/domain/import/schema.ts`

- Removed `showSubtotal` from `groupSchema`.
- Changed group-name validation from `z.string().min(1)` to `z.string().trim().min(1, 'Group name is required.')`.
- Added item-level `description` validation in `buildItemSchema()`:
  - If a `description` key is present, it must be a string.
  - The string must contain non-whitespace text after trimming.
  - Invalid descriptions produce `Description is required and cannot be blank.`
- Preserved Update-mode row-number validation and duplicate detection behavior.

### `src/domain/import/normalize.ts`

- Imported groups now normalize to `showSubtotal: true` unconditionally.
- Any incoming `grp.showSubtotal` value is ignored.

### `src/domain/import/apply.ts`

- Apply-result groups now emit `showSubtotal: true` unconditionally.
- This keeps application-owned UI state stable even if upstream data contains a different value.

### `src/domain/invoice/importAdapter.ts`

- Invoice import adapter now sets every imported group to `showSubtotal: true` when applying groups to editor state.
- Any value from the import result is ignored at the adapter boundary.

### `src/domain/quotation/importAdapter.ts`

- Quotation import adapter now maps every imported group to `showSubtotal: true` before setting editor groups.
- Any value from the import result is ignored at the adapter boundary.

### `src/pages/EditInvoice.tsx`

- Replaced generic `some()`-based invalid-description check with an explicit invalid standard-row count.
- Error now states how many item rows must be fixed.
- Removed the pre-save item filter that dropped rows with blank standard descriptions or blank group names.
- Save payload now maps every current row exactly as present after validation.

### `src/pages/NewInvoice.tsx`

- Replaced generic `some()`-based invalid-description check with an explicit invalid standard-row count.
- Error now states how many item rows must be fixed.
- Removed the pre-save item filter that dropped rows with blank standard descriptions or blank group names.
- Save payload now maps every current row exactly as present after validation.

### `src/components/quotation/QuotationForm.tsx`

- Replaced generic `some()`-based invalid-description check with an explicit invalid standard-row count.
- Error now states how many item rows must be fixed.
- Removed the `normalizedItems.filter(...)` persistence filter.
- Quotation offline and online save paths now use the full normalized item array after validation.

## Before/after behavior

### Before

- JSON import prompts included `showSubtotal`, asking AI to provide UI presentation state.
- Import pipeline could carry an AI-provided or defaulted `showSubtotal` value through normalization/apply/adapters.
- Save paths filtered out rows with blank descriptions or blank group names before database writes.
- This could silently remove rows instead of reporting the problem.
- `z.string().min(1)` style validation allowed whitespace-only strings in some schema contexts.

### After

- JSON import prompts do not mention `showSubtotal`.
- Imported groups always become `showSubtotal: true` internally.
- AI-provided `showSubtotal` is ignored even if present in pasted JSON.
- Save paths count invalid standard rows, display a clear validation error, abort save, and preserve rows.
- If save validation succeeds, every current row is mapped for persistence rather than silently filtered.
- Whitespace-only imported descriptions are rejected by schema validation when present.

## Risks

- Existing imported JSON that still includes `showSubtotal` is accepted at the root/object level because the import schema permits passthrough object keys; however, the value is ignored and cannot affect UI state.
- Because save paths now persist all rows after validation, any pre-existing non-standard empty group header row will no longer be filtered out. This is intentional per the no-silent-data-loss requirement, but it makes upstream editor validation more visible if invalid non-standard rows are introduced elsewhere.
- The audit command reports pre-existing architectural warnings unrelated to this change. The command exits successfully, and those findings were not modified due to the explicit stop condition and scope limits.

## Verification results

### Automated verification

- `bun run audit:load` completed with exit code 0. It reported existing bloat/query/heavy-limit warnings already present in the codebase.
- `bun run typecheck` completed successfully with exit code 0.
- `bun run build` completed successfully with exit code 0. Vite emitted existing large-chunk warnings.

### Manual verification

Scenario 1 — valid JSON:

- Verified the save paths now validate standard rows first and then map all rows for persistence.
- Expected behavior: valid imported rows remain present, save proceeds, and no row is filtered out by description during save.

Scenario 2 — whitespace-only descriptions:

- Verified `buildItemSchema()` rejects present `description` values that are empty or whitespace-only after trimming.
- Verified invoice and quotation save paths count invalid standard rows and abort with a clear validation message.
- Expected behavior: schema validation rejects the import or save is blocked; no rows are silently removed.

Scenario 3 — grouped invoice:

- Verified prompt generation no longer requests `showSubtotal`.
- Verified normalization, apply, invoice adapter, and quotation adapter all force imported groups to `showSubtotal: true`.
- Expected behavior: imported groups are created correctly and every imported group has `showSubtotal: true` regardless of AI output.

## Assumptions made

- Existing `validateImportData()` behavior for Add mode may still skip imported rows missing a description entirely; the approved confirmed defect targeted save-time silent filtering, and whitespace-only descriptions are now rejected earlier by schema validation when a description key is present.
- Existing editor state always represents saveable standard rows with descriptions once save validation succeeds.
- Group subtotal visibility is presentation/UI state and should default to `true` only for imported groups as requested; existing manual group defaults and existing document group metadata were not changed.
