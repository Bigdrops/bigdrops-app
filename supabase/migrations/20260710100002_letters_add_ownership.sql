-- Fix: trg_letters_stamp_ownership references NEW.created_by / NEW.updated_by
-- but the original letters table was missing these columns.
-- The stamp_row_ownership() trigger function auto-fills both columns.
-- This matches the pattern used by invoices and receipts.

ALTER TABLE letters
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
