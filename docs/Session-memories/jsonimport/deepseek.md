BIGDROPS JSON Import Improvement Roadmap — Architect Session Log

Role: Lead Architect (Deepsek)
Session scope: Full implementation of the JSON Import Improvement Roadmap across 8 phases.
Outcome: All phases completed or formally deferred. A new standard has been established for all future import work.
Date: 2026‑06‑14 to 2026‑06‑15

---

1. Platform Context

Layer Detail
Platform BIGDROPS – internal B2B invoicing and business management tool for Nigerian SMEs
Stack React 19, TypeScript 5.9, Tailwind CSS 3.4, Supabase (Postgres), Vite 7, Bun, Vercel
Runtime Bun (never npm/yarn)
UI primitives shadcn/ui (Radix), Lucide icons
Import backbone Shared pipeline in src/domain/import/ (types, schema, parser, promptGenerator, utils, apply, validate, normalize)
Modules touched Invoice, Quotation, Waybill, RFQ, CSR, Compliance Hub, Item Library (audit only), Project Documents (deferred)

---

2. Mental Model

· The import system is a prompt‑to‑data pipeline: a user pastes JSON into a textarea, the system validates it with Zod, normalises it, resolves column mappings, and applies the data to the document’s state.
· A Global Prompt Discipline Spec acts as a hard behavioural wrapper around every AI‑bound prompt. It prohibits inference, enforces null for missing values, and prevents hallucinated grouping.
· Two modules (Invoice, Quotation) share a fully dynamic pipeline (promptGenerator.ts). All other modules had bespoke implementations that had to be brought into conformance.
· Three layers of safety for Update mode: prompt‑level row‑range injection, schema‑level strict validation, and UI‑level overwrite confirmation.
· Every module now follows the adapter pattern: a dedicated file exporting prompts, schema, and applyResult. The UI is a thin shell.

---

3. Critical Architecture Decisions (CADs)

CAD# Decision Rationale
CAD‑1 Discipline spec injection in all prompts Phase 0 injected the canonical 9‑rule block into generateImportPrompt(). Later phases either reused it (Invoice/Quotation) or created tailored lean variants (Waybill, CSR, RFQ, Compliance) that never weaken the core anti‑inference rules.
CAD‑2 Total isolation of External/Internal Waybill imports External and Internal waybills have different field sets (po_number, client_*, purpose). Per the roadmap, they must have zero shared logic. We created separate prompt, schema, and adapter files for each.
CAD‑3 Ignore groups in Update mode Update mode is a row‑level patch system. Group structural changes are not its responsibility. When the user needs to restructure groups, they use Add mode. This decision avoids dangerous mix‑ups and aligns with the Phase 2 anti‑inference layer.
CAD‑4 hasScatteredGroups guard in Add mode apply When AI hallucinates groups (all items in one group, or groups clustered at the start/end), the apply layer silently strips the group assignments. Only genuinely scattered groups (matching the source document’s structure) are preserved.
CAD‑5 Remove CSV upload from CSR The audit revealed a misleading parseCsvImport function that always handled JSON. Removing CSV entirely simplified the module and removed dead code. The function was renamed to parseCsrJson and migrated to Zod.
CAD‑6 Clipboard button in shared JsonImportLayout Rather than adding a paste button to every import sheet, the button was placed in the shared layout component. It’s a best‑effort, silent‑fail operation with no auto‑read on focus (Android 12+ compliance).
CAD‑7 Replace Radix DropdownMenu with native <select> The Radix DropdownMenu conflicted with the parent Sheet’s focus trap, causing the menu to never open. A Popover also failed due to a YouTube iframe blocking the main thread. The final fix used a native <select> element — simple, reliable, accessible.
CAD‑8 Codify the standard All the acquired knowledge was distilled into docs/json-import-standard.md, with a hard reference in AGENTS.md. Future modules must follow this standard from day one.

---

4. Phase‑by‑Phase Implementation Log

Phase 0 — Open in AI System (6 providers, discipline spec)

