/* eslint-disable */
// Generates supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql
//
// Phase 3. Takes the authoritative installer body from the Phase 2.5 migration
// (20261005150000_tenant_rpc_cps_lineage_metadata.sql, itself generated from
// 20260902120000_provisioning_engine_repair.sql with three edits) and applies
// exactly two further surgical edits:
//
//   1. save_invoice_with_items_transaction gains one defaulted parameter,
//      p_cps_feedback jsonb, and calls apply_cps_item_feedback_transaction with
//      it inside the same transaction. The invoice save is therefore the
//      AUTHORITATIVE TRANSACTIONAL PATH for Phase 3 feedback: if the CPS
//      mutation or its causal audit fails, the whole invoice save rolls back.
//   2. a new apply_cps_item_feedback_transaction() re-validates feedback
//      authority and row lineage from persisted state inside the tenant schema,
//      writes only the approved CPS fields (sp, description, image_url), and
//      records the causal parent event plus the automatic-feedback event.
//
// Every other tenant RPC body stays byte-identical.
// Fails loudly if any anchor is missing or duplicated.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const SRC = path.join(root, 'supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql')
const OUT = path.join(root, 'supabase/migrations/20261005160000_tenant_rpc_cps_downstream_feedback.sql')

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

// ── Edit 1: block 1 takes the plan and applies it in-transaction ──────────
edit(
  'b1 signature gains p_cps_feedback',
  'CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT \'[]\'::jsonb, p_mode text DEFAULT \'create\'::text)',
  "CREATE OR REPLACE FUNCTION __SCHEMA__.save_invoice_with_items_transaction(p_entity_id uuid, p_invoice_payload jsonb, p_items jsonb DEFAULT '[]'::jsonb, p_mode text DEFAULT 'create'::text, p_cps_feedback jsonb DEFAULT NULL::jsonb)",
)

edit(
  'b1 in-transaction feedback call',
  '    END LOOP;\r\n\r\n    -- Return saved invoice',
  '    END LOOP;\r\n' +
    '\r\n' +
    '    -- Phase 3: controlled downstream CPS feedback. The plan was computed\r\n' +
    '    -- by the pure domain planner from real before/after row state. Applying\r\n' +
    '    -- it here keeps the invoice save and the approved CPS mutation in ONE\r\n' +
    '    -- transaction, so a feedback failure rolls the save back instead of\r\n' +
    '    -- leaving the two stores diverged. Authority and lineage are re-validated\r\n' +
    '    -- inside apply_cps_item_feedback_transaction before any row changes.\r\n' +
    '    IF p_cps_feedback IS NOT NULL THEN\r\n' +
    '        PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback);\r\n' +
    '    END IF;\r\n' +
    '\r\n' +
    '    -- Return saved invoice',
)

