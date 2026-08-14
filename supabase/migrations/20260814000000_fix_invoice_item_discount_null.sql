-- Fix: preserve NULL item discount_rate through invoice save RPC
-- Created: 2026-08-14
--
-- Problem:
--   save_invoice_with_items_transaction() coerced a missing item
--   discount_rate to 0 via COALESCE. During "Edit invoice" a row-level
--   global discount must be distinguishable from an explicit 0% override.
--   NULL means "inherit global discount"; 0 means "explicitly no override".
--   Coercing NULL -> 0 on save erased that distinction, so a global
--   discount added during Edit was silently reapplied to each item row.
--
-- Fix:
--   Store the discount_rate verbatim (same as the quotation reference:
--   revert_invoice_to_ln_transaction uses (v_item->>'discount_rate')::NUMERIC
--   with no COALESCE). Session flag install_rate_override keeps its
--   explicit-default behaviour (functionally required for the boolean
--   column) and is not changed.
--
-- Behavior after fix (unchanged semantics):
--   NULL -> NULL (inherit global), 0 -> 0 (explicit no override),
--   5 -> 5 (explicit override). No data backfill: legacy 0s cannot be
--   distinguished from intentional 0% overrides.
--
-- The body replicates the CURRENTLY DEPLOYED function
-- (public.save_invoice_with_items_transaction) byte-for-byte except the
-- single discount_rate expression.

