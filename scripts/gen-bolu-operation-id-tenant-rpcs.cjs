/* eslint-disable */
// Generates supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql
//
// Purpose: regenerate the canonical public._prov_install_tenant_rpcs() from the
// authoritative installer (20261106230000) with exactly four surgical edits so
// its embedded invoice and quotation save RPCs persist `operation_id`.
//
// This keeps ONE source of truth for tenant RPCs: the canonical installer.
// Existing active tenants are upgraded by the guarded backfill loop below;
// future tenants receive the corrected RPCs through
// provision_entity -> _prov_install_tenant_rpcs.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const SRC = path.join(root, 'supabase/migrations/20261106230000_tenant_rpc_purchase_order_transaction.sql')
const OUT = path.join(root, 'supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql')

const src = fs.readFileSync(SRC, 'utf8')

const START = 'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)'
const startAt = src.indexOf(START)
if (startAt < 0) throw new Error('installer start not found')
const endAt = src.indexOf('$install$;', startAt)
if (endAt < 0) throw new Error('installer end not found')
let block = src.slice(startAt, endAt + '$install$;'.length)

let edits = 0
function edit(label, find, replace) {
  const count = block.split(find).length - 1
  if (count !== 1) throw new Error(`ANCHOR ${count !== 1 ? 'MISSING/NOT UNIQUE' : ''}: ${label} (x${count})`)
  block = block.replace(find, replace)
  edits += 1
  console.log(`ok  ${label}`)
}

// Invoice INSERT: add operation_id as the 26th column.
edit(
  'invoice INSERT column list',
  "                amount_in_words\r\n            )\r\n            VALUES (\r\n                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,\r\n                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,\r\n                $22, $23, $24, $25\r\n            )",
  "                amount_in_words,\r\n                operation_id\r\n            )\r\n            VALUES (\r\n                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,\r\n                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,\r\n                $22, $23, $24, $25, $26\r\n            )",
)

// Invoice INSERT USING: add operation_id extraction, empty -> NULL.
edit(
  'invoice INSERT USING tail',
  "            p_invoice_payload->>'custom_fields',\r\n            p_invoice_payload->>'work_duration',\r\n            COALESCE((p_invoice_payload->>'subtotal')::numeric, 0),\r\n            COALESCE((p_invoice_payload->>'install_rate_total')::numeric, 0),\r\n            COALESCE((p_invoice_payload->>'total')::numeric, 0),\r\n            p_invoice_payload->>'amount_in_words';",
  "            p_invoice_payload->>'custom_fields',\r\n            p_invoice_payload->>'work_duration',\r\n            COALESCE((p_invoice_payload->>'subtotal')::numeric, 0),\r\n            COALESCE((p_invoice_payload->>'install_rate_total')::numeric, 0),\r\n            COALESCE((p_invoice_payload->>'total')::numeric, 0),\r\n            p_invoice_payload->>'amount_in_words',\r\n            NULLIF(p_invoice_payload->>'operation_id', '');",
)

// Quotation INSERT: add operation_id as the 23rd column.
edit(
  'quotation INSERT column list',
  "                amount_in_words,\r\n                custom_fields\r\n            )\r\n            VALUES (\r\n                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,\r\n                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22\r\n            )",
  "                amount_in_words,\r\n                custom_fields,\r\n                operation_id\r\n            )\r\n            VALUES (\r\n                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,\r\n                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23\r\n            )",
)

// Quotation INSERT USING: add operation_id extraction, empty -> NULL.
edit(
  'quotation INSERT USING tail',
  "            p_quotation_payload->>'amount_in_words',\r\n            -- quotations.custom_fields is jsonb and text has no assignment cast\r\n            -- to jsonb, so the cast is explicit and lives on this expression.\r\n            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;",
  "            p_quotation_payload->>'amount_in_words',\r\n            -- quotations.custom_fields is jsonb and text has no assignment cast\r\n            -- to jsonb, so the cast is explicit and lives on this expression.\r\n            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb,\r\n            NULLIF(p_quotation_payload->>'operation_id', '');",
)

