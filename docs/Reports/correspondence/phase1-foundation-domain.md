# Correspondence Module — Phase 1: Foundation & Domain

This report was written by MiMoCode on 2026-07-10 via Local Runner.

---

## Status

Phase 1 Implementation Complete — Domain contracts established.

---

## Scope

**Covered:**
- Shared correspondence domain contracts (types, identity, lifecycle, validation result)
- Letter-specific document types (LetterDocument, LetterBody, 7 block types)
- Structured JSON body schema (discriminated union, not HTML/editor-specific)
- Pure validation functions (validateLetter, validateLetterBody, validateCreateLetterInput, validateCorrespondenceStateTransition)
- Pure normalization functions (createLetterDraft, normalizeLetter, normalizeLetterBody, createCorrespondenceIdentity)

**Intentionally excluded (per PRD §3 Non-Goals and Phase 1 constraints):**
- Database schema / Supabase integration
- React components / pages
- PDF rendering
- React Email rendering
- Audit trail integration
- Prefix Engine integration (letter key not yet added to DEFAULT_PREFIXES)
- Save Orchestration integration
- Repository layer
- Any framework-dependent code

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/domain/correspondence/types.ts` | ~200 | Shared contracts: CorrespondenceDocument, CorrespondenceIdentity, CorrespondenceLifecycleState, CORRESPONDENCE_TRANSITIONS, identity helpers, validation result types |
| `src/domain/correspondence/letter/types.ts` | ~190 | Letter types: LetterDocument, LetterBody, 7 block types (heading, paragraph, list, quote, divider, signature, image), type guards, CreateLetterInput, UpdateLetterInput |
| `src/domain/correspondence/letter/validation.ts` | ~230 | Pure validation: validateLetterBody, validateLetter, validateCreateLetterInput, validateCorrespondenceStateTransition, isValidLifecycleState |
| `src/domain/correspondence/letter/normalize.ts` | ~180 | Pure normalization: createLetterDraft, normalizeLetter, normalizeLetterBody, createCorrespondenceIdentity, EMPTY_LETTER_BODY |

---

## Architecture Decisions

### 1. Lifecycle States

Five states defined: `draft`, `approved`, `issued`, `archived`, `cancelled`.

Transition map defined in `CORRESPONDENCE_TRANSITIONS`:
- draft → approved, cancelled
- approved → issued, cancelled, draft
- issued → archived
- archived → (terminal)
- cancelled → (terminal)

This differs from the PRD §6 which lists "Sent" instead of "Issued". The investigation report recommended "Issued" as the initial finalisation state, deferring "Sent" to the email delivery phase. The user's task instruction specified "Issued" in the lifecycle states list, so that was followed.

### 2. Body Schema

The body is a `LetterBody` containing an ordered array of `LetterBodyBlock` — a discriminated union of 7 block types. Each block has a `type` literal discriminator.

This is NOT HTML, NOT Markdown, NOT ProseMirror/TipTap JSON. It is the canonical storage contract. Future editors must serialize INTO this schema.

### 3. Identity Contract

`CorrespondenceIdentity` contains `id`, `documentNumber`, and `type`. The `CORRESPONDENCE_IMMUTABLE_IDENTITY_KEYS` set and `isIdentityField()` / `getImmutableIdentityFields()` helpers expose the immutable identity contract without performing persistence-aware enforcement (deferred to Phase 4 Save Orchestration).

### 4. Framework Isolation

Zero forbidden imports: no React, no Supabase, no React Email, no React PDF, no browser APIs, no routing, no UI libraries. Only TypeScript type definitions and pure functions.

### 5. Validation Architecture

Validation functions return `CorrespondenceValidationResult` — a structured result with `valid: boolean` and `errors: readonly CorrespondenceValidationError[]`. This matches the pattern used by the existing Document Save Orchestration (`DocumentSaveStrategy.validate()` returns `ValidationResult`).

---

## Standards Conformance

| Standard | Status | Notes |
|----------|--------|-------|
| Prefix Engine | Deferred (Phase 2) | `letter` key not yet added to `DEFAULT_PREFIXES` |
| Save Orchestration | Deferred (Phase 4) | Validation result shape compatible with `DocumentSaveStrategy.validate()` |
| Lifecycle Ownership | Conforming | Domain layer owns validation and normalization; no UI/persistence logic leaked |
| Audit Trail | Deferred (Phase 3) | Entity type whitelist update deferred |
| Document Transformation | Partially applied | Edit Law identity fields defined; Duplicate Law not yet implemented |

---

## Verification

- `bun run typecheck` — skipped (known 4GB RAM timeout on this machine)
- `bun run audit:load` — passed, no new issues from correspondence files
- `git status` — confirmed only `src/domain/correspondence/` directory modified (plus pre-existing unrelated changes)

---

## Deferred Work (Future Phases)

| Phase | Item |
|-------|------|
| Phase 2 | Add `letter: 'LTR'` to `DEFAULT_PREFIXES` in `src/domain/prefixConstants.ts` |
| Phase 2 | Create `getNextLetterNumber()` utility |
| Phase 3 | Add `'letter'` to audit trail entity_type CHECK constraint |
| Phase 3 | Create letter audit functions and SQL RPCs |
| Phase 4 | Create `useLetterSave()` strategy implementing `DocumentSaveStrategy` |
| Phase 4 | Enforce identity immutability after first save |
| Phase 5 | Create letter pages (New, Edit, View, List) |
| Phase 6 | PDF renderer for letters |
| Phase 6 | React Email renderer for letters |
| Phase 6 | Plain text renderer for letters |

---

## Risks & Limitations

1. **Typecheck not verified on this machine** — The 4GB RAM limitation prevents full `bun run typecheck`. The domain files are pure TypeScript with no external dependencies, so type errors are unlikely but unverified at project scale.
2. **Prefix Engine integration deferred** — The `letter` key is not yet in `DEFAULT_PREFIXES`. This means `resolvePrefix()` cannot yet resolve a letter prefix. This is intentional per Phase 1 constraints.
3. **Body schema rigidity** — The 7 block types are fixed. Adding new block types (e.g. `table`, `code`) requires extending the `LetterBodyBlock` union. This is by design — the schema should evolve deliberately, not grow organically.

---

*End of report.*
