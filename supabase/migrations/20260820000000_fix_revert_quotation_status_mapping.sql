-- Fix: revert_invoice_to_quotation_transaction status mapping
-- Created: 2026-08-17
--
-- Problem:
--   The function mapped the invoice status to a quotation status of
--   'accepted', 'expired', or 'draft'. The live table constraint
--   quotations_status_check allows only 'open', 'converted', and
--   'archived'. Every revert therefore violated the constraint and
--   failed with: new row for relation "quotations" violates check
--   constraint "quotations_status_check".
--
-- Fix:
--   Map only to statuses the constraint allows. An archived invoice
--   reverts to an archived quotation; every other case reverts to an
--   open quotation.
--
-- Scope:
--   Function definition only. The body is identical to the previous
--   definition except the STATUS MAPPING CASE expression.

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
        -- STATUS MAPPING: only statuses allowed by quotations_status_check
        CASE
            WHEN p_quotation_payload->>'status' = 'archived' THEN 'archived'
            ELSE 'open'
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