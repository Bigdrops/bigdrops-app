# OpenAccountants and OpenFisca Tax Architecture Reference

REFERENCE ONLY — NOT STATUTORY AUTHORITY

This document is not a statutory source. The canonical NTA 2025
materials in NRS-docs/ remain the source of truth. Do not copy code
from either project. Do not import either project into BIGDROPS.

## Sources

- openaccountants/openaccountants — inspected commit 91c376e,
  2026-09-04. AGPL-3.0 (code), Guide License v1.0 (content).
- openfisca/openfisca-core — inspected commit 0e4be15, 2026-09-04.
  AGPL-3.0. Plus openfisca/country-template v8.0.0.
- Full evidence: docs/Reports/general/openaccountants-openfisca-tax-architecture-audit-2026-09-05.md

## What each project is

- OpenAccountants is a knowledge layer: 1,998 accountant-reviewed tax
  guides across 245 jurisdictions, delivered to AI clients through an
  MCP server. It has no executable tax engine.
- OpenFisca is a rules-as-code framework for legislation modelling.
  It has no Nigeria content in the inspected core or template.

## Patterns to adopt for the BIGDROPS tax engine

### From OpenFisca (rules engine)

- Date-keyed parameters: each tax value stored as data with an
  effective date, a statutory citation, and a unit. The engine resolves
  the value at the accounting period's date.
- Versioned formulas: a rule that changes is a new formula selected by
  the year of assessment. Example: formula_2015_12 and formula_2016_12
  for one variable.
- Marginal-rate tables: CIT bands, WHT tables, and PAYE bands model as
  brackets with rate and threshold per effective date.
- Null as "rule not in force": a value of null at a date means the
  rule ended then.
- Declarative tests: fixtures with name, period, input, and expected
  output per sub-period, including the boundary before and after an
  effective date.
- Computation trace: record which rule ran, which parameter values
  applied, which period applied, and the per-step result. This is the
  explainability model.
- Engine never creates facts: a tax engine consumes accounting facts
  and must not synthesize them.

### From OpenAccountants (knowledge layer)

- Jurisdiction packages with a machine-readable inventory (index.json).
- Structured facts as the single source of verified values, rendered
  into prose ("edit the facts, not the prose").
- Review metadata: named reviewer, licence number, review status, tax
  year, last-updated date.
- Per-fact statutory citations.
- Refusal catalogue: explicit out-of-scope codes with reasons.
- Conservative defaults: an explicit table stating the default when an
  input is unknown, with a safe bias (unknown asset base denies
  small-company status).
- TBC flags: uncertain items excluded from verified facts and labelled.

## Patterns to adapt

- Store parameters in Postgres tables keyed by effective date and
  tenant, instead of YAML files.
- Implement formulas as TypeScript pure functions keyed by year of
  assessment.
- Use a lightweight computation log instead of the full OpenFisca
  graph tracer.
- Use JSON or TypeScript fixtures instead of YAML tests.
- Keep one parameter namespace per jurisdiction, starting with NG.

## Patterns to reject

- OpenFisca as a dependency. It is Python and numpy-based. It does not
  fit the Bun/React/Supabase stack.
- OpenFisca float money (numpy float64). BIGDROPS uses exact Decimal
  and Numeric money.
- OpenAccountants tax values as rules. They are knowledge, not law.
- The 20% medium-company CIT band. It appears in OpenAccountants,
  TaxBridge, and TekVwarho. The canonical NTA 2025 (§56) has no such
  band.
- The "Sixth Schedule" label for capital allowances. The canonical
  NTA 2025 places them in the First Schedule (§27(1)).
- Any filing deadline not backed by the NTAA or the canonical text.

## Nigerian values verified against the canonical text

- Small company: turnover ≤ ₦50M, fixed assets ≤ ₦250M, professional
  services excluded (§202). OpenAccountants' facts block agrees; its
  rate table does not.
- CIT rates: small 0%, other 30%, reducible to 25% by Order (§56).
- Development Levy: 4%, excluding small and non-resident companies
  (§59). OpenAccountants states 4% in the facts block and 2% in the
  rate table.
- Minimum ETR: 15% for €750M groups or ₦50B companies (§57).
  OpenAccountants agrees.
- Total profits: assessable profits minus losses minus First Schedule
  capital allowances (§27(1)).
- Loss relief: indefinite carry-forward, no carry-back. OpenAccountants
  agrees. A loss register with period, restriction, consumption, and
  balance must still be built.

## Nigerian values that remain unresolved

- VAT registration threshold under the NTA 2025 (₦100M per
  OpenAccountants). Not verifiable from the canonical extract reviewed.
- Capital-allowance rates in the First Schedule. OpenAccountants lists
  legacy CITA rates under a wrong schedule label.
- WHT rates. OpenAccountants cites CITA s.78 (construction 2.5%;
  professional 5%). The BIGDROPS WHT question is delegated to an
  unsourced subsidiary regulation.
- Filing deadlines. OpenAccountants states VAT 21st and CIT 6 months
  without NTAA citations. The NTAA 2025 is absent from BIGDROPS
  NRS-docs.

## Status

REFERENCE ONLY — NOT STATUTORY AUTHORITY.

The recommended architecture for the future BIGDROPS tax engine:

- Accounting ledger: native BIGDROPS module.
- Accounting period and P&L: native BIGDROPS module.
- Tax adjustment layer: BIGDROPS tax domain.
- Versioned Nigerian tax rules: date-keyed parameters with citations.
- Calculation and explanation trace: computation log per result.
- Compliance obligation, evidence, filing, payment, reconciliation:
  BIGDROPS compliance domain.