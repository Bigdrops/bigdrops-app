# Shared PDF Customization Extension System

**Project:** BIGDROPS Business Platform  
**Status:** Locked Architecture (Frozen)  
**Priority:** High  
**Scope:** All PDF-generating documents  
**Last Updated:** 2026-07-08

---

## 1. Problem

Every PDF document currently owns its own customization logic. This has resulted in Waybill customization breaking, Invoice implementing customization differently, CSR requiring its own implementation, and future documents repeating the same plumbing. This violates one of BIGDROPS' core principles: **a document should only define what it supports, not how customization works.** The customization engine should exist once.

---

## 2. Goal

Create one shared **PDF Customization Engine** that every document plugs into. The engine owns persistence, switches, validation, resolution of saved settings into a ready-to-use theme, font registration, UI, and preview support. Each document declares its capabilities and policy; the engine produces a resolved customization object that templates consume directly. Templates never inspect switches, check capabilities, or compute fallbacks.

---

## 3. Core Architecture

```

┌─────────────────────────────────────────────────────────┐
│                    Template Defaults                    │
│                 (mandatory per template)                │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                  Customization Policy                   │
│                 (allowed values, defaults)              │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                     Capabilities                        │
│                 (what sockets are enabled)              │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                    Saved Settings                       │
│                 (what the user chose)                   │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                    Resolver                             │
│              (pure function, deterministic)             │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                    Font Registry                        │
│      (registers fonts based on resolved theme)          │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│               PdfCustomizationTheme                     │
└─────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────┐
│                   Template Renderer                     │
└─────────────────────────────────────────────────────────┘

```

---

## 4. The Four Sockets

Each socket is completely independent. The only interaction is that Ink Font and Ink Colour override the Document Font and template default ink colour **only for fillable content**.

### Socket 1 — Template Accent
**Purpose:** Override the template's accent color.  
**Affected elements:** Borders, headings, totals, section titles, template-specific accents.  
**If disabled:** Engine returns the template's default accent.

### Socket 2 — Document Font
**Purpose:** Override the document typography for all text.  
**Affected elements:** Headers, labels, body text, table text, branding, notes, fillable text.  
**Exception:** Fillable content uses Ink Font (Socket 3) if enabled — otherwise inherits Document Font.  
**If disabled:** Engine returns the template's default document font.

### Socket 3 — Ink Font
**Purpose:** Override the font for fillable content only.  
**Affected elements:** All fillable content (see Section 6).  
**If disabled:** Fillable content inherits the Document Font or template default.

### Socket 4 — Ink Colour
**Purpose:** Override the colour for fillable content only.  
**Affected elements:** All fillable content (see Section 6).  
**If disabled:** Fillable content uses the template's default fillable colour.

---

## 5. Document Font Inheritance Law (Mandatory)

Document Font is the base typography for the entire PDF. If Ink Font is disabled, fillable content **MUST** inherit the Document Font.

| Configuration | Non-fillable text | Fillable text |
|---------------|-------------------|---------------|
| No customization | Template default font, default colour | Template default font, default colour |
| Document Font only | Document Font | Document Font, default colour |
| Document Font + Ink Font | Document Font | Ink Font, default colour |
| Document Font + Ink Colour | Document Font | Document Font, Ink Colour |
| Document Font + Ink Font + Ink Colour | Document Font | Ink Font, Ink Colour |

This inheritance is **mandatory**.

---

## 6. Separation: Capabilities vs. Policy

Capabilities (what is supported) and Policy (what values are allowed) evolve at different rates and are kept separate.

### Capabilities

```typescript
export interface PdfCustomizationCapabilities {
  accent: boolean;
  documentFont: boolean;
  inkFont: boolean;
  inkColour: boolean;
}
```

Capabilities almost never change once a document type is established.

Policy

```typescript
export type PdfFontId = string;
export type PdfColourId = string;

export interface PdfCustomizationPolicy {
  accent?: { default: PdfColourId; allowed: PdfColourId[] };
  documentFont?: { default: PdfFontId; allowed: PdfFontId[] };
  inkFont?: { default: PdfFontId; allowed: PdfFontId[] };
  inkColour?: { default: PdfColourId; allowed: PdfColourId[] };
}
```

