-- Domain: Phase 3 — Quotation/invoice conversion (cross-schema revert RPC)
-- Created: 2026-08-09
--
-- Purpose:
--   The live function revert_invoice_to_quotation_transaction() operates
--   directly on public invoices/invoice_items/quotations/quotation_items.
--   After cutover, invoices and invoice_items are tenant-authoritative
--   while quotations/quotation_items remain public (quotations are NOT in
--   the invoice aggregate).
--
-- Change:
--   Rewrites the function to resolve the invoice + invoice_items from the
--   entity's tenant schema (via the existing entity-resolution mechanism)
--   while writing the quotation + quotation_items into public, then
--   deleting the tenant invoice items + invoice. The exact business
--   behavior is preserved byte-for-byte from the live definition:
--     - same quotation column insert mapping
--     - same STATUS MAPPING (unpaid/partially_paid/paid → accepted,
--       archived → expired, else draft)
--     - same quotation_items insert mapping
--     - same return value (created quotation as jsonb)
--   An optional `p_entity_id uuid DEFAULT NULL` parameter is appended so
--   named-arg callers keep working; when NULL the function falls back to
--   public (pre-cutover / legacy records). Exactly one schema is read.
--
-- Security fixes vs the live definition:
--   - SET search_path TO 'public' added (live version had none).
--   - Schema resolution goes through _audit_resolve_invoice_schema()
--     (quoted identifiers, never arbitrary input).
--
-- Scope guards:
--   - Function definition only. No RLS, table, or permission changes.

CREATE OR REPLACE FUNCTION public.revert_invoice_to_quotation_transaction(
    p_invoice_id uuid,
    p_quotation_payload jsonb,
    p_quotation_items_payload jsonb,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_created_quotation JSONB;
    v_quotation_id UUID;
    v_row quotations;
    v_item JSONB;
    v_schema text;
BEGIN
    v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

    -- Insert quotation (public — quotations remain global)
    INSERT INTO quotations (
        quotation_number, po_number, quotation_title, client_id, client_name, project_id,
        issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping,
        discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields
    )
    SELECT
        p_quotation_payload->>'quotation_number',
        p_quotation_payload->>'po_number',
        p_quotation_payload->>'quotation_title',
        NULLIF(p_quotation_payload->>'client_id', '')::UUID,
        p_quotation_payload->>'client_name',
        NULLIF(p_quotation_payload->>'project_id', '')::UUID,
        (p_quotation_payload->>'issue_date')::DATE,
        (p_quotation_payload->>'valid_until')::DATE,
        -- STATUS MAPPING: invoice status → quotation status
        CASE
            WHEN p_quotation_payload->>'status' IN ('unpaid', 'partially_paid', 'paid') THEN 'accepted'
            WHEN p_quotation_payload->>'status' = 'archived' THEN 'expired'
            ELSE 'draft'
        END,
        p_quotation_payload->>'notes',
        p_quotation_payload->>'terms',
        COALESCE((p_quotation_payload->>'workmanship')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'transportation')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'shipping')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'discount')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'vat')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'wht')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'subtotal')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'install_rate_total')::NUMERIC, 0),
        COALESCE((p_quotation_payload->>'total')::NUMERIC, 0),
        p_quotation_payload->>'amount_in_words',
        (p_quotation_payload->>'custom_fields')::JSONB
    RETURNING * INTO v_row;

    v_created_quotation := to_jsonb(v_row);
    v_quotation_id := v_row.id;

    -- Insert quotation items (public — quotations remain global)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_quotation_items_payload)
    LOOP
        INSERT INTO quotation_items (
            quotation_id, description, quantity, unit_price, amount,
            unit, list_index, row_type, group_name,
            item_id, sub_description, make, install_rate, install_rate_override,
            vat_rate, discount_rate, group_id, sort_order, image_url, custom_data,
            section
        )
        VALUES (
            v_quotation_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            v_item->>'unit',
            (v_item->>'list_index')::INTEGER,
            v_item->>'row_type',
            v_item->>'group_name',
            NULLIF(v_item->>'item_id', '')::UUID,
            v_item->>'sub_description',
            v_item->>'make',
            (v_item->>'install_rate')::NUMERIC,
            (v_item->>'install_rate_override')::BOOLEAN,
            (v_item->>'vat_rate')::NUMERIC,
            (v_item->>'discount_rate')::NUMERIC,
            NULLIF(v_item->>'group_id', '')::UUID,
            COALESCE((v_item->>'sort_order')::INTEGER, (v_item->>'list_index')::INTEGER),
            v_item->>'image_url',
            (v_item->>'custom_data')::JSONB,
            v_item->>'section'
        );
    END LOOP;

    -- Delete invoice items and invoice (tenant schema after cutover)
    EXECUTE format('DELETE FROM %I.invoice_items WHERE invoice_id = %L', v_schema, p_invoice_id);
    EXECUTE format('DELETE FROM %I.invoices WHERE id = %L', v_schema, p_invoice_id);

    RETURN v_created_quotation;
END;
$function$;
