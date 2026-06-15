Waybill Form — Fix Roadmap & Acceptance Criteria

Document: docs/waybillfixroadmap.md
Date: June 11, 2026
Status: Awaiting Client Approval

---

1. Problem Inventory

A — Architecture Violations

ID Problem Fix
A1 Type and Status are form dropdowns Type chosen at gateway. Status always 'dispatched'. Remove both from form.
A2 Sender field blocks save Delete sender/receiver save validation. See Section 4 for actual blockers.
A3 Save fails silently Generate actual waybill number. Set purpose for external. Surface all DB errors to user.
A4 Blank template exports CSV Must export PDF with pen-and-ink lines per Architecture Section 2.2.

B — Layout Failures

ID Problem Fix
B1 Gateway is a tiny modal with giant margins Full-screen edge-to-edge overlay.
B2 Gateway cards order: Internal first External first, then Internal.
B3 Gateway clipped by bottom nav Render via portal, z-index above shell.
B4 Dashboard shell on form (hamburger, search, tabs) Form is a clean overlay. No shell chrome.
B5 Card wrappers around every section Use SectionLabel dividers only. No boxes.
B6 Date and Time stacked vertically Share one two-column row.
B7 All fields full-width Pair fields into two-column rows: DATE \| TIME, PLATE \| DRIVER.
B8 Waybill number shows [Auto-generated] Show actual generated number, prominent, monospace.
B9 Client picker is cramped dropdown Prominent block: briefcase icon, title, selected name, chevron. Matches Invoice CLIENT card.
B10 Line items toolbar missing Import Items + Table Settings toolbar above table. Delete rogue "Import extraction" button.
B11 Condition column visible by default Hidden until auto-scan finds non-empty data.
B12 Table bleeds off viewport Contain within viewport. Horizontal scroll only if necessary.
B13 Floating save button missing; Save in top bar Use Invoice form's FAB component. Delete top-bar Save.
B14 Sender/Receiver at top of form Move below items table.
B15 Three notes fields (General, Sender, Receiver) One notes field. Editable title. Rich text toolbar.
B16 Terms & Conditions prefilled with unapproved text Blank by default. Editable. Obeys Table Settings visibility.

C — Field Logic Errors

ID Problem Fix
C1 Transport mode defaults to "Vehicle" Default blank. Options: Vehicle, Hand, Courier, Blank (null). Keep existing compact dropdown style.
C2 Incorrect save blockers Only 4 blockers exist. See Section 4.
C3 Signature bloat: Status, Confidence, Evidence Delete all three.
C4 No signature eye toggles Three toggles: Global (hide section), Sender, Receiver.
C5 Receiver signature missing conditional sources External: Upload + Draw only. Internal: Saved + Upload + Draw.
C6 Sender signature missing 3 sources Saved, Upload, Draw.

D — Feature Placement

ID Problem Fix
D1 Blank template on form Move to gateway overlay: two download cards (External PDF, Internal PDF).
D2 Column creation outside Table Settings All column management in Table Settings. Pre-created catalog only.
D3 Auto-fill corporate address missing Add "Use Company Address" action below Delivery Address field.

---

2. Column System Specification

Available Columns (Pre-Created, Managed in Table Settings Only)

Column Default Visible Title Editable Input Type
S/N Always No Auto-increment
Description Yes Yes Free text
Qty Yes Yes Numeric only
Unit Yes Yes Free text
Make No Yes Free text (brand)
Part No No Yes Free text
Condition No Yes Free text
Custom Column No Yes Free text

· Only 3 columns shown by default: S/N, Description, Qty. Unit is default-visible but toggleable.
· All column titles editable in Table Settings (e.g., Description → Items, Make → Brand).
· No column creation outside Table Settings.
· Qty is strictly numeric. All other columns accept any input.

Auto-Hide Rule

· Applies to columns, not rows.
· A column auto-hides when all rows are empty for that column.
· If even one row has data, the column remains visible.
· This is separate from Table Settings toggle (manual override).

Table Settings

· Single centralized modal for: column visibility, column title editing, column ordering.
· Terms & Conditions visibility controlled here — no special permissions, no eye toggle.
· If Terms is blank, it does not render on PDF.

---

3. Component Tree

```
Gateway Overlay (full-screen, portal-rendered)
├── Header: Close, "Create New Waybill", "Select Document Type"
├── Card: External / Client Delivery Note
├── Card: Internal Transfer Note
├── Card: Download Blank External Template (PDF)
└── Card: Download Blank Internal Template (PDF)

Form Overlay (full-screen, portal-rendered, no shell chrome)
└── WaybillForm
    ├── Type badge pill
    ├── Waybill Number (prominent, monospace, actual generated number)
    ├── Row: DATE | TIME
    ├── Client Picker Block (external only) — matches Invoice CLIENT card
    ├── Row: LINKED INVOICE (eye toggle) | P.O. NUMBER (eye toggle)
    ├── SectionLabel "Transport Details"
    │   ├── Transport Mode (compact dropdown, blank default, Vehicle/Hand/Courier/Blank)
    │   ├── Row: VEHICLE PLATE | DRIVER NAME
    │   └── Interlocking: Hand/Courier → hide Plate
    ├── SectionLabel "Line Items" + count badge
    │   ├── Toolbar: Import Items | Table Settings | Rows
    │   └── Table (3 default columns, auto-hide, no bleed)
    ├── SectionLabel "Custody Details"
    │   └── Row: DELIVERED BY | RECEIVED BY
    ├── SectionLabel "Signatures" + 3 eye toggles (Global, Sender, Receiver)
    │   ├── Sender block (3 sources: Saved, Upload, Draw)
    │   └── Receiver block (External: Upload, Draw. Internal: Saved, Upload, Draw)
    ├── SectionLabel "Notes" (editable title, rich text toolbar)
    ├── CollapseCard "Terms & Conditions" (blank default, editable, obeys Table Settings)
    └── Floating Save Button (Invoice form's FAB, bottom-right)
```

