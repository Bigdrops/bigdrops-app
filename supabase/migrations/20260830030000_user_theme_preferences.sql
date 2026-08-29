-- Domain: User Preferences
-- Table: user_preferences (user-scoped theme selection)
-- Created: 2026-08-30
-- Purpose: Decouple theme selection from tenant-scoped settings.
--          Each user owns their own theme preference, not the business.

-- ============================================================
-- TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id uuid NOT NULL DEFAULT auth.uid(),
    theme_preset_id text,
    theme_mode text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id
    ON public.user_preferences USING btree (user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
CREATE POLICY user_preferences_select_own
    ON user_preferences FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Users can only insert their own preferences
CREATE POLICY user_preferences_insert_own
    ON user_preferences FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can only update their own preferences
CREATE POLICY user_preferences_update_own
    ON user_preferences FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences (reset)
CREATE POLICY user_preferences_delete_own
    ON user_preferences FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_user_preference_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_preference_updated_at();
