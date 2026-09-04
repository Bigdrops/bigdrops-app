# NRS-Docs Obligation Lookup Index Report

This report was written by Buffy on 2026-09-04 via Freebuff.

## Objective

Create a lookup index that maps each PRD obligation rule to the specific gazette page of the Nigeria Tax Act, 2025 where the rule appears.

## Scope

- Extract the obligation rules from `Technical-plan.md` and `Technical-plan-v1.1.md`.
- Locate each rule in the Act conversions under `NRS-docs/`.
- Record the gazette page, the JSON page number, and the Markdown line for each rule.
- Flag every place where the PRD text and the Act text disagree.

## Files Changed

| File | Change |
|------|--------|
| `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` | Created. Maps PRD obligation rules to gazette pages, JSON pages, and MD lines. Flags mismatches. |
| `Readme.md` | Updated. Added the index to the file directory, the NRS-docs summary, the dependencies section, and the update log. |

## Skills Used

- NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Lookup index

The index groups the obligations into four tables:

- VAT obligations.
- Companies income tax and development levy.
- Withholding tax.
- Compliance hub deadlines.

Each row records the PRD rule, the Act provision, the gazette page, the JSON page number, and the Markdown line.

Each row has a verification status:

- VERIFIED: the gazette text confirms the rule.
- MISMATCH: the PRD value differs from the gazette text.
- NOT IN NRS-DOCS: the rule lives in the NTAA 2025, which is not in this folder.

The index includes a gazette-to-JSON page quick map for programmatic lookup.

### Findings

The index flags three open items.

1. **VAT remittance date.** The Act, section 155(4), page A 478, states the 14th day of the month after the transaction month. The PRD deadline table defaults both `vat_return` and `wht_remittance` to the 21st. The 14th-day rule covers withholding agents and self-accounting persons. The general VAT return date is delegated to NTAA 2025 through section 156(1).

2. **Small company turnover.** The official gazette text (JSON page 128, MD line 4502) defines "small company" as gross turnover at or below ₦50,000,000 per annum. `Technical-plan.md` section 8.3 and the Cable conversion both state ₦100,000,000. The ₦100,000,000 figure does not appear in the Act. The fixed-assets cap and the professional-services exclusion match the Act.

3. **Missing NTAA text.** The WHT rate table from `Technical-plan.md` section 5.7 does not exist in the Tax Act. The Act delegates the rates to NTAA 2025, section 51. The 21st-day return deadline also does not appear in the Tax Act. Both rules require the NTAA 2025 text, which is not stored under `NRS-docs/`.

### Conversion quality note

`Cable-Ngn-tax-act-2025-v2.md` has section numbers that drift by minus one from the official numbering, starting at the stamp-duty chapter. It also contains extraction errors, such as the ₦100,000,000 small-company figure. `NIGERIA-TAX-ACT-2025.md` and its JSON match the official numbering and the NRS-hosted gazette text. The Readme now states that the NIGERIA files are canonical.

## Verification Result

- Page mappings were derived by matching gazette page markers against the MD text and the JSON `page_number` fields.
- The small-company figure was cross-checked against the JSON page data and independent summaries of the Act.
- The section numbering was cross-checked against the official gazette arrangement and the NRS-hosted PDF.
- No typecheck or test run applies to documentation-only changes.
- `git status` after changes: the new file `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` is untracked. The `Readme.md` modification is unstaged. The staged NRS-docs conversions and other staged files from concurrent work were not modified.

## Risks or Limitations

- The gazette page for a rule that spans a page boundary is shown as a range, for example A 428-429. The rule begins on the first page of the range.
- The index reflects the Act text as converted in `NIGERIA-TAX-ACT-2025.md`. If the conversion contains an OCR error, the index inherits it.
- Section numbers in the Tax Act and the NTAA do not always match. The index cites Tax Act sections only. NTAA section references are named but not resolved.

## Deferred Work

- Obtain the Nigeria Tax Administration Act, 2025 text. Add it under `NRS-docs/` and resolve the WHT rate table and the 21st-day deadline against it.
- Confirm the small-company turnover threshold. The PRD states ₦100,000,000. The Act states ₦50,000,000. Correct the PRD or record a source for the higher figure.
- Confirm which obligation type carries the 21st-day due date. The Act text gives the 14th day to withholding agents under section 155(4).
- Decide the disposition of `Cable-Ngn-tax-act-2025-v2.md`, which carries numbering drift and extraction errors.
