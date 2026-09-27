-- ============================================================
-- ITEM LIBRARY TIER C STAGE 2B AUDIT TRAIL CORRECTION
-- ============================================================
-- Reinstalls the Stage 2B reconciliation objects without tenant
-- activity_events writes.
--
-- Tenant activity_events restricts entity_type to document workflows
-- (invoice, quotation, project, receipt, waybill, csr, rfq, boq).
-- The first Stage 2B installer wrote item-scoped audit rows there, so
-- every keep/link/create call raised check-constraint error 23514.
--
-- Provenance stays complete: the decision, pair, and rejection tables
-- record actor, timestamp, reason, snapshots, workflow, and context.
-- This reinstall uses CREATE OR REPLACE and IF NOT EXISTS throughout,
-- so existing decisions, pairs, rejections, and catalog data survive.
--
CREATE OR REPLACE FUNCTION public._prov_install_item_library_reconciliation(
    p_schema_name text,
    p_entity_id uuid,
    p_install_functions boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $install$
DECLARE
    v_schema_ident text;
    v_body text;
BEGIN
    v_schema_ident := quote_ident(p_schema_name);

    v_body := $tables$
CREATE TABLE IF NOT EXISTS __SCHEMA__.item_reviewed_separate_pairs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_a_id uuid NOT NULL,
    item_b_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active',
    reason text,
    source_workflow text NOT NULL DEFAULT 'cleanup_hub',
    source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
    item_a_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    item_b_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_by uuid,
    revoked_at timestamp with time zone,
    revoked_reason text,
    superseded_by_merge_log_id uuid,
    CONSTRAINT item_reviewed_separate_pairs_pkey PRIMARY KEY (id),
    CONSTRAINT item_reviewed_separate_pairs_distinct_check CHECK (item_a_id <> item_b_id),
    CONSTRAINT item_reviewed_separate_pairs_order_check CHECK (item_a_id::text < item_b_id::text),
    CONSTRAINT item_reviewed_separate_pairs_status_check CHECK (status IN ('active', 'revoked', 'stale')),
    CONSTRAINT item_reviewed_separate_pairs_item_a_fkey FOREIGN KEY (item_a_id) REFERENCES __SCHEMA__.item_catalog(id),
    CONSTRAINT item_reviewed_separate_pairs_item_b_fkey FOREIGN KEY (item_b_id) REFERENCES __SCHEMA__.item_catalog(id),
    CONSTRAINT item_reviewed_separate_pairs_merge_log_fkey FOREIGN KEY (superseded_by_merge_log_id) REFERENCES __SCHEMA__.item_merge_log(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_reviewed_separate_pairs_active_pair
    ON __SCHEMA__.item_reviewed_separate_pairs (item_a_id, item_b_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_item_reviewed_separate_pairs_item_a
    ON __SCHEMA__.item_reviewed_separate_pairs (item_a_id);
CREATE INDEX IF NOT EXISTS idx_item_reviewed_separate_pairs_item_b
    ON __SCHEMA__.item_reviewed_separate_pairs (item_b_id);
CREATE INDEX IF NOT EXISTS idx_item_reviewed_separate_pairs_status
    ON __SCHEMA__.item_reviewed_separate_pairs (status);

CREATE TABLE IF NOT EXISTS __SCHEMA__.historical_review_candidate_rejections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    normalized_description text NOT NULL,
    case_membership_hash text NOT NULL,
    candidate_item_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'active',
    reason text,
    source_workflow text NOT NULL DEFAULT 'historical_review',
    source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
    case_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    candidate_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_by uuid,
    revoked_at timestamp with time zone,
    revoked_reason text,
    CONSTRAINT historical_review_candidate_rejections_pkey PRIMARY KEY (id),
    CONSTRAINT historical_review_candidate_rejections_status_check CHECK (status IN ('active', 'revoked', 'stale')),
    CONSTRAINT historical_review_candidate_rejections_candidate_fkey FOREIGN KEY (candidate_item_id) REFERENCES __SCHEMA__.item_catalog(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_historical_review_candidate_rejections_active
    ON __SCHEMA__.historical_review_candidate_rejections (normalized_description, case_membership_hash, candidate_item_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_historical_review_candidate_rejections_case
    ON __SCHEMA__.historical_review_candidate_rejections (normalized_description, case_membership_hash);
CREATE INDEX IF NOT EXISTS idx_historical_review_candidate_rejections_candidate
    ON __SCHEMA__.historical_review_candidate_rejections (candidate_item_id);
CREATE INDEX IF NOT EXISTS idx_historical_review_candidate_rejections_status
    ON __SCHEMA__.historical_review_candidate_rejections (status);

CREATE TABLE IF NOT EXISTS __SCHEMA__.item_historical_reconciliation_decisions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    decision_type text NOT NULL,
    normalized_description text NOT NULL,
    case_membership_hash text NOT NULL,
    target_item_id uuid,
    created_item_id uuid,
    status text NOT NULL DEFAULT 'applied',
    reason text,
    source_workflow text NOT NULL DEFAULT 'historical_review',
    source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
    case_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_historical_reconciliation_decisions_pkey PRIMARY KEY (id),
    CONSTRAINT item_historical_reconciliation_decisions_type_check CHECK (decision_type IN ('link_existing', 'create_separate_item')),
    CONSTRAINT item_historical_reconciliation_decisions_status_check CHECK (status IN ('applied', 'stale', 'conflict', 'failed')),
    CONSTRAINT item_historical_reconciliation_decisions_target_fkey FOREIGN KEY (target_item_id) REFERENCES __SCHEMA__.item_catalog(id),
    CONSTRAINT item_historical_reconciliation_decisions_created_fkey FOREIGN KEY (created_item_id) REFERENCES __SCHEMA__.item_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_item_historical_reconciliation_decisions_case
    ON __SCHEMA__.item_historical_reconciliation_decisions (normalized_description, case_membership_hash);
CREATE INDEX IF NOT EXISTS idx_item_historical_reconciliation_decisions_target
    ON __SCHEMA__.item_historical_reconciliation_decisions (target_item_id);
CREATE INDEX IF NOT EXISTS idx_item_historical_reconciliation_decisions_created
    ON __SCHEMA__.item_historical_reconciliation_decisions (created_item_id);

CREATE TABLE IF NOT EXISTS __SCHEMA__.item_historical_reconciliation_rows (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    decision_id uuid NOT NULL,
    source_table text NOT NULL,
    source_row_id uuid NOT NULL,
    previous_item_id uuid,
    new_item_id uuid,
    normalized_description text NOT NULL,
    row_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT item_historical_reconciliation_rows_pkey PRIMARY KEY (id),
    CONSTRAINT item_historical_reconciliation_rows_source_check CHECK (source_table IN ('invoice_items', 'quotation_items')),
    CONSTRAINT item_historical_reconciliation_rows_decision_fkey FOREIGN KEY (decision_id) REFERENCES __SCHEMA__.item_historical_reconciliation_decisions(id),
    CONSTRAINT item_historical_reconciliation_rows_previous_fkey FOREIGN KEY (previous_item_id) REFERENCES __SCHEMA__.item_catalog(id),
    CONSTRAINT item_historical_reconciliation_rows_new_fkey FOREIGN KEY (new_item_id) REFERENCES __SCHEMA__.item_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_item_historical_reconciliation_rows_decision
    ON __SCHEMA__.item_historical_reconciliation_rows (decision_id);
CREATE INDEX IF NOT EXISTS idx_item_historical_reconciliation_rows_source
    ON __SCHEMA__.item_historical_reconciliation_rows (source_table, source_row_id);
$tables$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    -- ponytail: tenant_master_template holds tables only. Tenant functions
    -- live in entity schemas and are installed per schema at provision time.
    IF NOT coalesce(p_install_functions, true) THEN
        RETURN;
    END IF;

    v_body := $triggers$
DROP TRIGGER IF EXISTS trg_item_reviewed_separate_pairs_set_updated_at ON __SCHEMA__.item_reviewed_separate_pairs;
CREATE TRIGGER trg_item_reviewed_separate_pairs_set_updated_at
BEFORE UPDATE ON __SCHEMA__.item_reviewed_separate_pairs
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_historical_review_candidate_rejections_set_updated_at ON __SCHEMA__.historical_review_candidate_rejections;
CREATE TRIGGER trg_historical_review_candidate_rejections_set_updated_at
BEFORE UPDATE ON __SCHEMA__.historical_review_candidate_rejections
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();
$triggers$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    v_body := $hash$
CREATE OR REPLACE FUNCTION __SCHEMA__.compute_historical_review_case_hash(
    p_normalized_description text
)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  WITH requested AS (
    SELECT __SCHEMA__.normalize_item_text(coalesce(p_normalized_description, '')) AS normalized_description
  ),
  eligible AS (
    SELECT 'invoice_items'::text AS source_table, id
    FROM __SCHEMA__.invoice_items, requested
    WHERE item_id IS NULL
      AND coalesce(row_type, 'standard') = 'standard'
      AND __SCHEMA__.normalize_item_text(description) = requested.normalized_description
      AND requested.normalized_description <> ''
    UNION ALL
    SELECT 'quotation_items'::text AS source_table, id
    FROM __SCHEMA__.quotation_items, requested
    WHERE item_id IS NULL
      AND coalesce(row_type, 'standard') = 'standard'
      AND __SCHEMA__.normalize_item_text(description) = requested.normalized_description
      AND requested.normalized_description <> ''
  )
  -- ponytail: ORDER BY id (uuid memcmp) matches the client code-unit
  -- sort and the array_agg(id ORDER BY id) membership checks below.
  -- ORDER BY id::text would use locale collation and could disagree.
  SELECT 'hr-v1-' || coalesce(string_agg(eligible.source_table || ':' || eligible.id::text, '|' ORDER BY eligible.source_table, eligible.id), '')
    FROM eligible;
$function$;
$hash$;
    EXECUTE replace(v_body, '__SCHEMA__', v_schema_ident);

    v_body := $keep_pair$
CREATE OR REPLACE FUNCTION __SCHEMA__.keep_item_catalog_entries_separate(
    p_item_a_id uuid,
    p_item_b_id uuid,
    p_reason text DEFAULT NULL,
    p_source_workflow text DEFAULT 'cleanup_hub',
    p_source_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_left_id uuid;
    v_right_id uuid;
    v_existing __SCHEMA__.item_reviewed_separate_pairs%rowtype;
    v_left_snapshot jsonb;
    v_right_snapshot jsonb;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF p_item_a_id IS NULL OR p_item_b_id IS NULL OR p_item_a_id = p_item_b_id THEN
        RETURN jsonb_build_object('status', 'failed', 'reason', 'self_pair_or_missing_item');
    END IF;

    IF p_item_a_id::text < p_item_b_id::text THEN
        v_left_id := p_item_a_id;
        v_right_id := p_item_b_id;
    ELSE
        v_left_id := p_item_b_id;
        v_right_id := p_item_a_id;
    END IF;

    SELECT jsonb_build_object('item_id', id, 'name', name, 'normalized_name', normalized_name, 'is_active', is_active)
      INTO v_left_snapshot
      FROM __SCHEMA__.item_catalog
     WHERE id = v_left_id AND is_active = true
     FOR UPDATE;

    SELECT jsonb_build_object('item_id', id, 'name', name, 'normalized_name', normalized_name, 'is_active', is_active)
      INTO v_right_snapshot
      FROM __SCHEMA__.item_catalog
     WHERE id = v_right_id AND is_active = true
     FOR UPDATE;

    IF v_left_snapshot IS NULL OR v_right_snapshot IS NULL THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'item_not_active');
    END IF;

    SELECT * INTO v_existing
      FROM __SCHEMA__.item_reviewed_separate_pairs
     WHERE item_a_id = v_left_id
       AND item_b_id = v_right_id
       AND status = 'active'
     LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'applied',
            'reused', true,
            'decision_id', v_existing.id,
            'item_a_id', v_left_id,
            'item_b_id', v_right_id
        );
    END IF;

    -- ponytail: concurrent duplicate submissions hit the active-pair
    -- unique index. Return the existing decision instead of raising.
    BEGIN
        INSERT INTO __SCHEMA__.item_reviewed_separate_pairs (
            item_a_id,
            item_b_id,
            reason,
            source_workflow,
            source_context,
            item_a_snapshot,
            item_b_snapshot,
            created_by
        )
        VALUES (
            v_left_id,
            v_right_id,
            nullif(btrim(coalesce(p_reason, '')), ''),
            coalesce(nullif(btrim(p_source_workflow), ''), 'cleanup_hub'),
            coalesce(p_source_context, '{}'::jsonb),
            v_left_snapshot,
            v_right_snapshot,
            auth.uid()
        )
        RETURNING * INTO v_existing;
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_existing
          FROM __SCHEMA__.item_reviewed_separate_pairs
         WHERE item_a_id = v_left_id
           AND item_b_id = v_right_id
           AND status = 'active'
         LIMIT 1;

        IF v_existing.id IS NULL THEN
            RAISE;
        END IF;

        RETURN jsonb_build_object(
            'status', 'applied',
            'reused', true,
            'decision_id', v_existing.id,
            'item_a_id', v_left_id,
            'item_b_id', v_right_id
        );
    END;

    -- ponytail: no activity_events write. Tenant activity_events restricts
    -- entity_type to document workflows. The pair row is the audit record:
    -- actor, timestamp, reason, snapshots, workflow, and context.
    RETURN jsonb_build_object(
        'status', 'applied',
        'reused', false,
        'decision_id', v_existing.id,
        'item_a_id', v_left_id,
        'item_b_id', v_right_id
    );
END;
$function$;
$keep_pair$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $revoke_pair$
CREATE OR REPLACE FUNCTION __SCHEMA__.revoke_item_reviewed_separate_pair(
    p_pair_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_pair __SCHEMA__.item_reviewed_separate_pairs%rowtype;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_pair
      FROM __SCHEMA__.item_reviewed_separate_pairs
     WHERE id = p_pair_id
     FOR UPDATE;

    IF v_pair.id IS NULL THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'decision_not_found');
    END IF;

    IF v_pair.status <> 'active' THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'decision_not_active', 'decision_id', v_pair.id);
    END IF;

    UPDATE __SCHEMA__.item_reviewed_separate_pairs
       SET status = 'revoked',
           revoked_by = auth.uid(),
           revoked_at = timezone('utc'::text, now()),
           revoked_reason = nullif(btrim(coalesce(p_reason, '')), '')
     WHERE id = p_pair_id;

    -- ponytail: no activity_events write (entity_type is document-scoped).
    -- The revoked pair row carries actor, timestamp, and reason.
    RETURN jsonb_build_object('status', 'applied', 'decision_id', p_pair_id);
END;
$function$;
$revoke_pair$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $keep_case$
CREATE OR REPLACE FUNCTION __SCHEMA__.keep_historical_review_case_candidate_separate(
    p_normalized_description text,
    p_case_membership_hash text,
    p_candidate_item_id uuid,
    p_invoice_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_quotation_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_reason text DEFAULT NULL,
    p_source_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_normalized text;
    v_current_hash text;
    v_current_invoice_ids uuid[];
    v_current_quotation_ids uuid[];
    v_submitted_invoice_ids uuid[];
    v_submitted_quotation_ids uuid[];
    v_candidate_snapshot jsonb;
    v_rejection __SCHEMA__.historical_review_candidate_rejections%rowtype;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_normalized := __SCHEMA__.normalize_item_text(p_normalized_description);
    IF v_normalized = '' THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'empty_normalized_description');
    END IF;

    v_current_hash := __SCHEMA__.compute_historical_review_case_hash(v_normalized);

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_invoice_ids
      FROM __SCHEMA__.invoice_items
     WHERE item_id IS NULL
       AND coalesce(row_type, 'standard') = 'standard'
       AND __SCHEMA__.normalize_item_text(description) = v_normalized;

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_quotation_ids
      FROM __SCHEMA__.quotation_items
     WHERE item_id IS NULL
       AND coalesce(row_type, 'standard') = 'standard'
       AND __SCHEMA__.normalize_item_text(description) = v_normalized;

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_invoice_ids
      FROM unnest(coalesce(p_invoice_row_ids, '{}'::uuid[])) AS sub(value);

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_quotation_ids
      FROM unnest(coalesce(p_quotation_row_ids, '{}'::uuid[])) AS sub(value);

    IF v_current_hash <> p_case_membership_hash
       OR v_current_invoice_ids <> v_submitted_invoice_ids
       OR v_current_quotation_ids <> v_submitted_quotation_ids THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'case_membership_changed', 'current_hash', v_current_hash);
    END IF;

    SELECT jsonb_build_object('item_id', id, 'name', name, 'normalized_name', normalized_name, 'is_active', is_active)
      INTO v_candidate_snapshot
      FROM __SCHEMA__.item_catalog
     WHERE id = p_candidate_item_id AND is_active = true
     FOR UPDATE;

    IF v_candidate_snapshot IS NULL THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'candidate_not_active');
    END IF;

    UPDATE __SCHEMA__.historical_review_candidate_rejections
       SET status = 'stale',
           revoked_by = auth.uid(),
           revoked_at = timezone('utc'::text, now()),
           revoked_reason = 'Historical review case membership changed.'
     WHERE normalized_description = v_normalized
       AND candidate_item_id = p_candidate_item_id
       AND case_membership_hash <> v_current_hash
       AND status = 'active';

    SELECT * INTO v_rejection
      FROM __SCHEMA__.historical_review_candidate_rejections
     WHERE normalized_description = v_normalized
       AND case_membership_hash = v_current_hash
       AND candidate_item_id = p_candidate_item_id
       AND status = 'active'
     LIMIT 1;

    IF v_rejection.id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'applied', 'reused', true, 'decision_id', v_rejection.id);
    END IF;

    -- ponytail: concurrent duplicate submissions hit the active-rejection
    -- unique index. Return the existing decision instead of raising.
    BEGIN
        INSERT INTO __SCHEMA__.historical_review_candidate_rejections (
            normalized_description,
            case_membership_hash,
            candidate_item_id,
            reason,
            source_workflow,
            source_context,
            case_snapshot,
            candidate_snapshot,
            created_by
        )
        VALUES (
            v_normalized,
            v_current_hash,
            p_candidate_item_id,
            nullif(btrim(coalesce(p_reason, '')), ''),
            'historical_review',
            coalesce(p_source_context, '{}'::jsonb),
            jsonb_build_object(
                'normalized_description', v_normalized,
                'case_membership_hash', v_current_hash,
                'invoice_row_ids', to_jsonb(v_current_invoice_ids),
                'quotation_row_ids', to_jsonb(v_current_quotation_ids)
            ),
            v_candidate_snapshot,
            auth.uid()
        )
        RETURNING * INTO v_rejection;
    EXCEPTION WHEN unique_violation THEN
        SELECT * INTO v_rejection
          FROM __SCHEMA__.historical_review_candidate_rejections
         WHERE normalized_description = v_normalized
           AND case_membership_hash = v_current_hash
           AND candidate_item_id = p_candidate_item_id
           AND status = 'active'
         LIMIT 1;

        IF v_rejection.id IS NULL THEN
            RAISE;
        END IF;

        RETURN jsonb_build_object('status', 'applied', 'reused', true, 'decision_id', v_rejection.id);
    END;

    -- ponytail: no activity_events write (entity_type is document-scoped).
    -- The rejection row is the audit record.
    RETURN jsonb_build_object('status', 'applied', 'reused', false, 'decision_id', v_rejection.id);
END;
$function$;
$keep_case$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $revoke_case$
CREATE OR REPLACE FUNCTION __SCHEMA__.revoke_historical_review_candidate_rejection(
    p_rejection_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_rejection __SCHEMA__.historical_review_candidate_rejections%rowtype;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT * INTO v_rejection
      FROM __SCHEMA__.historical_review_candidate_rejections
     WHERE id = p_rejection_id
     FOR UPDATE;

    IF v_rejection.id IS NULL THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'decision_not_found');
    END IF;

    IF v_rejection.status <> 'active' THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'decision_not_active', 'decision_id', v_rejection.id);
    END IF;

    UPDATE __SCHEMA__.historical_review_candidate_rejections
       SET status = 'revoked',
           revoked_by = auth.uid(),
           revoked_at = timezone('utc'::text, now()),
           revoked_reason = nullif(btrim(coalesce(p_reason, '')), '')
     WHERE id = p_rejection_id;

    -- ponytail: no activity_events write (entity_type is document-scoped).
    -- The revoked rejection row carries actor, timestamp, and reason.
    RETURN jsonb_build_object('status', 'applied', 'decision_id', p_rejection_id);