File Action Agent Issues
src/lib/openInAI.ts Replaced hardcoded 3‑provider map with exported AI_PROVIDERS array containing all 6 providers (Gemini, ChatGPT, Claude, DeepSeek, Qwen, Kimi). —
src/components/ui/OpenInAIDropdown.tsx Replaced single Gemini button with a shadcn DropdownMenu listing all 6 providers. Clipboard write before window.open(). Toast via feedback.info(). Dropdown never opened — Radix pointerdown handler blocked. Later rewritten to Popover, still failed. Final fix: native <select>.
src/domain/import/promptGenerator.ts Appended code‑block + paste‑back instruction to every generated prompt. —
src/components/import/JsonImportLayout.tsx Updated parent to pre‑compute prompt via useMemo and wire onProviderSelect toast. Initial version lacked useMemo. Fixed later.
Task/reports/phase0‑*.md Multiple reports generated. Early agents did not save reports to Task/reports/; corrected later.
Key failure The YouTube iframe inside JsonImportUI was firing continuous postMessage events, blocking the main thread and preventing any Radix‑based dropdown from opening. This was only discovered after two failed rewrite attempts.

Final Phase 0 state: Discipline spec injected; provider dropdown functional (native select); clipboard silent write; toast; deep‑link validation manual.

---

Phase 1 — Waybill Rewrite

File Action
src/components/waybill/WaybillForm.tsx Restored delivery_location field to both External and Internal forms. Wired adapters: handleApplyImport selects adapter based on waybill.type. Removed unused normalizeWaybillImport import.
src/components/waybill/WaybillImportSheet.tsx Removed hardcoded 82‑line prompt. Now accepts adapter prop with prompt and schema. Uses adapter.schema.parse() for validation.
src/domain/waybill/externalWaybillPrompt.ts New file: isolated prompt for External waybills, with discipline preamble, code‑block/paste‑back, no group rules.
src/domain/waybill/internalWaybillPrompt.ts New file: isolated prompt for Internal waybills (no po_number, no client fields).
src/domain/waybill/externalWaybillSchema.ts New file: Zod schema for External waybill import.
src/domain/waybill/internalWaybillSchema.ts New file: Zod schema for Internal waybill import.
src/domain/waybill/externalWaybillImportAdapter.ts New file: adapter exporting prompts, schema, and applyResult. applyResult handles quantity→qty mapping.
src/domain/waybill/internalWaybillImportAdapter.ts New file: same pattern for Internal.
src/domain/import/promptGenerator.ts Exported JSON_IMPORT_DISCIPLINE_SPEC for reuse.
Prompt bloat issue Initial prompts were bloated with aliases, signature detection, and source‑type restrictions. Claude provided trimmed versions that the agent applied directly.
Verification gaps Agent initially omitted confirmation of quantity→qty mapping and code‑block/paste‑back lines. These were verified manually.

---

Phase 2 — Invoice Add Mode (Anti‑Inference)

File Action
src/domain/import/promptGenerator.ts Added two anti‑inference rules to the Add mode rules array: 1) Never create groups from indentation/spacing/item similarity; 2) Preserve exact item order from source.
src/domain/import/apply.ts Added hasScatteredGroups() helper and cluster‑check gate in Add mode buildApplyResult(). If groups are clustered at start/end, strip silently.

Test scenarios traced correctly; no UI changes. Quotation inherits automatically.

---

Phase 2b — Update Mode (Row Safety)

File Action
src/domain/import/promptGenerator.ts Added currentItemCount parameter. Update mode prompt now includes Valid row_numbers for this document are 1 through N. as first rule.
src/domain/import/schema.ts buildImportSchema now accepts maxRow. row_number validated as .int().positive() with range refinement and duplicate detection via .superRefine().
src/domain/import/validate.ts Removed redundant integer/duplicate checks (now in schema). Kept actual row‑count existence check.
src/domain/invoice/importAdapter.ts Updated prompts() signature to pass currentItemCount.
src/domain/quotation/importAdapter.ts Same.
src/components/items/JsonItemsImportSheet.tsx Added overwrite confirmation AlertDialog (wired to detectOverwriteTargets). Empty‑field retention warning in Update mode only. Overflow toast for >200 items.