The policy is the whitelist. New fonts and colours are added to the policy, not the type system. This makes future custom fonts or uploaded fonts possible without changing the engine.

Policies change frequently — new colours are added, fonts are updated, defaults are refined. Keeping them separate from capabilities prevents breaking changes.

Example — Waybill

```typescript
export const WaybillCapabilities: PdfCustomizationCapabilities = {
  accent: false,
  documentFont: false,
  inkFont: true,
  inkColour: true,
};

export const WaybillPolicy: PdfCustomizationPolicy = {
  inkFont: {
    default: 'Patrick Hand',
    allowed: ['Patrick Hand', 'Caveat', 'Kalam', 'Handlee', 'Reenie Beanie'],
  },
  inkColour: {
    default: '#000000',
    allowed: ['#000000', '#1A1A1A', '#003399', '#006400', '#800000', '#4B0082'],
  },
};
```

---

7. What Is "Fillable Content"

The following are considered fillable and MUST use the resolved Ink Font and Ink Colour when enabled:

· Handwritten values (customer name, vehicle, driver, receiver, notes)
· Typed values appearing in fillable fields
· Check marks (✓), tick boxes (☑), X marks (☒), circles (○)
· Manually entered dates
· Manually entered numbers
· Signature labels (the text "Signature:" — not the image)
· Initials

Rule: If a human would normally write it with a pen on paper, it is fillable.

Not fillable: Headings, table headers, branding, template decorations, signature images, page numbers, footer text.

---

8. Template Defaults (Mandatory)

Every PDF template MUST export a PdfTemplateDefaults object. It is mandatory — no exceptions.

```typescript
export interface PdfTemplateDefaults {
  accentColor: PdfColourId;
  documentFont: PdfFontId;
  fillable: {
    font: PdfFontId;
    color: PdfColourId;
  };
}
```

This represents what the template would use if no customization existed at all. It is the fallback for every socket.

```typescript
const WaybillTemplateDefaults: PdfTemplateDefaults = {
  accentColor: '#0F172A',
  documentFont: 'Inter',
  fillable: {
    font: 'Patrick Hand',
    color: '#000000',
  },
};
```

---

9. PdfCustomizationTheme (Fully Resolved, No Nullable Fields)

The theme object contains only required fields. Every property is already fully resolved. Templates never handle undefined, null, or fallback logic.

```typescript
export interface PdfCustomizationTheme {
  accentColor: PdfColourId;
  documentFont: PdfFontId;
  fillable: {
    font: PdfFontId;
    color: PdfColourId;
  };
  metadata: {
    family: string;
    version: number;
  };
}
```

The metadata field is for debugging and future migrations. Templates MUST ignore it for rendering.

---

10. Resolver (Pure Function)

The resolver transforms template defaults, saved settings, policy, and capabilities into a PdfCustomizationTheme object. It is a pure function — same inputs produce identical output.

```typescript
function resolvePdfCustomization(
  templateDefaults: PdfTemplateDefaults,
  savedSettings: PdfCustomizationSettings | null,
  capabilities: PdfCustomizationCapabilities,
  policy: PdfCustomizationPolicy,
): PdfCustomizationTheme;
```

Resolver Purity Law

The resolver MUST NOT:

· access storage (localStorage, sessionStorage, etc.)
· register fonts
· mutate state
· log production errors
· perform rendering
· know about UI components (hex inputs, swatches, React, hooks, etc.)
· access the DOM

The resolver receives:

