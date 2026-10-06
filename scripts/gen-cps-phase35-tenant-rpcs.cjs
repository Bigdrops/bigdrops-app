/* eslint-disable */
// Generates supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql
//
// Phase 3.5. Takes the Phase 3 installer body from
// 20261005160000_tenant_rpc_cps_downstream_feedback.sql (itself generated from
// 20261005150000_tenant_rpc_cps_lineage_metadata.sql with two edits) and
// applies exactly ONE further surgical edit:
//
//   a new save_quotation_with_items_transaction() is appended as block 30. It
//   is the AUTHORITATIVE Quotation save: the parent row, the exact item set, the
//   approved CPS feedback plan and the causal feedback audit commit in ONE
//   transaction. apply_cps_item_feedback_transaction is REUSED unchanged, so the
//   feedback rules have exactly one implementation shared with the Invoice save.
//
// Every other tenant RPC body stays byte-identical to Phase 3, including
// apply_cps_item_feedback_transaction and save_invoice_with_items_transaction.
// Fails loudly if any anchor is missing or duplicated.
//
// TYPE NOTE — why the explicit ::jsonb casts are not cosmetic:
//   invoices.custom_fields is TEXT, so the invoice RPC can pass
//   `payload->>'custom_fields'` straight into a text column.
//   quotations.custom_fields is JSONB, and PostgreSQL has NO assignment cast from
//   text to jsonb (verified: pg_cast has no such row, and an INSERT test fails
//   with SQLSTATE 42804). The cast must therefore be explicit and must sit on the
//   USING expression, so the parameter is inferred as jsonb.
//   quotation_items.custom_data is JSONB too, hence `(v_item->>'custom_data')::jsonb`.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const SRC = path.join(root, 'supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql')
const OUT = path.join(root, 'supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql')

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