CREATE OR REPLACE FUNCTION public.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_invoice_id uuid;
    v_row record;
    v_item jsonb;
    v_count integer := 0;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Permission gate
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'invoice',
            'create'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: invoice/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'invoice',
            'edit'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: invoice/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_mode = 'create' THEN

        EXECUTE format(
            $q$
            INSERT INTO %I.invoices (
                invoice_number,
                po_number,
                invoice_title,
                client_id,
                client_name,
                project_id,
                issue_date,
                due_date,
                status,
                document_type,
                payment_terms,
                notes,
                terms,
                workmanship,
                transportation,
                shipping,
                discount,
                vat,
                wht,
                custom_fields,
                work_duration,
                subtotal,
                install_rate_total,
                total,
                amount_in_words
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
            )
            RETURNING id
            $q$,
            v_schema
        )
        INTO v_invoice_id
        USING
            p_invoice_payload->>'invoice_number',
            p_invoice_payload->>'po_number',
            p_invoice_payload->>'invoice_title',
            NULLIF(p_invoice_payload->>'client_id', '')::uuid,
            p_invoice_payload->>'client_name',
            NULLIF(p_invoice_payload->>'project_id', '')::uuid,
            (p_invoice_payload->>'issue_date')::date,
            p_invoice_payload->>'due_date',
            COALESCE(p_invoice_payload->>'status', 'unpaid'),
            p_invoice_payload->>'document_type',
            p_invoice_payload->>'payment_terms',
            p_invoice_payload->>'notes',
            p_invoice_payload->>'terms',
            COALESCE((p_invoice_payload->>'workmanship')::numeric, 0),
            COALESCE((p_invoice_payload->>'transportation')::numeric, 0),
            COALESCE((p_invoice_payload->>'shipping')::numeric, 0),
            COALESCE((p_invoice_payload->>'discount')::numeric, 0),
            COALESCE((p_invoice_payload->>'vat')::numeric, 0),
            COALESCE((p_invoice_payload->>'wht')::numeric, 0),
            p_invoice_payload->>'custom_fields',
            p_invoice_payload->>'work_duration',
            COALESCE((p_invoice_payload->>'subtotal')::numeric, 0),
            COALESCE((p_invoice_payload->>'install_rate_total')::numeric, 0),
            COALESCE((p_invoice_payload->>'total')::numeric, 0),
            p_invoice_payload->>'amount_in_words';

    ELSE

        EXECUTE format(
            $q$
            UPDATE %I.invoices
            SET
                po_number = $2,
                invoice_title = $3,
                client_name = $4,
                project_id = NULLIF($5, '')::uuid,
                issue_date = ($6)::date,
                due_date = $7,
                status = $8,
                payment_terms = $9,
                notes = $10,
                terms = $11,
                workmanship = COALESCE($12, 0),
                transportation = COALESCE($13, 0),
                shipping = COALESCE($14, 0),
                discount = COALESCE($15, 0),
                vat = COALESCE($16, 0),
                wht = COALESCE($17, 0),
                custom_fields = $18,
                work_duration = $19,
                subtotal = COALESCE($20, 0),
                install_rate_total = COALESCE($21, 0),
                total = COALESCE($22, 0),
                amount_in_words = $23
            WHERE id = $1
            $q$,
            v_schema
        )
        USING
            (p_invoice_payload->>'id')::uuid,
            p_invoice_payload->>'po_number',
            p_invoice_payload->>'invoice_title',
            p_invoice_payload->>'client_name',
            COALESCE(p_invoice_payload->>'project_id', ''),
            p_invoice_payload->>'issue_date',
            p_invoice_payload->>'due_date',
            COALESCE(p_invoice_payload->>'status', 'unpaid'),
            p_invoice_payload->>'payment_terms',
            p_invoice_payload->>'notes',
            p_invoice_payload->>'terms',
            (p_invoice_payload->>'workmanship')::numeric,
            (p_invoice_payload->>'transportation')::numeric,
            (p_invoice_payload->>'shipping')::numeric,
            (p_invoice_payload->>'discount')::numeric,
            (p_invoice_payload->>'vat')::numeric,
            (p_invoice_payload->>'wht')::numeric,
            p_invoice_payload->>'custom_fields',
            p_invoice_payload->>'work_duration',
            (p_invoice_payload->>'subtotal')::numeric,
            (p_invoice_payload->>'install_rate_total')::numeric,
            (p_invoice_payload->>'total')::numeric,
            p_invoice_payload->>'amount_in_words';

        v_invoice_id := (p_invoice_payload->>'id')::uuid;

        -- Replace existing items
        EXECUTE format(
            'DELETE FROM %I.invoice_items WHERE invoice_id = %L',
            v_schema,
            v_invoice_id
        );

    END IF;

    -- Insert items
    FOR v_item IN
        SELECT *
        FROM jsonb_array_elements(p_items)
    LOOP

        EXECUTE format(
            $q$
            INSERT INTO %I.invoice_items (
                invoice_id,
                description,
                sub_description,
                make,
                quantity,
                unit,
                unit_price,
                amount,
                vat_rate,
                install_rate,
                install_rate_taxable,
                show_install_rate,
                sort_order,
                formula,
                row_type,
                group_name,
                image_url,
                custom_data,
                discount_rate,
                install_rate_override,
                group_id,
                item_id
            )
            VALUES (
                %L,
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            )
            $q$,
            v_schema,
            v_invoice_id
        )
        USING
            v_item->>'description',
            v_item->>'sub_description',
            v_item->>'make',
            (v_item->>'quantity')::numeric,
            v_item->>'unit',
            (v_item->>'unit_price')::numeric,
            (v_item->>'amount')::numeric,
            (v_item->>'vat_rate')::numeric,
            (v_item->>'install_rate')::numeric,
            (v_item->>'install_rate_taxable')::boolean,
            (v_item->>'show_install_rate')::boolean,
            (v_item->>'sort_order')::integer,
            v_item->>'formula',
            v_item->>'row_type',
            v_item->>'group_name',
            v_item->>'image_url',
            (v_item->>'custom_data')::jsonb,
            (v_item->>'discount_rate')::numeric,
            COALESCE((v_item->>'install_rate_override')::boolean, false),
            v_item->>'group_id',
            NULLIF(v_item->>'item_id', '')::uuid;

        v_count := v_count + 1;

    END LOOP;

    -- Return saved invoice
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.invoices t WHERE t.id = %L',
        v_schema,
        v_invoice_id
    )
    INTO v_row;

    RETURN jsonb_build_object(
        'id', v_invoice_id,
        'invoice', v_row,
        'items_saved', v_count
    );

END;
$function$
;