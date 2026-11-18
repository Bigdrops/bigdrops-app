-- Domain: Public schema grants for anon/authenticated (disposable project repair)
-- Purpose: the disposable project was provisioned without the standard
--          Supabase bootstrap grants (authenticated: CRUD, anon: SELECT)
--          that production receives by default. Without them the app
--          cannot create workspaces/entities or read public tables at
--          all.
-- This is additive only (GRANT). No objects or data are dropped.
-- Mirrors the Supabase default bootstrap for a public schema that
-- exposes only application-facing tables.

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