---

4. Save Validation — Only 4 Blockers

# Condition Scope
1 Client account not selected External only
2 Waybill number missing or invalid All
3 Line items list empty All
4 Any item missing Description or Qty ≤ 0 All

Nothing else blocks save. Sender, receiver, driver, plate, transport mode, signatures, notes, terms — all optional.

---

5. Signature Specification

Toggles (3)

· Global: Hides entire Signatures section.
· Sender: Hides "Delivered By" signature block.
· Receiver: Hides "Received By" signature block.

Sender Sources (3)

· Saved in-app signature.
· Upload (file picker).
· Draw (canvas).

Receiver Sources

· External: Upload, Draw (no Saved — receiver is a client without a profile).
· Internal: Saved, Upload, Draw (receiver is a staff member).

PDF Fallback

· Hidden or empty signature blocks render as blank signable space on PDF.

---

6. Notes Specification

· One notes field. No sub-sections (no General/Sender/Receiver split).
· Title is editable inline (tap "Notes" label → rename to "Book" or anything).
· Rich text toolbar: Bold, Italic, Underline, Strikethrough, Bulleted List, Numbered List, Blockquote, Code Block.
· Content stored as formatted text (HTML/Markdown).
· PDF renderer respects formatting.

---

7. Terms & Conditions Specification

· Blank by default. Not prefilled.
· Editable by the operator per waybill.
· Visibility controlled by Table Settings. No eye toggle. No special permissions.
· If blank, does not render on PDF.
· Standard T&C text available as a suggestion but never auto-populated.

---

8. Acceptance Criteria

Gateway

· Full-screen overlay, portal-rendered, not clipped by bottom nav.
· External card first, Internal second.
· Two "Download Blank Template" cards (External PDF, Internal PDF).
· Blank template downloads PDF, burns tracking number, inserts into blank_waybill_logs.

Form Layout

· No dashboard shell chrome (no hamburger, search, bottom tabs).
· No Card boxes. SectionLabel dividers only.
· Waybill number is prominent, monospace, actual generated number.
· DATE | TIME in one row.
· Client picker block matches Invoice CLIENT card (icon, title, name, chevron).
· LINKED INVOICE | P.O. NUMBER in one row with eye toggles.
· Transport Mode: blank default, compact dropdown, Vehicle/Hand/Courier/Blank.
· VEHICLE PLATE | DRIVER NAME in one row.
· Hand or Courier → Vehicle Plate removed from DOM.
· Line Items: Import Items + Table Settings toolbar. No "Import extraction" button.
· Part No. and Condition hidden by default. Auto-show on data.
· Table fits viewport. No column bleed.
· Delivered By and Received By below items table.
· Signatures: 3 eye toggles. Sender 3 sources. Receiver conditional sources. No bloat fields.
· One Notes field with editable title + rich text toolbar.
· Terms & Conditions blank by default, editable, Table Settings controlled.
· Floating Save button (Invoice's FAB) in bottom-right. No Save in top bar.

Table Settings

· Pre-created columns only: S/N, Description, Qty, Unit, Make, Part No, Condition, Custom Column.
· Default visible: S/N, Description, Qty, Unit.
· Unit toggleable.
· Qty locked to numeric input.
· All column titles editable.
· Terms & Conditions visibility controlled here.

Validation

· Saving with blank sender/receiver succeeds.
· Saving with no client (External) fails with clear error.
· Saving with empty items fails.
· Saving with item missing description or qty ≤ 0 fails.
· Fully valid waybill saves and appears in list.
· All errors surfaced to user. No silent failures.

Technical

· bun run typecheck — zero errors.
· bun run lint — no new errors.
· bun run audit:load — no regressions.

---

9. Implementation Order

Step Task
1 Portal-render overlays, fix z-index
2 Fix save pipeline (number gen, purpose, error surfacing)
3 Rebuild gateway overlay (cards + blank download cards)
4 Strip form: remove type/status dropdowns, bloat fields, 3 notes → 1
5 Kill Card wrappers, add SectionLabel dividers
6 Build top block (badge, number, date/time, client picker, linked invoice/PO)
7 Build transport section with interlocking
8 Build line items section with toolbar, 3 default columns, auto-hide
9 Build sender/receiver below items
10 Build signatures section (3 toggles, conditional sources)
11 Build notes with editable title + rich text
12 Build Terms & Conditions (blank, editable, Table Settings controlled)
13 Add Invoice's FAB, remove top-bar Save
14 Build Table Settings modal (column catalog, visibility, titles, T&C toggle)
15 Implement 4 save blockers only
16 Implement blank template PDF download
17 Full verification: acceptance checklist + typecheck + lint + audit