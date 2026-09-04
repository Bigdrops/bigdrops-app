# NRS-Docs Obligation Lookup Index

This file maps product obligation rules from the engineering PRD to the exact gazette page where the rule appears in the Nigeria Tax Act, 2025.

## How to Use This File

- The PRD files are `Technical-plan.md` and `Technical-plan-v1.1.md` in the parent folder.
- The reference text is `NIGERIA-TAX-ACT-2025.md` in this folder.
- Gazette pages use the printed page numbers in the gazette, for example `A 475`.
- JSON page numbers refer to the `page_number` field in `NIGERIA-TAX-ACT-2025.json`.
- Line numbers refer to `NIGERIA-TAX-ACT-2025.md`.

## Canonical Source

`NIGERIA-TAX-ACT-2025.md` and `NIGERIA-TAX-ACT-2025.json` are derived from the official gazette PDF hosted by the Nigeria Revenue Service.

`Cable-Ngn-tax-act-2025-v2.md` is an older conversion. Its section numbers drift by minus one from the official numbering, starting at the stamp-duty chapter. It also contains extraction errors. Use `NIGERIA-TAX-ACT-2025.md` and its JSON as the canonical reference. Cross-check the Cable file only when a reading is unclear.

## Verification Status Legend

- VERIFIED: the gazette text confirms the rule.
- MISMATCH: the PRD value differs from the gazette text.
- NOT IN NRS-DOCS: the rule lives in the Nigeria Tax Administration Act, 2025 (NTAA), which this folder does not contain.
- NOT DEFINED: the term or classification does not occur in the Nigeria Tax Act, 2025 text in this folder.

---

## VAT Obligations

| PRD Rule | Act Provision | Gazette Page | JSON Page | MD Line | Status |
|----------|---------------|--------------|-----------|---------|--------|
| VAT rate 7.5% (`Technical-plan.md` §5.6) | §148 Rate of VAT | A 475 | 89 | 3135 | VERIFIED |
| VAT charge on taxable supplies (§145, §146) | §144–146 Imposition, Charge, Taxable supplies | A 473–474 | 87–88 | 3074–3100 | VERIFIED |
| VAT base = value of supply | §149 Value of taxable supplies | A 475 | 89 | 3137 | VERIFIED |
| Invoice issue date / time-of-supply anchor (IH-3) | §147 Time of supply | A 474 | 88 | 3105 | VERIFIED |
| VAT invoice contents and sequential numbering | §153 VAT invoice | A 477 | 91 | 3179 | VERIFIED |
| Service may direct electronic invoicing (30-day notice) | §153(4) | A 477 | 91 | 3201 | VERIFIED |
| Fiscalisation / e-invoicing system for transmission adapter | §158 Fiscalisation of supplies for VAT | A 478–479 | 92–93 | 3255 | VERIFIED |
| VAT return filing and net VAT remittance by taxable persons (general) — due date set by NTAA 2025 | §156(1) — the taxable person remits the excess output VAT not later than the NTAA 2025 return due date | A 478 | 92 | 3229 | NOT IN NRS-DOCS — see note 1 |
| VAT remitted by withholding agents and self-accounting persons: on or before the 14th day of the month after the transaction month (or as the Service prescribes) | §155(4) (persons under §155(1)–(2)) | A 478 | 92 | 3225 | VERIFIED — see note 1 |
| VAT withheld and remitted by the recipient of a supply from a non-resident supplier (reverse charge) | §151(2) — no remittance day stated in the Act | A 476 | 90 | 3157 | VERIFIED (obligation) — day unresolved (see note 1) |
| Exempt supplies (EXEMPT tax category, LI-4) | §186 Exempt supplies | A 493 | 107 | 3727 | VERIFIED |
| Zero-rated supplies (ZERO_RATED tax category, LI-4) | §187 Taxable supplies chargeable at 0% | A 494 | 108 | 3764 | VERIFIED |

