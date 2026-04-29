create table if not exists notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check (
    event_key in (
      'invoice_unpaid_after',
      'invoice_due_before',
      'invoice_due_today',
      'invoice_overdue_after',
      'monthly_report'
    )
  ),
  threshold_days integer not null check (threshold_days >= 0),
  channel text not null check (channel in ('in_app', 'push', 'email')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_key, threshold_days, channel)
);

create index if not exists idx_notification_preferences_user_id
  on notification_preferences(user_id);

create index if not exists idx_notification_preferences_user_event
  on notification_preferences(user_id, event_key);

alter table notification_preferences enable row level security;

create policy "auth_read_notification_preferences"
  on notification_preferences for select to authenticated
  using (auth.uid() = user_id);

create policy "auth_insert_notification_preferences"
  on notification_preferences for insert to authenticated
  with check (auth.uid() = user_id);

create policy "auth_update_notification_preferences"
  on notification_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "auth_delete_notification_preferences"
  on notification_preferences for delete to authenticated
  using (auth.uid() = user_id);
