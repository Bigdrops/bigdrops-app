```markdown
# Shared PDF Customization Extension System

**Project:** BIGDROPS Business Platform  
**Status:** Proposed Architecture  
**Priority:** High  
**Scope:** All PDF‑generating documents  

---

## 1. Problem

Every PDF document currently owns its own customization logic.  
This has already resulted in:

- Waybill customization breaking  
- Invoice implementing customization differently  
- CSR requiring its own implementation  
- Future documents repeating the same plumbing  

This violates one of BIGDROPS’ core principles:

> A document should only define *what* it supports, not *how* customization works.  
> The customization engine should exist **once**.

---

## 2. Goal

Create **one shared PDF Customization Extension** that every document plugs into.

The extension owns:

- persistence  
- switches  
- rendering helpers  
- validation  
- UI  
- preview support  

Each document simply declares:

> "I support Socket 3 and 4."  

Nothing more.

---

## 3. Core Architecture

```

┌─────────────────────────────────┐
│   Shared PDF Customization      │
│   Engine                        │
└─────────────────────────────────┘
│
▼
┌─────────────────────────────┐
│  Socket 1 │  Socket 2       │
│  Socket 3 │  Socket 4       │
└─────────────────────────────┘
▲
│
┌─────────┼────────────┐
│         │            │
Invoice   Quotation    Receipt
plugs 1,2  plugs 1,2   plugs 2
│         │            │
└─────────┼────────────┘
│
CSR        Waybill
plugs 1,2,3,4  plugs 3,4

Future documents plug whatever they need.

```

---

## 4. The Four Sockets

### Socket 1 – Template Accent Override

**Purpose**  
Override the template’s accent colour.

**Examples**
- **Invoice:** borders, headings, totals, section titles
- **CSR:** headers
- **Waybill:** can ignore completely

**Switch**  
`Use custom accent`

**Value**  
`#0057D8`

If disabled, the document uses its native template accent.

---

### Socket 2 – PDF Font Override

**Purpose**  
Replace the document typography.

**Examples**  
Invoice: `Roboto` → `Inter` → `Helvetica` → `Poppins`  
Entire document changes, except fillable handwriting if Socket 3 is enabled.

**Switch**  
`Use custom document font`

**Value**  
`Inter`, `Helvetica`, `Roboto`, `Poppins`, etc.

**Priority**  
`Fillable text → Ink font (if enabled) → Document font → Template default`

---

### Socket 3 – Ink Font

**Purpose**  
Only affects fillable text.

**Example**  
Company: `Inter`  
Customer Name: `Patrick Johnson` → becomes handwritten-style using  
`Patrick Hand`, `Caveat`, `Kalam`, `Dancing Script`, etc.  
Everything else stays normal.

**Switch**  
`Use handwriting font`

**Value**  
`Patrick Hand`, `Caveat`, `Kalam`, …

---

### Socket 4 – Ink Colour

**Purpose**  
Only affects fillable content (e.g., customer, signature, vehicle, driver, receiver, Waybill No).  
**Not** headers, tables, or branding.

**Switch**  
`Use custom ink colour`

**Value**  
`Black`, `Blue`, `Dark Blue`, `Green`, `Red`, etc.

---

## 5. Priority Order

**Rendering priority**  
```

Fillable text
↓
Socket 4 (Ink Colour)
↓
Socket 3 (Ink Font)
↓
Socket 2 (Document Font)
↓
Template defaults

```

**Accent**  
```

Socket 1
↓
Template Accent

```

---

## 6. UI

Every document opens exactly the same component: **Customize PDF**.

The engine receives `supportedSockets`.

**Examples**

| Document | Accent | Document Font | Ink Font | Ink Colour |
|----------|--------|---------------|----------|------------|
| Invoice  | ✓      | ✓             | ✗        | ✗          |
| Waybill  | ✗      | ✗             | ✓        | ✓          |
| CSR      | ✓      | ✓             | ✓        | ✓          |
| Receipt  | ✗      | ✓             | ✗        | ✗          |

Disabled sockets simply don’t render – no duplicated UI.

---

## 7. Configuration Contract

Every PDF declares its capabilities:

```typescript
export interface PdfCustomizationCapabilities {
  accent: boolean;
  documentFont: boolean;
  inkFont: boolean;
  inkColour: boolean;
}
```

Examples

```typescript
// Waybill
export const WaybillCapabilities = {
  accent: false,
  documentFont: false,
  inkFont: true,
  inkColour: true,
};

// Invoice
export const InvoiceCapabilities = {
  accent: true,
  documentFont: true,
  inkFont: false,
  inkColour: false,
};

// CSR
export const CSRCapabilities = {
  accent: true,
  documentFont: true,
  inkFont: true,
  inkColour: true,
};
```

---

8. Shared Engine Responsibilities

The shared engine owns:

· settings persistence
· defaults
· validation
· UI
· switch state
· colour picker
· font picker
· font registration
· style helpers
· capability filtering
· migration
· future expansion

Individual documents own only:

· declaring supported sockets
· consuming resolved values where applicable

No document should implement its own customization UI or persistence.

---

9. Extensibility

Future sockets can be added without changing existing documents.

Examples of future sockets:

· Socket 5 – Page Background
· Socket 6 – Watermark
· Socket 7 – Stamp Style
· Socket 8 – Border Style

Older documents remain compatible because unsupported sockets are ignored by capability filtering.

---

10. Migration Plan

Phase 1

Extract all PDF customization logic into a shared engine. No behavioural changes.

Phase 2

Implement capability registration for every document type.

Phase 3

Migrate:

· Invoice
· Quotation
· Receipt
· CSR
· Waybill
  to consume the shared engine.

Phase 4

Remove duplicated customization components and document‑specific persistence logic.

---

11. Acceptance Criteria

· One shared customization engine exists for all PDF documents.
· Every document exposes a simple capability declaration instead of custom UI logic.
· The customization modal automatically displays only the controls supported by the current document.
· Waybill regains working Ink Font and Ink Colour customisation.
· Invoice continues to support Template Accent and Document Font without regression.
· Adding a new PDF document requires only declaring its supported sockets and consuming the resolved values, without creating new customisation infrastructure.
· Future customisation options can be added as new sockets without modifying existing documents that do not use them.

---

This design keeps customisation infrastructure centralised while allowing each document type to opt into only the features that make sense for its layout and use case.

```