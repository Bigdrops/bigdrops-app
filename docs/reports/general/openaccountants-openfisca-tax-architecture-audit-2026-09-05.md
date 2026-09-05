# OpenAccountants and OpenFisca Tax Architecture Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Compare openaccountants/openaccountants and OpenFisca (openfisca-core
plus the country-template package) against the BIGDROPS Nigeria NTA 2025
taxation requirements.

Determine what BIGDROPS should adopt, adapt, or reject while designing
its native, tenant-aware, versioned Nigerian tax engine.

This audit is read-only. No repository was modified.

## Scope

- Inspect OpenAccountants as a knowledge and skill repository.
- Inspect OpenFisca as a rules-as-code engine.
- Compare both independently against the canonical NTA 2025 in NRS-docs/.
- Use the completed TaxBridge, TekVwarho, and Luca audits as comparison
  inputs only.
- Produce exactly two documentation artifacts:
  - this audit report;
  - a curated reference under the Refrences/ folder.

## Skills used

karpathy, writing-clearly-and-concisely

No tax or accounting-specific skill exists in docs/PROJECTSKILLINDEX.md.
This audit was performed from source architecture and statutory text.

## Documentation standard

ASD-STE100 Simplified Technical English

## Repository identity and version

### OpenAccountants

- Repository: openaccountants/openaccountants
- Inspected commit: 91c376e, dated 2026-09-04 (nightly content sync)
- Content: 1,998 guides, 245 jurisdictions (index.json)
- License: AGPL-3.0 (code); OpenAccountants Guide License v1.0 (content)
- Primary content: Markdown guides under packages/{jurisdiction}/
- Executable code: approximately 30 Python files. These form the MCP
  delivery server (mcp/openaccountants_mcp). There is no executable tax
  engine.
- Last synced one day before this audit. Actively maintained.

### OpenFisca

- Repository: openfisca/openfisca-core
- Inspected commit: 0e4be15, dated 2026-09-04
- License: AGPL-3.0
- Country template: openfisca/country-template, version 8.0.0
- Content: a Python framework for rules-as-code legislation modelling.
  No Nigeria-specific content exists in the inspected core or template.
- Actively maintained.

## Files changed

- docs/Reports/general/openaccountants-openfisca-tax-architecture-audit-2026-09-05.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/openaccountants-openfisca-tax-reference.md

## Changes made

None. This task created documentation only. The working tree was not
modified in any other way.

## Baseline git status

Captured before inspection (22 pre-existing entries, unchanged):

```
AM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
MM docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/files-tax-monthly-prd-audit-2026-09-05.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
A  docs/reports/general/invoice-to-quotation-revert-fix.md
A  docs/reports/general/vat-filing-support-prd-update-2026-09-05.md
A  docs/reports/multi-tenancy/workspace-management-gaps-audit.md
M  src/domain/tenant/tenantCreation.ts
M  src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/settings/AdminSettingsSection.tsx
M  src/pages/viewQuotationActions.ts
A  supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
A  supabase/migrations/20260905010000_workspace_management_gaps.sql
?? docs/Reports/general/cit-readiness-audit-2026-09-05.md
?? docs/Reports/general/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md
?? docs/Reports/general/record-capture-prd-audit-2026-09-05.md
?? docs/Reports/general/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md
?? docs/Reports/general/tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md
?? docs/Reports/multi-tenancy/entity-lifecycle-audit.md
?? docs/Reports/multi-tenancy/ownership-transfer-ui.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/
```

All pre-existing entries belong to concurrent agents. They were not
modified.

---

# 1. EXECUTIVE VERDICTS

## OPENACCOUNTANTS: USEFUL REFERENCE WITH MATERIAL GAPS

OpenAccountants is a reviewed knowledge layer, not an engine. Its
architecture for source-backed tax knowledge is reusable. Its Nigerian
tax values are internally contradictory and partly wrong.

## OPENFISCA: USEFUL REFERENCE WITH MATERIAL GAPS

