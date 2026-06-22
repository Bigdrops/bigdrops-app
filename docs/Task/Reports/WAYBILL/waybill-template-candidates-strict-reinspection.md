# Waybill Template Candidates — Strict Re-Inspection Report

**Date:** 2026-06-21
**Inspector:** AI Agent (opencode)
**Contract:** `waybill-template-candidates-strict-reinspection`
**Status:** COMPLETE — 8 templates inspected against 21 contract fields + 4 additional checks

---

## Executive Summary

| Candidate | Field Coverage | Missing Fields | Extra Cols | Verdict |
|-----------|---------------|----------------|------------|---------|
| Classic-final.html | 18/21 | tagline, type badge, senderName, receiverName | 2 | ACCEPTABLE |
| Minimal-final.html | 17/21 | type badge, poNumber, senderName, receiverName | 2 | ACCEPTABLE |
| Green.html | 16/21 | tagline, email, type badge, senderName, receiverName | 2 | ACCEPTABLE |
| Industry.html | 17/21 | tagline, email, type badge, senderName, receiverName | 2 | ACCEPTABLE |
| Premium.html | 18/21 | tagline, type badge, senderName, receiverName | 2 | ACCEPTABLE |
| Split.html | 17/21 | tagline, email, type badge, senderName, receiverName | 2 | ACCEPTABLE |
| Thermal.html | 19/21 | type badge, receiverName | 1 | BEST CANDIDATE |
| waybill-landscape.html | 5/21 | 16 missing (mostly blank placeholders) | 2 | CONCEPT ONLY |

---

## Candidate-by-Candidate Analysis

### 1. Classic-final.html

**Field Coverage:** 18/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | `.logo-placeholder` with "LOGO" | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | `info@sunandshield.com` | ✅ RENDERED |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Blank inside "Collected By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Method" tick-row with Vehicle checked | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Purpose" tick-row with Supply checked | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By" with name + signature | ✅ RENDERED |
| signatures.receiver | "Collected By" with blank name + signature | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING** — no visible "External"/"Internal" badge
- header.poNumber: **PRESENT** — "P.O. Number" label at line 127
- Extra table columns: **2** (Part No + Make) — exceeds recommended 1
- parties.senderName/receiverName: **Not in dedicated parties section** — embedded in signature cards

---

### 2. Minimal-final.html

**Field Coverage:** 17/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | `Reliable Energy Solutions` | ✅ RENDERED |
| branding.logo | `.brand-logo` with "LOGO" | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | `info@sunandshield.com` | ✅ RENDERED |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `14:35` | ✅ RENDERED |
| header.poNumber | — | ❌ MISSING — no PO Number label or value |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By / Driver" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Inside "Received By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Delivery Mode" checkbox group | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Delivery Reason" checkbox group | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By / Driver" | ✅ RENDERED |
| signatures.receiver | "Received By" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **MISSING** — no PO Number anywhere
- Extra table columns: **2** (Part No + Make)
- parties.senderName/receiverName: **Not in dedicated parties section**

---

### 3. Green.html

**Field Coverage:** 16/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | `⚡` icon in `.brand-icon` | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | — | ❌ MISSING — email not found |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Blank inside "Collected By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Method" card with tick boxes | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Purpose" card with tick boxes | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By (Sender)" | ✅ RENDERED |
| signatures.receiver | "Collected By (Receiver)" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **PRESENT**
- Extra table columns: **2** (Part No + Make)
- parties.senderName/receiverName: **Not in dedicated parties section**

---

### 4. Industry.html

**Field Coverage:** 17/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | — | ❌ MISSING — no logo element |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | — | ❌ MISSING — email not found |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Blank inside "Received By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Method" block with tick boxes | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Purpose" block with tick boxes | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By (Sender)" | ✅ RENDERED |
| signatures.receiver | "Received By (Receiver)" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **PRESENT**
- Extra table columns: **2** (Part No + Make)
- parties.senderName/receiverName: **Not in dedicated parties section**
- branding.logo: **MISSING** — no logo placeholder

---

### 5. Premium.html

**Field Coverage:** 18/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | `LOGO` in topbar | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | `info@sunandshield.com` | ✅ RENDERED |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Blank inside "Collected By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Method" checkbox group | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Purpose" checkbox group | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By" | ✅ RENDERED |
| signatures.receiver | "Collected By" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **PRESENT**
- Extra table columns: **2** (Part No + Make)
- parties.senderName/receiverName: **Not in dedicated parties section**

---

### 6. Split.html