· Template Defaults (mandatory)
· Capabilities (what's supported)
· Policy (allowed values + defaults)
· Saved Settings (user choices)

It produces:

· PdfCustomizationTheme — fully resolved, all fields required, no fallbacks needed by templates.

Resolver Logic

For each socket:

1. If the socket is disabled in capabilities → use the template default.
2. If the socket is enabled but no saved value exists → use the policy default.
3. If the socket is enabled and a saved value exists → validate against policy.allowed.
   · If valid → use it.
   · If invalid → use the policy default and log a development warning (never silently fall back to a different value).

Templates never call resolvePdfCustomization themselves. The engine calls it, and the template receives the theme object as a prop.

---

11. Font Registry Layer

Font registration is a separate layer between the Resolver and the Renderer.

```
Resolver
    ↓
PdfCustomizationTheme
    ↓
Font Registry  ← registers fonts based on resolved theme
    ↓
Renderer
```

Font Registry Responsibilities

· Register Google Fonts (via @font-face or equivalent)
· Register embedded fonts
· Register licensed fonts
· Support future custom uploaded fonts

The resolver must not know that fonts require registration. The engine handles font registration based on the resolved theme.

Font Registration Timing (Strict Sequence)

```
Application loads
       ↓
Customization loaded (localStorage → saved settings)
       ↓
Policy loaded
       ↓
Theme resolved (pure function)
       ↓
Fonts registered (Font Registry layer)
       ↓
PDF rendered
```

Never: render → register → hope it works.

Font Registration Rule

Font registration is owned entirely by the shared engine.

Templates MUST NOT register fonts.

Templates simply receive the resolved customization and render using it.

---

12. Rendering Law (Mandatory)

This is a project law, not a guideline.

Templates MAY ONLY consume PdfCustomizationTheme.

Templates MAY NOT:

· read localStorage
· inspect saved settings
· inspect switches
· inspect capabilities
· inspect policy
· perform validation
· compute fallback values (??, ||, ?: for customization values)
· resolve defaults
· register fonts
· perform capability checks

All customization decisions occur before rendering. Every property in PdfCustomizationTheme is already fully resolved.

Templates can safely do:

```tsx
const theme = usePdfCustomization(documentFamily, capabilities, policy);
// theme.accentColor is always defined, never null, never optional.
```

Templates must never do:

```tsx
const accent = savedSettings?.accentColor ?? '#000000'; // FORBIDDEN
```

---

13. Engine Boundary

Engine Owns Templates Own
Persistence Rendering
Migration Layout
Validation Typography placement
Defaults Spacing
Font registration Page flow
Resolver —
UI —
Preview —
Storage versioning —
Capability filtering —

---

14. Shared Engine Responsibilities

The shared engine exclusively owns:

· Persistence — standardised storage key per document family
· Settings versioning — version: 1 in saved settings
· Validation — only values within policy.allowed are stored; invalid values trigger a development warning and fall back to the policy default
· Resolution — pure function producing PdfCustomizationTheme
· UI — a single PdfCustomizationPanel component that receives capabilities and renders only allowed controls
· Font registration — the engine registers all fonts based on the resolved theme
· Capability filtering — the UI automatically hides unsupported sockets
· Font Registry — separate layer between resolver and renderer

---

15. Saved Settings (Versioned)

Settings are versioned to support future migrations without guesswork.

```typescript
export interface PdfCustomizationSettings {
  version: 1;
  accentColor?: PdfColourId;
  documentFont?: PdfFontId;
  inkFont?: PdfFontId;
  inkColour?: PdfColourId;
}
```

When v2 arrives, the engine's migration layer transforms v1 → v2 without losing user preferences.

---

16. Document Family Registry

Instead of scattering raw strings like 'logistics', define them once.

```typescript
export const PdfDocumentFamily = {
  COMMERCIAL: 'commercial',
  LOGISTICS: 'logistics',
  RECEIPT: 'receipt',
} as const;

export type PdfDocumentFamily = (typeof PdfDocumentFamily)[keyof typeof PdfDocumentFamily];
```

Family Documents Storage Key
Commercial Invoice, Quotation pdf_customization_commercial
Logistics Waybill, CSR pdf_customization_logistics
Receipt Receipt pdf_customization_receipt

---

17. UI

Every document opens exactly the same component:

```
┌─────────────────────────────────────────────────────────┐
│  Customize PDF                                         │
│                                                         │
│  [Socket 1: Template Accent]    ← shown if capabilities.accent = true   │
│  [Socket 2: Document Font]      ← shown if capabilities.documentFont = true │
│  [Socket 3: Ink Font]           ← shown if capabilities.inkFont = true    │
│  [Socket 4: Ink Colour]         ← shown if capabilities.inkColour = true  │
│                                                         │
│  [Save Settings]                                        │
└─────────────────────────────────────────────────────────┘
```

Colour picker UX: Five colour swatches plus one mirroring the active colour, plus a hex input field. Swatches and hex stay synchronised. This UX is shared across all documents.

---

18. Standard Creation Rule

After the first document (Waybill) is fully integrated, publish the standard at docs/standard/pdf-customization-extension-standard.md:

1. Capability declaration pattern
2. Policy declaration pattern
3. Template defaults (mandatory)
4. Resolver usage
5. Hook usage: usePdfCustomization(documentFamily, capabilities, policy)
6. Panel wiring: <PdfCustomizationPanel capabilities={capabilities} policy={policy} />
7. Font registration: registerPdfFonts(theme)
8. Persistence key convention via PdfDocumentFamily
9. Definition of fillable content
10. Checklist for adding a new document type

---

19. Migration Plan

Phase Scope Deliverable
1 Build shared engine (types, resolver, hook, panel, font registration) — no document uses it yet Engine exists, unused
2 Integrate Waybill + create standard Waybill uses engine; standard published
3 Migrate CSR CSR uses engine
4 Migrate Invoice & Quotation Invoice & Quotation use engine
5 Clean up Remove duplicated components and document-specific persistence keys
6 Final verification Remove legacy customization hooks, deprecated persistence keys, duplicate font registration logic. Verify every supported PDF document consumes only the shared engine.

---

20. Extensibility

Future sockets are natural extension points:

· Socket 5 — Watermark
· Socket 6 — Border Style
· Socket 7 — Background
· Socket 8 — Page Number Style
· Socket 9 — QR Style
· Socket 10 — Stamp Style

Older documents remain compatible — unsupported sockets are ignored by capability filtering.

Adding a new socket requires only:

1. Adding the field to capabilities (default false)
2. Adding the field to policy (optional)
3. Adding UI to the panel (gated by capability)
4. Updating the resolver
5. Updating the standard

---

21. Logo — Never Customizable

Logos belong to branding (company settings), not customization. They are not a socket, not a capability, not part of PdfCustomizationTheme. Templates read the logo directly from company branding.

---

22. Key Design Decisions

Decision Rationale
Resolver is a pure function Same inputs → same output. No side effects. Trivial to test.
Four independent sockets Users change ink colour without changing ink font, and vice versa.
Capabilities separate from Policy Capabilities rarely change; policies change often. Keeps evolution safe.
fillable object in theme Future properties (opacity, stroke weight) can be added without touching templates.
Document family persistence Invoice + Quotation share commercial identity. Waybill + CSR share logistics identity.
Settings versioned v1 → v2 migration becomes deterministic.
No silent fallbacks Invalid values trigger warnings and fall back to policy defaults — never silently swap to something else.
Standard created after one document Waybill is the hardest case; the standard will be battle-tested, not theoretical.
Logo excluded Branding is a company setting, not a per-document customisation option.
Fillable content explicitly defined Removes ambiguity: if a human would write it with a pen, it's fillable.
Extensible types (PdfFontId = string) Policy is the whitelist. New fonts don't require core type changes.
Engine owns all font registration Prevents fragmented font loading across templates.
PdfCustomizationTheme has no optional fields Templates never handle undefined or null for customization values.
Font Registry separate layer Supports Google fonts, embedded fonts, licensed fonts, custom uploaded fonts.
metadata field in theme Debugging and future migrations — templates ignore it.
Templates MAY ONLY consume theme Single source of truth for all customization decisions.
Final cleanup phase in migration Ensures no transitional code remains after migration completes.

---

23. Summary of Amendments Applied (v1.1)

Amendment Source Section
Extensible PdfFontId and PdfColourId (type = string) Architect §6
Rename ResolvedPdfCustomization → PdfCustomizationTheme Architect §9
Strongly type theme with PdfFontId / PdfColourId ChatGPT + Architect §9
Strengthen Rendering Law ("MAY ONLY") ChatGPT + Architect §12
Add Phase 6 to Migration Plan ChatGPT + Architect §19
Resolver must be UI-independent ChatGPT + Architect §10
Split Font Registry as separate layer Architect §11
No optional/nullable fields in theme Architect §9
Add metadata field for debugging Architect §9
Document Font Inheritance Law Architect §5

---

This is the final, frozen architecture — ready for implementation.

```

---

