-- Auth stubs
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, raw_app_meta_data jsonb DEFAULT '{}'::jsonb, raw_user_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now());
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT current_setting('app.current_user_id', true)::uuid; $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('email', current_setting('app.current_user_email', true), 'sub', current_setting('app.current_user_id', true)); $$;
CREATE OR REPLACE FUNCTION public.stamp_row_ownership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF; RETURN NEW; END; $$;

-- Test users
INSERT INTO auth.users (id, email) VALUES
('aaaaaaaa-0000-0000-0000-000000000001','owner@test.com'),
('aaaaaaaa-0000-0000-0000-000000000002','member@test.com'),
('aaaaaaaa-0000-0000-0000-000000000003','operator@test.com')
ON CONFLICT (email) DO NOTHING;

-- Roles
DO $blk$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'test_app_user') THEN CREATE ROLE test_app_user LOGIN PASSWORD 'testpass'; END IF;
GRANT authenticated TO test_app_user;
GRANT anon TO test_app_user;
END $blk$;

GRANT USAGE ON SCHEMA public TO test_app_user;
GRANT USAGE ON SCHEMA auth TO test_app_user;
GRANT SELECT ON auth.users TO test_app_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO test_app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO test_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO test_app_user;

-- Helper
CREATE OR REPLACE FUNCTION public.set_test_user(p_user_id uuid, p_email text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN PERFORM set_config('app.current_user_id', p_user_id::text, false); PERFORM set_config('app.current_user_email', p_email, false); END; $$;