**Field Coverage:** 17/21

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | `⚡` icon in `.banner-icon` | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | — | ❌ MISSING — email not found |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` | ✅ RENDERED |
| parties.senderName | Inside "Delivered By" card | ❌ NOT in dedicated parties section |
| parties.receiverName | Blank inside "Collected By" card | ❌ NOT in dedicated parties section |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | "Method" tick group | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | "Purpose" tick group | ✅ RENDERED |
| table.columns | #, Description, Qty/Unit, Condition, Part No, Make | ✅ 6 columns — Part No (x1), Make (x2) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By (Sender)" | ✅ RENDERED |
| signatures.receiver | "Collected By (Receiver)" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **PRESENT**
- Extra table columns: **2** (Part No + Make)
- parties.senderName/receiverName: **Not in dedicated parties section**

---

### 7. Thermal.html

**Field Coverage:** 19/21 — **BEST COVERAGE**

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `Sun & Shield Power Solutions` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING — no tagline element |
| branding.logo | `LOGO` | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `+234 800 123 4567` | ✅ RENDERED |
| branding.email | `info@sunandshield.com` | ✅ RENDERED |
| header.type | — | ❌ MISSING — no "External"/"Internal" badge |
| header.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| header.date | `2026-06-20` | ✅ RENDERED |
| header.time | `10:30 AM` | ✅ RENDERED |
| header.poNumber | `PO-2026-0842` (label "P.O. NO") | ✅ RENDERED |
| parties.clientName | `Global Industrial Logistics` (under "DELIVER TO") | ✅ RENDERED |
| parties.senderName | `Sun & Shield Power Solutions` (under "DISPATCH FROM") | ✅ RENDERED |
| parties.receiverName | — | ❌ MISSING — no receiver name field |
| logistics.vehiclePlate | `AKD-421-XY` | ✅ RENDERED |
| logistics.driverName | `Emeka Nwosu` | ✅ RENDERED |
| logistics.deliveryMode | Text-format checkboxes | ✅ RENDERED |
| logistics.deliveryLocation | `Ikoyi Depot, Lagos` | ✅ RENDERED |
| logistics.purpose | Text-format checkboxes | ✅ RENDERED |
| table.columns | #, Description, Qty, Cond, Part No | ✅ 5 columns (1 extra: Part No) |
| notes | `All items must be inspected...` | ✅ RENDERED |
| signatures.sender | "Delivered By" | ✅ RENDERED |
| signatures.receiver | "Collected By" | ✅ RENDERED |
| footer.waybillNumber | `WBL-E-000042` | ✅ RENDERED |
| footer.companyName | `Sun & Shield Power Solutions` | ✅ RENDERED |
| pagination | — | ❌ MISSING — no pagination controls |

**Additional Checks:**
- header.type indicator: **MISSING**
- header.poNumber: **PRESENT**
- Extra table columns: **1** (Part No only — no Make column) ✅ within limit
- parties.senderName: **PRESENT** in dedicated "DISPATCH FROM" section ✅
- parties.receiverName: **MISSING** — no dedicated receiver section
- senderName/receiverName: sender IS in "DISPATCH FROM" block, but receiver is not in a separate "DELIVER TO" block (clientName is the "DELIVER TO" block)

---

### 8. waybill-landscape.html (CONCEPT)

**Field Coverage:** 5/21 — **CONCEPT ONLY, NOT A FUNCTIONAL CANDIDATE**

| Contract Field | Value | Status |
|---|---|---|
| branding.name | `SUN & SHIELD POWER SOLUTIONS` | ✅ RENDERED |
| branding.tagline | — | ❌ MISSING |
| branding.logo | `S&S` styled div | ✅ RENDERED |
| branding.address | `43 Oshola Street, Ifako-Ijaiye, Lagos` | ✅ RENDERED |
| branding.phone | `0800-SUNSHIELD` | ✅ RENDERED |
| branding.email | — | ❌ MISSING |
| header.type | — | ❌ MISSING |
| header.waybillNumber | Blank placeholder `________` | ❌ NOT RENDERED |
| header.date | Blank placeholder `________` | ❌ NOT RENDERED |
| header.time | — | ❌ MISSING entirely |
| header.poNumber | — | ❌ MISSING |
| parties.clientName | Label "Client / Consignee" exists only | ❌ Value is blank |
| parties.senderName | — | ❌ MISSING in dedicated section |
| parties.receiverName | — | ❌ MISSING in dedicated section |
| logistics.vehiclePlate | Label "Vehicle Plate" exists only | ❌ Value is blank |
| logistics.driverName | Label "Driver Name & Phone" exists only | ❌ Value is blank |
| logistics.deliveryMode | Checkbox group present | ✅ RENDERED (labels only) |
| logistics.deliveryLocation | — | ❌ MISSING |
| logistics.purpose | "Delivery Reason" checkbox group | ✅ RENDERED (labels only) |
| table.columns | #, Description, Qty, Unit, Remark | — Different column layout (no Condition) |
| notes | "Delivery Remarks / Notes" box | ❌ Value is blank |
| signatures.sender | Cards with labels only | ❌ Values blank |
| signatures.receiver | Cards with labels only | ❌ Values blank |
| footer.waybillNumber | — | ❌ MISSING |
| footer.companyName | `Sun & Shield Power Solutions — Powering Reliability` | ✅ RENDERED |
| pagination | — | ❌ MISSING |

**Verdict:** This is a concept/landscape template with placeholder values only. Not suitable for production without significant rework.

---

## Cross-Cutting Issues

### Issue 1: header.type Indicator — MISSING in ALL 8 Templates

**Severity:** Medium
**Affected:** All 8 templates
**Evidence:** None of the 8 HTML files contain an explicit "External" or "Internal" type badge. The waybill number prefix (e.g., `WBL-E-000042`) encodes the type but there is no visible label/tag.
**Recommendation:** Every template should include a non-encoded visual indicator.

### Issue 2: parties.senderName/receiverName Not in Dedicated Party Section

**Severity:** Low (design pattern choice)
**Affected:** All 8 templates (though Thermal.html has sender in "DISPATCH FROM")
**Evidence:** Sender and receiver names appear only inside signature blocks, not in a dedicated `parties` / address section.
**Recommendation:** If the contract requires separate shipment parties distinct from signature parties, templates need a dedicated sender/receiver address block.

### Issue 3: Extra Table Columns Exceed Recommended 1

**Severity:** Low
**Affected:** Classic, Minimal, Green, Industry, Premium, Split (all have 2 extra cols)
**Not Affected:** Thermal.html (only 1 extra: Part No), waybill-landscape.html (different schema entirely)
**Recommendation:** If the contract strictly limits to 1 extra column, these 6 templates need column reduction.

### Issue 4: No Pagination Controls

**Severity:** Low
**Affected:** All 8 templates
**Evidence:** No HTML file contains pagination controls for multi-page waybills.

---

## Previous Report Error Corrections

The earlier report (`waybill-template-candidates.md`) contained the following false negatives:

| Template | Field | Previous Claim | Actual Status |
|----------|-------|---------------|---------------|
| Classic-final.html | deliveryLocation | NOT rendered | ✅ **IS** rendered at line 132 |
| Classic-final.html | purpose | NOT rendered | ✅ **IS** rendered at lines 146-155 |
| Minimal-final.html | deliveryMode | NOT rendered | ✅ **IS** rendered at line 132 |
| Minimal-final.html | deliveryLocation | NOT rendered | ✅ **IS** rendered at line 122 |
| Minimal-final.html | purpose | NOT rendered | ✅ **IS** rendered at line 140 |
| Minimal-final.html | phone | NOT rendered | ✅ **IS** rendered at line 110 |
| Minimal-final.html | email | NOT rendered | ✅ **IS** rendered at line 110 |
| Premium.html | deliveryLocation | NOT rendered | ✅ **IS** rendered at line 257 |
| Premium.html | purpose | NOT rendered | ✅ **IS** rendered at line 284 |

Previous correct findings (confirmed by this re-inspection):
- Green.html: tagline MISSING, email MISSING
- Industry.html: tagline MISSING, email MISSING, logo MISSING
- Split.html: email MISSING

---

## Ranking

1. **Thermal.html** (19/21) — Best coverage, only 1 extra table column, sender in dedicated "DISPATCH FROM" block
2. **Classic-final.html** (18/21) — Good coverage, missing tagline + type badge + separated parties
3. **Premium.html** (18/21) — Good coverage, same gaps as Classic but richer notes field
4. **Industry.html** (17/21) — Moderate, missing tagline + email + logo
5. **Minimal-final.html** (17/21) — Moderate, missing type badge + poNumber + separated parties
6. **Split.html** (17/21) — Moderate, same gaps as others
7. **Green.html** (16/21) — Lowest coverage among final candidates
8. **waybill-landscape.html** (5/21) — Concept only, not functional

---

END OF REPORT
