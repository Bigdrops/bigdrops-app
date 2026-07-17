-- ============================================================
-- ROUND 6 LIFECYCLE TEST — Entity Provisioning Engine
-- ============================================================

-- Seed test data (as superuser)
SELECT public.set_test_user('aaaaaaaa-0000-0000-0000-000000000001', 'owner@test.com');

INSERT INTO public.workspaces (id, slug, name, status, created_by)
VALUES ('11111111-0000-0000-0000-000000000001', 'testws', 'Test Workspace', 'active', 'aaaaaaaa-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
VALUES ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner', '{}')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions)
VALUES ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'member', '{"create_entity": true}')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ============================================================
-- TEST 1: Successful provisioning (as workspace owner)
-- ============================================================

SELECT public.set_test_user('aaaaaaaa-0000-0000-0000-000000000001', 'owner@test.com');

-- Create entity row
INSERT INTO public.entities (id, workspace_id, slug, display_name, entity_type)
VALUES ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'acme', 'Acme Corp', 'company')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := public.provision_entity('22222222-0000-0000-0000-000000000001');
    RAISE NOTICE 'TEST 1 — Successful provisioning: %', v_result;
END $$;

-- Verify schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'entity_testws_acme') THEN
        RAISE NOTICE 'TEST 1 — Schema exists: PASS';
    ELSE
        RAISE NOTICE 'TEST 1 — Schema exists: FAIL';
    END IF;
END $$;

-- Verify tables cloned
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT count(*) INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'entity_testws_acme';
    RAISE NOTICE 'TEST 1 — Tables cloned: % (expected 15)', v_count;
END $$;

-- Verify provisioning status
DO $$
DECLARE
    v_status text;
BEGIN
    SELECT status INTO v_status FROM public.entity_provisioning_status
    WHERE entity_id = '22222222-0000-0000-0000-000000000001';
    RAISE NOTICE 'TEST 1 — Status: % (expected ready)', v_status;
END $$;

-- Verify RLS policies installed
DO $$
DECLARE
    v_count int;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'entity_testws_acme';
    RAISE NOTICE 'TEST 1 — RLS policies: % (expected 60 = 15 tables × 4 policies)', v_count;
END $$;

-- ============================================================
-- TEST 2: Idempotency — re-provision returns ready
-- ============================================================

DO $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := public.provision_entity('22222222-0000-0000-0000-000000000001');
    RAISE NOTICE 'TEST 2 — Idempotency (ready): %', v_result;
END $$;

-- ============================================================
-- TEST 3: Authorization — member with create_entity can provision
-- ============================================================

SELECT public.set_test_user('aaaaaaaa-0000-0000-0000-000000000002', 'member@test.com');

INSERT INTO public.entities (id, workspace_id, slug, display_name, entity_type)
VALUES ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'beta', 'Beta Inc', 'company')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := public.provision_entity('22222222-0000-0000-0000-000000000002');
    RAISE NOTICE 'TEST 3 — Member with create_entity: %', v_result;
END $$;

-- ============================================================
-- TEST 4: Authorization — unauthorized user rejected
-- ============================================================

SELECT public.set_test_user('aaaaaaaa-0000-0000-0000-000000000003', 'operator@test.com');

INSERT INTO public.entities (id, workspace_id, slug, display_name, entity_type)
VALUES ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'gamma', 'Gamma LLC', 'company')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := public.provision_entity('22222222-0000-0000-0000-000000000003');
    RAISE NOTICE 'TEST 4 — Unauthorized user: %', v_result;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 — Unauthorized user: correctly rejected — %', SQLERRM;
END $$;

-- ============================================================
-- TEST 5: Cross-workspace isolation
-- ============================================================

-- Create a second workspace
SELECT public.set_test_user('aaaaaaaa-0000-0000-0000-000000000001', 'owner@test.com');

INSERT INTO public.workspaces (id, slug, name, status, created_by)
VALUES ('33333333-0000-0000-0000-000000000001', 'otherws', 'Other Workspace', 'active', 'aaaaaaaa-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entities (id, workspace_id, slug, display_name, entity_type)
VALUES ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'delta', 'Delta Co', 'company')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
    v_result jsonb;
BEGIN
    v_result := public.provision_entity('44444444-0000-0000-0000-000000000001');
    RAISE NOTICE 'TEST 5 — Cross-workspace isolation: %', v_result;
END $$;

-- Verify different schema names
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'entity_testws_acme')
       AND EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'entity_otherws_delta') THEN
        RAISE NOTICE 'TEST 5 — Schema isolation: PASS';
    ELSE
        RAISE NOTICE 'TEST 5 — Schema isolation: FAIL';
    END IF;
END $$;

-- ============================================================
-- TEST 6: Retry policy — attempt_count tracking
-- ============================================================

DO $$
DECLARE
    v_attempts integer;
BEGIN
    SELECT attempt_count INTO v_attempts FROM public.entity_provisioning_status
    WHERE entity_id = '22222222-0000-0000-0000-000000000001';
    RAISE NOTICE 'TEST 6 — Attempt count for provisioned entity: %', v_attempts;
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================

DO $$ BEGIN RAISE NOTICE '=== ROUND 6 LIFECYCLE TEST COMPLETE ==='; END $$;
