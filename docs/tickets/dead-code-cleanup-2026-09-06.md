# Dead Code Cleanup — 2026-09-06

## Summary

39 dead files identified and deleted. Largest clusters: old invoice form components (9), dead layout primitives (6), dead list cards (4), audit trail components (3).

## Deleted Files

### Components — Invoice (superseded by SharedDocumentForm + document/ system)

| File | Was |
|------|-----|
| `src/components/invoice/InvoiceActionsSheet.tsx` | Old invoice action sheet |
| `src/components/invoice/InvoiceFormActions.tsx` | Old invoice form buttons |
| `src/components/invoice/InvoiceCustomBottomFieldsSection.tsx` | Old custom bottom fields |
| `src/components/invoice/CommercialTermsSection.tsx` | Old commercial terms |
| `src/components/invoice/RevertInvoiceDialog.tsx` | Old revert dialog |
| `src/components/invoice/InvoiceNotesTermsSection.tsx` | Old notes/terms section |
| `src/components/invoice/InvoicePaymentTermsSection.tsx` | Old payment terms |
| `src/components/invoice/InvoicePaymentSection.tsx` | Old payment section |
| `src/components/invoice/TotalsPanel.tsx` | Old totals panel |
| `src/components/invoice/VoidPaymentDialog.tsx` | Old void dialog (alive copy in document-view/) |
| `src/components/invoice/view/InvoiceLineItemsCard.tsx` | Old view line items |
| `src/components/invoice/view/invoiceDetailHelpers.tsx` | Old detail helpers |
| `src/components/invoice/mobile/MobileInvoiceCollapsibleSections.tsx` | Old mobile collapsible sections |

### Components — Layout (dead primitives)

| File | Was |
|------|-----|
| `src/components/layout/MobileSearchFilterRow.tsx` | Superseded by MobilePageHeader |
| `src/components/layout/ToolbarRow.tsx` | Unused layout primitive |
| `src/components/layout/SurfacePanel.tsx` | Unused layout primitive |
| `src/components/layout/SectionCard.tsx` | Unused layout primitive |
| `src/components/layout/PageIntro.tsx` | Unused layout primitive |
| `src/components/layout/ActionBar.tsx` | Unused layout primitive |

### Components — List Cards (superseded by ModuleRowCard)

| File | Was |
|------|-----|
| `src/components/list/DenseListCard.tsx` | Dense list card |
| `src/components/list/EntityListCard.tsx` | Generic entity card |
| `src/components/list/ProjectListCard.tsx` | Project list card |
| `src/components/list/StatusChip.tsx` | Only used by dead list cards |

### Components — Audit (superseded by inline audit rendering)

| File | Was |
|------|-----|
| `src/components/audit/AuditTrailPanel.tsx` | Old audit panel |
| `src/components/audit/AuditTrailItem.tsx` | Only used by AuditTrailPanel |
| `src/components/audit/ErrorBoundary.tsx` | Only used by AuditTrailPanel |

### Components — Other

| File | Was |
|------|-----|
| `src/components/ViewMobileItemCard.tsx` | Superseded by invoice/MobileItemCard |
| `src/components/ItemImageUpload.tsx` | Unused Cloudinary upload |
| `src/components/AttachmentsPanel.tsx` | Unused attachments panel |
| `src/components/document/DocumentTemplateDesignOverrides.tsx` | Superseded by DocumentCustomizeCard |
| `src/components/ui/button-group.tsx` | Zero imports in src/ |
| `src/components/ui/input-group.tsx` | Zero imports in src/ |
| `src/components/ui/sonner.tsx` | Unused Toaster re-export |
| `src/components/export/ExportDropdownRow.tsx` | Transitively dead |
| `src/components/layout/MobileMoreSheet.tsx` | Stale more popup (replaced by /more page) |

### Pages

| File | Was |
|------|-----|
| `src/pages/LifetimeDataHub.tsx` | Not in router, dead feature |

### Restored

| File | Action |
|------|--------|
| `src/pages/debug/ErrorsDashboard.tsx` | Restored, routed at `/debug/errors` (localhost only) |

### Utilities

| File | Was |
|------|-----|
| `src/lib/openInAI.ts` | Zero imports |
| `src/lib/tenant/settingsCache.ts` | Zero imports |

### Tests

| File | Was |
|------|-----|
| `src/tests/_disabled/advanceRuntimeFilters.test.ts` | Disabled, vitest not installed |

## Verified Alive (not dead)

- `FloatingDocumentButton.tsx` — still used by `FloatingDownloadButton`
- `navData.ts` `moreGroups` — still used by `DesktopSidebar` and `Layout`