OpenFisca is the best rules-as-code architecture inspected in this
series. Its versioned parameters, versioned formulas, and tracing model
directly answer the BIGDROPS versioning and explainability requirements.
Its money model (numpy float64) is unsuitable for exact finance, and the
framework cannot be imported into BIGDROPS.

## COMBINED ARCHITECTURAL VALUE FOR BIGDROPS: HIGH

The two projects complement each other:

- OpenAccountants supplies the knowledge-layer pattern: jurisdiction
  packages, structured facts with per-fact citations, named review
  metadata, refusal catalogues, and honest ambiguity flags.
- OpenFisca supplies the rules-engine pattern: date-keyed parameters,
  versioned formulas, tax-scale brackets, declarative scenario tests,
  and a computation trace.

Neither project supplies a correct Nigerian CIT value set. All values
must come from the canonical NTA 2025.

---

# 2. OPENACCOUNTANTS — ARCHITECTURE

## What it is

OpenAccountants is primarily an AI-citation knowledge repository with a
delivery mechanism (MCP server). It is not an accounting system and not
a tax engine.

- Accounting concepts: represented only as guidance content
  (financial-reporting skills folder). No ledger, journal, or period
  model exists.
- Tax rules: represented as human-readable guides with structured
  `skill_facts` blocks that render the "verified rates and thresholds"
  section. The guides state "edit the facts, not the prose".
- Jurisdiction separation: one folder per jurisdiction under
  packages/, with an index.json inventory.
- Source authorities: per-fact `_(SOURCE)_` annotations, for example
  `(NIGERIAN TAX ACT 2025)` or `(CITA s 78)`.
- Explainability: guides explain rules in plain language with worked
  examples. There is no machine-executed calculation trace.
- Machine-readable rules: no. The facts are rendered text, not a
  computation model.

## Reusable knowledge-layer patterns

- packages/{jurisdiction}/ organization with index.json inventory.
- skill_facts: a single structured source that generates the verified
  prose ("edit the facts, not the prose").
- Review metadata: reviewed_by (named accountant and licence number),
  review_status, tier, tax_year, last_updated.
- Conservative defaults: an explicit table stating the default when an
  input is unknown (for example, unknown asset base denies
  small-company status).
- Refusal catalogue: explicit out-of-scope codes (R-NG-CIT-1 to
  R-NG-CIT-7) with reasons.
- TBC flags: unresolved items are labelled and excluded from the
  verified facts.

---

# 3. OPENACCOUNTANTS — NIGERIA CONTENT

## Coverage

packages/nigeria/ contains 19 files: ng-cit, ng-vat, ng-vat-return,
ng-wht, ng-cgt, ng-income-tax, ng-personal-income-tax, ng-payroll,
ng-formation, ng-return-assembly, plus workflow bases and references.

All content is documentation. No executable calculation exists in the
Nigeria package.

## Statutory conflicts found in ng-cit.md

The guide contradicts itself in two separate blocks.

| Element | skill_facts block | NTA 2025 rate table (1.1) | Canonical NTA 2025 | Verdict |
|---|---|---|---|---|
| Small-company turnover | ≤ ₦50M | ≤ ₦100M | ≤ ₦50M (§202) | Facts block correct; rate table incorrect |
| Small-company fixed assets | ≤ ₦250M | ≤ ₦250M | ≤ ₦250M (§202) | Correct |
| Professional-services exclusion | Absent | Absent | Present (§202) | Missing |
| Medium band | ₦100M-₦500M at 20% | ₦100M-₦1B at 20% | No medium band (§56) | Incorrect |
| Large rate | 30% + 4% levy | 30% to ~25% by 2029 | 30%, reducible to 25% by Order (§56) | Partially correct |
| Development Levy | 4% | 2% | 4% (§59(1)) | Facts block correct; rate table incorrect |
| Min ETR | 15% for MNEs | 15%, €750M groups | 15%, €750M groups (§57) | Correct |
| Loss carry-forward | Indefinite, no carry-back | — | Loss relief per §27 | Consistent |

## Capital-allowance schedule error

