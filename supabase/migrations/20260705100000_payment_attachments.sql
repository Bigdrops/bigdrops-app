-- Phase 2.6A: Payment attachment infrastructure
-- 1. Add attachments JSONB column to payments table
-- 2. Create telegram_topics table for topic routing
-- 3. Seed telegram_topics with the single tenant row
-- 4. Add ATTACHMENT_UPLOADED and PAYMENT_VOIDED to event_type whitelist
-- 5. Create record_payment_attachment_uploaded RPC

-- ============================================================
-- 1. Attachments column
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- 2. Telegram topics table
-- ============================================================

CREATE TABLE IF NOT EXISTS telegram_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  evidence_type TEXT NOT NULL,
  thread_id INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_topics_tenant_evidence
  ON telegram_topics(tenant_id, evidence_type);

-- ============================================================
-- 3. Seed telegram_topics
-- This is a single-tenant deployment. The tenant UUID is
-- generated here as the canonical tenant identifier.
-- ============================================================

INSERT INTO telegram_topics (tenant_id, evidence_type, thread_id)
VALUES (gen_random_uuid(), 'payment_receipt', 5)
ON CONFLICT (thread_id) DO NOTHING;

-- ============================================================
-- 4. Add ATTACHMENT_UPLOADED to event_type whitelist
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_activity_event(
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
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_id uuid;
  v_existing public.activity_events;
  v_row public.activity_events;
begin
  v_actor_id := coalesce(p_actor_id, auth.uid());

  if p_entity_type not in ('invoice', 'quotation', 'project') then
    raise exception 'Unsupported entity_type: %', p_entity_type;
  end if;

  if p_event_type not in (
    'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED',
    'PAYMENT_VOIDED', 'ATTACHMENT_UPLOADED',
    'LINKED', 'UNLINKED', 'NOTE_ADDED', 'DOCUMENT_ADDED',
    'ARCHIVED', 'UNARCHIVED'
  ) then
    raise exception 'Unsupported event_type: %', p_event_type;
  end if;

  if coalesce(p_dedupe_seconds, 0) > 0 then
    select ae.*
    into v_existing
    from public.activity_events ae
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

  insert into public.activity_events (
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
$function$;

-- ============================================================
-- 5. record_payment_attachment_uploaded RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_payment_attachment_uploaded(
  p_payment_id uuid,
  p_invoice_id uuid,
  p_file_name text DEFAULT NULL::text,
  p_file_size bigint DEFAULT NULL::bigint,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text
)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_invoice public.invoices;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id;

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
