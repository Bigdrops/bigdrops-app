-- Tax obligation reminders
create table tax_reminders (
  id uuid primary key default gen_random_uuid(),
  settings_id integer not null references settings(id) on delete cascade,
  tax_type text not null check (tax_type in ('vat', 'wht', 'cit')),
  period_start date,
  period_end date,
  due_date date not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'due', 'overdue', 'resolved', 'cancelled')),
  linked_filing_id uuid references tax_filings(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for performance and ordering
create index idx_tax_reminders_due_date on tax_reminders(due_date);

alter table tax_reminders enable row level security;

create policy "auth_read_tax_reminders"
  on tax_reminders for select to authenticated using (true);

create policy "auth_insert_tax_reminders"
  on tax_reminders for insert to authenticated with check (true);

create policy "auth_update_tax_reminders"
  on tax_reminders for update to authenticated using (true);

create policy "auth_delete_tax_reminders"
  on tax_reminders for delete to authenticated using (true);
