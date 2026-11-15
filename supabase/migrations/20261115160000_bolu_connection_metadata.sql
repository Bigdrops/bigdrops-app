-- ============================================================
-- Migration: bolu_connection_metadata
--
-- Purpose
--   Adds metadata JSONB column to public.app_ai_provider_connections
--   to persist enabledModels and custom model visibility settings
--   per connection across sessions.
-- ============================================================

ALTER TABLE public.app_ai_provider_connections
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill metadata.enabledModels from allowed_models where present
UPDATE public.app_ai_provider_connections
SET metadata = jsonb_build_object('enabledModels', allowed_models)
WHERE (metadata IS NULL OR metadata = '{}'::jsonb)
  AND array_length(allowed_models, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_ai_provider_connections_metadata ON public.app_ai_provider_connections USING gin (metadata);
