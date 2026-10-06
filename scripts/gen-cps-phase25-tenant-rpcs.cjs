/* eslint-disable */
// Generates supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql
//
// Takes the authoritative _prov_install_tenant_rpcs() body text from
// 20260902120000_provisioning_engine_repair.sql and applies exactly three
// surgical edits, then re-emits the whole installer so future tenants inherit
// the lineage/metadata-aware tenant RPCs:
//
//   1. save_invoice_with_items_transaction writes the four Phase 2 lineage
//      columns in the same INSERT as the invoice items, so lineage commits with
//      the invoice save transaction and no compensating stamp is needed.
//   2. a new record_cps_audit_event() writes the structured CPS payload into
//      audit_logs.metadata. record_audit_log() is deliberately NOT modified:
//      several tenant functions depend on its exact 11-argument signature, so a
//      changed signature would either be rejected by DROP or make their calls
//      ambiguous as an overload with a defaulted parameter.
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

const EXEC_LINE =
  "    EXECUTE replace(replace(v_body, '__SCHEMA_TEXT__', p_schema_name), '__SCHEMA__', v_schema_ident);"

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

// ── Edit 2: add the dedicated CPS audit writer ────────────────────────────
// The quoted body below is intentionally plain SQL text (no JS escapes inside
// the dollar-quoted section) so the generated file stays byte-stable.
const CPS_AUDIT_RPC = [
  '',
  '    -- 28. record_cps_audit_event  [Phase 2.5: structured CPS payload]',
  '    -- The CPS payload now lives in audit_logs.metadata. New CPS events do',
  "    -- not hide it inside `changes` under the reserved key '_cps'; readers",
  '    -- fall back to that legacy location only for older rows.',
  '    v_body := $b28$',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.record_cps_audit_event(',
  '    p_entity_id uuid,',
  '    p_entity_label text,',
  '    p_action text,',
  '    p_metadata jsonb,',
  '    p_actor_id uuid DEFAULT NULL::uuid,',
  '    p_actor_label text DEFAULT NULL::text,',
  "    p_source text DEFAULT 'web'::text,",
  "    p_scope_type text DEFAULT 'app'::text",
  ')',
  ' RETURNS __SCHEMA__.audit_logs',
  ' LANGUAGE plpgsql',
  ' SECURITY DEFINER',
  " SET search_path TO 'public'",
  'AS $function$',
  'declare',
  '  v_actor_id uuid;',
  '  v_row __SCHEMA__.audit_logs;',
  'begin',
  '  v_actor_id := coalesce(p_actor_id, auth.uid());',
  '',
  '  -- A CPS event is meaningful through its structured payload: unlike',
  '  -- record_audit_log, an empty metadata object is the only reason to skip.',
  "  if p_metadata is null or p_metadata = '{}'::jsonb then",
  '    return null;',
  '  end if;',
  '',
  '  insert into __SCHEMA__.audit_logs (',
  '    entity_type, entity_id, entity_label, action,',
  '    actor_id, actor_label, source, scope_type, changes, metadata',
  '  )',
  '  values (',
  "    'cps_sheets', p_entity_id, p_entity_label, p_action,",
  "    v_actor_id, p_actor_label, coalesce(p_source, 'web'),",
  "    coalesce(p_scope_type, 'app'), '[]'::jsonb, p_metadata",
  '  )',
  '  returning * into v_row;',
  '',
  '  return v_row;',
  'end;',
  '$function$',
  ';',
  '$b28$;',
  EXEC_LINE,
  '',
].join('\r\n')

edit(
  'b28 append (record_cps_audit_event)',
  EXEC_LINE + '\r\nEND;\r\n$install$;',
  EXEC_LINE + '\r\n' + CPS_AUDIT_RPC + 'END;\r\n$install$;',
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
const header = [
  '-- ============================================================',
  '-- TENANT RPCs: TRANSACTIONAL CPS LINEAGE + AUDIT METADATA',
  '-- ============================================================',
  '-- Phase 2.5. Regenerates public._prov_install_tenant_rpcs() so every tenant',
  '-- schema (existing and future) installs the lineage/metadata-aware RPCs.',
  '--',
  '-- Generated from the authoritative body text in',
  '-- 20260902120000_provisioning_engine_repair.sql with exactly three edits, so',
  '-- every other tenant RPC body stays byte-identical:',
  '--',
  '--  1. save_invoice_with_items_transaction now writes source_cps_id,',
  '--     source_cps_row_id, source_quotation_id and source_quotation_item_id in',
  '--     the SAME insert as the invoice item rows. Lineage is therefore',
  '--     committed by the invoice save transaction itself, so the successful',
  '--     path needs no post-write compensating stamp. Lineage-null rows stay',
  '--     valid (all four expressions are NULLIF-guarded).',
  '--',
  '--  2. record_cps_audit_event() is added: a dedicated CPS audit writer that',
  '--     stores the structured CPS payload in audit_logs.metadata. New CPS',
  '--     events therefore no longer hide their payload inside',
  '--     audit_logs.changes under the reserved key _cps. record_audit_log() is',
  '--     deliberately NOT modified: several tenant functions depend on its exact',
  '--     11-argument signature, so a changed signature would either be rejected',
  '--     (DROP ... would fail on those dependents) or make their calls',
  '--     ambiguous (an overload with a defaulted parameter).',
  '--',
  '--  3. revert_invoice_to_quotation_transaction carries source_cps_id,',
  '--     conversion_chain_id and the four item lineage columns into the',
  '--     reverted quotation, so a revert is not a lineage reset.',
  '--',
  '-- Then backfills every fully provisioned entity schema through the',
  '-- installer, so the hosted database converges and any tenant provisioned',
  '-- while the old installer was live is repaired. Schemas missing the tenant',
  '-- tables (a failed or in-progress provisioning) are skipped: installing',
  '-- RPCs whose RETURN types live in absent tables would abort the migration.',
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
  '    WHERE n.nspname LIKE \'entity\\_%\'',
  '      -- Only fully provisioned tenants: the installer creates functions',
  '      -- whose RETURN types are tenant tables, so a schema that is missing',
  '      -- them (a failed or in-progress provisioning) is skipped.',
  "      AND to_regclass(format('%I.activity_events', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.audit_logs', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.invoices', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.invoice_items', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.quotations', n.nspname)) IS NOT NULL",
  "      AND to_regclass(format('%I.quotation_items', n.nspname)) IS NOT NULL",
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
for (const probe of [
  'source_quotation_item_id',
  'record_cps_audit_event',
  'p_metadata jsonb,',
  'conversion_chain_id',
  "changes, metadata",
]) {
  console.log(`probe "${probe}" -> ${out.split(probe).length - 1}`)
}
