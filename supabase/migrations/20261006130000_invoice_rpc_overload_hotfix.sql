-- ============================================================
-- TENANT RPCs: INVOICE RPC OVERLOAD P0 HOTFIX
-- ============================================================
-- Phase 3.6. Regenerates public._prov_install_tenant_rpcs() from the
-- Phase 3.5 installer and adds one cleanup step before block 1.
--
-- Root cause:
--   CREATE OR REPLACE FUNCTION matches PostgreSQL functions by name and
--   identity argument types. The Phase 3 five-argument Invoice function did
--   not replace the older four-argument function. Because the fifth argument
--   has DEFAULT NULL, a four-argument PostgREST call can match both
--   overloads, which causes candidate ambiguity.
--
-- Hotfix:
--   DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(
--     uuid, jsonb, jsonb, text
--   );
--
-- This removes only the obsolete exact identity. It does not drop the
-- current five-argument function, does not drop dependent objects, and keeps the Phase
-- 3.5 Quotation transaction and Phase 3 CPS feedback helper unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $install$
DECLARE
    v_schema_ident text;
    v_body text;
BEGIN
    v_schema_ident := quote_ident(p_schema_name);

-- Phase 3.6 P0 hotfix: remove the obsolete four-argument Invoice save
    -- overload before installing the authoritative five-argument function.
    -- Remove only the obsolete identity. Do not drop dependent objects.
    v_body := $drop_invoice_overload$
DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);
$drop_invoice_overload$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 1. save_invoice_with_items_transaction
    v_body := $b1$
CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text, p_cps_feedback jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_schema text;
  v_invoice_id uuid;
  v_row record;
  v_item jsonb;
  v_count integer := 0;
begin
  v_schema := '__SCHEMA_TEXT__';

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
            'DELETE FROM %I.invoice_items WHERE invoice_id = %L', v_schema,
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
                item_id,
                source_cps_id,
                source_cps_row_id,
                source_quotation_id,
                source_quotation_item_id
            )
            VALUES (
                %L,
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
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
            NULLIF(v_item->>'item_id', '')::uuid,
            NULLIF(v_item->>'source_cps_id', '')::uuid,
            NULLIF(v_item->>'source_cps_row_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_item_id', '')::uuid;

        v_count := v_count + 1;

    END LOOP;

    -- Phase 3: controlled downstream CPS feedback. The plan was computed
    -- by the pure domain planner from real before/after row state. Applying
    -- it here keeps the invoice save and the approved CPS mutation in ONE
    -- transaction, so a feedback failure rolls the save back instead of
    -- leaving the two stores diverged. Authority and lineage are re-validated
    -- inside apply_cps_item_feedback_transaction before any row changes.
    IF p_cps_feedback IS NOT NULL THEN
        PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);
    END IF;

    -- Return saved invoice
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.invoices t WHERE t.id = %L', v_schema,
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
$b1$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 2. delete_invoice_with_items_transaction
    v_body := $b2$
CREATE OR REPLACE FUNCTION __SCHEMA__.delete_invoice_with_items_transaction(
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
    v_schema := '__SCHEMA_TEXT__';

    -- Permission gate (mirrors tenant RLS): invoice/delete
    IF NOT public.has_entity_permission(p_entity_id, auth.uid(), 'invoice', 'delete') THEN
        RAISE EXCEPTION 'Insufficient permissions: invoice/delete required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    EXECUTE format('DELETE FROM %I.invoice_items WHERE invoice_id = %L', v_schema, p_invoice_id);
    EXECUTE format('DELETE FROM %I.invoices WHERE id = %L', v_schema, p_invoice_id);

    RETURN jsonb_build_object('success', true, 'id', p_invoice_id);
END;
$function$
;
$b2$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 3. record_payment_transaction
    v_body := $b3$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_payment_transaction(
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
    v_schema := '__SCHEMA_TEXT__';

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
        v_schema, v_invoice_id
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
            'UPDATE %I.invoices SET status = %L WHERE id = %L', v_schema, v_persisted_status, v_invoice_id
        );
    END IF;

    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.payments t WHERE t.id = %L', v_schema, v_payment_id
    ) INTO v_payment;

    RETURN jsonb_build_object(
        'id', v_payment_id,
        'payment', v_payment,
        'invoice_id', v_invoice_id,
        'status', v_persisted_status
    );
