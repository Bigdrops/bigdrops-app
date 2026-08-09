-- Domain: Phase 3 — Transactional composite operations (tenant-aware RPCs)
-- Created: 2026-08-09
--
-- Purpose:
--   Three invoice flows MUST be atomic (partial failure produces corrupt
--   state) and currently run as sequential independent Supabase requests:
--     1. Save invoice + items (create/update + item replacement)
--     2. Delete invoice + items (orphan items if invoice delete fails)
--     3. Record payment + persisted status sync
--   These RPCs provide transaction boundaries in the tenant schema. Flows
--   that touch multiple tables but tolerate sequential best-effort steps
--   (receipt auto-creation, WHT drafts, attachments, audit) intentionally
--   remain client-side — an RPC is NOT added merely because an operation
--   touches more than one table.
--
-- All functions: SECURITY DEFINER, SET search_path TO 'public', schema
-- resolved via the existing entity-resolution mechanism (never arbitrary
-- input). All writes target the tenant schema. Because SECURITY DEFINER
-- bypasses RLS, every RPC re-enforces the same permission model that the
-- tenant RLS policies enforce (has_entity_permission) so RPC writes do not
-- weaken tenant authorization.

-- ============================================================
-- 1. save_invoice_with_items_transaction
-- ============================================================
-- p_mode = 'create' | 'update'
-- For create: inserts the invoice (invoice_number from payload) then items.
-- For update: updates the invoice, deletes existing items, inserts new items.
-- Returns the saved invoice row + items count.

CREATE OR REPLACE FUNCTION public.save_invoice_with_items_transaction(
    p_entity_id uuid,
    p_invoice_payload jsonb,
    p_items jsonb DEFAULT '[]'::jsonb,
    p_mode text DEFAULT 'create'
)
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

    -- Permission gate (mirrors tenant RLS): create or edit
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'invoice', 'create') THEN
            RAISE EXCEPTION 'Insufficient permissions: invoice/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'invoice', 'edit') THEN
            RAISE EXCEPTION 'Insufficient permissions: invoice/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_mode = 'create' THEN
        EXECUTE format(
            $q$
            INSERT INTO %I.invoices (
                invoice_number, po_number, invoice_title, client_id, client_name,
                project_id, issue_date, due_date, status, document_type, payment_terms,
                notes, terms, workmanship, transportation, shipping, discount, vat, wht,
                custom_fields, work_duration, subtotal, install_rate_total, total,
                amount_in_words
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
            ) RETURNING id
            $q$,
            p_schema_name
        ) INTO v_invoice_id
        USING
            p_invoice_payload->>'invoice_number',
            p_invoice_payload->>'po_number',
            p_invoice_payload->>'invoice_title',
            NULLIF(p_invoice_payload->>'client_id', '')::uuid,
            p_invoice_payload->>'client_name',
            NULLIF(p_invoice_payload->>'project_id', '')::uuid,
            (p_invoice_payload->>'issue_date')::date,
            p_invoice_payload->>'due_date',
            coalesce(p_invoice_payload->>'status', 'unpaid'),
            p_invoice_payload->>'document_type',
            p_invoice_payload->>'payment_terms',
            p_invoice_payload->>'notes',
            p_invoice_payload->>'terms',
            coalesce((p_invoice_payload->>'workmanship')::numeric, 0),
            coalesce((p_invoice_payload->>'transportation')::numeric, 0),
            coalesce((p_invoice_payload->>'shipping')::numeric, 0),
            coalesce((p_invoice_payload->>'discount')::numeric, 0),
            coalesce((p_invoice_payload->>'vat')::numeric, 0),
            coalesce((p_invoice_payload->>'wht')::numeric, 0),
            p_invoice_payload->>'custom_fields',
            p_invoice_payload->>'work_duration',
            coalesce((p_invoice_payload->>'subtotal')::numeric, 0),
            coalesce((p_invoice_payload->>'install_rate_total')::numeric, 0),
            coalesce((p_invoice_payload->>'total')::numeric, 0),
            p_invoice_payload->>'amount_in_words';
    ELSE
        EXECUTE format(
            $q$
            UPDATE %I.invoices SET
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
                workmanship = coalesce($12, 0),
                transportation = coalesce($13, 0),
                shipping = coalesce($14, 0),
                discount = coalesce($15, 0),
                vat = coalesce($16, 0),
                wht = coalesce($17, 0),
                custom_fields = $18,
                work_duration = $19,
                subtotal = coalesce($20, 0),
                install_rate_total = coalesce($21, 0),
                total = coalesce($22, 0),
                amount_in_words = $23
            WHERE id = $1
            $q$,
            p_schema_name
        )
        USING
            (p_invoice_payload->>'id')::uuid,
            p_invoice_payload->>'po_number',
            p_invoice_payload->>'invoice_title',
            p_invoice_payload->>'client_name',
            coalesce(p_invoice_payload->>'project_id', ''),
            p_invoice_payload->>'issue_date',
            p_invoice_payload->>'due_date',
            coalesce(p_invoice_payload->>'status', 'unpaid'),
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

        -- Replace items (delete existing, then insert new)
        EXECUTE format(
            'DELETE FROM %I.invoice_items WHERE invoice_id = %L',
            p_schema_name, v_invoice_id
        );
    END IF;

    -- Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        EXECUTE format(
            $q$
            INSERT INTO %I.invoice_items (
                invoice_id, description, sub_description, make, quantity, unit,
                unit_price, amount, vat_rate, install_rate, install_rate_taxable,
                show_install_rate, sort_order, formula, row_type, group_name,
                image_url, custom_data, discount_rate, install_rate_override,
                group_id, item_id
            ) VALUES (
                %L, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            )
            $q$,
            p_schema_name, v_invoice_id
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
            coalesce((v_item->>'discount_rate')::numeric, 0),
            coalesce((v_item->>'install_rate_override')::boolean, false),
            v_item->>'group_id',
            NULLIF(v_item->>'item_id', '')::uuid;

        v_count := v_count + 1;
    END LOOP;

    -- Return the saved invoice
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.invoices t WHERE t.id = %L',
        p_schema_name, v_invoice_id
    ) INTO v_row;

    RETURN jsonb_build_object(
        'id', v_invoice_id,
        'invoice', v_row,
        'items_saved', v_count
    );
