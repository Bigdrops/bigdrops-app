-- Entity verification
SELECT id, workspace_id, slug, display_name FROM public.entities WHERE id = 'eca34515-0b30-482c-b12e-3963df164322';

-- Workspace verification
SELECT id, slug FROM public.workspaces WHERE id = 'eb30b64b-7f95-464f-be1a-805cf2c0fedc';

-- Tenant settings (will fail if schema doesn't exist)
SELECT id, company_name FROM "entity_bigdrops-main_main".settings WHERE id = 1;

-- Public settings
SELECT id, company_name FROM public.settings WHERE id = 1;

-- Provisioning status
SELECT * FROM public.entity_provisioning_status WHERE entity_id = 'eca34515-0b30-482c-b12e-3963df164322';

-- Function definitions
SELECT n.nspname AS schema_name, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname IN ('provision_entity', '_prov_seed_settings', '_prov_get_schema_name') ORDER BY p.proname, arguments;

-- Triggers on settings tables
SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name, pg_get_triggerdef(t.oid) AS trigger_definition FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal AND c.relname = 'settings';

-- All provisioned entities
SELECT e.id AS entity_id, e.display_name, e.slug AS entity_slug, w.slug AS workspace_slug, eps.status, eps.updated_at FROM public.entities e JOIN public.workspaces w ON w.id = e.workspace_id JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id WHERE eps.status = 'ready' ORDER BY e.id;
