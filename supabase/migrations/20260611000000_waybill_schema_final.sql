-- Waybill Schema Finalization
--
-- Hybrid migration that:
-- 1. Adds missing columns to existing waybills table
-- 2. Migrates old status values to architecture-defined set
-- 3. Adds CHECK constraints from architecture DDL Section 8
-- 4. Drops obsolete blank_waybill_logs table (created by prior migration with wrong schema)
-- 5. Recreates blank_waybill_logs table verbatim from architecture DDL Section 8
-- 6. Adds indexes from architecture
-- 7. Replaces fragmented RLS policies with single FOR ALL policy per table
-- 8. Removes created_by FK that architecture does not define

-- ============================================================
-- 1. ADD MISSING COLUMNS
-- ============================================================
-- Architecture DDL defines: client_name, purpose, transport_mode, driver_name, custom_fields
-- client_name: stored display name for the client (denormalized)
ALTER TABLE waybills ADD COLUMN IF NOT EXISTS client_name text;

-- purpose: 'Supply', 'Return', 'Third-Party Custody' (nullable, required when type='external')
ALTER TABLE waybills ADD COLUMN IF NOT EXISTS purpose text;

-- transport_mode: 'By Vehicle', 'By Hand', 'Courier', 'Self Pick-Up' (nullable)
ALTER TABLE waybills ADD COLUMN IF NOT EXISTS transport_mode text;

-- driver_name: operator responsible for transit
ALTER TABLE waybills ADD COLUMN IF NOT EXISTS driver_name text;

-- custom_fields: dynamic container matching app local storage extensions
ALTER TABLE waybills ADD COLUMN IF NOT EXISTS custom_fields jsonb;

-- ============================================================
-- 2. DATA MIGRATION
-- ============================================================
-- Fix null sender_name/receiver_name before adding NOT NULL (architecture mandates NOT NULL)
UPDATE waybills SET sender_name = '' WHERE sender_name IS NULL;
UPDATE waybills SET receiver_name = '' WHERE receiver_name IS NULL;

-- Migrate old 'draft' status to 'dispatched' (draft is removed in architecture)
UPDATE waybills SET status = 'dispatched' WHERE status = 'draft';

-- ============================================================
-- 3. ADD NOT NULL CONSTRAINTS
-- ============================================================
-- Architecture DDL: sender_name text NOT NULL, receiver_name text NOT NULL
ALTER TABLE waybills ALTER COLUMN sender_name SET NOT NULL;
ALTER TABLE waybills ALTER COLUMN receiver_name SET NOT NULL;

-- ============================================================
-- 4. ADD/REPLACE CHECK CONSTRAINTS
-- ============================================================
ALTER TABLE waybills DROP CONSTRAINT IF EXISTS check_waybill_type;
ALTER TABLE waybills ADD CONSTRAINT check_waybill_type CHECK (type IN ('external', 'internal'));

ALTER TABLE waybills DROP CONSTRAINT IF EXISTS check_waybill_status;
ALTER TABLE waybills ADD CONSTRAINT check_waybill_status CHECK (status IN ('dispatched', 'pending_confirmation', 'delivered', 'returned'));

ALTER TABLE waybills DROP CONSTRAINT IF EXISTS check_waybill_transport_mode;
ALTER TABLE waybills ADD CONSTRAINT check_waybill_transport_mode CHECK (
    transport_mode IS NULL OR transport_mode IN ('By Vehicle', 'By Hand', 'Courier', 'Self Pick-Up')
);

-- Business mutex: Ensures purpose is assigned on external, remains strictly NULL on internal
ALTER TABLE waybills DROP CONSTRAINT IF EXISTS check_waybill_purpose_conditional;
ALTER TABLE waybills ADD CONSTRAINT check_waybill_purpose_conditional CHECK (
    (type = 'external' AND purpose IN ('Supply', 'Return', 'Third-Party Custody')) OR
    (type = 'internal' AND purpose IS NULL)
);

-- Waterproof structural check: forces array presence, blocks blank rows, ensures numeric quantities > 0
-- Drop the constraint if it exists
ALTER TABLE waybills DROP CONSTRAINT IF EXISTS check_items_json_structure;

