[milad] Speaking:

Use the implementation plan above, but do not blindly execute it as written.

The immediate production failure is confirmed:

entity_bigdrops-main_main.save_invoice_with_items_transaction(p_entity_id, p_invoice_payload, p_items, p_mode) does not exist in the tenant schema, so invoice create/edit is broken after the frontend cutover.

Agent instructions:


Read AGENTS.md and the relevant skills first.

Inspect the existing migrations and live RPC definitions before creating anything.

Fix the tenant RPC provisioning architecture, not just this one invoice RPC.

Ensure every frontend-called entity-scoped RPC that was moved to tenantClient.rpc(...) actually exists in every provisioned tenant schema with the exact signature PostgREST expects.

Preserve global/platform RPCs in public.

Do not move user-scoped or platform infrastructure RPCs into tenant schemas unnecessarily.

Make the provisioning installer idempotent and ensure new entities receive the same RPC set automatically.

Backfill the missing RPCs into existing tenant schemas, especially entity_bigdrops-main_main.

Verify the exact function signatures using PostgreSQL catalog queries and confirm PostgREST schema visibility/reload.

Investigate the proposed pg_get_functiondef installer carefully. Do not use fragile string replacement if it can produce incorrect function definitions, search paths, or schema references. Follow the existing provisioning architecture where possible.

Fix the known record_payment_transaction and audit resolver regressions only if confirmed by the actual current definitions.

Do not modify frontend code. The frontend is already correctly calling tenantClient; the database provisioning is what is currently broken.

Do not run bun run build.

Run:




bun run audit:load

bun run typecheck

git status

targeted database verification




Clearly report:




which tenant RPCs were missing

which were created/repaired

exact signatures

whether entity_bigdrops-main_main can now save/edit invoices

whether provisioning future entities installs the same RPCs

any remaining RPCs still incorrectly pointing at public business tables



Critical acceptance test:

The existing frontend calls must work unchanged:

tenantClient.rpc("save_invoice_with_items_transaction", { p_entity_id, p_invoice_payload, p_items, p_mode })

and the equivalent edit/save path must resolve against:

entity_bigdrops-main_main.save_invoice_with_items_transaction(...)

Do not merely make the migration compile. Verify the actual tenant-schema function exists with the exact callable signature.

Consult Supabase/database-workflow incase you forgot how to reach Supabase 