END;
$function$;
$revoke_case$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $link_case$
CREATE OR REPLACE FUNCTION __SCHEMA__.link_historical_review_case_to_item(
    p_normalized_description text,
    p_case_membership_hash text,
    p_target_item_id uuid,
    p_invoice_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_quotation_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_reason text DEFAULT NULL,
    p_source_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_normalized text;
    v_current_hash text;
    v_current_invoice_ids uuid[];
    v_current_quotation_ids uuid[];
    v_submitted_invoice_ids uuid[];
    v_submitted_quotation_ids uuid[];
    v_target __SCHEMA__.item_catalog%rowtype;
    v_decision_id uuid;
    v_exact_other_count integer;
    v_alias_other_count integer;
    v_linked_invoice integer := 0;
    v_linked_quotation integer := 0;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_normalized := __SCHEMA__.normalize_item_text(p_normalized_description);
    IF v_normalized = '' THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'empty_normalized_description');
    END IF;

    v_current_hash := __SCHEMA__.compute_historical_review_case_hash(v_normalized);

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_invoice_ids
      FROM (
        SELECT id
          FROM __SCHEMA__.invoice_items
         WHERE item_id IS NULL
           AND coalesce(row_type, 'standard') = 'standard'
           AND __SCHEMA__.normalize_item_text(description) = v_normalized
         ORDER BY id
         FOR UPDATE
      ) locked_invoice_items;

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_quotation_ids
      FROM (
        SELECT id
          FROM __SCHEMA__.quotation_items
         WHERE item_id IS NULL
           AND coalesce(row_type, 'standard') = 'standard'
           AND __SCHEMA__.normalize_item_text(description) = v_normalized
         ORDER BY id
         FOR UPDATE
      ) locked_quotation_items;

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_invoice_ids
      FROM unnest(coalesce(p_invoice_row_ids, '{}'::uuid[])) AS sub(value);

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_quotation_ids
      FROM unnest(coalesce(p_quotation_row_ids, '{}'::uuid[])) AS sub(value);

    IF v_current_hash <> p_case_membership_hash
       OR v_current_invoice_ids <> v_submitted_invoice_ids
       OR v_current_quotation_ids <> v_submitted_quotation_ids
       OR (cardinality(v_current_invoice_ids) + cardinality(v_current_quotation_ids)) = 0 THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'case_membership_changed', 'current_hash', v_current_hash);
    END IF;

    SELECT * INTO v_target
      FROM __SCHEMA__.item_catalog
     WHERE id = p_target_item_id
     FOR UPDATE;

    IF v_target.id IS NULL OR v_target.is_active IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'target_not_active');
    END IF;

    SELECT count(*) INTO v_exact_other_count
      FROM __SCHEMA__.item_catalog
     WHERE normalized_name = v_normalized
       AND is_active = true
       AND id <> p_target_item_id;

    SELECT count(DISTINCT ia.item_id) INTO v_alias_other_count
      FROM __SCHEMA__.item_aliases ia
      JOIN __SCHEMA__.item_catalog ic ON ic.id = ia.item_id
     WHERE ia.normalized_alias_text = v_normalized
       AND ia.is_active = true
       AND ia.is_retired = false
       AND ic.is_active = true
       AND ia.item_id <> p_target_item_id;

    IF v_exact_other_count > 0 OR v_alias_other_count > 0 THEN
        RETURN jsonb_build_object('status', 'conflict', 'reason', 'deterministic_identity_changed');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM __SCHEMA__.historical_review_candidate_rejections
        WHERE normalized_description = v_normalized
          AND case_membership_hash = v_current_hash
          AND candidate_item_id = p_target_item_id
          AND status = 'active'
    ) THEN
        RETURN jsonb_build_object('status', 'conflict', 'reason', 'case_candidate_marked_separate');
    END IF;

    INSERT INTO __SCHEMA__.item_historical_reconciliation_decisions (
        decision_type,
        normalized_description,
        case_membership_hash,
        target_item_id,
        status,
        reason,
        source_workflow,
        source_context,
        case_snapshot,
        created_by
    )
    VALUES (
        'link_existing',
        v_normalized,
        v_current_hash,
        p_target_item_id,
        'applied',
        nullif(btrim(coalesce(p_reason, '')), ''),
        'historical_review',
        coalesce(p_source_context, '{}'::jsonb),
        jsonb_build_object('invoice_row_ids', to_jsonb(v_current_invoice_ids), 'quotation_row_ids', to_jsonb(v_current_quotation_ids)),
        auth.uid()
    )
    RETURNING id INTO v_decision_id;

    INSERT INTO __SCHEMA__.item_historical_reconciliation_rows (
        decision_id,
        source_table,
        source_row_id,
        previous_item_id,
        new_item_id,
        normalized_description,
        row_snapshot
    )
    SELECT
        v_decision_id,
        'invoice_items',
        id,
        item_id,
        p_target_item_id,
        v_normalized,
        jsonb_build_object('description', description, 'quantity', quantity, 'unit', unit, 'unit_price', unit_price, 'make', make, 'amount', amount)
    FROM __SCHEMA__.invoice_items
    WHERE id = ANY(v_current_invoice_ids);

    INSERT INTO __SCHEMA__.item_historical_reconciliation_rows (
        decision_id,
        source_table,
        source_row_id,
        previous_item_id,
        new_item_id,
        normalized_description,
        row_snapshot
    )
    SELECT
        v_decision_id,
        'quotation_items',
        id,
        item_id,
        p_target_item_id,
        v_normalized,
        jsonb_build_object('description', description, 'quantity', quantity, 'unit', unit, 'unit_price', unit_price, 'make', make, 'amount', amount)
    FROM __SCHEMA__.quotation_items
    WHERE id = ANY(v_current_quotation_ids);

    UPDATE __SCHEMA__.invoice_items
       SET item_id = p_target_item_id
     WHERE id = ANY(v_current_invoice_ids);
    GET DIAGNOSTICS v_linked_invoice = ROW_COUNT;

    UPDATE __SCHEMA__.quotation_items
       SET item_id = p_target_item_id
     WHERE id = ANY(v_current_quotation_ids);
    GET DIAGNOSTICS v_linked_quotation = ROW_COUNT;

    -- ponytail: no activity_events write (entity_type is document-scoped).
    -- The decision row plus per-row provenance rows are the audit record.
    RETURN jsonb_build_object(
        'status', 'applied',
        'decision_id', v_decision_id,
        'target_item_id', p_target_item_id,
        'linked_invoice_rows', v_linked_invoice,
        'linked_quotation_rows', v_linked_quotation
    );
