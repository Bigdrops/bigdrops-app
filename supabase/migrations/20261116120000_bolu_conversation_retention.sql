-- Migration: 20261116120000_bolu_conversation_retention.sql
-- Domain: AI Assistant / Bolu 2.0 Conversation Retention & Lifecycle
-- Purpose:
--   1. Add scheduled_deletion_at column to public.bolu_conversations.
--   2. Enforce immutable 10-active-conversation cap globally per authenticated user across all workspaces.
--   3. Automatically schedule the oldest eligible active conversation for deletion (48-hour grace period) on 11th insert.
--   4. Provide an atomic restoration RPC function maintaining the 10-conversation cap.
--   5. Provide an automated cleanup function for expired conversations (scheduled_deletion_at <= now()).
--   6. Register an hourly pg_cron job for automated expiration cleanup.
-- Safety: Additive only. Preserves all existing tables, foreign keys, RLS policies, and business records.

-- ============================================================
-- 1. Add scheduled_deletion_at Column & Indexes
-- ============================================================
ALTER TABLE public.bolu_conversations
    ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.bolu_conversations.scheduled_deletion_at IS
    'Timestamp when this conversation is scheduled for permanent cleanup after the 48-hour grace period.';

-- Index for efficient grace-period queries and cron cleanup
CREATE INDEX IF NOT EXISTS idx_bolu_conversations_retention
    ON public.bolu_conversations USING btree (user_id, status, scheduled_deletion_at);

CREATE INDEX IF NOT EXISTS idx_bolu_conversations_scheduled_cleanup
    ON public.bolu_conversations USING btree (scheduled_deletion_at)
    WHERE scheduled_deletion_at IS NOT NULL;

-- ============================================================
-- 2. Trigger Function: Enforce Global 10-Active Cap on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_bolu_conversation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_key bigint;
    v_active_count integer;
    v_oldest_id uuid;
BEGIN
    -- Only active conversations count against the 10-active allowance
    IF NEW.status != 'active' THEN
        RETURN NEW;
    END IF;

    -- Transaction-scoped advisory lock keyed to the authenticated user ID across all workspaces
    -- Uses 64-bit integer hash from MD5 of user_id to prevent concurrent creation races
    v_lock_key := ('x' || substr(md5('bolu_retention_' || NEW.user_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Count active conversations globally for this user across all workspaces
    SELECT count(*)
    INTO v_active_count
    FROM public.bolu_conversations
    WHERE user_id = NEW.user_id
      AND status = 'active';

    -- If the user already has 10 or more active conversations,
    -- evict the oldest active conversation(s) into the 48-hour grace period
    IF v_active_count >= 10 THEN
        FOR v_oldest_id IN
            SELECT id
            FROM public.bolu_conversations
            WHERE user_id = NEW.user_id
              AND status = 'active'
            ORDER BY last_message_at ASC, created_at ASC
            LIMIT (v_active_count - 9)
        LOOP
            UPDATE public.bolu_conversations
            SET status = 'archived',
                scheduled_deletion_at = clock_timestamp() + interval '48 hours',
                updated_at = clock_timestamp()
            WHERE id = v_oldest_id;
        END LOOP;
    END IF;

    -- Ensure the newly created active conversation has no scheduled deletion timestamp
    NEW.scheduled_deletion_at := NULL;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bolu_conversation_limit ON public.bolu_conversations;
CREATE TRIGGER trg_bolu_conversation_limit
    BEFORE INSERT ON public.bolu_conversations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_bolu_conversation_limit();

-- ============================================================
-- 3. Atomic Restoration RPC: Restore Conversation within Cap
-- ============================================================
CREATE OR REPLACE FUNCTION public.restore_bolu_conversation(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lock_key bigint;
    v_user_id uuid;
    v_active_count integer;
    v_oldest_id uuid;
    v_target_status text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Transaction-scoped advisory lock keyed to authenticated user
    v_lock_key := ('x' || substr(md5('bolu_retention_' || v_user_id::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Verify target conversation exists, belongs to caller, and is eligible for restoration
    SELECT status INTO v_target_status
    FROM public.bolu_conversations
    WHERE id = p_conversation_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conversation not found or unauthorized';
    END IF;

    IF v_target_status = 'active' THEN
        RETURN jsonb_build_object('success', true, 'status', 'active');
    END IF;

    -- Count active conversations globally for this user
    SELECT count(*)
    INTO v_active_count
    FROM public.bolu_conversations
    WHERE user_id = v_user_id
      AND status = 'active';

    -- If 10 or more active conversations, evict the oldest active conversation to grace period
    IF v_active_count >= 10 THEN
        SELECT id INTO v_oldest_id
        FROM public.bolu_conversations
        WHERE user_id = v_user_id
          AND status = 'active'
        ORDER BY last_message_at ASC, created_at ASC
        LIMIT 1;

        IF v_oldest_id IS NOT NULL THEN
            UPDATE public.bolu_conversations
            SET status = 'archived',
                scheduled_deletion_at = clock_timestamp() + interval '48 hours',
                updated_at = clock_timestamp()
            WHERE id = v_oldest_id;
        END IF;
    END IF;

    -- Restore target conversation to active state
    UPDATE public.bolu_conversations
    SET status = 'active',
        scheduled_deletion_at = NULL,
        updated_at = clock_timestamp()
    WHERE id = p_conversation_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'restored',
        'restored_id', p_conversation_id,
        'evicted_id', v_oldest_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_bolu_conversation(uuid) TO authenticated;

-- ============================================================
-- 4. Expired Conversation Cleanup Function
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_bolu_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count integer := 0;
BEGIN
    -- Deletes conversations whose 48-hour grace period has expired.
    -- Foreign key CASCADE on public.bolu_messages removes dependent messages.
    -- Business document records (invoices, csrs, clients) are decoupled and untouched.
    DELETE FROM public.bolu_conversations
    WHERE status = 'archived'
      AND scheduled_deletion_at IS NOT NULL
      AND scheduled_deletion_at <= clock_timestamp();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_bolu_conversations() TO service_role;

-- ============================================================
-- 5. Schedule Hourly Cleanup via pg_cron (if available)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if present to maintain idempotency
        PERFORM cron.unschedule('bolu-retention-cleanup')
        WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bolu-retention-cleanup');

        -- Schedule hourly cleanup at minute 15
        PERFORM cron.schedule(
            'bolu-retention-cleanup',
            '15 * * * *',
            'SELECT public.cleanup_expired_bolu_conversations();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END;
$$;
