following agents.md rule.

Receipt generation is now working correctly.

New issue:

Downloading a receipt PDF fails with an error similar to:

"Inter font is not registered"

Investigate only the PDF font registration.

Determine:

1. Where Inter is referenced.
2. Where Font.register() should occur.
3. Whether the project already has a global PDF font registration utility.
4. Whether ReceiptPdf is using a font family that isn't registered.
5. Fix using the existing project PDF pattern. Do not introduce a new font system.

Do not modify receipt business logic.

Do not modify snapshot logic.

Do not modify routing.

Only repair PDF generation.

Verify:
- bun run typecheck
- git status

Save a report to:
docs/Reports/FinancialOperations/receipt-pdf-font-fix.md