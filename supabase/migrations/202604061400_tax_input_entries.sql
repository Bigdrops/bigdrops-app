-- Create tax_input_entries table
create table tax_input_entries (
  id uuid primary key default gen_random_uuid(),
  settings_id integer not null references settings(id) on delete cascade,
  date date not null,
  vendor_name text,
  category text,
  reference text,
  net_amount numeric(15,2) not null default 0,
  vat_amount numeric(15,2) not null default 0,
  is_recoverable boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Turn on RLS
alter table tax_input_entries enable row level security;

-- Policies for tax_input_entries
create policy "Enable read access for authenticated users on tax_input_entries"
  on tax_input_entries for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users on tax_input_entries"
  on tax_input_entries for insert
  to authenticated
  with check (true);

create policy "Enable update access for authenticated users on tax_input_entries"
  on tax_input_entries for update
  to authenticated
  using (true);

create policy "Enable delete access for authenticated users on tax_input_entries"
  on tax_input_entries for delete
  to authenticated
  using (true);
