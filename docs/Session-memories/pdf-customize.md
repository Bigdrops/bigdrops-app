### Handover: PDF Customize Unification & General Updates

**Project Status: UI Synchronization and Core Infrastructure**

This section covers the unification of the PDF customization logic and general maintenance tasks.

#### 1. PDF Customize Unification (🎨 button)
The per-document customization sheets (previously separate for invoices and quotations) have been replaced with a **single, shared popup** system to eliminate logic duplication [1].

*   **Key Components:**
    *   **Shared Infrastructure:** All document types now use `DocumentSheet` and `DocumentCustomizeCard` [2].
    *   **New Feature:** `CommercialTemplatePicker.tsx` introduced a compact 4-column grid with 7 template options [2].
    *   **Cleanup:** `PdfOutputCustomizeSheet.tsx` has been **deleted**, as its features are now absorbed by the shared card [2].
    *   **Implementation:** `ViewQuotation.tsx` and `InvoiceOverlays.tsx` are fully wired to the new shared components [2].

*   **Implementation Patterns to Follow:**
    *   Use `handwritingFont` and `handwritingColor` (do not use inkFont/inkColour) [3].
    *   `PdfBankControls` requires `value`, `onChange`, and `bankAccounts` [3].
    *   Commercial documents should pass empty arrays or `"auto"` for any handwriting-related properties [3].
    *   Customization saves are handled via `handleSaveCustomization()` within the respective quotation or invoice actions [3].

#### 2. UI & Documentation Updates
*   **Carousel Refactor:** A new `shadcn/ui` embla-carousel wrapper (`src/components/ui/carousel.tsx`) was implemented [4].
*   **Dashboard:** The `RecentAlertsCarousel.tsx` has been refactored to utilize this new standardized wrapper [4].
*   **Roadmap:** The Waterfall roadmap in the PRD documentation has been updated with the latest milestones [4].

#### 3. General Development Constraints
*   **Build Restriction:** **`bun run build` is strictly forbidden** due to 4GB RAM limits. Please use `bun run typecheck` or `bun run lint` instead [5].
*   **Protocol:** You must read **`AGENTS.md`** before making any code changes [5].
*   **Workflow:** Use **Bun only** as the package manager and adhere to **Gitmoji + Conventional Commits** for all messages [5].

#### 4. Remaining Work
*   **Repository:** Push final changes to origin [6].
*   **Cleanup:** Address the `src/lib/tenant/settingsCache.ts` file (currently deleted in the working tree but not staged) and remove the erroneous `.claude/handoffs/` directory [6].
*   **Note on Tests:** There are two pre-existing test failures in `src/tests/invoice/pdfRegressionCleanup.test.js` related to structural regressions in untouched files; these do **not** require fixing as part of this scope [6], [7].