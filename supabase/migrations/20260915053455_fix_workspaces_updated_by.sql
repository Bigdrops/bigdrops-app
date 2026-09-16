-- Fix workspaces trigger: add missing updated_by/updated_at columns for stamp_row_ownership
-- Production-safe: ADD COLUMN IF NOT EXISTS, idempotent

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
