export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      device_installations: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_automatically: boolean
          assigned_by: string | null
          created_at: string
          device_code: string
          device_name: string | null
          id: string
          installation_id: string
          last_seen_at: string | null
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_automatically?: boolean
          assigned_by?: string | null
          created_at?: string
          device_code: string
          device_name?: string | null
          id?: string
          installation_id: string
          last_seen_at?: string | null
          platform?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_automatically?: boolean
          assigned_by?: string | null
          created_at?: string
          device_code?: string
          device_name?: string | null
          id?: string
          installation_id?: string
          last_seen_at?: string | null
          platform?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_installations_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_installations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          device_code: string
          device_name: string
          id: string
          last_seen: string | null
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          device_code: string
          device_name: string
          id?: string
          last_seen?: string | null
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_code?: string
          device_name?: string
          id?: string
          last_seen?: string | null
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          created_at: string
          display_name: string
          entity_type: string
          id: string
          is_active: boolean
          slug: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          entity_type: string
          id?: string
          is_active?: boolean
          slug: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          slug?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_permissions: {
        Row: {
          action: string
          entity_id: string
          granted_at: string
          granted_by: string | null
          id: string
          resource: string
          user_id: string
        }
        Insert: {
          action: string
          entity_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          resource: string
          user_id: string
        }
        Update: {
          action?: string
          entity_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          resource?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_permissions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_provisioning_status: {
        Row: {
          attempt_count: number
          entity_id: string
          last_error: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          entity_id: string
          last_error?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          entity_id?: string
          last_error?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_provisioning_status_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: true
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          created_at: string
          domain: string
          enabled: boolean
          event_key: string
          id: string
          threshold_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          domain: string
          enabled?: boolean
          event_key: string
          id?: string
          threshold_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          domain?: string
          enabled?: boolean
          event_key?: string
          id?: string
          threshold_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_runs: {
        Row: {
          generator_key: string | null
          id: string
          message: string | null
          run_at: string | null
          status: string | null
        }
        Insert: {
          generator_key?: string | null
          id?: string
          message?: string | null
          run_at?: string | null
          status?: string | null
        }
        Update: {
          generator_key?: string | null
          id?: string
          message?: string | null
          run_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          dismissed_at: string | null
          domain: string
          entity_id: string | null
          entity_type: string | null
          fingerprint: string
          first_generated_at: string
          generator_key: string
          id: string
          last_generated_at: string
          message: string
          metadata: Json | null
          read_at: string | null
          resolved_at: string | null
          route: string | null
          scope_id: string
          scope_type: string
          severity: string
          source: string
          state: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          domain: string
          entity_id?: string | null
          entity_type?: string | null
          fingerprint: string
          first_generated_at?: string
          generator_key: string
          id?: string
          last_generated_at?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          resolved_at?: string | null
          route?: string | null
          scope_id?: string
          scope_type?: string
          severity?: string
          source: string
          state?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          domain?: string
          entity_id?: string | null
          entity_type?: string | null
          fingerprint?: string
          first_generated_at?: string
          generator_key?: string
          id?: string
          last_generated_at?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          resolved_at?: string | null
          route?: string | null
          scope_id?: string
          scope_type?: string
          severity?: string
          source?: string
          state?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permission_template_items: {
        Row: {
          action: string
          id: string
          resource: string
          template_id: string
        }
        Insert: {
          action: string
          id?: string
          resource: string
          template_id: string
        }
        Update: {
          action?: string
          id?: string
          resource?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_operators: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assigned_device_code: string | null
          created_at: string | null
          email: string | null
          has_password: boolean | null
          id: string
          is_approved: boolean | null
          role: string | null
        }
        Insert: {
          assigned_device_code?: string | null
          created_at?: string | null
          email?: string | null
          has_password?: boolean | null
          id: string
          is_approved?: boolean | null
          role?: string | null
        }
        Update: {
          assigned_device_code?: string | null
          created_at?: string | null
          email?: string | null
          has_password?: boolean | null
          id?: string
          is_approved?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
      push_delivery_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          provider: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          token_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          token_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          token_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_delivery_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_delivery_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "push_device_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      push_device_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string | null
          id: string
          last_seen_at: string
          platform: string
          revoked_at: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform: string
          revoked_at?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          revoked_at?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_invitation_entity_grants: {
        Row: {
          action: string
          entity_id: string
          id: string
          invite_id: string
          resource: string
        }
        Insert: {
          action: string
          entity_id: string
          id?: string
          invite_id: string
          resource: string
        }
        Update: {
          action?: string
          entity_id?: string
          id?: string
          invite_id?: string
          resource?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitation_entity_grants_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitation_entity_grants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "workspace_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          workspace_id: string
          workspace_permissions: Json
          workspace_role: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          workspace_id: string
          workspace_permissions?: Json
          workspace_role?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          workspace_id?: string
          workspace_permissions?: Json
          workspace_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          permissions: Json
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          permissions?: Json
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          permissions?: Json
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _audit_resolve_invoice_schema: {
        Args: { p_entity_id: string; p_invoice_id: string }
        Returns: string
      }
      _prov_check_idempotency: {
        Args: { p_entity_id: string }
        Returns: string
      }
      _prov_cleanup_on_error: {
        Args: { p_schema_name: string }
        Returns: undefined
      }
      _prov_clone_table: {
        Args: {
          p_source_schema: string
          p_table_name: string
          p_target_schema: string
        }
        Returns: undefined
      }
      _prov_create_schema: {
        Args: { p_schema_name: string }
        Returns: undefined
      }
      _prov_get_retry_limit: { Args: never; Returns: number }
      _prov_get_schema_name: { Args: { p_entity_id: string }; Returns: string }
      _prov_get_template_tables: { Args: never; Returns: string[] }
      _prov_install_financial_views: {
        Args: { p_schema_name: string }
        Returns: undefined
      }
      _prov_install_item_library: {
        Args: { p_entity_id: string; p_schema_name: string }
        Returns: undefined
      }
      _prov_install_rls: {
        Args: {
          p_entity_id: string
          p_resource: string
          p_schema_name: string
          p_table_name: string
        }
        Returns: undefined
      }
      _prov_install_tenant_rpcs: {
        Args: { p_schema_name: string }
        Returns: undefined
      }
      _prov_install_triggers: {
        Args: {
          p_source_schema: string
          p_table_name: string
          p_target_schema: string
        }
        Returns: undefined
      }
      _prov_readd_foreign_keys: {
        Args: {
          p_source_schema: string
          p_table_name: string
          p_target_schema: string
        }
        Returns: undefined
      }
      _prov_seed_default_permissions: {
        Args: { p_entity_id: string; p_user_id: string }
        Returns: undefined
      }
      _prov_seed_settings: {
        Args: { p_entity_id: string; p_schema_name: string }
        Returns: undefined
      }
      _prov_table_to_resource: { Args: { p_table: string }; Returns: string }
      _prov_update_status: {
        Args: { p_entity_id: string; p_error?: string; p_status: string }
        Returns: undefined
      }
      _prov_validate_permissions: {
        Args: { p_entity_id: string }
        Returns: undefined
      }
      accept_workspace_invitation: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      admin_revoke_device_assignment: {
        Args: { p_assignment_id: string }
        Returns: {
          active: boolean
          assigned_at: string
          assigned_automatically: boolean
          assigned_by: string | null
          created_at: string
          device_code: string
          device_name: string | null
          id: string
          installation_id: string
          last_seen_at: string | null
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_installations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_device_assignment_code: {
        Args: { p_assignment_id: string; p_device_code: string }
        Returns: {
          active: boolean
          assigned_at: string
          assigned_automatically: boolean
          assigned_by: string | null
          created_at: string
          device_code: string
          device_name: string | null
          id: string
          installation_id: string
          last_seen_at: string | null
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_installations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_permission_template: {
        Args: {
          p_entity_id: string
          p_granted_by?: string
          p_template_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      approve_workspace: {
        Args: { p_creator_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
      assign_role_to_company_member: {
        Args: { p_entity_id: string; p_template_id: string; p_user_id: string }
        Returns: undefined
      }
      compute_jsonb_diff: {
        Args: { new_data: Json; old_data: Json }
        Returns: Json
      }
      create_workspace_invitation: {
        Args: {
          p_email: string
          p_entity_id?: string
          p_expires_at?: string
          p_permissions?: Json
          p_role?: string
          p_workspace_id: string
        }
        Returns: string
      }
      ensure_android_device_assignment: {
        Args: {
          p_device_name?: string
          p_installation_id: string
          p_user_id: string
        }
        Returns: {
          active: boolean
          assigned_at: string
          assigned_automatically: boolean
          assigned_by: string | null
          created_at: string
          device_code: string
          device_name: string | null
          id: string
          installation_id: string
          last_seen_at: string | null
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "device_installations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_device_code: { Args: never; Returns: string }
      get_device_code_counter_seeds: {
        Args: { p_device_code?: string; p_installation_id?: string }
        Returns: {
          csr_max: number
          device_code: string
          quotation_max: number
          waybill_max: number
        }[]
      }
      get_entity_provisioning_status: {
        Args: { p_entity_id: string }
        Returns: {
          last_error: string
          status: string
          updated_at: string
        }[]
      }
      has_entity_permission: {
        Args: {
          p_action: string
          p_entity_id: string
          p_resource: string
          p_user_id: string
        }
        Returns: boolean
      }
      invoice_persisted_status: {
        Args: { p_computed: string; p_current: string; p_settled: number }
        Returns: string
      }
      is_platform_operator: {
        Args: { p_required_role?: string; p_user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      provision_entity: { Args: { p_entity_id: string }; Returns: Json }
      remove_role_from_company_member: {
        Args: { p_entity_id: string; p_template_id: string; p_user_id: string }
        Returns: undefined
      }
      resolve_notification:
        | {
            Args: {
              p_fingerprint: string
              p_scope_id: string
              p_scope_type: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: { p_fingerprint: string; p_user_id: string }
            Returns: undefined
          }
      revoke_workspace_invitation: {
        Args: { p_invite_id: string }
        Returns: undefined
      }
      seed_preloaded_role_templates: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      upsert_notification:
        | {
            Args: {
              p_domain: string
              p_entity_id: string
              p_entity_type: string
              p_fingerprint: string
              p_generator_key: string
              p_message: string
              p_metadata: Json
              p_route: string
              p_scope_id: string
              p_scope_type: string
              p_severity: string
              p_source: string
              p_title: string
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_domain: string
              p_entity_id: string
              p_entity_type: string
              p_fingerprint: string
              p_generator_key: string
              p_message: string
              p_metadata: Json
              p_route: string
              p_severity: string
              p_source: string
              p_title: string
              p_user_id: string
            }
            Returns: undefined
          }
      validate_waybill_items: { Args: { items: Json }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
