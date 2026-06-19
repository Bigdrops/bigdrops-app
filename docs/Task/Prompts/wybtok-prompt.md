You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)
==================================================
1. Read docs/PROJECTSKIILINDEX.md
2. Load: Karpathy, frontend-design, shadcn
3. Read AGENTS.md before editing.

==================================================
REPORTING PROTOCOL (MANDATORY)
==================================================
Save report to: docs/Task/reports/waybill-signature-extraction-and-theming.md

==================================================
CONTEXT
==================================================

A recent redesign of the Waybill signature UI added genuinely good new
functionality — a "Pick from saved signatories" feature
(PickSignatorySheet), an upgraded touch-capable draw pad (DrawPad with
devicePixelRatio scaling), and per-card status badges (Captured/Empty).

This is all welcome. But it was added directly inline inside
WaybillForm.tsx, growing that file from ~900 to ~1200 lines against a
~600 line budget for this file. It also uses hardcoded Tailwind color
classes (bg-white, border-slate-200, text-emerald-700, bg-indigo-50,
text-rose-600, etc.) instead of the app's existing CSS variable design
tokens (var(--bd-surface), var(--bd-border), var(--bd-primary), etc.)
that every other section of WaybillForm.tsx already uses — which is
why the signature section visually looks disconnected from the rest
of the form.

Two fixes needed. Do NOT remove any functionality — only relocate code
and fix color tokens.

==================================================
READ FIRST (MANDATORY)
==================================================
- src/components/waybill/WaybillForm.tsx (current state — contains the
  new SignatureCard, SignaturesSection, PickSignatorySheet, DrawPad,
  SignatureEvidence type, SignatureRole type, emptySignature constant)
- Look for how other large sections of the Waybill or Invoice form were
  previously extracted into sibling files, if any precedent exists
  (e.g. check if there's a pattern like WaybillImportSheet.tsx being a
  separate file imported into WaybillForm.tsx — follow that same
  pattern)
- Search the whole file for every instance of var(--bd-*) usage to
  understand the full token vocabulary already in use (e.g.
  --bd-surface, --bd-border, --bd-text, --bd-text-muted, --bd-primary,
  --bd-radius-md, --bd-radius-lg, --bd-rose, --bd-warning, --bd-bg2,
  --bd-text3, --bd-text4, --bd-indigo-border, --bd-indigo-bg) — these
  are the ONLY colors/radii allowed in the relocated signature code
- AGENTS.md

==================================================
TASK 1 — EXTRACT SIGNATURE COMPONENTS TO A SEPARATE FILE
==================================================

Create a new file: src/components/waybill/WaybillSignatures.tsx

Move the following OUT of WaybillForm.tsx and INTO this new file,
unchanged in behavior:
- SignatureEvidence type
- SignatureRole type
- emptySignature constant
- PickSignatorySheet function component
- DrawPad function component
- SignatureCard function component
- SignaturesSection function component

Export SignaturesSection (and SignatureEvidence type, if needed
elsewhere) from the new file. In WaybillForm.tsx, replace all of this
with a single import:

  import { SignaturesSection } from './WaybillSignatures'

The usage at the call site in WaybillForm.tsx:

  <SignaturesSection
    customFields={customFields}
    updateCustomFields={updateCustomFields}
  />

...should remain exactly as-is — only the import changes, not the
props or usage.

Verify all imports used by the moved code (Sheet, SheetContent,
SheetHeader, SheetTitle, SheetDescription, Search, UserSearch,
ChevronRight, Eye, EyeOff, Upload, PenLine, ImageOff, Trash2,
Signature as SignatureIcon, feedback, processSignature, dataURItoFile,
supabase, React types, useState, useRef, useEffect) are correctly
added to the new file's import statements, and removed from
WaybillForm.tsx if no longer used there.

==================================================
TASK 2 — REPLACE HARDCODED COLORS WITH APP TOKENS
==================================================

In the now-relocated WaybillSignatures.tsx, replace every hardcoded
Tailwind color/border/radius utility with the equivalent var(--bd-*)
token already used elsewhere in WaybillForm.tsx. Do not invent new
tokens — only use ones that already exist in the codebase (confirm by
searching, per Task instructions above).

