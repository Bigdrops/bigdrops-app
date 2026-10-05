/* eslint-disable */
// Generates supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql
//
// Takes the authoritative _prov_install_tenant_rpcs() body text from
// 20260902120000_provisioning_engine_repair.sql and applies exactly three
// surgical edits, then re-emits the whole installer so future tenants inherit
// the lineage/metadata-aware tenant RPCs:
//
//   1. save_invoice_with_items_transaction writes the four Phase 2 lineage
//      columns in the same INSERT as the invoice items.
//   2. a new record_cps_audit_event() writes the structured CPS payload into
//      audit_logs.metadata. record_audit_log() itself is NOT touched: several
//      tenant functions depend on its exact 11-argument signature, and adding
//      a defaulted parameter would either break them (DROP) or make their
//      calls ambiguous (overload with a default). A dedicated writer keeps one
//      authoritative payload location with zero risk to existing audit paths.
//   3. revert_invoice_to_quotation_transaction carries CPS/Quotation lineage
//      and the conversion chain id into the reverted quotation.
//
// Fails loudly if any anchor is missing or duplicated.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const SRC = path.join(root, 'supabase/migrations/20260902120000_provisioning_engine_repair.sql')
const OUT = path.join(root, 'supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql')

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

// ── Edit 1: save_invoice_with_items_transaction carries lineage ────────────
edit(
  'b1 insert columns',
  '                item_id\r\n            )',
  '                item_id,\r\n' +
    '                source_cps_id,\r\n' +
    '                source_cps_row_id,\r\n' +
    '                source_quotation_id,\r\n' +
    '                source_quotation_item_id\r\n' +
    '            )',
)

edit(
  'b1 values placeholders',
  '                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21\r\n',
  '                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,\r\n' +
    '                $22, $23, $24, $25\r\n',
)

edit(
  'b1 using args',
  "            NULLIF(v_item->>'item_id', '')::uuid;",
  "            NULLIF(v_item->>'item_id', '')::uuid,\r\n" +
    "            NULLIF(v_item->>'source_cps_id', '')::uuid,\r\n" +
    "            NULLIF(v_item->>'source_cps_row_id', '')::uuid,\r\n" +
    "            NULLIF(v_item->>'source_quotation_id', '')::uuid,\r\n" +
    "            NULLIF(v_item->>'source_quotation_item_id', '')::uuid;",
)

