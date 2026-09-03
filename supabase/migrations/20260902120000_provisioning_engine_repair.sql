-- ============================================================
-- PROVISIONING ENGINE REPAIR — Schema-Qualified Types + Missing Steps
-- ============================================================
-- Fixes the fresh-company provisioning failures caused by the
-- public business table purge (20260830).
--
-- Root cause: _prov_install_tenant_rpcs() embedded SQL still
-- references public.activity_events, public.audit_logs,
-- public.record_activity_event, public.quotations, and
-- public.quotation_items — all of which were purged.
--
-- Additional fixes:
--   - provision_entity() argument order for _prov_seed_settings
--   - provision_entity() argument order for _prov_seed_default_permissions
--   - Add trigger, view, and item-library installation steps
--   - Fix revert_invoice_to_quotation_transaction schema references

-- ============================================================
-- 1. UPDATE _prov_install_tenant_rpcs()
-- ============================================================
-- All 27 embedded tenant RPCs are updated to use schema-qualified
-- types (__SCHEMA__.activity_events, __SCHEMA__.audit_logs) and
-- schema-qualified table/function references.

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

    -- 1. save_invoice_with_items_transaction
    v_body := $b1$
CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text)
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

    -- Insert quotation items (tenant-local)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_quotation_items_payload)
    LOOP
        INSERT INTO __SCHEMA__.quotation_items (
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
            v_item->>'section'
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
END;
$install$;

-- ============================================================
-- 2. UPDATE provision_entity() — fixed args + missing steps
-- ============================================================

CREATE OR REPLACE FUNCTION public.provision_entity(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_idempotency text;
    v_schema_name text;
    v_table text;
    v_resource text;
    v_tables text[];
    v_lock_key bigint;
    v_template_schema text := 'tenant_master_template';
BEGIN
    -- ============================================================
    -- PRE-FLIGHT — NO exception handler, errors propagate to caller
    -- ============================================================

    -- 1. Validate permissions
    PERFORM public._prov_validate_permissions(p_entity_id);

    -- 2. Idempotency check
    v_idempotency := public._prov_check_idempotency(p_entity_id);

    IF v_idempotency = 'ready' THEN
        v_schema_name := public._prov_get_schema_name(p_entity_id);
        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity already provisioned'
        );
    END IF;

    IF v_idempotency = 'creating' THEN
        RETURN jsonb_build_object(
            'status', 'creating',
            'message', 'Provisioning already in progress'
        );
    END IF;

    -- ============================================================
    -- PROVISIONING — nested block WITH exception handler
    -- Only provisioning failures (steps 3+) trigger cleanup + failed status
    -- ============================================================

    BEGIN
        -- 3. Acquire advisory lock (transaction-scoped)
        v_lock_key := hashtext(p_entity_id::text);
        PERFORM pg_advisory_xact_lock(v_lock_key);

        -- 4. Get schema name
        v_schema_name := public._prov_get_schema_name(p_entity_id);

        -- 5. Update status to 'creating'
        PERFORM public._prov_update_status(p_entity_id, 'creating');

        -- 6. Create schema
        PERFORM public._prov_create_schema(v_schema_name);

        -- 7. Clone template tables from master template
        v_tables := public._prov_get_template_tables();

        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_clone_table(v_template_schema, v_schema_name, v_table);
            v_resource := public._prov_table_to_resource(v_table);
            PERFORM public._prov_install_rls(v_schema_name, v_table, p_entity_id, v_resource);
        END LOOP;

        -- 8. Re-add foreign keys (re-pointing from template to target schema)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            PERFORM public._prov_readd_foreign_keys(v_template_schema, v_schema_name, v_table);
        END LOOP;

        -- 9. Install tenant-local triggers (set_row_updated_at, stamp_row_ownership)
        FOREACH v_table IN ARRAY v_tables
        LOOP
            -- NOTE: template has 0 triggers (LIKE doesn't copy triggers).
            -- Source from the working tenant which has the canonical trigger set.
            PERFORM public._prov_install_triggers('entity_bigdrops-main_main', v_schema_name, v_table);
        END LOOP;

        -- 10. Build tenant-local financial views
        PERFORM public._prov_install_financial_views(v_schema_name);

        -- 11. Setup item library (normalize_item_text, get_item_suggestions, item_price_summary_v, merge_item_catalog_entries)
        PERFORM public._prov_install_item_library(v_schema_name, p_entity_id);

        -- 12. Install tenant-local RPCs (audit, lifecycle, activity)
        PERFORM public._prov_install_tenant_rpcs(v_schema_name);

        -- 13. Seed settings (correct argument order: entity_id first, schema second)
        PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);

        -- 14. Seed default permissions (correct: entity_id + creator user_id)
        PERFORM public._prov_seed_default_permissions(p_entity_id, auth.uid());

        -- 15. Finalize
        PERFORM public._prov_update_status(p_entity_id, 'ready');

        RETURN jsonb_build_object(
            'status', 'ready',
            'schema_name', v_schema_name,
            'message', 'Entity provisioned successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- 16. Provisioning failure only — cleanup + mark failed
        PERFORM public._prov_cleanup_on_error(v_schema_name);
        PERFORM public._prov_update_status(p_entity_id, 'failed', SQLERRM);

        RETURN jsonb_build_object(
            'status', 'failed',
            'error', SQLERRM,
            'schema_name', v_schema_name
        );
    END;
END;
$function$;

-- ============================================================
-- 3. Backfill corrected RPCs into ALL existing tenant schemas
-- ============================================================
-- Idempotent: every body is CREATE OR REPLACE FUNCTION.
-- This fixes the working entity_bigdrops-main_main tenant and
-- any future tenants that were installed with the broken RPCs.

DO $$
DECLARE
    v_schema text;
BEGIN
    FOR v_schema IN
        SELECT nspname
        FROM pg_namespace
        WHERE nspname LIKE 'entity\\_%'
    LOOP
        PERFORM public._prov_install_tenant_rpcs(v_schema);
    END LOOP;
END;
$$;

-- ============================================================
-- 4. Reload PostgREST schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
