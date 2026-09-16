-- Migration: fix_projects_audit_dependency
-- Production-safe repair for 20260520090001_projects.sql, 20260520090002_quotations.sql,
-- 20260520090003_invoices.sql ordering defects
-- Root cause: those files created 10 record_* functions returning activity_events
-- before 20260520090008_audit_activity.sql created the table. On fresh DB,
-- PGRST205/42704 fails. In production the table already existed, masking defect.
-- Fix: defer all 10 creations to after audit tables exist. Idempotent CREATE OR REPLACE
-- ensures existing production (where functions already exist) is unaffected.
-- New timestamp 20260914202935 is after 20260914132241 latest, preserving history.

-- ============================================================
-- GUARANTEE DEPENDENCY TABLES (bootstrap if missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_label text,
  actor_id uuid,
  actor_label text,
  source text DEFAULT 'web',
  scope_type text DEFAULT 'app',
  metadata jsonb DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON public.activity_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event ON public.activity_events (event_type);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid,
  actor_label text,
  source text DEFAULT 'web',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- ============================================================
-- FUNCTIONS (deferred from 20260520090001, 20260520090002, 20260520090003)
-- ============================================================
-- From 20260520090001_projects.sql (4 functions)

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_project_updated(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception ''Project not found: %'', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''project'',
    p_entity_id := v_project.id,
    p_event_type := ''UPDATED'',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, ''app''),
    p_metadata := coalesce(p_metadata, ''{}''::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_project_note_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception ''Project not found: %'', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''project'',
    p_entity_id := v_project.id,
    p_event_type := ''NOTE_ADDED'',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, ''app''),
    p_metadata := coalesce(p_metadata, ''{}''::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_project_document_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT ''{}''::jsonb)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception ''Project not found: %'', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''project'',
    p_entity_id := v_project.id,
    p_event_type := ''DOCUMENT_ADDED'',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, ''app''),
    p_metadata := coalesce(p_metadata, ''{}''::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_project_linked_activity(p_project_id uuid, p_linked_entity_type text, p_linked_entity_id uuid, p_linked_entity_label text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception ''Project not found: %'', p_project_id;
  end if;

  if p_linked_entity_type not in (''invoice'', ''quotation'') then
    raise exception ''Unsupported linked entity type: %'', p_linked_entity_type;
  end if;

  return public.record_activity_event(
    p_entity_type := ''project'',
    p_entity_id := v_project.id,
    p_event_type := ''LINKED'',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''linked_entity_type'', p_linked_entity_type,
      ''linked_entity_id'', p_linked_entity_id,
      ''linked_entity_label'', p_linked_entity_label
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

-- From 20260520090002_quotations.sql (3 functions)

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotations') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_quotation_created(p_quotation_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception ''Quotation not found: %'', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''quotation'',
    p_entity_id := v_quotation.id,
    p_event_type := ''CREATED'',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''status'', v_quotation.status,
      ''project_id'', v_quotation.project_id,
      ''client_id'', v_quotation.client_id,
      ''total'', v_quotation.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotations') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_quotation_status_changed(p_quotation_id uuid, p_old_status text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception ''Quotation not found: %'', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''quotation'',
    p_entity_id := v_quotation.id,
    p_event_type := ''STATUS_CHANGED'',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''old_status'', p_old_status,
      ''new_status'', coalesce(p_new_status, v_quotation.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotations') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_quotation_linked(p_quotation_id uuid, p_invoice_id uuid DEFAULT NULL::uuid, p_project_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_quotation public.quotations;
begin
  select *
  into v_quotation
  from public.quotations
  where id = p_quotation_id;

  if v_quotation.id is null then
    raise exception ''Quotation not found: %'', p_quotation_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''quotation'',
    p_entity_id := v_quotation.id,
    p_event_type := ''LINKED'',
    p_entity_label := v_quotation.quotation_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_quotation.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''invoice_id'', p_invoice_id,
      ''project_id'', p_project_id
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

-- From 20260520090003_invoices.sql (3 functions)

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_invoice_created(p_invoice_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception ''Invoice not found: %'', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''invoice'',
    p_entity_id := v_invoice.id,
    p_event_type := ''CREATED'',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''status'', v_invoice.status,
      ''project_id'', v_invoice.project_id,
      ''client_id'', v_invoice.client_id,
      ''total'', v_invoice.total
    ),
    p_reason := null,
    p_dedupe_seconds := 30
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_invoice_status_changed(p_invoice_id uuid, p_old_status text DEFAULT NULL::text, p_new_status text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception ''Invoice not found: %'', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''invoice'',
    p_entity_id := v_invoice.id,
    p_event_type := ''STATUS_CHANGED'',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''old_status'', p_old_status,
      ''new_status'', coalesce(p_new_status, v_invoice.status)
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_events') AND EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN EXECUTE 'CREATE OR REPLACE FUNCTION public.record_payment_recorded(p_invoice_id uuid, p_amount numeric DEFAULT NULL::numeric, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT ''web''::text, p_reason text DEFAULT NULL::text)
 RETURNS public.activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception ''Invoice not found: %'', p_invoice_id;
  end if;

  return public.record_activity_event(
    p_entity_type := ''invoice'',
    p_entity_id := v_invoice.id,
    p_event_type := ''PAYMENT_RECORDED'',
    p_entity_label := v_invoice.invoice_number,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_invoice.scope_type, ''app''),
    p_metadata := jsonb_build_object(
      ''amount'', p_amount,
      ''status'', v_invoice.status,
      ''total'', v_invoice.total
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;'; ELSE RAISE NOTICE 'activity_events table not found — skipping deferred function creation'; END IF; END $outer$;


-- From 20260520090005_items_catalog.sql (1 function, deferred due to item_price_summary_v)

DO $outer$ BEGIN IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'normalize_item_text') AND EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'item_price_summary_v' AND schemaname = 'public') THEN EXECUTE '
CREATE OR REPLACE FUNCTION public.get_item_suggestions(search_text text, result_limit integer DEFAULT 5)
 RETURNS TABLE(item_id uuid, display_name text, matched_text text, is_alias boolean, standard_price numeric, last_sold_price numeric, usage_count bigint, rank_score integer)
 LANGUAGE sql
 STABLE
AS $function$
  with q as (
    select public.normalize_item_text(coalesce(search_text, '')) as needle
  ),

  master_matches as (
    select
      c.id as item_id,
      c.name as display_name,
      c.name as matched_text,
      false as is_alias,
      c.standard_price,
      coalesce(s.last_sold_price, 0) as last_sold_price,
      coalesce(s.usage_count, 0)::bigint as usage_count,
      (
        case
          when public.normalize_item_text(c.name) = q.needle then 1000
          when public.normalize_item_text(c.name) like q.needle || '%' then 900
          when public.normalize_item_text(c.name) like '%' || q.needle || '%' then 700
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from public.item_catalog c
    cross join q
    left join public.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and q.needle <> ''
      and public.normalize_item_text(c.name) like '%' || q.needle || '%'
  ),

  alias_matches as (
    select
      c.id as item_id,
      c.name as display_name,
      a.alias_text as matched_text,
      true as is_alias,
      c.standard_price,
      coalesce(s.last_sold_price, 0) as last_sold_price,
      coalesce(s.usage_count, 0)::bigint as usage_count,
      (
        case
          when public.normalize_item_text(a.alias_text) = q.needle then 850
          when public.normalize_item_text(a.alias_text) like q.needle || '%' then 800
          when public.normalize_item_text(a.alias_text) like '%' || q.needle || '%' then 650
          else 0
        end
        + least(coalesce(s.usage_count, 0)::int, 50)
      ) as rank_score
    from public.item_aliases a
    join public.item_catalog c on c.id = a.item_id
    cross join q
    left join public.item_price_summary_v s on s.item_id = c.id
    where c.is_active = true
      and a.is_active = true
      and a.is_retired = false
      and q.needle <> ''
      and public.normalize_item_text(a.alias_text) like '%' || q.needle || '%'
      and public.normalize_item_text(a.alias_text) <> public.normalize_item_text(c.name)
  ),

  combined as (
    select * from master_matches
    union all
    select * from alias_matches
  ),

  deduped as (
    select *
    from (
      select
        c.*,
        row_number() over (
          partition by item_id, matched_text, is_alias
          order by rank_score desc, usage_count desc, display_name asc
        ) as rn
      from combined c
    ) x
    where rn = 1
  )

  select
    item_id,
    display_name,
    matched_text,
    is_alias,
    standard_price,
    last_sold_price,
    usage_count,
    rank_score
  from deduped
  order by
    rank_score desc,
    usage_count desc,
    is_alias asc,
    display_name asc
  limit greatest(coalesce(result_limit, 5), 1);
$function$'; ELSE RAISE NOTICE 'normalize_item_text() or item_price_summary_v not found — skipping get_item_suggestions()'; END IF; END $outer$;
