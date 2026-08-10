-- =====================================================================
-- QUOTATION MIGRATION VERIFICATION SCRIPT (READ-ONLY)
-- =====================================================================
-- Purpose: Verify database state before quotation data migration.
-- Target entity: eca34515-0b30-482c-b12e-3963df164322 (entity_bigdrops-main_main)
-- Created: 2026-08-10
--
-- This script is READ-ONLY. It performs:
--   - No INSERTs, UPDATEs, DELETEs
--   - No schema modifications
--   - No function creation
--   - No RLS changes
--
-- Run this against the production database and review the output.
-- =====================================================================

-- =====================================================================
-- SECTION 1: EXACT ROW COUNTS
-- =====================================================================
-- Evidence required: Exact counts for public and tenant schemas.

SELECT '=== SECTION 1: ROW COUNTS ===' AS section;

SELECT
    'public.quotations' AS table_name,
    count(*) AS row_count
FROM public.quotations
UNION ALL
SELECT
    'public.quotation_items' AS table_name,
    count(*) AS row_count
FROM public.quotation_items;

-- Check if tenant tables exist before counting
SELECT '=== SECTION 1: TENANT TABLE existence ===' AS section;

SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'entity_bigdrops-main_main'
  AND tablename IN ('quotations', 'quotation_items');

-- =====================================================================
-- SECTION 2: TABLE STRUCTURE — PUBLIC QUOTATIONS
-- =====================================================================
-- Evidence required: Column names/types for public schema.

SELECT '=== SECTION 2: TABLE STRUCTURE — PUBLIC QUOTATIONS ===' AS section;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quotations'
ORDER BY ordinal_position;

SELECT '=== SECTION 2: TABLE STRUCTURE — PUBLIC QUOTATION_ITEMS ===' AS section;

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'quotation_items'
ORDER BY ordinal_position;

-- =====================================================================
-- SECTION 3: FOREIGN KEYS — PUBLIC QUOTATION_ITEMS
-- =====================================================================
-- Evidence required: FK constraints on quotation_items.

SELECT '=== SECTION 3: FOREIGN KEYS — PUBLIC QUOTATION_ITEMS ===' AS section;

SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'quotation_items';

-- =====================================================================
-- SECTION 4: OWNERSHIP SIGNALS IN QUOTATION DATA
-- =====================================================================
-- Evidence required: What ownership fields exist and their population rates.

SELECT '=== SECTION 4: OWNERSHIP SIGNALS — PUBLIC QUOTATIONS ===' AS section;

SELECT
    count(*) AS total_quotations,
    count(created_by) AS has_created_by,
    count(updated_by) AS has_updated_by,
    count(client_id) AS has_client_id,
    count(project_id) AS has_project_id,
    count(DISTINCT scope_type) AS distinct_scope_types,
    string_agg(DISTINCT scope_type, ', ') AS scope_type_values
FROM public.quotations;

-- Check if created_by users have entity access
SELECT '=== SECTION 4: USER-ENTITY MAPPING ===' AS section;

SELECT
    count(DISTINCT wm.user_id) AS users_with_workspace_access,
    count(DISTINCT ep.user_id) AS users_with_entity_access
FROM public.workspace_members wm
LEFT JOIN public.entities e ON e.workspace_id = wm.workspace_id
LEFT JOIN public.entity_permissions ep ON ep.entity_id = e.id
WHERE e.id = 'eca34515-0b30-482c-b12e-3963df164322';

-- Check which quotation creators have entity access
SELECT '=== SECTION 4: QUOTATION CREATOR OVERLAP ===' AS section;

SELECT
    count(DISTINCT q.created_by) AS distinct_creators_in_public,
    count(DISTINCT CASE
        WHEN ep.user_id IS NOT NULL THEN q.created_by
    END) AS creators_with_entity_access
