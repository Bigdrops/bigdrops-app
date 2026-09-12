-- Gate E: Seed statutory rules from NTA 2025
-- Inserts initial rule versions for all 5 rule types.
-- These are the authoritative statutory values for computations from 1 Jan 2026.

-- ── CIT Rules (s.56, s.202, s.59, s.57) ────────────────────────────

INSERT INTO tenant_master_template.tax_rule_versions
  (rule_type, rule_version, effective_date, expiry_date, rule_snapshot)
VALUES (
  'cit_rules',
  'NTA-2025-CIT-1.0',
  '2026-01-01',
  NULL,
  '{
    "standard_rate": "0.30",
    "reduced_rate": "0.25",
    "small_company_rate": "0.00",
    "small_company_turnover_threshold": "50000000",
    "small_company_asset_threshold": "250000000",
    "excluded_sectors": ["professional_services"],
    "development_levy_rate": "0.04",
    "development_levy_excluded": ["small_company"],
    "etr_minimum_threshold": "50000000000",
    "etr_minimum_rate": "0.15",
    "citation": "Companies Income Tax Act 2025 s.56, s.202, s.59, s.57"
  }'::jsonb
);

-- ── Capital Allowance Rules (First Schedule) ────────────────────────

INSERT INTO tenant_master_template.tax_rule_versions
  (rule_type, rule_version, effective_date, expiry_date, rule_snapshot)
VALUES (
  'capital_allowance',
  'NTA-2025-CA-1.0',
  '2026-01-01',
  NULL,
  '{
    "classes": [
      {
        "class": "class_1",
        "rate": "0.10",
        "categories": [
          "building_expenditure",
          "agricultural_expenditure",
          "mast_expenditure",
          "intangible_assets_expenditure",
          "heavy_transport_expenditure"
        ]
      },
      {
        "class": "class_2",
        "rate": "0.20",
        "categories": [
          "plant_expenditure",
          "agricultural_equipment_expenditure",
          "furniture_fittings_expenditure",
          "mining_expenditure",
          "other_equipment_expenditure"
        ]
      },
      {
        "class": "class_3",
        "rate": "0.25",
        "categories": [
          "motor_vehicle_expenditure",
          "software_expenditure",
          "other_capital_expenditure"
        ]
      }
    ],
    "citation": "Companies Income Tax Act 2025 First Schedule Table I"
  }'::jsonb
);

-- ── Loss Rules (s.27(6), s.97) ──────────────────────────────────────

INSERT INTO tenant_master_template.tax_rule_versions
  (rule_type, rule_version, effective_date, expiry_date, rule_snapshot)
VALUES (
  'loss_rules',
  'NTA-2025-LOSS-1.0',
  '2026-01-01',
  NULL,
  '{
    "carry_forward_indefinite": true,
    "trade_specific": true,
    "max_deduction_ratio": "1.0",
    "citation": "Companies Income Tax Act 2025 s.27(6), s.97"
  }'::jsonb
);

-- ── QCE Rules (informational) ───────────────────────────────────────

INSERT INTO tenant_master_template.tax_rule_versions
  (rule_type, rule_version, effective_date, expiry_date, rule_snapshot)
VALUES (
  'qce_rules',
  'NTA-2025-QCE-1.0',
  '2026-01-01',
  NULL,
  '{
    "qualifying_categories": [
      "building_expenditure",
      "agricultural_expenditure",
      "agricultural_equipment_expenditure",
      "mast_expenditure",
      "intangible_assets_expenditure",
      "heavy_transport_expenditure",
      "plant_expenditure",
      "furniture_fittings_expenditure",
      "mining_expenditure",
      "other_equipment_expenditure",
      "motor_vehicle_expenditure",
      "software_expenditure",
      "other_capital_expenditure"
    ],
    "non_qualifying_categories": [],
    "restricted_categories": [],
    "citation": "Companies Income Tax Act 2025 First Schedule"
  }'::jsonb
);

-- ── Exemption Rules (initially empty — no exemptions under NTA 2025) ─

INSERT INTO tenant_master_template.tax_rule_versions
  (rule_type, rule_version, effective_date, expiry_date, rule_snapshot)
VALUES (
  'exemption',
  'NTA-2025-EXEMPT-1.0',
  '2026-01-01',
  NULL,
  '{
    "exemptions": [],
    "citation": "Companies Income Tax Act 2025"
  }'::jsonb
);
