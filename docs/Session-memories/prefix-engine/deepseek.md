Prefix Engine — Architect Session Log

Role: Lead Architect (Deepsek)
Session scope: Full implementation of the Prefix Engine — configurable document number prefixes across all 7 document types, plus blank document logging infrastructure.
Outcome: All 13 steps complete. Engine is live in production.
Date: 2026-06-15 to 2026-06-16

---

1. Platform Context

Layer Detail
Platform BIGDROPS — internal B2B invoicing and business management tool for Nigerian SMEs
Stack React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase (Postgres), Vite 7, Bun, Vercel
Runtime Bun (never npm/yarn)
UI primitives shadcn/ui (Radix), Lucide icons
Settings layer Singleton settings table (id = 1), accessed via useSettings() hook in src/hooks/useSettings.js
Modules touched Invoice, Quotation, Waybill, CSR, RFQ, BOQ, Project, Settings

---

2. Mental Model

· Every document type in the app has a sequence number generator. These generators were scattered across the codebase, each with a hardcoded prefix (SASINV-B, AWB-I-, SASIQUO, CSR-001, PRJ-{year}).
· The goal was to make these prefixes configurable by the workspace administrator via a settings UI, stored in the existing settings table, and read dynamically at runtime by every generator.
· The architecture follows a simple chain: Settings UI → settings.document_prefixes → resolvePrefix() → generator → document number.
· A shared collision retry utility (withUniqueRetry) wraps every Supabase insert to handle Postgres unique constraint violations (error 23505) silently with up to 3 automatic retries.
· Blank document logging (blank_waybill_logs, blank_csr_logs) tracks every downloaded blank PDF and supports future reconciliation when blanks are claimed by real documents.
· The single source of truth for fallback prefixes is DEFAULT_PREFIXES in src/domain/prefixConstants.ts. Every generator and the settings UI reference this constant.

---

3. Critical Architecture Decisions (CADs)

