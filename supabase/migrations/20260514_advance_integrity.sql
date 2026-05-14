-- Migration: Advance Invoice Integrity Views
-- Purpose: Diagnostic views for cutover validation. Read-only, zero data modification.
-- Date: 2026-05-14

-- ============================================================================
-- View 1: advance_orphan_children
-- Lists legacy child rows whose parentId references a non-existent, archived,
-- or quarantined parent invoice. These rows are historical artifacts and must
-- never appear in the UI or PDF.
-- ============================================================================

CREATE OR REPLACE VIEW advance_orphan_children AS
SELECT
  c.id AS child_id,
  c.invoice_number AS child_invoice_number,
  c.created_at AS child_created_at,
  c.status AS child_status,
  c.archived_at AS child_archived_at,
  c.parent_invoice_id,
  c.custom_fields::jsonb ->> 'advance_invoice' AS advance_config_raw,
  c.custom_fields::jsonb -> 'advance_invoice' ->> 'parentId' AS claimed_parent_id,
  CASE
    WHEN c.parent_invoice_id IS NULL THEN 'orphan_no_parent_link'
    WHEN c.archived_at IS NOT NULL THEN 'archived'
    WHEN NOT EXISTS (
      SELECT 1 FROM invoices p WHERE p.id = c.parent_invoice_id AND p.archived_at IS NULL
    ) THEN 'parent_missing_or_archived'
    WHEN NOT EXISTS (
      SELECT 1 FROM invoices p
      WHERE p.id = (
        CASE
          WHEN c.custom_fields::jsonb -> 'advance_invoice' ->> 'parentId' IS NOT NULL
          THEN (c.custom_fields::jsonb -> 'advance_invoice' ->> 'parentId')::uuid
          ELSE c.parent_invoice_id
        END
      )
    ) THEN 'claimed_parent_missing'
    ELSE 'healthy'
  END AS orphan_reason
FROM invoices c
WHERE
  c.custom_fields ILIKE '%"role":"advance"%';

-- ============================================================================
-- View 2: advance_parent_child_consistency
-- Validates that parent invoice metadata matches actual active child rows.
-- For the post-cutover model, all parents should show 'metadata_only' status,
-- meaning the advance lives purely in parent custom_fields with no child rows.
-- ============================================================================

CREATE OR REPLACE VIEW advance_parent_child_consistency AS
WITH parent_metadata AS (
  SELECT
    id AS parent_id,
    invoice_number AS parent_invoice_number,
    custom_fields,
    custom_fields::jsonb -> 'advance_invoice' AS advance_meta,
    custom_fields::jsonb -> 'advance_invoice' ->> 'enabled' AS meta_enabled,
    custom_fields::jsonb -> 'advance_invoice' ->> 'amount' AS meta_amount,
    custom_fields::jsonb -> 'advance_invoice' ->> 'mode' AS meta_mode,
    custom_fields::jsonb -> 'advance_invoice' ->> 'document_number' AS meta_document_number,
    custom_fields::jsonb -> 'advance_invoice' ->> 'legacy_child_invoice_id' AS meta_legacy_child_id
  FROM invoices
  WHERE
    custom_fields ILIKE '%"advance_invoice"%'
    AND custom_fields::jsonb -> 'advance_invoice' ->> 'enabled' = 'true'
    AND custom_fields::jsonb -> 'advance_invoice' ->> 'role' IS DISTINCT FROM 'advance'
),
active_children AS (
  SELECT
    c.id AS child_id,
    c.invoice_number AS child_invoice_number,
    c.total AS child_total,
    c.status AS child_status,
    c.custom_fields::jsonb -> 'advance_invoice' ->> 'parentId' AS parent_id_from_cf,
    c.parent_invoice_id
  FROM invoices c
  WHERE
    c.custom_fields ILIKE '%"role":"advance"%'
    AND c.archived_at IS NULL
)
SELECT
  pm.parent_id,
  pm.parent_invoice_number,
  pm.meta_enabled,
  pm.meta_amount,
  pm.meta_mode,
  pm.meta_document_number,
  pm.meta_legacy_child_id,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'child_id', ac.child_id,
        'child_invoice_number', ac.child_invoice_number,
        'child_total', ac.child_total,
        'child_status', ac.child_status
      )
    ) FILTER (WHERE ac.child_id IS NOT NULL),
    '[]'::jsonb
  ) AS active_children,
  COUNT(ac.child_id) AS active_child_count,
  CASE
    WHEN COUNT(ac.child_id) = 0 THEN 'metadata_only'
    WHEN COUNT(ac.child_id) = 1
      AND (pm.meta_legacy_child_id = ac.child_id::text OR pm.meta_legacy_child_id IS NULL)
      THEN 'consistent'
    WHEN COUNT(ac.child_id) > 1 THEN 'multiple_children_warning'
    ELSE 'inconsistent'
  END AS consistency_status
FROM parent_metadata pm
LEFT JOIN active_children ac
  ON ac.parent_id_from_cf = pm.parent_id::text
  OR ac.parent_invoice_id = pm.parent_id
GROUP BY
  pm.parent_id,
  pm.parent_invoice_number,
  pm.meta_enabled,
  pm.meta_amount,
  pm.meta_mode,
  pm.meta_document_number,
  pm.meta_legacy_child_id;

-- ============================================================================
-- Helper: Count legacy advance rows by status for operational awareness
-- ============================================================================

CREATE OR REPLACE VIEW advance_legacy_summary AS
SELECT
  CASE
    WHEN archived_at IS NOT NULL THEN 'quarantined'
    WHEN parent_invoice_id IS NULL THEN 'orphan'
    WHEN NOT EXISTS (
      SELECT 1 FROM invoices p
      WHERE p.id = parent_invoice_id
      OR p.id = (
        CASE
          WHEN custom_fields::jsonb -> 'advance_invoice' ->> 'parentId' IS NOT NULL
          THEN (custom_fields::jsonb -> 'advance_invoice' ->> 'parentId')::uuid
          ELSE NULL
        END
      )
    ) THEN 'dangling'
    ELSE 'active_legacy'
  END AS status,
  COUNT(*) AS row_count
FROM invoices
WHERE custom_fields ILIKE '%"role":"advance"%'
GROUP BY
  CASE
    WHEN archived_at IS NOT NULL THEN 'quarantined'
    WHEN parent_invoice_id IS NULL THEN 'orphan'
    WHEN NOT EXISTS (
      SELECT 1 FROM invoices p
      WHERE p.id = parent_invoice_id
      OR p.id = (
        CASE
          WHEN custom_fields::jsonb -> 'advance_invoice' ->> 'parentId' IS NOT NULL
          THEN (custom_fields::jsonb -> 'advance_invoice' ->> 'parentId')::uuid
          ELSE NULL
        END
      )
    ) THEN 'dangling'
    ELSE 'active_legacy'
  END;
