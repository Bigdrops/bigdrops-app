# Design Rationale — Waybill V2 & CSR Prototypes

**Date:** 2026-09-02  
**Author:** opencode (mimo-v2.5-free)

---

## Waybill V2 — Why Not Invoice-Derived

### Domain Distinction
Waybill = movement/delivery/transport. It answers: "What is moving, where, and how?"  
Invoice = financial document. It answers: "What was sold, for how much, and what taxes apply?"

The V1 prototype failed because it cloned the Invoice UI (items with price/VAT/discount/subtotal/grand total). Waybill items don't have prices. They have conditions, weights, and customs status.

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No financial fields** | Items show description, quantity, unit, weight, condition — no price, VAT, discount, subtotal, or grand total. This is a delivery document, not a sales document. |
| **Transport mode as first-class UI** | The transport grid (Road/Air/Sea/Rail/Courier) sits at the top with icon pills. On an invoice, there is no transport concept. On a waybill, it's the primary classification. |
| **Purpose chips** | Sale/Return/Transfer instead of Invoice/Credit/Debit. The language matches logistics, not accounting. |
| **Condition badges** | New/Used/Refurbished badges on items. Invoice items have no "condition" concept — they have line item descriptions. Waybill condition tracking is critical for customs and insurance. |
| **Customs status per item** | Cleared/Pending/Exempt. This is logistics-specific. No invoice prototype has this. |
| **Two signatures** | Sender (dispatch confirmation) + Receiver (delivery confirmation). Invoice has signatory blocks for financial approval. Waybill signatures confirm physical handoff. |

### Popup vs Inline

| Aspect | Popup/Sheet | Inline |
|--------|-------------|--------|
| **Editing** | Tap card → bottom sheet slides up | All fields visible, edit in-place |
| **Add item** | FAB → full bottom sheet | Dashed "+ Add Item" button expands inline |
| **Signature** | Full-screen overlay with canvas | Inline canvas expands below signature row |
| **Best for** | Focused single-item editing | Quick multi-item review and edits |
| **Same data** | ✅ Identical capabilities | ✅ Identical capabilities |

### Android-Specific Choices
- **One-hand reach:** Transport pills and purpose chips are within thumb zone (bottom 60% of screen)
- **Touch targets:** All tappable elements ≥ 44px height
- **Bottom nav:** Details/Items/Sign/PDF — four tabs, thumb-reachable
- **No horizontal scroll:** Grid layouts use 5-column (transport) and 3-column (purpose) to fit 375px width
- **Safe areas:** `env(safe-area-inset-bottom)` for iOS/Android notch and home indicator

---

## CSR Form — Field Service Domain

### Domain Distinction
CSR = field service record. It answers: "What did the technician find, what did they do, and what did they use?"  
Invoice = financial record.  
Waybill = movement record.

CSR is the most complex of the three because it combines:
1. Client information (who called)
2. Equipment details (what was serviced)
3. Service execution (what was done)
4. Materials tracking (what was consumed)
5. Operational readings (what the equipment is doing now)
6. Dual signatures (technician + client acknowledgement)

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Progress stepper** | Four-step visual indicator (Client → Equipment → Service → Sign) gives field technicians a clear sense of completion. Invoices don't need this — they're filled linearly. CSRs jump between sections. |
| **Call type icons** | Repair/Maintenance/Installation with visual icons. Field techs scan these quickly in bright sunlight. Text-only labels are harder to parse on mobile outdoors. |
| **System Down toggle** | A prominent red toggle for "equipment non-operational" — this is a critical field service concept. It affects response SLAs and escalation. No equivalent in invoices or waybills. |
| **Service basis chips** | Contract/Warranty/Chargeable determines billing treatment. This is the one financial concept in CSR — it determines who pays, not how much. |
| **Inline equipment grid** | 2-column grid for equipment fields (type, make, model, serial, location, capacity). Compact for mobile, all fields visible without scrolling. |
| **Materials as editable rows** | Inline editing with delete buttons. Materials are consumed during service — tracking them matters for inventory and cost recovery. |
| **Operational readings section** | Optional fields (temperature, pressure, hours, voltage). These are diagnostic data points that don't exist on invoices or waybills. They prove the equipment is working after service. |
| **Acknowledgement checkbox** | Legal confirmation that service was completed. The client rep checks this — it's a field service-specific workflow step. |

### Android-Specific Choices
- **Stepper at top:** Always visible, never scrolled away — gives orientation
- **FAB for adding materials:** Thumb-reachable, consistent with Material Design
- **Toggle for System Down:** Large touch target, clear visual state (red = down)
- **Signature canvases:** Full-width for finger signing, no precision needed
- **Summary bar:** Shows material count + system status at a glance

---

## Three Prototypes Compared

| Aspect | Invoice (existing) | Waybill V2 | CSR |
|--------|-------------------|------------|-----|
| **Domain** | Financial | Movement/Transport | Field Service |
| **Items have prices** | ✅ Yes | ❌ No | ❌ No (materials, not items) |
| **Items have condition** | ❌ No | ✅ Yes | ❌ No |
| **Transport mode** | ❌ No | ✅ Yes (primary) | ❌ No |
| **Equipment tracking** | ❌ No | ❌ No | ✅ Yes (primary) |
| **Operational readings** | ❌ No | ❌ No | ✅ Yes |
| **Dual signatures** | ❌ No | ✅ Sender+Receiver | ✅ Tech+Client |
| **System Down concept** | ❌ No | ❌ No | ✅ Yes |
| **Progress stepper** | ❌ No | ❌ No | ✅ Yes |
| **Customs status** | ❌ No | ✅ Yes | ❌ No |
| **Service basis** | ❌ No | ❌ No | ✅ Yes |