FROM public.quotations q
LEFT JOIN public.entity_permissions ep ON ep.user_id = q.created_by
WHERE ep.entity_id = 'eca34515-0b30-482c-b12e-3963df164322'
   OR ep.entity_id IS NULL;

-- =====================================================================
-- SECTION 5: ORPHAN CHECK — PUBLIC
-- =====================================================================
-- Evidence required: quotation_items without valid quotation_id.

SELECT '=== SECTION 5: ORPHAN CHECK — PUBLIC ===' AS section;

SELECT
    count(*) AS orphan_items_without_quotation
FROM public.quotation_items qi
LEFT JOIN public.quotations q ON q.id = qi.quotation_id
WHERE q.id IS NULL;

-- =====================================================================
-- SECTION 6: QUOTATION NUMBER UNIQUENESS
-- =====================================================================
-- Evidence required: Are quotation numbers unique?

SELECT '=== SECTION 6: QUOTATION NUMBER DUPLICATES — PUBLIC ===' AS section;

SELECT
    quotation_number,
    count(*) AS occurrences
FROM public.quotations
GROUP BY quotation_number
HAVING count(*) > 1
ORDER BY occurrences DESC
LIMIT 10;

-- =====================================================================
-- SECTION 7: QUOTATION FK TARGETS
-- =====================================================================
-- Evidence required: What tables do quotations reference?

SELECT '=== SECTION 7: QUOTATION FK TARGETS ===' AS section;

SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS ref_schema,
    ccu.table_name AS ref_table,
    ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('quotations', 'quotation_items');

-- Check which FK targets exist in tenant schema
SELECT '=== SECTION 7: FK TARGET AVAILABILITY IN TENANT ===' AS section;

SELECT
    'clients' AS target_table,
    CASE WHEN to_regclass('"entity_bigdrops-main_main".clients') IS NOT NULL
         THEN 'EXISTS' ELSE 'MISSING' END AS tenant_status
UNION ALL
SELECT
    'projects' AS target_table,
    CASE WHEN to_regclass('"entity_bigdrops-main_main".projects') IS NOT NULL
         THEN 'EXISTS' ELSE 'MISSING' END AS tenant_status
UNION ALL
SELECT
    'quotations' AS target_table,
    CASE WHEN to_regclass('"entity_bigdrops-main_main".quotations') IS NOT NULL
         THEN 'EXISTS' ELSE 'MISSING' END AS tenant_status
UNION ALL
SELECT
    'quotation_items' AS target_table,
    CASE WHEN to_regclass('"entity_bigdrops-main_main".quotation_items') IS NOT NULL
         THEN 'EXISTS' ELSE 'MISSING' END AS tenant_status;

-- =====================================================================
-- VERDICT
-- =====================================================================
-- Interpret the output above to determine migration readiness:
--
-- SAFE TO MIGRATE if:
--   ✓ Public quotations/quotation_items have data
--   ✓ Tenant tables are EMPTY or MISSING (count = 0 or don't exist)
--   ✓ Table structures documented
--   ✓ Orphan count = 0
--   ✓ Ownership signals documented (even if weak)
--
-- UNSAFE / OWNERSHIP UNPROVEN if:
--   ✗ Tenant tables are NON-EMPTY (count > 0)
--   ✗ Orphans detected
--   ✗ No clear ownership signal for entity
--
-- NOTE: This script does not produce the verdict automatically.
-- The human operator must review the output and decide.
-- =====================================================================

SELECT '=== VERDICT INSTRUCTIONS ===' AS section;
SELECT
    'Review the output above. Compare public vs tenant counts, check for' AS instruction_1,
    'orphans, and ownership signals. Then decide:' AS instruction_2,
    '  - SAFE TO MIGRATE: tenant tables empty/missing, no conflicts, ownership documented' AS verdict_3,
    '  - UNSAFE / OWNERSHIP UNPROVEN: conflicts exist or ownership unclear' AS verdict_4;
