## Goal
- Rebuild the Waybill creation flow with a gateway overlay, restructured form matching Invoice form visual composition, field interlocking, and proper type-based routing.

## Constraints & Preferences
- Source of truth: `docs/WAYBILL_ARCHITECTURE.md`, `docs/waybillprototype.html`, Invoice form screen capture
- Use Tailwind CSS with app system tokens (`bd-*` variables); no hardcoded colors
- Match Invoice form's visual language: `SectionLabel` with colored dot, `CollapseCard` sections, `pageCardCls` border styling, `fieldCls`/`labelCls` for inputs
- Do not copy Invoice form logic — mirror visual composition and layout only
- Karpathy discipline: state assumptions explicitly, surgical changes, every change verifiable via typecheck/lint/audit:load
- `bun run audit:load`, `bun run typecheck`, `bun run lint` must all pass after changes

## Progress
### Done
- Read Karpathy skill at `.claude/skills/Karpathy/SKILL.md` — "Think Before Coding," "Simplicity First," "Surgical Changes," "Goal-Driven Execution," "Border Patrol," "Terminal Discipline," "Miscellaneous"
- Located and read main Invoice form component: `src/components/document/SharedDocumentForm.tsx` — uses `SectionLabel` header with dot, `CollapseCard` sections, `pageCardCls` card styling
- Located and read visual primitives: `src/components/invoice/mobile/mobileFormPrimitives.tsx` — exports `SectionLabel`, `CollapseCard`, `pageCardCls`, `fieldCls`, `labelCls`, `getSectionDotClass`; all use CSS variables
- Found prototype HTML at `docs/waybillprototype.html` — full spec with gateway overlay, form overlay, type-based routing, interlocking, eye toggle, column scanning, exit guard, blank template
- Read `src/components/document/FormHeader.tsx` — reference for form header pattern: mode badge, title input, client picker row
- Read `src/pages/NewInvoice.tsx` — reference for how create page wires to `SharedDocumentForm` (useInvoiceColumns, calculation, save logic, exit guard)
- Re-read `src/components/waybill/waybillUtils.ts` — full types confirmed: `WaybillType` (internal/external), `WaybillStatus` (dispatched/pending_confirmation/delivered/returned), `TransportMode` ('By Vehicle'|'By Hand'|'Courier'|'Self Pick-Up'), `WaybillPurpose`, `ItemCondition`, custom columns/signatures/party notes/references structures
- Located all sub-components referenced by the form: `FormLineItems`, `FormCommercialTerms`, `FormNotesTerms`, `FormTotals`, `FormFooter` under `src/components/document/`

### In Progress
- Implementation ready to begin — all source files, visual patterns, and spec content loaded

### Blocked
- (none)

## Key Decisions
- Waybill type (`external` | `internal`) determined by gateway card selection, passed as immutable prop — no form dropdown
- All new waybills created with status `'dispatched'` — status dropdown removed from form
- Transport mode interlocking: By Vehicle shows driver+plate; By Hand shows driver only; Courier shows driver only; Self Pick-Up hides both, shows warning banner
- Dynamic routing block: external gets Client & Delivery Address + Linked Invoice; internal gets Transfer Locations, no Linked Invoice
- Eye toggle on Linked Invoice and P.O. Number: toggles PDF visibility only, does not affect DB persistence
- Auto-scan columns: Part No. and Condition columns auto-show when any row has non-empty values for those fields
- Exit guard: confirmation dialog if form has dirty data (draft status or non-empty required fields)
- Blank Template download: separate action that burns a tracking number via sequence engine; does not save the current form in progress
- Overlays are full-screen fixed-position React components (gateway then form overlay), not route-based navigation
- `CollapseCard` sections each have an icon + colored dot indicator — this pattern used for: Route Info, Items & Signatures, Notes & References, Columns Manager sections
- Waybill number generation via `getNextWaybillNumber()` and `peekNextOfflineWaybillNumber()` already exists in utils

## Next Steps
1. Create `src/components/waybill/WaybillGatewayOverlay.tsx` — two cards (External/Internal), full-screen fixed overlay, close button
2. Create `src/components/waybill/WaybillFormOverlay.tsx` — full-screen fixed overlay shell with close button, Blank Template button, form content area, save footer
3. Restructure `src/components/waybill/WaybillForm.tsx` — remove Type dropdown and Status dropdown; replace header with `SectionLabel` pattern; add transport mode interlocking; add dynamic routing block; add eye toggle on Linked Invoice/P.O.; add auto-scan columns for Part No. and Condition; add exit guard; add onSave/onClose callbacks
4. Update `src/pages/Waybills.tsx` — replace "Create New Waybill" route navigation with gateway overlay open; wire gateway selection to form overlay open; handle form close/save/draft
5. Run `bun run typecheck`, `bun run lint`, `bun run audit:load` to verify

## Critical Context
- TransportMode enum exact values: `'By Vehicle' | 'By Hand' | 'Courier' | 'Self Pick-Up'` (string literals)
- `WaybillType` is `'internal' | 'external'` — passed from gateway, not form-selectable
- Offline support already implemented: `canUseAndroidNativeSqlite`, `createOfflineWaybillDraft`, sync queue
- Form uses `feedback` toast system from `@/lib/feedback`
- Project uses shadcn/ui components (`Button`, `Input`, `Select`, `Textarea`, `Card`, `Label`), Tailwind CSS, and lucide-react icons
- `SectionLabel` component usage: `<SectionLabel icon={icon} color="emerald" title="Section Title" />` with optional `subtitle` and `actions` prop
- `CollapseCard` component: expandable card with icon, color dot, title, subtitle, and `children` content area
- All visual tokens reference CSS variables: `var(--bd-radius-lg)`, `var(--bd-border)`, `var(--bd-bg-card)`, `var(--bd-text)`, `var(--bd-text-muted)`, etc.

## Relevant Files
- `docs/WAYBILL_ARCHITECTURE.md`: Data model, constraints, lifecycle states — source of truth for structure
- `docs/waybillprototype.html`: Complete prototype HTML with all behaviors (gateway, form overlay, interlocking, eye toggle, column scanning, exit guard, blank template)
- `src/components/waybill/WaybillForm.tsx`: Current form — must be restructured (remove type/status, add interlocking, routing, eye toggle, column scan, exit guard, validation)
- `src/components/waybill/waybillUtils.ts`: Types, sequence generator, helpers — reference for existing interfaces
- `src/pages/Waybills.tsx`: List page — wire gateway overlay to "Create New Waybill" button
- `src/components/waybill/WaybillSignatureField.tsx`: Signature component — may need reference for form
- `src/components/document/SharedDocumentForm.tsx`: Invoice form reference — visual composition pattern (SectionLabel, CollapseCard sections, pageCardCls)
- `src/components/invoice/mobile/mobileFormPrimitives.tsx`: Visual primitives — SectionLabel, CollapseCard, pageCardCls, fieldCls, labelCls, getSectionDotClass
- `src/components/document/FormHeader.tsx`: Header pattern — mode badge, title input, client picker row layout
- `src/pages/NewInvoice.tsx`: Create page reference — wiring of form, save logic, column management
