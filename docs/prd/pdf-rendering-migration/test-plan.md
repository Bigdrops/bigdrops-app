# 04 — TEST PLAN (PDF Rendering Migration)

> **Status:** ⛔ PENDING
> **Purpose:** Prove document integrity before each family is migrated.

## 🧪 Core Test Cases
- [ ] **TC-1 Short Document:** 2-line invoice. Renders correctly in portrait & landscape. No page breaks.
- [ ] **TC-2 Long Document:** 500+ line items. Pagination is correct. Table headers repeat. No stranded totals.
- [ ] **TC-3 1-Page Mode:** 20-page document. Compresses to 1 page without dropping line items, VAT, or signatures.
- [ ] **TC-4 Customization:** Accent color, density, and template variants render identically to legacy output.
- [ ] **TC-5 Data Integrity:** Tax calculations, totals, and document numbering match the legacy React-PDF output exactly.
- [ ] **TC-6 Verification:** `bun run typecheck` passes. **`bun run build` is NOT run.**