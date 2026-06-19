Deepsek speaking. Got it — you want the CSR template picker to be the reference, not Invoice. That changes the audit target.

Here's the revised plan:


---

Goal

Build a Waybill template picker that:

· Shows Classic and Minimal templates (and future ones)
· Uses the CSR template picker as the design and behavior reference
· Incorporates the InfiniteSlider for smooth, endless looping previews
· Has clear selection state, persists the choice, and fits inside the Waybill PDF customization panel


---

What We Need to Learn from CSR

CSR already has a template picker — it switches between PulseFrame, SignalBands, Zinc, and Crimson. We need to understand exactly how that picker:

1. Lists the templates (UI component, layout)


2. Handles selection (state management, visual feedback)


3. Persists the choice (localStorage key, function call)


4. Passes the chosen template into the PDF rendering pipeline



Once we have that blueprint, we can replicate the same pattern for Waybill, replacing the static grid with the InfiniteSlider for the endless-scroll feel you want.


---

Implementation Steps

Step 1 – Audit the CSR template picker
Read the CSR customization panel (likely a DocumentSheet or settings component) and report:

· File paths and component names
· How templates are listed and selected
· How the selection is persisted
· How it feeds into the PDF rendering

Step 2 – Build the Waybill template picker using CSR's pattern

· Adapt the CSR picker structure for Waybill
· Replace the static grid with InfiniteSlider for the scrolling previews
· Wire selection state, persistence, and PDF prop passing

Step 3 – Create template preview cards for Classic and Minimal

· Generate small, representative thumbnails (static images or simple React-PDF previews)

Step 4 – Integrate into the Waybill PDF customization panel


---

First Prompt (Audit)

I'll generate a prompt to audit the CSR template picker now. It will ask the agent to read the CSR customization UI, trace how templates are selected and persisted, and report the exact patterns we need to replicate.

Shall I generate it?

Prompt.
Can include invoice template picker too

You are working on the BIGDROPS business platform.  
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.  
Runtime: Bun. Never use npm or yarn.  
  
==================================================  
SKILL LOADING PROTOCOL (MANDATORY)  
==================================================  
1. Read `docs/PROJECTSKIILINDEX.md`  
2. Load: `Karpathy`, `shadcn`, `vercel-composition-patterns`  
3. Fallback to direct file read if skill fails. Stop if unreadable.  
4. Read `AGENTS.md` before editing.  
  
==================================================  
REPORTING PROTOCOL (MANDATORY)  
==================================================  
Save report to `docs/Task/reports/template-picker-audit.md`  
  
==================================================  
TASK: Template Picker Audit — CSR & Invoice  
==================================================  
  
You will inspect the existing template picker systems in CSR and Invoice.  
The goal is to understand exactly how they work so a similar picker can be  
built for Waybill. This is a READ-ONLY audit. Do NOT modify any files.  
  
READ FIRST (mandatory):  
- `src/components/csr/CSRPreviewContent.js` — CSR template selection  
- `src/components/csr/CSRPreviewPanel.tsx` — CSR preview panel with template picker  
- `src/components/document-view/csr/CsrDocumentPreview.tsx` — CSR document view  
- `src/pages/ViewInvoice.tsx` — Invoice customization panel  
- `src/components/pdf-new/` — Invoice PDF customization components (template picker likely here)  
- `src/components/pdf-new/DocumentSheet.tsx` or similar — Invoice customization sheet  
- `src/components/pdf-new/IndustryTemplateDesignOverrides.tsx` or similar — Invoice template controls  
- `AGENTS.md`  
- `docs/PROJECTSKIILINDEX.md`  
  
==================================================  
REPORT THESE QUESTIONS FOR EACH SYSTEM  
==================================================  
  
For CSR template picker:  
  