The guide states capital allowances sit under the "Sixth Schedule NTA
2025" (line 180: "Second Schedule CITA / Sixth Schedule NTA 2025").

The canonical text places capital allowances in the **First Schedule**:
section 27(1) reads "capital allowance in accordance with the provisions
of Part I of the First Schedule to this Act". The Sixth Schedule appears
in the canonical text only in a petroleum-cost context (line 1933).

Verdict: incorrect schedule reference. The guide's caveat "TBC under NTA
2025 Sixth Schedule" is itself based on a wrong premise.

## Other Nigeria findings

- The rate table for capital allowances (initial/annual rates per asset
  class) is the legacy CITA Second Schedule table with a TBC caveat. It
  is presented as unconfirmed, which is honest, but the schedule name is
  wrong.
- The computation-layers block correctly separates Adjusted Profit,
  Assessable Profit, Total Profit (Assessable minus Capital Allowances
  minus Loss Relief), and tax payable. This matches the canonical
  structure of sections 22 and 27.
- Filing deadline: "6 months after accounting year end", cited as
  "Section 55 CITA / equivalent NTA 2025". No NTAA citation. The NTAA is
  absent from BIGDROPS NRS-docs, so this remains unverified for
  BIGDROPS.
- VAT return deadline: 21st of the following month, stated without an
  NTAA citation. This matches NTAA section 22(1), which was converted in
  a prior session but is not yet in the repository.
- VAT registration threshold: the guide lists ₦25M (Finance Act 2019)
  and ₦100M (NTA 2025). The canonical NTA extract reviewed does not
  state this threshold. Requires verification.
- WHT: ng-wht.md cites CITA s.78 rates (construction 2.5% per Finance
  Act 2020; professional 5%). The BIGDROPS WHT question is delegated to
  an unsourced subsidiary regulation. These values cannot close it.
  Note TekVwarho used 5% for construction, which conflicts with this
  guide's 2.5%.
- Refusal catalogue correctly excludes upstream oil and gas, banks and
  insurance, free trade zones, and transfer pricing from the generic
  CIT path.

---

# 4. OPENFISCA — RULES-AS-CODE ARCHITECTURE

## Core model

- Entities: Person and group entities with roles
  (openfisca_core/entities/).
- Variables: a Variable class with value_type, entity,
  definition_period, label, reference (legislative source),
  documentation, calculate, set_input, and
  is_period_size_independent (openfisca_core/variables/variable.py).
- Formulas: versioned by effective date. The country template defines
  formula_2016_12 and formula_2015_12 for the same variable. The engine
  selects the formula that applies at the requested period.
- Parameters: YAML legislation trees loaded by
  load_parameters(path_to_yaml_dir). Each leaf has a date-keyed value
  history:
  `values: {2015-12-01: {value: 600.0}}`.
- Null values: a parameter can be set to null at a date to mean "rule
  no longer in force" (housing_allowance example).
- Metadata: parameters carry metadata.reference (law URL) and
  metadata.unit (for example currency-EUR). The variable reference
  attribute is documented as "Always use the most official source".
- Periods: Instant and Period with DAY, MONTH, YEAR, ETERNITY units,
  plus ADD and DIVIDE aggregation operators
  (openfisca_core/periods/, model_api.py).
- Tax scales: ParameterScale and ParameterScaleBracket model marginal
  rate tables. Each bracket has date-keyed rate and threshold values
  (tests/core/parameters_fancy_indexing/bareme.yaml).
- Reforms: a Reform subclass of TaxBenefitSystem with apply() and
  modify_parameters(). This models legislative change and policy
  experiments (openfisca_core/reforms/).
- Tracing: FullTracer, TraceNode, SimpleTracer,
  TracingParameterNodeAtInstant, and FlatTrace
  (openfisca_core/tracers/). A calculation can report which formula
  ran, which parameter values applied, and which inputs contributed.
- Reproducibility: a simulation is a deterministic function of
  legislation version, parameter dates, and scenario inputs.

## Money precision

OpenFisca value types are Boolean, Int, Float, String, Date
(openfisca_core/variables/config.py). Money is represented as Float,
backed by numpy float64 arrays. There is no Decimal type.