---

Phase 4+5 — Compliance Hub + RFQ

File Action
src/domain/compliance/import/contracts.ts Prepended 6‑rule discipline block to all three contract prompts (vat_input, tax_filing, wht_receipt).
src/domain/rfq/importAdapter.ts Replaced hardcoded prompt with lean 6‑rule discipline version. 3‑field shape unchanged.

No schema or logic changes. Both modules now disciplined.

---

Phase 6+8 — CSR Refactor + Clipboard Detector

File Action
src/components/csr/csrImport.ts Removed CSV parsing code. Renamed parseCsvImport → parseCsrJson. Created csrJsonSchema Zod schema. Prepended discipline spec.
src/components/csr/CsrImportSheet.tsx Removed CSV upload UI. Switched to new parseCsrJson.
src/components/import/JsonImportLayout.tsx Added “Paste from clipboard” button (best‑effort, silent‑fail, explicit tap only).

---

Cleanup — Standard Codification

File Action
docs/json-import-standard.md New file: full standard for new modules, covering discipline spec, adapter pattern, schema, UI integration, isolation, groups, update mode, and a checklist.
AGENTS.md Added hard rule: “New document modules that support JSON import MUST follow the standard…”
docs/Json-import-roadmap.md Marked Complete. Phases 7a and 7b moved to docs/Pdf-improvement-roadmap.md.

---

5. Lessons Learned

Technical Debt Identified

1. The YouTube iframe in JsonImportUI is a latent hazard. It fires continuous postMessage events that can block the main thread and break UI interactions (dropdowns, popovers). Should be lazily loaded or removed from the import modal entirely.
2. The global discipline spec lives in two flavours: The canonical 9‑rule block in promptGenerator.ts, and tailored 6‑rule blocks in waybill, CSR, and RFQ prompts. They are semantically consistent but not a single source. Future refactor should extract a core spec constant that all modules reuse.
3. quantity vs qty seam persists in Waybill adapters. The adapter now handles it, but the mismatch is a source of fragility.
4. exemptOverwriteIds parameter exists in buildApplyResult but has never been wired to UI. This can be revisited if per‑field overwrite selection is desired.
5. The native <select> works but is visually inconsistent with the rest of the shadcn‑based UI. A future polish pass could replace it with a custom Popover that doesn’t conflict with the Sheet.

Agent Workflow Failures

1. No‑report agents: Early Phase 0 agents did not write work reports to Task/reports/. This made debugging the dropdown failure extremely difficult. Every subsequent prompt now mandates a report.
2. Unverified changes: Agents claimed verification steps (e.g., “clicking each provider works”) without actually running the UI. We now explicitly ask agents to “document the observed behavior” and to state if manual verification was not possible.
3. Skill‑loading omission: The first Phase 0 prompt lacked the skill‑loading protocol. The agent did not read AGENTS.md or relevant skills, leading to a component structure (inline prompt computation) that caused performance issues. All prompts after that include a mandatory SKILL LOADING PROTOCOL block.
4. Scope creep by misinterpretation: The agent creating the PDF roadmap added extra detail beyond the requested placeholder. This is low‑impact but illustrates that agents need precise boundaries.

---

6. Final System State

· All 8 phases are done or formally deferred.
· A reusable, prescriptive JSON Import Standard governs all future work.
· The import pipeline is consistent, disciplined, and safe: AI can no longer hallucinate groups, fabricate values, or reorder items.
· Update mode is bounded, row‑based, and requires explicit overwrite confirmation.
· Clipboard handling is a user‑initiated, silent‑fail operation, compatible with modern Android clipboard policies.

Architect sign‑off: Deepsek — the JSON Import Improvement Roadmap is closed.