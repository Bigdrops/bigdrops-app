-- Domain: Projects
-- Tables: projects, project_documents
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    client_id uuid,
    client_name character varying,
    status character varying DEFAULT 'active'::character varying,
    start_date date NOT NULL DEFAULT CURRENT_DATE,
    project_value numeric,
    po_number character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    location character varying,
    archived_at timestamp with time zone,
    project_code text NOT NULL,
    created_by uuid,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    scope_type text DEFAULT 'app'::text
);

CREATE TABLE IF NOT EXISTS project_documents (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id uuid,
    type text NOT NULL DEFAULT 'other'::text,
    title text,
    reference_number text,
    date date,
    from_party text,
    to_party text,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    raw_input text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    vat numeric DEFAULT 0,
    wht numeric DEFAULT 0,
    total numeric DEFAULT 0,
    voucher_number text
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE projects ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE project_documents ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS projects_project_code_key ON public.projects USING btree (project_code);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON public.projects USING btree (archived_at);
CREATE INDEX IF NOT EXISTS projects_po_number_idx ON public.projects USING btree (po_number);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_projects_status_updated_at ON public.projects USING btree (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_by ON public.projects USING btree (updated_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON public.project_documents USING btree (project_id);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE project_documents ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- projects
CREATE POLICY users_can_view_projects ON projects FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY users_can_update_projects ON projects FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY users_can_delete_projects ON projects FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY projects_authenticated_select ON projects FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY projects_authenticated_delete ON projects FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY projects_authenticated_update ON projects FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- project_documents
CREATE POLICY project_documents_authenticated_select ON project_documents FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY project_documents_authenticated_delete ON project_documents FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION set_row_updated_at();
CREATE TRIGGER trg_projects_stamp_ownership BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION stamp_row_ownership();

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_project_updated(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'UPDATED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_project_note_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'NOTE_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_project_document_added(p_project_id uuid, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'DOCUMENT_ADDED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := coalesce(p_metadata, '{}'::jsonb),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_project_linked_activity(p_project_id uuid, p_linked_entity_type text, p_linked_entity_id uuid, p_linked_entity_label text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_label text DEFAULT NULL::text, p_source text DEFAULT 'web'::text, p_reason text DEFAULT NULL::text)
 RETURNS activity_events
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_project public.projects;
begin
  select *
  into v_project
  from public.projects
  where id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found: %', p_project_id;
  end if;

  if p_linked_entity_type not in ('invoice', 'quotation') then
    raise exception 'Unsupported linked entity type: %', p_linked_entity_type;
  end if;

  return public.record_activity_event(
    p_entity_type := 'project',
    p_entity_id := v_project.id,
    p_event_type := 'LINKED',
    p_entity_label := v_project.project_code,
    p_actor_id := p_actor_id,
    p_actor_label := p_actor_label,
    p_source := p_source,
    p_scope_type := coalesce(v_project.scope_type, 'app'),
    p_metadata := jsonb_build_object(
      'linked_entity_type', p_linked_entity_type,
      'linked_entity_id', p_linked_entity_id,
      'linked_entity_label', p_linked_entity_label
    ),
    p_reason := p_reason,
    p_dedupe_seconds := 15
  );
end;
$function$;