Verdict: OpenFisca is a vectorized modelling engine, not an exact-money
system. BIGDROPS must keep exact money in Decimal and Numeric storage.

---

# 5. VERSIONED TAX PARAMETERS

## OpenFisca pattern

The pattern is:

- One YAML file per parameter under parameters/.
- Each value is keyed by an effective date.
- The engine resolves the value at the requested instant.
- Formulas are versioned by the date they apply from.
- Tests can declare a period and the engine applies the rules in force
  at that period.

This is the strongest versioning model inspected in this series. It
answers the BIGDROPS requirement directly:

```
Tax rule version + effective period + statutory source → deterministic
calculation
```

## Recommendation for BIGDROPS

Adopt the principle, not the framework:

- Store tax parameters as data, keyed by effective date, with a
  statutory citation and unit on each value.
- Version formulas by year of assessment where the law changes the
  computation itself.
- Resolve every rule lookup through an "as of" date derived from the
  accounting period.

---

# 6. RULE TRACEABILITY

## OpenFisca

The tracer records the computation graph: which formula ran, which
parameters were read, which period applied, and the per-node result.
This is the explainability model BIGDROPS needs.

## OpenAccountants

The knowledge layer explains rules in prose and marks uncertain values
as TBC. It does not trace computations because it does not compute.

## Recommendation for BIGDROPS

A future BIGDROPS tax result should be explainable at two levels:

1. A computation trace (which rule, which parameter values, which
   period, which inputs, result per step).
2. A statutory citation attached to each rule, so a user can open the
   underlying NTA provision.

---

# 7. TESTING ARCHITECTURE

## OpenFisca

- Declarative YAML tests: each test has name, period, input, and
  output with expected values per sub-period
  (openfisca_country_template/tests/age.yaml).
- Tests can apply reforms and extensions
  (InYamlTestReform, Test dataclass in test_runner.py).
- ErrorMargin allows tolerance for float comparisons.
- The basic_income tests assert the rule returns zero before its
  effective date and the correct value after. This is the boundary and
  period-behaviour pattern BIGDROPS needs.

## OpenAccountants

- No automated rule tests. The equivalent is the accountant-review
  metadata and the TBC exclusions. This is review, not regression
  testing.

## Recommendation for BIGDROPS

Use OpenFisca-style declarative fixtures: one fixture per statutory
rule, with exact boundary values and effective-date boundaries, each
with a citation. This matches the boundary-test style recommended in
the TaxBridge and TekVwarho audits, with corrected statutory values.

---

# 8. NIGERIAN CIT MODELLING

## Neither project provides a correct NTA 2025 CIT model

- OpenAccountants provides prose with correct small-company facts
  (₦50M/₦250M) but wrong medium-band and levy values, and a wrong
  schedule reference for capital allowances.
- OpenFisca provides no Nigeria content. It offers only the modelling
  architecture.

## Recurring error

The 20% medium-company band appears in OpenAccountants, TaxBridge, and
TekVwarho. The canonical NTA 2025 (§56) has no such band. Agreement
between independent projects does not establish correctness.

## Required canonical model (from NRS-docs)

- Small company: turnover ≤ ₦50M, fixed assets ≤ ₦250M, professional
  services excluded (§202, line 4502 of the canonical text).
- Rates: small 0%, other 30%, reducible to 25% by Order (§56).
- Development Levy: 4%, excluding small and non-resident companies
  (§59).
- Minimum ETR: 15% for €750M groups or ₦50B companies (§57).
- Total profits: assessable profits minus losses minus First Schedule
  capital allowances (§27(1)).
- Capital allowances: First Schedule, with proration for partly-used
  assets (§27(3)) and no proration below 10% non-taxable income
  (§27(4)).

---

# 9. CAPITAL ALLOWANCES

## Finding

Neither project implements Nigerian statutory capital allowances:

- OpenAccountants documents legacy CITA Second Schedule rates under a
  wrong "Sixth Schedule" label, with a TBC caveat.