// ── Edit 1: append block 30 = save_quotation_with_items_transaction ───────
const QUOTATION_RPC_SQL = `
    -- 30. save_quotation_with_items_transaction  [Phase 3.5: transactional parity]
    -- The AUTHORITATIVE Quotation save. The parent row, the exact item set, the
    -- approved downstream CPS feedback plan and the causal feedback audit commit
    -- in ONE transaction. If any authoritative step fails, the whole save rolls
    -- back, so the Quotation and the Cost & Pricing Sheet can never diverge on
    -- the normal path. apply_cps_item_feedback_transaction is reused unchanged:
    -- the approved-field contract has exactly one implementation, shared with the
    -- Invoice save.
    --
    -- The quotation payload is the SAME serialized payload the direct tenant
    -- write already used, and the item payload is the SAME serializer output, so
    -- no second quotation domain model and no calculation logic exists in SQL.
    v_body := $b30$
CREATE OR REPLACE FUNCTION __SCHEMA__.save_quotation_with_items_transaction(p_entity_id uuid, p_quotation_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text, p_cps_feedback jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_schema text;
  v_quotation_id uuid;
  -- jsonb, not record. A record variable holding SELECT to_jsonb(t) serializes
  -- as {"to_jsonb": {...}}, which nests the saved row one level too deep and
  -- makes result.quotation.quotation_number unreadable to the caller.
  v_row jsonb;
  v_item jsonb;
  v_count integer := 0;
begin
  v_schema := '__SCHEMA_TEXT__';

    -- Permission gate. Mirrors the invoice save RPC.
    IF p_mode = 'create' THEN
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'quotation',
            'create'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: quotation/create required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    ELSE
        IF NOT public.has_entity_permission(
            p_entity_id,
            auth.uid(),
            'quotation',
            'edit'
        ) THEN
            RAISE EXCEPTION 'Insufficient permissions: quotation/edit required'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    IF p_mode = 'create' THEN

        EXECUTE format(
            $q$
            INSERT INTO %I.quotations (
                quotation_number,
                po_number,
                quotation_title,
                client_id,
                client_name,
                project_id,
                issue_date,
                valid_until,
                status,
                notes,
                terms,
                workmanship,
                transportation,
                shipping,
                discount,
                vat,
                wht,
                subtotal,
                install_rate_total,
                total,
                amount_in_words,
                custom_fields
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
            RETURNING id
            $q$,
            v_schema
        )
        INTO v_quotation_id
        USING
            p_quotation_payload->>'quotation_number',
            p_quotation_payload->>'po_number',
            p_quotation_payload->>'quotation_title',
            NULLIF(p_quotation_payload->>'client_id', '')::uuid,
            p_quotation_payload->>'client_name',
            NULLIF(p_quotation_payload->>'project_id', '')::uuid,
            (p_quotation_payload->>'issue_date')::date,
            -- quotations.valid_until is DATE. text has no assignment cast to
            -- date, so the cast must be explicit on the USING expression.
            (p_quotation_payload->>'valid_until')::date,
            COALESCE(p_quotation_payload->>'status', 'open'),
            p_quotation_payload->>'notes',
            p_quotation_payload->>'terms',
            COALESCE((p_quotation_payload->>'workmanship')::numeric, 0),
            COALESCE((p_quotation_payload->>'transportation')::numeric, 0),
            COALESCE((p_quotation_payload->>'shipping')::numeric, 0),
            COALESCE((p_quotation_payload->>'discount')::numeric, 0),
            COALESCE((p_quotation_payload->>'vat')::numeric, 0),
            COALESCE((p_quotation_payload->>'wht')::numeric, 0),
            COALESCE((p_quotation_payload->>'subtotal')::numeric, 0),
            COALESCE((p_quotation_payload->>'install_rate_total')::numeric, 0),
            COALESCE((p_quotation_payload->>'total')::numeric, 0),
            p_quotation_payload->>'amount_in_words',
            -- quotations.custom_fields is jsonb and text has no assignment cast
            -- to jsonb, so the cast is explicit and lives on this expression.
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;

    ELSE

        EXECUTE format(
            $q$
            UPDATE %I.quotations
            SET
                po_number = $2,
                quotation_title = $3,
                client_name = $4,
                project_id = NULLIF($5, '')::uuid,
                issue_date = ($6)::date,
                valid_until = ($7)::date,
                status = $8,
                notes = $9,
                terms = $10,
                workmanship = COALESCE($11, 0),
                transportation = COALESCE($12, 0),
                shipping = COALESCE($13, 0),
                discount = COALESCE($14, 0),
                vat = COALESCE($15, 0),
                wht = COALESCE($16, 0),
                subtotal = COALESCE($17, 0),
                install_rate_total = COALESCE($18, 0),
                total = COALESCE($19, 0),
                amount_in_words = $20,
                custom_fields = $21
            WHERE id = $1
            $q$,
            v_schema
        )
        USING
            (p_quotation_payload->>'id')::uuid,
            p_quotation_payload->>'po_number',
            p_quotation_payload->>'quotation_title',
            p_quotation_payload->>'client_name',
            COALESCE(p_quotation_payload->>'project_id', ''),
            p_quotation_payload->>'issue_date',
            p_quotation_payload->>'valid_until',
            COALESCE(p_quotation_payload->>'status', 'open'),
            p_quotation_payload->>'notes',
            p_quotation_payload->>'terms',
            (p_quotation_payload->>'workmanship')::numeric,
            (p_quotation_payload->>'transportation')::numeric,
            (p_quotation_payload->>'shipping')::numeric,
            (p_quotation_payload->>'discount')::numeric,
            (p_quotation_payload->>'vat')::numeric,
            (p_quotation_payload->>'wht')::numeric,
            (p_quotation_payload->>'subtotal')::numeric,
            (p_quotation_payload->>'install_rate_total')::numeric,
            (p_quotation_payload->>'total')::numeric,
            p_quotation_payload->>'amount_in_words',
            COALESCE(NULLIF(p_quotation_payload->>'custom_fields', ''), '{}')::jsonb;

        v_quotation_id := (p_quotation_payload->>'id')::uuid;

        -- Replace existing items. The item set is authoritative: it replaces
        -- whatever the quotation had, exactly as the client-side save did.
        EXECUTE format(
            'DELETE FROM %I.quotation_items WHERE quotation_id = %L', v_schema,
            v_quotation_id
        );

    END IF;

    -- Insert items
    FOR v_item IN
        SELECT *
        FROM jsonb_array_elements(p_items)
    LOOP

        EXECUTE format(
            $q$
            INSERT INTO %I.quotation_items (
                quotation_id,
                description,
                sub_description,
                make,
                quantity,
                unit,
                unit_price,
                amount,
                vat_rate,
                install_rate,
                install_rate_taxable,
                show_install_rate,
                sort_order,
                formula,
                row_type,
                group_name,
                image_url,
                custom_data,
                discount_rate,
                install_rate_override,
                group_id,
                item_id,
                source_cps_id,
                source_cps_row_id,
                source_quotation_id,
                source_quotation_item_id
            )
            VALUES (
                %L,
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25
            )
            $q$,
            v_schema,
            v_quotation_id
        )
        USING
            v_item->>'description',
            v_item->>'sub_description',
            v_item->>'make',
            (v_item->>'quantity')::numeric,
            v_item->>'unit',
            (v_item->>'unit_price')::numeric,
            (v_item->>'amount')::numeric,
            (v_item->>'vat_rate')::numeric,
            (v_item->>'install_rate')::numeric,
            (v_item->>'install_rate_taxable')::boolean,
            (v_item->>'show_install_rate')::boolean,
            (v_item->>'sort_order')::integer,
            v_item->>'formula',
            v_item->>'row_type',
            v_item->>'group_name',
            v_item->>'image_url',
            (v_item->>'custom_data')::jsonb,
            (v_item->>'discount_rate')::numeric,
            COALESCE((v_item->>'install_rate_override')::boolean, false),
            v_item->>'group_id',
            NULLIF(v_item->>'item_id', '')::uuid,
            NULLIF(v_item->>'source_cps_id', '')::uuid,
            NULLIF(v_item->>'source_cps_row_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_id', '')::uuid,
            NULLIF(v_item->>'source_quotation_item_id', '')::uuid;

        v_count := v_count + 1;

    END LOOP;

    -- Phase 3.5: the approved downstream CPS feedback plan commits INSIDE this
    -- transaction, so the Quotation save, its items, the CPS mutation and both
    -- causal audit events are one unit of work. Authority, lineage and tenant
    -- permission are re-validated inside apply_cps_item_feedback_transaction
    -- before any row changes, so a stale or forged client plan can never
    -- retarget a CPS row. A feedback failure rolls the whole Quotation back.
    IF p_cps_feedback IS NOT NULL THEN
        PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);
    END IF;

    -- Return saved quotation
    EXECUTE format(
        'SELECT to_jsonb(t) FROM %I.quotations t WHERE t.id = %L', v_schema,
        v_quotation_id
    )
    INTO v_row;

    RETURN jsonb_build_object(
        'id', v_quotation_id,
        'quotation', v_row,
        'items_saved', v_count
    );

END;
$function$
;
$b30$;
${EXEC_LINE}
`
  .trimEnd()
  .split('\n')
  .join('\r\n')

