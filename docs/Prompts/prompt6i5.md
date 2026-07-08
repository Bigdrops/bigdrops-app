You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
It defines project architecture, audit workflow, locked business rules,
standards, and implementation constraints.

Also load all relevant skills from docs/PROJECTSKILLINDEX.md before
making changes. This task primarily requires:
- using-superpowers
- Karpathy
- typescript-advanced-types
====================================================================

PHASE 1.5 — ENGINE FOUNDATION AUDIT & RESOLVER TESTS
====================================================================

The PDF Customization Engine foundation was built in Phase 1A (5 new
files under `src/domain/pdf/customization/` and `src/components/pdf-customization/`).
Before any document adopts the engine, we must verify its correctness,
add resolver unit tests, and lock the localStorage key convention.

This is an audit + test addition phase. Do NOT integrate any document.
Do NOT modify any existing PDF pipeline, template, or UI.

====================================================================
AUDIT TASKS
====================================================================

1. Inspect the 5 created files and verify architecture compliance:
   - `src/domain/pdf/customization/types.ts`
   - `src/domain/pdf/customization/resolver.ts`
   - `src/domain/pdf/customization/hooks.ts`
   - `src/domain/pdf/customization/fontRegistry.ts`
   - `src/components/pdf-customization/PdfCustomizationPanel.tsx`

   Confirm:
   - The resolver is a pure function (no React, no storage).
   - The hook separates storage from resolution.
   - The font registry wraps existing functions without deleting them.
   - The UI panel is capability‑driven and policy‑aware, with no hardcoded
     document‑type logic.

2. Verify that the resolver STRIPS disabled capabilities.

   Test scenario:
   - capabilities: `{ accent: false, documentFont: false, inkFont: false, inkColour: true }`
   - user settings: `{ inkFont: "Patrick Hand", inkColour: "#003399" }`
   - policy: `{ inkFont: { default: "Patrick Hand", allowed: [...] }, inkColour: { default: "#000000", allowed: [...] } }`
   - template defaults: `{ accentColor: "#0F172A", documentFont: "Inter", fillable: { font: "Patrick Hand", color: "#000000" } }`

   Expected resolved output:
   - `accentColor` = template default (capability disabled)
   - `documentFont` = template default (capability disabled)
   - `fillable.font` = template default (capability enabled but user didn't
      override inkFont because the user only set inkColour; actually user
      didn't set inkFont, so policy default is used — but capability for
      inkFont is disabled in this scenario, so it should fall back to
      template default)
   - `fillable.color` = user's chosen colour (capability enabled + user set)

   The rule: if a capability is disabled, user settings for that socket
   are ignored entirely. Only enabled sockets may override template defaults.

3. Check localStorage naming convention.

   The hook currently creates namespaced storage. Determine the exact
   key pattern it uses (e.g., `pdf_customization_waybill` or
   `pdf_customization_logistics`). If it uses per‑document keys, recommend
   switching to the document‑family pattern locked in the PRD:
   `pdf_customization_commercial`, `pdf_customization_logistics`, etc.
   Do NOT change the hook yet — only document the finding and recommend
   the final convention for Phase 2.

====================================================================
RESOLVER UNIT TESTS
====================================================================

Create `src/tests/critical/pdfCustomizationResolver.test.ts` with
tests covering the following scenarios:

1. Template defaults only → resolved object matches defaults.
2. Template defaults + user override (enabled capability) → user value wins.
3. Disabled capability + user setting → setting ignored, template default used.
4. Invalid font/colour (not in policy.allowed) → fallback to policy default.
5. Missing version in saved settings → migration path applied (version 0 → version 1).
6. Empty saved settings (null) → policy defaults used.
7. Partial saved settings (some fields, others missing) → policy defaults
   fill the gaps.

All tests must call `resolvePdfCustomization()` directly — no React,
no hooks, no storage. Use hardcoded capability/policy/defaults objects.

====================================================================
VERIFICATION
====================================================================

Run:
  bun run typecheck
  git status

DO NOT run:
  bun run build

Only report files actually created or modified. The only new file
should be the test file. If any existing pipeline file is touched,
treat the task as failed.

====================================================================
DO NOT
====================================================================

- Integrate any document family (Waybill, CSR, Invoice, Quotation).
- Modify existing PDF templates, adapters, renderers, or previews.
- Change the hook's localStorage key pattern (only document the finding).
- Run `bun run build`.
- Skip the work report.

====================================================================
REPORT
====================================================================

Save a brief work report to `docs/reports/phase-1.5-audit-report.md`
documenting findings, any corrections made, and test results.