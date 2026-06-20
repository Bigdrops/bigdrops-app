-- Add engine_no column to csrs table
ALTER TABLE IF EXISTS public.csrs ADD COLUMN IF NOT EXISTS engine_no text;
