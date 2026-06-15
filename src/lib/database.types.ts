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
    PostgrestVersion: "14.1"
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
      activity_events: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          entity_id: string
          entity_label?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          scope_type?: string
          source?: string
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          scope_type?: string
          source?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          reason: string | null
          scope_type: string
          source: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          changes?: Json
          created_at?: string
          entity_id: string
          entity_label?: string | null
          entity_type: string
          id?: string
          reason?: string | null
          scope_type?: string
          source?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          id?: string
          reason?: string | null
          scope_type?: string
          source?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          sort_code: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          sort_code?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          sort_code?: string | null
        }
        Relationships: []
      }
      blank_waybill_logs: {
        Row: {
          assigned_waybill_number: string
          downloaded_at: string | null
          downloaded_by: string | null
          id: string
          linked_waybill_id: string | null
          reconciled_at: string | null
          type: string
        }
        Insert: {
          assigned_waybill_number: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          id?: string
          linked_waybill_id?: string | null
          reconciled_at?: string | null
          type: string
        }
        Update: {
          assigned_waybill_number?: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          id?: string
          linked_waybill_id?: string | null
          reconciled_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "blank_waybill_logs_linked_waybill_id_fkey"
            columns: ["linked_waybill_id"]
            isOneToOne: false
            referencedRelation: "waybills"
            referencedColumns: ["id"]
          },
        ]
      }
      blank_csr_logs: {
        Row: {
          assigned_csr_number: string
          downloaded_at: string | null
          downloaded_by: string | null
          id: string
          linked_csr_id: string | null
          reconciled_at: string | null
        }
        Insert: {
          assigned_csr_number: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          id?: string
          linked_csr_id?: string | null
          reconciled_at?: string | null
        }
        Update: {
          assigned_csr_number?: string
          downloaded_at?: string | null
          downloaded_by?: string | null
          id?: string
          linked_csr_id?: string | null
          reconciled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blank_csr_logs_linked_csr_id_fkey"
            columns: ["linked_csr_id"]
            isOneToOne: false
            referencedRelation: "csrs"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_rows: {
        Row: {
          boq_id: string
          cells: Json | null
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          quantity: number | null
          row_type: string
          section_title: string | null
          sort_order: number
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          boq_id: string
          cells?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          row_type: string
          section_title?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          boq_id?: string
          cells?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          row_type?: string
          section_title?: string | null
          sort_order?: number
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boq_rows_boq_id_fkey"
            columns: ["boq_id"]
            isOneToOne: false
            referencedRelation: "boqs"
            referencedColumns: ["id"]
          },
        ]
      }
      boqs: {
        Row: {
          archived_at: string | null
          client_name: string | null
          created_at: string | null
          custom_fields: Json | null
          id: string
          project_name: string | null
          template_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          client_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          project_name?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          client_name?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          project_name?: string | null
          template_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          archived_at: string | null
          category: string | null
          city: string | null
          contact_person: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
        }
        Insert: {
          address: string
          archived_at?: string | null
          category?: string | null
          city?: string | null
          contact_person?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
        }
        Update: {
          address?: string
          archived_at?: string | null
          category?: string | null
          city?: string | null
          contact_person?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
        }
        Relationships: []
      }
      csrs: {
        Row: {
          acknowledgement_name: string | null
          address: string | null
          archived_at: string | null
          battery: string | null
          call_type: string | null
          capacity: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          csr_number: string
          customer_feedback: string | null
          date: string | null
          defects_found: string | null
          end_date: string | null
          end_time: string | null
          engineer_remarks: string | null
          equipment_location: string | null
          equipment_type: string | null
          frequency: string | null
          hours: string | null
          id: string
          linked_invoice_id: string | null
          make: string | null
          materials_used: string | null
          model: string | null
          po_number: string | null
          pressure: string | null
          problem_reported: string | null
          project_id: string | null
          serial_no: string | null
          service_rendered: string | null
          show_po: boolean | null
          start_date: string | null
          start_time: string | null
          status: string | null
          system_down: boolean | null
          technician_signatory_id: string | null
          temperature: string | null
          voltage: string | null
        }
        Insert: {
          acknowledgement_name?: string | null
          address?: string | null
          archived_at?: string | null
          battery?: string | null
          call_type?: string | null
          capacity?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          csr_number: string
          customer_feedback?: string | null
          date?: string | null
          defects_found?: string | null
          end_date?: string | null
          end_time?: string | null
          engineer_remarks?: string | null
          equipment_location?: string | null
          equipment_type?: string | null
          frequency?: string | null
          hours?: string | null
          id?: string
          linked_invoice_id?: string | null
          make?: string | null
          materials_used?: string | null
          model?: string | null
          po_number?: string | null
          pressure?: string | null
          problem_reported?: string | null
          project_id?: string | null
          serial_no?: string | null
          service_rendered?: string | null
          show_po?: boolean | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          system_down?: boolean | null
          technician_signatory_id?: string | null
          temperature?: string | null
          voltage?: string | null
        }
        Update: {
          acknowledgement_name?: string | null
          address?: string | null
          archived_at?: string | null
          battery?: string | null
          call_type?: string | null
          capacity?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          csr_number?: string
          customer_feedback?: string | null
          date?: string | null
          defects_found?: string | null
          end_date?: string | null
          end_time?: string | null
          engineer_remarks?: string | null
          equipment_location?: string | null
          equipment_type?: string | null
          frequency?: string | null
          hours?: string | null
          id?: string
          linked_invoice_id?: string | null
          make?: string | null
          materials_used?: string | null
          model?: string | null
          po_number?: string | null
          pressure?: string | null
          problem_reported?: string | null
          project_id?: string | null
          serial_no?: string | null
          service_rendered?: string | null
          show_po?: boolean | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          system_down?: boolean | null
          technician_signatory_id?: string | null
          temperature?: string | null
          voltage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "csrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csrs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "csrs_technician_signatory_id_fkey"
            columns: ["technician_signatory_id"]
            isOneToOne: false
            referencedRelation: "signatories"
            referencedColumns: ["id"]
          },
        ]
      }
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
      device_sequences: {
        Row: {
          device_code: string
          doc_type: string
          id: string
          last_sequence: number | null
        }
        Insert: {
          device_code: string
          doc_type: string
          id?: string
          last_sequence?: number | null
        }
        Update: {
          device_code?: string
          doc_type?: string
          id?: string
          last_sequence?: number | null
        }
        Relationships: []
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
      invoice_items: {
        Row: {
          amount: number | null
          custom_data: Json | null
          description: string
          discount_rate: number | null
          formula: string | null
          group_id: string | null
          group_name: string | null
          id: string
          image_url: string | null
          install_rate: number | null
          install_rate_override: boolean | null
          install_rate_taxable: boolean | null
          invoice_id: string | null
          item_id: string | null
          make: string | null
          quantity: number | null
          row_type: string | null
          show_install_rate: boolean | null
          sort_order: number | null
          sub_description: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          amount?: number | null
          custom_data?: Json | null
          description: string
          discount_rate?: number | null
          formula?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          install_rate?: number | null
          install_rate_override?: boolean | null
          install_rate_taxable?: boolean | null
          invoice_id?: string | null
          item_id?: string | null
          make?: string | null
          quantity?: number | null
          row_type?: string | null
          show_install_rate?: boolean | null
          sort_order?: number | null
          sub_description?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number | null
          custom_data?: Json | null
          description?: string
          discount_rate?: number | null
          formula?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          install_rate?: number | null
          install_rate_override?: boolean | null
          install_rate_taxable?: boolean | null
          invoice_id?: string | null
          item_id?: string | null
          make?: string | null
          quantity?: number | null
          row_type?: string | null
          show_install_rate?: boolean | null
          sort_order?: number | null
          sub_description?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_price_summary_v"
            referencedColumns: ["item_id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_in_words: string | null
          archived_at: string | null
          attachments: Json | null
          client_id: string
          client_name: string | null
          created_at: string | null
          created_by: string | null
          custom_fields: string | null
          discount: number | null
          document_type: string | null
          due_date: string | null
          id: string
          install_rate_total: number | null
          invoice_number: string
          invoice_title: string | null
          issue_date: string | null
          linked_csr_id: string | null
          linked_quote_id: string | null
          notes: string | null
          payment_terms: string | null
          po_number: string | null
          project_id: string | null
          scope_type: string | null
          shipping: number | null
          status: string | null
          subtotal: number | null
          terms: string | null
          total: number | null
          transportation: number | null
          updated_at: string
          updated_by: string | null
          vat: number | null
          wht: number | null
          work_duration: string | null
          workmanship: number | null
        }
        Insert: {
          amount_in_words?: string | null
          archived_at?: string | null
          attachments?: Json | null
          client_id?: string
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: string | null
          discount?: number | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          install_rate_total?: number | null
          invoice_number: string
          invoice_title?: string | null
          issue_date?: string | null
          linked_csr_id?: string | null
          linked_quote_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_number?: string | null
          project_id?: string | null
          scope_type?: string | null
          shipping?: number | null
          status?: string | null
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          transportation?: number | null
          updated_at?: string
          updated_by?: string | null
          vat?: number | null
          wht?: number | null
          work_duration?: string | null
          workmanship?: number | null
        }
        Update: {
          amount_in_words?: string | null
          archived_at?: string | null
          attachments?: Json | null
          client_id?: string
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_fields?: string | null
          discount?: number | null
          document_type?: string | null
          due_date?: string | null
          id?: string
          install_rate_total?: number | null
          invoice_number?: string
          invoice_title?: string | null
          issue_date?: string | null
          linked_csr_id?: string | null
          linked_quote_id?: string | null
          notes?: string | null
          payment_terms?: string | null
          po_number?: string | null
          project_id?: string | null
          scope_type?: string | null
          shipping?: number | null
          status?: string | null
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          transportation?: number | null
          updated_at?: string
          updated_by?: string | null
          vat?: number | null
          wht?: number | null
          work_duration?: string | null
          workmanship?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
        ]
      }
      item_aliases: {
        Row: {
          alias_text: string
          created_at: string
          id: string
          is_active: boolean
          is_retired: boolean
          item_id: string
          metadata: Json
          normalized_alias_text: string
          source: string | null
          updated_at: string
        }
        Insert: {
          alias_text: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_retired?: boolean
          item_id: string
          metadata?: Json
          normalized_alias_text: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          alias_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_retired?: boolean
          item_id?: string
          metadata?: Json
          normalized_alias_text?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_price_summary_v"
            referencedColumns: ["item_id"]
          },
        ]
      }
      item_catalog: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          normalized_name: string
          notes: string | null
          standard_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          normalized_name: string
          notes?: string | null
          standard_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          normalized_name?: string
          notes?: string | null
          standard_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      item_import_batches: {
        Row: {
          created_at: string
          id: string
          import_name: string | null
          payload: Json
          source_type: string | null
          status: string
          summary: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_name?: string | null
          payload?: Json
          source_type?: string | null
          status?: string
          summary?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          import_name?: string | null
          payload?: Json
          source_type?: string | null
          status?: string
          summary?: Json
          updated_at?: string
        }
        Relationships: []
      }
      item_merge_log: {
        Row: {
          action: string
          batch_id: string | null
          created_at: string
          details: Json
          from_item_id: string | null
          id: string
          to_item_id: string | null
        }
        Insert: {
          action: string
          batch_id?: string | null
          created_at?: string
          details?: Json
          from_item_id?: string | null
          id?: string
          to_item_id?: string | null
        }
        Update: {
          action?: string
          batch_id?: string | null
          created_at?: string
          details?: Json
          from_item_id?: string | null
          id?: string
          to_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_merge_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "item_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_merge_log_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_merge_log_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "item_price_summary_v"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "item_merge_log_to_item_id_fkey"
            columns: ["to_item_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_merge_log_to_item_id_fkey"
            columns: ["to_item_id"]
            isOneToOne: false
            referencedRelation: "item_price_summary_v"
            referencedColumns: ["item_id"]
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
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          cash_amount: number
          created_at: string | null
          currency_code: string
          date: string
          id: string
          invoice_id: string | null
          method: string | null
          notes: string | null
          recorded_by: string | null
          reference: string | null
          source: string | null
          void_reason: string | null
          voided_at: string | null
          wht_amount: number
          wht_certificate_ref: string | null
          wht_rate: number | null
          wht_type: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          cash_amount?: number
          created_at?: string | null
          currency_code?: string
          date: string
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          recorded_by?: string | null
          reference?: string | null
          source?: string | null
          void_reason?: string | null
          voided_at?: string | null
          wht_amount?: number
          wht_certificate_ref?: string | null
          wht_rate?: number | null
          wht_type?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          cash_amount?: number
          created_at?: string | null
          currency_code?: string
          date?: string
          id?: string
          invoice_id?: string | null
          method?: string | null
          notes?: string | null
          recorded_by?: string | null
          reference?: string | null
          source?: string | null
          void_reason?: string | null
          voided_at?: string | null
          wht_amount?: number
          wht_certificate_ref?: string | null
          wht_rate?: number | null
          wht_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_financials_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_last_invoice_activity"
            referencedColumns: ["invoice_id"]
          },
        ]
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
      project_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          date: string | null
          from_party: string | null
          id: string
          project_id: string | null
          raw_input: string | null
          reference_number: string | null
          title: string | null
          to_party: string | null
          total: number | null
          type: string
          vat: number | null
          voucher_number: string | null
          wht: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          date?: string | null
          from_party?: string | null
          id?: string
          project_id?: string | null
          raw_input?: string | null
          reference_number?: string | null
          title?: string | null
          to_party?: string | null
          total?: number | null
          type?: string
          vat?: number | null
          voucher_number?: string | null
          wht?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          date?: string | null
          from_party?: string | null
          id?: string
          project_id?: string | null
          raw_input?: string | null
          reference_number?: string | null
          title?: string | null
          to_party?: string | null
          total?: number | null
          type?: string
          vat?: number | null
          voucher_number?: string | null
          wht?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          po_number: string | null
          project_code: string
          project_value: number | null
          scope_type: string | null
          start_date: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          po_number?: string | null
          project_code: string
          project_value?: number | null
          scope_type?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          po_number?: string | null
          project_code?: string
          project_value?: number | null
          scope_type?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      quotation_items: {
        Row: {
          amount: number
          created_at: string
          custom_data: Json
          description: string | null
          discount_rate: number | null
          formula: string | null
          group_id: string | null
          group_name: string | null
          id: string
          image_url: string | null
          install_rate: number | null
          install_rate_override: boolean | null
          install_rate_taxable: boolean | null
          item_id: string | null
          make: string | null
          quantity: number
          quotation_id: string
          row_type: string
          show_install_rate: boolean | null
          sort_order: number
          sub_description: string | null
          unit: string | null
          unit_price: number
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          custom_data?: Json
          description?: string | null
          discount_rate?: number | null
          formula?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          install_rate?: number | null
          install_rate_override?: boolean | null
          install_rate_taxable?: boolean | null
          item_id?: string | null
          make?: string | null
          quantity?: number
          quotation_id: string
          row_type?: string
          show_install_rate?: boolean | null
          sort_order?: number
          sub_description?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          custom_data?: Json
          description?: string | null
          discount_rate?: number | null
          formula?: string | null
          group_id?: string | null
          group_name?: string | null
          id?: string
          image_url?: string | null
          install_rate?: number | null
          install_rate_override?: boolean | null
          install_rate_taxable?: boolean | null
          item_id?: string | null
          make?: string | null
          quantity?: number
          quotation_id?: string
          row_type?: string
          show_install_rate?: boolean | null
          sort_order?: number
          sub_description?: string | null
          unit?: string | null
          unit_price?: number
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_price_summary_v"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "v_last_quotation_activity"
            referencedColumns: ["quotation_id"]
          },
        ]
      }
      quotations: {
        Row: {
          amount_in_words: string | null
          archived_at: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          discount: number
          id: string
          install_rate_total: number
          issue_date: string
          notes: string | null
          po_number: string | null
          project_id: string | null
          quotation_number: string
          quotation_title: string | null
          scope_type: string | null
          shipping: number
          status: string
          subtotal: number
          terms: string | null
          total: number
          transportation: number
          updated_at: string
          updated_by: string | null
          valid_until: string | null
          vat: number
          wht: number
          workmanship: number
        }
        Insert: {
          amount_in_words?: string | null
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          discount?: number
          id?: string
          install_rate_total?: number
          issue_date?: string
          notes?: string | null
          po_number?: string | null
          project_id?: string | null
          quotation_number: string
          quotation_title?: string | null
          scope_type?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          terms?: string | null
          total?: number
          transportation?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          vat?: number
          wht?: number
          workmanship?: number
        }
        Update: {
          amount_in_words?: string | null
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          discount?: number
          id?: string
          install_rate_total?: number
          issue_date?: string
          notes?: string | null
          po_number?: string | null
          project_id?: string | null
          quotation_number?: string
          quotation_title?: string | null
          scope_type?: string | null
          shipping?: number
          status?: string
          subtotal?: number
          terms?: string | null
          total?: number
          transportation?: number
          updated_at?: string
          updated_by?: string | null
          valid_until?: string | null
          vat?: number
          wht?: number
          workmanship?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          quantity: number | null
          rfq_id: string | null
          sort_order: number | null
          specification: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          rfq_id?: string | null
          sort_order?: number | null
          specification?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          rfq_id?: string | null
          sort_order?: number | null
          specification?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          accent_color: string | null
          archived_at: string | null
          background_mode: string | null
          background_primary: string | null
          background_secondary: string | null
          brand_name_override: string | null
          created_at: string | null
          custom_fields: Json | null
          expiry_date: string | null
          export_order_seed: number | null
          id: string
          issue_date: string | null
          notes: string | null
          palette_name: string | null
          rfq_number: string
          show_brand_name: boolean | null
          text_color: string | null
          title: string | null
          updated_at: string | null
          vendor_contact: string | null
          vendor_name: string | null
        }
        Insert: {
          accent_color?: string | null
          archived_at?: string | null
          background_mode?: string | null
          background_primary?: string | null
          background_secondary?: string | null
          brand_name_override?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          expiry_date?: string | null
          export_order_seed?: number | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          palette_name?: string | null
          rfq_number: string
          show_brand_name?: boolean | null
          text_color?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Update: {
          accent_color?: string | null
          archived_at?: string | null
          background_mode?: string | null
          background_primary?: string | null
          background_secondary?: string | null
          brand_name_override?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          expiry_date?: string | null
          export_order_seed?: number | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          palette_name?: string | null
          rfq_number?: string
          show_brand_name?: boolean | null
          text_color?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          app_background_color: string | null
          app_card_color: string | null
          app_theme_preset_id: string | null
          app_theme_tokens: Json | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_sort_code: string | null
          company_address: string | null
          company_city: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_phone: string | null
          company_tagline: string | null
          company_website: string | null
          custom_info: string | null
          document_prefixes?: {
            waybill: string
            invoice: string
            boq: string
            rfq: string
            quotation: string
            project: string
            csr: string
          } | null
          footer_text: string | null
          id: number
          signature_url: string | null
        }
        Insert: {
          app_background_color?: string | null
          app_card_color?: string | null
          app_theme_preset_id?: string | null
          app_theme_tokens?: Json | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tagline?: string | null
          company_website?: string | null
          custom_info?: string | null
          document_prefixes?: {
            waybill: string
            invoice: string
            boq: string
            rfq: string
            quotation: string
            project: string
            csr: string
          } | null
          footer_text?: string | null
          id?: number
          signature_url?: string | null
        }
        Update: {
          app_background_color?: string | null
          app_card_color?: string | null
          app_theme_preset_id?: string | null
          app_theme_tokens?: Json | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_sort_code?: string | null
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_tagline?: string | null
          company_website?: string | null
          custom_info?: string | null
          document_prefixes?: {
            waybill: string
            invoice: string
            boq: string
            rfq: string
            quotation: string
            project: string
            csr: string
          } | null
          footer_text?: string | null
          id?: number
          signature_url?: string | null
        }
        Relationships: []
      }
      signatories: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          role: string | null
          signature_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          role?: string | null
          signature_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          role?: string | null
          signature_url?: string | null
        }
        Relationships: []
      }
      tax_filings: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          portal_reference: string | null
          receipt_reference: string | null
          settings_id: number
          status: string
          submitted_at: string | null
          tax_type: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          portal_reference?: string | null
          receipt_reference?: string | null
          settings_id: number
          status?: string
          submitted_at?: string | null
          tax_type: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          portal_reference?: string | null
          receipt_reference?: string | null
          settings_id?: number
          status?: string
          submitted_at?: string | null
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_filings_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "settings"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_input_entries: {
        Row: {
          category: string | null
          created_at: string
          date: string
          id: string
          is_recoverable: boolean
          net_amount: number
          notes: string | null
          reference: string | null
          settings_id: number
          updated_at: string
          vat_amount: number
          vendor_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          id?: string
          is_recoverable?: boolean
          net_amount?: number
          notes?: string | null
          reference?: string | null
          settings_id: number
          updated_at?: string
          vat_amount?: number
          vendor_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          is_recoverable?: boolean
          net_amount?: number
          notes?: string | null
          reference?: string | null
          settings_id?: number
          updated_at?: string
          vat_amount?: number
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_input_entries_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "settings"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          linked_filing_id: string | null
          notes: string | null
          period_end: string | null
          period_start: string | null
          settings_id: number
          status: string
          tax_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          linked_filing_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          settings_id: number
          status?: string
          tax_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          linked_filing_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          settings_id?: number
          status?: string
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_reminders_linked_filing_id_fkey"
            columns: ["linked_filing_id"]
            isOneToOne: false
            referencedRelation: "tax_filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_reminders_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "settings"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_settings: {
        Row: {
          cit_category: string | null
          created_at: string
          id: string
          notes: string | null
          settings_id: number
          threshold_basis: string | null
          tin: string | null
          updated_at: string
          vat_enabled: boolean
          vat_threshold: number
          year_end_day: number | null
          year_end_month: number | null
        }
        Insert: {
          cit_category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          settings_id: number
          threshold_basis?: string | null
          tin?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_threshold?: number
          year_end_day?: number | null
          year_end_month?: number | null
        }
        Update: {
          cit_category?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          settings_id?: number
          threshold_basis?: string | null
          tin?: string | null
          updated_at?: string
          vat_enabled?: boolean
          vat_threshold?: number
          year_end_day?: number | null
          year_end_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_settings_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: true
            referencedRelation: "settings"
            referencedColumns: ["id"]
          },
        ]
      }
      waybills: {
        Row: {
          archived_at: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          date: string
          delivery_location: string | null
          id: string
          invoice_id: string | null
          items: Json
          notes: string | null
          po_number: string | null
          project_id: string | null
          receiver_description: string | null
          receiver_name: string | null
          receiver_signature_url: string | null
          sender_name: string | null
          status: string | null
          time: string | null
          type: string
          vehicle_plate: string | null
          waybill_number: string
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          delivery_location?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          po_number?: string | null
          project_id?: string | null
          receiver_description?: string | null
          receiver_name?: string | null
          receiver_signature_url?: string | null
          sender_name?: string | null
          status?: string | null
          time?: string | null
          type: string
          vehicle_plate?: string | null
          waybill_number: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          delivery_location?: string | null
          id?: string
          invoice_id?: string | null
          items?: Json
          notes?: string | null
          po_number?: string | null
          project_id?: string | null
          receiver_description?: string | null
          receiver_name?: string | null
          receiver_signature_url?: string | null
          sender_name?: string | null
          status?: string | null
          time?: string | null
          type?: string
          vehicle_plate?: string | null
          waybill_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "waybills_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_financials_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_last_invoice_activity"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "waybills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "waybills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
        ]
      }
      wht_receipts: {
        Row: {
          client_name: string | null
          created_at: string
          gross_base_amount: number | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_id: string
          receipt_file_url: string | null
          receipt_number: string | null
          receipt_status: string
          received_at: string | null
          updated_at: string
          wht_amount: number | null
          wht_rate: number | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          gross_base_amount?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_id: string
          receipt_file_url?: string | null
          receipt_number?: string | null
          receipt_status?: string
          received_at?: string | null
          updated_at?: string
          wht_amount?: number | null
          wht_rate?: number | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          gross_base_amount?: number | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_id?: string
          receipt_file_url?: string | null
          receipt_number?: string | null
          receipt_status?: string
          received_at?: string | null
          updated_at?: string
          wht_amount?: number | null
          wht_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wht_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_financials_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_last_invoice_activity"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "wht_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_financials_v: {
        Row: {
          balance_due: number | null
          cash_received: number | null
          client_id: string | null
          client_name: string | null
          computed_status: string | null
          due_date: string | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          project_id: string | null
          settled_total: number | null
          status: string | null
          total_gross: number | null
          wht_received: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_v"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_last_project_activity"
            referencedColumns: ["project_id"]
          },
        ]
      }
      item_price_summary_v: {
        Row: {
          avg_price: number | null
          is_active: boolean | null
          item_id: string | null
          last_sold_price: number | null
          last_source_document_id: string | null
          last_source_type: string | null
          last_used_at: string | null
          max_price: number | null
          min_price: number | null
          name: string | null
          standard_price: number | null
          usage_count: number | null
        }
        Relationships: []
      }
      project_financials_v: {
        Row: {
          cash_collected: number | null
          client_id: string | null
          client_name: string | null
          invoice_count: number | null
          outstanding: number | null
          project_id: string | null
          project_name: string | null
          status: string | null
          total_collected: number | null
          total_invoiced: number | null
          wht_collected: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_last_invoice_activity: {
        Row: {
          invoice_id: string | null
          invoice_number: string | null
          last_activity_at: string | null
          status: string | null
        }
        Relationships: []
      }
      v_last_project_activity: {
        Row: {
          last_activity_at: string | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
        }
        Relationships: []
      }
      v_last_quotation_activity: {
        Row: {
          last_activity_at: string | null
          quotation_id: string | null
          quotation_number: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
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
      compute_jsonb_diff: {
        Args: { new_data: Json; old_data: Json }
        Returns: Json
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
      generate_invoice_notifications: { Args: never; Returns: undefined }
      generate_quotation_notifications: { Args: never; Returns: undefined }
      get_device_code_counter_seeds: {
        Args: { p_device_code?: string; p_installation_id?: string }
        Returns: {
          csr_max: number
          device_code: string
          quotation_max: number
          waybill_max: number
        }[]
      }
      get_item_suggestions: {
        Args: { result_limit?: number; search_text: string }
        Returns: {
          display_name: string
          is_alias: boolean
          item_id: string
          last_sold_price: number
          matched_text: string
          rank_score: number
          standard_price: number
          usage_count: number
        }[]
      }
      log_activity_event: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_entity_id: string
          p_entity_label?: string
          p_entity_type: string
          p_event_type?: string
          p_metadata?: Json
          p_reason?: string
          p_scope_type?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      normalize_item_text: { Args: { input: string }; Returns: string }
      record_activity_event: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_dedupe_seconds?: number
          p_entity_id: string
          p_entity_label?: string
          p_entity_type: string
          p_event_type: string
          p_metadata?: Json
          p_reason?: string
          p_scope_type?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_audit_log: {
        Args: {
          p_action: string
          p_actor_id?: string
          p_actor_label?: string
          p_entity_id: string
          p_entity_label: string
          p_entity_type: string
          p_new_data: Json
          p_old_data: Json
          p_reason?: string
          p_scope_type?: string
          p_source?: string
        }
        Returns: {
          action: string
          actor_id: string | null
          actor_label: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "audit_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_invoice_created: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_invoice_id: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_invoice_status_changed: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_invoice_id: string
          p_new_status?: string
          p_old_status?: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_payment_recorded: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_amount?: number
          p_invoice_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_project_document_added: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_metadata?: Json
          p_project_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_project_linked_activity: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_linked_entity_id: string
          p_linked_entity_label?: string
          p_linked_entity_type: string
          p_project_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_project_note_added: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_metadata?: Json
          p_project_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_project_updated: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_metadata?: Json
          p_project_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_quotation_created: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_quotation_id: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_quotation_linked: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_invoice_id?: string
          p_project_id?: string
          p_quotation_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_quotation_status_changed: {
        Args: {
          p_actor_id?: string
          p_actor_label?: string
          p_new_status?: string
          p_old_status?: string
          p_quotation_id: string
          p_reason?: string
          p_source?: string
        }
        Returns: {
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          scope_type: string
          source: string
        }
        SetofOptions: {
          from: "*"
          to: "activity_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_invoice_notifications: { Args: never; Returns: undefined }
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
      resolve_quotation_notifications: { Args: never; Returns: undefined }
      revert_invoice_to_quotation_transaction: {
        Args: {
          p_invoice_id: string
          p_quotation_items_payload: Json
          p_quotation_payload: Json
        }
        Returns: Json
      }
      run_notification_jobs: { Args: never; Returns: undefined }
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