// ── Edit 2: append block 29 = apply_cps_item_feedback_transaction ─────────
const FEEDBACK_RPC_SQL = `
    -- 29. apply_cps_item_feedback_transaction  [Phase 3: controlled downstream]
    -- Applies approved downstream item changes to the originating CPS rows and
    -- records the causal audit pair. The authority gate and the lineage gate are
    -- re-validated from persisted state inside the tenant schema, so a stale or
    -- forged client plan can never retarget a CPS row. Only sp, description and
    -- image_url are ever written. cp is never touched.
    v_body := $b29$
CREATE OR REPLACE FUNCTION __SCHEMA__.apply_cps_item_feedback_transaction(
    p_entity_id uuid,
    p_feedback jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_source_type text;
  v_source_doc_id uuid;
  v_chain_id uuid;
  v_cps_id uuid;
  v_chain_cps_id uuid;
  v_authority_row_id uuid;
  v_authority_stage text;
  v_authority_doc uuid;
  v_match_count integer;
  v_cps_row_id uuid;
  v_found_cps_row_id uuid;
  v_cps_description text;
  v_cps_cells jsonb;
  v_new_description text;
  v_new_cells jsonb;
  v_cps_number text;
  v_src_number text;
  v_actor_id uuid;
  v_actor_label text;
  v_related jsonb;
  v_row_label text;
  v_mutation jsonb;
  v_change jsonb;
  v_apply_changes jsonb;
  v_parent_changes jsonb;
  v_feedback_changes jsonb;
  v_mutation_applied integer;
  v_applied integer := 0;
  v_skipped integer := 0;
  v_items_touched integer := 0;
  v_parent_id uuid;
  v_field text;
  v_label text;
  v_kind text;
  v_cur_value jsonb;
  v_new_value jsonb;
  v_diagnostics text[] := ARRAY[]::text[];
  v_doc_label text;
  v_summary text;
  v_detail text;
begin
  v_source_type := coalesce(p_feedback->>'sourceDocumentType', '');

  IF v_source_type NOT IN ('quotation', 'invoice') THEN
    RETURN jsonb_build_object('status', 'unsupported', 'applied', 0, 'skipped', 0);
  END IF;

  -- Permission gate. Mirrors the document save RPC.
  IF NOT public.has_entity_permission(p_entity_id, auth.uid(), v_source_type, 'edit') THEN
    RAISE EXCEPTION 'Insufficient permissions: %/edit required', v_source_type
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_chain_id := NULLIF(p_feedback->>'chainId', '')::uuid;
  v_source_doc_id := NULLIF(p_feedback->>'sourceDocumentId', '')::uuid;
  v_cps_id := NULLIF(p_feedback->>'sourceCpsId', '')::uuid;
  v_src_number := p_feedback->>'sourceDocumentNumber';
  v_actor_id := NULLIF(p_feedback->>'actorId', '')::uuid;
  v_actor_label := p_feedback->>'actorLabel';

  IF v_actor_id IS NULL THEN
    v_actor_id := auth.uid();
  END IF;

  IF v_chain_id IS NULL OR v_source_doc_id IS NULL OR v_cps_id IS NULL THEN
    RETURN jsonb_build_object('status', 'no-op', 'applied', 0, 'skipped', 0);
  END IF;

  -- AUTHORITY GATE, re-validated from persisted state. Edit recency, document
  -- status, document number and client state are never consulted.
  SELECT q.id, q.feedback_authority, q.feedback_authority_document_id, q.source_cps_id
    INTO v_authority_row_id, v_authority_stage, v_authority_doc, v_chain_cps_id
  FROM __SCHEMA__.quotations q
  WHERE q.conversion_chain_id = v_chain_id
    AND q.feedback_authority IS NOT NULL
  LIMIT 1;

  IF v_authority_row_id IS NULL
     OR v_authority_stage IS DISTINCT FROM v_source_type
     OR v_authority_doc IS DISTINCT FROM v_source_doc_id THEN
    RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
  END IF;

  -- The CPS root is re-derived from the chain owner. A stale client value can
  -- never retarget feedback to another CPS document.
  IF v_chain_cps_id IS NOT NULL THEN
    v_cps_id := v_chain_cps_id;
  END IF;

  -- The saving document must be the chain's own document. No cross-document and
  -- no cross-tenant id is accepted.
  IF v_source_type = 'quotation' THEN
    IF v_source_doc_id <> v_authority_row_id THEN
      RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
    END IF;
  ELSE
    SELECT count(*) INTO v_match_count
    FROM __SCHEMA__.invoices i
    WHERE i.id = v_source_doc_id
      AND i.source_quotation_id = v_authority_row_id
      AND i.conversion_chain_id = v_chain_id;

    IF v_match_count = 0 THEN
      RETURN jsonb_build_object('status', 'authority-mismatch', 'applied', 0, 'skipped', 0);
    END IF;
  END IF;

  SELECT s.cps_number INTO v_cps_number
  FROM __SCHEMA__.cps_sheets s
  WHERE s.id = v_cps_id;

  v_doc_label := CASE WHEN v_source_type = 'invoice' THEN 'Invoice' ELSE 'Quotation' END
    || ' ' || coalesce(v_src_number, '');
  v_related := jsonb_build_object(
    'type', v_source_type,
    'id', v_source_doc_id,
    'number', coalesce(v_src_number, '')
  );

  v_parent_changes := '[]'::jsonb;
  v_feedback_changes := '[]'::jsonb;

  FOR v_mutation IN
    SELECT value FROM jsonb_array_elements(coalesce(p_feedback->'mutations', '[]'::jsonb))
  LOOP
    v_cps_row_id := NULLIF(v_mutation->>'sourceCpsRowId', '')::uuid;
    v_row_label := coalesce(NULLIF(v_mutation->>'rowLabel', ''), 'Item');

    IF v_cps_row_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Missing CPS row reference for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    -- LINEAGE GATE. The persisted downstream row must still claim exactly this
    -- CPS ancestry. Never description, item_id, row order, price, quantity,
    -- unit, image, group or similarity.
    IF v_source_type = 'invoice' THEN
      SELECT count(*) INTO v_match_count
      FROM __SCHEMA__.invoice_items it
      WHERE it.invoice_id = v_source_doc_id
        AND it.source_cps_id = v_cps_id
        AND it.source_cps_row_id = v_cps_row_id
        AND coalesce(it.row_type, 'standard') NOT IN ('group_header', 'section');
    ELSE
      SELECT count(*) INTO v_match_count
      FROM __SCHEMA__.quotation_items it
      WHERE it.quotation_id = v_source_doc_id
        AND it.source_cps_id = v_cps_id
        AND it.source_cps_row_id = v_cps_row_id
        AND coalesce(it.row_type, 'standard') NOT IN ('group_header', 'section');
    END IF;

    IF v_match_count = 0 THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Lineage unavailable for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    IF v_match_count > 1 THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Ambiguous lineage for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    -- ORIGIN GATE. The originating CPS row must still exist in this CPS
    -- document. It is never recreated, never guessed, and never re-targeted.
    v_found_cps_row_id := NULL;
    SELECT r.id, r.description, coalesce(r.cells, '{}'::jsonb)
      INTO v_found_cps_row_id, v_cps_description, v_cps_cells
    FROM __SCHEMA__.cps_rows r
    WHERE r.id = v_cps_row_id
      AND r.cps_sheet_id = v_cps_id;

    IF v_found_cps_row_id IS NULL THEN
      v_skipped := v_skipped + 1;
      v_diagnostics := array_append(v_diagnostics, 'Originating CPS row unavailable for ' || v_row_label || '.');
      CONTINUE;
    END IF;

    v_apply_changes := '[]'::jsonb;
    v_new_description := v_cps_description;
    v_new_cells := coalesce(v_cps_cells, '{}'::jsonb);
    v_mutation_applied := 0;

    FOR v_change IN
      SELECT value FROM jsonb_array_elements(coalesce(v_mutation->'changes', '[]'::jsonb))
    LOOP
      v_field := v_change->>'field';

      -- Out-of-contract fields are never written, whatever the caller sends.
      IF v_field NOT IN ('sp', 'description', 'image_url') THEN
        CONTINUE;
      END IF;

      v_kind := coalesce(NULLIF(v_change->>'kind', ''), 'default');
      v_label := coalesce(NULLIF(v_change->>'label', ''), v_field);

      IF v_field = 'sp' THEN
        v_cur_value := to_jsonb(coalesce(NULLIF(v_new_cells->>'sp', '')::numeric, 0));
        v_new_value := to_jsonb(coalesce(NULLIF(v_change->>'new', '')::numeric, 0));
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_cells := v_new_cells || jsonb_build_object('sp', v_new_value);
      ELSIF v_field = 'description' THEN
        -- The downstream domain does not allow an empty item description, so an
        -- empty value is not a clear: it is refused.
        IF btrim(coalesce(v_change->>'new', '')) = '' THEN
          CONTINUE;
        END IF;
        v_cur_value := to_jsonb(coalesce(v_new_description, ''));
        v_new_value := to_jsonb(v_change->>'new');
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_description := v_change->>'new';
      ELSE
        v_cur_value := coalesce(
          to_jsonb(NULLIF(btrim(coalesce(v_new_cells->>'image_url', '')), '')), 'null'::jsonb);
        v_new_value := coalesce(
          to_jsonb(NULLIF(btrim(coalesce(v_change->>'new', '')), '')), 'null'::jsonb);
        IF v_cur_value = v_new_value THEN
          CONTINUE;
        END IF;
        v_new_cells := v_new_cells || jsonb_build_object('image_url', v_new_value);
      END IF;

      v_apply_changes := v_apply_changes || jsonb_build_array(jsonb_build_object(
        'field', v_field,
        'label', v_label,
        'kind', v_kind,
        'old', v_cur_value,
        'new', v_new_value
      ));
      v_mutation_applied := v_mutation_applied + 1;
    END LOOP;

    -- Field-diff idempotency: a mutation whose approved fields already hold the
    -- incoming values writes nothing and records nothing.
    IF v_mutation_applied = 0 THEN
      CONTINUE;
    END IF;

    UPDATE __SCHEMA__.cps_rows
    SET description = v_new_description,
        cells = v_new_cells
    WHERE id = v_cps_row_id
      AND cps_sheet_id = v_cps_id;

    v_applied := v_applied + v_mutation_applied;
    v_items_touched := v_items_touched + 1;

    -- Parent event: the downstream edit the user performed. Written FIRST, so
    -- the automatic consequence always has an existing causal parent.
    v_parent_changes := v_parent_changes || (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'rowId', v_cps_row_id,
        'rowLabel', v_row_label,
        'scope', 'row',
        'field', value->>'field',
        'label', value->>'label',
        'old', value->'old',
        'new', value->'new',
        'kind', coalesce(value->>'kind', 'default')
      ) ORDER BY value->>'field'), '[]'::jsonb)
      FROM jsonb_array_elements(coalesce(v_mutation->'changes', '[]'::jsonb)) AS declared(value)
      WHERE value->>'field' IN ('sp', 'description', 'image_url')
    );

    -- Feedback event: the CPS field changes actually written, with the CPS
    -- values that were really replaced.
    v_feedback_changes := v_feedback_changes || (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'rowId', v_cps_row_id,
        'rowLabel', v_row_label,
        'scope', 'row',
        'field', value->>'field',
        'label', value->>'label',
        'old', value->'old',
        'new', value->'new',
        'kind', coalesce(value->>'kind', 'default')
      ) ORDER BY value->>'field'), '[]'::jsonb)
      FROM jsonb_array_elements(v_apply_changes) AS applied(value)
    );
  END LOOP;

  IF v_applied > 0 THEN
    v_summary := CASE WHEN v_source_type = 'invoice'
      THEN 'Invoice item updated' ELSE 'Quotation item updated' END;
    v_detail := coalesce(NULLIF(v_actor_label, ''), 'A user') || ' changed '
      || v_applied::text || ' approved field' || CASE WHEN v_applied = 1 THEN '' ELSE 's' END
      || ' on ' || v_items_touched::text || ' CPS-linked item'
      || CASE WHEN v_items_touched = 1 THEN '' ELSE 's' END || '.';

    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      v_actor_id, coalesce(NULLIF(v_actor_label, ''), 'Unknown user'), 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'DOWNSTREAM_ITEM_UPDATED',
        'actorType', 'user',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', NULL,
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', v_summary,
        'detail', v_detail,
        'changes', v_parent_changes
      )
    )
    RETURNING id INTO v_parent_id;

    -- The system event stays a system event. The human actor is never falsified
    -- as the direct CPS editor; the actor identity travels in the detail line.
    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      NULL, 'Automated feedback', 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'CPS_FEEDBACK_APPLIED',
        'actorType', 'automated-feedback',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', to_jsonb(v_parent_id),
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', 'CPS updated automatically',
        'detail', 'From ' || v_doc_label
          || CASE WHEN v_actor_label IS NULL OR v_actor_label = '' THEN ''
                  ELSE ' · ' || v_actor_label END,
        'changes', v_feedback_changes
      )
    );
  END IF;

  -- An integrity anomaly is auditable. It is never retried against another row
  -- and never surfaces as a user-facing crash unless the whole transaction
  -- failed.
  IF v_skipped > 0 THEN
    INSERT INTO __SCHEMA__.audit_logs (
      entity_type, entity_id, entity_label, action,
      actor_id, actor_label, source, scope_type, changes, metadata
    ) VALUES (
      'cps_sheets', v_cps_id, v_cps_number, 'UPDATE',
      NULL, 'Automated feedback', 'web', 'app',
      '[]'::jsonb,
      jsonb_build_object(
        'event', 'FEEDBACK_SKIPPED',
        'actorType', 'system',
        'rootId', v_cps_id,
        'chainId', v_chain_id,
        'parentEventId', to_jsonb(v_parent_id),
        'sourceContext', 'downstream_feedback',
        'related', v_related,
        'summary', 'Feedback skipped',
        'detail', array_to_string(v_diagnostics, ' '),
        'changes', '[]'::jsonb
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_applied > 0 THEN 'applied' ELSE 'no-op' END,
    'applied', v_applied,
    'skipped', v_skipped,
    'diagnostics', CASE WHEN v_skipped > 0 THEN array_to_string(v_diagnostics, ' ') ELSE NULL END
  );
END;
$function$
;
$b29$;
${EXEC_LINE}
`
  .trimEnd()
  .split('\n')
  .join('\r\n')

