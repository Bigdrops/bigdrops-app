# Tax-Rules-Engine PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Statutory Law → **Tax Rules Engine** → Gate E Computation

---

## 1. Objective

Define the tax rules engine that resolves versioned statutory rules for a given entity and period. This PRD covers rule versioning, resolution, immutability, and the rule types that feed the Gate E computation.

## 2. Problem Statement

Tax rules change over time. Without a versioned rules engine:
- Rules cannot be tracked by effective date
- Historical computations cannot be reproduced
- Rule immutability cannot be enforced
- New rule types cannot be added without code changes
- The Gate E computation has no deterministic rule source

## 3. Scope

- Tax rule version storage (versioned by effective date)
- Rule resolution for a period (find effective rule)
- Rule types: CIT, capital allowance, loss, QCE, exemption
- Rule immutability enforcement (no UPDATE/DELETE)
- Rule uniqueness constraint (one rule per type per effective date)
- Entity-scoped rule isolation

## 4. Non-Scope

- Admin UI for rule management
- Rule authoring workflow
- Rule approval pipeline
- Rule publishing / deployment
- Tax rate overrides per entity (future)
- Regulatory change monitoring

## 5. Product Model

### 5.1 Tax Rule Version

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK (or null for global rules) |
| `rule_type` | enum | yes | `cit_rules` / `capital_allowance` / `loss_rules` / `qce_rules` / `exemption` |
| `effective_date` | date | yes | Date rule becomes effective |
| `expiry_date` | date | no | Date rule expires (null = indefinite) |
| `rule_snapshot` | jsonb | yes | Rule payload (type-specific) |
| `created_at` | timestamptz | auto | Creation timestamp |
| `created_by` | text | yes | Author (user or system) |

### 5.2 Rule Types

| Type | Payload Shape | Purpose |
|------|---------------|---------|
| `cit_rules` | `CitRulePayload` | CIT rates, thresholds, development levy, ETR minimum |
| `capital_allowance` | `CapitalAllowanceRulePayload` | Asset classes, rates, disposal rules |
| `loss_rules` | `LossRulePayload` | Carry-forward period, trade-specific flag, utilisation rules |
| `qce_rules` | `QceRulePayload` | QCE categories, eligibility rules |
| `exemption` | `ExemptionRulePayload` | Exempt income types, thresholds |

### 5.3 Rule Payload Schemas

**CitRulePayload:**
```json
{
  "standard_rate": "0.30",
  "reduced_rate": "0.25",
  "small_company_rate": "0.00",
  "small_company_turnover_threshold": "50000000",
  "small_company_asset_threshold": "250000000",
  "excluded_sectors": ["professional_services"],
  "development_levy_rate": "0.04",
  "development_levy_excluded": ["small_company", "non_resident"],
  "etr_minimum_rate": "0.15",
  "etr_minimum_threshold": "50000000000"
}
```

**CapitalAllowanceRulePayload:**
```json
{
  "rates": { "class_1": "0.10", "class_2": "0.20", "class_3": "0.25" },
  "classes": {
    "class_1": ["building", "agricultural", "mast", "intangible", "heavy_transport"],
    "class_2": ["plant", "agricultural_equipment", "furniture", "mining", "other_equipment"],
    "class_3": ["motor_vehicle", "software", "other_capital"]
  }
}
```

**LossRulePayload:**
```json
{
  "carry_forward": true,
  "carry_forward_period": "indefinite",
  "trade_specific": true,
  "utilisation_cap": "assessable_profit",
  "ordering": "fifo"
}
```

### 5.4 Resolution Logic

```
For a given rule_type and period [periodStart, periodEnd]:
  candidates = rules where
    rule_type = target
    AND effective_date <= periodEnd
    AND (expiry_date IS NULL OR expiry_date > periodStart)
  
  if candidates.length = 0: throw
  return candidate with latest effective_date
```

## 6. Data / Domain Model

### 6.1 Relationships

```
Tax Rule Version
  ├── belongs to Entity (entity_id) or Global (null)
  ├── has rule_type (enum)
  ├── has effective_date / expiry_date (temporal)
  ├── has rule_snapshot (jsonb payload)
  └── feeds Gate E Computation (all 5 rule types)
```

### 6.2 Immutability

- Rule versions are immutable after creation
- No UPDATE or DELETE allowed (enforced by DB trigger)
- Correction: create new rule version with new effective_date
- Error code `25001` on violation (insufficient privilege)

