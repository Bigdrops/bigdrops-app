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
| VAT remittance date for taxable persons (general) | §156(1) — return due date set by NTAA 2025 | A 478 | 92 | 3229 | NOT IN NRS-DOCS |
| VAT remitted by withholding agents and self-accounting persons: on or before the 14th day of the month after the transaction month | §155(4) | A 478 | 92 | 3225 | MISMATCH — see note 1 |
| Exempt supplies (EXEMPT tax category, LI-4) | §186 Exempt supplies | A 493 | 107 | 3727 | VERIFIED |
| Zero-rated supplies (ZERO_RATED tax category, LI-4) | §187 Taxable supplies chargeable at 0% | A 494 | 108 | 3764 | VERIFIED |

## Companies Income Tax and Development Levy

| PRD Rule | Act Provision | Gazette Page | JSON Page | MD Line | Status |
|----------|---------------|--------------|-----------|---------|--------|
| Small company CIT rate 0% (`Technical-plan.md` §9.4 estimator) | §56(a) | A 428 | 42 | 1604 | VERIFIED |
| Other companies CIT 30%, reducible to 25% by presidential order | §56(b) | A 428 | 42 | 1606–1608 | VERIFIED |
| Small company definition — gross turnover at or below ₦50,000,000, fixed assets at or below ₦250,000,000, professional services excluded | Interpretation section, "small company" | A 514 | 128 | 4502 | MISMATCH — see note 2 |
| Development levy 4%, excluding small companies and non-resident companies | §59(1) | A 429–430 | 43–44 | 1649 | VERIFIED |
| Effective tax rate floor 15% (large groups and companies at or above ₦50,000,000,000 turnover only) | §57 | A 428–429 | 42–43 | 1613 | VERIFIED — see note 3 |
| Small company status conditions shown in Compliance Hub (`Technical-plan.md` §8.3) | §56 + interpretation "small company" | A 428, A 514 | 42, 128 | 1604, 4502 | MISMATCH — see note 2 |

## Withholding Tax (WHT)

| PRD Rule | Act Provision | Gazette Page | JSON Page | MD Line | Status |
|----------|---------------|--------------|-----------|---------|--------|
| WHT rate table keyed by transaction nature (`Technical-plan.md` §5.7; LI-1) | Rates prescribed under §51 NTAA 2025 — the Tax Act delegates the rate table | — | — | 713 (A 400) | NOT IN NRS-DOCS — see note 4 |
| WHT remittance deadline (`Technical-plan-v1.1.md` §8.1, 21st) | Return and remittance timing set by NTAA 2025 and PAYE/DTS regulations | — | — | 1561 (A 426) | NOT IN NRS-DOCS — see note 5 |
| Deduction at source as final tax for non-resident income | §14(4) | A 405–406 | 19–20 | 891 | VERIFIED (context only) |
| 4% fallback charge on non-resident income not covered by NTAA deduction at source | §14(8) | A 407 | 21 | 921 | VERIFIED (context only) |

## Compliance Hub Deadlines (`Technical-plan-v1.1.md` §8.1)

| Obligation Type | PRD Statutory Due Day | Act Provision | Gazette Page | Status |
|-----------------|-----------------------|---------------|--------------|--------|
| vat_return | 21 | §156(1) defers to NTAA 2025 return due date | A 478 | NOT IN NRS-DOCS — see note 5 |
| wht_remittance | 21 | NTAA 2025 §51 and regulations | — | NOT IN NRS-DOCS — see note 5 |

---

## Notes

1. **VAT remittance — 14th vs 21st.** The Tax Act text at §155(4) (page A 478) says VAT collected, withheld, or self-accounted must be remitted on or before the 14th day of the month after the transaction month. The PRD deadline table (`Technical-plan-v1.1.md` §8.1) defaults both obligations to the 21st. The 14th-day rule applies to withholding agents, government bodies, and self-accounting persons under §155. The general VAT return due date is set by NTAA 2025 through §156(1). Confirm which obligation type the 21st belongs to before implementation.

2. **Small company turnover — ₦50,000,000 vs ₦100,000,000.** The official gazette text (JSON page 128, MD line 4502) defines "small company" as gross turnover at or below ₦50,000,000 per annum. `Technical-plan.md` §8.3 and the Cable conversion both state ₦100,000,000. The ₦100,000,000 figure does not come from the Nigeria Tax Act, 2025. The PRD figure needs correction or a documented source. The fixed-assets cap (₦250,000,000) and the professional-services exclusion match the Act.

3. **Effective tax rate floor.** §57 applies only to multinational groups with aggregate turnover of at least €750,000,000 and to companies with aggregate turnover at or above ₦50,000,000,000. It does not apply to ordinary SME tenants. Do not include it in the SME compliance dashboard.

4. **WHT rate table is not in the Tax Act.** `Technical-plan.md` §5.7 lists rates for goods, construction, services, rent, and exempt transactions. The Tax Act does not contain this table. It states that the rate applied for deduction at source is the rate prescribed by the Nigeria Tax Administration Act, 2025 (§51). The NRS-docs folder contains only the Tax Act, not the NTAA. Obtain the NTAA 2025 text before finalising the rate table.

5. **The 21st-day deadline is not in the Tax Act.** The Tax Act text in this folder contains no 21st-day remittance rule. VAT remittance timing is the 14th day under §155(4) for the persons it covers, and the general return due date is delegated to NTAA 2025 (§156(1)). WHT remittance timing is delegated to NTAA 2025 and the PAYE/DTS regulations (§46(4) context, page A 426). Verify the 21st against the NTAA 2025 text, which is not present in NRS-docs.

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