edit(
  'b29 append (apply_cps_item_feedback_transaction)',
  EXEC_LINE + '\r\nEND;\r\n$install$;',
  EXEC_LINE + '\r\n' + FEEDBACK_RPC_SQL + '\r\nEND;\r\n$install$;',
)

// ── Assemble the migration ────────────────────────────────────────────────
const header = [
  '-- ============================================================',
  '-- TENANT RPCs: CONTROLLED DOWNSTREAM CPS FEEDBACK (PHASE 3)',
  '-- ============================================================',
  '-- Phase 3. Regenerates public._prov_install_tenant_rpcs() so every tenant',
  '-- schema (existing and future) installs the downstream-feedback RPCs.',
  '--',
  '-- Generated from the Phase 2.5 installer body in',
  '-- 20261005150000_tenant_rpc_cps_lineage_metadata.sql with exactly two edits,',
  '-- so every other tenant RPC body stays byte-identical:',
  '--',
  '--  1. save_invoice_with_items_transaction gains one defaulted parameter,',
  '--     p_cps_feedback jsonb. When the caller passes a plan, the RPC applies the',
  '--     approved CPS mutation and both causal audit events BEFORE it returns, so',
  '--     the invoice save and the CPS feedback commit as one transaction. A',
  '--     feedback failure rolls the invoice save back instead of leaving the two',
  '--     stores diverged. Callers that pass no plan keep the previous behaviour.',
  '--',
  '--  2. apply_cps_item_feedback_transaction() is added. It re-validates the',
  '--     active chain authority and the persisted row lineage inside the tenant',
  '--     schema, writes only sp, description and image_url on the originating',
  '--     cps_rows row, and records the causal pair: the downstream edit event and',
  '--     the automatic feedback event whose parentEventId points at it.',
  '--     cp is never written and no new CPS row is ever created.',
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
for (const probe of [
  'apply_cps_item_feedback_transaction',
  'p_cps_feedback jsonb DEFAULT NULL::jsonb',
  'DOWNSTREAM_ITEM_UPDATED',
  'CPS_FEEDBACK_APPLIED',
  'FEEDBACK_SKIPPED',
  "'cp'",
]) {
  console.log(`probe "${probe}" -> ${out.split(probe).length - 1}`)
}
