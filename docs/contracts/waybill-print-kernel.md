# 🧾 BIGDROPS WAYBILL — PRINT KERNEL SPEC v1 (FINAL LOCK)
## 0. CORE MODEL
The waybill PDF is a:
 * **Deterministic vertical rendering engine** (not a UI layout system)
All output must follow a strict execution contract.
## 1. PAGE ARCHITECTURE (IMMUTABLE)
Page is divided into 5 zones:
 * **ZONE 1** → TITLE (LOCKED)
 * **ZONE 2** → BRAND (LOCKED)
 * **ZONE 3** → METADATA (LOCKED)
 * **ZONE 4** → CONTENT (FLEX ONLY INTERNAL)
 * **ZONE 5** → SIGNATURE + FOOTER (LOCKED)
> ### 🚫 GLOBAL RULE
> Zones 1, 2, 3, 5 are **NEVER** allowed to move.
> Only Zone 4 may expand internally.
> 
## 2. ZONE CONTRACTS
### ZONE 1 — TITLE (HARD LOCK)
 * Must be first rendered element
 * Center aligned
 * Fixed text: WAYBILL / DELIVERY NOTE
**RULES:**
 * No side placement
 * No merging with brand
 * No conditional rendering
### ZONE 2 — BRAND BLOCK (HARD LOCK)
Contains only:
 * Logo (optional)
 * Company Name
 * Tagline
**RULES:**
 * Same container whether logo exists or not
 * If logo missing → render **NOTHING** (no placeholder, no box)
 * No contact info allowed
### ZONE 3 — METADATA BLOCK (HARD LOCK)
Contains only:
 * Address
 * Phone | Email
 * Date pill
**RULES:**
 * **NO labels anywhere in system:**
   * *Forbidden:* "Phone:", "Email:", "Address:"
 * Raw values only
 * Fixed layout row
 * Does not grow with content
### ZONE 4 — CONTENT BLOCK (ONLY FLEX ZONE)
Contains:
 * Client / Origin
 * Destination
 * Vehicle
 * Driver
 * Items table
 * Notes
> ### ZONE 4 OVERFLOW RULE (CRITICAL)
> If Zone 4 exceeds available vertical space:
>  * Content compresses internally
>  * Table height reduces
>  * **DO NOT** move Zone 5 upward
>  * **DO NOT** shrink Zones 1–3
> 
### ZONE 5 — SIGNATURE + FOOTER (HARD LOCK)
Contains:
 * Delivered By
 * Received By
 * Footer company name
**RULES:**
 * Always pinned to bottom
 * Never moves due to content above
 * Signature cards must remain equal height
## 3. RENDER ORDER IMMUTABILITY
Within each zone:
 * Element order **MUST NOT** change.
 * No reordering allowed under any condition.
## 4. TABLE SYSTEM (STRICT PROPORTION ENGINE)
Fixed flex ratios (**NO EXCEPTIONS**):
 * **#** → 1
 * **Description** → 14
 * **Qty** → 2.4
 * **Unit** → 2.6
**RULES:**
 * Must be identical in header + rows
 * No recalculation allowed
 * No approximation allowed
## 5. SPACING ENGINE (DISCRETE SYSTEM)
Allowed values **ONLY**: 4, 8, 12, 16, 24
**RULES:**
 * Any non-matching value → **ROUND DOWN** to nearest allowed value
 * No custom spacing allowed
 * No interpolation
## 6. TYPOGRAPHY ENGINE (LOCKED)
 * **Title** → 14–16
 * **Company Name** → 12–13
 * **Body** → 9–10
 * **Footer** → 8
 * **Labels** → **FORBIDDEN**
## 7. LOGO RULE (VISUAL NULL CONTRACT)
 * **IF logo exists:** Render Image only (fit: contain)
 * **IF logo missing:** Render **NOTHING**
 * No borders.
 * No placeholders.
 * No fallback UI.
## 8. CONTACT FORMAT (STRICT OUTPUT CONTRACT)
+2348066XXXXXX | email@domain.com
 * No prefixes
 * No labels
 * No variation allowed
## 9. STRUCTURAL CONSTRAINTS
**FORBIDDEN GLOBAL PATTERNS:**
 * ❌ position: absolute
 * ❌ Floating headers
 * ❌ Conditional layout structure
 * ❌ Zone reordering based on data
 * ❌ Dynamic container resizing across zones
## 10. FAILURE MODE RULE
If any constraint conflicts occur, priority order is:
 1. Zone lock > content fit
 2. Table shrink > zone movement
 3. Overflow compression > layout shift
## 11. ACCEPTANCE CRITERIA (HARD GATE)
System is valid only if:
 * All 5 zones present in correct order
 * No absolute positioning exists
 * Table proportions exact
 * No labels exist anywhere
 * Logo missing renders nothing (not even spacing artifacts)
 * Zone 5 remains pinned under all conditions