END;
$function$;
$link_case$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $create_case$
CREATE OR REPLACE FUNCTION __SCHEMA__.create_item_from_historical_review_case(
    p_normalized_description text,
    p_case_membership_hash text,
    p_canonical_name text,
    p_invoice_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_quotation_row_ids uuid[] DEFAULT '{}'::uuid[],
    p_reason text DEFAULT NULL,
    p_source_context jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_case_normalized text;
    v_name_normalized text;
    v_current_hash text;
    v_current_invoice_ids uuid[];
    v_current_quotation_ids uuid[];
    v_submitted_invoice_ids uuid[];
    v_submitted_quotation_ids uuid[];
    v_new_item_id uuid;
    v_decision_id uuid;
    v_conflict_count integer;
    v_linked_invoice integer := 0;
    v_linked_quotation integer := 0;
    v_rejection record;
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_case_normalized := __SCHEMA__.normalize_item_text(p_normalized_description);
    v_name_normalized := __SCHEMA__.normalize_item_text(p_canonical_name);

    IF v_case_normalized = '' OR v_name_normalized = '' THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'empty_normalized_description');
    END IF;

    v_current_hash := __SCHEMA__.compute_historical_review_case_hash(v_case_normalized);

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_invoice_ids
      FROM (
        SELECT id
          FROM __SCHEMA__.invoice_items
         WHERE item_id IS NULL
           AND coalesce(row_type, 'standard') = 'standard'
           AND __SCHEMA__.normalize_item_text(description) = v_case_normalized
         ORDER BY id
         FOR UPDATE
      ) locked_invoice_items;

    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
      INTO v_current_quotation_ids
      FROM (
        SELECT id
          FROM __SCHEMA__.quotation_items
         WHERE item_id IS NULL
           AND coalesce(row_type, 'standard') = 'standard'
           AND __SCHEMA__.normalize_item_text(description) = v_case_normalized
         ORDER BY id
         FOR UPDATE
      ) locked_quotation_items;

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_invoice_ids
      FROM unnest(coalesce(p_invoice_row_ids, '{}'::uuid[])) AS sub(value);

    SELECT coalesce(array_agg(sub.value ORDER BY sub.value), '{}'::uuid[])
      INTO v_submitted_quotation_ids
      FROM unnest(coalesce(p_quotation_row_ids, '{}'::uuid[])) AS sub(value);

    IF v_current_hash <> p_case_membership_hash
       OR v_current_invoice_ids <> v_submitted_invoice_ids
       OR v_current_quotation_ids <> v_submitted_quotation_ids
       OR (cardinality(v_current_invoice_ids) + cardinality(v_current_quotation_ids)) = 0 THEN
        RETURN jsonb_build_object('status', 'stale', 'reason', 'case_membership_changed', 'current_hash', v_current_hash);
    END IF;

    SELECT count(*) INTO v_conflict_count
      FROM __SCHEMA__.item_catalog
     WHERE normalized_name = v_name_normalized
       AND is_active = true;

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('status', 'conflict', 'reason', 'catalog_identity_exists');
    END IF;

    SELECT count(DISTINCT ia.item_id) INTO v_conflict_count
      FROM __SCHEMA__.item_aliases ia
      JOIN __SCHEMA__.item_catalog ic ON ic.id = ia.item_id
     WHERE ia.normalized_alias_text = v_name_normalized
       AND ia.is_active = true
       AND ia.is_retired = false
       AND ic.is_active = true;

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('status', 'conflict', 'reason', 'alias_identity_exists');
    END IF;

    INSERT INTO __SCHEMA__.item_catalog (name, normalized_name, standard_price, is_active, metadata)
    VALUES (
        btrim(p_canonical_name),
        v_name_normalized,
        0,
        true,
        jsonb_build_object(
            'source', 'historical_review_create_separate',
            'review_case_normalized_description', v_case_normalized,
            'case_membership_hash', v_current_hash
        )
    )
    RETURNING id INTO v_new_item_id;

    INSERT INTO __SCHEMA__.item_historical_reconciliation_decisions (
        decision_type,
        normalized_description,
        case_membership_hash,
        created_item_id,
        status,
        reason,
        source_workflow,
        source_context,
        case_snapshot,
        created_by
    )
    VALUES (
        'create_separate_item',
        v_case_normalized,
        v_current_hash,
        v_new_item_id,
        'applied',
        nullif(btrim(coalesce(p_reason, '')), ''),
        'historical_review',
        coalesce(p_source_context, '{}'::jsonb),
        jsonb_build_object('invoice_row_ids', to_jsonb(v_current_invoice_ids), 'quotation_row_ids', to_jsonb(v_current_quotation_ids), 'canonical_name', p_canonical_name),
        auth.uid()
    )
    RETURNING id INTO v_decision_id;

    INSERT INTO __SCHEMA__.item_historical_reconciliation_rows (
        decision_id,
        source_table,
        source_row_id,
        previous_item_id,
        new_item_id,
        normalized_description,
        row_snapshot
    )
    SELECT
        v_decision_id,
        'invoice_items',
        id,
        item_id,
        v_new_item_id,
        v_case_normalized,
        jsonb_build_object('description', description, 'quantity', quantity, 'unit', unit, 'unit_price', unit_price, 'make', make, 'amount', amount)
    FROM __SCHEMA__.invoice_items
    WHERE id = ANY(v_current_invoice_ids);

    INSERT INTO __SCHEMA__.item_historical_reconciliation_rows (
        decision_id,
        source_table,
        source_row_id,
        previous_item_id,
        new_item_id,
        normalized_description,
        row_snapshot
    )
    SELECT
        v_decision_id,
        'quotation_items',
        id,
        item_id,
        v_new_item_id,
        v_case_normalized,
        jsonb_build_object('description', description, 'quantity', quantity, 'unit', unit, 'unit_price', unit_price, 'make', make, 'amount', amount)
    FROM __SCHEMA__.quotation_items
    WHERE id = ANY(v_current_quotation_ids);

    UPDATE __SCHEMA__.invoice_items
       SET item_id = v_new_item_id
     WHERE id = ANY(v_current_invoice_ids);
    GET DIAGNOSTICS v_linked_invoice = ROW_COUNT;

    UPDATE __SCHEMA__.quotation_items
       SET item_id = v_new_item_id
     WHERE id = ANY(v_current_quotation_ids);
    GET DIAGNOSTICS v_linked_quotation = ROW_COUNT;

    FOR v_rejection IN
        SELECT *
        FROM __SCHEMA__.historical_review_candidate_rejections
        WHERE normalized_description = v_case_normalized
          AND case_membership_hash = v_current_hash
          AND status = 'active'
    LOOP
        IF EXISTS (SELECT 1 FROM __SCHEMA__.item_catalog WHERE id = v_rejection.candidate_item_id AND is_active = true) THEN
            PERFORM __SCHEMA__.keep_item_catalog_entries_separate(
                v_new_item_id,
                v_rejection.candidate_item_id,
                v_rejection.reason,
                'historical_review',
                jsonb_build_object(
                    'converted_from_case_rejection_id', v_rejection.id,
                    'historical_review_decision_id', v_decision_id
                )
            );
        ELSE
            UPDATE __SCHEMA__.historical_review_candidate_rejections
               SET status = 'stale'
             WHERE id = v_rejection.id;
        END IF;
    END LOOP;

    -- ponytail: no activity_events write (entity_type is document-scoped).
    -- The decision row plus per-row provenance rows are the audit record.
    RETURN jsonb_build_object(
        'status', 'applied',
        'decision_id', v_decision_id,
        'created_item_id', v_new_item_id,
        'linked_invoice_rows', v_linked_invoice,
        'linked_quotation_rows', v_linked_quotation
    );