## Companies Income Tax and Development Levy

| PRD Rule | Act Provision | Gazette Page | JSON Page | MD Line | Status |
|----------|---------------|--------------|-----------|---------|--------|
| Small company CIT rate 0% (`Technical-plan.md` §9.4 estimator) | §56(a) | A 428 | 42 | 1604 | VERIFIED |
| Other companies CIT 30%, reducible to 25% by presidential order | §56(b) | A 428 | 42 | 1606–1608 | VERIFIED |
| Small company definition — gross turnover at or below ₦50,000,000, fixed assets at or below ₦250,000,000, professional services excluded | §202 General interpretation, "small company" | A 514 | 128 | 4502 | VERIFIED — see note 2 |
| "Small business" classification | Not defined in the Nigeria Tax Act, 2025 — the term does not occur in the Act text | — | — | — | NOT DEFINED — see note 2 |
| Development levy 4%, excluding small companies and non-resident companies | §59(1) | A 429–430 | 43–44 | 1649 | VERIFIED |
| Effective tax rate floor 15% (large groups and companies at or above ₦50,000,000,000 turnover only) | §57 | A 428–429 | 42–43 | 1613 | VERIFIED — see note 3 |
| Small company status conditions shown in Compliance Hub (`Technical-plan.md` §8.3) | §56(a) + §202 "small company" | A 428, A 514 | 42, 128 | 1604, 4502 | MISMATCH — PRD §8.3 turnover figure is ₦100,000,000 — see note 2 |

## Withholding Tax (WHT)

| PRD Rule | Act Provision | Gazette Page | JSON Page | MD Line | Status |
|----------|---------------|--------------|-----------|---------|--------|
| WHT rate table keyed by transaction nature (`Technical-plan.md` §5.7; LI-1) | Rates prescribed under NTAA 2025 — NTA §10(3)(c) and §14(4) delegate deduction-at-source rates to the NTAA 2025 | A 400, A 405–406 | 14, 19–20 | 713, 891 | NOT IN NRS-DOCS — see note 4 |
| WHT remittance deadline (`Technical-plan-v1.1.md` §8.1, 21st) | Return and remittance timing set by NTAA 2025 and PAYE/DTS regulations (NTA §50(4) context) | A 426 | 40 | 1561 | NOT IN NRS-DOCS — see note 5 |
| Deduction at source as final tax for non-resident income | §14(4) | A 405–406 | 19–20 | 891 | VERIFIED (context only) |
| 4% fallback charge on non-resident income not covered by NTAA deduction at source | §14(8) | A 407 | 21 | 921 | VERIFIED (context only) |

## Compliance Hub Deadlines (`Technical-plan-v1.1.md` §8.1)

| Obligation Type | PRD Statutory Due Day | Act Provision | Gazette Page | Status |
|-----------------|-----------------------|---------------|--------------|--------|
| vat_return | 21 | §156(1) defers to NTAA 2025 return due date | A 478 | NOT IN NRS-DOCS — see note 5 |
| wht_remittance | 21 | NTAA 2025 §51 and regulations | — | NOT IN NRS-DOCS — see note 5 |
| VAT remittance — collected, withheld or self-accounted VAT under §155 (withholding agents, government bodies, self-accounting persons) | 14 | §155(4) | A 478 | VERIFIED — see note 1 |

---

## Notes