Specific replacements required (map to the closest existing token —
verify exact token names against the actual file, these are
illustrative):
- bg-white, bg-slate-50, border-slate-200, border-slate-100 →
  var(--bd-surface) / var(--bd-border) equivalents
- text-slate-900, text-slate-700, text-slate-500, text-slate-400 →
  var(--bd-text) / var(--bd-text-muted) / var(--bd-text3) /
  var(--bd-text4) equivalents (match by visual weight/contrast level)
- bg-emerald-50/text-emerald-700/border-emerald-200 (the "Captured"
  badge) → find or use the closest existing success/positive token in
  the app's variable set; if none exists, document this explicitly in
  the report rather than inventing a new hardcoded hex value
- bg-indigo-50/text-indigo-700/border-indigo-200 (the "Pick" button,
  "Shown" toggle state) → var(--bd-primary) / var(--bd-indigo-bg) /
  var(--bd-indigo-border)
- text-rose-600/hover:bg-rose-50 (Clear/delete button) → var(--bd-rose)
  / var(--bd-rose-bg)
- rounded-2xl, rounded-xl, rounded-lg, rounded-md → var(--bd-radius-lg)
  / var(--bd-radius-md) consistently, matching how the rest of the form
  uses these two radius tokens (do not introduce a third radius scale)
- border-dashed border-slate-300 bg-slate-50 (DrawPad container) → use
  var(--bd-border) and var(--bd-surface) equivalents, keep the dashed
  style if no token conflicts

The goal: WaybillSignatures.tsx should look, on screen, like a native
part of the same form as Waybill Header / Transport Details / Custody
Details — same border weight, same radius, same text color hierarchy,
same background tones.

==================================================
CONSTRAINTS
==================================================

- Do NOT remove the Pick signatory feature, the upgraded DrawPad, or
  the Captured/Empty status badges — these are wanted features, keep
  them all
- Do NOT change any signature capture/upload/draw/clear logic or
  behavior — only file location and CSS classes change
- Do NOT touch any other section of WaybillForm.tsx (Waybill Header,
  Transport Details, Custody Details, Notes, Terms, Table Settings,
  Import Sheet)
- Do NOT touch any PDF-related file
- Do NOT change the SignaturesSection component's external props
  (customFields, updateCustomFields) — the call site must not need to
  change beyond the import line
- Do NOT run bun run dev
- Do NOT skip the report

==================================================
VERIFICATION
==================================================
1. bun run audit:load
2. bun run typecheck
3. bun run lint — focused on both changed files

Manual checks (document explicitly in report):
- Report the exact line count of WaybillForm.tsx before and after
  extraction
- Report the exact line count of the new WaybillSignatures.tsx
- Confirm WaybillForm.tsx is now closer to or under the ~600 line
  target (state the actual number — if still over, explain what else
  remains large in the file)
- List every hardcoded Tailwind color class that was replaced, and
  what var(--bd-*) token it was replaced with, in a table
- Confirm zero hardcoded slate/emerald/indigo/rose Tailwind color
  classes remain in WaybillSignatures.tsx (grep and show the result)
- Confirm the Pick signatory feature, DrawPad, and status badges are
  still present and functionally unchanged — describe what you
  verified since this environment can't run the app live

==================================================
DO NOT
==================================================
- Do NOT remove any signature feature
- Do NOT change signature logic, only file location and styling
- Do NOT touch other form sections or PDF files
- Do NOT invent new color tokens not already present in the codebase
- Do NOT skip the report

==================================================
DONE WHEN
==================================================
- [ ] WaybillSignatures.tsx created with all signature-related
      components, types, and constants moved into it
- [ ] WaybillForm.tsx imports SignaturesSection from the new file,
      call site unchanged
- [ ] WaybillForm.tsx line count reported before/after, ideally at or
      near 600 lines
- [ ] Every hardcoded color/radius class in the signature code replaced
      with an existing var(--bd-*) token — table of replacements in
      report
- [ ] Zero remaining hardcoded slate/emerald/indigo/rose Tailwind
      classes in the new file (confirmed via grep in report)
- [ ] Pick signatory, DrawPad, and status badges confirmed unchanged
      functionally
- [ ] typecheck clean, audit clean, lint clean

Success: WaybillForm.tsx is back near its line budget, the signature
section visually matches the rest of the form using the same design
tokens, and every feature added in the previous redesign still works
exactly as before — nothing lost, nothing reduced in scope.
