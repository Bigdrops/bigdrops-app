-- Domain: Multi-Tenancy Core
-- Phase 2: RLS policies for Phase 1 authorization tables
-- Created: 2026-07-14
-- Source: docs/Reports/architecture/multi-tenancy-round-2-analysis.md §6.5

-- ============================================================
-- workspaces
-- ============================================================

CREATE POLICY workspaces_select_member ON workspaces FOR SELECT TO public
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = id AND user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY workspaces_insert_authenticated ON workspaces FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY workspaces_update_owner ON workspaces FOR UPDATE TO public
  USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = id AND user_id = auth.uid() AND role = 'owner')
  );

-- ============================================================
-- workspace_members
-- ============================================================

CREATE POLICY workspace_members_select_self ON workspace_members FOR SELECT TO public
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
    )
  );

CREATE POLICY workspace_members_insert_owner ON workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY workspace_members_update_owner ON workspace_members FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY workspace_members_delete_owner ON workspace_members FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

-- ============================================================
-- entities
-- ============================================================

CREATE POLICY entities_select_member ON entities FOR SELECT TO public
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
    )
  );

CREATE POLICY entities_insert_member ON entities FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id = auth.uid()
          AND (wm2.role = 'owner' OR (wm2.permissions->>'create_entity')::boolean = true)
    )
  );

CREATE POLICY entities_update_member ON entities FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id = auth.uid()
          AND (wm2.role = 'owner' OR (wm2.permissions->>'create_entity')::boolean = true)
    )
  );

CREATE POLICY entities_delete_member ON entities FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id = auth.uid()
          AND (wm2.role = 'owner' OR (wm2.permissions->>'create_entity')::boolean = true)
    )
  );

-- ============================================================
-- entity_permissions
-- INSERT/UPDATE/DELETE via SECURITY DEFINER functions only
-- (apply_permission_template, accept_workspace_invitation)
-- ============================================================

CREATE POLICY entity_permissions_select_self ON entity_permissions FOR SELECT TO public
  USING (user_id = auth.uid() OR granted_by = auth.uid());

-- ============================================================
-- permission_templates
-- ============================================================

CREATE POLICY permission_templates_select_member ON permission_templates FOR SELECT TO public
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
    )
  );

CREATE POLICY permission_templates_insert_owner ON permission_templates FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY permission_templates_update_owner ON permission_templates FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY permission_templates_delete_owner ON permission_templates FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

-- ============================================================
-- permission_template_items (cascading via template → workspace)
-- ============================================================

CREATE POLICY permission_template_items_select_member ON permission_template_items FOR SELECT TO public
  USING (
    template_id IN (
      SELECT pt.id FROM permission_templates pt
      WHERE pt.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY permission_template_items_insert_owner ON permission_template_items FOR INSERT TO authenticated
  WITH CHECK (
    template_id IN (
      SELECT pt.id FROM permission_templates pt
      WHERE pt.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
      )
    )
  );

CREATE POLICY permission_template_items_delete_owner ON permission_template_items FOR DELETE TO authenticated
  USING (
    template_id IN (
      SELECT pt.id FROM permission_templates pt
      WHERE pt.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
      )
    )
  );

-- ============================================================
-- workspace_invitations
-- ============================================================

CREATE POLICY workspace_invitations_select_member ON workspace_invitations FOR SELECT TO public
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY workspace_invitations_insert_owner ON workspace_invitations FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY workspace_invitations_update_owner ON workspace_invitations FOR UPDATE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

CREATE POLICY workspace_invitations_delete_owner ON workspace_invitations FOR DELETE TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );

-- ============================================================
-- workspace_invitation_entity_grants (cascading via invite → workspace)
-- ============================================================

CREATE POLICY workspace_invitation_entity_grants_select_member ON workspace_invitation_entity_grants FOR SELECT TO public
  USING (
    invite_id IN (
      SELECT wi.id FROM workspace_invitations wi
      WHERE wi.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY workspace_invitation_entity_grants_insert_owner ON workspace_invitation_entity_grants FOR INSERT TO authenticated
  WITH CHECK (
    invite_id IN (
      SELECT wi.id FROM workspace_invitations wi
      WHERE wi.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
      )
    )
  );

CREATE POLICY workspace_invitation_entity_grants_delete_owner ON workspace_invitation_entity_grants FOR DELETE TO authenticated
  USING (
    invite_id IN (
      SELECT wi.id FROM workspace_invitations wi
      WHERE wi.workspace_id IN (
        SELECT wm2.workspace_id FROM workspace_members wm2 WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
      )
    )
  );
