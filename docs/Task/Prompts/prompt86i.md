

```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read `docs/PROJECTSKIILINDEX.md`
2. Load: `Karpathy` (coding discipline)
3. Fallback to direct file read on failure. Stop if unreadable.
4. Read `AGENTS.md` before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save work report to `docs/Task/reports/pdf-roadmap-update.md`

==================================================
TASK: Update PDF Rendering Roadmap with Blank Document Integration
==================================================

READ FIRST (mandatory, before editing):
- `docs/PRD/pdf-rendering-roadmap.md` (read fully)
- `docs/PRD/PREFIX_ENGINE_SETTINGS.md` (Sections 7, 9, 10 — blank logs, implementation order)
- `docs/EXECUTION/prefix-engine.md` (Steps 12-13 — blank waybill/CSR wiring)
- `docs/STANDARD/prefix-engine-settings-standard.md` (Pillar 4 — blank template logging)
- `src/lib/withUniqueRetry.ts` (collision handler — blank numbers use this too)
- `src/components/waybill/blankWaybillTemplate.tsx` (existing blank PDF template)

==================================================
CONTEXT — What changed since this roadmap was created
==================================================

The Prefix Engine is now complete. This means:
1. `blank_waybill_logs` table already exists and is wired to org prefix via `resolvePrefix()`.
2. `blank_csr_logs` table was created (Step 2 migration) and is wired to org prefix (Step 13).
3. Blank waybill download in `NewWaybill.tsx` already generates numbers with the org prefix and inserts into `blank_waybill_logs`.
4. Blank CSR download in `NewCSR.tsx` now generates numbers with the org prefix and inserts into `blank_csr_logs` — but the actual PDF template does NOT exist yet.
5. The `withUniqueRetry` collision handler protects blank number generation the same way it protects regular document saves.
6. Both blank log tables have reconciliation columns (`linked_waybill_id` / `linked_csr_id`, `reconciled_at`) ready for when a blank is later linked to a real document.

==================================================
CHANGE 1 — Add Phase 4: Blank Template PDF Rendering
==================================================

Insert a new phase AFTER Phase 3. Renumber old Phase 4+ to Phase 5+.

### Phase 4 — Blank Template PDF Rendering

Content to add:

```markdown
## Phase 4 — Blank Template PDF Rendering

**Goal:** Build or update blank/manual PDF templates for Waybill and CSR so downloaded blanks use the correct org prefix from the Prefix Engine.

### Current State (Post-Prefix-Engine)

| Template | Number Assignment | PDF Template | Logging |
|----------|------------------|--------------|---------|
| Blank External Waybill | ✅ Wired to org prefix via `resolvePrefix('waybill', ...)` | ✅ Exists in `src/components/waybill/blankWaybillTemplate.tsx` | ✅ Inserts into `blank_waybill_logs` |
| Blank Internal Waybill | ✅ Wired to org prefix | ✅ Exists (same file, Internal variant) | ✅ Inserts into `blank_waybill_logs` |
| Blank CSR | ✅ Wired to org prefix via `resolvePrefix('csr', ...)` | ❌ Does NOT exist — needs to be built | ✅ Inserts into `blank_csr_logs` |

### Number Format Reference

Blank document numbers follow these formats (from `docs/PRD/PREFIX_ENGINE_SETTINGS.md` Section 4):

| Document | Blank Format |
|----------|-------------|
| Waybill (External) | `[PREFIX]-ME-[SERIAL]` |
| Waybill (Internal) | `[PREFIX]-MI-[SERIAL]` |
| CSR | `[PREFIX]-M-[SERIAL]` |

Serial is always 6-digit zero-padded: `000001`.

### Log Table Reference

Both tables already exist in production with reconciliation support:

- `blank_waybill_logs` — columns: `id`, `assigned_waybill_number`, `type`, `downloaded_by`, `downloaded_at`, `linked_waybill_id`, `reconciled_at`
- `blank_csr_logs` — columns: `id`, `assigned_csr_number`, `downloaded_by`, `downloaded_at`, `linked_csr_id`, `reconciled_at`

The `reconciled_at` and `linked_*_id` columns are set when a blank is later claimed by a real document. This reconciliation logic is NOT yet built — it belongs in this phase.

### Tasks

#### 4A — Verify Existing Blank Waybill Templates Use Org Prefix