- OpenFisca has no asset or allowance model beyond what a country
  package defines.

BIGDROPS must independently design the capital-allowance layer from the
First Schedule. The asset register concept from the TekVwarho and Luca
audits remains the input source. Depreciation is never a substitute.

---

# 10. LOSS MODEL

## Finding

- OpenAccountants documents indefinite carry-forward with no carry-back,
  consistent with the canonical §27 loss-relief structure.
- OpenFisca has no loss model. A country package would define it.

Neither project supplies a loss register with period association,
restriction, consumption, and remaining balance. BIGDROPS must build
this layer.

---

# 11. ACCOUNTING FOUNDATION

## Finding

Neither project addresses the BIGDROPS accounting gaps:

- OpenAccountants has no ledger, journal, or period model.
- OpenFisca is a calculation framework. It assumes scenario inputs
  exist. It does not create accounting facts.

The accounting layer must remain native to BIGDROPS. The OpenFisca
principle "the engine does not create facts" is correct: a tax engine
must consume accounting facts, never synthesize them.

---

# 12. MONEY PRECISION

| Project | Money representation | Verdict |
|---|---|---|
| OpenAccountants | Prose values only | Not applicable |
| OpenFisca | Float (numpy float64) | Not exact; unsuitable for money |
| BIGDROPS current | Document-level totals | Must use Decimal |

Recommendation: exact decimal money in Numeric columns and Decimal
arithmetic, per the Luca and TekVwarho findings. Do not adopt the
OpenFisca float model for financial output.

---

# 13. COMPLIANCE AND FILING

- OpenAccountants documents deadlines (VAT 21st, CIT 6 months) without
  NTAA citations. Not verifiable from BIGDROPS NRS-docs.
- OpenFisca models obligations only if a country package defines them.
- NTAA 2025 remains absent from BIGDROPS NRS-docs. Filing deadlines
  must not be invented.

---

# 14. COMPARISON WITH TAXBRIDGE

| Dimension | OpenAccountants | OpenFisca | TaxBridge |
|---|---|---|---|
| Nigerian tax relevance | High (prose) | None in core | High (code) |
| CIT architecture | None executable | Framework only | Function, wrong values |
| Rule parameterization | skill_facts text | Date-keyed YAML | Hardcoded constants |
| Effective dates | tax_year metadata | Full date history | None |
| Statutory traceability | Per-fact citations | reference attribute | Wrong citations |
| Accounting foundation | None | None | None |
| Capital allowances | Wrong schedule label | None | None |
| Loss modeling | Prose rules | None | None |
| Precision | N/A | Float | Float |
| Testing | Accountant review | Declarative YAML | Unit tests, wrong boundaries |
| Compliance | Deadline prose | Framework only | Hardcoded calendar |
| Reusability for BIGDROPS | Knowledge layer | Rules architecture | Structure only |

The 20% medium band recurs in OpenAccountants and TaxBridge. OpenFisca
is the only project with correct versioning and trace architecture.

---

# 15. COMBINED BIGDROPS RECOMMENDATION

## ADOPT

- Date-keyed tax parameters with statutory citation and unit metadata
  (OpenFisca pattern).
- Formula selection by effective date (OpenFisca formula_<date>
  pattern).
- Marginal-rate table modelling for CIT bands and WHT tables
  (ParameterScale brackets).
- Declarative scenario tests with per-period expected values
  (OpenFisca YAML tests).
- Computation trace for explainability (OpenFisca tracer concept).
- Jurisdiction-separated knowledge packages with an inventory
  (OpenAccountants packages/ + index.json pattern).
- Structured facts as the single source for verified values, with
  review metadata (OpenAccountants skill_facts pattern).
- Refusal catalogue and conservative-defaults tables
  (OpenAccountants pattern).
- The principle: a tax engine consumes accounting facts and never
  creates them (OpenFisca philosophy).

## ADAPT

- Parameter storage: YAML files map to Postgres tables keyed by
  effective date and tenant scope.
- Versioned formulas: TypeScript pure functions keyed by year of
  assessment, selected by the accounting period.
