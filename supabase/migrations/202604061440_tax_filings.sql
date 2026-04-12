-- Tax filings register
create table tax_filings (
  id uuid primary key default gen_random_uuid(),
  settings_id integer not null references settings(id) on delete cascade,
  tax_type text not null check (tax_type in ('vat', 'wht', 'cit')),
  period_start date not null,
  period_end date not null,
  amount_due numeric(15,2) not null default 0,
  amount_paid numeric(15,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'ready', 'filed', 'paid', 'overdue')),
  submitted_at date,
  receipt_reference text,
  portal_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tax_filings enable row level security;

create policy "auth_read_tax_filings"
  on tax_filings for select to authenticated using (true);

create policy "auth_insert_tax_filings"
  on tax_filings for insert to authenticated with check (true);

create policy "auth_update_tax_filings"
  on tax_filings for update to authenticated using (true);

create policy "auth_delete_tax_filings"
  on tax_filings for delete to authenticated using (true);
