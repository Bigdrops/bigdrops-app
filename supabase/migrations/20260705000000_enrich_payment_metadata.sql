-- Enrich record_payment_recorded metadata with payment details
-- Adds: payment_mode, account_paid_to, running_balance_after, wht_amount
-- Preserves existing: amount, status, total

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
  p_wht_amount numeric DEFAULT NULL::numeric
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