- The trace concept: a lightweight computation log per calculation,
  not the full OpenFisca graph tracer.
- Declarative tests: JSON or TypeScript fixtures instead of YAML.
- Jurisdiction separation: one parameter namespace per jurisdiction,
  starting with NG.

## REJECT

- OpenFisca as a dependency. The framework is Python and numpy-based
  and does not fit the Bun/React/Supabase stack.
- OpenFisca float money. Exact Decimal/Numeric money stays in BIGDROPS.
- OpenAccountants tax values as rules. The values are inconsistent and
  partly wrong. They are knowledge, not law.
- The 20% medium band wherever it appears.
- The "Sixth Schedule" capital-allowance label.
- Any deadline value not backed by the NTAA or the canonical text.

## INDEPENDENTLY DERIVE

Every statutory value from the canonical NTA 2025 and the NTAA 2025
once the NTAA is added to NRS-docs: rates, thresholds, exclusions,
allowances, losses, and deadlines.

## Architectural separation evaluated

The following separation is supported by the evidence:

Accounting Ledger → Accounting Period and P&L → Tax Adjustment Layer →
Versioned Nigerian Tax Rules → Calculation and Explanation Trace →
Compliance Obligation → Evidence, Filing, Payment, Reconciliation

OpenFisca validates the middle of this chain (versioned rules and
trace). OpenAccountants validates the knowledge layer (citations and
review). Both confirm that the accounting layer must stay native to
BIGDROPS.

---

# 16. OPEN QUESTIONS

Blocking:

- When will the NTAA 2025 gazette text be added to NRS-docs so filing
  deadlines can be closed?
- Where is the subsidiary regulation "relating to deduction of tax at
  source" that governs WHT rates and the WHT remittance deadline?

High-risk:

- The NTA 2025 VAT registration threshold (₦100M per OpenAccountants)
  is not verifiable from the canonical extract reviewed.
- The NTA 2025 capital-allowance rates (First Schedule) have not been
  extracted value-by-value. The OpenAccountants table is legacy CITA.

Non-blocking:

- Whether the 25% Presidential Order path under §56 is effective for
  the relevant period.

---

# 17. FINAL DECISION

- Recommendation: Adopt the combined architecture: OpenFisca-style
  versioned, traced rules inside a native BIGDROPS engine; an
  OpenAccountants-style cited knowledge layer on top. Use neither
  project as a dependency or a source of statutory values.
- Confidence: High.
- Decisive evidence: the date-keyed parameter files and versioned
  formulas in openfisca-core and country-template; the FullTracer
  module; the skill_facts and review metadata in OpenAccountants
  ng-cit.md; the internal value contradictions in ng-cit.md; the
  canonical First Schedule reference in section 27 of the NTA 2025.
- Conditions that would change the recommendation: a correct,
  cited, versioned NTA 2025 value set in either project; an
  OpenFisca-compatible implementation for the BIGDROPS stack.

## Verification

- git status before: 22 pre-existing entries captured. All left
  untouched.
- git status after: baseline plus the two intended documentation files
  only.
- All three clones (/tmp/openaccountants, /tmp/openfisca-core,
  /tmp/openfisca-country-template) are read-only and unchanged.
- No build, typecheck, lint, audit:load, migration, or application
  execution was run. No external test suite was executed.

## Risks or limitations

- Shallow clones: only the head commit was inspected for each
  repository.
- The canonical NTA extract reviewed covers the CIT core, sections
  20-22, 27, 56-59, and 202, plus the First Schedule. Values outside
  those areas (VAT registration threshold, PAYE bands, CGT) were
  flagged for verification rather than resolved.
- The NTAA 2025 is absent from BIGDROPS NRS-docs. Deadline values in
  OpenAccountants cannot be closed without it.

## Deferred work

- Add the NTAA 2025 gazette text to NRS-docs and close the filing-
  deadline items.
- Extract the First Schedule capital-allowance rates value-by-value
  from the canonical text.
- Design the versioned-parameter and computation-trace data model for
  the future BIGDROPS tax engine, using this report as the
  architectural basis.