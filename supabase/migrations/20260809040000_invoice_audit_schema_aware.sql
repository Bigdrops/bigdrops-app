-- Domain: Phase 3 — Audit architecture (schema-aware invoice audit RPCs)
-- Created: 2026-08-09
--
-- Purpose:
--   After cutover, invoice data is tenant-authoritative while audit/activity
--   storage remains global (public.activity_events / public.audit_logs).
--   The invoice audit RPCs previously hardcoded public.invoices, so they
--   would raise "Invoice not found" for tenant-written invoices.
--
-- Change:
--   Each invoice/payment audit RPC gains an optional `p_entity_id uuid
--   DEFAULT NULL` parameter (appended to preserve named-arg call sites).
--   When provided, the invoice row is resolved from the entity's tenant
--   schema via the existing _prov_get_schema_name() entity-resolution
--   mechanism (no arbitrary schema-name parameter is introduced). When
--   NULL (pre-cutover callers / legacy records), the lookup falls back to
--   public. Exactly one schema is read per call — no dual-source reads.
--
-- RPCs updated (all keep SECURITY DEFINER + explicit SET search_path TO
-- 'public' per project conventions):
--   record_invoice_created
--   record_invoice_status_changed
--   record_payment_recorded
--   record_payment_voided
--   record_payment_attachment_uploaded
--
-- Scope guards:
--   - Function definitions only. Audit WRITES remain global (unchanged).
--   - No RLS, table, or permission changes.
--   - No production-specific UUIDs.

-- ============================================================
-- SHARED HELPER: resolve the schema that owns an invoice
-- ============================================================
-- Returns the tenant schema name when the caller supplies an entity id and
-- that schema contains the invoices table; otherwise 'public'.

CREATE OR REPLACE FUNCTION public._audit_resolve_invoice_schema(
    p_entity_id uuid,
    p_invoice_id uuid
)
RETURNS text
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_schema text;
BEGIN
    IF p_entity_id IS NULL THEN
        RETURN 'public';
    END IF;

    v_schema := public._prov_get_schema_name(p_entity_id);

    IF v_schema IS NULL THEN
        RETURN 'public';
    END IF;

    -- Only resolve to the tenant schema when it actually owns the invoice
    -- table (defensive: provisioning may not have completed).
    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = v_schema
          AND c.relname = 'invoices'
          AND c.relkind = 'r'
    ) THEN
        RETURN v_schema;
    END IF;

    RETURN 'public';
END;
$function$;

-- ============================================================
-- record_invoice_created
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_invoice_created(
    p_invoice_id uuid,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
  v_schema text;
begin
  v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
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
$function$;

-- ============================================================
-- record_invoice_status_changed
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_invoice_status_changed(
    p_invoice_id uuid,
    p_old_status text DEFAULT NULL::text,
    p_new_status text DEFAULT NULL::text,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
  v_schema text;
begin
  v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
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
$function$;

-- ============================================================
-- record_payment_recorded (enriched signature preserved)
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_payment_recorded(
    p_invoice_id uuid,
    p_amount numeric DEFAULT NULL::numeric,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_payment_mode text DEFAULT NULL::text,
    p_account_paid_to text DEFAULT NULL::text,
    p_running_balance_after numeric DEFAULT NULL::numeric,
    p_wht_amount numeric DEFAULT NULL::numeric,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
  v_schema text;
begin
  v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'invoice',
    p_entity_id := v_invoice.id,
    p_event_type := 'PAYMENT_RECORDED',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'amount', p_amount,
      'status', v_invoice.status,
      'total', v_invoice.total,
      'payment_mode', p_payment_mode,
      'account_paid_to', p_account_paid_to,
      'running_balance_after', p_running_balance_after,
      'wht_amount', p_wht_amount
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

-- ============================================================
-- record_payment_voided
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_payment_voided(
    p_payment_id uuid,
    p_invoice_id uuid,
    p_amount numeric DEFAULT NULL::numeric,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_reason text DEFAULT NULL::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
  v_schema text;
begin
  v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
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
$function$;

-- ============================================================
-- record_payment_attachment_uploaded
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_payment_attachment_uploaded(
    p_payment_id uuid,
    p_invoice_id uuid,
    p_file_name text DEFAULT NULL::text,
    p_file_size bigint DEFAULT NULL::bigint,
    p_actor_id uuid DEFAULT NULL::uuid,
    p_actor_label text DEFAULT NULL::text,
    p_source text DEFAULT 'web'::text,
    p_entity_id uuid DEFAULT NULL::uuid
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
  v_schema text;
begin
  v_schema := public._audit_resolve_invoice_schema(p_entity_id, p_invoice_id);

  execute format('select * from %I.invoices where id = %L', v_schema, p_invoice_id)
    into v_invoice;

  if v_invoice.id is null then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  return public.record_activity_event(
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
$function$;