1. **VAT obligations are distinct — the 14th day is statutory for the §155 remittance.** The Tax Act text at §155(4) (page A 478, JSON page 92, MD line 3225) says VAT collected, withheld, or self-accounted under §155 must be remitted on or before the 14th day of the month after the transaction month, or as the Service prescribes. This covers Federal, State and Local Government bodies and their MDAs, persons appointed by the Service (§155(1)), and persons directed by the Service to self-account (§155(2)). This obligation is separate from the VAT return. For taxable persons generally, §156(1) (page A 478, JSON page 92, MD line 3229) requires the taxable person to remit the excess of output VAT over input VAT not later than the due date for the return that the NTAA 2025 prescribes. The Tax Act does not fix that day; the NTAA 2025 text is required (see note 5). Non-resident reverse-charge VAT (§151(2), page A 476, JSON page 90, MD line 3157) is a further distinct obligation; the Act does not state its remittance day. The PRD deadline table (`Technical-plan-v1.1.md` §8.1) defaults `vat_return` and `wht_remittance` to the 21st. No 21st-day rule appears anywhere in the Tax Act text in this folder. The 14th-day rule is confirmed for the §155 obligation. Do not collapse the §155 remittance, the VAT return, and ordinary VAT remittance into one deadline.

2. **Small company threshold — ₦50,000,000 confirmed; "small business" is not defined.** Section 202 General interpretation (gazette page A 514, JSON page 128, MD line 4502) defines "small company" as a company with gross turnover of ₦50,000,000 or less per annum, total fixed assets not exceeding ₦250,000,000, and provides that a business providing professional services is not classified as a small company. The ₦100,000,000 figure in `Technical-plan.md` §8.3 and in the Cable conversion (line 4405) does not come from the Nigeria Tax Act, 2025. The statutory figure is ₦50,000,000. The PRD figure needs correction or a documented source. The fixed-assets cap (₦250,000,000) and the professional-services exclusion match the Act. The term "small business" does not occur in the Tax Act text in this folder. The Act defines "small company" only. There is no separate "small business" classification to reconcile.

3. **Effective tax rate floor.** §57 applies only to multinational groups with aggregate turnover of at least €750,000,000 and to companies with aggregate turnover at or above ₦50,000,000,000. It does not apply to ordinary SME tenants. Do not include it in the SME compliance dashboard.

4. **WHT rate table is not in the Tax Act.** `Technical-plan.md` §5.7 lists rates for goods, construction, services, rent, and exempt transactions. The Tax Act does not contain this table. It states that the rate applied for deduction at source is the rate prescribed by the Nigeria Tax Administration Act, 2025 (§10(3)(c), page A 400, MD line 713) and refers to deduction at source in accordance with section 51 of the NTAA 2025 (§14(4), page A 405–406, MD line 891). The NRS-docs folder contains only the Tax Act, not the NTAA. Obtain the NTAA 2025 text before finalising the rate table.

5. **The 21st-day deadline is not in the Tax Act.** The Tax Act text in this folder contains no 21st-day remittance rule. VAT remittance timing is the 14th day under §155(4) for the persons it covers, and the general VAT return due date is delegated to NTAA 2025 through §156(1). WHT remittance timing is delegated to NTAA 2025 and the PAYE/DTS regulations. The nearest Tax Act context is §50(4) (page A 426, JSON page 40, MD line 1561), the compensation-for-loss-of-office deduction, which remits the tax within the time specified under the PAYE or Deduction of Tax at Source Regulations issued under the NTAA 2025. Some earlier drafts cited this as §46(4); the canonical text places it at §50(4). Verify the 21st against the NTAA 2025 text, which is not present in NRS-docs.

6. **Not in this folder.** The Nigeria Tax Administration Act, 2025 is referenced throughout the Tax Act but is not stored under `NRS-docs/`. Any rule whose Act Provision column shows NTAA requires that Act's text for verification.

---

## Gazette Page to JSON Page Quick Map

| Gazette Page | JSON Page |
|--------------|-----------|
| A 399–400 | 13–14 |
| A 405–407 | 19–21 |
| A 426 | 40 |
| A 428 | 42 |
| A 429–430 | 43–44 |
| A 473 | 87 |
| A 474 | 88 |
| A 475 | 89 |
| A 476 | 90 |
| A 477 | 91 |
| A 478 | 92 |
| A 479 | 93 |
| A 493 | 107 |
| A 494 | 108 |
| A 513–514 | 127–128 |