### 6.3 Uniqueness

- One rule per type per effective_date per entity
- Enforced by unique constraint + trigger

## 7. Lifecycle

1. Rule created with effective_date and payload
2. Rule becomes effective when effective_date <= current date
3. Gate E resolver finds effective rule for computation period
4. Computation uses rule_snapshot for all calculations
5. When rule expires, new rule must be created
6. Old rule remains for historical computation reproducibility

## 8. Accounting Boundary

- Tax rules are a tax-only construct — no accounting impact
- Rule changes do not affect accounting records
- Rule resolution is deterministic and auditable

## 9. Tax Boundary

- Rules encode statutory provisions (NTA 2025)
- Rules are the single source of truth for tax computation
- Computation must fail if no effective rule exists
- Rule versions enable historical computation reproducibility

## 10. Provenance / Auditability

- Each rule version has creation timestamp and author
- Computation traces reference rule versions used
- Rule resolution is deterministic: same inputs → same rule
- Historical computations can be reproduced with original rule versions

## 11. Entity / Tenant Isolation

- Rules can be entity-specific or global (entity_id nullable)
- Entity rules override global rules for that entity
- Entity isolation enforced at query level

## 12. Calculation Rules

- Rule resolution: deterministic (latest effective_date wins)
- Rate values: exact decimal strings
- Threshold values: exact decimal strings (BigInt comparison)
- No floating-point arithmetic in rule resolution

## 13. Immutability / Reversal Rules

- Rules are append-only (no update, no delete)
- New rule = new row with new effective_date
- Old rule remains for historical reference
- Trigger enforces immutability at DB level

## 14. UX Requirements

- Rule list view with type, effective date, status
- Rule detail view with payload
- Rule creation form (admin only)
- No edit/delete actions (immutable)
- Mobile-first responsive layout

## 15. Edge Cases

| Case | Handling |
|------|----------|
| No rule for type + period | Computation throws — coverage must be complete |
| Multiple rules same type, overlapping dates | Latest effective_date wins |
| Rule expires mid-period | Rule still effective if effective_date <= periodEnd |
| Rule effective after period | Not matched |
| Entity rule + global rule | Entity rule wins |
| Rule payload malformed | Validation at creation time |

## 16. Dependencies

- DB Migration: `tax_rule_versions` table + triggers
- Gate E Computation: consumes resolved rules
- Seed Rules: NTA 2025 defaults

## 17. Acceptance Criteria

- [ ] Rule resolution finds correct effective rule
- [ ] Immutability enforced (no update/delete)
- [ ] Uniqueness enforced (one rule per type per date)
- [ ] Computation fails if no rule exists
- [ ] Historical computations reproducible
- [ ] Entity isolation prevents cross-entity rule access

## 18. Verification Requirements

- Unit test: resolution finds latest effective rule
- Unit test: throws if no rule exists
- Unit test: immutability trigger blocks update/delete
- Unit test: uniqueness constraint enforced
- Integration test: seed rules → resolution → computation
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| CIT rates (30%, 25%, 0%) | NTA 2025 s.56 | Resolved |
| Small company thresholds | NTA 2025 s.202 | Resolved |
| Development levy rate (4%) | NTA 2025 s.59 | Resolved |
| ETR minimum (15%) | NTA 2025 s.57 | Resolved |
| Capital allowance rates | NTA 2025 First Schedule | Resolved |
| Loss carry-forward rules | NTA 2025 s.27(6) | Resolved |
| QCE categories | NTA 2025 | Unresolved — full QCE taxonomy pending |
| Exemption types | NTA 2025 | Unresolved — no exemptions seeded |

## 20. Open Questions

1. Should rules be global by default with entity override?
2. How are regulatory changes tracked and rule updates triggered?
3. Should rule payload validation be schema-based (JSON Schema)?
4. How are rules migrated across entity schemas during provisioning?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `ruleResolver.ts` implements `findEffectiveRule()` and `resolveTaxRules()`
- `types.ts` defines all rule payloads: `CitRulePayload`, `CapitalAllowanceRulePayload`, `LossRulePayload`, `QceRulePayload`, `ExemptionRulePayload`
- DB migration `20260912120000_gate_e_rules_engine.sql` creates immutability trigger
- Seed rules `20260912130000_gate_e_seed_rules.sql` inserts NTA 2025 defaults
- Future: admin UI for rule management, entity-specific rule overrides