const header = [
  '-- ============================================================',
  '-- BOLU IDEMPOTENCY: CANONICAL TENANT RPC INSTALLER ALIGNMENT',
  '-- ============================================================',
  '-- Regenerates public._prov_install_tenant_rpcs() from the authoritative',
  '-- 20261106230000 installer with exactly four surgical edits so that:',
  '--   - save_invoice_with_items_transaction writes operation_id (col 26)',
  '--   - save_quotation_with_items_transaction writes operation_id (col 23)',
  '--',
  '-- Both map an empty/absent payload operation_id to NULL via NULLIF(...).',
  '-- Function signatures, grants, permissions, item handling, update-mode',
  '-- bodies, and all unrelated RPCs are unchanged.',
  '--',
  '-- This is the single source of truth for tenant save RPCs:',
  '--   future tenants: provision_entity -> _prov_install_tenant_rpcs',
  '--   existing tenants: active-tenant backfill -> _prov_install_tenant_rpcs',
  '--',
  '-- Requires 20261118120000 (operation_id columns + partial indexes).',
  '-- ============================================================',
  '',
  '',
].join('\r\n')

const footer = [
  '',
  '-- ============================================================',
  '-- BACKFILL - reinstall canonical tenant RPCs in active tenant schemas',
  '-- ============================================================',
  'DO $do$',
  'DECLARE',
  '  v_schema record;',
  '  v_relation text;',
  '  v_missing text[];',
  '  v_required_relations text[] := ARRAY[',
  "    'activity_events', 'audit_logs', 'cps_rows', 'cps_sheets',",
  "    'csrs', 'invoice_items', 'invoices', 'letters', 'payments',",
  "    'projects', 'purchase_order_items', 'purchase_orders',",
  "    'quotation_items', 'quotations', 'suppliers', 'waybills'",
  '  ];',
  'BEGIN',
  '  -- Known non-ready tenants are not migration targets. The normal provisioning',
  '  -- path installs the canonical RPCs after cloning, and its exception handler',
  '  -- marks the tenant failed if installation raises.',
  '  FOR v_schema IN',
  '    SELECT DISTINCT public._prov_get_schema_name(e.id) AS schemaname, eps.status',
  '    FROM public.entities e',
  '    LEFT JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id',
  "    WHERE public._prov_get_schema_name(e.id) LIKE 'entity\\_%'",
  '      AND eps.status IS NOT NULL',
  "      AND eps.status <> 'ready'",
  '    ORDER BY schemaname',
  '  LOOP',
  "    RAISE NOTICE 'Skipping tenant RPC installation for schema % (provisioning status %)',",
  '      v_schema.schemaname, v_schema.status;',
  '  END LOOP;',
  '',
  '  -- Active tenants: a missing status row is treated as a legacy ready tenant.',
  '  -- Schemas are derived from public.entities, never from arbitrary pg_namespace',
  '  -- names; this matches the operation-id migration exactly.',
  '  FOR v_schema IN',
  '    SELECT DISTINCT public._prov_get_schema_name(e.id) AS schemaname',
  '    FROM public.entities e',
  '    LEFT JOIN public.entity_provisioning_status eps ON eps.entity_id = e.id',
  "    WHERE public._prov_get_schema_name(e.id) LIKE 'entity\\_%'",
  "      AND COALESCE(eps.status, 'ready') = 'ready'",
  '    ORDER BY schemaname',
  '  LOOP',
  '    -- record_payment_transaction catches undefined_table for invoice_financials_v,',
  '    -- so the view is not a hard prerequisite for installing the RPC set.',
  '    v_missing := ARRAY[]::text[];',
  '    FOR v_relation IN SELECT unnest(v_required_relations) LOOP',
  "      IF to_regclass(format('%I.%I', v_schema.schemaname, v_relation)) IS NULL THEN",
  "        v_missing := array_append(v_missing, 'relation ' || v_relation);",
  '      END IF;',
  '    END LOOP;',
  '',
  '    IF NOT EXISTS (',
  '      SELECT 1 FROM information_schema.columns',
  '      WHERE table_schema = v_schema.schemaname',
  "        AND table_name = 'invoices'",
  "        AND column_name = 'operation_id'",
  '    ) THEN',
  "      v_missing := array_append(v_missing, 'column invoices.operation_id');",
  '    END IF;',
  '    IF NOT EXISTS (',
  '      SELECT 1 FROM information_schema.columns',
  '      WHERE table_schema = v_schema.schemaname',
  "        AND table_name = 'quotations'",
  "        AND column_name = 'operation_id'",
  '    ) THEN',
  "      v_missing := array_append(v_missing, 'column quotations.operation_id');",
  '    END IF;',
  '',
  "    IF to_regprocedure('public.has_entity_permission(uuid, uuid, text, text)') IS NULL THEN",
  "      v_missing := array_append(v_missing, 'function public.has_entity_permission');",
  '    END IF;',
  "    IF to_regprocedure('public.compute_jsonb_diff(jsonb, jsonb)') IS NULL THEN",
  "      v_missing := array_append(v_missing, 'function public.compute_jsonb_diff');",
  '    END IF;',
  "    IF to_regprocedure('public._audit_resolve_invoice_schema(uuid, uuid)') IS NULL THEN",
  "      v_missing := array_append(v_missing, 'function public._audit_resolve_invoice_schema');",
  '    END IF;',
  '',
  '    -- An active tenant with missing installer dependencies must abort the',
  '    -- migration. It must not be silently skipped and left on divergent RPCs.',
  '    IF coalesce(array_length(v_missing, 1), 0) > 0 THEN',
  "      RAISE EXCEPTION 'Cannot install canonical tenant RPCs in schema %: missing %',",
  "        v_schema.schemaname, array_to_string(v_missing, ', ');",
  '    END IF;',
  '',
  '    -- No per-tenant exception handler: an installation error aborts the',
  '    -- migration and rolls back the tenant installer changes.',
  '    PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);',
  '',
  "    IF to_regprocedure(format('%I.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text, jsonb)', v_schema.schemaname)) IS NULL",
  "       OR to_regprocedure(format('%I.save_quotation_with_items_transaction(uuid, jsonb, jsonb, text, jsonb)', v_schema.schemaname)) IS NULL THEN",
  "      RAISE EXCEPTION 'Canonical save RPC verification failed in schema %', v_schema.schemaname;",
  '    END IF;',
  '',
  "    RAISE NOTICE 'Installed canonical tenant RPCs in schema %', v_schema.schemaname;",
  '  END LOOP;',
  'END',
  '$do$;',
  '',
  "NOTIFY pgrst, 'reload schema';",
  '',
].join('\r\n')

fs.writeFileSync(OUT, header + block + footer)

// Contract probes on the generated SQL.
const out = fs.readFileSync(OUT, 'utf8')
const mustAppearOnce = [
  'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)',
  "NULLIF(p_invoice_payload->>'operation_id', '');",
  "NULLIF(p_quotation_payload->>'operation_id', '');",
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_quotation_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.apply_cps_item_feedback_transaction(',
  "'column invoices.operation_id'",
  "'column quotations.operation_id'",
]
for (const text of mustAppearOnce) {
  const count = out.split(text).length - 1
  if (count !== 1) throw new Error(`probe x1 FAILED (got ${count}): ${text}`)
  console.log(`probe x1  ${text.slice(0, 56)}`)
}
if (/\bCASCADE\b/i.test(out)) throw new Error('probe FAILED: CASCADE must not appear')
if ((out.match(/operation_id\r?\n/g) || []).length < 2) throw new Error('probe FAILED: operation_id not installed')
console.log(`\nedits applied: ${edits}`)
console.log(`written: ${path.relative(root, OUT)} (${fs.statSync(OUT).size} bytes)`)
