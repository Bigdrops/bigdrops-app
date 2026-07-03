-- Adds record_payment_voided RPC mirroring record_payment_recorded.
-- Called by audit.ts recordPaymentVoided() to write to activity_events.

CREATE OR REPLACE FUNCTION public.record_payment_voided(
  p_payment_id uuid,
  p_invoice_id uuid,
  p_amount numeric DEFAULT NULL::numeric,
  p_actor_id uuid DEFAULT NULL::uuid,
  p_actor_label text DEFAULT NULL::text,
  p_source text DEFAULT 'web'::text,
  p_reason text DEFAULT NULL::text
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