CAD# Decision Rationale
CAD-1 Store document_prefixes in settings table, not a new organizations table Audit revealed no organizations table exists. settings is already the singleton workspace config store, accessed everywhere via useSettings(). Adding a new table would create unnecessary infrastructure when the existing pattern works perfectly.
CAD-2 6-character max prefix enforced at DB and UI layers PostgreSQL CHECK constraint validates ^[A-Z0-9]{2,6}$. UI enforces the same via maxLength={6} and onChange sanitization. Dual enforcement prevents users from typing values the DB will reject.
CAD-3 resolvePrefix() utility centralises the fallback pattern Instead of every call site inlining settings?.document_prefixes?.invoice ?? DEFAULT_PREFIXES.invoice, a single resolvePrefix(key, settingsPrefixes) function handles the fallback. This prevents drift and makes the pattern auditable in one place.
CAD-4 Shared withUniqueRetry utility, not per-module retry loops The audit confirmed all save paths use a similar Supabase .insert() pattern. Extracting the Project module's proven retry loop into a shared utility avoids code duplication across 6 document types. The Project module retains its own retry (it pre-dates the utility and works correctly).
CAD-5 useSettings() in React components only; prefixes parameter in non-React files React hooks cannot be called in service files or action utilities. For those files, the pattern is to pass `prefixes?: DocumentPrefixes
CAD-6 Blank template PDFs are number-engine only; PDF rendering is deferred The blank download handlers assign numbers, insert into log tables, and trigger PDF download. The actual PDF template rendering is out of scope for this build and lives in docs/PRD/pdf-rendering-roadmap.md.
CAD-7 Replace window.confirm() with shadcn AlertDialog using a single pendingAction pattern window.confirm() blocks the main thread and is poor UX in a React SPA. A single AlertDialog with a pendingAction discriminated union state avoids creating 9 separate dialog components for each reset action.
CAD-8 Delete duplicate generateWaybillSequenceNumber; keep getNextWaybillNumber These two functions were line-for-line identical in waybillUtils.ts. Consolidating to one function eliminates maintenance burden and removes a source of prefix inconsistency.
CAD-9 Consolidate inline invoice logic in NewInvoice.tsx and Invoices.tsx Both files had their own inline copies of invoice number generation with SASINV-B hardcoded. Replacing them with calls to the shared getNextInvoiceNumber() ensures the prefix engine reaches every code path.

---

4. Phase-by-Phase Implementation Log

Phase 0 — Intel Gathering (4 audits)

Audit Finding Impact
Prefix Engine Audit organizations table doesn't exist; generators use hardcoded prefixes; project documents have no numbering Defined the entire build scope
Settings Table Audit settings is a singleton row (id = 1), workspace-scoped, accessed via useSettings() CAD-1: store prefixes in settings
Sequence Generator Audit 9 generators found; Invoice/Quotation/RFQ accept prefix as parameter (easy), Waybill/CSR hardcode it internally (need modification), Project has year-dependent prefix (needs rewrite) Determined wiring difficulty per module
Offline Call Site Audit csrOffline.ts and quotationOffline.ts are live in production — not dead code Deletion deferred; marked out of scope

---

Steps 1-2 — Database Migrations

SQL executed directly in Supabase, then migration files created.

Step Action File
1 Add document_prefixes JSONB to settings with CHECK constraint supabase/migrations/20260611000001_document_prefixes.sql
2 Create blank_csr_logs table (mirrors existing blank_waybill_logs) supabase/migrations/20260611000002_blank_csr_logs.sql
Types Add document_prefixes and blank_csr_logs types src/lib/database.types.ts

Key decision: blank_waybill_logs already existed in production — no migration needed for it.

---

Steps 3-4 — Constants + Settings UI

Step Action File
3 Create DEFAULT_PREFIXES constants, DocumentPrefixKey type, resolvePrefix() utility src/domain/prefixConstants.ts
4 Build Document Prefixes settings card with live preview, validation, cross-type conflict detection, solo/full reset src/pages/settings/DocumentPrefixesSettingsSection.tsx
Navigation Add prefixes section to settings config and switch src/pages/settings/settings-config.ts, src/pages/Settings.tsx

UX details:

· Auto-uppercase on keystroke, alphanumeric filter, max 6 characters
· Live preview updates as user types: Waybill shows all 4 routing tokens, CSR shows 2, others show 1
· Solo reset per field saves immediately (no main Save button needed)
· Cross-type conflict detection is non-blocking (warning only)
· Dirty state tracking disables Save until changes exist

---

Step 4 Patch — Mobile Layout + AlertDialog + Dirty State

Patch File Change
Waybill preview fix DocumentPrefixesSettingsSection.tsx Show all 4 variants (-E-, -I-, -ME-, -MI-)
Mobile layout fix Same file Previews below inputs, vertical stacking on mobile
Replace window.confirm() Same file Single AlertDialog with pendingAction pattern
Dirty state indicator Same file Amber ring on modified inputs + "Unsaved changes" badge
Sticky action bar Same file Contextual save bar appears when dirty, replaces bottom Save button

---

Steps 5-6 — Consolidate Duplicates

Step Action Files
5 Replace inline SASINV-B logic in NewInvoice.tsx and Invoices.tsx with getNextInvoiceNumber() src/pages/NewInvoice.tsx, src/pages/Invoices.tsx
6 Delete duplicate generateWaybillSequenceNumber; redirect call site to getNextWaybillNumber src/components/waybill/waybillUtils.ts, src/pages/NewWaybill.tsx

Verification: Agent searched codebase for any other call sites before deleting — confirmed only one existed.

---

Steps 7-8 — Wire Prefix Parameters to All Generators

Generator signature changes:

Generator File Change
getNextWaybillNumber waybillUtils.ts Added prefix parameter (default 'AWB' → later fixed to 'WBL'). 4-digit → 6-digit padding.
getNextCsrNumber csrUtils.ts Added prefix parameter (default 'CSR'). Fallback 'CSR-001' → ${prefix}-000001. 6-digit padding.
getProjectCodePrefix projects.ts Added prefix parameter (default 'PRJ'). Format: {prefix}-{year}-.
generateNextProjectCode projects.ts Added prefix parameter, passed through to getProjectCodePrefix.

Call site wiring (19+ files):

Pattern Files Details
React components 12 files Use useSettings() → resolvePrefix(key, settings?.document_prefixes)
Action/service files 6 files Accept prefixes?: DocumentPrefixes \| null parameter
Waybill mutations waybillMutations.ts Already accepted prefixes parameter

---

Steps 7-8 Add-on — Info Popovers + Copy Polish

Change File Details
Info popovers per prefix row DocumentPrefixesSettingsSection.tsx Small Info icon opens Popover explaining what each prefix controls. Waybill and CSR explain their multi-format variants.
Popover copy revision Same file Stripped "digital" filler words. Mobile-safe single sentences. Waybill: "For generating: External Delivery Notes (-E-), Internal Transfer Notes (-I-), Blank External Waybills (-ME-), Blank Internal Waybills (-MI-)."
AWB → WBL default fix waybillUtils.ts Changed getNextWaybillNumber default parameter from 'AWB' to 'WBL' to match DEFAULT_PREFIXES.

---

Steps 11-13 — Collision Handler + Blank Document Wiring

Step Action File
11 Create shared withUniqueRetry utility src/lib/withUniqueRetry.ts
11 Wire retry into Invoice save src/pages/NewInvoice.tsx
11 Wire retry into RFQ save src/pages/NewRfq.tsx
11 Wire retry into CSR save src/pages/NewCSR.tsx
11 Wire retry into Waybill save src/domain/waybill/waybillMutations.ts
11 Fix Quotation hardcoded SASQ prefix + wire retry src/components/quotation/QuotationForm.tsx
12 Confirm blank waybill download uses org prefix src/pages/NewWaybill.tsx (already wired — no changes)
13 Build blank CSR download handler + insert into blank_csr_logs src/pages/NewCSR.tsx, src/components/csr/CsrFormScreen.tsx

Collision handler pattern:

```
withUniqueRetry(insertFn, regenerateValue, maxRetries=3)
  → On error 23505: regenerate number, retry
  → On other error: return immediately
  → On success: return { data, error: null }
