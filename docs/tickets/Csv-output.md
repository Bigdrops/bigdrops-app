# Bug: CSV Export Financial Summary Is Incomplete and Incorrect

## Type
Bug

## Priority
High

## Modules
- Invoice → CSV Export
- Quotation → CSV Export

## Description
The CSV export does not correctly export the document's financial summary. While line items and the grand total are present, intermediate financial values are either missing or exported as `0`, resulting in an inconsistent and misleading summary.

This issue affects both **Invoices** and **Quotations**.

## Current Behavior

The CSV export appears to only recognize:

- Line Item Amounts
- Grand Total

It does **not** correctly export other financial components, including:

- Subtotal
- Installation Total
- VAT
- Discount
- WHT
- Any other applicable financial adjustments

As a result, the exported summary is inconsistent.

### Example

```csv
Subtotal,0
Install Rate Total,0
VAT,0
Discount,0
WHT,0
Total,279500
```

However, the line items total only **₦260,000**, while the exported grand total is **₦279,500**.

The difference exists because additional calculations (such as VAT) were applied internally to produce the grand total, but those values were never exported into the CSV summary.

## Expected Behavior

The CSV export should include the complete financial breakdown exactly as shown in the application and PDF export.

The summary should correctly export all applicable financial fields, including:

- Subtotal
- Installation Total
- VAT
- Discount
- WHT
- Grand Total

Fields that are not applicable should accurately display `0` or be omitted according to the export specification, but they must never hide values that were actually used in calculating the grand total.

## Investigation Points

- Review the financial summary generation logic for both Invoice and Quotation CSV exports.
- Verify whether the exporter is reading only the line totals and grand total while ignoring the remaining calculated financial values.
- Ensure the CSV export uses the same financial calculation source as:
  - Document View
  - PDF Export
  - Print Preview

## Acceptance Criteria

- Invoice and Quotation CSV exports produce identical financial summaries to the application.
- Every financial component used to calculate the grand total is exported.
- Grand Total equals the sum of the exported financial breakdown.
- CSV, PDF, Print, and UI remain consistent for all financial values.
- No regressions to existing CSV export functionality.

## Additional Issue: Missing Document Sections

The CSV export is not exporting all document content that exists in the application and PDF.

### Missing Sections

- Terms & Conditions
- (Verify Notes are exported correctly)

As a result, the CSV export is not a complete representation of the document.

The PDF export contains these sections, while the CSV omits them entirely.

## Expected Behavior

The CSV should export all document-level information required to faithfully reconstruct the document, including:

- Document metadata
- Notes
- Terms & Conditions
- Line items
- Extra charges
- Complete financial summary

The exported CSV should contain the same business information available in the application's View page and PDF export, except for purely visual formatting.