END;
$function$;
$create_case$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    v_body := $merge$
CREATE OR REPLACE FUNCTION __SCHEMA__.merge_item_catalog_entries(
    p_winner_item_id uuid,
    p_merged_item_ids uuid[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_winner_name text;
    v_merged_id uuid;
    v_merged_name text;
    v_aliases_added text[] := '{}';
    v_retired uuid[] := '{}';
    v_relinked_invoice bigint := 0;
    v_relinked_quotation bigint := 0;
    v_moved bigint;
    v_merge_log_id uuid;
    v_pair record;
    v_other_id uuid;
    v_new_a uuid;
    v_new_b uuid;
    v_merge_scope uuid[];
BEGIN
    IF NOT public.has_entity_permission('__ENTITY_ID__'::uuid, auth.uid(), 'item', 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions: item/edit required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT name INTO v_winner_name FROM __SCHEMA__.item_catalog WHERE id = p_winner_item_id AND is_active = true FOR UPDATE;
    IF v_winner_name IS NULL THEN
        RAISE EXCEPTION 'Winner item not found or inactive: %', p_winner_item_id;
    END IF;

    SELECT coalesce(array_agg(DISTINCT item_id), '{}'::uuid[])
      INTO v_merge_scope
      FROM unnest(array_append(coalesce(p_merged_item_ids, '{}'::uuid[]), p_winner_item_id)) item_id
     WHERE item_id IS NOT NULL;

    IF EXISTS (
        SELECT 1
        FROM __SCHEMA__.item_reviewed_separate_pairs
        WHERE status = 'active'
          AND item_a_id = ANY(v_merge_scope)
          AND item_b_id = ANY(v_merge_scope)
    ) THEN
        RAISE EXCEPTION 'Cannot merge items that were reviewed and marked separate'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    FOREACH v_merged_id IN ARRAY coalesce(p_merged_item_ids, '{}'::uuid[])
    LOOP
        IF v_merged_id IS NULL OR v_merged_id = p_winner_item_id THEN
            CONTINUE;
        END IF;

        SELECT name INTO v_merged_name FROM __SCHEMA__.item_catalog WHERE id = v_merged_id FOR UPDATE;
        IF v_merged_name IS NULL THEN
            CONTINUE;
        END IF;

        IF v_merged_name <> v_winner_name THEN
            INSERT INTO __SCHEMA__.item_aliases (item_id, alias_text, normalized_alias_text, source)
            VALUES (p_winner_item_id, v_merged_name, __SCHEMA__.normalize_item_text(v_merged_name), 'merge')
            ON CONFLICT (normalized_alias_text) DO NOTHING;

            IF FOUND THEN
                v_aliases_added := array_append(v_aliases_added, v_merged_name);
            END IF;
        END IF;

        UPDATE __SCHEMA__.item_aliases
           SET item_id = p_winner_item_id, is_retired = true
         WHERE item_id = v_merged_id;

        UPDATE __SCHEMA__.invoice_items SET item_id = p_winner_item_id WHERE item_id = v_merged_id;
        GET DIAGNOSTICS v_moved = ROW_COUNT;
        v_relinked_invoice := v_relinked_invoice + v_moved;

        UPDATE __SCHEMA__.quotation_items SET item_id = p_winner_item_id WHERE item_id = v_merged_id;
        GET DIAGNOSTICS v_moved = ROW_COUNT;
        v_relinked_quotation := v_relinked_quotation + v_moved;

        UPDATE __SCHEMA__.item_catalog SET is_active = false WHERE id = v_merged_id;
        v_retired := array_append(v_retired, v_merged_id);

        INSERT INTO __SCHEMA__.item_merge_log (from_item_id, to_item_id, action, details)
        VALUES (v_merged_id, p_winner_item_id, 'merge', jsonb_build_object('aliases_added', to_jsonb(v_aliases_added)))
        RETURNING id INTO v_merge_log_id;

        FOR v_pair IN
            SELECT *
            FROM __SCHEMA__.item_reviewed_separate_pairs
            WHERE status = 'active'
              AND (item_a_id = v_merged_id OR item_b_id = v_merged_id)
            FOR UPDATE
        LOOP
            v_other_id := CASE WHEN v_pair.item_a_id = v_merged_id THEN v_pair.item_b_id ELSE v_pair.item_a_id END;

            IF v_other_id = p_winner_item_id THEN
                RAISE EXCEPTION 'Cannot merge items that were reviewed and marked separate'
                    USING ERRCODE = 'integrity_constraint_violation';
            END IF;

            IF p_winner_item_id::text < v_other_id::text THEN
                v_new_a := p_winner_item_id;
                v_new_b := v_other_id;
            ELSE
                v_new_a := v_other_id;
                v_new_b := p_winner_item_id;
            END IF;

            IF EXISTS (
                SELECT 1
                FROM __SCHEMA__.item_reviewed_separate_pairs
                WHERE status = 'active'
                  AND item_a_id = v_new_a
                  AND item_b_id = v_new_b
                  AND id <> v_pair.id
            ) THEN
                UPDATE __SCHEMA__.item_reviewed_separate_pairs
                   SET status = 'stale',
                       superseded_by_merge_log_id = v_merge_log_id,
                       source_context = source_context || jsonb_build_object('stale_reason', 'superseded_by_equivalent_pair_after_merge')
                 WHERE id = v_pair.id;
            ELSE
                UPDATE __SCHEMA__.item_reviewed_separate_pairs
                   SET item_a_id = v_new_a,
                       item_b_id = v_new_b,
                       superseded_by_merge_log_id = v_merge_log_id,
                       source_context = source_context || jsonb_build_object('remapped_by_merge_log_id', v_merge_log_id)
                 WHERE id = v_pair.id;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'winner_item_id', p_winner_item_id,
        'merged_item_ids', coalesce(p_merged_item_ids, '{}'::uuid[]),
        'aliases_added', to_jsonb(v_aliases_added),
        'retired_item_ids', to_jsonb(v_retired),
        'relinked_invoice_rows', v_relinked_invoice,
        'relinked_quotation_rows', v_relinked_quotation
    );
END;
$function$;
$merge$;
    v_body := replace(v_body, '__SCHEMA__', v_schema_ident);
    v_body := replace(v_body, '__ENTITY_ID__', p_entity_id::text);
    EXECUTE v_body;

    FOREACH v_body IN ARRAY ARRAY[
        'item_reviewed_separate_pairs',
        'historical_review_candidate_rejections',
        'item_historical_reconciliation_decisions',
        'item_historical_reconciliation_rows'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = p_schema_name
              AND tablename = v_body
              AND policyname = v_body || '_select'
        ) THEN
            PERFORM public._prov_install_rls(p_schema_name, v_body, p_entity_id, 'item');
        END IF;
    END LOOP;

    EXECUTE format('GRANT SELECT ON %I.item_reviewed_separate_pairs TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT SELECT ON %I.historical_review_candidate_rejections TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT SELECT ON %I.item_historical_reconciliation_decisions TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT SELECT ON %I.item_historical_reconciliation_rows TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.compute_historical_review_case_hash(text) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.keep_item_catalog_entries_separate(uuid, uuid, text, text, jsonb) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.revoke_item_reviewed_separate_pair(uuid, text) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.keep_historical_review_case_candidate_separate(text, text, uuid, uuid[], uuid[], text, jsonb) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.revoke_historical_review_candidate_rejection(uuid, text) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.link_historical_review_case_to_item(text, text, uuid, uuid[], uuid[], text, jsonb) TO anon, authenticated, service_role', p_schema_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.create_item_from_historical_review_case(text, text, text, uuid[], uuid[], text, jsonb) TO anon, authenticated, service_role', p_schema_name);
END;
$install$;
DO $$
DECLARE
    v_entity record;
    v_schema text;
BEGIN
    FOR v_entity IN
        SELECT e.id
        FROM public.entities e
        WHERE e.id IS NOT NULL
    LOOP
        v_schema := public._prov_get_schema_name(v_entity.id);
        IF v_schema IS NOT NULL AND to_regclass(v_schema || '.item_catalog') IS NOT NULL THEN
            PERFORM public._prov_install_item_library_reconciliation(v_schema, v_entity.id);
        ELSE
            RAISE NOTICE 'Stage 2B correction skipped for schema % (no item_catalog)', v_schema;
        END IF;
    END LOOP;
END;
$$;

DO $$
BEGIN
    PERFORM public._prov_install_item_library_reconciliation('tenant_master_template', '00000000-0000-0000-0000-000000000000'::uuid, false);
END;
$$;

NOTIFY pgrst, 'reload schema';
