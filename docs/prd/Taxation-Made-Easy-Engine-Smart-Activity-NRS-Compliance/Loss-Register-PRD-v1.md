# Loss-Register PRD v1

**Document Status**: Draft
**Author**: AI Agent (Claude) — 2026-09-14
**Chain Position**: Assessable Profit → **Loss Utilisation** → Chargeable Income

---

## 1. Objective

Define the loss register that tracks, carries forward, and applies trading losses against assessable profits. This PRD covers loss creation, utilisation rules, carry-forward mechanics, and the loss balance ledger.

## 2. Problem Statement

NTA 2025 s.27(6) allows indefinite carry-forward of trading losses. Without a loss register:
- Losses cannot be tracked across periods
- Loss utilisation caps cannot be enforced
- Loss carry-forward balances cannot be reported
- The loss deduction step in Gate E computation has no data source

## 3. Scope

- Loss balance record creation
- Loss utilisation (deduction from assessable profit)
- Loss carry-forward tracking (indefinite, trade-specific)
- Loss utilisation cap enforcement (capped at assessable profit)
- Loss balance reporting
- Entity-scoped loss isolation

## 4. Non-Scope

- Loss carry-back (NTA 2025 does not allow)
- Capital losses (separate from trading losses)
- Loss relief on business cessation
- Group relief (not in NTA 2025)
- Loss adjustment entries (see Tax-Adjustments-PRD)

## 5. Product Model

### 5.1 Loss Balance Record

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Period when loss was incurred |
| `loss_amount` | numeric(18,2) | yes | Original loss amount (exact decimal) |
| `utilised_amount` | numeric(18,2) | yes | Amount utilised to date (default 0) |
| `remaining_amount` | numeric(18,2) | yes | loss_amount - utilised_amount |
| `trade_type` | text | yes | Trade/business type (for trade-specific matching) |
| `status` | enum | yes | `open` / `fully_utilised` / `expired` |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.2 Loss Utilisation Entry

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `entity_id` | uuid | yes | Entity FK |
| `period_code` | text | yes | Period when loss was applied |
| `loss_record_id` | uuid | yes | FK to loss balance record |
| `amount_utilised` | numeric(18,2) | yes | Amount of loss used in this period |
| `assessable_profit` | numeric(18,2) | yes | Assessable profit at time of utilisation |
| `created_at` | timestamptz | auto | Creation timestamp |

### 5.3 Utilisation Rules (NTA 2025)

| Rule | Reference | Value |
|------|-----------|-------|
| Carry-forward period | s.27(6) | Indefinite |
| Trade-specific | s.27(6) | Losses from trade A can only offset trade A profits |
| Utilisation cap | s.97 | Capped at assessable profit of the period |
| Small company | s.202 | Losses still carry forward even if company becomes small |
| Loss ordering | s.97 | FIFO — earliest losses utilised first |

## 6. Data / Domain Model

### 6.1 Relationships

```
Loss Balance
  ├── belongs to Entity (entity_id)
  ├── incurred in Period (period_code)
  ├── has Loss Utilisation Entries
  └── feeds CIT Computation (loss deduction step)

Loss Utilisation
  ├── belongs to Entity (entity_id)
  ├── applied in Period (period_code)
  └── references Loss Balance (loss_record_id)
```

### 6.2 Status Lifecycle

```
open → fully_utilised
open → expired (theoretical — indefinite carry-forward, but may be used for future closure)
```

### 6.3 Loss Balance Dynamics

```
Initial: remaining_amount = loss_amount
Each utilisation: remaining_amount -= amount_utilised
When remaining_amount = 0: status → fully_utilised
```

## 7. Lifecycle

1. Loss incurred in period (from tax computation: assessable profit < 0 or chargeable income < 0)
2. Loss balance record created with full loss amount
3. In subsequent periods, loss available for utilisation
4. System calculates utilisation: min(remaining_loss, assessable_profit)
5. Loss utilisation entry created
6. Loss balance updated (remaining_amount reduced)
7. When remaining_amount = 0: status transitions to fully_utilised

## 8. Accounting Boundary

- Loss register is a tax-only ledger — no journal entries
- Loss balances do not appear in accounting records
- Loss utilisation modifies the tax computation only
- This is a tax ledger, not an accounting ledger