END;
$function$
;
$b3$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 4. record_invoice_created  [FIXED: RETURNS __SCHEMA__.activity_events, calls __SCHEMA__.record_activity_event]
    v_body := $b4$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_invoice_created(
    p_invoice_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice __SCHEMA__.invoices;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'CREATED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_invoice.status,
      'project_id', v_invoice.project_id,
      'client_id', v_invoice.client_id,
      'total', v_invoice.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b4$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 5. record_invoice_status_changed  [FIXED]
    v_body := $b5$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_invoice_status_changed(
    p_invoice_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice __SCHEMA__.invoices;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_invoice.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b5$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 6. record_payment_voided  [FIXED]
    v_body := $b6$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_payment_voided(
    p_payment_id uuid,
    p_invoice_id uuid,
    p_amount numeric DEFAULT NULL::numeric,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice __SCHEMA__.invoices;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'PAYMENT_VOIDED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'payment_id', p_payment_id,
      'amount', p_amount,
      'status', v_invoice.status,
      'total', v_invoice.total
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b6$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 7. record_payment_attachment_uploaded  [FIXED]
    v_body := $b7$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_payment_attachment_uploaded(
    p_payment_id uuid,
    p_invoice_id uuid,
    p_file_name text DEFAULT NULL::text,
    p_file_size bigint DEFAULT NULL::bigint,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice __SCHEMA__.invoices;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'ATTACHMENT_UPLOADED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'payment_id', p_payment_id,
      'file_name', p_file_name,
      'file_size', p_file_size
    ),
    p_reason := null,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b7$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 8. record_waybill_created  [FIXED]
    v_body := $b8$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_waybill_created(
    p_waybill_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_waybill __SCHEMA__.waybills;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.waybills where id = %L', v_schema, p_waybill_id)
    into v_waybill;

  if v_waybill.id is null then
    raise exception 'Waybill not found: %', p_waybill_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'waybill',
    p_entity_id := v_waybill.id,
    p_event_type := 'CREATED',
    p_entity_label := v_waybill.waybill_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_waybill.status,
      'type', v_waybill.type,
      'client_name', v_waybill.client_name,
      'project_id', v_waybill.project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b8$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 9. record_waybill_status_changed  [FIXED]
    v_body := $b9$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_waybill_status_changed(
    p_waybill_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_waybill __SCHEMA__.waybills;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.waybills where id = %L', v_schema, p_waybill_id)
    into v_waybill;

  if v_waybill.id is null then
    raise exception 'Waybill not found: %', p_waybill_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'waybill',
    p_entity_id := v_waybill.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_waybill.waybill_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_waybill.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b9$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 10. record_csr_created  [FIXED]
    v_body := $b10$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_csr_created(
    p_csr_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr __SCHEMA__.csrs;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'CREATED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_csr.status,
      'client_name', v_csr.client_name,
      'equipment_type', v_csr.equipment_type,
      'project_id', v_csr.project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b10$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 11. record_csr_status_changed  [FIXED]
    v_body := $b11$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_csr_status_changed(
    p_csr_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr __SCHEMA__.csrs;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_csr.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b11$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 12. record_csr_linked  [FIXED]
    v_body := $b12$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_csr_linked(
    p_csr_id uuid,
    p_invoice_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_csr __SCHEMA__.csrs;
  v_schema text;
begin
  v_schema := '__SCHEMA_TEXT__';

  execute format('select * from %I.csrs where id = %L', v_schema, p_csr_id)
    into v_csr;

  if v_csr.id is null then
    raise exception 'CSR not found: %', p_csr_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'csr',
    p_entity_id := v_csr.id,
    p_event_type := 'LINKED',
    p_entity_label := v_csr.csr_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'linked_invoice_id', p_invoice_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b12$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 13. record_quotation_created  [FIXED]
    v_body := $b13$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_quotation_created(p_quotation_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation __SCHEMA__.quotations;
begin
  select *
  into v_quotation
  from __SCHEMA__.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'CREATED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'status', v_quotation.status,
      'project_id', v_quotation.project_id,
      'client_id', v_quotation.client_id,
      'total', v_quotation.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b13$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 14. record_quotation_status_changed  [FIXED]
    v_body := $b14$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_quotation_status_changed(p_quotation_id uuid, p_old_status text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation __SCHEMA__.quotations;
begin
  select *
  into v_quotation
  from __SCHEMA__.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_quotation.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b14$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 15. record_quotation_linked  [FIXED]
    v_body := $b15$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_quotation_linked(p_quotation_id uuid, p_invoice_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_quotation __SCHEMA__.quotations;
begin
  select *
  into v_quotation
  from __SCHEMA__.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception 'Quotation not found: %', p_quotation_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'quotation',
    p_entity_id := v_quotation.id,
    p_event_type := 'LINKED',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'invoice_id', p_invoice_id,
      'project_id', p_project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b15$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 16. record_project_updated  [FIXED]
    v_body := $b16$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_project_updated(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project __SCHEMA__.projects;
begin
  select *
  into v_project
  from __SCHEMA__.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'UPDATED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b16$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 17. record_project_note_added  [FIXED]
    v_body := $b17$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_project_note_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project __SCHEMA__.projects;
begin
  select *
  into v_project
  from __SCHEMA__.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'NOTE_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b17$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 18. record_project_document_added  [FIXED]
    v_body := $b18$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_project_document_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project __SCHEMA__.projects;
begin
  select *
  into v_project
  from __SCHEMA__.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'DOCUMENT_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b18$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 19. record_project_linked_activity  [FIXED]
    v_body := $b19$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_project_linked_activity(p_project_id uuid, p_linked_entity_type text, p_linked_entity_id uuid, p_linked_entity_label text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project __SCHEMA__.projects;
begin
  select *
  into v_project
  from __SCHEMA__.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  if p_linked_entity_type not in ('invoice', 'quotation') then
    raise exception 'Unsupported linked entity type: %', p_linked_entity_type;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'LINKED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'linked_entity_type', p_linked_entity_type,
      'linked_entity_id', p_linked_entity_id,
      'linked_entity_label', p_linked_entity_label
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b19$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 20. record_letter_created  [FIXED]
    v_body := $b20$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_letter_created(
  p_letter_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_letter __SCHEMA__.letters;
begin
  select * into v_letter from __SCHEMA__.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'CREATED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_letter.status,
      'subject', v_letter.subject,
      'recipient_name', v_letter.recipient_name
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b20$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 21. record_letter_updated  [FIXED]
    v_body := $b21$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_letter_updated(
  p_letter_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_letter __SCHEMA__.letters;
begin
  select * into v_letter from __SCHEMA__.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'UPDATED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'status', v_letter.status
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b21$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 22. record_letter_status_changed  [FIXED]
    v_body := $b22$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_letter_status_changed(
  p_letter_id uuid,
  p_old_status text DEFAULT NULL::text,
  p_new_status text DEFAULT NULL::text,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_letter __SCHEMA__.letters;
begin
  select * into v_letter from __SCHEMA__.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'STATUS_CHANGED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', p_old_status,
      'new_status', coalesce(p_new_status, v_letter.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b22$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 23. record_letter_duplicated  [FIXED]
    v_body := $b23$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_letter_duplicated(
  p_letter_id uuid,
  p_source_letter_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_letter __SCHEMA__.letters;
begin
  select * into v_letter from __SCHEMA__.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'DUPLICATE',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'source_letter_id', p_source_letter_id,
      'status', v_letter.status
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 30
  );
end;
$function$
;
$b23$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 24. record_letter_archived  [FIXED]
    v_body := $b24$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_letter_archived(
  p_letter_id uuid,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_letter __SCHEMA__.letters;
begin
  select * into v_letter from __SCHEMA__.letters where id = p_letter_id;
  if v_letter.id is null then
    raise exception 'Letter not found: %', p_letter_id;
  end if;

  return __SCHEMA__.record_activity_event(
    p_entity_type := 'letter',
    p_entity_id := v_letter.id,
    p_event_type := 'ARCHIVED',
    p_entity_label := v_letter.letter_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_metadata := jsonb_build_object(
      'old_status', v_letter.status,
      'new_status', 'archived'
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$
;
$b24$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 25. record_audit_log  [FIXED: RETURNS __SCHEMA__.audit_logs, references __SCHEMA__.audit_logs]
    v_body := $b25$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_audit_log(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_scope_type text DEFAULT 'app'::text, p_reason text DEFAULT NULL::text)
 RETURNS __SCHEMA__.audit_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_changes jsonb;
  v_row __SCHEMA__.audit_logs;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  v_changes := public.compute_jsonb_diff(
    coalesce(p_old_data, '{}'::jsonb),
    coalesce(p_new_data, '{}'::jsonb)
  );

  if jsonb_array_length(v_changes) = 0 then
    return null;
  end if;

  insert into __SCHEMA__.audit_logs (
    entity_type, entity_id, entity_label, action,
    actor_id, actor_label, source, scope_type, changes, reason
  )
  values (
    p_entity_type, p_entity_id, p_entity_label, p_action,
    v_actor_id, p_actor_label, coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'), v_changes, p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$
;
$b25$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 26. record_activity_event  [FIXED: RETURNS __SCHEMA__.activity_events, references __SCHEMA__.activity_events — self-contained]
    v_body := $b26$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_activity_event(
  p_entity_type text,
  p_entity_id uuid,
  p_event_type text,
  p_entity_label text DEFAULT NULL::text,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_scope_type text DEFAULT 'app'::text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL::text,
  p_dedupe_seconds integer DEFAULT 0
)
 RETURNS __SCHEMA__.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_existing __SCHEMA__.activity_events;
  v_row __SCHEMA__.activity_events;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  if p_entity_type not in ('invoice', 'quotation', 'project', 'csr', 'waybill', 'letter') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED',
    'DUPLICATE'
  ) then
    raise exception 'Unsupported event_type: %', p_event_type;
  end if;

  if coalesce(p_dedupe_seconds, 0) > 0 then
    select ae.*
    into v_existing
    from __SCHEMA__.activity_events ae
    where ae.entity_type = p_entity_type
      and ae.entity_id = p_entity_id
      and ae.event_type = p_event_type
      and coalesce(ae.actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(v_actor_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and ae.created_at >= now() - make_interval(secs => p_dedupe_seconds)
    order by ae.created_at desc
    limit 1;

    if v_existing.id is not null then
      return v_existing;
    end if;
  end if;

  insert into __SCHEMA__.activity_events (
    entity_type, entity_id, entity_label, event_type,
    actor_id, actor_label, source, scope_type, metadata, reason
  )
  values (
    p_entity_type, p_entity_id, p_entity_label, p_event_type,
    v_actor_id, p_actor_label, coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'), coalesce(p_metadata, '{}'::jsonb), p_reason
  )
  returning * into v_row;

  return v_row;
end;
$function$
;
$b26$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 27. revert_invoice_to_quotation_transaction  [FIXED: __SCHEMA__.quotations, __SCHEMA__.quotation_items]
    v_body := $b27$
CREATE OR REPLACE FUNCTION __SCHEMA__.revert_invoice_to_quotation_transaction(
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
    v_row __SCHEMA__.quotations;
    v_item JSONB;
    v_schema text;
BEGIN
    v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

    -- Insert quotation (tenant-local)
    INSERT INTO __SCHEMA__.quotations (
        quotation_number, po_number, quotation_title, client_id, client_name, project_id,
        issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping,
        discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields,
        source_cps_id, conversion_chain_id
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
        (p_quotation_payload->>'custom_fields')::JSONB,
        NULLIF(p_quotation_payload->>'source_cps_id', '')::UUID,
        NULLIF(p_quotation_payload->>'conversion_chain_id', '')::UUID
    RETURNING * INTO v_row;

    v_created_quotation := to_jsonb(v_row);
    v_quotation_id := v_row.id;

    -- Insert quotation items (tenant-local)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_quotation_items_payload)
    LOOP
        INSERT INTO __SCHEMA__.quotation_items (
            quotation_id, description, quantity, unit_price, amount,
            unit, list_index, row_type, group_name,
            item_id, sub_description, make, install_rate, install_rate_override,
            vat_rate, discount_rate, group_id, sort_order, image_url, custom_data,
            section, source_cps_id, source_cps_row_id, source_quotation_id,
            source_quotation_item_id
        )
        VALUES (
            v_quotation_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'amount')::NUMERIC,
            v_item->>'unit',
            (v_item->>'list_index')::INTEGER,
            v_item->>'row_type', v_item->>'group_name',
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
            v_item->>'section',
            NULLIF(v_item->>'source_cps_id', '')::UUID,
            NULLIF(v_item->>'source_cps_row_id', '')::UUID,
            NULLIF(v_item->>'source_quotation_id', '')::UUID,
            NULLIF(v_item->>'source_quotation_item_id', '')::UUID
        );
    END LOOP;

    -- Delete invoice items and invoice (tenant schema)
    EXECUTE format('DELETE FROM %I.invoice_items WHERE invoice_id = %L', v_schema, p_invoice_id);
    EXECUTE format('DELETE FROM %I.invoices WHERE id = %L', v_schema, p_invoice_id);

    RETURN v_created_quotation;
END;
$function$
;
$b27$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 28. record_cps_audit_event  [Phase 2.5: structured CPS payload]
    -- The CPS payload now lives in audit_logs.metadata. New CPS events do
    -- not hide it inside `changes` under the reserved key '_cps'; readers
    -- fall back to that legacy location only for older rows.
    v_body := $b28$
CREATE OR REPLACE FUNCTION __SCHEMA__.record_cps_audit_event(
    p_entity_id uuid,
    p_entity_label text,
    p_action text,
    p_metadata jsonb,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_scope_type text DEFAULT 'app'::text
)
 RETURNS __SCHEMA__.audit_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_row __SCHEMA__.audit_logs;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  -- A CPS event is meaningful through its structured payload: unlike
  -- record_audit_log, an empty metadata object is the only reason to skip.
  if p_metadata is null or p_metadata = '{}'::jsonb then
    return null;
  end if;

  insert into __SCHEMA__.audit_logs (
    entity_type, entity_id, entity_label, action,
    actor_id, actor_label, source, scope_type, changes, metadata
  )
  values (
    'cps_sheets', p_entity_id, p_entity_label, p_action,
    v_actor_id, p_actor_label, coalesce(p_source, 'web'),
    coalesce(p_scope_type, 'app'), '[]'::jsonb, p_metadata
  )
  returning * into v_row;

  return v_row;
end;
$function$
;
$b28$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 29. apply_cps_item_feedback_transaction  [Phase 3: controlled downstream]
    -- Applies approved downstream item changes to the originating CPS rows and
    -- records the causal audit pair. The authority gate and the lineage gate are
    -- re-validated from persisted state inside the tenant schema, so a stale or
    -- forged client plan can never retarget a CPS row. Only sp, description and
    -- image_url are ever written. cp is never touched.
    v_body := $b29$
CREATE OR REPLACE FUNCTION __SCHEMA__.apply_cps_item_feedback_transaction(
    p_entity_id uuid,
    p_feedback jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_source_type text;
  v_source_doc_id uuid;
  v_chain_id uuid;
  v_cps_id uuid;
  v_chain_cps_id uuid;
  v_authority_row_id uuid;
  v_authority_stage text;
  v_authority_doc uuid;
  v_match_count integer;
  v_cps_row_id uuid;
  v_found_cps_row_id uuid;
  v_cps_description text;
  v_cps_cells jsonb;
  v_new_description text;
  v_new_cells jsonb;
  v_cps_number text;
  v_src_number text;
  v_actor_id uuid;
  v_actor_label text;
  v_related jsonb;
  v_row_label text;
  v_mutation jsonb;
  v_change jsonb;
  v_apply_changes jsonb;
  v_parent_changes jsonb;
  v_feedback_changes jsonb;
  v_mutation_applied integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_items_touched integer := 0;
  v_parent_id uuid;
  v_field text;
  v_label text;
  v_kind text;
  v_cur_value jsonb;
  v_new_value jsonb;
  v_diagnostics text[] := ARRAY[]::text[];
  v_doc_label text;
  v_summary text;
  v_detail text;
begin
  v_source_type := coalesce(p_feedback->>'sourceDocumentType', '');

  IF v_source_type NOT IN ('quotation', 'invoice') THEN
    RETURN jsonb_build_object('status', 'unsupported', 'applied', 0, 'skipped', 0);
  END IF;

  -- Permission gate. Mirrors the document save RPC.
  IF NOT public.has_entity_permission(p_entity_id, auth.uid(), v_source_type, 'edit') THEN
    RAISE EXCEPTION 'Insufficient permissions: %/edit required', v_source_type
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_chain_id := NULLIF(p_feedback->>'chainId', '')::uuid;
  v_source_doc_id := NULLIF(p_feedback->>'sourceDocumentId', '')::uuid;
  v_cps_id := NULLIF(p_feedback->>'sourceCpsId', '')::uuid;
  v_src_number := p_feedback->>'sourceDocumentNumber';
  v_actor_id := NULLIF(p_feedback->>'actorId', '')::uuid;
  v_actor_label := p_feedback->>'actorLabel';

  IF v_actor_id IS NULL THEN
    v_actor_id := auth.uid();
  END IF;

  IF v_chain_id IS NULL OR v_source_doc_id IS NULL OR v_cps_id IS NULL THEN
    RETURN jsonb_build_object('status', 'no-op', 'applied', 0, 'skipped', 0);
  END IF;

  -- AUTHORITY GATE, re-validated from persisted state. Edit recency, document
  -- status, document number and client state are never consulted.
  SELECT q.id, q.feedback_authority, q.feedback_authority_document_id, q.source_cps_id
    INTO v_authority_row_id, v_authority_stage, v_authority_doc, v_chain_cps_id
  FROM __SCHEMA__.quotations q
  WHERE q.conversion_chain_id = v_chain_id
    AND q.feedback_authority IS NOT NULL
  LIMIT 1;

  IF v_authority_row_id IS NULL
     OR v_authority_stage IS DISTINCT FROM v_source_type
     OR v_authority_doc IS DISTINCT FROM v_source_doc_id THEN
    RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
  END IF;

  -- The CPS root is re-derived from the chain owner. A stale client value can
  -- never retarget feedback to another CPS document.
  IF v_chain_cps_id IS NOT NULL THEN
    v_cps_id := v_chain_cps_id;
  END IF;

  -- The saving document must be the chain's own document. No cross-document and
  -- no cross-tenant id is accepted.
  IF v_source_type = 'quotation' THEN
    IF v_source_doc_id <> v_authority_row_id THEN
      RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
    END IF;
  ELSE
    SELECT count(*) INTO v_match_count
    FROM __SCHEMA__.invoices i
    WHERE i.id = v_source_doc_id
      AND i.source_quotation_id = v_authority_row_id
      AND i.conversion_chain_id = v_chain_id;

    IF v_match_count = 0 THEN
      RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
    END IF;
  END IF;

  SELECT s.cps_number INTO v_cps_number
  FROM __SCHEMA__.cps_sheets s
  WHERE s.id = v_cps_id;

  v_doc_label := CASE WHEN v_source_type = 'invoice' THEN 'Invoice' ELSE 'Quotation' END
    || ' ' || coalesce(v_src_number, '');
  v_related := jsonb_build_object(
    'type', v_source_type,
    'id', v_source_doc_id,
    'number', coalesce(v_src_number, '')
  );

  v_parent_changes := '[]'::jsonb;
  v_feedback_changes := '[]'::jsonb;

  FOR v_mutation IN
    SELECT value FROM jsonb_array_elements(coalesce(p_feedback->'mutations', '[]'::jsonb))
  LOOP
    v_cps_row_id := NULLIF(v_mutation->>'sourceCpsRowId', '')::uuid;
    v_row_label := coalesce(NULLIF(v_mutation->>'rowLabel', ''), 'Item');

    IF v_cps_row_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Missing CPS row reference for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    -- LINEAGE GATE. The persisted downstream row must still claim exactly this
    -- CPS ancestry. Never description, item_id, row order, price, quantity,
    -- unit, image, group or similarity.
    IF v_source_type = 'invoice' THEN
      SELECT count(*) INTO v_match_count
      FROM __SCHEMA__.invoice_items it
      WHERE it.invoice_id = v_source_doc_id
        AND it.source_cps_id = v_cps_id
        AND it.source_cps_row_id = v_cps_row_id
        AND coalesce(it.row_type, 'standard') NOT IN ('group_header', 'section');
    ELSE
      SELECT count(*) INTO v_match_count
      FROM __SCHEMA__.quotation_items it
      WHERE it.quotation_id = v_source_doc_id
        AND it.source_cps_id = v_cps_id
        AND it.source_cps_row_id = v_cps_row_id
        AND coalesce(it.row_type, 'standard') NOT IN ('group_header', 'section');
    END IF;

    IF v_match_count = 0 THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Lineage unavailable for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    IF v_match_count > 1 THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Ambiguous lineage for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    -- ORIGIN GATE. The originating CPS row must still exist in this CPS
    -- document. It is never recreated, never guessed, and never re-targeted.
    v_found_cps_row_id := NULL;
    SELECT r.id, r.description, coalesce(r.cells, '{}'::jsonb)
      INTO v_found_cps_row_id, v_cps_description, v_cps_cells
    FROM __SCHEMA__.cps_rows r
    WHERE r.id = v_cps_row_id
      AND r.cps_sheet_id = v_cps_id;

    IF v_found_cps_row_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Originating CPS row unavailable for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    v_apply_changes := '[]'::jsonb;
    v_new_description := v_cps_description;
    v_new_cells := coalesce(v_cps_cells, '{}'::jsonb);
    v_mutation_applied := 0;

    FOR v_change IN
      SELECT value FROM jsonb_array_elements(coalesce(v_mutation->'changes', '[]'::jsonb))
    LOOP
      v_field := v_change->>'field';

      -- Out-of-contract fields are never written, whatever the caller sends.
      IF v_field NOT IN ('sp', 'description', 'image_url') THEN
        CONTINUE;
      END IF;

      v_kind := coalesce(NULLIF(v_change->>'kind', ''), 'default');
      v_label := coalesce(NULLIF(v_change->>'label', ''), v_field);

      IF v_field = 'sp' THEN
        v_cur_value := to_jsonb(coalesce(NULLIF(v_new_cells->>'sp', '')::numeric, 0));
        v_new_value := to_jsonb(coalesce(NULLIF(v_change->>'new', '')::numeric, 0));
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_cells := v_new_cells || jsonb_build_object('sp', v_new_value);
      ELSIF v_field = 'description' THEN
        -- The downstream domain does not allow an empty item description, so an
        -- empty value is not a clear: it is refused.
        IF btrim(coalesce(v_change->>'new', '')) = '' THEN
          CONTINUE;
        END IF;
        v_cur_value := to_jsonb(coalesce(v_new_description, ''));
        v_new_value := to_jsonb(v_change->>'new');
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_description := v_change->>'new';
      ELSE
        v_cur_value := coalesce(
          to_jsonb(NULLIF(btrim(coalesce(v_new_cells->>'image_url', '')), '')), 'null'::jsonb);
        v_new_value := coalesce(
          to_jsonb(NULLIF(btrim(coalesce(v_change->>'new', '')), '')), 'null'::jsonb);
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_cells := v_new_cells || jsonb_build_object('image_url', v_new_value);
      END IF;

      v_apply_changes := v_apply_changes || jsonb_build_array(jsonb_build_object(
        'field', v_field,
        'label', v_label,
        'kind', v_kind,
        'old', v_cur_value,
        'new', v_new_value
      ));
      v_mutation_applied := v_mutation_applied + 1;
    END LOOP;

    -- Field-diff idempotency: a mutation whose approved fields already hold the
    -- incoming values writes nothing and records nothing.
    IF v_mutation_applied = 0 THEN
      CONTINUE;
    END IF;

    UPDATE __SCHEMA__.cps_rows
    SET description = v_new_description,
        cells = v_new_cells
    WHERE id = v_cps_row_id
      AND cps_sheet_id = v_cps_id;

    v_applied := v_applied + v_mutation_applied;
    v_items_touched := v_items_touched + 1;

    -- Parent event: the downstream edit the user performed. Written FIRST, so
    -- the automatic consequence always has an existing causal parent.
    v_parent_changes := v_parent_changes || (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'rowId', v_cps_row_id,
        'rowLabel', v_row_label,
        'scope', 'row',
        'field', value->>'field',
        'label', value->>'label',
        'old', value->'old',
        'new', value->'new',
        'kind', coalesce(value->>'kind', 'default')
      ) ORDER BY value->>'field'), '[]'::jsonb)
      FROM jsonb_array_elements(coalesce(v_mutation->'changes', '[]'::jsonb)) AS declared(value)
      WHERE value->>'field' IN ('sp', 'description', 'image_url')
    );

    -- Feedback event: the CPS field changes actually written, with the CPS
    -- values that were really replaced.
    v_feedback_changes := v_feedback_changes || (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'rowId', v_cps_row_id,
        'rowLabel', v_row_label,
        'scope', 'row',
        'field', value->>'field',
        'label', value->>'label',
        'old', value->'old',
        'new', value->'new',
        'kind', coalesce(value->>'kind', 'default')
      ) ORDER BY value->>'field'), '[]'::jsonb)
      FROM jsonb_array_elements(v_apply_changes) AS applied(value)
    );
  END LOOP;

  IF v_applied > 0 THEN
    v_summary := CASE WHEN v_source_type = 'invoice'
      THEN 'Invoice item updated' ELSE 'Quotation item updated' END;
    v_detail := coalesce(NULLIF(v_actor_label, ''), 'A user') || ' changed '
      || v_applied::text || ' approved field' || CASE WHEN v_applied = 1 THEN '' ELSE 's' END
      || ' on ' || v_items_touched::text || ' CPS-linked item'
      || CASE WHEN v_items_touched = 1 THEN '' ELSE 's' END || '.';

    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      v_actor_id, coalesce(NULLIF(v_actor_label, ''), 'Unknown user'), 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'DOWNSTREAM_ITEM_UPDATED',
        'actorType', 'user',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', NULL,
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', v_summary,
        'detail', v_detail,
        'changes', v_parent_changes
      )
    )
    RETURNING id INTO v_parent_id;

    -- The system event stays a system event. The human actor is never falsified
    -- as the direct CPS editor; the actor identity travels in the detail line.
    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      NULL, 'Automated feedback', 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'CPS_FEEDBACK_APPLIED',
        'actorType', 'automated-feedback',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', to_jsonb(v_parent_id),
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', 'CPS updated automatically',
        'detail', 'From ' || v_doc_label
          || CASE WHEN v_actor_label IS NULL OR v_actor_label = '' THEN ''
                  ELSE ' · ' || v_actor_label END,
        'changes', v_feedback_changes
      )
    );
  END IF;

  -- An integrity anomaly is auditable. It is never retried against another row
  -- and never surfaces as a user-facing crash unless the whole transaction
  -- failed.
  IF v_skipped > 0 THEN
    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      NULL, 'Automated feedback', 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'FEEDBACK_SKIPPED',
        'actorType', 'system',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', to_jsonb(v_parent_id),
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', 'Feedback skipped',
        'detail', array_to_string(v_diagnostics, ' '),
        'changes', '[]'::jsonb
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_applied > 0 THEN 'applied' ELSE 'no-op' END,
    'applied', v_applied,
    'skipped', v_skipped,
    'diagnostics', CASE WHEN v_skipped > 0 THEN array_to_string(v_diagnostics, ' ') ELSE NULL END
  );
END;
$function$
;
$b29$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);

    -- 30. save_quotation_with_items_transaction  [Phase 3.5: transactional parity]
    -- The AUTHORITATIVE Quotation save. The parent row, the exact item set, the
    -- approved downstream CPS feedback plan and the causal feedback audit commit
    -- in ONE transaction. If any authoritative step fails, the whole save rolls
    -- back, so the Quotation and the Cost & Pricing Sheet can never diverge on
    -- the normal path. apply_cps_item_feedback_transaction is reused unchanged:
    -- the approved-field contract has exactly one implementation, shared with the
    -- Invoice save.
    --
    -- The quotation payload is the SAME serialized payload the direct tenant
    -- write already used, and the item payload is the SAME serializer output, so
    -- no second quotation domain model and no calculation logic exists in SQL.
    v_body := $b30$
CREATE OR REPLACE FUNCTION __SCHEMA__.save_quotation_with_items_transaction(p_entity_id uuid, p_quotation_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text, p_cps_feedback jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_schema text;
  v_quotation_id uuid;
  -- jsonb, not record. A record variable holding SELECT to_jsonb(t) serializes
  -- as {"to_jsonb": {...}}, which nests the saved row one level too deep and
  -- makes result.quotation.quotation_number unreadable to the caller.
  v_row jsonb;
  v_item jsonb;
  v_count integer := 0;
begin
  v_schema := '__SCHEMA_TEXT__';

    -- Permission gate. Mirrors the invoice save RPC.
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'quotation',
            'create'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: quotation/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'quotation',
            'edit'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: quotation/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_mode = 'create' THEN

        EXECUTE format(
            $q$
            INSERT INTO %I.quotations (
                quotation_number,
                po_number,
                quotation_title,
                client_id,
                client_name,
                project_id,
                issue_date,
                valid_until,
                status,
                notes,
                terms,
                workmanship,
                transportation,
                shipping,
                discount,
                vat,
                wht,
                subtotal,
                install_rate_total,
                total,
                amount_in_words,
                custom_fields
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
            RETURNING id
            $q$,
            v_schema
        )
        INTO v_quotation_id
        USING
            p_quotation_payload->>'quotation_number',
            p_quotation_payload->>'po_number',
            p_quotation_payload->>'quotation_title',
            NULLIF(p_quotation_payload->>'client_id', '')::uuid,
            p_quotation_payload->>'client_name',
            NULLIF(p_quotation_payload->>'project_id', '')::uuid,
            (p_quotation_payload->>'issue_date')::date,
            -- quotations.valid_until is DATE. text has no assignment cast to
            -- date, so the cast must be explicit on the USING expression.
            (p_quotation_payload->>'valid_until')::date,
            COALESCE(p_quotation_payload->>'status', 'open'),
            p_quotation_payload->>'notes',
            p_quotation_payload->>'terms',
            COALESCE((p_quotation_payload->>'workmanship')::numeric, 0),
            COALESCE((p_quotation_payload->>'transportation')::numeric, 0),
            COALESCE((p_quotation_payload->>'shipping')::numeric, 0),
            COALESCE((p_quotation_payload->>'discount')::numeric, 0),
            COALESCE((p_quotation_payload->>'vat')::numeric, 0),
            COALESCE((p_quotation_payload->>'wht')::numeric, 0),
            COALESCE((p_quotation_payload->>'subtotal')::numeric, 0),
            COALESCE((p_quotation_payload->>'install_rate_total')::numeric, 0),
            COALESCE((p_quotation_payload->>'total')::numeric, 0),
            p_quotation_payload->>'amount_in_words',
            -- quotations.custom_fields is jsonb and text has no assignment cast
            -- to jsonb, so the cast is explicit and lives on this expression.
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;

    ELSE

        EXECUTE format(
            $q$
            UPDATE %I.quotations
            SET
                po_number = $2,
                quotation_title = $3,
                client_name = $4,
                project_id = NULLIF($5, '')::uuid,
                issue_date = ($6)::date,
                valid_until = ($7)::date,
                status = $8,
                notes = $9,
                terms = $10,
                workmanship = COALESCE($11, 0),
                transportation = COALESCE($12, 0),
                shipping = COALESCE($13, 0),
                discount = COALESCE($14, 0),
                vat = COALESCE($15, 0),
                wht = COALESCE($16, 0),
                subtotal = COALESCE($17, 0),
                install_rate_total = COALESCE($18, 0),
                total = COALESCE($19, 0),
                amount_in_words = $20,
                custom_fields = $21
            WHERE id = $1
            $q$,
            v_schema
        )
        USING
            (p_quotation_payload->>'id')::uuid,
            p_quotation_payload->>'po_number',
            p_quotation_payload->>'quotation_title',
            p_quotation_payload->>'client_name',
            COALESCE(p_quotation_payload->>'project_id', ''),
            p_quotation_payload->>'issue_date',
            p_quotation_payload->>'valid_until',
            COALESCE(p_quotation_payload->>'status', 'open'),
            p_quotation_payload->>'notes',
            p_quotation_payload->>'terms',
            (p_quotation_payload->>'workmanship')::numeric,
            (p_quotation_payload->>'transportation')::numeric,
            (p_quotation_payload->>'shipping')::numeric,
            (p_quotation_payload->>'discount')::numeric,
            (p_quotation_payload->>'vat')::numeric,
            (p_quotation_payload->>'wht')::numeric,
            (p_quotation_payload->>'subtotal')::numeric,
            (p_quotation_payload->>'install_rate_total')::numeric,
            (p_quotation_payload->>'total')::numeric,
            p_quotation_payload->>'amount_in_words',
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;

        v_quotation_id := (p_quotation_payload->>'id')::uuid;

        -- Replace existing items. The item set is authoritative: it replaces
        -- whatever the quotation had, exactly as the client-side save did.
        EXECUTE format(
            'DELETE FROM %I.quotation_items WHERE quotation_id = %L', v_schema,
            v_quotation_id
        );

    END IF;

    -- Insert items
    FOR v_item IN
        SELECT *
        FROM jsonb_array_elements(p_items)
    LOOP

        EXECUTE format(
            $q$
            INSERT INTO %I.quotation_items (
                quotation_id,
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
                item_id,
                source_cps_id,
                source_cps_row_id,
                source_quotation_id,
                source_quotation_item_id
            )
            VALUES (
                %L,
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
            )
            $q$,
            v_schema,
            v_quotation_id
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
            NULLIF(v_item->>'item_id', '')::uuid,
            NULLIF(v_item->>'source_cps_id', '')::uuid,
            NULLIF(v_item->>'source_cps_row_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_item_id', '')::uuid;

        v_count := v_count + 1;

    END LOOP;

    -- Phase 3.5: the approved downstream CPS feedback plan commits INSIDE this
    -- transaction, so the Quotation save, its items, the CPS mutation and both
    -- causal audit events are one unit of work. Authority, lineage and tenant
    -- permission are re-validated inside apply_cps_item_feedback_transaction
    -- before any row changes, so a stale or forged client plan can never
    -- retarget a CPS row. A feedback failure rolls the whole Quotation back.
    IF p_cps_feedback IS NOT NULL THEN
        PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);
    END IF;

    -- Return saved quotation
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.quotations t WHERE t.id = %L', v_schema,
        v_quotation_id
    )
    INTO v_row;

    RETURN jsonb_build_object(
        'id', v_quotation_id,
        'quotation', v_row,
        'items_saved', v_count
    );

END;
$function$
;
$b30$;
    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);
END;
$install$;
-- ============================================================
-- BACKFILL — reinstall tenant RPCs in every existing entity schema
-- ============================================================
DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname LIKE 'entity\_%'
      -- Only fully provisioned tenants: the installer creates functions
      -- whose RETURN types are tenant tables, so a schema that is missing
      -- them (a failed or in-progress provisioning) is skipped.
      AND to_regclass(format('%I.activity_events', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.audit_logs', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.invoices', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.invoice_items', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.quotations', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.quotation_items', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.cps_sheets', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.cps_rows', n.nspname)) IS NOT NULL
    ORDER BY n.nspname
  LOOP
    PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';