END;
$function$;

-- ============================================================
-- 2. delete_invoice_with_items_transaction
-- ============================================================
-- Deletes invoice_items then the invoice in one transaction.
-- If payments exist, the cloned payments.invoice_id FK blocks the delete
-- (same behavior as today: an invoice with payments cannot be deleted).

CREATE OR REPLACE FUNCTION public.delete_invoice_with_items_transaction(
    p_entity_id uuid,
    p_invoice_id uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Permission gate (mirrors tenant RLS): invoice/delete
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'invoice', 'delete') THEN
        RAISE EXCEPTION 'Insufficient permissions: invoice/delete required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    EXECUTE format('DELETE FROM %I.invoice_items WHERE invoice_id = %L', v_schema, p_invoice_id);
    EXECUTE format('DELETE FROM %I.invoices WHERE id = %L', v_schema, p_invoice_id);

    RETURN jsonb_build_object('success', true, 'id', p_invoice_id);
END;
$function$;

-- ============================================================
-- 3. record_payment_transaction
-- ============================================================
-- Inserts the payment and synchronizes the persisted invoice status from
-- the tenant financial view, atomically. Returns payment row + new status.
-- Receipt auto-creation / WHT drafts / attachments stay client-side
-- (idempotent, non-fatal, retried).

CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_entity_id uuid,
    p_payment_payload jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
    v_invoice_id uuid;
    v_payment_id uuid;
    v_persisted_status text;
    v_payment jsonb;
BEGIN
    v_schema := public._prov_get_schema_name(p_entity_id);
    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Entity schema not found for entity %', p_entity_id;
    END IF;

    -- Permission gate (mirrors tenant RLS): payment/create
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'payment', 'create') THEN
        RAISE EXCEPTION 'Insufficient permissions: payment/create required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_invoice_id := (p_payment_payload->>'invoice_id')::uuid;

    EXECUTE format(
        $q$
        INSERT INTO %I.payments (
            invoice_id, amount, date, method, reference, notes,
            cash_amount, wht_amount, currency_code, wht_rate, wht_type,
            bank_account_id, source
        ) VALUES (
            %L, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id
        $q$,
        p_schema_name, v_invoice_id
    ) INTO v_payment_id
    USING
        coalesce((p_payment_payload->>'amount')::numeric, 0),
        (p_payment_payload->>'date')::date,
        p_payment_payload->>'method',
        p_payment_payload->>'reference',
        p_payment_payload->>'notes',
        coalesce((p_payment_payload->>'cash_amount')::numeric, 0),
        coalesce((p_payment_payload->>'wht_amount')::numeric, 0),
        coalesce(p_payment_payload->>'currency_code', 'NGN'),
        (p_payment_payload->>'wht_rate')::numeric,
        p_payment_payload->>'wht_type',
        NULLIF(p_payment_payload->>'bank_account_id', '')::uuid,
        coalesce(p_payment_payload->>'source', 'live');

    -- Sync persisted status from the tenant financial view (safe vocabulary)
    BEGIN
        EXECUTE format(
            'SELECT f.persisted_status FROM %I.invoice_financials_v f WHERE f.id = %L',
            v_schema, v_invoice_id
        ) INTO v_persisted_status;
    EXCEPTION WHEN undefined_table THEN
        v_persisted_status := NULL;
    END;

    IF v_persisted_status IS NOT NULL THEN
        EXECUTE format(
            'UPDATE %I.invoices SET status = %L WHERE id = %L',
            v_schema, v_persisted_status, v_invoice_id
        );
    END IF;

    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.payments t WHERE t.id = %L',
        v_schema, v_payment_id
    ) INTO v_payment;

    RETURN jsonb_build_object(
        'id', v_payment_id,
        'payment', v_payment,
        'invoice_id', v_invoice_id,
        'status', v_persisted_status
    );
END;
$function$;