```

Quotation bug fix: QuotationForm.tsx had SASQ hardcoded in two places — both the initial number generation and the collision bump. Replaced with resolvePrefix('quotation', settings?.document_prefixes).

All 6 document types now have collision retry. Project had its own retry loop pre-existing and was left untouched.

---

Standards + Roadmap Updates

Action File
Create document building standard docs/STANDARD/prefix-engine-settings-standard.md
Update PDF roadmap with blank template integration docs/PRD/pdf-rendering-roadmap.md

---

5. Lessons Learned

Technical Debt Identified

1. Waybill default is 'WBL' but the legacy blankWaybillTemplate.tsx may still render AWB-. Phase 4 of the PDF roadmap tasks an agent with verifying and fixing this.
2. Offline CSR and Quotation modules are alive but use completely different prefix formats (SASCSR-{deviceCode}, SASQUO-{deviceCode}). They are not wired to the prefix engine and are out of scope. A future task must either delete them or bring them into compliance.
3. The settings UI uses window.confirm() replacements successfully, but the AlertDialog pendingAction pattern is bespoke. If the app adds more confirmation dialogs, this pattern should be extracted into a reusable hook.
4. Project documents had no numbering at all before this build. The new generator uses {prefix}-{year}-{serial} format. This is a deliberate design choice but different from the flat {prefix}-{serial} format used by other document types. The year component may cause confusion if the prefix is changed mid-year.
5. Quotation prefix was silently broken — QuotationForm.tsx used hardcoded SASQ while cloneQuotation (in quotationService.ts) correctly used resolvePrefix. This inconsistency existed because the form and the service were wired at different times. Future generator wiring should audit both the creation and duplication code paths simultaneously.

Agent Workflow Failures

1. Gemini's prompt generated a TypeScript syntax error in the popover copy fix prompt. The type definition Record<DocumentPrefixKey, description: string string; title: { }> was corrupted. The architect (Deepsek) caught it during review and regenerated the prompt. Lesson: always review AI-generated prompts for syntax errors before sending to agents.
2. Gemini recommended localised retry blocks instead of the shared withUniqueRetry utility, arguing it would require "radically altering form state." The architect (Deepsek) overruled this — the audit proved the save patterns were structurally similar enough for a shared utility. The shared approach won and produced cleaner code with less duplication.
3. The \n newline rendering bug — multiple prompts contained \n characters in popover copy that wouldn't render as line breaks in a plain <p> tag. This was caught during review and the copy was rewritten as single-sentence descriptions. Lesson: when writing UI copy for agents, specify the rendering context (plain text vs JSX) to avoid formatting assumptions.
4. Agent used 'AWB' as the default prefix in getNextWaybillNumber instead of 'WBL' from DEFAULT_PREFIXES. This was cosmetic (the default is overridden by resolvePrefix() at every call site) but created inconsistency. Lesson: specify exact default values in prompts, matching the constants file, to avoid drift.

---

6. Final System State

· All 7 document types have configurable prefixes via Settings → Document Prefixes.
· All 6 transactional document types have collision retry (3 attempts on Postgres error 23505).
· Blank document tracking is live for both Waybill and CSR, with reconciliation columns ready for future implementation.
· A reusable standard (docs/STANDARD/prefix-engine-settings-standard.md) guides all future document type additions.
· The PDF roadmap (docs/PRD/pdf-rendering-roadmap.md) has full context on the blank document infrastructure waiting for its Phase 4.
· No hardcoded prefixes remain in any generator call site — all read from resolvePrefix() with DEFAULT_PREFIXES as fallback.

Architect sign-off: Deepsek — the Prefix Engine is complete and production-ready.