/* eslint-disable */
// Generates supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql
//
// Phase 3.6 P0 hotfix. Takes the Phase 3.5 installer body from
// 20261006120000_tenant_rpc_cps_quotation_transaction.sql and applies exactly
// one surgical edit:
//
//   before installing the current five-argument
//   save_invoice_with_items_transaction(), drop the obsolete four-argument
//   overload by exact identity.
//
// PostgreSQL function identity includes the argument types. The Phase 3
// CREATE OR REPLACE with a new defaulted fifth argument created a new function
// and did not replace the old four-argument function. PostgREST then saw both
// functions as compatible with a four-argument call.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const SRC = path.join(root, 'supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql')
const OUT = path.join(root, 'supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql')

const src = fs.readFileSync(SRC, 'utf8')

const START = 'CREATE OR REPLACE FUNCTION public._prov_install_tenant_rpcs(p_schema_name text)'
const startAt = src.indexOf(START)
if (startAt < 0) throw new Error('installer start not found')
const endAt = src.indexOf('$install$;', startAt)
if (endAt < 0) throw new Error('installer end not found')
let block = src.slice(startAt, endAt + '$install$;'.length)

let edits = 0

function edit(label, find, replace, { all = false } = {}) {
  const count = block.split(find).length - 1
  if (count === 0) throw new Error(`ANCHOR MISSING: ${label}`)
  if (!all && count !== 1) throw new Error(`ANCHOR NOT UNIQUE (${count}): ${label}`)
  block = all ? block.split(find).join(replace) : block.replace(find, replace)
  edits += count
  console.log(`ok  ${label}  (x${count})`)
}

const EXEC_LINE =
  "    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);"
const B1_START = '    -- 1. save_invoice_with_items_transaction\r\n    v_body := $b1$'

const DROP_OBSOLETE_INVOICE_RPC = `
    -- Phase 3.6 P0 hotfix: remove the obsolete four-argument Invoice save
    -- overload before installing the authoritative five-argument function.
    -- Remove only the obsolete identity. Do not drop dependent objects.
    v_body := $drop_invoice_overload$
DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);
$drop_invoice_overload$;
${EXEC_LINE}

`
  .trimStart()
  .split('\n')
  .join('\r\n')

edit('drop obsolete 4-arg invoice overload before b1 create', B1_START, DROP_OBSOLETE_INVOICE_RPC + B1_START)

const header = [
  '-- ============================================================',
  '-- TENANT RPCs: INVOICE RPC OVERLOAD P0 HOTFIX',
  '-- ============================================================',
  '-- Phase 3.6. Regenerates public._prov_install_tenant_rpcs() from the',
  '-- Phase 3.5 installer and adds one cleanup step before block 1.',
  '--',
  '-- Root cause:',
  '--   CREATE OR REPLACE FUNCTION matches PostgreSQL functions by name and',
  '--   identity argument types. The Phase 3 five-argument Invoice function did',
  '--   not replace the older four-argument function. Because the fifth argument',
  '--   has DEFAULT NULL, a four-argument PostgREST call can match both',
  '--   overloads, which causes candidate ambiguity.',
  '--',
  '-- Hotfix:',
  '--   DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(',
  '--     uuid, jsonb, jsonb, text',
  '--   );',
  '--',
  '-- This removes only the obsolete exact identity. It does not drop the',
  '-- current five-argument function, does not drop dependent objects, and keeps the Phase',
  '-- 3.5 Quotation transaction and Phase 3 CPS feedback helper unchanged.',
  '-- ============================================================',
  '',
  '',
].join('\r\n')

const footer = [
  '',
  '-- ============================================================',
  '-- BACKFILL — reinstall tenant RPCs in every existing entity schema',
  '-- ============================================================',
  'DO $do$',
  'DECLARE',
  '  v_schema record;',
  'BEGIN',
  '  FOR v_schema IN',
  '    SELECT n.nspname AS schemaname',
  '    FROM pg_namespace n',
  "    WHERE n.nspname LIKE 'entity\\_%'",
  '      -- Only fully provisioned tenants: the installer creates functions',
  '      -- whose RETURN types are tenant tables, so a schema that is missing',
  '      -- them (a failed or in-progress provisioning) is skipped.',
  "      AND to_regclass(format('%I.activity_events', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.audit_logs', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.invoices', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.invoice_items', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.quotations', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.quotation_items', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.cps_sheets', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.cps_rows', n.nspname)) IS NOT NULL",
  '    ORDER BY n.nspname',
  '  LOOP',
  '    PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);',
  '  END LOOP;',
  'END',
  '$do$;',
  '',
  "NOTIFY pgrst, 'reload schema';",
  '',
].join('\r\n')

fs.writeFileSync(OUT, header + block + footer)

console.log(`\nedits applied: ${edits}`)
console.log(`written: ${path.relative(root, OUT)} (${fs.statSync(OUT).size} bytes)`)

const out = fs.readFileSync(OUT, 'utf8')

const mustAppearOnce = [
  'DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_quotation_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.apply_cps_item_feedback_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.record_cps_audit_event(',
]

for (const text of mustAppearOnce) {
  const count = out.split(text).length - 1
  console.log(`probe x1  "${text.slice(0, 64)}" -> ${count}`)
  if (count !== 1) throw new Error(`CONTRACT PROBE FAILED (want 1, got ${count}): ${text}`)
}

if (/\bCASCADE\b/i.test(out)) throw new Error('CONTRACT PROBE FAILED: hotfix must not use CASCADE')
if (out.includes('DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text, jsonb)')) {
  throw new Error('CONTRACT PROBE FAILED: must not drop the authoritative 5-arg invoice RPC')
}

const dropAt = out.indexOf('DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);')
const createAt = out.indexOf('CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(')
if (!(dropAt > 0 && createAt > dropAt)) {
  throw new Error('CONTRACT PROBE FAILED: obsolete overload drop must precede the 5-arg create')
}
console.log('probe order  drop obsolete overload before authoritative create -> ok')
