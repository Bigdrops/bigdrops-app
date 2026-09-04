# NRS Obligation Reconciliation Report

This report was written by Buffy on 2026-09-04 via Freebuff.

## Objective

Reconcile the three open tax-law items that `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` flags against the primary statutory text in the repository.

Establish a primary-source evidence base before Technical-plan-v1.2.md is finalized.

Do not finalize or modify Technical-plan-v1.2.md.

## Scope

This task is a source-document reconciliation and documentation task.

The permitted repository changes are limited to:

- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md`.
- This findings report.

This task does not modify:

- Technical-plan.md.
- Technical-plan-v1.1.md.
- Technical-plan-v1.2.md.
- Application source code.
- Tests.
- Database migrations.
- Act source conversions.

## Baseline Git Status

Recorded before any change, using `git status --short`:

```
M  AGENTS.md
MM README.md
A  docs/reports/general/calculation-entry-point-doc-fix.md
A  docs/reports/invoice-quote/calculation-entry-point-split-inspection.md
?? docs/Reports/general/readme-repository-state-reconciliation.md
```

These are pre-existing staged, unstaged, and untracked changes. They belong to other work. This task does not modify, revert, or overwrite any of them.

## Sources Reviewed

- `NRS-docs/NIGERIA-TAX-ACT-2025.md` (canonical Markdown conversion, 7812 lines).
- `NRS-docs/NIGERIA-TAX-ACT-2025.json` (canonical JSON conversion, 215 pages).
- `NRS-docs/Cable-Ngn-tax-act-2025-v2.md` (older conversion, cross-check only).
- `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` (target of the update).
- `Technical-plan.md` and `Technical-plan-v1.1.md` (prior assumptions; read only).

The `Cable-Ngn-tax-act-2025-v2.md` section numbers drift by minus one from the official numbering, starting at the stamp-duty chapter. Its section numbers are not authoritative. This task uses the canonical Markdown and JSON only.

## NTAA Availability Finding

The Nigeria Tax Administration Act, 2025 (NTAA 2025) is absent from the repository.

The search covered all tracked files and the full `NRS-docs/` folder. No file contains NTAA 2025 statutory text under any filename.

The canonical NTA text references the NTAA 2025 at least 97 times in the JSON conversion. These are references only. No NTAA conversion exists locally.

Consequence:

- NTAA-dependent items remain unresolved.
- The NTAA 2025 gazette text must be added under `NRS-docs/` before they can close.
- Secondary web sources do not close NTAA-dependent items.

## VAT Deadline Reconciliation

### A. VAT return filing

PRIOR ASSUMPTION:

`Technical-plan.md` §8.1 and `Technical-plan-v1.1.md` §8.1 default the VAT return day to the 21st of the month after the transaction month. The lookup index flagged the general VAT return day as NOT IN NRS-DOCS.

PRIMARY TEXT:

Section 156(1) states:

"A taxable person shall, not later than the due date for rendering the relevant tax return prescribed by the Nigeria Tax Administration Act, 2025, where the —

(a) output VAT exceeds the input VAT, remit the excess to the Service ; or

(b) input VAT exceeds the output VAT, be entitled to utilise the excess tax as a credit against subsequent months."

CITATION:

- Nigeria Tax Act, 2025, section 156(1).
- Gazette page A 478.
- JSON page 92.
- Markdown lines 3229–3233.

RESULT:

Unresolved. The Nigeria Tax Act, 2025 does not state the VAT return due day. It delegates the return due date to the NTAA 2025. The 21st-day value appears nowhere in the Tax Act text.

V1.2 ACTION:

Model `vat_return` with a due day that the NTAA 2025 prescribes. Do not encode the 21st as a statutory fact. Add the NTAA 2025 text to `NRS-docs/` and verify the value before coding.

### B. VAT remittance by withholding agents and self-accounting persons

PRIOR ASSUMPTION:

The PRD deadline table defaults both obligations to the 21st. The lookup index marked this row MISMATCH and asked which obligation type carries which day.

PRIMARY TEXT:

Section 155(1) covers Federal, State, Local Government bodies and their MDAs, and persons the Service appoints to collect or withhold VAT. Section 155(2) lets the Service direct a taxable person to self-account for VAT. Section 155(4) states:

"The VAT collected, withheld or self-accounted under this section shall be remitted to the Service on or before the 14th day of the month immediately following the month of the transaction or as may be prescribed by the Service."

CITATION:

- Nigeria Tax Act, 2025, sections 155(1), 155(2), 155(4).
- Gazette page A 478.
- JSON page 92.
- Markdown lines 3209, 3217, 3225.

RESULT:

Confirmed as a distinct statutory obligation. VAT collected, withheld, or self-accounted under section 155 is due on or before the 14th day of the month after the transaction month, unless the Service prescribes otherwise. This is not the same obligation as VAT return filing.

V1.2 ACTION:

Add a separate obligation for the section 155 remittance (withholding agents, government bodies, self-accounting persons) with due day 14. Do not collapse it into the general VAT return.

### C. Reverse-charge VAT on non-resident supplies

PRIMARY TEXT:

Section 151(2) states:

"Where a non-resident person is making taxable supplies from outside Nigeria to persons in Nigeria, the taxable person to whom the supply is made in Nigeria shall withhold the VAT due on the supply and remit it to the Service."

CITATION:

- Nigeria Tax Act, 2025, section 151(2).
- Gazette page A 476.
- JSON page 90.
- Markdown line 3157.

RESULT:

New distinct obligation recorded. The Act imposes the withholding obligation but states no remittance day in the text of section 151. The day remains unresolved until the NTAA 2025 or Service guidelines are available.

V1.2 ACTION:

Record this obligation type. Verify its remittance day from the NTAA 2025 text.

## Small Company / Small Business Reconciliation

### A. Small company

PRIOR ASSUMPTION:

`Technical-plan.md` §8.3 states that small company turnover is ₦100,000,000 or below. The Cable conversion also states ₦100,000,000. The lookup index marked the definition row MISMATCH.

PRIMARY TEXT:

Section 202 General interpretation defines "small company" as follows:

"small company" means a company that earns gross turnover of ₦50,000,000 or less per annum with total fixed assets not exceeding ₦250,000,000, provided that any business providing professional services shall not be classified as a small company.

CITATION:

- Nigeria Tax Act, 2025, section 202 General interpretation.
- Gazette page A 514.
- JSON page 128.
- Markdown line 4502.

RESULT:

Corrected. The statutory turnover threshold is ₦50,000,000, not ₦100,000,000. The ₦100,000,000 figure in Technical-plan.md §8.3 and in the Cable conversion is an extraction error, not statutory text. The fixed-assets cap (₦250,000,000) and the professional-services exclusion match the Act.

Related statutory context:

- Section 56(a): small company CIT rate 0%. Gazette page A 428, JSON page 42, Markdown line 1604.
- Section 59(1): development levy 4% excludes small companies. Gazette page A 429–430, JSON pages 43–44, Markdown line 1649.
- "Gross turnover" is defined in section 202. Gazette page A 508, JSON page 122, Markdown line 4302.

V1.2 ACTION:

Correct the Compliance Hub small-company condition to ₦50,000,000. Keep the fixed-assets cap and the professional-services exclusion.

### B. Small business

PRIOR ASSUMPTION:

The lookup index and PRD used the terms small company and small business without separating them.

PRIMARY TEXT:

The term "small business" does not occur in the Nigeria Tax Act, 2025 canonical Markdown, the canonical JSON, or the Cable conversion. A directed search found zero occurrences in each conversion.

RESULT:

The Nigeria Tax Act, 2025 does not define a "small business" classification. Only "small company" exists as a statutory classification. Do not collapse the two terms.

The NTAA 2025 may define related terms for other taxes. Its text is absent, so no NTAA-based small business classification can be established here.

V1.2 ACTION:

Use "small company" for the CIT classification. Do not introduce a statutory "small business" classification without a primary NTAA source.

## WHT Rate Table and Deadline Reconciliation

PRIOR ASSUMPTION:

`Technical-plan.md` §5.7 lists WHT rates for goods, construction, services, rent, and exempt transactions. `Technical-plan-v1.1.md` §8.1 defaults `wht_remittance` to the 21st. The lookup index marked both rows NOT IN NRS-DOCS.

PRIMARY TEXT:

The Nigeria Tax Act, 2025 contains no WHT rate table and no WHT remittance day. It delegates deduction at source to the NTAA 2025:

- Section 10(3)(c) states that the rate applied for the deduction at source is the rate that the Nigeria Tax Administration Act, 2025 prescribes. Gazette page A 400, JSON page 14, Markdown line 713.
- Section 14(4) refers to amounts deducted at source in accordance with section 51 of the Nigeria Tax Administration Act, 2025. Gazette page A 405–406, JSON pages 19–20, Markdown line 891.
- Section 14(8) states the 4% fallback on non-resident income not covered by the NTAA deduction at source. Gazette page A 407, JSON page 21, Markdown line 921.
- Section 50(4) remits tax deducted on compensation for loss of office within the time that the Pay-As-You-Earn or Deduction of Tax at Source Regulations under the NTAA 2025 specify. Gazette page A 426, JSON page 40, Markdown line 1561.

CITATION:

- Nigeria Tax Act, 2025, sections 10(3)(c), 14(4), 14(8), 50(4).
- See the gazette, JSON, and Markdown citations above.

RESULT:

Unresolved. The WHT rate table and the WHT remittance day are NTAA 2025 matters. The NTAA 2025 text is absent. No secondary source closes this item.

Citation correction recorded: the lookup index previously cited the PAYE/DTS remittance context as section 46(4). The canonical text places that context at section 50(4), page A 426, Markdown line 1561.

V1.2 ACTION:

Add the NTAA 2025 gazette text to `NRS-docs/`. Verify the WHT rate table and the WHT remittance day against that text. Compare the verified table with Technical-plan.md §5.7 values before finalizing the engine.

## Updated Lookup-Index Status

`NRS-docs/OBLIGATION-LOOKUP-INDEX.md` is updated. The update:

- Marks the section 155(4) VAT remittance row VERIFIED at the 14th day.
- Records the section 156(1) VAT return/net remittance row as NOT IN NRS-DOCS, with the day delegated to NTAA 2025.
- Adds a distinct reverse-charge VAT row under section 151(2).
- Marks the small company definition row VERIFIED at ₦50,000,000.
- Adds a NOT DEFINED row for the "small business" term.
- Keeps the WHT rows NOT IN NRS-DOCS.
- Adds a VERIFIED row for the section 155 remittance obligation with due day 14 to the Compliance Hub deadline table.
- Corrects the section 46(4) citation to section 50(4) in note 5.
- Adds a NOT DEFINED status to the legend.
- Keeps the existing structure, style, and quick map.

## v1.1 Impact Assessment

Technical-plan-v1.1.md requires corrections in v1.2:

- Section 8.1: the deadline table defaults `vat_return` and `wht_remittance` to the 21st. The Tax Act text contains no 21st-day rule. `vat_return` is NTAA-delegated. The section 155 VAT remittance obligation is due on the 14th day and is missing from the table.
- Section 5.7 and the rate table values carried from Technical-plan.md: the WHT rates cannot be confirmed. They live in the NTAA 2025, which is absent.

No assumption in Technical-plan-v1.1.md is confirmed as a closed statutory value. The two open areas are the NTAA-delegated deadlines and the NTAA-delegated WHT rates.

## Required v1.2 Edits

Do not make these edits now. Make them when Technical-plan-v1.2.md is finalized:

1. Split the deadline table. Use separate rows for the VAT return, the section 155 VAT remittance, and the WHT remittance.
2. Set the section 155 VAT remittance due day to 14.
3. Set `vat_return` and `wht_remittance` to values verified from the NTAA 2025 text. Do not default them to the 21st as statutory facts.
4. Correct the small company turnover condition from ₦100,000,000 to ₦50,000,000.
5. Keep the fixed-assets cap at ₦250,000,000 and the professional-services exclusion.
6. Do not introduce a "small business" classification without primary NTAA text.
7. Verify the WHT rate table against the NTAA 2025 before coding.

## Impact Matrix

| Requirement | v1.1 / prior assumption | Primary statutory text | Result | Required v1.2 action |
|---|---|---|---|---|
| VAT return filing | 21st of the month after the transaction month | NTA 2025, s. 156(1): due day is the return due date that the NTAA 2025 prescribes | Unresolved (day delegated to NTAA) | Verify from NTAA 2025 text |
| VAT remittance | Defaulted to the 21st for both obligations | NTA 2025, s. 155(4): 14th day of the month after the transaction month | Corrected — distinct obligation at day 14 | Add separate row, set due day 14 |
| Small company turnover | ₦100,000,000 or below | NTA 2025, s. 202: ₦50,000,000 or less per annum | Corrected | Set ₦50,000,000 |
| Fixed assets | ₦250,000,000 or below | NTA 2025, s. 202: total fixed assets not exceeding ₦250,000,000 | Confirmed | Keep |
| Professional-services exclusion | Present | NTA 2025, s. 202: professional services business not classified as small company | Confirmed | Keep |
| Small business classification | Terms used interchangeably | Term absent from the Tax Act text | Not defined in the NTA | Do not model as an NTA class |
| WHT deadline | 21st | NTA 2025 text: none; delegated to NTAA 2025 and regulations | Unresolved (NTAA absent) | Verify from NTAA 2025 text |
| WHT rates | Technical-plan.md §5.7 table values | NTA 2025 text: none; NTA s. 14(4) cites NTAA 2025 s. 51 | Unresolved (NTAA absent) | Verify table from NTAA 2025 text |

## Verification

This task makes no application, schema, query, or data-layer change. Application verification does not apply.

The hard verification is repository-scope integrity.

- `bun run audit:load`: not run (no application change).
- `bun run typecheck`: not run (no application change).
- `bun run lint`: not run.
- `bun run test`: not run.
- `bun run build`: not run.

Final `git status --short` is captured after all permitted changes. Compare it with the baseline. The only task-created changes are the lookup index update and this report. All pre-existing staged, unstaged, and untracked changes remain intact.

## Files Changed

| File | Change |
|------|--------|
| `NRS-docs/OBLIGATION-LOOKUP-INDEX.md` | Updated. Resolved VAT and small company rows, added the small business and reverse-charge rows, corrected citations, updated notes. |
| `docs/reports/invoice-quote/nrs-obligation-reconciliation-2026-09-04.md` | Created. This findings report. |

## Skills Used

- writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English

## Risks or Limitations

- The canonical Markdown and JSON may inherit OCR errors from the source PDF. Any citation in this report is traceable to the local text, so a later correction can be verified.
- The Cable conversion contains numbering drift and extraction errors. It is used as a cross-check only.
- The NTAA 2025 text is absent. All NTAA-dependent values stay open by design. This report does not guess them.
- The lookup index note 5 previously cited section 46(4). The canonical text places the PAYE/DTS context at section 50(4). The index is corrected. No other pre-existing citation was changed without evidence.

## Deferred Work

- Add the Nigeria Tax Administration Act, 2025 gazette text under `NRS-docs/`.
- Resolve the VAT return day against the NTAA 2025.
- Resolve the WHT rate table and the WHT remittance day against the NTAA 2025.
- Finalize Technical-plan-v1.2.md using this report and the updated lookup index as the evidence base.
