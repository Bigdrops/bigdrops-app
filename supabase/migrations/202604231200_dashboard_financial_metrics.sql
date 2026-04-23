begin;

create or replace function public.get_dashboard_financial_metrics(
  p_now timestamptz,
  p_end_of_week timestamptz,
  p_start_of_month timestamptz
)
returns table (
  overdue numeric,
  due_this_week numeric,
  this_month_collections numeric,
  pending_follow_up integer,
  awaiting_payment_count integer,
  has_past_due boolean
)
language sql
stable
as $$
  select
    coalesce(sum(balance_due) filter (
      where balance_due > 0
        and due_date < p_now
    ), 0) as overdue,
    coalesce(sum(balance_due) filter (
      where balance_due > 0
        and due_date >= p_now
        and due_date <= p_end_of_week
    ), 0) as due_this_week,
    coalesce(sum(cash_received) filter (
      where cash_received > 0
        and issue_date >= p_start_of_month
    ), 0) as this_month_collections,
    count(*) filter (
      where balance_due > 0
        and (
          due_date < p_now
          or (due_date >= p_now and due_date <= p_end_of_week)
        )
    )::integer as pending_follow_up,
    count(*) filter (
      where balance_due > 0
    )::integer as awaiting_payment_count,
    bool_or(
      balance_due > 0
      and due_date < p_now
    ) as has_past_due
  from public.invoice_financials_v;
$$;

commit;