- [ ] Read `src/components/waybill/blankWaybillTemplate.tsx`
- [ ] Confirm the rendered PDF displays the correct org prefix (not a hardcoded `AWB-`)
- [ ] Confirm External template shows `[PREFIX]-ME-[SERIAL]` format
- [ ] Confirm Internal template shows `[PREFIX]-MI-[SERIAL]` format
- [ ] If hardcoded: update to use the prefix passed from `NewWaybill.tsx`

#### 4B — Build Blank CSR PDF Template

- [ ] Create a blank CSR PDF template (mirroring the waybill pattern in `blankWaybillTemplate.tsx`)
- [ ] The template must render:
  - Company branding (logo, name, tagline from settings)
  - The assigned blank CSR number in `[PREFIX]-M-[SERIAL]` format
  - Empty fields for: customer name, report type, description, amount due, amount paid, product serial number
  - A status placeholder ("pending" / "resolved")
  - Signature line for receiver
- [ ] Wire the download button in `NewCSR.tsx` → `handleDownloadBlankCsr` to generate and download the PDF
- [ ] Use `@react-pdf/renderer` (already in the project — same as waybill blanks)

#### 4C — Build Reconciliation Logic

- [ ] When a real Waybill is saved with a `waybill_number` that matches a `blank_waybill_logs.assigned_waybill_number`, update the log row: set `linked_waybill_id` and `reconciled_at`
- [ ] Same for CSR: when a real CSR is saved, check `blank_csr_logs` and reconcile if matched
- [ ] Reconciliation is a background operation — no user feedback needed

### Completion Signal

- Blank External and Internal Waybill PDFs display the org prefix from settings
- Blank CSR PDF downloads and displays the org prefix
- Blank log tables reconcile correctly when a blank number is claimed by a real document
```

==================================================
CHANGE 2 — Update Phase 3 (PDF Quality Audit) to Include Blank Templates
==================================================

In Phase 3's "Document types to audit" list, add:

```markdown
- Blank Waybill PDF (External and Internal)
- Blank CSR PDF
```

==================================================
CHANGE 3 — Update Execution Order
==================================================

Replace the execution order section with:

```markdown
## Execution Order

```

Phase 1 (Project Document Import) → Phase 2 (Project Document PDF) → Phase 3 (PDF Audit) → Phase 4 (Blank Template PDFs) → Phase 5+ (PDF Fixes per findings)

```
```

==================================================
CHANGE 4 — Add Prefix Engine Dependency Note
==================================================

Add this note at the top of the roadmap, after the "Deferred from JSON Import Roadmap" section:

```markdown
## Prefix Engine Dependency

This roadmap depends on the Prefix Engine (`docs/PRD/PREFIX_ENGINE_SETTINGS.md`), which is now fully implemented. Key integrations:

- All document number prefixes are configurable via Settings → Document Prefixes
- Blank document numbers use the org prefix from `resolvePrefix()`
- `blank_waybill_logs` and `blank_csr_logs` tables are live and tracking all blank downloads
- The `withUniqueRetry` collision handler (3-attempt retry on Postgres error 23505) protects all document saves including blank number assignments
- See `docs/STANDARD/prefix-engine-settings-standard.md` for the integration standard
```

==================================================
VERIFICATION
==================================================

1. Read the updated docs/PRD/pdf-rendering-roadmap.md and confirm all 4 changes are present
2. Confirm no source code files were modified
3. Push to main

==================================================
DONE WHEN
==================================================

· Phase 4 (Blank Template PDF Rendering) added to the roadmap
· Phase 3 audit list includes blank waybill and blank CSR
· Execution order updated to include Phase 4
· Prefix Engine dependency note added at top
· Work report saved to docs/Task/reports/pdf-roadmap-update.md
· Changes pushed to main

==================================================
DO NOT
==================================================

· Do NOT modify any source code files
· Do NOT run bun run dev
· Do NOT change Phase 1, Phase 2, or Phase 3 content beyond the specified additions
· Do NOT skip the work report

```

Target: Any agent | Strategy: Documentation-only update — adds blank template PDF rendering as Phase 4, links it to the now-complete Prefix Engine, documents the existing blank log tables and number formats, adds reconciliation tasks, and marks the dependency on `resolvePrefix()` and `withUniqueRetry`.