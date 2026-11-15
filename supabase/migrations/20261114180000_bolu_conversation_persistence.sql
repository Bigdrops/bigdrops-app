-- Migration: 20261114180000_bolu_conversation_persistence.sql
-- Domain: AI Assistant / Bolu Conversation Persistence
-- Purpose: Provision tenant-isolated persistent conversation threads and messages for Bolu.
-- Security: Strict Row-Level Security (RLS) enforcing tenant boundary isolation via
--           public.entities and public.is_workspace_member(). Only authenticated members
--           can access their conversations within their authorized tenant entity.
-- Safety: Additive only. Idempotent object creation with CASCADE integrity cleanup.

-- ============================================================
-- 1. Table: public.bolu_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bolu_conversations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               text NOT NULL DEFAULT 'New Conversation',
    module              text NOT NULL DEFAULT 'dashboard',
    origin_record_id    uuid,
    status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'archived', 'deleted')),
    last_message_at     timestamptz NOT NULL DEFAULT now(),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient thread listing and contextual lookup
CREATE INDEX IF NOT EXISTS idx_bolu_conversations_tenant_user
    ON public.bolu_conversations USING btree (tenant_id, user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_bolu_conversations_origin_record
    ON public.bolu_conversations USING btree (tenant_id, origin_record_id)
    WHERE origin_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bolu_conversations_status
    ON public.bolu_conversations USING btree (tenant_id, status);

-- Trigger: keep updated_at fresh on modification
DROP TRIGGER IF EXISTS trg_bolu_conversations_updated_at ON public.bolu_conversations;
CREATE TRIGGER trg_bolu_conversations_updated_at
    BEFORE UPDATE ON public.bolu_conversations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 2. Table: public.bolu_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bolu_messages (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid NOT NULL REFERENCES public.bolu_conversations(id) ON DELETE CASCADE,
    tenant_id           uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    sender_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    role                text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content             text NOT NULL DEFAULT '',
    status              text NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('streaming', 'completed', 'failed', 'stopped')),
    proposal_payload    jsonb,
    records_payload     jsonb,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes for sequential message retrieval and proposal queries
CREATE INDEX IF NOT EXISTS idx_bolu_messages_conversation_seq
    ON public.bolu_messages USING btree (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_bolu_messages_tenant
    ON public.bolu_messages USING btree (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bolu_messages_proposals
    ON public.bolu_messages USING btree (conversation_id)
    WHERE proposal_payload IS NOT NULL;

-- Trigger: keep updated_at fresh
DROP TRIGGER IF EXISTS trg_bolu_messages_updated_at ON public.bolu_messages;
CREATE TRIGGER trg_bolu_messages_updated_at
    BEFORE UPDATE ON public.bolu_messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Trigger: advance conversation last_message_at whenever a message is created or modified
CREATE OR REPLACE FUNCTION public.touch_bolu_conversation_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.bolu_conversations
    SET last_message_at = clock_timestamp(),
        updated_at = clock_timestamp()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bolu_messages_touch_conversation ON public.bolu_messages;
CREATE TRIGGER trg_bolu_messages_touch_conversation
    AFTER INSERT OR UPDATE ON public.bolu_messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_bolu_conversation_activity();

-- ============================================================
-- 3. Row-Level Security (RLS) Policies
-- ============================================================
ALTER TABLE public.bolu_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolu_messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Policies for public.bolu_conversations
-- ------------------------------------------------------------

-- SELECT: User can read conversations belonging to their user account within an authorized workspace entity
DROP POLICY IF EXISTS "Tenant members can view their own conversations" ON public.bolu_conversations;
CREATE POLICY "Tenant members can view their own conversations"
    ON public.bolu_conversations FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id = bolu_conversations.tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- INSERT: User can insert conversations for themselves in a workspace entity they are a member of
DROP POLICY IF EXISTS "Tenant members can create conversations" ON public.bolu_conversations;
CREATE POLICY "Tenant members can create conversations"
    ON public.bolu_conversations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id = tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- UPDATE: User can update their own conversations within authorized workspace entity
DROP POLICY IF EXISTS "Tenant members can update their own conversations" ON public.bolu_conversations;
CREATE POLICY "Tenant members can update their own conversations"
    ON public.bolu_conversations FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id = bolu_conversations.tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id = tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- DELETE: User can delete their own conversations within authorized workspace entity
DROP POLICY IF EXISTS "Tenant members can delete their own conversations" ON public.bolu_conversations;
CREATE POLICY "Tenant members can delete their own conversations"
    ON public.bolu_conversations FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.entities e
            WHERE e.id = bolu_conversations.tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- ------------------------------------------------------------
-- Policies for public.bolu_messages
-- ------------------------------------------------------------

-- SELECT: User can view messages belonging to their authorized conversations
DROP POLICY IF EXISTS "Tenant members can view messages in their conversations" ON public.bolu_messages;
CREATE POLICY "Tenant members can view messages in their conversations"
    ON public.bolu_messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bolu_conversations c
            JOIN public.entities e ON e.id = c.tenant_id
            WHERE c.id = bolu_messages.conversation_id
              AND c.user_id = auth.uid()
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- INSERT: User can append messages to their authorized conversations matching the conversation tenant
DROP POLICY IF EXISTS "Tenant members can insert messages into their conversations" ON public.bolu_messages;
CREATE POLICY "Tenant members can insert messages into their conversations"
    ON public.bolu_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bolu_conversations c
            JOIN public.entities e ON e.id = c.tenant_id
            WHERE c.id = conversation_id
              AND c.user_id = auth.uid()
              AND bolu_messages.tenant_id = c.tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- UPDATE: User can update messages in their authorized conversations (e.g. streaming deltas, proposal status)
DROP POLICY IF EXISTS "Tenant members can update messages in their conversations" ON public.bolu_messages;
CREATE POLICY "Tenant members can update messages in their conversations"
    ON public.bolu_messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bolu_conversations c
            JOIN public.entities e ON e.id = c.tenant_id
            WHERE c.id = bolu_messages.conversation_id
              AND c.user_id = auth.uid()
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bolu_conversations c
            JOIN public.entities e ON e.id = c.tenant_id
            WHERE c.id = conversation_id
              AND c.user_id = auth.uid()
              AND bolu_messages.tenant_id = c.tenant_id
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- DELETE: User can delete messages from their authorized conversations
DROP POLICY IF EXISTS "Tenant members can delete messages from their conversations" ON public.bolu_messages;
CREATE POLICY "Tenant members can delete messages from their conversations"
    ON public.bolu_messages FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bolu_conversations c
            JOIN public.entities e ON e.id = c.tenant_id
            WHERE c.id = bolu_messages.conversation_id
              AND c.user_id = auth.uid()
              AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

-- ============================================================
-- 4. Permissions & Service Role Grants
-- ============================================================
REVOKE ALL ON public.bolu_conversations FROM anon;
REVOKE ALL ON public.bolu_messages FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bolu_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bolu_messages TO authenticated;

GRANT ALL ON public.bolu_conversations TO service_role;
GRANT ALL ON public.bolu_messages TO service_role;

COMMENT ON TABLE public.bolu_conversations IS 'Persistent AI chat conversation threads with strict tenant and user isolation.';
COMMENT ON TABLE public.bolu_messages IS 'Persistent chat messages and structured Two-Gate operation proposals for Bolu assistant.';
COMMENT ON COLUMN public.bolu_messages.proposal_payload IS 'Stores Gate 1 and Gate 2 structured document operation proposal envelopes (bolu_operation).';
COMMENT ON COLUMN public.bolu_messages.records_payload IS 'Stores verified application business records surfaced alongside assistant answers.';