// ── Edit 2: record_audit_log stores structured metadata ────────────────────
edit(
  'b25 signature',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.record_audit_log(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT \'web\'::text, p_scope_type text DEFAULT \'app\'::text, p_reason text DEFAULT NULL::text)',
  // The legacy 11-argument signature is dropped so an 11-argument call cannot
  // become ambiguous once the defaulted p_metadata parameter exists.
  'DROP FUNCTION IF EXISTS __SCHEMA__.record_audit_log(text, uuid, text, text, jsonb, jsonb, uuid, text, text, text, text);\r\n' +
    'CREATE OR REPLACE FUNCTION __SCHEMA__.record_audit_log(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT \'web\'::text, p_scope_type text DEFAULT \'app\'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)',
)

edit(
  'b25 empty-diff guard',
  '  if jsonb_array_length(v_changes) = 0 then\r\n    return null;\r\n  end if;',
  '  if jsonb_array_length(v_changes) = 0\r\n' +
    "     and (p_metadata is null or p_metadata = '{}'::jsonb) then\r\n" +
    '    return null;\r\n' +
    '  end if;',
)

edit(
  'b25 insert',
  '  insert into __SCHEMA__.audit_logs (\r\n' +
    '    entity_type, entity_id, entity_label, action,\r\n' +
    '    actor_id, actor_label, source, scope_type, changes, reason\r\n' +
    '  )\r\n' +
    '  values (\r\n' +
    '    p_entity_type, p_entity_id, p_entity_label, p_action,\r\n' +
    '    v_actor_id, p_actor_label, coalesce(p_source, \'web\'),\r\n' +
    '    coalesce(p_scope_type, \'app\'), v_changes, p_reason\r\n' +
    '  )',
  '  insert into __SCHEMA__.audit_logs (\r\n' +
    '    entity_type, entity_id, entity_label, action,\r\n' +
    '    actor_id, actor_label, source, scope_type, changes, reason, metadata\r\n' +
    '  )\r\n' +
    '  values (\r\n' +
    '    p_entity_type, p_entity_id, p_entity_label, p_action,\r\n' +
    '    v_actor_id, p_actor_label, coalesce(p_source, \'web\'),\r\n' +
    '    coalesce(p_scope_type, \'app\'), v_changes, p_reason,\r\n' +
    "    coalesce(p_metadata, '{}'::jsonb)\r\n" +
    '  )',
)

// ── Edit 3: revert keeps lineage + chain ──────────────────────────────────
edit(
  'b27 quotation columns',
  'amount_in_words, custom_fields\r\n    )',
  'amount_in_words, custom_fields,\r\n        source_cps_id, conversion_chain_id\r\n    )',
)

edit(
  'b27 quotation values',
  "(p_quotation_payload->>'custom_fields')::JSONB\r\n    RETURNING *",
  "(p_quotation_payload->>'custom_fields')::JSONB,\r\n" +
    "        NULLIF(p_quotation_payload->>'source_cps_id', '')::UUID,\r\n" +
    "        NULLIF(p_quotation_payload->>'conversion_chain_id', '')::UUID\r\n" +
    '    RETURNING *',
)

edit(
  'b27 item columns',
  '            section\r\n        )',
  '            section, source_cps_id, source_cps_row_id, source_quotation_id,\r\n' +
    '            source_quotation_item_id\r\n' +
    '        )',
)

edit(
  'b27 item values',
  "            v_item->>'section'\r\n        );",
  "            v_item->>'section',\r\n" +
    "            NULLIF(v_item->>'source_cps_id', '')::UUID,\r\n" +
    "            NULLIF(v_item->>'source_cps_row_id', '')::UUID,\r\n" +
    "            NULLIF(v_item->>'source_quotation_id', '')::UUID,\r\n" +
    "            NULLIF(v_item->>'source_quotation_item_id', '')::UUID\r\n" +
    '        );',
)

// ── Assemble the migration ────────────────────────────────────────────────
const header = `-- ============================================================
-- TENANT RPCs: TRANSACTIONAL CPS LINEAGE + AUDIT METADATA
-- ============================================================
-- Phase 2.5. Regenerates public._prov_install_tenant_rpcs() so every tenant
-- schema (existing and future) installs the lineage/metadata-aware RPCs.
--
-- Generated from the authoritative body text in
-- 20260902120000_provisioning_engine_repair.sql with exactly three edits, so
-- all other tenant RPC bodies stay byte-identical:
--
--  1. save_invoice_with_items_transaction now writes source_cps_id,
--     source_cps_row_id, source_quotation_id and source_quotation_item_id in
--     the SAME insert as the invoice item rows. Lineage is therefore committed
--     by the invoice save transaction itself and no post-write compensating
--     stamp is required on the successful path. Lineage-null rows stay valid
--     (all four expressions are NULLIF-guarded).
--
--  2. record_audit_log gains p_metadata jsonb and stores it in
--     audit_logs.metadata. The legacy 11-argument signature is dropped in the
--     same statement so an 11-argument call cannot become ambiguous; with
--     p_metadata defaulted, older callers keep working. Events that carry only
--     metadata (no field diff) are no longer discarded.
--
--  3. revert_invoice_to_quotation_transaction carries source_cps_id,
--     conversion_chain_id and the four item lineage columns into the reverted
--     quotation, so a revert is not a lineage reset.
--
-- Then backfills every existing entity schema through the installer, so the
-- hosted database converges with the new definition (and any tenant that was
-- provisioned while the old installer was live is repaired).
-- ============================================================

`

const footer = `
-- ============================================================
-- BACKFILL — reinstall tenant RPCs in every existing entity schema
-- ============================================================
DO $do$
DECLARE
  v_schema record;
BEGIN
  FOR v_schema IN
    SELECT n.nspname AS schemaname
    FROM pg_namespace n
    WHERE n.nspname LIKE 'entity\\_%'
    ORDER BY n.nspname
  LOOP
    PERFORM public._prov_install_tenant_rpcs(v_schema.schemaname);
  END LOOP;
END
$do$;

NOTIFY pgrst, 'reload schema';
`

fs.writeFileSync(OUT, header + block + footer)

console.log(`\nedits applied: ${edits}`)
console.log(`written: ${path.relative(root, OUT)} (${fs.statSync(OUT).size} bytes)`)
for (const probe of [
  'source_quotation_item_id',
  'record_cps_audit_event',
  'audit_logs.metadata',
  'conversion_chain_id',
]) {
  const n = fs.readFileSync(OUT, 'utf8').split(probe).length - 1
  console.log(`probe "${probe.replace(/\r\n/g, '/')}" -> ${n}`)
}