1. Where is the template picker UI rendered? (exact file path and component name)  
2. What are the template options? (list names and how they're defined — constant, config file, etc.)  
3. What UI component is used for selection? (radio group, card grid, dropdown, segmented control)  
4. How is the selected template stored? (state variable name, how it's initialized)  
5. How is the selection persisted? (localStorage key, settings table, or in-memory only?)  
6. How does the selected template flow into the PDF rendering pipeline? (prop name, function call)  
7. What visual feedback shows the currently selected template? (border, checkmark, highlight)  
  
For Invoice template picker:  
  
1. Where is the template picker UI rendered? (exact file path and component name)  
2. What are the template options? (list names and how they're defined)  
3. What UI component is used for selection?  
4. How is the selected template stored?  
5. How is the selection persisted? (localStorage key, function name like `setPdfDesignPreset`)  
6. How does the selected template flow into the PDF rendering pipeline?  
7. What visual feedback shows the currently selected template?  
  
==================================================  
COMPARISON  
==================================================  
  
After reporting both systems, answer:  
  
1. Do they use the same persistence mechanism, or different ones?  
2. Do they share any components or are they completely separate?  
3. Which system is cleaner / easier to replicate for Waybill?  
4. Are there any limitations or bugs in either system that should not be replicated?  
  
==================================================  
OUTPUT  
==================================================  
Save the full report to `docs/Task/reports/template-picker-audit.md`.  
  
The report must include:  
- For each system: file paths, component names, template options, UI pattern, persistence method, data flow  
- A comparison table of the two systems  
- A recommendation for which pattern to follow for Waybill  
- Exact code references (line numbers) for key functions  
  
==================================================  
DO NOT  
==================================================  
- Do NOT modify any files  
- Do NOT run `bun run dev`  
- Do NOT propose Waybill implementation — this is audit only  
- Do NOT skip the work report

Template Picker Audit — CSR vs Invoice

Goal: Audit existing CSR and Invoice template picker systems to understand architecture for replicating a similar picker in Waybill.

Date: 2026-06-19


---

1. CSR Template Picker

Files

File	Purpose

src/components/csr/CSRPreviewContent.js	Template constants: CSR_TEMPLATE_VARIANTS, CSR_TEMPLATE_OPTIONS, getCsrTemplateVariant()
src/components/csr/CSRPreviewPanel.tsx	Picker UI + live preview using inline CSS styles
src/components/document-view/csr/CsrDocumentPreview.tsx	PDF preview renderer receiving theme from preview model


Template Constants (CSRPreviewContent.js:118-150)

// 4 template options with key, label, blurb, accent  
CSR_TEMPLATE_OPTIONS = [  
  { key: '1', label: 'PulseFrame',     blurb: '...', accent: '#1D4ED8' },  
  { key: '2', label: 'SignalBands',     blurb: '...', accent: '#DC2626' },  
  { key: '3', label: 'Zinc Light',      blurb: '...', accent: '#18181B' },  
  { key: '4', label: 'Crimson System',  blurb: '...', accent: '#B91C1C' },  
]

Theme Variants (CSRPreviewContent.js:23-116)

4 themes with full color/font/compact/headerMode/statusStyle configuration (pulseframe, signalbands, zinc, crimson).

Picker UI (CSRPreviewPanel.tsx:360-387)

Inline <div> card grid with JS style={} objects. Each card has:

Custom inline thumbnail via renderTemplateThumb() (line 125-191)

Label + blurb + accent-colored border on active

"Active" text label when selected


Data Flow

template key ('1'..'4')  
  → getCsrTemplateVariant(key)    (CSRPreviewContent.js:145-149)  
    → CSR_TEMPLATE_VARIANTS[variantName]  
      → theme object consumed by CSRPreviewPanel for preview  
      → passed to CsrDocumentPreview.tsx for PDF rendering

Persistence

None. Template key lives only in React state. Not saved to DB. designPreset?: PdfDesignPreset prop is optional and unused in the main CSR view page.


---

2. Invoice Template Picker

Files

File	Purpose

src/domain/invoice/types.ts:80-91	InvoicePdfTemplateId type + normalizeInvoicePdfTemplateId()
src/domain/invoice/normalize.ts:15-26	DEFAULT_INVOICE_PDF_OUTPUT
src/components/document/DocumentDesignControls.tsx	Shared DocumentTemplatePicker, DocumentDesignPanel, DocumentDesignStyleEditor
src/components/document/DocumentActionSheets.tsx	DocumentPdfSheet reusing DocumentTemplatePicker
src/components/document-view/shared/PdfOutputCustomizeSheet.tsx	Full customization sheet with template picker + font/color controls
src/components/document-view/invoice/InvoiceOverlays.tsx:132-146	Wires PdfOutputCustomizeSheet into invoice view
src/components/document-view/invoice/useInvoiceActions.ts:168-182	Persistence logic: saves pdfTemplateId + pdfOutput to custom_fields
src/pages/ViewInvoice.tsx:52	Reads template ID from DB via normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId)
src/components/pdf-new/templates/	5 PDF renderer components (Apex, Bolt, Industry, Ledger, ObsidianReceipt)


Template Constants

Type (types.ts:80-82):

export const INVOICE_PDF_TEMPLATE_IDS = ['industry', 'ledger', 'apex', 'bolt', 'obsidian-receipt'] as const  
export type InvoicePdfTemplateId = (typeof INVOICE_PDF_TEMPLATE_IDS)[number]

Migration (types.ts:88-91):

export function normalizeInvoicePdfTemplateId(value: unknown): InvoicePdfTemplateId | null {  
  if (value === 'naijabiz') return 'apex'  
  return isInvoicePdfTemplateId(value) ? value : null  
}

Picker options (PdfOutputCustomizeSheet.tsx:22-70):

INVOICE_PDF_TEMPLATE_OPTIONS = [  
  { id: 'industry', label: 'Industry', eyebrow: 'Structured', shell, accents, columns },  
  { id: 'ledger',   label: 'Ledger',   eyebrow: 'Editorial', shell, accents, columns },  
  { id: 'apex',     label: 'Apex',     eyebrow: 'Placeholder', shell, accents, columns },  
  { id: 'bolt',     label: 'Bolt',     eyebrow: 'Banner', shell, accents, columns },  
  { id: 'obsidian-receipt', label: 'Obsidian Receipt', eyebrow: 'Elegant', shell, accents, columns },  
]

Each option has Tailwind CSS class strings for visual preview miniatures.

Shared DocumentTemplatePicker — DocumentDesignControls.tsx:74-133

interface DocumentTemplatePickerProps {  
  value: string  
  onChange: (templateId: string) => void  
  templates: Template[]  
}

Renders horizontal scrollable card grid with mini previews

Uses templatePreviewById for 8 preview configurations

Active state: primary border + check circle icon

Tailwind CSS classes throughout


Used by:

PdfOutputCustomizeSheet (Invoice customization sheet)

DocumentPdfSheet (DocumentActionSheets.tsx:244)

BOQ module (BoqCustomizationPanel.tsx)

RFQ module (RfqCustomizationPanel.tsx)


Data Flow

custom_fields.pdfTemplateId (DB JSONB)  
  → ViewInvoice.tsx:52 → normalizeInvoicePdfTemplateId()  
    → pdfTemplateId state  
      → InvoiceOverlays → PdfOutputCustomizeSheet  
        → User picks template → setDraftTemplateId  
          → onSave → handleSaveCustomization  
            → writes pdfTemplateId back to custom_fields

Persistence (useInvoiceActions.ts:168-182)

const handleSaveCustomization = async (nextPdfOutput, _nextPreset, nextTemplateId) => {  
  const nextCustomFields = { ...customFields, pdfOutput: nextPdfOutput, pdfTemplateId: nextTemplateId }  
  await supabase.from("invoices").update({ custom_fields: JSON.stringify(nextCustomFields) })  
  // Also persists design preset locally:  
  setPdfDesignPreset(documentType, draftPreset)  
}

Template ID is persisted per-document in custom_fields.pdfTemplateId (JSONB column).

PDF Renderer Templates

5 components in src/components/pdf-new/templates/:

Industry.tsx + industryStyles.ts + industryTemplateBlocks.tsx

Bolt.tsx + BoltStyles.ts

Apex.tsx + ApexStyles.ts

Ledger.tsx + LedgerStyles.ts

ObsidianReceipt.tsx + ObsidianReceiptStyles.ts



---

3. Comparison Table

Aspect	CSR	Invoice

Template count	4	5 (8 previews in shared component)
Template IDs	String keys '1'..'4'	Typed union: 'industry' | 'ledger' | 'apex' | 'bolt' | 'obsidian-receipt'
Constants location	CSRPreviewContent.js	types.ts + PdfOutputCustomizeSheet.tsx + DocumentDesignControls.tsx
Picker component	Custom inline in CSRPreviewPanel.tsx	Shared DocumentTemplatePicker (used by Invoice, BOQ, RFQ, DocumentPdfSheet)
Thumbnails	Per-variant inline JSX (renderTemplateThumb)	templatePreviewById Tailwind class strings
Style system	Inline CSS style={} objects	Tailwind CSS classes
Persists to DB?	No (state only)	Yes (custom_fields.pdfTemplateId)
Persists design preset?	No (optional prop)	Yes (setPdfDesignPreset)
Reused modules	CSR only	Invoice, BOQ, RFQ, any DocumentPdfSheet
Font/color fine-tuning	Optional designPreset prop	Built-in DocumentTemplateDesignOverrides
Document type support	CSR only	Multiple via PdfDesignPresetDocument
Template → renderer mapping	getCsrTemplateVariant(key) → variant name	Template ID passed to PDF preview directly
Migration path	None	Legacy 'naijabiz' → 'apex' handled



---

4. Recommendation for Waybill

The Invoice pattern is superior for Waybill replication:

1. Define template IDs — Add WaybillPdfTemplateId type in Waybill domain (reuse same 5 IDs or subset)


2. Reuse DocumentTemplatePicker — Drop-in shared component; just pass templates array


3. Reuse PdfOutputCustomizeSheet with designOnly flag (same as Invoice at line 143: designOnly)


4. Persist in custom_fields JSONB — Waybill already has a custom_fields column; follow useInvoiceActions.ts pattern


5. Create waybill PDF templates — Either add new templates in src/components/pdf-new/templates/ or reuse existing Industry/Bolt/etc. for waybill


6. Add normalizeWaybillPdfTemplateId — Following normalizeInvoicePdfTemplateId pattern for validation



Reasons

Shared component avoids duplicating 60 lines of picker UI per module

Persistence means user preferences survive page refreshes

PdfOutputCustomizeSheet provides both template selection and font/color editing in one component

Tailwind CSS keeps styling consistent with the rest of the app

PdfDesignPreset global state means waybill presets persist across all waybills (until overridden per-document)


Deepsek speaking. The audit confirms what I suspected: the Invoice template picker is the platform standard, and CSR's is an isolated, non‑persistent outlier. Here's the way forward based on the audit findings.


---

The Invoice Pattern Is the Correct Choice for Waybill

The audit reveals a clear architectural winner:

Feature CSR Invoice
Persistence None — state only, lost on refresh ✅ Saved to custom_fields.pdfTemplateId per document
Shared component No — custom inline code in CSR only ✅ DocumentTemplatePicker reused by Invoice, BOQ, RFQ
Styling Inline JS style={} objects ✅ Tailwind CSS, consistent with the rest of the app
Template count 4 hardcoded in a JS file ✅ 5 templates with typed IDs, reusable across modules

CSR's picker was built in isolation and never upgraded. Invoice's picker is the platform standard — already shared across three modules. Waybill must follow the Invoice pattern, not the CSR one.


---

Implementation Plan for Waybill Template Picker

We'll build it in two steps, keeping each prompt scoped and verifiable.

Step 1 — Wire the Shared Template Picker

The DocumentTemplatePicker component already exists and is used by Invoice, BOQ, and RFQ. It takes a templates array and an onChange callback. We simply need to:

1. Define the Waybill template options — Classic (current default rendering) and Minimal (the new design). These follow the same shape as INVOICE_PDF_TEMPLATE_OPTIONS in PdfOutputCustomizeSheet.tsx.


2. Wire DocumentTemplatePicker into the Waybill customization panel — the existing DocumentSheet or equivalent in ViewWaybill.tsx.


3. Persist the choice — save the selected template ID to custom_fields.pdfTemplateId (matching the Invoice pattern in useInvoiceActions.ts).


4. Pass the template ID into WaybillPDF.tsx — the template prop already exists; ensure it reads from the persisted value.



Step 2 — Add the InfiniteSlider (Enhancement)

Once the basic picker works, we can optionally wrap the template cards in the InfiniteSlider for the smooth, endless scrolling feel you want. This replaces the static horizontal card grid with an auto‑advancing loop. The selection state and persistence remain unchanged — only the visual presentation changes.


---

What We Skip

· The CSR pattern entirely. CSR's picker doesn't persist, uses inline styles, and isn't reusable. It's a dead end.
· The OrbitalImageWheel. It's a full‑viewport marketing component that hijacks scroll. Wrong tool for a settings panel.
· GSAP or heavy animation libraries. The InfiniteSlider uses motion/react, which is already in the project.


---

Ready to Start

I'll generate the prompt for Step 1 — wiring the shared DocumentTemplatePicker into Waybill. It will:

· Read the Invoice and BOQ implementations as reference
· Define Waybill's template options (Classic, Minimal)
· Wire the picker into the customization panel
· Persist the choice to custom_fields
· Pass the template ID into WaybillPDF.tsx

No new components, no duplication — just connecting Waybill to the existing shared infrastructure.

Generate the prompt now?

But I hope you won't be using invoice templates

Deepsek speaking. I understand your concern — no, I'm not proposing to use Invoice templates for Waybill. Let me clarify exactly what's being reused and what's Waybill-specific.


---

What We're Reusing (UI Infrastructure Only)

The DocumentTemplatePicker component is a generic, shared UI control — a horizontal scrollable card grid with preview thumbnails, selection state, and an onChange callback. It doesn't know anything about Invoice templates. It just takes an array of template options and renders them. Invoice, BOQ, and RFQ all pass their own template options into it.

We're reusing this component to avoid duplicating 60+ lines of picker UI code. That's it.

What's Waybill-Specific

· Template options: Classic (the current default Waybill PDF rendering) and Minimal (the new design based on the corrected portrait HTML). These are Waybill templates, not Invoice templates.
· Persistence: Saved to Waybill's custom_fields.pdfTemplateId, following the same pattern Invoice uses but for Waybill documents only.
· Rendering: The selected template ID is passed into WaybillPDF.tsx via the existing template prop. The rendering logic stays entirely within Waybill's PDF component.

What We're NOT Doing

· NOT replacing Waybill PDF rendering with Invoice's Industry.tsx, Ledger.tsx, or any other Invoice template.
· NOT changing the Waybill PDF structure or data model.
· NOT mixing Invoice and Waybill template options in the same picker.


---

The only thing being borrowed is the picker UI component — a generic card grid. The templates themselves remain 100% Waybill. Ready for the prompt?

Me: prompt

Deepseek: ```
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
SKILL LOADING PROTOCOL (MANDATORY)

1. Read docs/PROJECTSKIILINDEX.md


2. Load: Karpathy, shadcn, vercel-composition-patterns, react-pdf


3. Fallback to direct file read if skill fails. Stop if unreadable.


4. Read AGENTS.md before editing.



==================================================
REPORTING PROTOCOL (MANDATORY)

Save report to docs/Task/reports/waybill-template-picker.md

==================================================
TASK: Waybill Template Picker — Wire Shared Picker + Persistence

Add a working template picker for Waybill PDF templates (Classic & Minimal).
Use the existing shared DocumentTemplatePicker component — do NOT build
a new picker from scratch.

READ FIRST (mandatory):

docs/Task/reports/template-picker-audit.md — audit of Invoice & CSR pickers

src/components/document/DocumentDesignControls.tsx — DocumentTemplatePicker

src/components/document-view/shared/PdfOutputCustomizeSheet.tsx — how Invoice wires the picker

src/components/document-view/invoice/useInvoiceActions.ts — persistence pattern

src/pages/ViewWaybill.tsx — Waybill view page, customization panel entry point

src/components/waybill/WaybillPDF.tsx — template prop already exists

AGENTS.md


==================================================
DEFINE WAYBILL TEMPLATE OPTIONS

Create a new constants file: src/domain/waybill/waybillTemplateOptions.ts

Export an array in the same shape as INVOICE_PDF_TEMPLATE_OPTIONS:

export const WAYBILL_PDF_TEMPLATE_OPTIONS = [  
  {  
    id: 'classic',  
    label: 'Classic',  
    eyebrow: 'Default',  
    // shell + accents + columns are Tailwind class strings for preview miniatures  
    // Use simple placeholder styling for now — the preview is a visual hint, not a full render  
    shell: 'bg-white border shadow-sm',  
    accents: 'bg-slate-100',  
    columns: 'bg-slate-200',  
  },  
  {  
    id: 'minimal',  
    label: 'Minimal',  
    eyebrow: 'Compact',  
    shell: 'bg-white border shadow-sm',  
    accents: 'bg-slate-100',  
    columns: 'bg-slate-200',  
  },  
]

Also export a type: export type WaybillPdfTemplateId = 'classic' | 'minimal'

Define a normalizer:

export function normalizeWaybillPdfTemplateId(value: unknown): WaybillPdfTemplateId {  
  if (value === 'classic' || value === 'minimal') return value  
  return 'classic' // default  
}

==================================================
WIRE PICKER INTO WAYBILL CUSTOMIZATION PANEL

Find the Waybill customization panel — likely a DocumentSheet rendered in
ViewWaybill.tsx or a related overlay component. It may already allow
customizing fonts/colors via DocumentTemplateDesignOverrides.

Add a DocumentTemplatePicker section to this panel, following the EXACT
same pattern used in PdfOutputCustomizeSheet.tsx:

<DocumentTemplatePicker  
  value={draftTemplateId}  
  onChange={setDraftTemplateId}  
  templates={WAYBILL_PDF_TEMPLATE_OPTIONS}  
/>

The value must be the currently selected template ID (or draft).
The templates must be WAYBILL_PDF_TEMPLATE_OPTIONS.
Do NOT use Invoice's INVOICE_PDF_TEMPLATE_OPTIONS.

==================================================
PERSISTENCE

Read the Waybill's existing persistence logic — how custom_fields is saved
and loaded in ViewWaybill.tsx and/or EditWaybill.tsx.

Add pdfTemplateId to the custom_fields write path, matching Invoice's
pattern in useInvoiceActions.ts:

1. On panel save: include pdfTemplateId: draftTemplateId in the
custom_fields update sent to Supabase.


2. On page load: read custom_fields.pdfTemplateId and pass it through
normalizeWaybillPdfTemplateId to get the initial template ID.


3. If custom_fields.pdfTemplateId is null or missing, default to 'classic'.



Use the EXISTING save mechanism — do NOT create a new save path.

==================================================
PASS TEMPLATE TO PDF RENDERER

WaybillPDF.tsx already accepts a template?: 'default' | 'minimal' prop.
Update this prop to accept the new template IDs: template?: 'classic' | 'minimal'.

When template === 'minimal', render the Minimal template (already
implemented via WaybillMinimalContent).
When template === 'classic' (or 'default' for backward compatibility),
render the existing classic/default layout.

The template ID from the picker must flow into this prop when generating
the PDF in the view page.

==================================================
VERIFICATION

1. bun run audit:load


2. bun run typecheck — must pass with zero errors


3. bun run lint — focused on changed files



Manual checks (document in report):

· Open a Waybill → open customization panel → confirm Classic and Minimal
options appear in the template picker
· Select Minimal → save → reopen panel → Minimal is still selected
· Generate PDF → confirm the selected template is used
· Select Classic → confirm the default PDF layout renders
· Confirm no Invoice or CSR files were modified

==================================================
DONE WHEN

· src/domain/waybill/waybillTemplateOptions.ts exists with options + normalizer
· DocumentTemplatePicker renders in Waybill customization panel
· Template choice persists to custom_fields.pdfTemplateId
· Template ID flows into WaybillPDF.tsx and switches rendering
· Classic template still renders correctly
· Minimal template renders correctly when selected
· No new picker component created (reuses DocumentTemplatePicker)
· No Invoice or CSR files modified
· bun run audit:load passes
· bun run typecheck passes with zero errors
· Work report saved

==================================================
DO NOT

· Do NOT create a new template picker component — reuse DocumentTemplatePicker
· Do NOT use Invoice's template options in Waybill
· Do NOT modify CSR files
· Do NOT modify Invoice files
· Do NOT run bun run dev
· Do NOT skip the work report