## 9. Tax Boundary

- Losses are trading losses per s.27(6)
- Indefinite carry-forward (no expiry)
- Trade-specific: loss from trade A can only offset trade A profits
- Utilisation capped at assessable profit of the utilisation period
- FIFO ordering: earliest losses used first

## 10. Provenance / Auditability

- Each loss balance traces to the computation that created it
- Each utilisation traces to the computation that applied it
- Loss ordering (FIFO) is deterministic and auditable
- Loss balance is a running ledger of all loss activity

## 11. Entity / Tenant Isolation

- All loss records scoped by `entity_id`
- Entity isolation enforced at query level
- Cross-entity loss queries forbidden

## 12. Calculation Rules

- Loss amounts: exact decimal (Decimal.js, precision 20, ROUND_HALF_UP)
- Utilisation: `min(remaining_loss, assessable_profit)`
- Remaining: `loss_amount - utilised_amount`
- FIFO ordering: sort by `period_code` ascending
- No negative utilisation amounts

## 13. Immutability / Reversal Rules

- Loss balances are immutable once created
- Utilisation entries are immutable once created
- Correction: create adjustment entry (not edit)
- Loss reversal: only if originating computation is superseded

## 14. UX Requirements

- Loss balance list view with period, amount, utilised, remaining
- Loss utilisation history per loss record
- Available losses summary (total unused)
- Mobile-first responsive layout

## 15. Edge Cases

| Case | Handling |
|------|----------|
| No losses available | Loss deduction step = 0 |
| Loss > assessable profit | Utilisation capped at assessable profit |
| Loss = assessable profit | Full utilisation, remaining = 0 |
| Multiple losses, FIFO | Earliest period losses utilised first |
| Trade mismatch | Loss from trade A cannot offset trade B |
| Loss from prior year, company now small | Loss still utilisable |
| Loss balance = 0 | Status → fully_utilised |
| Assessment period with no income | No utilisation possible |

## 16. Dependencies

- CIT Computation: loss deduction step references loss register
- Tax Adjustments: loss creation from negative adjusted profit
- Period Management: period must be open for utilisation
- Tax Rules: loss rules from rule resolver (carry-forward period, trade-specific flag)

## 17. Acceptance Criteria

- [ ] Loss balance can be created from computation result
- [ ] Utilisation correctly caps at assessable profit
- [ ] FIFO ordering applied across multiple losses
- [ ] Trade-specific matching enforced
- [ ] Loss balance updates correctly after utilisation
- [ ] Status transitions correctly (open → fully_utilised)
- [ ] Entity isolation prevents cross-entity loss access
- [ ] Indefinite carry-forward supported (no expiry)

## 18. Verification Requirements

- Unit test: loss creation from computation
- Unit test: utilisation cap at assessable profit
- Unit test: FIFO ordering
- Unit test: trade-specific matching
- Unit test: balance update after utilisation
- Unit test: status transition
- Integration test: loss creation → utilisation → balance report
- Manual check: `git status` shows only markdown + new files

## 19. Statutory Evidence Register

| Fact | Source | Status |
|------|--------|--------|
| Loss carry-forward period | NTA 2025 s.27(6) | Resolved — indefinite |
| Trade-specific requirement | NTA 2025 s.27(6) | Resolved — trade A only |
| Utilisation cap | NTA 2025 s.97 | Resolved — capped at assessable profit |
| Loss carry-back | NTA 2025 | Not allowed — excluded |
| Loss ordering (FIFO) | NTA 2025 s.97 | Resolved — earliest first |

## 20. Open Questions

1. Should the loss register show projected future utilisation?
2. How are losses handled on business cessation?
3. Should the system auto-create loss balances, or require user action?
4. How are losses affected by change of business type/trade?

## 21. Implementation Notes

- No code changes in this sprint — documentation only
- `types.ts` defines `LossBalance` with `loss_amount`, `utilised_amount`, `period_code`, `trade_type`
- `computation.ts` implements loss deduction: `lossDeduction = BigDecimal.min(remainingLoss, assessableProfit)`
- Loss register needs a persistence layer (currently computed on-the-fly)
- Future implementation: `src/domain/tax/loss-register.ts` module