-- Helper function: PostgreSQL doesn't allow subqueries in CHECK constraints,
-- so we wrap the validation logic in an IMMUTABLE function
CREATE OR REPLACE FUNCTION validate_waybill_items(items jsonb)
RETURNS boolean AS $$
BEGIN
    IF jsonb_typeof(items) <> 'array' THEN
        RETURN false;
    END IF;
    
    IF jsonb_array_length(items) = 0 THEN
        RETURN false;
    END IF;
    
    FOR i IN 0..jsonb_array_length(items) - 1 LOOP
        IF NOT (items->i ? 'description') THEN
            RETURN false;
        END IF;
        IF NOT (items->i ? 'qty') THEN
            RETURN false;
        END IF;
        IF jsonb_typeof(items->i->'qty') <> 'number' THEN
            RETURN false;
        END IF;
        IF (items->i->>'qty')::numeric <= 0 THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add the CHECK constraint using the function
ALTER TABLE waybills 
ADD CONSTRAINT check_items_json_structure 
CHECK (validate_waybill_items(items));

-- ============================================================
-- 5. REPLACE UNIQUE CONSTRAINT
-- ============================================================
-- Drop old partial unique index (WHERE waybill_number IS NOT NULL) in favor of full UNIQUE
DROP INDEX IF EXISTS idx_waybills_waybill_number_unique;
ALTER TABLE waybills DROP CONSTRAINT IF EXISTS waybills_waybill_number_key;
ALTER TABLE waybills ADD CONSTRAINT waybills_waybill_number_key UNIQUE (waybill_number);

-- ============================================================
-- 6. DROP OBSOLETE blank_waybill_logs TABLE
-- ============================================================
-- Prior migration (20260520090011) created this table with wrong columns and no architecture constraints
DROP TABLE IF EXISTS public.blank_waybill_logs CASCADE;

-- ============================================================
-- 7. CREATE blank_waybill_logs TABLE (verbatim from architecture DDL Section 8)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blank_waybill_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_waybill_number text NOT NULL,
    type text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_waybill_id uuid,
    reconciled_at timestamp with time zone,

    CONSTRAINT blank_waybill_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_waybill_logs_number_key UNIQUE (assigned_waybill_number),
    CONSTRAINT blank_waybill_logs_linked_waybill_id_fkey FOREIGN KEY (linked_waybill_id) REFERENCES public.waybills(id) ON DELETE SET NULL,
    CONSTRAINT check_blank_log_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_waybill_id IS NULL AND reconciled_at IS NULL) OR
        (linked_waybill_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);

-- ============================================================
-- 8. ADD INDEXES (from architecture DDL Section 8)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_waybills_number ON public.waybills(waybill_number);
CREATE INDEX IF NOT EXISTS idx_waybills_type ON public.waybills(type);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON public.waybills(status);
CREATE INDEX IF NOT EXISTS idx_blank_waybills_number ON public.blank_waybill_logs(assigned_waybill_number);
CREATE INDEX IF NOT EXISTS idx_blank_waybill_logs_linked_id ON public.blank_waybill_logs(linked_waybill_id);

-- ============================================================
-- 9. DROP FOREIGN KEY NOT IN ARCHITECTURE
-- ============================================================
-- Prior migration added waybills_created_by_fkey; architecture DDL defines no FK on created_by
ALTER TABLE waybills DROP CONSTRAINT IF EXISTS waybills_created_by_fkey;

-- ============================================================
-- 10. RLS: blank_waybill_logs
-- ============================================================
ALTER TABLE public.blank_waybill_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS blank_waybill_logs_authenticated_all ON public.blank_waybill_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 11. RLS: waybills — replace fragmented policies with single FOR ALL policy
-- ============================================================
DROP POLICY IF EXISTS waybills_authenticated_select ON waybills;
DROP POLICY IF EXISTS waybills_authenticated_insert ON waybills;
DROP POLICY IF EXISTS waybills_authenticated_update ON waybills;
DROP POLICY IF EXISTS waybills_authenticated_delete ON waybills;

CREATE POLICY IF NOT EXISTS waybills_authenticated_all ON public.waybills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
