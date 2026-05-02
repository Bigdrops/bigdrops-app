-- Migration: Add archive support to Logistics and Service documents
-- Add archived_at column to rfqs, csrs, waybills, boqs

alter table if exists public.rfqs add column if not exists archived_at timestamptz;
alter table if exists public.csrs add column if not exists archived_at timestamptz;
alter table if exists public.waybills add column if not exists archived_at timestamptz;
alter table if exists public.boqs add column if not exists archived_at timestamptz;

-- Add indexes for performance on archived filters
create index if not exists idx_rfqs_archived_at on public.rfqs (archived_at) where archived_at is not null;
create index if not exists idx_csrs_archived_at on public.csrs (archived_at) where archived_at is not null;
create index if not exists idx_waybills_archived_at on public.waybills (archived_at) where archived_at is not null;
create index if not exists idx_boqs_archived_at on public.boqs (archived_at) where archived_at is not null;