edit(
  'b30 append (save_quotation_with_items_transaction)',
  EXEC_LINE + '\r\nEND;\r\n$install$;',
  EXEC_LINE + '\r\n' + QUOTATION_RPC_SQL + '\r\nEND;\r\n$install$;',
)

// ── Assemble the migration ────────────────────────────────────────────────
const header = [
  '-- ============================================================',
  '-- TENANT RPCs: TRANSACTIONAL QUOTATION FEEDBACK PARITY (PHASE 3.5)',
  '-- ============================================================',
  '-- Phase 3.5. Regenerates public._prov_install_tenant_rpcs() so every tenant',
  '-- schema (existing and future) installs the composite Quotation save RPC.',
  '--',
  '-- Generated from the Phase 3 installer body in',
  '-- 20261005160000_tenant_rpc_cps_downstream_feedback.sql with exactly one',
  '-- edit, so every other tenant RPC body stays byte-identical:',
  '--',
  '--  * save_quotation_with_items_transaction() is added as block 30. It is the',
  '--    AUTHORITATIVE Quotation save. In ONE transaction it persists the',
  '--    Quotation parent, replaces the exact item set, applies the approved',
  '--    downstream CPS feedback plan through the SHARED',
  '--    apply_cps_item_feedback_transaction() helper, and returns the saved',
  '--    quotation. If any authoritative step fails the whole save rolls back.',
  '--',
  '--    Before Phase 3.5 the Quotation save and the CPS feedback were two',
  '--    transactions: a process death between them left the Quotation saved and',
  '--    the CPS stale. That window is now closed on the normal path.',
  '--',
  '--    apply_cps_item_feedback_transaction() and',
  '--    save_invoice_with_items_transaction() are NOT modified, so the Invoice',
  '--    transactional path and the approved-field contract are unchanged.',
  '--',
  '--    quotations.custom_fields is jsonb, unlike invoices.custom_fields which is',
  '--    text. PostgreSQL has no text -> jsonb assignment cast (pg_cast has no such',
  '--    row; an INSERT fails with 42804), so the cast is explicit in this RPC.',
  '--',
  '-- Then backfills every provisioned entity schema through the installer, so the',
  '-- hosted database converges and any tenant provisioned while the previous',
  '-- installer was live is repaired. Schemas missing the tenant tables are',
  '-- skipped: installing RPCs whose RETURN types live in absent tables would',
  '-- abort the migration.',
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

// Contract probes. Every RPC from Phase 3 must still be present exactly once,
// and the new one must be installed.
const mustAppearOnce = [
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_quotation_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.apply_cps_item_feedback_transaction(',
  "has_entity_permission(\r\n            p_entity_id,\r\n            auth.uid(),\r\n            'quotation',\r\n            'create'",
  "has_entity_permission(\r\n            p_entity_id,\r\n            auth.uid(),\r\n            'quotation',\r\n            'edit'",
  "has_entity_permission(\r\n            p_entity_id,\r\n            auth.uid(),\r\n            'invoice',\r\n            'create'",
  'DOWNSTREAM_ITEM_UPDATED',
  'CPS_FEEDBACK_APPLIED',
  'FEEDBACK_SKIPPED',
]
const mustAppearTwice = [
  // Once from the Invoice save, once from the Quotation save: the feedback
  // helper is called from both transactions and has one implementation.
  'PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);',
  'p_cps_feedback jsonb DEFAULT NULL::jsonb',
  // Once on the create expression, once on the update expression.
  'COALESCE(NULLIF(p_quotation_payload',
  // Once in the invoice item insert, once in the quotation item insert.
  "(v_item->>'custom_data')::jsonb",
]
for (const [text, expected] of mustAppearOnce.map((p) => [p, 1]).concat(mustAppearTwice.map((p) => [p, 2]))) {
  const count = out.split(text).length - 1
  console.log(`probe x${expected}  "${text.slice(0, 52)}" -> ${count}`)
  if (count !== expected) throw new Error(`CONTRACT PROBE FAILED (want ${expected}, got ${count}): ${text}`)
}

// The forbidden extension: feedback must never write a cost price.
if (out.includes("'cp'")) throw new Error("CONTRACT PROBE FAILED: 'cp' must never appear")
console.log("probe absent \"'cp'\" -> ok")

// The block ordering: the new RPC is installed after the helper it reuses.
const helperAt = out.indexOf('__SCHEMA__.apply_cps_item_feedback_transaction(')
const quotationAt = out.indexOf('__SCHEMA__.save_quotation_with_items_transaction(')
if (!(helperAt > 0 && quotationAt > helperAt)) {
  throw new Error('CONTRACT PROBE FAILED: the helper must be installed before the Quotation RPC')
}
console.log('probe order  helper before quotation RPC -> ok')
