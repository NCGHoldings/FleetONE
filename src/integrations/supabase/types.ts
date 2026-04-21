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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accident_audit_trail: {
        Row: {
          accident_id: string
          action: string
          changed_at: string
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          accident_id: string
          action: string
          changed_at?: string
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          accident_id?: string
          action?: string
          changed_at?: string
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accident_audit_trail_accident_id_fkey"
            columns: ["accident_id"]
            isOneToOne: false
            referencedRelation: "accident_records"
            referencedColumns: ["id"]
          },
        ]
      }
      accident_documents: {
        Row: {
          accident_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          original_name: string
          uploaded_at: string
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          accident_id: string
          document_type?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          original_name: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          accident_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          original_name?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accident_documents_accident_id_fkey"
            columns: ["accident_id"]
            isOneToOne: false
            referencedRelation: "accident_records"
            referencedColumns: ["id"]
          },
        ]
      }
      accident_records: {
        Row: {
          accident_date: string
          accident_mark: boolean | null
          approved_amount: number | null
          ari_status: string
          bl_number: string | null
          created_at: string
          created_by: string | null
          details_of_accident: string | null
          Driver: string | null
          estimate_amount: number | null
          id: string
          insurer_claim_ref: string | null
          location: string | null
          no: number
          process_details: string | null
          reported_by: string | null
          salvage: boolean | null
          salvage_disposition: string | null
          salvage_sale_date: string | null
          salvage_value: number | null
          status: string | null
          updated_at: string
          updated_by: string | null
          vehicle_number: string
        }
        Insert: {
          accident_date: string
          accident_mark?: boolean | null
          approved_amount?: number | null
          ari_status?: string
          bl_number?: string | null
          created_at?: string
          created_by?: string | null
          details_of_accident?: string | null
          Driver?: string | null
          estimate_amount?: number | null
          id?: string
          insurer_claim_ref?: string | null
          location?: string | null
          no?: never
          process_details?: string | null
          reported_by?: string | null
          salvage?: boolean | null
          salvage_disposition?: string | null
          salvage_sale_date?: string | null
          salvage_value?: number | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number: string
        }
        Update: {
          accident_date?: string
          accident_mark?: boolean | null
          approved_amount?: number | null
          ari_status?: string
          bl_number?: string | null
          created_at?: string
          created_by?: string | null
          details_of_accident?: string | null
          Driver?: string | null
          estimate_amount?: number | null
          id?: string
          insurer_claim_ref?: string | null
          location?: string | null
          no?: never
          process_details?: string | null
          reported_by?: string | null
          salvage?: boolean | null
          salvage_disposition?: string | null
          salvage_sale_date?: string | null
          salvage_value?: number | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_number?: string
        }
        Relationships: []
      }
      accounting_activity_log: {
        Row: {
          activity_type: string
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          module: string | null
          record_id: string | null
          record_type: string | null
          user_id: string | null
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          record_id?: string | null
          record_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          company_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          company_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          company_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          account_id: string | null
          amount: number
          balance: number
          company_id: string | null
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          status: Database["public"]["Enums"]["ar_ap_status"]
          updated_at: string
          vendor_name: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          balance: number
          company_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          status?: Database["public"]["Enums"]["ar_ap_status"]
          updated_at?: string
          vendor_name: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          balance?: number
          company_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          status?: Database["public"]["Enums"]["ar_ap_status"]
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          account_id: string | null
          amount: number
          balance: number
          company_id: string | null
          created_at: string
          customer_name: string
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          received_amount: number
          status: Database["public"]["Enums"]["ar_ap_status"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          balance: number
          company_id?: string | null
          created_at?: string
          customer_name: string
          due_date: string
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          received_amount?: number
          status?: Database["public"]["Enums"]["ar_ap_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          balance?: number
          company_id?: string | null
          created_at?: string
          customer_name?: string
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          received_amount?: number
          status?: Database["public"]["Enums"]["ar_ap_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          language: string | null
          metadata: Json | null
          role: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          role: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          preferred_language: string | null
          product_interest: string | null
          session_token: string
          status: string | null
          updated_at: string | null
          visitor_email: string | null
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          preferred_language?: string | null
          product_interest?: string | null
          session_token: string
          status?: string | null
          updated_at?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          preferred_language?: string | null
          product_interest?: string | null
          session_token?: string
          status?: string | null
          updated_at?: string | null
          visitor_email?: string | null
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: []
      }
      ai_chatbot_knowledge: {
        Row: {
          answer_en: string
          answer_si: string | null
          answer_ta: string | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question_en: string | null
          question_si: string | null
          question_ta: string | null
          sort_order: number | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          answer_en: string
          answer_si?: string | null
          answer_ta?: string | null
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_en?: string | null
          question_si?: string | null
          question_ta?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          answer_en?: string
          answer_si?: string | null
          answer_ta?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question_en?: string | null
          question_si?: string | null
          question_ta?: string | null
          sort_order?: number | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ap_ageing_buckets: {
        Row: {
          bucket_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          max_days: number | null
          min_days: number
        }
        Insert: {
          bucket_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days: number
        }
        Update: {
          bucket_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days?: number
        }
        Relationships: []
      }
      ap_debit_notes: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          created_by: string | null
          debit_date: string
          debit_note_number: string
          id: string
          journal_entry_id: string | null
          original_invoice_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debit_date: string
          debit_note_number: string
          id?: string
          journal_entry_id?: string | null
          original_invoice_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          debit_date?: string
          debit_note_number?: string
          id?: string
          journal_entry_id?: string | null
          original_invoice_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_debit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_debit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_debit_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_debit_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_invoice_lines: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          line_total: number
          quantity: number | null
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          unit_price: number
          wht_amount: number | null
          wht_rate: number | null
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          line_total: number
          quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price: number
          wht_amount?: number | null
          wht_rate?: number | null
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          line_total?: number
          quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price?: number
          wht_amount?: number | null
          wht_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_invoices: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          balance: number
          bus_id: string | null
          business_unit_code: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          discount_amount: number | null
          due_date: string
          edit_history: Json | null
          grn_id: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          legacy_number: string | null
          notes: string | null
          paid_amount: number | null
          period_id: string | null
          reference: string | null
          route_id: string | null
          school_route_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_bill_number: string | null
          vendor_id: string | null
          wht_amount: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance: number
          bus_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date: string
          edit_history?: Json | null
          grn_id?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          period_id?: string | null
          reference?: string | null
          route_id?: string | null
          school_route_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
          wht_amount?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance?: number
          bus_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount?: number | null
          due_date?: string
          edit_history?: Json | null
          grn_id?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          period_id?: string | null
          reference?: string | null
          route_id?: string | null
          school_route_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
          wht_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_invoices_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_school_route_id_fkey"
            columns: ["school_route_id"]
            isOneToOne: false
            referencedRelation: "school_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_payment_allocations: {
        Row: {
          allocated_amount: number
          company_id: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          payment_id: string | null
          wht_deducted: number | null
          write_off_amount: number | null
        }
        Insert: {
          allocated_amount: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          wht_deducted?: number | null
          write_off_amount?: number | null
        }
        Update: {
          allocated_amount?: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          wht_deducted?: number | null
          write_off_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_payment_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_payment_lines: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          line_total: number | null
          payment_id: string
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number | null
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_total?: number | null
          payment_id: string
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          line_total?: number | null
          payment_id?: string
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_payment_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payment_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payment_lines_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_payments: {
        Row: {
          amount: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          bank_fee_amount: number | null
          bank_fee_type: string | null
          bus_id: string | null
          bus_no: string | null
          business_unit_code: string | null
          cheque_date: string | null
          cheque_number: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          edit_history: Json | null
          id: string
          is_advance: boolean | null
          is_direct_payment: boolean | null
          journal_entry_id: string | null
          legacy_number: string | null
          notes: string | null
          payee_customer_id: string | null
          payee_type: string
          payment_date: string
          payment_method: string | null
          payment_number: string
          reference: string | null
          status: string | null
          total_with_fees: number | null
          updated_at: string | null
          vehicle_type: string | null
          vendor_bank_account_id: string | null
          vendor_bill_number: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bank_fee_amount?: number | null
          bank_fee_type?: string | null
          bus_id?: string | null
          bus_no?: string | null
          business_unit_code?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          edit_history?: Json | null
          id?: string
          is_advance?: boolean | null
          is_direct_payment?: boolean | null
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          payee_customer_id?: string | null
          payee_type?: string
          payment_date: string
          payment_method?: string | null
          payment_number: string
          reference?: string | null
          status?: string | null
          total_with_fees?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
          vendor_bank_account_id?: string | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bank_fee_amount?: number | null
          bank_fee_type?: string | null
          bus_id?: string | null
          bus_no?: string | null
          business_unit_code?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          edit_history?: Json | null
          id?: string
          is_advance?: boolean | null
          is_direct_payment?: boolean | null
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          payee_customer_id?: string | null
          payee_type?: string
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          reference?: string | null
          status?: string | null
          total_with_fees?: number | null
          updated_at?: string | null
          vehicle_type?: string | null
          vendor_bank_account_id?: string | null
          vendor_bill_number?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_payee_customer_id_fkey"
            columns: ["payee_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_vendor_bank_account_id_fkey"
            columns: ["vendor_bank_account_id"]
            isOneToOne: false
            referencedRelation: "vendor_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_reconciliation_items: {
        Row: {
          cleared: boolean
          cleared_amount: number
          cleared_at: string | null
          cleared_by: string | null
          company_id: string | null
          created_at: string
          credit_amount: number
          debit_amount: number
          doc_date: string | null
          doc_number: string | null
          id: string
          reconciliation_id: string
          remarks: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          cleared?: boolean
          cleared_amount?: number
          cleared_at?: string | null
          cleared_by?: string | null
          company_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          reconciliation_id: string
          remarks?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          cleared?: boolean
          cleared_amount?: number
          cleared_at?: string | null
          cleared_by?: string | null
          company_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          reconciliation_id?: string
          remarks?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ap_reconciliation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "ap_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_reconciliations: {
        Row: {
          closing_balance: number | null
          company_id: string | null
          created_at: string | null
          discrepancy_amount: number | null
          id: string
          notes: string | null
          opening_balance: number | null
          period_end: string | null
          period_start: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          status: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_statement_balance: number | null
        }
        Insert: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          discrepancy_amount?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_statement_balance?: number | null
        }
        Update: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          discrepancy_amount?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_statement_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ap_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ap_reconciliations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          ip_whitelist: string[] | null
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
          rate_limit: number | null
          request_count: number | null
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
          rate_limit?: number | null
          request_count?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
          rate_limit?: number | null
          request_count?: number | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_name: string
          cache_hit: boolean | null
          created_at: string
          endpoint: string | null
          estimated_cost: number | null
          id: string
          metadata: Json | null
          query_text: string | null
          response_status: string | null
        }
        Insert: {
          api_name: string
          cache_hit?: boolean | null
          created_at?: string
          endpoint?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          query_text?: string | null
          response_status?: string | null
        }
        Update: {
          api_name?: string
          cache_hit?: boolean | null
          created_at?: string
          endpoint?: string | null
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          query_text?: string | null
          response_status?: string | null
        }
        Relationships: []
      }
      approval_configurations: {
        Row: {
          approver_roles: string[] | null
          company_id: string | null
          created_at: string | null
          document_type: string
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          module: string
          required_approvers: number | null
          sequential_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          approver_roles?: string[] | null
          company_id?: string | null
          created_at?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          module: string
          required_approvers?: number | null
          sequential_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          approver_roles?: string[] | null
          company_id?: string | null
          created_at?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          module?: string
          required_approvers?: number | null
          sequential_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_name_suggestions: {
        Row: {
          created_at: string
          id: string
          last_used_at: string
          name: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string
          name: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string
          name?: string
          usage_count?: number
        }
        Relationships: []
      }
      approval_workflows: {
        Row: {
          approval_order: number | null
          approver_role: string | null
          approver_user_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          max_amount: number | null
          min_amount: number | null
          module: string
          workflow_code: string | null
          workflow_name: string
        }
        Insert: {
          approval_order?: number | null
          approver_role?: string | null
          approver_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          module: string
          workflow_code?: string | null
          workflow_name: string
        }
        Update: {
          approval_order?: number | null
          approver_role?: string | null
          approver_user_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          module?: string
          workflow_code?: string | null
          workflow_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_ageing_buckets: {
        Row: {
          bucket_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          max_days: number | null
          min_days: number
        }
        Insert: {
          bucket_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days: number
        }
        Update: {
          bucket_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days?: number
        }
        Relationships: []
      }
      ar_bad_debt_provisions: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          id: string
          invoice_id: string | null
          journal_entry_id: string | null
          notes: string | null
          provision_amount: number
          provision_date: string
          provision_percentage: number | null
          status: string | null
          write_off_amount: number | null
          write_off_date: string | null
          write_off_journal_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          provision_amount: number
          provision_date: string
          provision_percentage?: number | null
          status?: string | null
          write_off_amount?: number | null
          write_off_date?: string | null
          write_off_journal_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          id?: string
          invoice_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          provision_amount?: number
          provision_date?: string
          provision_percentage?: number | null
          status?: string | null
          write_off_amount?: number | null
          write_off_date?: string | null
          write_off_journal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_bad_debt_provisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_bad_debt_provisions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_bad_debt_provisions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_bad_debt_provisions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_bad_debt_provisions_write_off_journal_id_fkey"
            columns: ["write_off_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_credit_notes: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          created_by: string | null
          credit_date: string
          credit_note_number: string
          customer_id: string | null
          id: string
          journal_entry_id: string | null
          original_invoice_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_date: string
          credit_note_number: string
          customer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          original_invoice_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_date?: string
          credit_note_number?: string
          customer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          original_invoice_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_credit_notes_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_credit_notes_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_invoice_lines: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string | null
          description: string
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string | null
          line_total: number
          quantity: number | null
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string | null
          line_total: number
          quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string | null
          line_total?: number
          quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_invoice_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoice_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_invoices: {
        Row: {
          balance: number
          bus_category_id: string | null
          bus_id: string | null
          bus_no: string | null
          bus_sub_category_id: string | null
          bus_type: string | null
          business_unit_code: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          due_date: string
          edit_history: Json | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_entry_id: string | null
          legacy_number: string | null
          notes: string | null
          paid_amount: number | null
          period_id: string | null
          reference: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          balance: number
          bus_category_id?: string | null
          bus_id?: string | null
          bus_no?: string | null
          bus_sub_category_id?: string | null
          bus_type?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date: string
          edit_history?: Json | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          period_id?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          balance?: number
          bus_category_id?: string | null
          bus_id?: string | null
          bus_no?: string | null
          bus_sub_category_id?: string | null
          bus_type?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date?: string
          edit_history?: Json | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          period_id?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_invoices_bus_category_id_fkey"
            columns: ["bus_category_id"]
            isOneToOne: false
            referencedRelation: "bus_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_bus_sub_category_id_fkey"
            columns: ["bus_sub_category_id"]
            isOneToOne: false
            referencedRelation: "bus_sub_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_receipt_allocations: {
        Row: {
          allocated_amount: number
          company_id: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          receipt_id: string | null
          write_off_amount: number | null
        }
        Insert: {
          allocated_amount: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          receipt_id?: string | null
          write_off_amount?: number | null
        }
        Update: {
          allocated_amount?: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          receipt_id?: string | null
          write_off_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_receipt_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_receipts: {
        Row: {
          amount: number
          bank_account_id: string | null
          bus_id: string | null
          bus_no: string | null
          business_unit_code: string | null
          cheque_date: string | null
          cheque_number: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          edit_history: Json | null
          id: string
          is_advance: boolean | null
          journal_entry_id: string | null
          legacy_number: string | null
          notes: string | null
          override_gl_account_id: string | null
          payment_method: string | null
          receipt_date: string
          receipt_number: string
          reference: string | null
          status: string | null
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          bus_id?: string | null
          bus_no?: string | null
          business_unit_code?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          edit_history?: Json | null
          id?: string
          is_advance?: boolean | null
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          override_gl_account_id?: string | null
          payment_method?: string | null
          receipt_date: string
          receipt_number: string
          reference?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          bus_id?: string | null
          bus_no?: string | null
          business_unit_code?: string | null
          cheque_date?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          edit_history?: Json | null
          id?: string
          is_advance?: boolean | null
          journal_entry_id?: string | null
          legacy_number?: string | null
          notes?: string | null
          override_gl_account_id?: string | null
          payment_method?: string | null
          receipt_date?: string
          receipt_number?: string
          reference?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_receipts_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_receipts_override_gl_account_id_fkey"
            columns: ["override_gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_reconciliation_items: {
        Row: {
          cleared: boolean
          cleared_amount: number
          cleared_at: string | null
          cleared_by: string | null
          company_id: string | null
          created_at: string
          credit_amount: number
          debit_amount: number
          doc_date: string | null
          doc_number: string | null
          id: string
          reconciliation_id: string
          remarks: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          cleared?: boolean
          cleared_amount?: number
          cleared_at?: string | null
          cleared_by?: string | null
          company_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          reconciliation_id: string
          remarks?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          cleared?: boolean
          cleared_amount?: number
          cleared_at?: string | null
          cleared_by?: string | null
          company_id?: string | null
          created_at?: string
          credit_amount?: number
          debit_amount?: number
          doc_date?: string | null
          doc_number?: string | null
          id?: string
          reconciliation_id?: string
          remarks?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ar_reconciliation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "ar_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_reconciliations: {
        Row: {
          closing_balance: number | null
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_statement_balance: number | null
          discrepancy_amount: number | null
          id: string
          notes: string | null
          opening_balance: number | null
          period_end: string | null
          period_start: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_statement_balance?: number | null
          discrepancy_amount?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_statement_balance?: number | null
          discrepancy_amount?: number | null
          id?: string
          notes?: string | null
          opening_balance?: number | null
          period_end?: string | null
          period_start?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_reconciliations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          accumulated_dep_account_id: string | null
          asset_account_id: string | null
          bank_account_id: string | null
          category_code: string
          category_name: string
          company_id: string | null
          created_at: string | null
          depreciation_expense_account_id: string | null
          depreciation_method: string | null
          depreciation_rate: number | null
          gain_loss_disposal_account_id: string | null
          id: string
          is_active: boolean | null
          revaluation_surplus_account_id: string | null
          updated_at: string | null
          useful_life_years: number | null
        }
        Insert: {
          accumulated_dep_account_id?: string | null
          asset_account_id?: string | null
          bank_account_id?: string | null
          category_code: string
          category_name: string
          company_id?: string | null
          created_at?: string | null
          depreciation_expense_account_id?: string | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          gain_loss_disposal_account_id?: string | null
          id?: string
          is_active?: boolean | null
          revaluation_surplus_account_id?: string | null
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Update: {
          accumulated_dep_account_id?: string | null
          asset_account_id?: string | null
          bank_account_id?: string | null
          category_code?: string
          category_name?: string
          company_id?: string | null
          created_at?: string | null
          depreciation_expense_account_id?: string | null
          depreciation_method?: string | null
          depreciation_rate?: number | null
          gain_loss_disposal_account_id?: string | null
          id?: string
          is_active?: boolean | null
          revaluation_surplus_account_id?: string | null
          updated_at?: string | null
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_accumulated_dep_account_id_fkey"
            columns: ["accumulated_dep_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_asset_account_id_fkey"
            columns: ["asset_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_depreciation_expense_account_id_fkey"
            columns: ["depreciation_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_gain_loss_disposal_account_id_fkey"
            columns: ["gain_loss_disposal_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_revaluation_surplus_account_id_fkey"
            columns: ["revaluation_surplus_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_depreciation_schedule: {
        Row: {
          accumulated_depreciation: number
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          depreciation_amount: number
          depreciation_date: string
          id: string
          is_posted: boolean | null
          journal_entry_id: string | null
          net_book_value: number
          period_id: string | null
        }
        Insert: {
          accumulated_depreciation: number
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          depreciation_amount: number
          depreciation_date: string
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          net_book_value: number
          period_id?: string | null
        }
        Update: {
          accumulated_depreciation?: number
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          depreciation_amount?: number
          depreciation_date?: string
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          net_book_value?: number
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_schedule_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_schedule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_schedule_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_schedule_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_disposals: {
        Row: {
          accumulated_depreciation: number
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          asset_id: string
          buyer_name: string | null
          buyer_reference: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          disposal_date: string
          disposal_type: string
          disposal_value: number | null
          gain_loss: number
          id: string
          journal_entry_id: string | null
          net_book_value: number
          notes: string | null
          reason: string | null
        }
        Insert: {
          accumulated_depreciation: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id: string
          buyer_name?: string | null
          buyer_reference?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          disposal_date: string
          disposal_type: string
          disposal_value?: number | null
          gain_loss: number
          id?: string
          journal_entry_id?: string | null
          net_book_value: number
          notes?: string | null
          reason?: string | null
        }
        Update: {
          accumulated_depreciation?: number
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string
          buyer_name?: string | null
          buyer_reference?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          disposal_date?: string
          disposal_type?: string
          disposal_value?: number | null
          gain_loss?: number
          id?: string
          journal_entry_id?: string | null
          net_book_value?: number
          notes?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_logs: {
        Row: {
          asset_id: string | null
          assigned_team_id: string | null
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          completion_notes: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          gl_posted: boolean | null
          id: string
          journal_entry_id: string | null
          maintenance_date: string
          maintenance_number: string | null
          maintenance_type: string | null
          next_due_date: string | null
          notes: string | null
          priority: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gl_posted?: boolean | null
          id?: string
          journal_entry_id?: string | null
          maintenance_date: string
          maintenance_number?: string | null
          maintenance_type?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          gl_posted?: boolean | null
          id?: string
          journal_entry_id?: string | null
          maintenance_date?: string
          maintenance_number?: string | null
          maintenance_type?: string | null
          next_due_date?: string | null
          notes?: string | null
          priority?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_assigned_team_id_fkey"
            columns: ["assigned_team_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_logs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_teams: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          team_code: string | null
          team_lead: string | null
          team_members: string[] | null
          team_name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          team_code?: string | null
          team_lead?: string | null
          team_members?: string[] | null
          team_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          team_code?: string | null
          team_lead?: string | null
          team_members?: string[] | null
          team_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_revaluations: {
        Row: {
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          new_value: number
          old_value: number
          reason: string | null
          revaluation_date: string
          revaluation_surplus: number | null
        }
        Insert: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          new_value: number
          old_value: number
          reason?: string | null
          revaluation_date: string
          revaluation_surplus?: number | null
        }
        Update: {
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          new_value?: number
          old_value?: number
          reason?: string | null
          revaluation_date?: string
          revaluation_surplus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_revaluations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_revaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_revaluations_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          asset_id: string | null
          company_id: string | null
          created_at: string | null
          from_custodian: string | null
          from_department: string | null
          from_location: string | null
          id: string
          reason: string | null
          to_custodian: string | null
          to_department: string | null
          to_location: string | null
          transfer_date: string
          transferred_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          to_custodian?: string | null
          to_department?: string | null
          to_location?: string | null
          transfer_date: string
          transferred_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          company_id?: string | null
          created_at?: string | null
          from_custodian?: string | null
          from_department?: string | null
          from_location?: string | null
          id?: string
          reason?: string | null
          to_custodian?: string | null
          to_department?: string | null
          to_location?: string | null
          transfer_date?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "fixed_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_posting_rules: {
        Row: {
          amount_field: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          rule_code: string | null
          rule_name: string
          source_module: string
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          amount_field?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          rule_code?: string | null
          rule_name: string
          source_module: string
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          amount_field?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          rule_code?: string | null
          rule_name?: string
          source_module?: string
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_posting_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_number: string
          account_type: string | null
          bank_name: string
          branch: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          current_balance: number | null
          gl_account_id: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          notes: string | null
          opening_balance: number | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_number: string
          account_type?: string | null
          bank_name: string
          branch?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_balance?: number | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          notes?: string | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_number?: string
          account_type?: string | null
          bank_name?: string
          branch?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          current_balance?: number | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          notes?: string | null
          opening_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_deposits: {
        Row: {
          amount: number
          bank_account_gl: string
          created_at: string | null
          deposit_date: string
          deposited_by: string | null
          id: string
          notes: string | null
          offset_expenses: Json | null
          reference_no: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_gl: string
          created_at?: string | null
          deposit_date: string
          deposited_by?: string | null
          id?: string
          notes?: string | null
          offset_expenses?: Json | null
          reference_no?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_gl?: string
          created_at?: string | null
          deposit_date?: string
          deposited_by?: string | null
          id?: string
          notes?: string | null
          offset_expenses?: Json | null
          reference_no?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_deposits_deposited_by_fkey"
            columns: ["deposited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_fee_charges: {
        Row: {
          amount: number
          ap_payment_id: string | null
          ar_receipt_id: string | null
          bank_account_id: string | null
          bank_transaction_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          fee_date: string
          fee_type: string
          id: string
          journal_entry_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          ap_payment_id?: string | null
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fee_date?: string
          fee_type?: string
          id?: string
          journal_entry_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          ap_payment_id?: string | null
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_transaction_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fee_date?: string
          fee_type?: string
          id?: string
          journal_entry_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_fee_charges_ap_payment_id_fkey"
            columns: ["ap_payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_fee_charges_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_fee_charges_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_fee_charges_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_fee_charges_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_fee_charges_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliation_items: {
        Row: {
          bank_transaction_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          match_status: string | null
          matched_at: string | null
          matched_by: string | null
          notes: string | null
          reconciliation_id: string | null
          statement_amount: number | null
          statement_date: string | null
          statement_description: string | null
          statement_reference: string | null
        }
        Insert: {
          bank_transaction_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          match_status?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          reconciliation_id?: string | null
          statement_amount?: number | null
          statement_date?: string | null
          statement_description?: string | null
          statement_reference?: string | null
        }
        Update: {
          bank_transaction_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          match_status?: string | null
          matched_at?: string | null
          matched_by?: string | null
          notes?: string | null
          reconciliation_id?: string | null
          statement_amount?: number | null
          statement_date?: string | null
          statement_description?: string | null
          statement_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          adjusted_book_balance: number | null
          bank_account_id: string | null
          book_balance: number
          company_id: string | null
          created_at: string | null
          difference: number | null
          id: string
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          statement_balance: number
          statement_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adjusted_book_balance?: number | null
          bank_account_id?: string | null
          book_balance: number
          company_id?: string | null
          created_at?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          statement_balance: number
          statement_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adjusted_book_balance?: number | null
          bank_account_id?: string | null
          book_balance?: number
          company_id?: string | null
          created_at?: string | null
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          statement_balance?: number
          statement_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          bank_account_id: string | null
          closing_balance: number | null
          company_id: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          id: string
          import_date: string | null
          imported_by: string | null
          matched_count: number | null
          opening_balance: number | null
          statement_end_date: string | null
          statement_start_date: string | null
          status: string | null
          total_credits: number | null
          total_debits: number | null
          transaction_count: number | null
        }
        Insert: {
          bank_account_id?: string | null
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          id?: string
          import_date?: string | null
          imported_by?: string | null
          matched_count?: number | null
          opening_balance?: number | null
          statement_end_date?: string | null
          statement_start_date?: string | null
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
        }
        Update: {
          bank_account_id?: string | null
          closing_balance?: number | null
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          id?: string
          import_date?: string | null
          imported_by?: string | null
          matched_count?: number | null
          opening_balance?: number | null
          statement_end_date?: string | null
          statement_start_date?: string | null
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          bank_account_id: string | null
          cheque_number: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string | null
          id: string
          is_reconciled: boolean | null
          journal_entry_id: string | null
          reconciled_at: string | null
          reconciliation_id: string | null
          reference: string | null
          running_balance: number | null
          source_id: string | null
          source_type: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string | null
          value_date: string | null
        }
        Insert: {
          bank_account_id?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id?: string | null
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          source_id?: string | null
          source_type?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string | null
          value_date?: string | null
        }
        Update: {
          bank_account_id?: string | null
          cheque_number?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          is_reconciled?: boolean | null
          journal_entry_id?: string | null
          reconciled_at?: string | null
          reconciliation_id?: string | null
          reference?: string | null
          running_balance?: number | null
          source_id?: string | null
          source_type?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_numbers: {
        Row: {
          batch_number: string
          company_id: string | null
          created_at: string | null
          expiry_date: string | null
          grn_id: string | null
          id: string
          item_id: string
          location_code: string | null
          manufacture_date: string | null
          notes: string | null
          quantity_available: number
          quantity_received: number
          quantity_reserved: number | null
          status: string | null
          supplier_batch_ref: string | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          batch_number: string
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id: string
          location_code?: string | null
          manufacture_date?: string | null
          notes?: string | null
          quantity_available: number
          quantity_received: number
          quantity_reserved?: number | null
          status?: string | null
          supplier_batch_ref?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          batch_number?: string
          company_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string
          location_code?: string | null
          manufacture_date?: string | null
          notes?: string | null
          quantity_available?: number
          quantity_received?: number
          quantity_reserved?: number | null
          status?: string | null
          supplier_batch_ref?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_numbers_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bin_locations: {
        Row: {
          aisle: string | null
          bin_code: string
          bin_name: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          level: string | null
          rack: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          aisle?: string | null
          bin_code: string
          bin_name?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          level?: string | null
          rack?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          aisle?: string | null
          bin_code?: string
          bin_name?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          level?: string | null
          rack?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bin_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bin_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_periods: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_approvals: {
        Row: {
          approval_level: number
          approved_at: string | null
          approver_id: string
          budget_id: string
          comments: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          approval_level: number
          approved_at?: string | null
          approver_id: string
          budget_id: string
          comments?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          approval_level?: number
          approved_at?: string | null
          approver_id?: string
          budget_id?: string
          comments?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_approvals_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_departments: {
        Row: {
          allocated_amount: number | null
          budget_id: string
          company_id: string | null
          created_at: string | null
          department_code: string | null
          department_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          parent_department_id: string | null
          spent_amount: number | null
          updated_at: string | null
          variance_amount: number | null
        }
        Insert: {
          allocated_amount?: number | null
          budget_id: string
          company_id?: string | null
          created_at?: string | null
          department_code?: string | null
          department_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_department_id?: string | null
          spent_amount?: number | null
          updated_at?: string | null
          variance_amount?: number | null
        }
        Update: {
          allocated_amount?: number | null
          budget_id?: string
          company_id?: string | null
          created_at?: string | null
          department_code?: string | null
          department_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_department_id?: string | null
          spent_amount?: number | null
          updated_at?: string | null
          variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_departments_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "budget_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_line_items: {
        Row: {
          account_id: string | null
          actual_amount: number | null
          budget_amount: number | null
          budget_id: string
          category: string
          company_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          line_item_name: string
          monthly_allocation: Json | null
          notes: string | null
          period_type: string | null
          subcategory: string | null
          updated_at: string | null
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          account_id?: string | null
          actual_amount?: number | null
          budget_amount?: number | null
          budget_id: string
          category: string
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          line_item_name: string
          monthly_allocation?: Json | null
          notes?: string | null
          period_type?: string | null
          subcategory?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          account_id?: string | null
          actual_amount?: number | null
          budget_amount?: number | null
          budget_id?: string
          category?: string
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          line_item_name?: string
          monthly_allocation?: Json | null
          notes?: string | null
          period_type?: string | null
          subcategory?: string | null
          updated_at?: string | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_line_items_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "budget_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_revisions: {
        Row: {
          budget_id: string
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          revised_by: string
          revision_date: string | null
          revision_type: string
        }
        Insert: {
          budget_id: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          revised_by: string
          revision_date?: string | null
          revision_type: string
        }
        Update: {
          budget_id?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          revised_by?: string
          revision_date?: string | null
          revision_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_revisions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          industry_type: string
          is_active: boolean | null
          is_system_template: boolean | null
          template_name: string
          template_structure: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          template_name: string
          template_structure?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          industry_type?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          template_name?: string
          template_structure?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      budgets: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          budget_code: string
          budget_name: string
          budget_period: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string
          fiscal_year: number
          id: string
          is_locked: boolean | null
          parent_budget_id: string | null
          start_date: string
          status: string | null
          template_id: string | null
          total_budget_amount: number | null
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code: string
          budget_name: string
          budget_period: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date: string
          fiscal_year: number
          id?: string
          is_locked?: boolean | null
          parent_budget_id?: string | null
          start_date: string
          status?: string | null
          template_id?: string | null
          total_budget_amount?: number | null
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          budget_code?: string
          budget_name?: string
          budget_period?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string
          fiscal_year?: number
          id?: string
          is_locked?: boolean | null
          parent_budget_id?: string | null
          start_date?: string
          status?: string | null
          template_id?: string | null
          total_budget_amount?: number | null
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_parent_budget_id_fkey"
            columns: ["parent_budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "budget_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_api_connections: {
        Row: {
          api_auth_type: string | null
          api_endpoint: string
          api_key: string | null
          api_name: string
          bus_id: string | null
          bus_no: string
          created_at: string | null
          device_identifier: string | null
          discovered_schema: Json | null
          field_mappings: Json | null
          id: string
          is_active: boolean | null
          last_error_message: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          learned_patterns: Json | null
          sync_interval_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          api_auth_type?: string | null
          api_endpoint: string
          api_key?: string | null
          api_name?: string
          bus_id?: string | null
          bus_no: string
          created_at?: string | null
          device_identifier?: string | null
          discovered_schema?: Json | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          learned_patterns?: Json | null
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          api_auth_type?: string | null
          api_endpoint?: string
          api_key?: string | null
          api_name?: string
          bus_id?: string | null
          bus_no?: string
          created_at?: string | null
          device_identifier?: string | null
          discovered_schema?: Json | null
          field_mappings?: Json | null
          id?: string
          is_active?: boolean | null
          last_error_message?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          learned_patterns?: Json | null
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_api_connections_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: true
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_categories: {
        Row: {
          code: string
          color: string
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bus_category_route_rules: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          matched_buses_count: number | null
          priority: number | null
          route_pattern: string
          sub_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          matched_buses_count?: number | null
          priority?: number | null
          route_pattern: string
          sub_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          matched_buses_count?: number | null
          priority?: number | null
          route_pattern?: string
          sub_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_category_route_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bus_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_category_route_rules_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "bus_sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_daily_mileage: {
        Row: {
          adjustment_reason: string | null
          bus_id: string
          created_at: string | null
          daily_km: number | null
          data_source: string | null
          date: string
          end_odometer_km: number | null
          id: string
          is_adjusted: boolean | null
          start_odometer_km: number | null
          updated_at: string | null
        }
        Insert: {
          adjustment_reason?: string | null
          bus_id: string
          created_at?: string | null
          daily_km?: number | null
          data_source?: string | null
          date: string
          end_odometer_km?: number | null
          id?: string
          is_adjusted?: boolean | null
          start_odometer_km?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustment_reason?: string | null
          bus_id?: string
          created_at?: string | null
          daily_km?: number | null
          data_source?: string | null
          date?: string
          end_odometer_km?: number | null
          id?: string
          is_adjusted?: boolean | null
          start_odometer_km?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_daily_mileage_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_fuel_readings: {
        Row: {
          bus_id: string
          created_at: string | null
          data_source: string | null
          fuel_level_liters: number | null
          fuel_level_percent: number | null
          id: string
          odometer_reading: number | null
          reading_timestamp: string
        }
        Insert: {
          bus_id: string
          created_at?: string | null
          data_source?: string | null
          fuel_level_liters?: number | null
          fuel_level_percent?: number | null
          id?: string
          odometer_reading?: number | null
          reading_timestamp: string
        }
        Update: {
          bus_id?: string
          created_at?: string | null
          data_source?: string | null
          fuel_level_liters?: number | null
          fuel_level_percent?: number | null
          id?: string
          odometer_reading?: number | null
          reading_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_fuel_readings_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_loan_payments: {
        Row: {
          actual_payment_date: string | null
          ap_invoice_id: string | null
          ap_payment_id: string | null
          balance_remaining: number
          created_at: string
          gl_posted: boolean | null
          id: string
          interest_amount: number
          journal_entry_id: string | null
          loan_id: string
          paid_by: string | null
          payment_date: string
          payment_number: number
          payment_proof: string | null
          payment_status: string
          principal_amount: number
          total_installment: number
        }
        Insert: {
          actual_payment_date?: string | null
          ap_invoice_id?: string | null
          ap_payment_id?: string | null
          balance_remaining: number
          created_at?: string
          gl_posted?: boolean | null
          id?: string
          interest_amount: number
          journal_entry_id?: string | null
          loan_id: string
          paid_by?: string | null
          payment_date: string
          payment_number: number
          payment_proof?: string | null
          payment_status?: string
          principal_amount: number
          total_installment: number
        }
        Update: {
          actual_payment_date?: string | null
          ap_invoice_id?: string | null
          ap_payment_id?: string | null
          balance_remaining?: number
          created_at?: string
          gl_posted?: boolean | null
          id?: string
          interest_amount?: number
          journal_entry_id?: string | null
          loan_id?: string
          paid_by?: string | null
          payment_date?: string
          payment_number?: number
          payment_proof?: string | null
          payment_status?: string
          principal_amount?: number
          total_installment?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_loan_payments_ap_invoice_id_fkey"
            columns: ["ap_invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loan_payments_ap_payment_id_fkey"
            columns: ["ap_payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loan_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "bus_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_loans: {
        Row: {
          bus_id: string
          business_unit_code: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          end_date: string
          finance_synced: boolean | null
          id: string
          initial_je_id: string | null
          interest_rate: number
          lender_contact: string | null
          lender_name: string
          loan_amount: number
          loan_tenure_months: number
          loan_type: string
          monthly_installment: number
          notes: string | null
          start_date: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          bus_id: string
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          finance_synced?: boolean | null
          id?: string
          initial_je_id?: string | null
          interest_rate: number
          lender_contact?: string | null
          lender_name: string
          loan_amount: number
          loan_tenure_months: number
          loan_type?: string
          monthly_installment: number
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          bus_id?: string
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          finance_synced?: boolean | null
          id?: string
          initial_je_id?: string | null
          interest_rate?: number
          lender_contact?: string | null
          lender_name?: string
          loan_amount?: number
          loan_tenure_months?: number
          loan_type?: string
          monthly_installment?: number
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_loans_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loans_initial_je_id_fkey"
            columns: ["initial_je_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_loans_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_service_alerts: {
        Row: {
          alert_sent_at: string | null
          alert_type: string
          bus_id: string | null
          created_at: string | null
          external_response: Json | null
          id: string
          next_service_km: number
          status: string | null
          triggered_at_km: number
        }
        Insert: {
          alert_sent_at?: string | null
          alert_type: string
          bus_id?: string | null
          created_at?: string | null
          external_response?: Json | null
          id?: string
          next_service_km: number
          status?: string | null
          triggered_at_km: number
        }
        Update: {
          alert_sent_at?: string | null
          alert_type?: string
          bus_id?: string | null
          created_at?: string | null
          external_response?: Json | null
          id?: string
          next_service_km?: number
          status?: string | null
          triggered_at_km?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_service_alerts_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_sub_categories: {
        Row: {
          category_id: string
          code: string
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_sub_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bus_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_types: {
        Row: {
          avg_km_per_l: number | null
          capacity: number
          created_at: string | null
          features: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          avg_km_per_l?: number | null
          capacity: number
          created_at?: string | null
          features?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          avg_km_per_l?: number | null
          capacity?: number
          created_at?: string | null
          features?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bus_tyres: {
        Row: {
          bus_id: string
          condition_percentage: number | null
          created_at: string | null
          current_km: number | null
          current_tread_depth_mm: number | null
          expected_lifespan_km: number | null
          id: string
          installation_date: string
          km_at_installation: number | null
          last_rotation_date: string | null
          notes: string | null
          nsp_sale_reference_id: string | null
          original_tread_depth_mm: number | null
          position: string
          purchase_cost: number | null
          purchase_date: string | null
          status: string | null
          tyre_brand: string
          tyre_serial_number: string | null
          tyre_size: string
          tyre_type: string | null
          updated_at: string | null
        }
        Insert: {
          bus_id: string
          condition_percentage?: number | null
          created_at?: string | null
          current_km?: number | null
          current_tread_depth_mm?: number | null
          expected_lifespan_km?: number | null
          id?: string
          installation_date: string
          km_at_installation?: number | null
          last_rotation_date?: string | null
          notes?: string | null
          nsp_sale_reference_id?: string | null
          original_tread_depth_mm?: number | null
          position: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string | null
          tyre_brand: string
          tyre_serial_number?: string | null
          tyre_size: string
          tyre_type?: string | null
          updated_at?: string | null
        }
        Update: {
          bus_id?: string
          condition_percentage?: number | null
          created_at?: string | null
          current_km?: number | null
          current_tread_depth_mm?: number | null
          expected_lifespan_km?: number | null
          id?: string
          installation_date?: string
          km_at_installation?: number | null
          last_rotation_date?: string | null
          notes?: string | null
          nsp_sale_reference_id?: string | null
          original_tread_depth_mm?: number | null
          position?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string | null
          tyre_brand?: string
          tyre_serial_number?: string | null
          tyre_size?: string
          tyre_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_tyres_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          base_odometer_date: string | null
          base_odometer_km: number | null
          bus_no: string
          capacity: number
          category_assignment_source: string | null
          category_id: string | null
          chassis_number: string | null
          created_at: string
          current_mileage: number | null
          default_driver_name: string | null
          documents_status: string | null
          driver_phone: string | null
          engine_number: string | null
          expected_km_per_liter: number | null
          id: string
          import_raw_data: Json | null
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_month: string | null
          last_alert_km: number | null
          last_alert_sent_at: string | null
          last_service_date: string | null
          last_service_mileage: number | null
          leasing_bank: string | null
          leasing_end_date: string | null
          model: string
          next_service_date: string | null
          next_service_mileage: number | null
          odometer_source: string | null
          owner_address: string | null
          owner_name: string | null
          owner_nic: string | null
          ownership_type: string | null
          permit_category: string | null
          permit_expiry_date: string | null
          permit_no: string | null
          registration_number: string | null
          revenue_amount: number | null
          revenue_license_expiry: string | null
          route: string | null
          service_interval_km: number | null
          status: Database["public"]["Enums"]["fleet_status"] | null
          sub_category_id: string | null
          total_tyres: number | null
          type: string
          tyre_size_standard: string | null
          updated_at: string
          vehicle_brand: string | null
          vehicle_name: string | null
          year: number
        }
        Insert: {
          base_odometer_date?: string | null
          base_odometer_km?: number | null
          bus_no: string
          capacity: number
          category_assignment_source?: string | null
          category_id?: string | null
          chassis_number?: string | null
          created_at?: string
          current_mileage?: number | null
          default_driver_name?: string | null
          documents_status?: string | null
          driver_phone?: string | null
          engine_number?: string | null
          expected_km_per_liter?: number | null
          id?: string
          import_raw_data?: Json | null
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_month?: string | null
          last_alert_km?: number | null
          last_alert_sent_at?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          leasing_bank?: string | null
          leasing_end_date?: string | null
          model: string
          next_service_date?: string | null
          next_service_mileage?: number | null
          odometer_source?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nic?: string | null
          ownership_type?: string | null
          permit_category?: string | null
          permit_expiry_date?: string | null
          permit_no?: string | null
          registration_number?: string | null
          revenue_amount?: number | null
          revenue_license_expiry?: string | null
          route?: string | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["fleet_status"] | null
          sub_category_id?: string | null
          total_tyres?: number | null
          type: string
          tyre_size_standard?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_name?: string | null
          year: number
        }
        Update: {
          base_odometer_date?: string | null
          base_odometer_km?: number | null
          bus_no?: string
          capacity?: number
          category_assignment_source?: string | null
          category_id?: string | null
          chassis_number?: string | null
          created_at?: string
          current_mileage?: number | null
          default_driver_name?: string | null
          documents_status?: string | null
          driver_phone?: string | null
          engine_number?: string | null
          expected_km_per_liter?: number | null
          id?: string
          import_raw_data?: Json | null
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_month?: string | null
          last_alert_km?: number | null
          last_alert_sent_at?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          leasing_bank?: string | null
          leasing_end_date?: string | null
          model?: string
          next_service_date?: string | null
          next_service_mileage?: number | null
          odometer_source?: string | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nic?: string | null
          ownership_type?: string | null
          permit_category?: string | null
          permit_expiry_date?: string | null
          permit_no?: string | null
          registration_number?: string | null
          revenue_amount?: number | null
          revenue_license_expiry?: string | null
          route?: string | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["fleet_status"] | null
          sub_category_id?: string | null
          total_tyres?: number | null
          type?: string
          tyre_size_standard?: string | null
          updated_at?: string
          vehicle_brand?: string | null
          vehicle_name?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "buses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bus_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_sub_category_id_fkey"
            columns: ["sub_category_id"]
            isOneToOne: false
            referencedRelation: "bus_sub_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_flow_logs: {
        Row: {
          created_at: string
          error_details: string | null
          flow_category: string
          flow_name: string
          id: string
          latency_ms: number | null
          message: string | null
          status: string
          tested_at: string
        }
        Insert: {
          created_at?: string
          error_details?: string | null
          flow_category: string
          flow_name: string
          id?: string
          latency_ms?: number | null
          message?: string | null
          status: string
          tested_at?: string
        }
        Update: {
          created_at?: string
          error_details?: string | null
          flow_category?: string
          flow_name?: string
          id?: string
          latency_ms?: number | null
          message?: string | null
          status?: string
          tested_at?: string
        }
        Relationships: []
      }
      cached_locations: {
        Row: {
          coordinates: Json | null
          created_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          main_text: string
          place_id: string
          place_name: string
          search_terms: string[] | null
        }
        Insert: {
          coordinates?: Json | null
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          main_text: string
          place_id: string
          place_name: string
          search_terms?: string[] | null
        }
        Update: {
          coordinates?: Json | null
          created_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          main_text?: string
          place_id?: string
          place_name?: string
          search_terms?: string[] | null
        }
        Relationships: []
      }
      cashbook_entries: {
        Row: {
          account_id: string | null
          amount: number
          cash_account_id: string | null
          company_id: string | null
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id: string
          journal_entry_id: string | null
          party_id: string | null
          party_name: string | null
          party_type: string | null
          reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          cash_account_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          entry_type: string
          id?: string
          journal_entry_id?: string | null
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          cash_account_id?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          entry_type?: string
          id?: string
          journal_entry_id?: string | null
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashbook_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbook_entries_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbook_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbook_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashbook_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_level: number | null
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          company_id: string | null
          created_at: string
          current_balance: number
          description: string | null
          gl_code: string | null
          id: string
          is_active: boolean
          is_header: boolean | null
          level1: string | null
          level2: string | null
          level3: string | null
          level4: string | null
          level5: string | null
          parent_account_id: string | null
          updated_at: string
        }
        Insert: {
          account_code: string
          account_level?: number | null
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          company_id?: string | null
          created_at?: string
          current_balance?: number
          description?: string | null
          gl_code?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean | null
          level1?: string | null
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
          parent_account_id?: string | null
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_level?: number | null
          account_name?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          company_id?: string | null
          created_at?: string
          current_balance?: number
          description?: string | null
          gl_code?: string | null
          id?: string
          is_active?: boolean
          is_header?: boolean | null
          level1?: string | null
          level2?: string | null
          level3?: string | null
          level4?: string | null
          level5?: string | null
          parent_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cheque_books: {
        Row: {
          bank_account_id: string
          company_id: string | null
          created_at: string | null
          end_number: number
          id: string
          is_active: boolean | null
          next_number: number
          notes: string | null
          prefix: string | null
          start_number: number
          updated_at: string | null
        }
        Insert: {
          bank_account_id: string
          company_id?: string | null
          created_at?: string | null
          end_number: number
          id?: string
          is_active?: boolean | null
          next_number: number
          notes?: string | null
          prefix?: string | null
          start_number: number
          updated_at?: string | null
        }
        Update: {
          bank_account_id?: string
          company_id?: string | null
          created_at?: string | null
          end_number?: number
          id?: string
          is_active?: boolean | null
          next_number?: number
          notes?: string | null
          prefix?: string | null
          start_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheque_books_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_books_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cheque_register: {
        Row: {
          amount: number
          ar_receipt_id: string | null
          bank_account_id: string | null
          bounce_reason: string | null
          bounced_date: string | null
          cancel_reason: string | null
          cancelled_date: string | null
          cheque_date: string
          cheque_number: string
          cheque_type: string | null
          cleared_date: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          memo: string | null
          notes: string | null
          payee: string
          payment_id: string | null
          reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bounce_reason?: string | null
          bounced_date?: string | null
          cancel_reason?: string | null
          cancelled_date?: string | null
          cheque_date: string
          cheque_number: string
          cheque_type?: string | null
          cleared_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          memo?: string | null
          notes?: string | null
          payee: string
          payment_id?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bounce_reason?: string | null
          bounced_date?: string | null
          cancel_reason?: string | null
          cancelled_date?: string | null
          cheque_date?: string
          cheque_number?: string
          cheque_type?: string | null
          cleared_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          memo?: string | null
          notes?: string | null
          payee?: string
          payment_id?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cheque_register_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_register_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_register_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_register_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_upload_history: {
        Row: {
          company_id: string | null
          created_at: string | null
          file_name: string | null
          id: string
          notes: string | null
          status: string
          total_records: number
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_records: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          file_name?: string | null
          id?: string
          notes?: string | null
          status?: string
          total_records?: number
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coa_upload_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cogs_transactions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          item_id: string
          journal_entry_id: string | null
          notes: string | null
          quantity: number
          source_id: string | null
          source_type: string
          total_cost: number
          transaction_date: string
          unit_cost: number
          valuation_method: string
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          item_id: string
          journal_entry_id?: string | null
          notes?: string | null
          quantity: number
          source_id?: string | null
          source_type: string
          total_cost: number
          transaction_date: string
          unit_cost: number
          valuation_method: string
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          journal_entry_id?: string | null
          notes?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string
          total_cost?: number
          transaction_date?: string
          unit_cost?: number
          valuation_method?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cogs_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cogs_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cogs_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_unit_type: string | null
          company_code: string | null
          created_at: string
          default_currency: string | null
          display_order: number | null
          email: string | null
          fiscal_year_start: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          parent_company_id: string | null
          phone: string | null
          registration_number: string | null
          sector: string | null
          short_code: string | null
          tax_registration: string | null
          tax_registration_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_unit_type?: string | null
          company_code?: string | null
          created_at?: string
          default_currency?: string | null
          display_order?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          parent_company_id?: string | null
          phone?: string | null
          registration_number?: string | null
          sector?: string | null
          short_code?: string | null
          tax_registration?: string | null
          tax_registration_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_unit_type?: string | null
          company_code?: string | null
          created_at?: string
          default_currency?: string | null
          display_order?: number | null
          email?: string | null
          fiscal_year_start?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          parent_company_id?: string | null
          phone?: string | null
          registration_number?: string | null
          sector?: string | null
          short_code?: string | null
          tax_registration?: string | null
          tax_registration_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_expense_categories: {
        Row: {
          category_value: string
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          category_value: string
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          category_value?: string
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_trips: {
        Row: {
          avg_speed_kmh: number | null
          behavior_score: number | null
          bus_id: string
          created_at: string | null
          distance_km: number | null
          driver_id: string | null
          end_odometer: number | null
          end_time: string | null
          fuel_consumed_liters: number | null
          fuel_efficiency_kmpl: number | null
          id: string
          max_speed_kmh: number | null
          route_polyline: string | null
          start_odometer: number | null
          start_time: string | null
          trip_date: string
        }
        Insert: {
          avg_speed_kmh?: number | null
          behavior_score?: number | null
          bus_id: string
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          end_odometer?: number | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          id?: string
          max_speed_kmh?: number | null
          route_polyline?: string | null
          start_odometer?: number | null
          start_time?: string | null
          trip_date: string
        }
        Update: {
          avg_speed_kmh?: number | null
          behavior_score?: number | null
          bus_id?: string
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string | null
          end_odometer?: number | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          id?: string
          max_speed_kmh?: number | null
          route_polyline?: string | null
          start_odometer?: number | null
          start_time?: string | null
          trip_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      composite_items: {
        Row: {
          company_id: string | null
          component_item_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          parent_item_id: string | null
          quantity: number
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          component_item_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          parent_item_id?: string | null
          quantity?: number
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          component_item_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          parent_item_id?: string | null
          quantity?: number
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "composite_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_items_component_item_id_fkey"
            columns: ["component_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      conductor_submissions: {
        Row: {
          applied_at: string | null
          applied_to_trip_id: string | null
          bus_number: string | null
          conductor_name: string
          conductor_phone: string
          created_at: string | null
          id: string
          image_url: string
          ocr_data: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status:
            | Database["public"]["Enums"]["conductor_submission_status"]
            | null
          submission_code: string
          trip_date: string | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          applied_to_trip_id?: string | null
          bus_number?: string | null
          conductor_name: string
          conductor_phone: string
          created_at?: string | null
          id?: string
          image_url: string
          ocr_data?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?:
            | Database["public"]["Enums"]["conductor_submission_status"]
            | null
          submission_code: string
          trip_date?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          applied_to_trip_id?: string | null
          bus_number?: string | null
          conductor_name?: string
          conductor_phone?: string
          created_at?: string | null
          id?: string
          image_url?: string
          ocr_data?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?:
            | Database["public"]["Enums"]["conductor_submission_status"]
            | null
          submission_code?: string
          trip_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conductor_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          budget_amount: number | null
          center_code: string
          center_name: string
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          parent_center_id: string | null
        }
        Insert: {
          budget_amount?: number | null
          center_code: string
          center_name: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_center_id?: string | null
        }
        Update: {
          budget_amount?: number | null
          center_code?: string
          center_name?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_center_id_fkey"
            columns: ["parent_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          company_id: string | null
          created_at: string | null
          currency_code: string
          currency_name: string
          decimal_places: number | null
          id: string
          is_active: boolean | null
          is_base_currency: boolean | null
          symbol: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          currency_code: string
          currency_name: string
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          is_base_currency?: boolean | null
          symbol?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          currency_code?: string
          currency_name?: string
          decimal_places?: number | null
          id?: string
          is_active?: boolean | null
          is_base_currency?: boolean | null
          symbol?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currencies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          company_id: string | null
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_system: boolean | null
          name: string
          report_type: string
          source_table: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          name: string
          report_type?: string
          source_table: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          name?: string
          report_type?: string
          source_table?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_categories: {
        Row: {
          advance_account_id: string | null
          ar_account_id: string | null
          category_code: string
          category_name: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          revenue_account_id: string | null
          updated_at: string
        }
        Insert: {
          advance_account_id?: string | null
          ar_account_id?: string | null
          category_code: string
          category_name: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          revenue_account_id?: string | null
          updated_at?: string
        }
        Update: {
          advance_account_id?: string | null
          ar_account_id?: string | null
          category_code?: string
          category_name?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          revenue_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_categories_advance_account_id_fkey"
            columns: ["advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_categories_ar_account_id_fkey"
            columns: ["ar_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_categories_revenue_account_id_fkey"
            columns: ["revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access: {
        Row: {
          created_at: string | null
          customer_id: string
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          login_count: number | null
          otp_code: string | null
          otp_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
          otp_code?: string | null
          otp_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          portal_access_id: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          portal_access_id: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          portal_access_id?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_sessions_portal_access_id_fkey"
            columns: ["portal_access_id"]
            isOneToOne: false
            referencedRelation: "customer_portal_access"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_lists: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_primary: boolean | null
          price_list_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_primary?: boolean | null
          price_list_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_primary?: boolean | null
          price_list_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_price_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_price_lists_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_support_requests: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          message: string
          portal_access_id: string | null
          priority: string | null
          related_invoice_id: string | null
          resolved_at: string | null
          response_notes: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          message: string
          portal_access_id?: string | null
          priority?: string | null
          related_invoice_id?: string | null
          resolved_at?: string | null
          response_notes?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          message?: string
          portal_access_id?: string | null
          priority?: string | null
          related_invoice_id?: string | null
          resolved_at?: string | null
          response_notes?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_support_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_requests_portal_access_id_fkey"
            columns: ["portal_access_id"]
            isOneToOne: false
            referencedRelation: "customer_portal_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_support_requests_related_invoice_id_fkey"
            columns: ["related_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          ar_account_id: string | null
          billing_address: string | null
          business_registration_no: string | null
          business_unit_code: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          credit_used: number | null
          currency: string | null
          customer_category_id: string | null
          customer_code: string
          customer_name: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          legacy_number: string | null
          nic_passport: string | null
          normalized_phone: string | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          shipping_address: string | null
          source_module: string | null
          source_record_id: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          ar_account_id?: string | null
          billing_address?: string | null
          business_registration_no?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          credit_used?: number | null
          currency?: string | null
          customer_category_id?: string | null
          customer_code: string
          customer_name: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legacy_number?: string | null
          nic_passport?: string | null
          normalized_phone?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: string | null
          source_module?: string | null
          source_record_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ar_account_id?: string | null
          billing_address?: string | null
          business_registration_no?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          credit_used?: number | null
          currency?: string | null
          customer_category_id?: string | null
          customer_code?: string
          customer_name?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legacy_number?: string | null
          nic_passport?: string | null
          normalized_phone?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          shipping_address?: string | null
          source_module?: string | null
          source_record_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_ar_account_id_fkey"
            columns: ["ar_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_bus_expenses: {
        Row: {
          accident_compensation: number | null
          body_wash: number | null
          bus_id: string
          created_at: string | null
          created_by: string | null
          diesel_price_per_liter: number | null
          emission_fitness: number | null
          expense_date: string
          food: number | null
          fuel_cost: number | null
          fuel_liters: number | null
          gl_posted: boolean | null
          highway_charges: number | null
          id: string
          journal_entry_id: string | null
          legal_court: number | null
          log_sheet: number | null
          notes: string | null
          ntc: number | null
          other: number | null
          parking: number | null
          permits_renewal: number | null
          police: number | null
          repair: number | null
          runner: number | null
          salary: number | null
          short_misc: number | null
          staff_accommodation: number | null
          temporary_permit: number | null
          total_daily_expenses: number | null
          tyre_tube: number | null
          updated_at: string | null
          vehicle_hire: number | null
        }
        Insert: {
          accident_compensation?: number | null
          body_wash?: number | null
          bus_id: string
          created_at?: string | null
          created_by?: string | null
          diesel_price_per_liter?: number | null
          emission_fitness?: number | null
          expense_date: string
          food?: number | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          gl_posted?: boolean | null
          highway_charges?: number | null
          id?: string
          journal_entry_id?: string | null
          legal_court?: number | null
          log_sheet?: number | null
          notes?: string | null
          ntc?: number | null
          other?: number | null
          parking?: number | null
          permits_renewal?: number | null
          police?: number | null
          repair?: number | null
          runner?: number | null
          salary?: number | null
          short_misc?: number | null
          staff_accommodation?: number | null
          temporary_permit?: number | null
          total_daily_expenses?: number | null
          tyre_tube?: number | null
          updated_at?: string | null
          vehicle_hire?: number | null
        }
        Update: {
          accident_compensation?: number | null
          body_wash?: number | null
          bus_id?: string
          created_at?: string | null
          created_by?: string | null
          diesel_price_per_liter?: number | null
          emission_fitness?: number | null
          expense_date?: string
          food?: number | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          gl_posted?: boolean | null
          highway_charges?: number | null
          id?: string
          journal_entry_id?: string | null
          legal_court?: number | null
          log_sheet?: number | null
          notes?: string | null
          ntc?: number | null
          other?: number | null
          parking?: number | null
          permits_renewal?: number | null
          police?: number | null
          repair?: number | null
          runner?: number | null
          salary?: number | null
          short_misc?: number | null
          staff_accommodation?: number | null
          temporary_permit?: number | null
          total_daily_expenses?: number | null
          tyre_tube?: number | null
          updated_at?: string | null
          vehicle_hire?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_bus_expenses_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_bus_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "daily_bus_expenses_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash_settlements: {
        Row: {
          actual_cash: number
          bus_id: string | null
          cashier_id: string | null
          created_at: string | null
          expected_cash: number
          id: string
          notes: string | null
          overage: number
          settlement_date: string
          shortage: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cash?: number
          bus_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          expected_cash?: number
          id?: string
          notes?: string | null
          overage?: number
          settlement_date: string
          shortage?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cash?: number
          bus_id?: string | null
          cashier_id?: string | null
          created_at?: string | null
          expected_cash?: number
          id?: string
          notes?: string | null
          overage?: number
          settlement_date?: string
          shortage?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_settlements_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cash_settlements_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_trips: {
        Row: {
          audit_log: Json | null
          bus_id: string
          conductor_id: string | null
          created_at: string
          created_by: string | null
          data_source: Database["public"]["Enums"]["data_source_type"] | null
          diesel_price_per_liter: number | null
          distance_km: number | null
          driver_id: string | null
          end_time: string | null
          entry_deadline_exceeded: boolean | null
          fuel_cost: number | null
          fuel_liters: number | null
          gl_posted: boolean | null
          id: string
          income: number | null
          income_details: Json | null
          journal_entry_id: string | null
          km_per_liter: number | null
          late_entry_request_id: string | null
          net_income: number | null
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          other_expenses: number | null
          other_expenses_details: Json | null
          performance_score: number | null
          route_id: string | null
          route_label: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["trip_status"] | null
          total_expenses: number | null
          trip_date: string
          trip_no: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          audit_log?: Json | null
          bus_id: string
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: Database["public"]["Enums"]["data_source_type"] | null
          diesel_price_per_liter?: number | null
          distance_km?: number | null
          driver_id?: string | null
          end_time?: string | null
          entry_deadline_exceeded?: boolean | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          gl_posted?: boolean | null
          id?: string
          income?: number | null
          income_details?: Json | null
          journal_entry_id?: string | null
          km_per_liter?: number | null
          late_entry_request_id?: string | null
          net_income?: number | null
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          other_expenses?: number | null
          other_expenses_details?: Json | null
          performance_score?: number | null
          route_id?: string | null
          route_label?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          total_expenses?: number | null
          trip_date?: string
          trip_no?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          audit_log?: Json | null
          bus_id?: string
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: Database["public"]["Enums"]["data_source_type"] | null
          diesel_price_per_liter?: number | null
          distance_km?: number | null
          driver_id?: string | null
          end_time?: string | null
          entry_deadline_exceeded?: boolean | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          gl_posted?: boolean | null
          id?: string
          income?: number | null
          income_details?: Json | null
          journal_entry_id?: string | null
          km_per_liter?: number | null
          late_entry_request_id?: string | null
          net_income?: number | null
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          other_expenses?: number | null
          other_expenses_details?: Json | null
          performance_score?: number | null
          route_id?: string | null
          route_label?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trip_status"] | null
          total_expenses?: number | null
          trip_date?: string
          trip_no?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trips_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trips_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trips_late_entry_request_id_fkey"
            columns: ["late_entry_request_id"]
            isOneToOne: false
            referencedRelation: "late_entry_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      data_archive_policies: {
        Row: {
          archive_after_days: number | null
          archived_records_count: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_archive_run: string | null
          retention_days: number
          table_name: string
          updated_at: string | null
        }
        Insert: {
          archive_after_days?: number | null
          archived_records_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_archive_run?: string | null
          retention_days: number
          table_name: string
          updated_at?: string | null
        }
        Update: {
          archive_after_days?: number | null
          archived_records_count?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_archive_run?: string | null
          retention_days?: number
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_note_lines: {
        Row: {
          batch_number: string | null
          created_at: string | null
          delivery_note_id: string | null
          id: string
          item_id: string | null
          quantity: number
          serial_numbers: string[] | null
          so_line_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          serial_numbers?: string[] | null
          so_line_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          delivery_note_id?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          serial_numbers?: string[] | null
          so_line_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_lines_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_lines_so_line_id_fkey"
            columns: ["so_line_id"]
            isOneToOne: false
            referencedRelation: "sales_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_date: string
          dn_number: string
          driver_name: string | null
          id: string
          notes: string | null
          sales_order_id: string | null
          shipping_address: string | null
          status: string | null
          updated_at: string | null
          vehicle_number: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string
          dn_number: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          sales_order_id?: string | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string
          dn_number?: string
          driver_name?: string | null
          id?: string
          notes?: string | null
          sales_order_id?: string | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approval_date: string
          approval_type: string
          approver_name: string
          company_id: string | null
          created_at: string
          document_id: string | null
          id: string
          signature_data: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approval_date?: string
          approval_type: string
          approver_name: string
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          signature_data?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approval_date?: string
          approval_type?: string
          approver_name?: string
          company_id?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          signature_data?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_approvals_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_storage"
            referencedColumns: ["id"]
          },
        ]
      }
      document_storage: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          document_data: string
          document_status: string
          document_type: string
          email_sent_at: string | null
          email_sent_by: string | null
          email_status: string | null
          file_name: string
          file_size: number | null
          generated_at: string
          generated_by: string | null
          id: string
          invoice_status: string | null
          payment_id: string | null
          payment_type: string
          quotation_id: string
          ready_to_send: boolean | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_data: string
          document_status?: string
          document_type: string
          email_sent_at?: string | null
          email_sent_by?: string | null
          email_status?: string | null
          file_name: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_status?: string | null
          payment_id?: string | null
          payment_type: string
          quotation_id: string
          ready_to_send?: boolean | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_data?: string
          document_status?: string
          document_type?: string
          email_sent_at?: string | null
          email_sent_by?: string | null
          email_status?: string | null
          file_name?: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_status?: string | null
          payment_id?: string | null
          payment_type?: string
          quotation_id?: string
          ready_to_send?: boolean | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_storage_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "special_hire_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_types: {
        Row: {
          available_placeholders: Json | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          module: string
          type_code: string
          type_name: string
        }
        Insert: {
          available_placeholders?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          module?: string
          type_code: string
          type_name: string
        }
        Update: {
          available_placeholders?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          module?: string
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          css_styles: string | null
          footer_text: string | null
          header_image_url: string | null
          header_mode: string | null
          html_content: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          margins: Json | null
          orientation: string | null
          paper_size: string | null
          template_code: string | null
          template_name: string
          template_type_id: string | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          css_styles?: string | null
          footer_text?: string | null
          header_image_url?: string | null
          header_mode?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margins?: Json | null
          orientation?: string | null
          paper_size?: string | null
          template_code?: string | null
          template_name: string
          template_type_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          css_styles?: string | null
          footer_text?: string | null
          header_image_url?: string | null
          header_mode?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          margins?: Json | null
          orientation?: string | null
          paper_size?: string | null
          template_code?: string | null
          template_name?: string
          template_type_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_template_type_id_fkey"
            columns: ["template_type_id"]
            isOneToOne: false
            referencedRelation: "document_template_types"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          changes_made: Json | null
          created_at: string
          document_data: Json
          document_status: string
          document_type: string
          generated_pdf_path: string | null
          id: string
          quotation_id: string
          updated_at: string
          version_number: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          changes_made?: Json | null
          created_at?: string
          document_data: Json
          document_status?: string
          document_type: string
          generated_pdf_path?: string | null
          id?: string
          quotation_id: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          changes_made?: Json | null
          created_at?: string
          document_data?: Json
          document_status?: string
          document_type?: string
          generated_pdf_path?: string | null
          id?: string
          quotation_id?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          linked_row_id: string
          linked_table: string
          storage_path: string
          tag: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          linked_row_id: string
          linked_table: string
          storage_path: string
          tag?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          linked_row_id?: string
          linked_table?: string
          storage_path?: string
          tag?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      driver_allocations: {
        Row: {
          allocation_date: string
          bus_id: string | null
          conductor_id: string | null
          created_at: string
          created_by: string | null
          driver_id: string | null
          end_time: string | null
          id: string
          notes: string | null
          route_id: string | null
          start_time: string | null
          status: string
          trip_id: string
          updated_at: string
          whatsapp_sent: boolean | null
        }
        Insert: {
          allocation_date?: string
          bus_id?: string | null
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          start_time?: string | null
          status?: string
          trip_id: string
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Update: {
          allocation_date?: string
          bus_id?: string | null
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          start_time?: string | null
          status?: string
          trip_id?: string
          updated_at?: string
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_allocations_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_allocations_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_behavior_events: {
        Row: {
          actual_value: number | null
          bus_id: string
          created_at: string | null
          driver_id: string | null
          event_timestamp: string
          event_type: string
          id: string
          latitude: number | null
          location_description: string | null
          longitude: number | null
          severity: string | null
          speed_kmh: number | null
          threshold_value: number | null
        }
        Insert: {
          actual_value?: number | null
          bus_id: string
          created_at?: string | null
          driver_id?: string | null
          event_timestamp: string
          event_type: string
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          severity?: string | null
          speed_kmh?: number | null
          threshold_value?: number | null
        }
        Update: {
          actual_value?: number | null
          bus_id?: string
          created_at?: string | null
          driver_id?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          severity?: string | null
          speed_kmh?: number | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_behavior_events_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_behavior_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_scorecards: {
        Row: {
          created_at: string | null
          driver_id: string
          excessive_idle_count: number | null
          harsh_acceleration_count: number | null
          harsh_braking_count: number | null
          id: string
          safety_rating: string | null
          score_period_end: string
          score_period_start: string
          sharp_turn_count: number | null
          speeding_count: number | null
          total_distance_km: number | null
          total_score: number | null
          total_trips: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          excessive_idle_count?: number | null
          harsh_acceleration_count?: number | null
          harsh_braking_count?: number | null
          id?: string
          safety_rating?: string | null
          score_period_end: string
          score_period_start: string
          sharp_turn_count?: number | null
          speeding_count?: number | null
          total_distance_km?: number | null
          total_score?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          excessive_idle_count?: number | null
          harsh_acceleration_count?: number | null
          harsh_braking_count?: number | null
          id?: string
          safety_rating?: string | null
          score_period_end?: string
          score_period_start?: string
          sharp_turn_count?: number | null
          speeding_count?: number | null
          total_distance_km?: number | null
          total_score?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_scorecards_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_training: {
        Row: {
          created_at: string
          created_by: string | null
          documents: Json | null
          driver_id: string
          driver_name: string
          duration: number | null
          id: string
          instructor_email: string | null
          instructor_name: string | null
          instructor_phone: string | null
          notes: string | null
          status: string
          training_date: string
          training_id: string
          training_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          documents?: Json | null
          driver_id: string
          driver_name: string
          duration?: number | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          instructor_phone?: string | null
          notes?: string | null
          status?: string
          training_date: string
          training_id: string
          training_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          documents?: Json | null
          driver_id?: string
          driver_name?: string
          duration?: number | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          instructor_phone?: string | null
          notes?: string | null
          status?: string
          training_date?: string
          training_id?: string
          training_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_training_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string
          from_currency: string
          id: string
          rate: number
          source: string | null
          to_currency: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          from_currency: string
          id?: string
          rate: number
          source?: string | null
          to_currency: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          from_currency?: string
          id?: string
          rate?: number
          source?: string | null
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_kpi_targets: {
        Row: {
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          kpi_key: string
          kpi_name: string
          max_value: number | null
          min_acceptable: number | null
          target_value: number
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpi_key: string
          kpi_name: string
          max_value?: number | null
          min_acceptable?: number | null
          target_value: number
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          kpi_key?: string
          kpi_name?: string
          max_value?: number | null
          min_acceptable?: number | null
          target_value?: number
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_requests: {
        Row: {
          additional_docs: Json | null
          amount: number
          ap_invoice_id: string | null
          ap_payment_id: string | null
          approved_by: string | null
          bank_account_id: string | null
          bus_id: string | null
          business_unit_code: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_category: string
          expense_subcategory: string | null
          fuel_liters: number | null
          fuel_price_per_liter: number | null
          gl_posted: boolean | null
          id: string
          iou_id: string | null
          journal_entry_id: string | null
          notes: string | null
          ocr_fields_modified: string[] | null
          payment_method: string | null
          petty_cash_fund_id: string | null
          receipt_attachment_url: string | null
          receipt_ocr_data: Json | null
          request_date: string
          request_number: string
          reviewed_by: string | null
          status: string
          updated_at: string | null
          vendor_id: string | null
          vendor_name_draft: string | null
        }
        Insert: {
          additional_docs?: Json | null
          amount?: number
          ap_invoice_id?: string | null
          ap_payment_id?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bus_id?: string | null
          business_unit_code: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category: string
          expense_subcategory?: string | null
          fuel_liters?: number | null
          fuel_price_per_liter?: number | null
          gl_posted?: boolean | null
          id?: string
          iou_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          ocr_fields_modified?: string[] | null
          payment_method?: string | null
          petty_cash_fund_id?: string | null
          receipt_attachment_url?: string | null
          receipt_ocr_data?: Json | null
          request_date?: string
          request_number: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name_draft?: string | null
        }
        Update: {
          additional_docs?: Json | null
          amount?: number
          ap_invoice_id?: string | null
          ap_payment_id?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          bus_id?: string | null
          business_unit_code?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category?: string
          expense_subcategory?: string | null
          fuel_liters?: number | null
          fuel_price_per_liter?: number | null
          gl_posted?: boolean | null
          id?: string
          iou_id?: string | null
          journal_entry_id?: string | null
          notes?: string | null
          ocr_fields_modified?: string[] | null
          payment_method?: string | null
          petty_cash_fund_id?: string | null
          receipt_attachment_url?: string | null
          receipt_ocr_data?: Json | null
          request_date?: string
          request_number?: string
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name_draft?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_requests_ap_invoice_id_fkey"
            columns: ["ap_invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_ap_payment_id_fkey"
            columns: ["ap_payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_iou_id_fkey"
            columns: ["iou_id"]
            isOneToOne: false
            referencedRelation: "iou_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_petty_cash_fund_id_fkey"
            columns: ["petty_cash_fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_comments: {
        Row: {
          comment_text: string
          created_at: string
          feedback_id: string
          id: string
          is_internal: boolean | null
          user_id: string
          user_name: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          feedback_id: string
          id?: string
          is_internal?: boolean | null
          user_id: string
          user_name: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          feedback_id?: string
          id?: string
          is_internal?: boolean | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_complaints: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          category: string
          created_at: string
          current_handler: string | null
          current_handler_name: string | null
          description: string
          escalated_at: string | null
          escalation_level: number | null
          feedback_date: string
          feedback_id: string | null
          id: string
          priority: string | null
          related_persons: Json | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by_name: string | null
          sla_due_date: string | null
          staff_group: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category: string
          created_at?: string
          current_handler?: string | null
          current_handler_name?: string | null
          description: string
          escalated_at?: string | null
          escalation_level?: number | null
          feedback_date?: string
          feedback_id?: string | null
          id?: string
          priority?: string | null
          related_persons?: Json | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          sla_due_date?: string | null
          staff_group?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          current_handler?: string | null
          current_handler_name?: string | null
          description?: string
          escalated_at?: string | null
          escalation_level?: number | null
          feedback_date?: string
          feedback_id?: string | null
          id?: string
          priority?: string | null
          related_persons?: Json | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          sla_due_date?: string | null
          staff_group?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_complaints_current_handler_fkey"
            columns: ["current_handler"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_complaints_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_escalations: {
        Row: {
          created_at: string
          escalated_by: string
          escalated_by_name: string
          escalation_reason: string | null
          feedback_id: string
          from_level: number
          id: string
          to_level: number
        }
        Insert: {
          created_at?: string
          escalated_by: string
          escalated_by_name: string
          escalation_reason?: string | null
          feedback_id: string
          from_level: number
          id?: string
          to_level: number
        }
        Update: {
          created_at?: string
          escalated_by?: string
          escalated_by_name?: string
          escalation_reason?: string | null
          feedback_id?: string
          from_level?: number
          id?: string
          to_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedback_escalations_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_complaints"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_item_history: {
        Row: {
          action_by: string | null
          action_by_name: string | null
          action_type: string
          created_at: string | null
          feedback_item_id: string
          id: string
          level: number
          metadata: Json | null
          new_status: string | null
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          action_by?: string | null
          action_by_name?: string | null
          action_type: string
          created_at?: string | null
          feedback_item_id: string
          id?: string
          level: number
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          action_by?: string | null
          action_by_name?: string | null
          action_type?: string
          created_at?: string | null
          feedback_item_id?: string
          id?: string
          level?: number
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_item_history_feedback_item_id_fkey"
            columns: ["feedback_item_id"]
            isOneToOne: false
            referencedRelation: "feedback_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_items: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          category: string | null
          created_at: string | null
          current_level: number
          description: string | null
          due_date: string | null
          escalation_reason: string | null
          feedback_complaint_id: string | null
          id: string
          item_number: number
          meeting_id: string | null
          priority: string | null
          raised_by_name: string | null
          raised_by_staff_id: string | null
          resolution: string | null
          resolved_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          created_at?: string | null
          current_level?: number
          description?: string | null
          due_date?: string | null
          escalation_reason?: string | null
          feedback_complaint_id?: string | null
          id?: string
          item_number?: number
          meeting_id?: string | null
          priority?: string | null
          raised_by_name?: string | null
          raised_by_staff_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          created_at?: string | null
          current_level?: number
          description?: string | null
          due_date?: string | null
          escalation_reason?: string | null
          feedback_complaint_id?: string | null
          id?: string
          item_number?: number
          meeting_id?: string | null
          priority?: string | null
          raised_by_name?: string | null
          raised_by_staff_id?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_items_feedback_complaint_id_fkey"
            columns: ["feedback_complaint_id"]
            isOneToOne: false
            referencedRelation: "feedback_complaints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "feedback_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_levels: {
        Row: {
          can_escalate_to: number | null
          color_code: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level_name: string
          level_number: number
          required_role: Database["public"]["Enums"]["app_role"] | null
          sla_days: number | null
          updated_at: string | null
        }
        Insert: {
          can_escalate_to?: number | null
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_name: string
          level_number: number
          required_role?: Database["public"]["Enums"]["app_role"] | null
          sla_days?: number | null
          updated_at?: string | null
        }
        Update: {
          can_escalate_to?: number | null
          color_code?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level_name?: string
          level_number?: number
          required_role?: Database["public"]["Enums"]["app_role"] | null
          sla_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_meetings: {
        Row: {
          action_items: Json | null
          attendees: Json | null
          conducted_by: string | null
          conducted_by_name: string | null
          created_at: string | null
          id: string
          level: number
          meeting_date: string
          meeting_time: string | null
          meeting_type: string
          notes: string | null
          previous_meeting_id: string | null
          status: string | null
          summary: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          attendees?: Json | null
          conducted_by?: string | null
          conducted_by_name?: string | null
          created_at?: string | null
          id?: string
          level: number
          meeting_date: string
          meeting_time?: string | null
          meeting_type?: string
          notes?: string | null
          previous_meeting_id?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          attendees?: Json | null
          conducted_by?: string | null
          conducted_by_name?: string | null
          created_at?: string | null
          id?: string
          level?: number
          meeting_date?: string
          meeting_time?: string | null
          meeting_type?: string
          notes?: string | null
          previous_meeting_id?: string | null
          status?: string | null
          summary?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_meetings_previous_meeting_id_fkey"
            columns: ["previous_meeting_id"]
            isOneToOne: false
            referencedRelation: "feedback_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_status: string | null
          company_id: string | null
          created_at: string
          end_date: string
          fiscal_year: number | null
          id: string
          is_closed: boolean
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          period_name: string
          period_number: number | null
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_status?: string | null
          company_id?: string | null
          created_at?: string
          end_date: string
          fiscal_year?: number | null
          id?: string
          is_closed?: boolean
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          period_name: string
          period_number?: number | null
          start_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_status?: string | null
          company_id?: string | null
          created_at?: string
          end_date?: string
          fiscal_year?: number | null
          id?: string
          is_closed?: boolean
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          period_name?: string
          period_number?: number | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_code: string
          asset_name: string
          capitalization_date: string | null
          category_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          current_value: number | null
          custodian: string | null
          department: string | null
          description: string | null
          disposal_date: string | null
          disposal_gain_loss: number | null
          disposal_journal_id: string | null
          disposal_method: string | null
          disposal_value: number | null
          id: string
          location: string | null
          manufacturer: string | null
          model_number: string | null
          net_book_value: number | null
          purchase_cost: number
          purchase_date: string | null
          purchase_invoice_id: string | null
          salvage_value: number | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
          warranty_expiry: string | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_code: string
          asset_name: string
          capitalization_date?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          custodian?: string | null
          department?: string | null
          description?: string | null
          disposal_date?: string | null
          disposal_gain_loss?: number | null
          disposal_journal_id?: string | null
          disposal_method?: string | null
          disposal_value?: number | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model_number?: string | null
          net_book_value?: number | null
          purchase_cost?: number
          purchase_date?: string | null
          purchase_invoice_id?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_code?: string
          asset_name?: string
          capitalization_date?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          custodian?: string | null
          department?: string | null
          description?: string | null
          disposal_date?: string | null
          disposal_gain_loss?: number | null
          disposal_journal_id?: string | null
          disposal_method?: string | null
          disposal_value?: number | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          model_number?: string | null
          net_book_value?: number | null
          purchase_cost?: number
          purchase_date?: string | null
          purchase_invoice_id?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_disposal_journal_id_fkey"
            columns: ["disposal_journal_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_analytics_daily: {
        Row: {
          analytics_date: string
          avg_speed_kmh: number | null
          behavior_events_count: number | null
          bus_id: string
          created_at: string | null
          fuel_consumed_liters: number | null
          fuel_efficiency_kmpl: number | null
          id: string
          max_speed_kmh: number | null
          safety_score: number | null
          total_distance_km: number | null
          total_idle_time_minutes: number | null
          total_trips: number | null
          updated_at: string | null
        }
        Insert: {
          analytics_date: string
          avg_speed_kmh?: number | null
          behavior_events_count?: number | null
          bus_id: string
          created_at?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          id?: string
          max_speed_kmh?: number | null
          safety_score?: number | null
          total_distance_km?: number | null
          total_idle_time_minutes?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Update: {
          analytics_date?: string
          avg_speed_kmh?: number | null
          behavior_events_count?: number | null
          bus_id?: string
          created_at?: string | null
          fuel_consumed_liters?: number | null
          fuel_efficiency_kmpl?: number | null
          id?: string
          max_speed_kmh?: number | null
          safety_score?: number | null
          total_distance_km?: number | null
          total_idle_time_minutes?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_analytics_daily_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_master_roster: {
        Row: {
          bus_id: string | null
          bus_type: string | null
          created_at: string
          day_target: number | null
          default_conductor: string | null
          default_driver: string | null
          id: string
          is_active: boolean
          permit_type: string | null
          remark: string | null
          route_id: string | null
          route_label: string | null
          route_start_date: string | null
          section: string | null
          sort_order: number | null
          trips_per_day: number
          turn_01_time: string | null
          turn_02_time: string | null
          updated_at: string
        }
        Insert: {
          bus_id?: string | null
          bus_type?: string | null
          created_at?: string
          day_target?: number | null
          default_conductor?: string | null
          default_driver?: string | null
          id?: string
          is_active?: boolean
          permit_type?: string | null
          remark?: string | null
          route_id?: string | null
          route_label?: string | null
          route_start_date?: string | null
          section?: string | null
          sort_order?: number | null
          trips_per_day?: number
          turn_01_time?: string | null
          turn_02_time?: string | null
          updated_at?: string
        }
        Update: {
          bus_id?: string | null
          bus_type?: string | null
          created_at?: string
          day_target?: number | null
          default_conductor?: string | null
          default_driver?: string | null
          id?: string
          is_active?: boolean
          permit_type?: string | null
          remark?: string | null
          route_id?: string | null
          route_label?: string | null
          route_start_date?: string | null
          section?: string | null
          sort_order?: number | null
          trips_per_day?: number
          turn_01_time?: string | null
          turn_02_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_master_roster_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: true
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_master_roster_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      frequency_rules: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          params: Json
          rule_type: Database["public"]["Enums"]["frequency_rule_type"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          params?: Json
          rule_type: Database["public"]["Enums"]["frequency_rule_type"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          params?: Json
          rule_type?: Database["public"]["Enums"]["frequency_rule_type"]
        }
        Relationships: []
      }
      fuel_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_timestamp: string | null
          alert_type: string
          bus_id: string
          created_at: string | null
          fuel_drop_amount: number | null
          fuel_level_percent: number | null
          id: string
          notes: string | null
          odometer_reading: number | null
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_timestamp?: string | null
          alert_type: string
          bus_id: string
          created_at?: string | null
          fuel_drop_amount?: number | null
          fuel_level_percent?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_timestamp?: string | null
          alert_type?: string
          bus_id?: string
          created_at?: string | null
          fuel_drop_amount?: number | null
          fuel_level_percent?: number | null
          id?: string
          notes?: string | null
          odometer_reading?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_alerts_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_consumption_logs: {
        Row: {
          bus_id: string
          created_at: string | null
          created_by: string | null
          fuel_cost: number | null
          fuel_filled_liters: number | null
          fuel_station: string | null
          id: string
          log_date: string
          notes: string | null
          odometer_at_fillup: number | null
        }
        Insert: {
          bus_id: string
          created_at?: string | null
          created_by?: string | null
          fuel_cost?: number | null
          fuel_filled_liters?: number | null
          fuel_station?: string | null
          id?: string
          log_date: string
          notes?: string | null
          odometer_at_fillup?: number | null
        }
        Update: {
          bus_id?: string
          created_at?: string | null
          created_by?: string | null
          fuel_cost?: number | null
          fuel_filled_liters?: number | null
          fuel_station?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          odometer_at_fillup?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fuel_consumption_logs_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_settings: {
        Row: {
          created_at: string | null
          diesel_price_lkr_per_l: number
          id: string
          is_default: boolean | null
          maintenance_rate_lkr_per_km: number | null
          parking_lat: number | null
          parking_lng: number | null
          parking_location_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          diesel_price_lkr_per_l?: number
          id?: string
          is_default?: boolean | null
          maintenance_rate_lkr_per_km?: number | null
          parking_lat?: number | null
          parking_lng?: number | null
          parking_location_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          diesel_price_lkr_per_l?: number
          id?: string
          is_default?: boolean | null
          maintenance_rate_lkr_per_km?: number | null
          parking_lat?: number | null
          parking_lng?: number | null
          parking_location_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fund_transfers: {
        Row: {
          amount: number
          bank_charges: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          from_bank_account_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          reference: string | null
          status: string | null
          to_bank_account_id: string | null
          transfer_date: string
          transfer_number: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_charges?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_bank_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          to_bank_account_id?: string | null
          transfer_date: string
          transfer_number: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_charges?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_bank_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          to_bank_account_id?: string | null
          transfer_date?: string
          transfer_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_transfers_from_bank_account_id_fkey"
            columns: ["from_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_transfers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_transfers_to_bank_account_id_fkey"
            columns: ["to_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_posting_log: {
        Row: {
          company_id: string
          error_message: string | null
          id: string
          journal_entry_id: string | null
          mapping_id: string | null
          notes: string | null
          posted_amount: number
          posted_at: string | null
          posted_by: string | null
          source_record_id: string
          source_table: string
          status: string | null
        }
        Insert: {
          company_id: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          mapping_id?: string | null
          notes?: string | null
          posted_amount: number
          posted_at?: string | null
          posted_by?: string | null
          source_record_id: string
          source_table: string
          status?: string | null
        }
        Update: {
          company_id?: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          mapping_id?: string | null
          notes?: string | null
          posted_amount?: number
          posted_at?: string | null
          posted_by?: string | null
          source_record_id?: string
          source_table?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_posting_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_log_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_posting_log_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "module_gl_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_settings: {
        Row: {
          bank_account_id: string | null
          company_id: string
          created_at: string
          customer_advance_account_id: string | null
          default_expense_account_id: string | null
          expense_account_id: string | null
          id: string
          input_tax_account_id: string | null
          sales_revenue_account_id: string | null
          tax_payable_account_id: string | null
          trade_payable_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string
          wht_payable_account_id: string | null
        }
        Insert: {
          bank_account_id?: string | null
          company_id: string
          created_at?: string
          customer_advance_account_id?: string | null
          default_expense_account_id?: string | null
          expense_account_id?: string | null
          id?: string
          input_tax_account_id?: string | null
          sales_revenue_account_id?: string | null
          tax_payable_account_id?: string | null
          trade_payable_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string
          wht_payable_account_id?: string | null
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string
          created_at?: string
          customer_advance_account_id?: string | null
          default_expense_account_id?: string | null
          expense_account_id?: string | null
          id?: string
          input_tax_account_id?: string | null
          sales_revenue_account_id?: string | null
          tax_payable_account_id?: string | null
          trade_payable_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string
          wht_payable_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_customer_advance_account_id_fkey"
            columns: ["customer_advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_default_expense_account_id_fkey"
            columns: ["default_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_input_tax_account_id_fkey"
            columns: ["input_tax_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_tax_payable_account_id_fkey"
            columns: ["tax_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_trade_payable_account_id_fkey"
            columns: ["trade_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_settings_wht_payable_account_id_fkey"
            columns: ["wht_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          grn_id: string
          id: string
          item_id: string | null
          line_total: number | null
          ordered_quantity: number | null
          po_line_id: string | null
          received_quantity: number
          unit_price: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          grn_id: string
          id?: string
          item_id?: string | null
          line_total?: number | null
          ordered_quantity?: number | null
          po_line_id?: string | null
          received_quantity: number
          unit_price?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          grn_id?: string
          id?: string
          item_id?: string | null
          line_total?: number | null
          ordered_quantity?: number | null
          po_line_id?: string | null
          received_quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_notes: {
        Row: {
          company_id: string | null
          created_at: string | null
          grn_number: string
          id: string
          notes: string | null
          po_id: string | null
          quality_check_date: string | null
          quality_checked_by: string | null
          receipt_date: string
          received_by: string | null
          status: string | null
          total_value: number | null
          vendor_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          grn_number: string
          id?: string
          notes?: string | null
          po_id?: string | null
          quality_check_date?: string | null
          quality_checked_by?: string | null
          receipt_date: string
          received_by?: string | null
          status?: string | null
          total_value?: number | null
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          grn_number?: string
          id?: string
          notes?: string | null
          po_id?: string | null
          quality_check_date?: string | null
          quality_checked_by?: string | null
          receipt_date?: string
          received_by?: string | null
          status?: string | null
          total_value?: number | null
          vendor_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_notes_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_notes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_notes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_audit_log: {
        Row: {
          action: string
          id: string
          item_id: string | null
          new_value: Json | null
          occurrence_id: string | null
          old_value: Json | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          occurrence_id?: string | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          id?: string
          item_id?: string | null
          new_value?: Json | null
          occurrence_id?: string | null
          old_value?: Json | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_audit_log_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "governance_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_audit_log_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "governance_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          frequency_rule_id: string
          id: string
          is_active: boolean | null
          location: string | null
          notes: string | null
          owner_email: string
          owner_name: string
          sbu_id: string | null
          status: Database["public"]["Enums"]["governance_item_status"] | null
          submission_rule_id: string | null
          title: string
          type: Database["public"]["Enums"]["governance_item_type"]
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          frequency_rule_id: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          owner_email: string
          owner_name: string
          sbu_id?: string | null
          status?: Database["public"]["Enums"]["governance_item_status"] | null
          submission_rule_id?: string | null
          title: string
          type: Database["public"]["Enums"]["governance_item_type"]
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          frequency_rule_id?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          owner_email?: string
          owner_name?: string
          sbu_id?: string | null
          status?: Database["public"]["Enums"]["governance_item_status"] | null
          submission_rule_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["governance_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_items_frequency_rule_id_fkey"
            columns: ["frequency_rule_id"]
            isOneToOne: false
            referencedRelation: "frequency_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_items_sbu_id_fkey"
            columns: ["sbu_id"]
            isOneToOne: false
            referencedRelation: "sbus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_items_submission_rule_id_fkey"
            columns: ["submission_rule_id"]
            isOneToOne: false
            referencedRelation: "submission_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_notifications: {
        Row: {
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          occurrence_id: string
          recipient_email: string
          sent_at: string
          status: Database["public"]["Enums"]["notification_status"] | null
        }
        Insert: {
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          occurrence_id: string
          recipient_email: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"] | null
        }
        Update: {
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          occurrence_id?: string
          recipient_email?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["notification_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_notifications_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "governance_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_occurrences: {
        Row: {
          adjusted_reason: string | null
          attachments: Json | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by_engine_at: string | null
          id: string
          is_holiday_adjusted: boolean | null
          item_id: string
          manual_override: boolean | null
          notes: string | null
          original_rule_text: string | null
          original_scheduled_date: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["governance_item_status"] | null
          updated_at: string
        }
        Insert: {
          adjusted_reason?: string | null
          attachments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by_engine_at?: string | null
          id?: string
          is_holiday_adjusted?: boolean | null
          item_id: string
          manual_override?: boolean | null
          notes?: string | null
          original_rule_text?: string | null
          original_scheduled_date?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["governance_item_status"] | null
          updated_at?: string
        }
        Update: {
          adjusted_reason?: string | null
          attachments?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by_engine_at?: string | null
          id?: string
          is_holiday_adjusted?: boolean | null
          item_id?: string
          manual_override?: boolean | null
          notes?: string | null
          original_rule_text?: string | null
          original_scheduled_date?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["governance_item_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "governance_occurrences_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "governance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_location_history: {
        Row: {
          altitude_meters: number | null
          bus_id: string
          created_at: string | null
          data_source: string | null
          fuel_level_percent: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          odometer_reading: number | null
          speed_kmh: number | null
          timestamp: string
        }
        Insert: {
          altitude_meters?: number | null
          bus_id: string
          created_at?: string | null
          data_source?: string | null
          fuel_level_percent?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          odometer_reading?: number | null
          speed_kmh?: number | null
          timestamp: string
        }
        Update: {
          altitude_meters?: number | null
          bus_id?: string
          created_at?: string | null
          data_source?: string | null
          fuel_level_percent?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          odometer_reading?: number | null
          speed_kmh?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_location_history_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_lines: {
        Row: {
          accepted_quantity: number | null
          batch_number: string | null
          company_id: string | null
          expiry_date: string | null
          grn_id: string | null
          id: string
          item_id: string | null
          line_total: number | null
          ordered_quantity: number | null
          po_line_id: string | null
          received_quantity: number
          rejected_quantity: number | null
          rejection_reason: string | null
          serial_number: string | null
          unit_cost: number | null
        }
        Insert: {
          accepted_quantity?: number | null
          batch_number?: string | null
          company_id?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          ordered_quantity?: number | null
          po_line_id?: string | null
          received_quantity: number
          rejected_quantity?: number | null
          rejection_reason?: string | null
          serial_number?: string | null
          unit_cost?: number | null
        }
        Update: {
          accepted_quantity?: number | null
          batch_number?: string | null
          company_id?: string | null
          expiry_date?: string | null
          grn_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          ordered_quantity?: number | null
          po_line_id?: string | null
          received_quantity?: number
          rejected_quantity?: number | null
          rejection_reason?: string | null
          serial_number?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "po_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_rate_cards: {
        Row: {
          bus_type_id: string | null
          created_at: string | null
          effective_from: string
          effective_to: string | null
          exceeding_km_rate_lkr: number | null
          exceeding_km_threshold: number | null
          flat_fee_lkr: number | null
          free_exceeding_km: number | null
          from_km: number
          hire_type: string
          id: string
          is_active: boolean | null
          overnight_charge_lkr_per_day: number | null
          overtime_rate_lkr_per_hour: number | null
          rate_per_km_lkr: number | null
          standard_hours: number | null
          to_km: number | null
          updated_at: string | null
        }
        Insert: {
          bus_type_id?: string | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          exceeding_km_rate_lkr?: number | null
          exceeding_km_threshold?: number | null
          flat_fee_lkr?: number | null
          free_exceeding_km?: number | null
          from_km?: number
          hire_type: string
          id?: string
          is_active?: boolean | null
          overnight_charge_lkr_per_day?: number | null
          overtime_rate_lkr_per_hour?: number | null
          rate_per_km_lkr?: number | null
          standard_hours?: number | null
          to_km?: number | null
          updated_at?: string | null
        }
        Update: {
          bus_type_id?: string | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          exceeding_km_rate_lkr?: number | null
          exceeding_km_threshold?: number | null
          flat_fee_lkr?: number | null
          free_exceeding_km?: number | null
          from_km?: number
          hire_type?: string
          id?: string
          is_active?: boolean | null
          overnight_charge_lkr_per_day?: number | null
          overtime_rate_lkr_per_hour?: number | null
          rate_per_km_lkr?: number | null
          standard_hours?: number | null
          to_km?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hire_rate_cards_bus_type_id_fkey"
            columns: ["bus_type_id"]
            isOneToOne: false
            referencedRelation: "bus_types"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          country: string | null
          created_at: string | null
          holiday_date: string
          holiday_name: string
          id: string
          is_mercantile: boolean | null
          is_recurring: boolean | null
          type: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          holiday_date: string
          holiday_name: string
          id?: string
          is_mercantile?: boolean | null
          is_recurring?: boolean | null
          type?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          holiday_date?: string
          holiday_name?: string
          id?: string
          is_mercantile?: boolean | null
          is_recurring?: boolean | null
          type?: string | null
        }
        Relationships: []
      }
      inquiry_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          id: string
          inquiry_id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          id?: string
          inquiry_id: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          id?: string
          inquiry_id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_activity_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_follow_ups: {
        Row: {
          completed_at: string | null
          completion_status: string | null
          created_at: string
          created_by: string | null
          follow_up_type: string
          id: string
          inquiry_id: string
          location: string | null
          next_follow_up_date: string | null
          notes: string
          outcome: string | null
          outcome_notes: string | null
          planned_date: string | null
          planned_duration_minutes: number | null
          reminder_date: string | null
          reminder_sent: boolean | null
        }
        Insert: {
          completed_at?: string | null
          completion_status?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_type: string
          id?: string
          inquiry_id: string
          location?: string | null
          next_follow_up_date?: string | null
          notes: string
          outcome?: string | null
          outcome_notes?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
        }
        Update: {
          completed_at?: string | null
          completion_status?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_type?: string
          id?: string
          inquiry_id?: string
          location?: string | null
          next_follow_up_date?: string | null
          notes?: string
          outcome?: string | null
          outcome_notes?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_follow_ups_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_hub_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_hub_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_criteria: {
        Row: {
          acceptance_criteria: string | null
          created_at: string | null
          criteria_name: string
          criteria_type: string | null
          id: string
          is_mandatory: boolean | null
          max_value: number | null
          min_value: number | null
          sequence: number | null
          template_id: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          created_at?: string | null
          criteria_name: string
          criteria_type?: string | null
          id?: string
          is_mandatory?: boolean | null
          max_value?: number | null
          min_value?: number | null
          sequence?: number | null
          template_id?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          created_at?: string | null
          criteria_name?: string
          criteria_type?: string | null
          id?: string
          is_mandatory?: boolean | null
          max_value?: number | null
          min_value?: number | null
          sequence?: number | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_criteria_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          applicable_to: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          inspection_type: string | null
          is_active: boolean | null
          template_code: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          applicable_to?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspection_type?: string | null
          is_active?: boolean | null
          template_code?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          applicable_to?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspection_type?: string | null
          is_active?: boolean | null
          template_code?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_records: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          bus_id: string
          coverage_amount: number | null
          created_at: string
          driver_id: string | null
          expiry_date: string
          id: string
          insurance_company: string
          issue_date: string
          notes: string | null
          policy_number: string
          policy_type: string
          premium_amount: number | null
          reminder_threshold_days: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bus_id: string
          coverage_amount?: number | null
          created_at?: string
          driver_id?: string | null
          expiry_date: string
          id?: string
          insurance_company: string
          issue_date: string
          notes?: string | null
          policy_number: string
          policy_type: string
          premium_amount?: number | null
          reminder_threshold_days?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bus_id?: string
          coverage_amount?: number | null
          created_at?: string
          driver_id?: string | null
          expiry_date?: string
          id?: string
          insurance_company?: string
          issue_date?: string
          notes?: string | null
          policy_number?: string
          policy_type?: string
          premium_amount?: number | null
          reminder_threshold_days?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_records_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inter_bank_transfers: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          created_by: string | null
          from_bank_account_id: string
          from_gl_account_id: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          reference: string | null
          status: string | null
          to_bank_account_id: string
          to_gl_account_id: string
          transfer_date: string
          transfer_number: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_bank_account_id: string
          from_gl_account_id: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          to_bank_account_id: string
          to_gl_account_id: string
          transfer_date: string
          transfer_number: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_bank_account_id?: string
          from_gl_account_id?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          reference?: string | null
          status?: string | null
          to_bank_account_id?: string
          to_gl_account_id?: string
          transfer_date?: string
          transfer_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inter_bank_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_bank_transfers_from_bank_account_id_fkey"
            columns: ["from_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_bank_transfers_from_gl_account_id_fkey"
            columns: ["from_gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_bank_transfers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_bank_transfers_to_bank_account_id_fkey"
            columns: ["to_bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_bank_transfers_to_gl_account_id_fkey"
            columns: ["to_gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      intercompany_reconciliations: {
        Row: {
          company_id: string | null
          created_at: string
          details: Json | null
          difference: number | null
          id: string
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          status: string
          unit_a_balance: number
          unit_a_id: string
          unit_b_balance: number
          unit_b_id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: Json | null
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          status?: string
          unit_a_balance?: number
          unit_a_id: string
          unit_b_balance?: number
          unit_b_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: Json | null
          difference?: number | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          status?: string
          unit_a_balance?: number
          unit_a_id?: string
          unit_b_balance?: number
          unit_b_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intercompany_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_reconciliations_unit_a_id_fkey"
            columns: ["unit_a_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercompany_reconciliations_unit_b_id_fkey"
            columns: ["unit_b_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ageing_config: {
        Row: {
          bucket_name: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          max_days: number | null
          min_days: number
        }
        Insert: {
          bucket_name: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days: number
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          max_days?: number | null
          min_days?: number
        }
        Relationships: []
      }
      iou_records: {
        Row: {
          amount: number
          balance: number | null
          business_unit_code: string
          company_id: string | null
          created_at: string | null
          due_date: string | null
          expense_request_ids: string[] | null
          id: string
          iou_number: string
          issued_by: string | null
          issued_date: string
          journal_entry_id: string | null
          purpose: string | null
          settled_amount: number | null
          staff_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          balance?: number | null
          business_unit_code: string
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          expense_request_ids?: string[] | null
          id?: string
          iou_number: string
          issued_by?: string | null
          issued_date?: string
          journal_entry_id?: string | null
          purpose?: string | null
          settled_amount?: number | null
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          balance?: number | null
          business_unit_code?: string
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          expense_request_ids?: string[] | null
          id?: string
          iou_number?: string
          issued_by?: string | null
          issued_date?: string
          journal_entry_id?: string | null
          purpose?: string | null
          settled_amount?: number | null
          staff_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iou_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iou_records_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iou_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          category_code: string | null
          category_name: string
          cogs_account_id: string | null
          company_id: string | null
          created_at: string | null
          id: string
          inventory_account_id: string | null
          is_active: boolean | null
          parent_category_id: string | null
          sales_account_id: string | null
          valuation_method: string | null
        }
        Insert: {
          category_code?: string | null
          category_name: string
          cogs_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          inventory_account_id?: string | null
          is_active?: boolean | null
          parent_category_id?: string | null
          sales_account_id?: string | null
          valuation_method?: string | null
        }
        Update: {
          category_code?: string | null
          category_name?: string
          cogs_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          inventory_account_id?: string | null
          is_active?: boolean | null
          parent_category_id?: string | null
          sales_account_id?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_categories_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      item_stock: {
        Row: {
          average_cost: number | null
          company_id: string | null
          id: string
          item_id: string | null
          last_issue_date: string | null
          last_receipt_date: string | null
          quantity_available: number | null
          quantity_on_hand: number | null
          quantity_reserved: number | null
          total_value: number | null
          warehouse_id: string | null
        }
        Insert: {
          average_cost?: number | null
          company_id?: string | null
          id?: string
          item_id?: string | null
          last_issue_date?: string | null
          last_receipt_date?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          total_value?: number | null
          warehouse_id?: string | null
        }
        Update: {
          average_cost?: number | null
          company_id?: string | null
          id?: string
          item_id?: string | null
          last_issue_date?: string | null
          last_receipt_date?: string | null
          quantity_available?: number | null
          quantity_on_hand?: number | null
          quantity_reserved?: number | null
          total_value?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_batch_tracked: boolean | null
          is_serialized: boolean | null
          item_code: string
          item_name: string
          item_type: string | null
          last_purchase_price: number | null
          lead_time_days: number | null
          maximum_stock: number | null
          minimum_stock: number | null
          reorder_level: number | null
          reorder_quantity: number | null
          selling_price: number | null
          standard_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
          valuation_method: string | null
        }
        Insert: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_batch_tracked?: boolean | null
          is_serialized?: boolean | null
          item_code: string
          item_name: string
          item_type?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          selling_price?: number | null
          standard_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Update: {
          category_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_batch_tracked?: boolean | null
          is_serialized?: boolean | null
          item_code?: string
          item_name?: string
          item_type?: string | null
          last_purchase_price?: number | null
          lead_time_days?: number | null
          maximum_stock?: number | null
          minimum_stock?: number | null
          reorder_level?: number | null
          reorder_quantity?: number | null
          selling_price?: number | null
          standard_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          business_unit_code: string | null
          business_unit_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: string
          id: string
          is_recurring: boolean | null
          is_reversal: boolean | null
          legacy_number: string | null
          next_run_date: string | null
          period_id: string | null
          posted_at: string | null
          posted_by: string | null
          recurring_frequency: string | null
          reference: string | null
          reversed_entry_id: string | null
          source_module: string | null
          status: Database["public"]["Enums"]["journal_status"]
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_unit_code?: string | null
          business_unit_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          entry_number: string
          id?: string
          is_recurring?: boolean | null
          is_reversal?: boolean | null
          legacy_number?: string | null
          next_run_date?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          recurring_frequency?: string | null
          reference?: string | null
          reversed_entry_id?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_unit_code?: string | null
          business_unit_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: string
          id?: string
          is_recurring?: boolean | null
          is_reversal?: boolean | null
          legacy_number?: string | null
          next_run_date?: string | null
          period_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          recurring_frequency?: string | null
          reference?: string | null
          reversed_entry_id?: string | null
          source_module?: string | null
          status?: Database["public"]["Enums"]["journal_status"]
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_approvals: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          approver_name: string | null
          comments: string | null
          company_id: string | null
          created_at: string | null
          entry_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          approver_name?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string | null
          entry_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          approver_name?: string | null
          comments?: string | null
          company_id?: string | null
          created_at?: string | null
          entry_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_approvals_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          bus_id: string | null
          business_unit_code: string | null
          company_id: string | null
          cost_center_id: string | null
          created_at: string
          credit: number
          debit: number
          description: string | null
          expense_id: string | null
          id: string
          journal_entry_id: string
          location_id: string | null
          project_id: string | null
          route_id: string | null
          segment_id: string | null
          trip_id: string | null
        }
        Insert: {
          account_id: string
          bus_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          expense_id?: string | null
          id?: string
          journal_entry_id: string
          location_id?: string | null
          project_id?: string | null
          route_id?: string | null
          segment_id?: string | null
          trip_id?: string | null
        }
        Update: {
          account_id?: string
          bus_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          expense_id?: string | null
          id?: string
          journal_entry_id?: string
          location_id?: string | null
          project_id?: string | null
          route_id?: string | null
          segment_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "daily_bus_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "daily_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      landed_cost_charges: {
        Row: {
          amount: number
          charge_type: string
          created_at: string | null
          description: string | null
          expense_account_id: string | null
          id: string
          vendor_id: string | null
          voucher_id: string | null
        }
        Insert: {
          amount: number
          charge_type: string
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          vendor_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          amount?: number
          charge_type?: string
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          vendor_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landed_cost_charges_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_charges_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_charges_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "landed_cost_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      landed_cost_items: {
        Row: {
          allocated_cost: number | null
          created_at: string | null
          final_cost: number
          grn_line_id: string | null
          id: string
          item_id: string | null
          original_cost: number
          voucher_id: string | null
        }
        Insert: {
          allocated_cost?: number | null
          created_at?: string | null
          final_cost: number
          grn_line_id?: string | null
          id?: string
          item_id?: string | null
          original_cost: number
          voucher_id?: string | null
        }
        Update: {
          allocated_cost?: number | null
          created_at?: string | null
          final_cost?: number
          grn_line_id?: string | null
          id?: string
          item_id?: string | null
          original_cost?: number
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landed_cost_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_items_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "landed_cost_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      landed_cost_vouchers: {
        Row: {
          allocation_method: string | null
          business_unit_code: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          grn_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          posting_date: string
          status: string | null
          total_additional_cost: number | null
          updated_at: string | null
          voucher_number: string
        }
        Insert: {
          allocation_method?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          grn_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posting_date?: string
          status?: string | null
          total_additional_cost?: number | null
          updated_at?: string | null
          voucher_number: string
        }
        Update: {
          allocation_method?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          grn_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posting_date?: string
          status?: string | null
          total_additional_cost?: number | null
          updated_at?: string | null
          voucher_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "landed_cost_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_vouchers_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landed_cost_vouchers_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      late_entry_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["late_entry_status"] | null
          trip_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason: string
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["late_entry_status"] | null
          trip_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["late_entry_status"] | null
          trip_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "late_entry_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "late_entry_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      leasing_finance_settings: {
        Row: {
          ap_prefix: string | null
          auto_create_ap_invoice: boolean | null
          auto_create_vendor: boolean | null
          auto_post_gl_on_payment: boolean | null
          bank_account_id: string | null
          business_unit_code: string | null
          company_id: string | null
          created_at: string | null
          gl_prefix: string | null
          id: string
          interest_expense_account_id: string | null
          lease_asset_account_id: string | null
          leasing_liability_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          ap_prefix?: string | null
          auto_create_ap_invoice?: boolean | null
          auto_create_vendor?: boolean | null
          auto_post_gl_on_payment?: boolean | null
          bank_account_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          gl_prefix?: string | null
          id?: string
          interest_expense_account_id?: string | null
          lease_asset_account_id?: string | null
          leasing_liability_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ap_prefix?: string | null
          auto_create_ap_invoice?: boolean | null
          auto_create_vendor?: boolean | null
          auto_post_gl_on_payment?: boolean | null
          bank_account_id?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          created_at?: string | null
          gl_prefix?: string | null
          id?: string
          interest_expense_account_id?: string | null
          lease_asset_account_id?: string | null
          leasing_liability_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leasing_finance_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leasing_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leasing_finance_settings_interest_expense_account_id_fkey"
            columns: ["interest_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leasing_finance_settings_lease_asset_account_id_fkey"
            columns: ["lease_asset_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leasing_finance_settings_leasing_liability_account_id_fkey"
            columns: ["leasing_liability_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_addons: {
        Row: {
          addon_name: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          addon_name: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          addon_name?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lightvehicle_cash_receipts: {
        Row: {
          amount: number
          amount_in_words: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_contact: string | null
          customer_name: string | null
          customer_signature_data: string | null
          customer_signature_type: string | null
          customer_signed_at: string | null
          customer_signer_name: string | null
          finance_signature_data: string | null
          finance_signature_type: string | null
          finance_signed_at: string | null
          finance_signer_name: string | null
          id: string
          order_id: string | null
          payment_id: string | null
          payment_method: string | null
          pdf_url: string | null
          product_description: string | null
          quotation_no: string | null
          receipt_date: string
          receipt_no: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_in_words?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_in_words?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_cash_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_cash_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_customer_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_customer_payments: {
        Row: {
          amount: number
          ar_receipt_id: string | null
          bank_account_id: string | null
          bank_name: string | null
          cheque_no: string | null
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          order_id: string | null
          payment_date: string
          payment_method: string | null
          payment_schedule_id: string | null
          payment_slip_url: string | null
          receipt_url: string | null
          reference_number: string | null
          status: string | null
          verification_status: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          cheque_no?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_date: string
          payment_method?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          verification_status?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          cheque_no?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          receipt_url?: string | null
          reference_number?: string | null
          status?: string | null
          verification_status?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_customer_payments_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_customer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_customer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_customer_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_customer_payments_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_customers: {
        Row: {
          address: string | null
          business_registration: string | null
          company_name: string | null
          created_at: string | null
          customer_name: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          nic_number: string | null
          notes: string | null
          phone: string | null
          tax_registration: string | null
          total_orders: number | null
          total_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_registration?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          nic_number?: string | null
          notes?: string | null
          phone?: string | null
          tax_registration?: string | null
          total_orders?: number | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_registration?: string | null
          company_name?: string | null
          created_at?: string | null
          customer_name?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          nic_number?: string | null
          notes?: string | null
          phone?: string | null
          tax_registration?: string | null
          total_orders?: number | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lightvehicle_customization_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          option_type: string
          option_value: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          option_type: string
          option_value: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          option_type?: string
          option_value?: string
        }
        Relationships: []
      }
      lightvehicle_finance_settings: {
        Row: {
          auto_create_customer: boolean | null
          auto_post_on_verify: boolean | null
          commission_expense_account_id: string | null
          company_id: string
          created_at: string | null
          customer_advance_account_id: string | null
          default_bank_account_id: string | null
          discount_expense_account_id: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          lc_bank_account_id: string | null
          receipt_prefix: string | null
          sales_revenue_account_id: string | null
          spare_parts_revenue_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string | null
          vat_output_account_id: string | null
          wht_payable_account_id: string | null
        }
        Insert: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Update: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_finance_settings_commission_expense_account_i_fkey"
            columns: ["commission_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_customer_advance_account_id_fkey"
            columns: ["customer_advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_discount_expense_account_id_fkey"
            columns: ["discount_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_lc_bank_account_id_fkey"
            columns: ["lc_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_spare_parts_revenue_account__fkey"
            columns: ["spare_parts_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_vat_output_account_id_fkey"
            columns: ["vat_output_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_finance_settings_wht_payable_account_id_fkey"
            columns: ["wht_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_invoice_documents: {
        Row: {
          created_at: string | null
          document_data: string | null
          document_status: string | null
          document_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          invoice_record_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_data?: string | null
          document_status?: string | null
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          invoice_record_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_data?: string | null
          document_status?: string | null
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          invoice_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_invoice_documents_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_invoice_records"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_invoice_records: {
        Row: {
          amount: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          finance_company_address: string | null
          finance_company_name: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          invoice_category: string | null
          invoice_data: Json | null
          invoice_number: string
          invoice_type: string | null
          order_id: string | null
          proforma_amount: number | null
          proforma_amount_percentage: number | null
          proforma_purpose: string | null
          quotation_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          invoice_category?: string | null
          invoice_data?: Json | null
          invoice_number: string
          invoice_type?: string | null
          order_id?: string | null
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          invoice_category?: string | null
          invoice_data?: Json | null
          invoice_number?: string
          invoice_type?: string | null
          order_id?: string | null
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_invoice_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_invoice_records_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_invoice_signatures: {
        Row: {
          id: string
          invoice_record_id: string | null
          signature_data: string | null
          signature_role: string
          signature_type: string | null
          signed_at: string | null
          signed_by: string | null
          signer_name: string
        }
        Insert: {
          id?: string
          invoice_record_id?: string | null
          signature_data?: string | null
          signature_role: string
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signer_name: string
        }
        Update: {
          id?: string
          invoice_record_id?: string | null
          signature_data?: string | null
          signature_role?: string
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_invoice_signatures_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_invoice_records"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_model_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          model_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          model_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          model_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_model_images_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_models"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_models: {
        Row: {
          base_price: number | null
          brand: string
          category: string
          color_options: string[] | null
          created_at: string | null
          drive_type: string | null
          engine_cc: string | null
          features: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          mileage: number | null
          model_name: string
          specifications: Json | null
          transmission: string | null
          updated_at: string | null
          vehicle_name: string
          year: number | null
        }
        Insert: {
          base_price?: number | null
          brand?: string
          category?: string
          color_options?: string[] | null
          created_at?: string | null
          drive_type?: string | null
          engine_cc?: string | null
          features?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mileage?: number | null
          model_name: string
          specifications?: Json | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_name: string
          year?: number | null
        }
        Update: {
          base_price?: number | null
          brand?: string
          category?: string
          color_options?: string[] | null
          created_at?: string | null
          drive_type?: string | null
          engine_cc?: string | null
          features?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mileage?: number | null
          model_name?: string
          specifications?: Json | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_name?: string
          year?: number | null
        }
        Relationships: []
      }
      lightvehicle_order_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_id: string | null
          priority: string | null
          process_type: string | null
          status: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          priority?: string | null
          process_type?: string | null
          status?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          priority?: string | null
          process_type?: string | null
          status?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_order_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_orders: {
        Row: {
          actual_delivery_date: string | null
          ar_invoice_id: string | null
          balance_due: number | null
          brand: string | null
          category: string | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          current_phase: string | null
          customer_category_id: string | null
          customer_name: string
          expected_delivery_date: string | null
          finance_customer_id: string | null
          id: string
          notes: string | null
          order_number: string
          payment_mode: string | null
          payment_structure: Json | null
          progress_percentage: number | null
          quantity: number | null
          quotation_id: string | null
          status: string | null
          total_amount: number | null
          total_paid: number | null
          unit_price: number | null
          updated_at: string | null
          vehicle_name: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          brand?: string | null
          category?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          customer_category_id?: string | null
          customer_name: string
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_mode?: string | null
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number | null
          quotation_id?: string | null
          status?: string | null
          total_amount?: number | null
          total_paid?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vehicle_name?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          brand?: string | null
          category?: string | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          customer_category_id?: string | null
          customer_name?: string
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_mode?: string | null
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number | null
          quotation_id?: string | null
          status?: string | null
          total_amount?: number | null
          total_paid?: number | null
          unit_price?: number | null
          updated_at?: string | null
          vehicle_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_orders_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_orders_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_orders_finance_customer_id_fkey"
            columns: ["finance_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_payment_schedules: {
        Row: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string
          milestone_name: string
          notes: string | null
          order_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string
          sequence_order: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type: string
          sequence_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          sequence_order?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_payment_schedules_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_quotation_addons: {
        Row: {
          addon_id: string | null
          addon_name: string | null
          created_at: string | null
          id: string
          quantity: number | null
          quotation_id: string | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          addon_id?: string | null
          addon_name?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          quotation_id?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          addon_id?: string | null
          addon_name?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          quotation_id?: string | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_quotation_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_quotation_addons_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_quotation_signatures: {
        Row: {
          id: string
          quotation_id: string | null
          signature_data: string | null
          signature_role: string
          signature_type: string | null
          signed_at: string | null
          signed_by: string | null
          signer_name: string
        }
        Insert: {
          id?: string
          quotation_id?: string | null
          signature_data?: string | null
          signature_role: string
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signer_name: string
        }
        Update: {
          id?: string
          quotation_id?: string | null
          signature_data?: string | null
          signature_role?: string
          signature_type?: string | null
          signed_at?: string | null
          signed_by?: string | null
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_quotation_signatures_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_quotations: {
        Row: {
          additional_charges: number | null
          additional_charges_description: string | null
          brand: string | null
          business_registration: string | null
          category: string | null
          color: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_category_id: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_type: string | null
          delivery_terms: string | null
          designation: string | null
          discount: number | null
          engine_cc: string | null
          finance_company: string | null
          fuel_type: string | null
          grand_total: number | null
          id: string
          is_active_version: boolean | null
          is_sub_customer: boolean | null
          main_customer_name: string | null
          model_id: string | null
          notes: string | null
          parent_quotation_id: string | null
          payment_terms: string | null
          quantity: number | null
          quotation_number: string
          referral_agent_id: string | null
          relationship_notes: string | null
          representative_name: string | null
          responsible_person_id: string | null
          status: string | null
          tax_registration: string | null
          total_price: number | null
          transmission: string | null
          unit_price: number | null
          updated_at: string | null
          validity_period: string | null
          vehicle_name: string | null
          version_number: number | null
          warranty_terms: string | null
          year: number | null
        }
        Insert: {
          additional_charges?: number | null
          additional_charges_description?: string | null
          brand?: string | null
          business_registration?: string | null
          category?: string | null
          color?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_type?: string | null
          delivery_terms?: string | null
          designation?: string | null
          discount?: number | null
          engine_cc?: string | null
          finance_company?: string | null
          fuel_type?: string | null
          grand_total?: number | null
          id?: string
          is_active_version?: boolean | null
          is_sub_customer?: boolean | null
          main_customer_name?: string | null
          model_id?: string | null
          notes?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number | null
          quotation_number: string
          referral_agent_id?: string | null
          relationship_notes?: string | null
          representative_name?: string | null
          responsible_person_id?: string | null
          status?: string | null
          tax_registration?: string | null
          total_price?: number | null
          transmission?: string | null
          unit_price?: number | null
          updated_at?: string | null
          validity_period?: string | null
          vehicle_name?: string | null
          version_number?: number | null
          warranty_terms?: string | null
          year?: number | null
        }
        Update: {
          additional_charges?: number | null
          additional_charges_description?: string | null
          brand?: string | null
          business_registration?: string | null
          category?: string | null
          color?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_type?: string | null
          delivery_terms?: string | null
          designation?: string | null
          discount?: number | null
          engine_cc?: string | null
          finance_company?: string | null
          fuel_type?: string | null
          grand_total?: number | null
          id?: string
          is_active_version?: boolean | null
          is_sub_customer?: boolean | null
          main_customer_name?: string | null
          model_id?: string | null
          notes?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number | null
          quotation_number?: string
          referral_agent_id?: string | null
          relationship_notes?: string | null
          representative_name?: string | null
          responsible_person_id?: string | null
          status?: string | null
          tax_registration?: string | null
          total_price?: number | null
          transmission?: string | null
          unit_price?: number | null
          updated_at?: string | null
          validity_period?: string | null
          vehicle_name?: string | null
          version_number?: number | null
          warranty_terms?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_quotations_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_quotations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_quotations_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_quotations_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_responsible_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_referral_commission_payments: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          commission_amount: number | null
          commission_percentage: number | null
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          quotation_id: string | null
          quotation_value: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          quotation_id?: string | null
          quotation_value?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          quotation_id?: string | null
          quotation_value?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_referral_commission_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_referral_commission_payments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_responsible_persons: {
        Row: {
          created_at: string | null
          designation: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          person_name: string
          phone: string | null
          role: string
          signature_data: string | null
          signature_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          person_name: string
          phone?: string | null
          role: string
          signature_data?: string | null
          signature_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          person_name?: string
          phone?: string | null
          role?: string
          signature_data?: string | null
          signature_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lightvehicle_shipment_group_orders: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          order_id: string | null
          shipment_group_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          order_id?: string | null
          shipment_group_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          order_id?: string | null
          shipment_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_shipment_group_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_shipment_group_orders_shipment_group_id_fkey"
            columns: ["shipment_group_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_shipment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lightvehicle_shipment_groups: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          bl_number: string | null
          container_number: string | null
          created_at: string | null
          created_by: string | null
          destination_port: string | null
          expected_arrival: string | null
          expected_departure: string | null
          id: string
          notes: string | null
          origin_port: string | null
          shipment_name: string | null
          shipment_number: string
          status: string | null
          updated_at: string | null
          vessel_name: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          bl_number?: string | null
          container_number?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_port?: string | null
          expected_arrival?: string | null
          expected_departure?: string | null
          id?: string
          notes?: string | null
          origin_port?: string | null
          shipment_name?: string | null
          shipment_number: string
          status?: string | null
          updated_at?: string | null
          vessel_name?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          bl_number?: string | null
          container_number?: string | null
          created_at?: string | null
          created_by?: string | null
          destination_port?: string | null
          expected_arrival?: string | null
          expected_departure?: string | null
          id?: string
          notes?: string | null
          origin_port?: string | null
          shipment_name?: string | null
          shipment_number?: string
          status?: string | null
          updated_at?: string | null
          vessel_name?: string | null
        }
        Relationships: []
      }
      lightvehicle_vehicle_data_sheets: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          matched_vehicles: number | null
          sheet_name: string
          shipment_reference: string | null
          status: string | null
          total_vehicles: number | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          matched_vehicles?: number | null
          sheet_name: string
          shipment_reference?: string | null
          status?: string | null
          total_vehicles?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          matched_vehicles?: number | null
          sheet_name?: string
          shipment_reference?: string | null
          status?: string | null
          total_vehicles?: number | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      lightvehicle_vehicle_records: {
        Row: {
          brand: string | null
          category: string | null
          chassis_number: string | null
          color: string | null
          created_at: string | null
          customer_name: string | null
          data_sheet_id: string | null
          engine_number: string | null
          id: string
          is_matched: boolean | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          mileage: number | null
          model_name: string | null
          order_id: string | null
          updated_at: string | null
          vehicle_number: string | null
          year: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          customer_name?: string | null
          data_sheet_id?: string | null
          engine_number?: string | null
          id?: string
          is_matched?: boolean | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          mileage?: number | null
          model_name?: string | null
          order_id?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
          year?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          customer_name?: string | null
          data_sheet_id?: string | null
          engine_number?: string | null
          id?: string
          is_matched?: boolean | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          mileage?: number | null
          model_name?: string | null
          order_id?: string | null
          updated_at?: string | null
          vehicle_number?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lightvehicle_vehicle_records_data_sheet_id_fkey"
            columns: ["data_sheet_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_vehicle_data_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lightvehicle_vehicle_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lightvehicle_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          location_code: string
          location_name: string
          location_type: string | null
          manager_id: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location_code: string
          location_name: string
          location_type?: string | null
          manager_id?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location_code?: string
          location_name?: string
          location_type?: string | null
          manager_id?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      magiya_daily_reports: {
        Row: {
          agent_booking_detail: string | null
          bus_number: string | null
          extracted_at: string | null
          id: string
          ncg_booking_detail: string | null
          ncg_revenue_lkr: number | null
          online_booking_detail: string | null
          online_revenue_lkr: number | null
          pdf_url: string | null
          report_date: string
          route_name: string | null
          status: string | null
          total_amount_to_collect: number | null
          total_passengers: number | null
          total_revenue_lkr: number | null
        }
        Insert: {
          agent_booking_detail?: string | null
          bus_number?: string | null
          extracted_at?: string | null
          id?: string
          ncg_booking_detail?: string | null
          ncg_revenue_lkr?: number | null
          online_booking_detail?: string | null
          online_revenue_lkr?: number | null
          pdf_url?: string | null
          report_date: string
          route_name?: string | null
          status?: string | null
          total_amount_to_collect?: number | null
          total_passengers?: number | null
          total_revenue_lkr?: number | null
        }
        Update: {
          agent_booking_detail?: string | null
          bus_number?: string | null
          extracted_at?: string | null
          id?: string
          ncg_booking_detail?: string | null
          ncg_revenue_lkr?: number | null
          online_booking_detail?: string | null
          online_revenue_lkr?: number | null
          pdf_url?: string | null
          report_date?: string
          route_name?: string | null
          status?: string | null
          total_amount_to_collect?: number | null
          total_passengers?: number | null
          total_revenue_lkr?: number | null
        }
        Relationships: []
      }
      magiya_passenger_bookings: {
        Row: {
          booking_type: string | null
          contact: string | null
          created_at: string | null
          id: string
          location_route: string | null
          remarks: string | null
          report_id: string | null
          seat_number: string | null
        }
        Insert: {
          booking_type?: string | null
          contact?: string | null
          created_at?: string | null
          id?: string
          location_route?: string | null
          remarks?: string | null
          report_id?: string | null
          seat_number?: string | null
        }
        Update: {
          booking_type?: string | null
          contact?: string | null
          created_at?: string | null
          id?: string
          location_route?: string | null
          remarks?: string | null
          report_id?: string | null
          seat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magiya_passenger_bookings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "magiya_daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_bays: {
        Row: {
          bay_name: string
          bay_number: string
          can_work_overtime: boolean | null
          capacity: number | null
          created_at: string
          current_maintenance_id: string | null
          default_hourly_rate: number | null
          default_service_type: string | null
          default_workers: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          overtime_rate_multiplier: number | null
          updated_at: string
        }
        Insert: {
          bay_name: string
          bay_number: string
          can_work_overtime?: boolean | null
          capacity?: number | null
          created_at?: string
          current_maintenance_id?: string | null
          default_hourly_rate?: number | null
          default_service_type?: string | null
          default_workers?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          overtime_rate_multiplier?: number | null
          updated_at?: string
        }
        Update: {
          bay_name?: string
          bay_number?: string
          can_work_overtime?: boolean | null
          capacity?: number | null
          created_at?: string
          current_maintenance_id?: string | null
          default_hourly_rate?: number | null
          default_service_type?: string | null
          default_workers?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          overtime_rate_multiplier?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_financials: {
        Row: {
          bay_id: string | null
          created_at: string
          hourly_pay_rate: number | null
          id: string
          inventory_cost: number | null
          labour_cost: number | null
          maintenance_record_id: string
          net_income: number | null
          override_values: Json | null
          profit_margin_percent: number | null
          revenue: number | null
          service_type: string
          total_expenses: number | null
          total_staff_hours: number | null
          updated_at: string
        }
        Insert: {
          bay_id?: string | null
          created_at?: string
          hourly_pay_rate?: number | null
          id?: string
          inventory_cost?: number | null
          labour_cost?: number | null
          maintenance_record_id: string
          net_income?: number | null
          override_values?: Json | null
          profit_margin_percent?: number | null
          revenue?: number | null
          service_type: string
          total_expenses?: number | null
          total_staff_hours?: number | null
          updated_at?: string
        }
        Update: {
          bay_id?: string | null
          created_at?: string
          hourly_pay_rate?: number | null
          id?: string
          inventory_cost?: number | null
          labour_cost?: number | null
          maintenance_record_id?: string
          net_income?: number | null
          override_values?: Json | null
          profit_margin_percent?: number | null
          revenue?: number | null
          service_type?: string
          total_expenses?: number | null
          total_staff_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_parts: {
        Row: {
          created_at: string
          id: string
          item_code: string | null
          item_description: string
          maintenance_record_id: string
          quantity: number
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_code?: string | null
          item_description: string
          maintenance_record_id: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_code?: string | null
          item_description?: string
          maintenance_record_id?: string
          quantity?: number
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          bay_number: string | null
          bus_id: string
          completion_date: string | null
          countdown_seconds: number | null
          created_at: string
          created_by: string | null
          current_bay_id: string | null
          current_staff_count: number | null
          description: string | null
          estimated_cost: number | null
          estimated_delivery_date: string | null
          estimated_hours: number | null
          id: string
          labor_hours: Json | null
          labor_total_cost: number | null
          maintenance_no: string | null
          next_service_date: string | null
          next_service_km: number | null
          notes: string | null
          parts_total_cost: number | null
          parts_used: Json | null
          priority: string | null
          profit_margin_percent: number | null
          scheduled_date: string | null
          service_type: string
          start_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          supervisor_id: string | null
          timer_started_at: string | null
          timer_status: string | null
          total_staff_hours: number | null
          updated_at: string
          workshop: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          bay_number?: string | null
          bus_id: string
          completion_date?: string | null
          countdown_seconds?: number | null
          created_at?: string
          created_by?: string | null
          current_bay_id?: string | null
          current_staff_count?: number | null
          description?: string | null
          estimated_cost?: number | null
          estimated_delivery_date?: string | null
          estimated_hours?: number | null
          id?: string
          labor_hours?: Json | null
          labor_total_cost?: number | null
          maintenance_no?: string | null
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          parts_total_cost?: number | null
          parts_used?: Json | null
          priority?: string | null
          profit_margin_percent?: number | null
          scheduled_date?: string | null
          service_type: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          supervisor_id?: string | null
          timer_started_at?: string | null
          timer_status?: string | null
          total_staff_hours?: number | null
          updated_at?: string
          workshop?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          bay_number?: string | null
          bus_id?: string
          completion_date?: string | null
          countdown_seconds?: number | null
          created_at?: string
          created_by?: string | null
          current_bay_id?: string | null
          current_staff_count?: number | null
          description?: string | null
          estimated_cost?: number | null
          estimated_delivery_date?: string | null
          estimated_hours?: number | null
          id?: string
          labor_hours?: Json | null
          labor_total_cost?: number | null
          maintenance_no?: string | null
          next_service_date?: string | null
          next_service_km?: number | null
          notes?: string | null
          parts_total_cost?: number | null
          parts_used?: Json | null
          priority?: string | null
          profit_margin_percent?: number | null
          scheduled_date?: string | null
          service_type?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          supervisor_id?: string | null
          timer_started_at?: string | null
          timer_status?: string | null
          total_staff_hours?: number | null
          updated_at?: string
          workshop?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_timers: {
        Row: {
          bay_id: string | null
          created_at: string
          end_time: string | null
          id: string
          is_overtime: boolean | null
          maintenance_record_id: string
          overtime_approved_by: string | null
          pause_time: string | null
          resume_time: string | null
          start_time: string
          status: string | null
          total_minutes: number | null
          worker_count: number | null
        }
        Insert: {
          bay_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_overtime?: boolean | null
          maintenance_record_id: string
          overtime_approved_by?: string | null
          pause_time?: string | null
          resume_time?: string | null
          start_time: string
          status?: string | null
          total_minutes?: number | null
          worker_count?: number | null
        }
        Update: {
          bay_id?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_overtime?: boolean | null
          maintenance_record_id?: string
          overtime_approved_by?: string | null
          pause_time?: string | null
          resume_time?: string | null
          start_time?: string
          status?: string | null
          total_minutes?: number | null
          worker_count?: number | null
        }
        Relationships: []
      }
      marketing_credit_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: number
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_job_requests: {
        Row: {
          additional_notes: string | null
          company_id: string | null
          created_at: string | null
          id: string
          job_description: string
          job_title: string
          request_number: string
          requested_by: string | null
          requested_date: string
          required_completion_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_description: string
          job_title: string
          request_number: string
          requested_by?: string | null
          requested_date?: string
          required_completion_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          job_description?: string
          job_title?: string
          request_number?: string
          requested_by?: string | null
          requested_date?: string
          required_completion_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_job_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_projects: {
        Row: {
          actual_end_date: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          project_lead_id: string | null
          project_number: string
          start_date: string | null
          status: string | null
          target_end_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          project_lead_id?: string | null
          project_number: string
          start_date?: string | null
          status?: string | null
          target_end_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          project_lead_id?: string | null
          project_number?: string
          start_date?: string | null
          status?: string | null
          target_end_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_projects_project_lead_id_fkey"
            columns: ["project_lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_social_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string
          account_url: string | null
          company_id: string | null
          created_at: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name: string
          account_url?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string
          account_url?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_social_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_social_stats: {
        Row: {
          account_id: string | null
          comments_total: number | null
          engagement_rate: number | null
          followers_count: number | null
          following_count: number | null
          id: string
          impressions: number | null
          likes_total: number | null
          posts_count: number | null
          raw_data: Json | null
          reach: number | null
          recorded_at: string | null
          shares_total: number | null
          views_total: number | null
        }
        Insert: {
          account_id?: string | null
          comments_total?: number | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          impressions?: number | null
          likes_total?: number | null
          posts_count?: number | null
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string | null
          shares_total?: number | null
          views_total?: number | null
        }
        Update: {
          account_id?: string | null
          comments_total?: number | null
          engagement_rate?: number | null
          followers_count?: number | null
          following_count?: number | null
          id?: string
          impressions?: number | null
          likes_total?: number | null
          posts_count?: number | null
          raw_data?: Json | null
          reach?: number | null
          recorded_at?: string | null
          shares_total?: number | null
          views_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_social_stats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "marketing_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_task_assignees: {
        Row: {
          created_at: string | null
          credits_earned: number | null
          id: string
          member_id: string | null
          role: string | null
          task_id: string | null
        }
        Insert: {
          created_at?: string | null
          credits_earned?: number | null
          id?: string
          member_id?: string | null
          role?: string | null
          task_id?: string | null
        }
        Update: {
          created_at?: string | null
          credits_earned?: number | null
          id?: string
          member_id?: string | null
          role?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_task_assignees_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "marketing_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_task_categories: {
        Row: {
          average_hours: number
          category_name: string
          created_at: string | null
          credit_multiplier: number | null
          description: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          average_hours?: number
          category_name: string
          created_at?: string | null
          credit_multiplier?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          average_hours?: number
          category_name?: string
          created_at?: string | null
          credit_multiplier?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      marketing_task_feedback: {
        Row: {
          attachments: Json | null
          created_at: string | null
          feedback_type: string
          given_by: string | null
          id: string
          message: string | null
          task_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          feedback_type: string
          given_by?: string | null
          id?: string
          message?: string | null
          task_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          feedback_type?: string
          given_by?: string | null
          id?: string
          message?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_task_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "marketing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_tasks: {
        Row: {
          actual_hours_spent: number | null
          assigned_by: string | null
          assigned_hours: number | null
          category_id: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          credits_awarded: number | null
          deadline: string | null
          description: string | null
          id: string
          is_active: boolean | null
          job_request_id: string | null
          priority: string | null
          project_id: string | null
          started_at: string | null
          status: string | null
          task_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_hours_spent?: number | null
          assigned_by?: string | null
          assigned_hours?: number | null
          category_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_request_id?: string | null
          priority?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_hours_spent?: number | null
          assigned_by?: string | null
          assigned_hours?: number | null
          category_id?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_request_id?: string | null
          priority?: string | null
          project_id?: string | null
          started_at?: string | null
          status?: string | null
          task_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketing_task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_job_request_id_fkey"
            columns: ["job_request_id"]
            isOneToOne: false
            referencedRelation: "marketing_job_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "marketing_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_team_members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          designation: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_task_assigner: boolean | null
          is_task_confirmer: boolean | null
          profile_id: string | null
          skills: string[] | null
          total_credits: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_task_assigner?: boolean | null
          is_task_confirmer?: boolean | null
          profile_id?: string | null
          skills?: string[] | null
          total_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          designation?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_task_assigner?: boolean | null
          is_task_confirmer?: boolean | null
          profile_id?: string | null
          skills?: string[] | null
          total_credits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_finance_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          module_name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          module_name: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          module_name?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      module_gl_mappings: {
        Row: {
          amount_field: string
          auto_post: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          credit_account_id: string | null
          date_field: string | null
          debit_account_id: string | null
          description_template: string | null
          event_name: string
          id: string
          is_active: boolean | null
          module_name: string
          reference_field: string | null
          requires_approval: boolean | null
          source_table: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount_field?: string
          auto_post?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          date_field?: string | null
          debit_account_id?: string | null
          description_template?: string | null
          event_name: string
          id?: string
          is_active?: boolean | null
          module_name: string
          reference_field?: string | null
          requires_approval?: boolean | null
          source_table: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount_field?: string
          auto_post?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          date_field?: string | null
          debit_account_id?: string | null
          description_template?: string | null
          event_name?: string
          id?: string
          is_active?: boolean | null
          module_name?: string
          reference_field?: string | null
          requires_approval?: boolean | null
          source_table?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "module_gl_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_gl_mappings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_gl_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_day_route_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          route_id: string | null
          route_name: string
          route_pattern: string | null
          typical_days_per_trip: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          route_id?: string | null
          route_name: string
          route_pattern?: string | null
          typical_days_per_trip?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          route_id?: string | null
          route_name?: string
          route_pattern?: string | null
          typical_days_per_trip?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_day_route_config_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      ncg_express_finance_settings: {
        Row: {
          accident_expense_account_id: string | null
          auto_post_expenses: boolean | null
          auto_post_revenue: boolean | null
          body_wash_expense_account_id: string | null
          cash_account_id: string | null
          company_id: string | null
          created_at: string
          emission_fitness_expense_account_id: string | null
          expense_cash_account_id: string | null
          expense_prefix: string | null
          food_expense_account_id: string | null
          fuel_card_payable_account_id: string | null
          fuel_expense_account_id: string | null
          highway_expense_account_id: string | null
          id: string
          legal_court_expense_account_id: string | null
          log_sheet_expense_account_id: string | null
          ntc_expense_account_id: string | null
          other_expense_account_id: string | null
          parking_expense_account_id: string | null
          permits_expense_account_id: string | null
          police_expense_account_id: string | null
          repair_expense_account_id: string | null
          revenue_prefix: string | null
          route_revenue_account_id: string | null
          runner_expense_account_id: string | null
          salary_expense_account_id: string | null
          short_misc_expense_account_id: string | null
          staff_accommodation_expense_account_id: string | null
          temporary_permit_expense_account_id: string | null
          ticket_revenue_account_id: string | null
          tyre_expense_account_id: string | null
          updated_at: string
          vehicle_hire_expense_account_id: string | null
        }
        Insert: {
          accident_expense_account_id?: string | null
          auto_post_expenses?: boolean | null
          auto_post_revenue?: boolean | null
          body_wash_expense_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string
          emission_fitness_expense_account_id?: string | null
          expense_cash_account_id?: string | null
          expense_prefix?: string | null
          food_expense_account_id?: string | null
          fuel_card_payable_account_id?: string | null
          fuel_expense_account_id?: string | null
          highway_expense_account_id?: string | null
          id?: string
          legal_court_expense_account_id?: string | null
          log_sheet_expense_account_id?: string | null
          ntc_expense_account_id?: string | null
          other_expense_account_id?: string | null
          parking_expense_account_id?: string | null
          permits_expense_account_id?: string | null
          police_expense_account_id?: string | null
          repair_expense_account_id?: string | null
          revenue_prefix?: string | null
          route_revenue_account_id?: string | null
          runner_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          short_misc_expense_account_id?: string | null
          staff_accommodation_expense_account_id?: string | null
          temporary_permit_expense_account_id?: string | null
          ticket_revenue_account_id?: string | null
          tyre_expense_account_id?: string | null
          updated_at?: string
          vehicle_hire_expense_account_id?: string | null
        }
        Update: {
          accident_expense_account_id?: string | null
          auto_post_expenses?: boolean | null
          auto_post_revenue?: boolean | null
          body_wash_expense_account_id?: string | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string
          emission_fitness_expense_account_id?: string | null
          expense_cash_account_id?: string | null
          expense_prefix?: string | null
          food_expense_account_id?: string | null
          fuel_card_payable_account_id?: string | null
          fuel_expense_account_id?: string | null
          highway_expense_account_id?: string | null
          id?: string
          legal_court_expense_account_id?: string | null
          log_sheet_expense_account_id?: string | null
          ntc_expense_account_id?: string | null
          other_expense_account_id?: string | null
          parking_expense_account_id?: string | null
          permits_expense_account_id?: string | null
          police_expense_account_id?: string | null
          repair_expense_account_id?: string | null
          revenue_prefix?: string | null
          route_revenue_account_id?: string | null
          runner_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          short_misc_expense_account_id?: string | null
          staff_accommodation_expense_account_id?: string | null
          temporary_permit_expense_account_id?: string | null
          ticket_revenue_account_id?: string | null
          tyre_expense_account_id?: string | null
          updated_at?: string
          vehicle_hire_expense_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ncg_express_finance_settings_accident_expense_account_id_fkey"
            columns: ["accident_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_body_wash_expense_account_id_fkey"
            columns: ["body_wash_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_emission_fitness_expense_acco_fkey"
            columns: ["emission_fitness_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_expense_cash_account_id_fkey"
            columns: ["expense_cash_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_food_expense_account_id_fkey"
            columns: ["food_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_fuel_card_payable_account_id_fkey"
            columns: ["fuel_card_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_fuel_expense_account_id_fkey"
            columns: ["fuel_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_highway_expense_account_id_fkey"
            columns: ["highway_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_legal_court_expense_account_i_fkey"
            columns: ["legal_court_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_log_sheet_expense_account_id_fkey"
            columns: ["log_sheet_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_ntc_expense_account_id_fkey"
            columns: ["ntc_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_other_expense_account_id_fkey"
            columns: ["other_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_parking_expense_account_id_fkey"
            columns: ["parking_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_permits_expense_account_id_fkey"
            columns: ["permits_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_police_expense_account_id_fkey"
            columns: ["police_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_repair_expense_account_id_fkey"
            columns: ["repair_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_route_revenue_account_id_fkey"
            columns: ["route_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_runner_expense_account_id_fkey"
            columns: ["runner_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_salary_expense_account_id_fkey"
            columns: ["salary_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_short_misc_expense_account_id_fkey"
            columns: ["short_misc_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_staff_accommodation_expense_a_fkey"
            columns: ["staff_accommodation_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_temporary_permit_expense_acco_fkey"
            columns: ["temporary_permit_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_ticket_revenue_account_id_fkey"
            columns: ["ticket_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_tyre_expense_account_id_fkey"
            columns: ["tyre_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ncg_express_finance_settings_vehicle_hire_expense_account__fkey"
            columns: ["vehicle_hire_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      nsp_daily_sales: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lss_inside_sale: number
          lss_outside_sale: number
          notes: string | null
          other_income: Json | null
          pepiliyana_sale: number
          sale_date: string
          total_sale: number
          tyre_entries: Json | null
          tyre_quantity: string | null
          tyre_sale: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lss_inside_sale?: number
          lss_outside_sale?: number
          notes?: string | null
          other_income?: Json | null
          pepiliyana_sale?: number
          sale_date: string
          total_sale?: number
          tyre_entries?: Json | null
          tyre_quantity?: string | null
          tyre_sale?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lss_inside_sale?: number
          lss_outside_sale?: number
          notes?: string | null
          other_income?: Json | null
          pepiliyana_sale?: number
          sale_date?: string
          total_sale?: number
          tyre_entries?: Json | null
          tyre_quantity?: string | null
          tyre_sale?: number
          updated_at?: string
        }
        Relationships: []
      }
      numbering_sequences: {
        Row: {
          company_id: string | null
          created_at: string | null
          entity_type: string
          id: string
          include_month: boolean | null
          include_year: boolean | null
          is_active: boolean | null
          next_number: number | null
          padding_length: number | null
          prefix: string
          separator: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          entity_type: string
          id?: string
          include_month?: boolean | null
          include_year?: boolean | null
          is_active?: boolean | null
          next_number?: number | null
          padding_length?: number | null
          prefix: string
          separator?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          entity_type?: string
          id?: string
          include_month?: boolean | null
          include_year?: boolean | null
          is_active?: boolean | null
          next_number?: number | null
          padding_length?: number | null
          prefix?: string
          separator?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "numbering_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batch_items: {
        Row: {
          amount: number
          batch_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payment_id: string | null
          processed_at: string | null
          reference: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          batch_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          reference?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          batch_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payment_id?: string | null
          processed_at?: string | null
          reference?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string
          batch_date: string
          batch_number: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string
          processed_at: string | null
          status: string | null
          total_amount: number | null
          total_payments: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id: string
          batch_date: string
          batch_number: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          processed_at?: string | null
          status?: string | null
          total_amount?: number | null
          total_payments?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string
          batch_date?: string
          batch_number?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          processed_at?: string | null
          status?: string | null
          total_amount?: number | null
          total_payments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          ar_invoice_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          failure_reason: string | null
          id: string
          link_code: string
          metadata: Json | null
          paid_at: string | null
          payment_provider: string | null
          payment_reference: string | null
          status: string | null
          stripe_checkout_url: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          ar_invoice_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          link_code: string
          metadata?: Json | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string | null
          stripe_checkout_url?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          ar_invoice_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          id?: string
          link_code?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          status?: string | null
          stripe_checkout_url?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          payment_id: string
          quotation_id: string
          target_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          payment_id: string
          quotation_id: string
          target_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          payment_id?: string
          quotation_id?: string
          target_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_notifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "special_hire_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_notifications_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_log: {
        Row: {
          channel: string | null
          company_id: string | null
          customer_id: string | null
          email_subject: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          message_preview: string | null
          reminder_rule_id: string | null
          sent_at: string | null
          sent_to: string
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          channel?: string | null
          company_id?: string | null
          customer_id?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          message_preview?: string | null
          reminder_rule_id?: string | null
          sent_at?: string | null
          sent_to: string
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          channel?: string | null
          company_id?: string | null
          customer_id?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          message_preview?: string | null
          reminder_rule_id?: string | null
          sent_at?: string | null
          sent_to?: string
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminder_rules: {
        Row: {
          applies_to_ap: boolean | null
          applies_to_ar: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          days_offset: number
          email_subject: string | null
          email_template: string | null
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number | null
          priority: number | null
          reminder_channel: string
          rule_name: string
          sms_template: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          applies_to_ap?: boolean | null
          applies_to_ar?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          days_offset?: number
          email_subject?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          priority?: number | null
          reminder_channel: string
          rule_name: string
          sms_template?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          applies_to_ap?: boolean | null
          applies_to_ar?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          days_offset?: number
          email_subject?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number | null
          priority?: number | null
          reminder_channel?: string
          rule_name?: string
          sms_template?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminder_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          contact_method: string | null
          created_at: string
          id: string
          message_content: string | null
          reminder_type: string
          sent_at: string
          student_id: string
        }
        Insert: {
          contact_method?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          reminder_type?: string
          sent_at?: string
          student_id: string
        }
        Update: {
          contact_method?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          reminder_type?: string
          sent_at?: string
          student_id?: string
        }
        Relationships: []
      }
      payment_reminders_sent: {
        Row: {
          channel: string | null
          company_id: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          message_content: string | null
          recipient_email: string | null
          recipient_phone: string | null
          reminder_rule_id: string | null
          sent_at: string | null
          sent_status: string | null
          subject: string | null
          vendor_id: string | null
        }
        Insert: {
          channel?: string | null
          company_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          message_content?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          reminder_rule_id?: string | null
          sent_at?: string | null
          sent_status?: string | null
          subject?: string | null
          vendor_id?: string | null
        }
        Update: {
          channel?: string | null
          company_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          message_content?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          reminder_rule_id?: string | null
          sent_at?: string | null
          sent_status?: string | null
          subject?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_sent_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_sent_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_sent_reminder_rule_id_fkey"
            columns: ["reminder_rule_id"]
            isOneToOne: false
            referencedRelation: "payment_reminder_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_sent_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_terms: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_days: number | null
          discount_percentage: number | null
          due_days: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          term_name: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_days?: number | null
          discount_percentage?: number | null
          due_days?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          term_name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_days?: number | null
          discount_percentage?: number | null
          due_days?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          term_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_terms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          amount: number
          created_at: string
          description: string
          id: string
          payroll_record_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          amount: number
          created_at?: string
          description: string
          id?: string
          payroll_record_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          amount?: number
          created_at?: string
          description?: string
          id?: string
          payroll_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number | null
          base_salary: number | null
          created_at: string
          deductions: number | null
          gross_pay: number | null
          id: string
          net_pay: number | null
          overtime_pay: number | null
          pay_period_end: string
          pay_period_start: string
          processed_at: string | null
          processed_by: string | null
          staff_id: string
          staff_name: string
          status: string
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string
          deductions?: number | null
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          overtime_pay?: number | null
          pay_period_end: string
          pay_period_start: string
          processed_at?: string | null
          processed_by?: string | null
          staff_id: string
          staff_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string
          deductions?: number | null
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          overtime_pay?: number | null
          pay_period_end?: string
          pay_period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          staff_id?: string
          staff_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pending_gl_postings: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          id: string
          mapping_id: string | null
          rejection_reason: string | null
          source_record_id: string
          source_table: string
          status: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          mapping_id?: string | null
          rejection_reason?: string | null
          source_record_id: string
          source_table: string
          status?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          mapping_id?: string | null
          rejection_reason?: string | null
          source_record_id?: string
          source_table?: string
          status?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_gl_postings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_gl_postings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_gl_postings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_gl_postings_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "module_gl_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          first_name: string
          id: string
          initial_role: string
          invite_token: string
          invited_at: string
          invited_by: string | null
          last_name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          first_name: string
          id?: string
          initial_role?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string | null
          last_name: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string
          id?: string
          initial_role?: string
          invite_token?: string
          invited_at?: string
          invited_by?: string | null
          last_name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      period_closing_checklist: {
        Row: {
          category: string | null
          checklist_item: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_completed: boolean | null
          is_mandatory: boolean | null
          notes: string | null
          period_id: string | null
        }
        Insert: {
          category?: string | null
          checklist_item: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean | null
          notes?: string | null
          period_id?: string | null
        }
        Update: {
          category?: string | null
          checklist_item?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_completed?: boolean | null
          is_mandatory?: boolean | null
          notes?: string | null
          period_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_closing_checklist_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_funds: {
        Row: {
          approval_required_above: number | null
          branch_id: string | null
          business_unit_code: string
          company_id: string | null
          created_at: string | null
          current_balance: number
          custodian_id: string | null
          custodian_name: string | null
          fund_code: string | null
          fund_limit: number | null
          fund_name: string
          fund_type: string | null
          gl_account_id: string | null
          id: string
          is_active: boolean | null
          last_replenished_at: string | null
          low_balance_threshold: number | null
          notes: string | null
          opening_balance: number
          updated_at: string | null
        }
        Insert: {
          approval_required_above?: number | null
          branch_id?: string | null
          business_unit_code: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number
          custodian_id?: string | null
          custodian_name?: string | null
          fund_code?: string | null
          fund_limit?: number | null
          fund_name: string
          fund_type?: string | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          last_replenished_at?: string | null
          low_balance_threshold?: number | null
          notes?: string | null
          opening_balance?: number
          updated_at?: string | null
        }
        Update: {
          approval_required_above?: number | null
          branch_id?: string | null
          business_unit_code?: string
          company_id?: string | null
          created_at?: string | null
          current_balance?: number
          custodian_id?: string | null
          custodian_name?: string | null
          fund_code?: string | null
          fund_limit?: number | null
          fund_name?: string
          fund_type?: string | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          last_replenished_at?: string | null
          low_balance_threshold?: number | null
          notes?: string | null
          opening_balance?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_funds_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_custodian_id_fkey"
            columns: ["custodian_id"]
            isOneToOne: false
            referencedRelation: "staff_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_funds_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_reconciliation_items: {
        Row: {
          amount: number
          cleared: boolean
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          reconciliation_id: string
          remarks: string | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          cleared?: boolean
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reconciliation_id: string
          remarks?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          cleared?: boolean
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reconciliation_id?: string
          remarks?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_reconciliation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_reconciliation_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_reconciliations: {
        Row: {
          company_id: string | null
          created_at: string
          difference: number | null
          fund_id: string
          id: string
          notes: string | null
          physical_count: number
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          status: string
          system_balance: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          difference?: number | null
          fund_id: string
          id?: string
          notes?: string | null
          physical_count?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          status?: string
          system_balance?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          difference?: number | null
          fund_id?: string
          id?: string
          notes?: string | null
          physical_count?: number
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          status?: string
          system_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_reconciliations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      petty_cash_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          attachment_url: string | null
          balance_after: number
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_category: string | null
          expense_request_id: string | null
          gl_account_id: string | null
          id: string
          journal_entry_id: string | null
          payee_name: string | null
          payment_method: string | null
          petty_cash_fund_id: string
          receipt_number: string | null
          reference_number: string | null
          status: string | null
          transaction_type: string
          voucher_number: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          attachment_url?: string | null
          balance_after: number
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category?: string | null
          expense_request_id?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          payee_name?: string | null
          payment_method?: string | null
          petty_cash_fund_id: string
          receipt_number?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_type: string
          voucher_number?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          attachment_url?: string | null
          balance_after?: number
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_category?: string | null
          expense_request_id?: string | null
          gl_account_id?: string | null
          id?: string
          journal_entry_id?: string | null
          payee_name?: string | null
          payment_method?: string | null
          petty_cash_fund_id?: string
          receipt_number?: string | null
          reference_number?: string | null
          status?: string | null
          transaction_type?: string
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petty_cash_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_expense_request_id_fkey"
            columns: ["expense_request_id"]
            isOneToOne: false
            referencedRelation: "expense_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "petty_cash_transactions_petty_cash_fund_id_fkey"
            columns: ["petty_cash_fund_id"]
            isOneToOne: false
            referencedRelation: "petty_cash_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_list_lines: {
        Row: {
          batch_number: string | null
          bin_location: string | null
          created_at: string | null
          id: string
          item_id: string | null
          pick_list_id: string | null
          qty_picked: number | null
          qty_to_pick: number
          serial_numbers: string[] | null
          so_line_id: string | null
        }
        Insert: {
          batch_number?: string | null
          bin_location?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          pick_list_id?: string | null
          qty_picked?: number | null
          qty_to_pick: number
          serial_numbers?: string[] | null
          so_line_id?: string | null
        }
        Update: {
          batch_number?: string | null
          bin_location?: string | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          pick_list_id?: string | null
          qty_picked?: number | null
          qty_to_pick?: number
          serial_numbers?: string[] | null
          so_line_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_list_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_lines_pick_list_id_fkey"
            columns: ["pick_list_id"]
            isOneToOne: false
            referencedRelation: "pick_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_list_lines_so_line_id_fkey"
            columns: ["so_line_id"]
            isOneToOne: false
            referencedRelation: "sales_order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      pick_lists: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          pick_number: string
          picked_at: string | null
          picked_by: string | null
          sales_order_id: string | null
          status: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          pick_number: string
          picked_at?: string | null
          picked_by?: string | null
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          pick_number?: string
          picked_at?: string | null
          picked_by?: string | null
          sales_order_id?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pick_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pick_lists_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_invoice_matching: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          grn_amount: number | null
          grn_id: string | null
          id: string
          invoice_amount: number | null
          invoice_id: string | null
          match_status: string | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          po_amount: number | null
          po_id: string | null
          variance_amount: number | null
          variance_reason: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_id?: string | null
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          po_amount?: number | null
          po_id?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          grn_amount?: number | null
          grn_id?: string | null
          id?: string
          invoice_amount?: number | null
          invoice_id?: string | null
          match_status?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          po_amount?: number | null
          po_id?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_invoice_matching_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_invoice_matching_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_invoice_matching_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      po_lines: {
        Row: {
          delivery_date: string | null
          description: string | null
          discount_percent: number | null
          id: string
          invoiced_quantity: number | null
          item_id: string | null
          line_total: number
          po_id: string | null
          quantity: number
          received_quantity: number | null
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          delivery_date?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoiced_quantity?: number | null
          item_id?: string | null
          line_total: number
          po_id?: string | null
          quantity: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          delivery_date?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoiced_quantity?: number | null
          item_id?: string | null
          line_total?: number
          po_id?: string | null
          quantity?: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_lines: {
        Row: {
          description: string | null
          estimated_unit_price: number | null
          id: string
          item_id: string | null
          notes: string | null
          pr_id: string | null
          quantity: number
          total: number | null
          unit_of_measure: string | null
        }
        Insert: {
          description?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_id?: string | null
          notes?: string | null
          pr_id?: string | null
          quantity: number
          total?: number | null
          unit_of_measure?: string | null
        }
        Update: {
          description?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_id?: string | null
          notes?: string | null
          pr_id?: string | null
          quantity?: number
          total?: number | null
          unit_of_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_lines_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          company_id: string | null
          created_at: string | null
          discount_percentage: number | null
          id: string
          item_id: string | null
          max_quantity: number | null
          min_quantity: number | null
          price: number
          price_list_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          item_id?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          price: number
          price_list_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          item_id?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          price?: number
          price_list_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          discount_percentage: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          price_type: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          discount_percentage?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          price_type?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          discount_percentage?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          price_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          employee_id: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          license_expiry: string | null
          license_number: string | null
          nic: string | null
          phone: string | null
          signature_data: string | null
          signature_image_url: string | null
          signature_type: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          nic?: string | null
          phone?: string | null
          signature_data?: string | null
          signature_image_url?: string | null
          signature_type?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          nic?: string | null
          phone?: string | null
          signature_data?: string | null
          signature_image_url?: string | null
          signature_type?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_centers: {
        Row: {
          center_code: string
          center_name: string
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          revenue_target: number | null
        }
        Insert: {
          center_code: string
          center_name: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          revenue_target?: number | null
        }
        Update: {
          center_code?: string
          center_name?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          revenue_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profit_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_cost: number | null
          actual_revenue: number | null
          budget_amount: number | null
          completion_percentage: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          project_code: string
          project_manager_id: string | null
          project_name: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_revenue?: number | null
          budget_amount?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          project_code: string
          project_manager_id?: string | null
          project_name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_revenue?: number | null
          budget_amount?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          project_code?: string
          project_manager_id?: string | null
          project_name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          item_id: string | null
          line_total: number
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_id: string
          quantity?: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          item_id?: string | null
          line_total?: number
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          delivery_address: string | null
          discount_amount: number | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          payment_terms: string | null
          po_number: string
          pr_id: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          discount_amount?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date: string
          payment_terms?: string | null
          po_number: string
          pr_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_address?: string | null
          discount_amount?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_terms?: string | null
          po_number?: string
          pr_id?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          department: string | null
          id: string
          notes: string | null
          pr_number: string
          priority: string | null
          request_date: string
          requested_by: string | null
          required_date: string | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          pr_number: string
          priority?: string | null
          request_date: string
          requested_by?: string | null
          required_date?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          department?: string | null
          id?: string
          notes?: string | null
          pr_number?: string
          priority?: string | null
          request_date?: string
          requested_by?: string | null
          required_date?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspection_readings: {
        Row: {
          created_at: string | null
          criteria_id: string | null
          id: string
          inspection_id: string | null
          numeric_value: number | null
          reading_value: string | null
          remarks: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          inspection_id?: string | null
          numeric_value?: number | null
          reading_value?: string | null
          remarks?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          criteria_id?: string | null
          id?: string
          inspection_id?: string | null
          numeric_value?: number | null
          reading_value?: string | null
          remarks?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspection_readings_criteria_id_fkey"
            columns: ["criteria_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspection_readings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections: {
        Row: {
          accepted_qty: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          inspected_qty: number
          inspection_date: string
          inspection_number: string
          inspector_id: string | null
          item_id: string | null
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          rejected_qty: number | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_qty?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspected_qty: number
          inspection_date?: string
          inspection_number: string
          inspector_id?: string | null
          item_id?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_qty?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_qty?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          inspected_qty?: number
          inspection_date?: string
          inspection_number?: string
          inspector_id?: string | null
          item_id?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          rejected_qty?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_bus_details: {
        Row: {
          bus_number: number
          created_at: string
          fuel_cost: number | null
          id: string
          km_drop_to_parking: number | null
          km_parking_to_pickup: number | null
          parking_lat: number | null
          parking_lng: number | null
          parking_location_id: string | null
          parking_location_name: string | null
          quotation_id: string
          updated_at: string
        }
        Insert: {
          bus_number: number
          created_at?: string
          fuel_cost?: number | null
          id?: string
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          parking_lat?: number | null
          parking_lng?: number | null
          parking_location_id?: string | null
          parking_location_name?: string | null
          quotation_id: string
          updated_at?: string
        }
        Update: {
          bus_number?: number
          created_at?: string
          fuel_cost?: number | null
          id?: string
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          parking_lat?: number | null
          parking_lng?: number | null
          parking_location_id?: string | null
          parking_location_name?: string | null
          quotation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_bus_details_parking_location_id_fkey"
            columns: ["parking_location_id"]
            isOneToOne: false
            referencedRelation: "fuel_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_bus_details_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      real_time_tracking: {
        Row: {
          alarm_active: boolean | null
          alerts: Json | null
          altitude_meters: number | null
          battery_voltage: number | null
          bus_id: string
          bus_no: string
          created_at: string
          current_location: string | null
          daily_mileage_km: number | null
          driver_id: string | null
          driver_name: string | null
          engine_health: string | null
          engine_hours: number | null
          engine_temperature: number | null
          fios_device_id: number | null
          fuel_level: number | null
          fuel_level_liters: number | null
          gps_accuracy: number | null
          gps_coordinates: Json | null
          gsm_signal_strength: number | null
          heading_degrees: number | null
          id: string
          ignition_status: boolean | null
          last_update: string
          odometer_km: number | null
          odometer_reading: number | null
          odometer_source: string | null
          oil_pressure: number | null
          route_id: string | null
          route_name: string | null
          satellite_count: number | null
          speed_kmh: number | null
          status: string
          tire_pressure: Json | null
          updated_at: string
        }
        Insert: {
          alarm_active?: boolean | null
          alerts?: Json | null
          altitude_meters?: number | null
          battery_voltage?: number | null
          bus_id: string
          bus_no: string
          created_at?: string
          current_location?: string | null
          daily_mileage_km?: number | null
          driver_id?: string | null
          driver_name?: string | null
          engine_health?: string | null
          engine_hours?: number | null
          engine_temperature?: number | null
          fios_device_id?: number | null
          fuel_level?: number | null
          fuel_level_liters?: number | null
          gps_accuracy?: number | null
          gps_coordinates?: Json | null
          gsm_signal_strength?: number | null
          heading_degrees?: number | null
          id?: string
          ignition_status?: boolean | null
          last_update?: string
          odometer_km?: number | null
          odometer_reading?: number | null
          odometer_source?: string | null
          oil_pressure?: number | null
          route_id?: string | null
          route_name?: string | null
          satellite_count?: number | null
          speed_kmh?: number | null
          status?: string
          tire_pressure?: Json | null
          updated_at?: string
        }
        Update: {
          alarm_active?: boolean | null
          alerts?: Json | null
          altitude_meters?: number | null
          battery_voltage?: number | null
          bus_id?: string
          bus_no?: string
          created_at?: string
          current_location?: string | null
          daily_mileage_km?: number | null
          driver_id?: string | null
          driver_name?: string | null
          engine_health?: string | null
          engine_hours?: number | null
          engine_temperature?: number | null
          fios_device_id?: number | null
          fuel_level?: number | null
          fuel_level_liters?: number | null
          gps_accuracy?: number | null
          gps_coordinates?: Json | null
          gsm_signal_strength?: number | null
          heading_degrees?: number | null
          id?: string
          ignition_status?: boolean | null
          last_update?: string
          odometer_km?: number | null
          odometer_reading?: number | null
          odometer_source?: string | null
          oil_pressure?: number | null
          route_id?: string | null
          route_name?: string | null
          satellite_count?: number | null
          speed_kmh?: number | null
          status?: string
          tire_pressure?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_time_tracking_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_time_tracking_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "real_time_tracking_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_history: {
        Row: {
          ar_invoice_id: string | null
          generated_at: string | null
          id: string
          invoice_amount: number | null
          recurring_invoice_id: string | null
          status: string | null
        }
        Insert: {
          ar_invoice_id?: string | null
          generated_at?: string | null
          id?: string
          invoice_amount?: number | null
          recurring_invoice_id?: string | null
          status?: string | null
        }
        Update: {
          ar_invoice_id?: string | null
          generated_at?: string | null
          id?: string
          invoice_amount?: number | null
          recurring_invoice_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_history_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoice_history_recurring_invoice_id_fkey"
            columns: ["recurring_invoice_id"]
            isOneToOne: false
            referencedRelation: "recurring_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoice_log: {
        Row: {
          amount: number | null
          company_id: string | null
          customer_id: string | null
          error_message: string | null
          generated_at: string | null
          generated_invoice_id: string | null
          id: string
          invoice_number: string | null
          recurring_invoice_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_invoice_id?: string | null
          id?: string
          invoice_number?: string | null
          recurring_invoice_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          customer_id?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_invoice_id?: string | null
          id?: string
          invoice_number?: string | null
          recurring_invoice_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoice_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          account_id: string | null
          amount: number
          auto_send_email: boolean | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          email_template: string | null
          end_date: string | null
          frequency: string
          id: string
          invoices_generated: number | null
          is_active: boolean | null
          last_run_date: string | null
          next_run_date: string
          payment_terms_days: number | null
          start_date: string
          tax_amount: number | null
          tax_rate: number | null
          template_name: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          auto_send_email?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          email_template?: string | null
          end_date?: string | null
          frequency: string
          id?: string
          invoices_generated?: number | null
          is_active?: boolean | null
          last_run_date?: string | null
          next_run_date: string
          payment_terms_days?: number | null
          start_date: string
          tax_amount?: number | null
          tax_rate?: number | null
          template_name: string
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          auto_send_email?: boolean | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          email_template?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          invoices_generated?: number | null
          is_active?: boolean | null
          last_run_date?: string | null
          next_run_date?: string
          payment_terms_days?: number | null
          start_date?: string
          tax_amount?: number | null
          tax_rate?: number | null
          template_name?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_journal_entries: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_run_date: string | null
          next_run_date: string
          template_data: Json | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_date?: string | null
          next_run_date: string
          template_data?: Json | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_run_date?: string | null
          next_run_date?: string
          template_data?: Json | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_journal_entries_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_journal_entries_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_agents: {
        Row: {
          agent_name: string
          created_at: string | null
          created_by: string | null
          default_commission_pct: number | null
          id: string
          notes: string | null
          phone: string | null
          status: string | null
          total_commission_earned: number | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          created_by?: string | null
          default_commission_pct?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_commission_earned?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          created_by?: string | null
          default_commission_pct?: number | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          total_commission_earned?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_commission_payments: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          quotation_id: string
          referral_agent_id: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          quotation_id: string
          referral_agent_id: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          quotation_id?: string
          referral_agent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commission_payments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commission_payments_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_staff_log: {
        Row: {
          created_at: string
          end_time: string | null
          hours_worked: number | null
          id: string
          maintenance_record_id: string
          staff_count: number
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          maintenance_record_id: string
          staff_count?: number
          start_time?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          maintenance_record_id?: string
          staff_count?: number
          start_time?: string
        }
        Relationships: []
      }
      report_schedules: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          email_body: string | null
          email_subject: string | null
          format: string | null
          id: string
          include_charts: boolean | null
          is_active: boolean | null
          last_error: string | null
          last_sent_at: string | null
          next_run_at: string | null
          recipients: string[]
          report_id: string | null
          report_name: string | null
          schedule_day: number | null
          schedule_time: string | null
          schedule_type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email_body?: string | null
          email_subject?: string | null
          format?: string | null
          id?: string
          include_charts?: boolean | null
          is_active?: boolean | null
          last_error?: string | null
          last_sent_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          report_id?: string | null
          report_name?: string | null
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email_body?: string | null
          email_subject?: string | null
          format?: string | null
          id?: string
          include_charts?: boolean | null
          is_active?: boolean | null
          last_error?: string | null
          last_sent_at?: string | null
          next_run_at?: string | null
          recipients?: string[]
          report_id?: string | null
          report_name?: string | null
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      request_for_quotations: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          requisition_id: string | null
          response_deadline: string | null
          rfq_date: string
          rfq_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          requisition_id?: string | null
          response_deadline?: string | null
          rfq_date?: string
          rfq_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          requisition_id?: string | null
          response_deadline?: string | null
          rfq_date?: string
          rfq_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "request_for_quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_for_quotations_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_lines: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          item_id: string | null
          quantity: number
          rfq_id: string | null
          target_warehouse_id: string | null
          uom: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          rfq_id?: string | null
          target_warehouse_id?: string | null
          uom?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          rfq_id?: string | null
          target_warehouse_id?: string | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_lines_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "request_for_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendors: {
        Row: {
          created_at: string | null
          id: string
          response_received: boolean | null
          rfq_id: string | null
          sent_date: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          response_received?: boolean | null
          rfq_id?: string | null
          sent_date?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          response_received?: boolean | null
          rfq_id?: string | null
          sent_date?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendors_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "request_for_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      route_expenses: {
        Row: {
          amount: number
          branch_id: string
          bus_id: string | null
          bus_no: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_category: string | null
          expense_date: string
          expense_type: string
          id: string
          journal_entry_id: string | null
          posted_to_gl: boolean | null
          receipt_url: string | null
          route_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id: string
          bus_id?: string | null
          bus_no?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_category?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          journal_entry_id?: string | null
          posted_to_gl?: boolean | null
          receipt_url?: string | null
          route_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          bus_id?: string | null
          bus_no?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_category?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          journal_entry_id?: string | null
          posted_to_gl?: boolean | null
          receipt_url?: string | null
          route_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_expenses_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_expenses_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      route_permit_change_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          changes: Json | null
          description: string | null
          id: string
          permit_id: string
        }
        Insert: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          changes?: Json | null
          description?: string | null
          id?: string
          permit_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          changes?: Json | null
          description?: string | null
          id?: string
          permit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_permit_change_history_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "route_permits"
            referencedColumns: ["id"]
          },
        ]
      }
      route_permits: {
        Row: {
          allocated_bus_number: string | null
          annual_fee: number | null
          approved_maximum_fare: number | null
          bus_id: string | null
          created_at: string
          expiry_date: string
          id: string
          issue_date: string
          max_fare: number | null
          ntc_number: string | null
          operation_status: string | null
          owner_address: string | null
          owner_name: string
          owner_nic: string | null
          permit_active_inactive: string | null
          permit_no: string
          permit_status: Database["public"]["Enums"]["permit_status"] | null
          route_id: string | null
          route_name: string | null
          route_numbers: string[] | null
          seats: number | null
          service_type: string | null
          temporary_route_name: string | null
          updated_at: string
          via: string | null
        }
        Insert: {
          allocated_bus_number?: string | null
          annual_fee?: number | null
          approved_maximum_fare?: number | null
          bus_id?: string | null
          created_at?: string
          expiry_date: string
          id?: string
          issue_date: string
          max_fare?: number | null
          ntc_number?: string | null
          operation_status?: string | null
          owner_address?: string | null
          owner_name: string
          owner_nic?: string | null
          permit_active_inactive?: string | null
          permit_no: string
          permit_status?: Database["public"]["Enums"]["permit_status"] | null
          route_id?: string | null
          route_name?: string | null
          route_numbers?: string[] | null
          seats?: number | null
          service_type?: string | null
          temporary_route_name?: string | null
          updated_at?: string
          via?: string | null
        }
        Update: {
          allocated_bus_number?: string | null
          annual_fee?: number | null
          approved_maximum_fare?: number | null
          bus_id?: string | null
          created_at?: string
          expiry_date?: string
          id?: string
          issue_date?: string
          max_fare?: number | null
          ntc_number?: string | null
          operation_status?: string | null
          owner_address?: string | null
          owner_name?: string
          owner_nic?: string | null
          permit_active_inactive?: string | null
          permit_no?: string
          permit_status?: Database["public"]["Enums"]["permit_status"] | null
          route_id?: string | null
          route_name?: string | null
          route_numbers?: string[] | null
          seats?: number | null
          service_type?: string | null
          temporary_route_name?: string | null
          updated_at?: string
          via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_permits_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_permits_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_staff_costs: {
        Row: {
          branch_id: string
          contact_number: string | null
          created_at: string
          created_by: string | null
          daily_rate: number | null
          end_date: string | null
          id: string
          is_active: boolean
          monthly_salary: number
          nic_number: string | null
          route_id: string
          staff_name: string
          staff_type: string
          start_date: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_salary?: number
          nic_number?: string | null
          route_id: string
          staff_name: string
          staff_type: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          contact_number?: string | null
          created_at?: string
          created_by?: string | null
          daily_rate?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_salary?: number
          nic_number?: string | null
          route_id?: string
          staff_name?: string
          staff_type?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      route_targets: {
        Row: {
          conductor_commission_percent: number
          created_at: string
          driver_commission_percent: number
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          revenue_target: number
          route_id: string | null
          updated_at: string
        }
        Insert: {
          conductor_commission_percent?: number
          created_at?: string
          driver_commission_percent?: number
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          revenue_target?: number
          route_id?: string | null
          updated_at?: string
        }
        Update: {
          conductor_commission_percent?: number
          created_at?: string
          driver_commission_percent?: number
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          revenue_target?: number
          route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_targets_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          category: string | null
          created_at: string
          distance_km: number | null
          end_location: string
          estimated_duration_minutes: number | null
          fare_amount: number | null
          gl_code: string | null
          id: string
          is_active: boolean | null
          route_group: string | null
          route_name: string
          route_no: string
          start_location: string
          updated_at: string
          via_locations: string[] | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          distance_km?: number | null
          end_location: string
          estimated_duration_minutes?: number | null
          fare_amount?: number | null
          gl_code?: string | null
          id?: string
          is_active?: boolean | null
          route_group?: string | null
          route_name: string
          route_no: string
          start_location: string
          updated_at?: string
          via_locations?: string[] | null
        }
        Update: {
          category?: string | null
          created_at?: string
          distance_km?: number | null
          end_location?: string
          estimated_duration_minutes?: number | null
          fare_amount?: number | null
          gl_code?: string | null
          id?: string
          is_active?: boolean | null
          route_group?: string | null
          route_name?: string
          route_no?: string
          start_location?: string
          updated_at?: string
          via_locations?: string[] | null
        }
        Relationships: []
      }
      safety_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          alert_type: string
          bus_id: string
          created_at: string | null
          driver_id: string | null
          event_timestamp: string
          id: string
          latitude: number | null
          longitude: number | null
          severity: string | null
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          alert_type: string
          bus_id: string
          created_at?: string | null
          driver_id?: string | null
          event_timestamp: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          alert_type?: string
          bus_id?: string
          created_at?: string | null
          driver_id?: string | null
          event_timestamp?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_alerts_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_lines: {
        Row: {
          created_at: string | null
          delivered_qty: number | null
          description: string | null
          discount_percent: number | null
          id: string
          invoiced_qty: number | null
          item_id: string | null
          line_total: number
          quantity: number
          sales_order_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_qty?: number | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoiced_qty?: number | null
          item_id?: string | null
          line_total: number
          quantity: number
          sales_order_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_qty?: number | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          invoiced_qty?: number | null
          item_id?: string | null
          line_total?: number
          quantity?: number
          sales_order_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          billing_address: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          delivery_date: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_date: string
          payment_terms_id: string | null
          shipping_address: string | null
          so_number: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_terms_id?: string | null
          shipping_address?: string | null
          so_number: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_terms_id?: string | null
          shipping_address?: string | null
          so_number?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_payment_terms_id_fkey"
            columns: ["payment_terms_id"]
            isOneToOne: false
            referencedRelation: "payment_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      sbus: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sbus_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          next_run_at: string | null
          run_count: number | null
          schedule_cron: string | null
          schedule_day: number | null
          schedule_time: string | null
          schedule_type: string | null
          task_config: Json | null
          task_name: string
          task_type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type?: string | null
          task_config?: Json | null
          task_name: string
          task_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          run_count?: number | null
          schedule_cron?: string | null
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type?: string | null
          task_config?: Json | null
          task_name?: string
          task_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ar_invoice_batches: {
        Row: {
          batch_number: string
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_month: string
          journal_entry_id: string | null
          posted_at: string | null
          status: string | null
          total_amount: number | null
          total_invoices: number | null
          total_students: number | null
        }
        Insert: {
          batch_number: string
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_month: string
          journal_entry_id?: string | null
          posted_at?: string | null
          status?: string | null
          total_amount?: number | null
          total_invoices?: number | null
          total_students?: number | null
        }
        Update: {
          batch_number?: string
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_month?: string
          journal_entry_id?: string | null
          posted_at?: string | null
          status?: string | null
          total_amount?: number | null
          total_invoices?: number | null
          total_students?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_ar_invoice_batches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoice_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoice_batches_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ar_invoices: {
        Row: {
          amount: number
          ar_invoice_id: string | null
          batch_id: string | null
          created_at: string | null
          id: string
          invoice_month: string
          invoice_number: string
          journal_entry_id: string | null
          paid_amount: number | null
          payment_id: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          amount: number
          ar_invoice_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          invoice_month: string
          invoice_number: string
          journal_entry_id?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          ar_invoice_id?: string | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          invoice_month?: string
          invoice_number?: string
          journal_entry_id?: string | null
          paid_amount?: number | null
          payment_id?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_ar_invoices_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoices_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "school_ar_invoice_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "school_payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_ar_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_branches: {
        Row: {
          address: string | null
          branch_code: string
          branch_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_total_branch: boolean | null
          manager_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_code: string
          branch_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_total_branch?: boolean | null
          manager_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_code?: string
          branch_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_total_branch?: boolean | null
          manager_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      school_bus_expense_gl_mappings: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          expense_category: string | null
          expense_type: string
          gl_account_id: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expense_category?: string | null
          expense_type: string
          gl_account_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expense_category?: string | null
          expense_type?: string
          gl_account_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_bus_expense_gl_mappings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_expense_gl_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_expense_gl_mappings_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      school_bus_finance_settings: {
        Row: {
          advance_payments_liability_account_id: string | null
          auto_post_expenses: boolean | null
          auto_post_invoices: boolean | null
          auto_post_payments: boolean | null
          bank_account_id: string | null
          billing_percentage: number | null
          branch_gl_account_id: string | null
          branch_id: string | null
          cash_account_id: string | null
          company_id: string | null
          created_at: string | null
          expense_account_id: string | null
          expense_cash_account_id: string | null
          fuel_bank_account_id: string | null
          fuel_expense_account_id: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          maintenance_expense_account_id: string | null
          salary_expense_account_id: string | null
          sbs_collection_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          advance_payments_liability_account_id?: string | null
          auto_post_expenses?: boolean | null
          auto_post_invoices?: boolean | null
          auto_post_payments?: boolean | null
          bank_account_id?: string | null
          billing_percentage?: number | null
          branch_gl_account_id?: string | null
          branch_id?: string | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expense_account_id?: string | null
          expense_cash_account_id?: string | null
          fuel_bank_account_id?: string | null
          fuel_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          maintenance_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          sbs_collection_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          advance_payments_liability_account_id?: string | null
          auto_post_expenses?: boolean | null
          auto_post_invoices?: boolean | null
          auto_post_payments?: boolean | null
          bank_account_id?: string | null
          billing_percentage?: number | null
          branch_gl_account_id?: string | null
          branch_id?: string | null
          cash_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          expense_account_id?: string | null
          expense_cash_account_id?: string | null
          fuel_bank_account_id?: string | null
          fuel_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          maintenance_expense_account_id?: string | null
          salary_expense_account_id?: string | null
          sbs_collection_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_bus_finance_settings_advance_payments_liability_acc_fkey"
            columns: ["advance_payments_liability_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_branch_gl_account_id_fkey"
            columns: ["branch_gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_expense_cash_account_id_fkey"
            columns: ["expense_cash_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_fuel_bank_account_id_fkey"
            columns: ["fuel_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_fuel_expense_account_id_fkey"
            columns: ["fuel_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_maintenance_expense_account_id_fkey"
            columns: ["maintenance_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_salary_expense_account_id_fkey"
            columns: ["salary_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_sbs_collection_account_id_fkey"
            columns: ["sbs_collection_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_bus_finance_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_import_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          extracted_ids: Json | null
          id: string
          import_id: string
          match_confidence: number | null
          match_status: string | null
          matched_student_ids: Json | null
          notes: string | null
          payment_transaction_ids: Json | null
          processed_at: string | null
          processed_by: string | null
          suggested_students: Json | null
          txn_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          extracted_ids?: Json | null
          id?: string
          import_id: string
          match_confidence?: number | null
          match_status?: string | null
          matched_student_ids?: Json | null
          notes?: string | null
          payment_transaction_ids?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          suggested_students?: Json | null
          txn_date: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          extracted_ids?: Json | null
          id?: string
          import_id?: string
          match_confidence?: number | null
          match_status?: string | null
          matched_student_ids?: Json | null
          notes?: string | null
          payment_transaction_ids?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          suggested_students?: Json | null
          txn_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_import_items_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "school_payment_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_import_settings: {
        Row: {
          admission_prefixes: Json | null
          auto_approve_high_confidence: boolean | null
          auto_split_siblings: boolean | null
          branch_id: string
          created_at: string | null
          custom_patterns: Json | null
          default_payment_method: string | null
          enable_pattern_learning: boolean | null
          id: string
          min_confidence_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          admission_prefixes?: Json | null
          auto_approve_high_confidence?: boolean | null
          auto_split_siblings?: boolean | null
          branch_id: string
          created_at?: string | null
          custom_patterns?: Json | null
          default_payment_method?: string | null
          enable_pattern_learning?: boolean | null
          id?: string
          min_confidence_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          admission_prefixes?: Json | null
          auto_approve_high_confidence?: boolean | null
          auto_split_siblings?: boolean | null
          branch_id?: string
          created_at?: string | null
          custom_patterns?: Json | null
          default_payment_method?: string | null
          enable_pattern_learning?: boolean | null
          id?: string
          min_confidence_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_import_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_imports: {
        Row: {
          auto_matched_count: number | null
          branch_id: string
          created_at: string | null
          created_by: string | null
          file_name: string
          id: string
          import_date: string | null
          manual_matched_count: number | null
          status: string | null
          total_amount_imported: number | null
          total_transactions: number | null
          unmatched_count: number | null
          updated_at: string | null
        }
        Insert: {
          auto_matched_count?: number | null
          branch_id: string
          created_at?: string | null
          created_by?: string | null
          file_name: string
          id?: string
          import_date?: string | null
          manual_matched_count?: number | null
          status?: string | null
          total_amount_imported?: number | null
          total_transactions?: number | null
          unmatched_count?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_matched_count?: number | null
          branch_id?: string
          created_at?: string | null
          created_by?: string | null
          file_name?: string
          id?: string
          import_date?: string | null
          manual_matched_count?: number | null
          status?: string | null
          total_amount_imported?: number | null
          total_transactions?: number | null
          unmatched_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_imports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_months: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          month_date: string
          month_year: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          month_date: string
          month_year: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          month_date?: string
          month_year?: string
        }
        Relationships: []
      }
      school_payment_pattern_history: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          last_used_at: string | null
          matched_admission_no: string
          original_description: string
          pattern_type: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          matched_admission_no: string
          original_description: string
          pattern_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          matched_admission_no?: string
          original_description?: string
          pattern_type?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_pattern_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_transactions: {
        Row: {
          amount_paid: number
          ar_receipt_id: string | null
          created_at: string | null
          created_by: string | null
          difference: number
          fixed_amount: number
          gl_posted: boolean | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_balance_after: number
          payment_balance_before: number
          payment_date: string
          payment_method: string
          payment_month: string
          reference_no: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid: number
          ar_receipt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difference: number
          fixed_amount: number
          gl_posted?: boolean | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_balance_after: number
          payment_balance_before: number
          payment_date?: string
          payment_method?: string
          payment_month: string
          reference_no?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number
          ar_receipt_id?: string | null
          created_at?: string | null
          created_by?: string | null
          difference?: number
          fixed_amount?: number
          gl_posted?: boolean | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_balance_after?: number
          payment_balance_before?: number
          payment_date?: string
          payment_method?: string
          payment_month?: string
          reference_no?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_transactions_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payment_transactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payment_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payments: {
        Row: {
          amount: number
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_month_id: string | null
          reference_no: string | null
          status: string | null
          student_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month_id?: string | null
          reference_no?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month_id?: string | null
          reference_no?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payments_payment_month_id_fkey"
            columns: ["payment_month_id"]
            isOneToOne: false
            referencedRelation: "school_payment_months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_receipts: {
        Row: {
          branch_id: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          payment_amount: number | null
          payment_date: string | null
          payment_id: string | null
          receipt_url: string
          rejection_reason: string | null
          student_id: string | null
          updated_at: string
          upload_source: string | null
          uploaded_by: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          receipt_url: string
          rejection_reason?: string | null
          student_id?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          payment_amount?: number | null
          payment_date?: string | null
          payment_id?: string | null
          receipt_url?: string
          rejection_reason?: string | null
          student_id?: string | null
          updated_at?: string
          upload_source?: string | null
          uploaded_by?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "school_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_receipts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_routes: {
        Row: {
          branch_id: string | null
          bus_reg_no: string | null
          created_at: string
          driver_contact: string | null
          driver_name: string | null
          end_location: string | null
          estimated_duration_minutes: number | null
          id: string
          is_active: boolean | null
          last_calculated_at: string | null
          net_profit: number | null
          outstanding_amount: number | null
          pickup_points: Json | null
          profit_margin: number | null
          route_code: string
          route_name: string
          start_location: string | null
          total_expenses: number | null
          total_income: number | null
          total_students: number | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          bus_reg_no?: string | null
          created_at?: string
          driver_contact?: string | null
          driver_name?: string | null
          end_location?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_calculated_at?: string | null
          net_profit?: number | null
          outstanding_amount?: number | null
          pickup_points?: Json | null
          profit_margin?: number | null
          route_code: string
          route_name: string
          start_location?: string | null
          total_expenses?: number | null
          total_income?: number | null
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          bus_reg_no?: string | null
          created_at?: string
          driver_contact?: string | null
          driver_name?: string | null
          end_location?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          last_calculated_at?: string | null
          net_profit?: number | null
          outstanding_amount?: number | null
          pickup_points?: Json | null
          profit_margin?: number | null
          route_code?: string
          route_name?: string
          start_location?: string | null
          total_expenses?: number | null
          total_income?: number | null
          total_students?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_routes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      school_student_ar_link: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_student_ar_link_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_student_ar_link_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "school_students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_students: {
        Row: {
          address: string | null
          admission_no: string | null
          branch_id: string | null
          bus_reg_no: string | null
          care_taker_contact_no: string | null
          care_taker_name: string | null
          created_at: string
          created_by: string | null
          current_amount_due: number | null
          driver_contact_no: string | null
          driver_name: string | null
          dropoff_point: string | null
          email_id: string | null
          emergency_contact_name: string | null
          emergency_contact_number: string | null
          father_contact_no: string | null
          fixed_monthly_amount: number | null
          grade: string | null
          id: string
          is_active: boolean | null
          last_payment_date: string | null
          mother_contact_no: string | null
          parent_name: string | null
          payment_amount: number | null
          payment_balance: number | null
          payment_date: string | null
          payment_status: string | null
          pickup_point: string | null
          pickup_point_cord: string | null
          pickup_point_definition: string | null
          remarks: string | null
          route: string | null
          sbs_cord: string | null
          school_location: string | null
          service_type: string | null
          student_name: string
          update_new: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          admission_no?: string | null
          branch_id?: string | null
          bus_reg_no?: string | null
          care_taker_contact_no?: string | null
          care_taker_name?: string | null
          created_at?: string
          created_by?: string | null
          current_amount_due?: number | null
          driver_contact_no?: string | null
          driver_name?: string | null
          dropoff_point?: string | null
          email_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          father_contact_no?: string | null
          fixed_monthly_amount?: number | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          mother_contact_no?: string | null
          parent_name?: string | null
          payment_amount?: number | null
          payment_balance?: number | null
          payment_date?: string | null
          payment_status?: string | null
          pickup_point?: string | null
          pickup_point_cord?: string | null
          pickup_point_definition?: string | null
          remarks?: string | null
          route?: string | null
          sbs_cord?: string | null
          school_location?: string | null
          service_type?: string | null
          student_name: string
          update_new?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          admission_no?: string | null
          branch_id?: string | null
          bus_reg_no?: string | null
          care_taker_contact_no?: string | null
          care_taker_name?: string | null
          created_at?: string
          created_by?: string | null
          current_amount_due?: number | null
          driver_contact_no?: string | null
          driver_name?: string | null
          dropoff_point?: string | null
          email_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_number?: string | null
          father_contact_no?: string | null
          fixed_monthly_amount?: number | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          mother_contact_no?: string | null
          parent_name?: string | null
          payment_amount?: number | null
          payment_balance?: number | null
          payment_date?: string | null
          payment_status?: string | null
          pickup_point?: string | null
          pickup_point_cord?: string | null
          pickup_point_definition?: string | null
          remarks?: string | null
          route?: string | null
          sbs_cord?: string | null
          school_location?: string | null
          service_type?: string | null
          student_name?: string
          update_new?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "school_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      seasonal_themes: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          is_enabled: boolean | null
          preview_image_url: string | null
          priority: number | null
          season_name: string
          start_date: string
          theme_config: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          preview_image_url?: string | null
          priority?: number | null
          season_name: string
          start_date: string
          theme_config?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_enabled?: boolean | null
          preview_image_url?: string | null
          priority?: number | null
          season_name?: string
          start_date?: string
          theme_config?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_themes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      segments: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_segment_id: string | null
          segment_code: string
          segment_name: string
          segment_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_segment_id?: string | null
          segment_code: string
          segment_name: string
          segment_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_segment_id?: string | null
          segment_code?: string
          segment_name?: string
          segment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segments_parent_segment_id_fkey"
            columns: ["parent_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segregation_rules: {
        Row: {
          action1: string
          action2: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          rule_code: string | null
          rule_name: string
        }
        Insert: {
          action1: string
          action2: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_code?: string | null
          rule_name: string
        }
        Update: {
          action1?: string
          action2?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_code?: string | null
          rule_name?: string
        }
        Relationships: []
      }
      serial_numbers: {
        Row: {
          batch_id: string | null
          created_at: string | null
          grn_id: string | null
          id: string
          invoice_id: string | null
          item_id: string
          location_code: string | null
          notes: string | null
          received_date: string | null
          serial_number: string
          sold_date: string | null
          status: string | null
          updated_at: string | null
          warehouse_id: string | null
          warranty_end_date: string | null
          warranty_start_date: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          grn_id?: string | null
          id?: string
          invoice_id?: string | null
          item_id: string
          location_code?: string | null
          notes?: string | null
          received_date?: string | null
          serial_number: string
          sold_date?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          grn_id?: string | null
          id?: string
          invoice_id?: string | null
          item_id?: string
          location_code?: string | null
          notes?: string | null
          received_date?: string | null
          serial_number?: string
          sold_date?: string | null
          status?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
          warranty_end_date?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serial_numbers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_numbers_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      service_alert_config: {
        Row: {
          alert_threshold_km: number
          created_at: string | null
          external_api_endpoint: string | null
          external_api_key: string | null
          id: string
          is_enabled: boolean | null
          service_interval_km: number
          updated_at: string | null
        }
        Insert: {
          alert_threshold_km?: number
          created_at?: string | null
          external_api_endpoint?: string | null
          external_api_key?: string | null
          id?: string
          is_enabled?: boolean | null
          service_interval_km?: number
          updated_at?: string | null
        }
        Update: {
          alert_threshold_km?: number
          created_at?: string | null
          external_api_endpoint?: string | null
          external_api_key?: string | null
          id?: string
          is_enabled?: boolean | null
          service_interval_km?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      service_master: {
        Row: {
          base_role: string | null
          created_at: string
          default_qty: number | null
          estimated_hours: number | null
          id: string
          item_code: string | null
          item_description: string | null
          notes: string | null
          role_rate_per_hour: number | null
          service_type: string
          updated_at: string
        }
        Insert: {
          base_role?: string | null
          created_at?: string
          default_qty?: number | null
          estimated_hours?: number | null
          id?: string
          item_code?: string | null
          item_description?: string | null
          notes?: string | null
          role_rate_per_hour?: number | null
          service_type: string
          updated_at?: string
        }
        Update: {
          base_role?: string | null
          created_at?: string
          default_qty?: number | null
          estimated_hours?: number | null
          id?: string
          item_code?: string | null
          item_description?: string | null
          notes?: string | null
          role_rate_per_hour?: number | null
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_types: {
        Row: {
          created_at: string
          description: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sinotruck_cash_receipts: {
        Row: {
          amount: number
          amount_in_words: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_contact: string | null
          customer_name: string | null
          customer_signature_data: string | null
          customer_signature_type: string | null
          customer_signed_at: string | null
          customer_signer_name: string | null
          finance_signature_data: string | null
          finance_signature_type: string | null
          finance_signed_at: string | null
          finance_signer_name: string | null
          id: string
          order_id: string
          payment_id: string
          payment_method: string | null
          pdf_url: string | null
          product_description: string | null
          quotation_no: string | null
          receipt_date: string
          receipt_no: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id: string
          payment_id: string
          payment_method?: string | null
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id?: string
          payment_id?: string
          payment_method?: string | null
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_cash_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_cash_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_customer_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_customer_payments: {
        Row: {
          ar_receipt_id: string | null
          bank_account_id: string | null
          bank_name: string | null
          bank_slip_no: string | null
          cheque_no: string | null
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          order_id: string | null
          payment_amount: number
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_schedule_id: string | null
          payment_slip_url: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_amount: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_amount?: number
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_customer_payments_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_customer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_customer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_customer_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_customers: {
        Row: {
          accounting_customer_id: string | null
          address: string | null
          company_name: string | null
          contact_number: string | null
          created_at: string | null
          customer_code: string
          customer_name: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          accounting_customer_id?: string | null
          address?: string | null
          company_name?: string | null
          contact_number?: string | null
          created_at?: string | null
          customer_code: string
          customer_name: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accounting_customer_id?: string | null
          address?: string | null
          company_name?: string | null
          contact_number?: string | null
          created_at?: string | null
          customer_code?: string
          customer_name?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sinotruck_accounting_customer"
            columns: ["accounting_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_finance_settings: {
        Row: {
          auto_create_customer: boolean | null
          auto_post_on_verify: boolean | null
          commission_expense_account_id: string | null
          company_id: string
          created_at: string | null
          customer_advance_account_id: string | null
          default_bank_account_id: string | null
          discount_expense_account_id: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          lc_bank_account_id: string | null
          receipt_prefix: string | null
          sales_revenue_account_id: string | null
          spare_parts_revenue_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string | null
          vat_output_account_id: string | null
          wht_payable_account_id: string | null
        }
        Insert: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Update: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_finance_settings_commission_expense_account_id_fkey"
            columns: ["commission_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_customer_advance_account_id_fkey"
            columns: ["customer_advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_discount_expense_account_id_fkey"
            columns: ["discount_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_lc_bank_account_id_fkey"
            columns: ["lc_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_spare_parts_revenue_account_id_fkey"
            columns: ["spare_parts_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_vat_output_account_id_fkey"
            columns: ["vat_output_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_finance_settings_wht_payable_account_id_fkey"
            columns: ["wht_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_invoice_documents: {
        Row: {
          created_at: string
          document_status: string
          file_name: string
          file_path: string
          file_size: number
          generated_at: string | null
          id: string
          invoice_data: Json | null
          invoice_record_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_status?: string
          file_name: string
          file_path: string
          file_size?: number
          generated_at?: string | null
          id?: string
          invoice_data?: Json | null
          invoice_record_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_status?: string
          file_name?: string
          file_path?: string
          file_size?: number
          generated_at?: string | null
          id?: string
          invoice_data?: Json | null
          invoice_record_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_invoice_documents_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_invoice_records"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_invoice_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          finance_company_address: string | null
          finance_company_name: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          invoice_amount: number
          invoice_category: string | null
          invoice_date: string
          invoice_no: string
          invoice_type: string | null
          notes: string | null
          order_id: string | null
          proforma_amount: number | null
          proforma_amount_percentage: number | null
          proforma_purpose: string | null
          quotation_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          invoice_amount: number
          invoice_category?: string | null
          invoice_date?: string
          invoice_no: string
          invoice_type?: string | null
          notes?: string | null
          order_id?: string | null
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          invoice_amount?: number
          invoice_category?: string | null
          invoice_date?: string
          invoice_no?: string
          invoice_type?: string | null
          notes?: string | null
          order_id?: string | null
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_invoice_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_invoice_records_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_invoice_signatures: {
        Row: {
          created_at: string
          id: string
          invoice_record_id: string
          signature_data: string
          signature_role: string
          signature_type: string
          signed_at: string
          signed_by: string | null
          signer_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_record_id: string
          signature_data: string
          signature_role: string
          signature_type?: string
          signed_at?: string
          signed_by?: string | null
          signer_name: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_record_id?: string
          signature_data?: string
          signature_role?: string
          signature_type?: string
          signed_at?: string
          signed_by?: string | null
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_invoice_signatures_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_invoice_records"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_orders: {
        Row: {
          actual_delivery_date: string | null
          ar_invoice_id: string | null
          balance_due: number | null
          created_at: string | null
          created_by: string | null
          current_phase: string | null
          customer_category_id: string | null
          customer_id: string | null
          expected_delivery_date: string | null
          finance_customer_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          order_date: string | null
          order_no: string
          payment_mode: string | null
          payment_structure: Json | null
          progress_percentage: number | null
          quantity: number | null
          quotation_id: string | null
          status: string | null
          total_amount: number | null
          total_paid: number | null
          truck_model: string
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          customer_category_id?: string | null
          customer_id?: string | null
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_date?: string | null
          order_no: string
          payment_mode?: string | null
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number | null
          quotation_id?: string | null
          status?: string | null
          total_amount?: number | null
          total_paid?: number | null
          truck_model: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          customer_category_id?: string | null
          customer_id?: string | null
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_date?: string | null
          order_no?: string
          payment_mode?: string | null
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number | null
          quotation_id?: string | null
          status?: string | null
          total_amount?: number | null
          total_paid?: number | null
          truck_model?: string
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_orders_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_orders_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_orders_finance_customer_id_fkey"
            columns: ["finance_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_orders_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_payment_schedules: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          id: string
          is_paid: boolean | null
          milestone_name: string
          notes: string | null
          order_id: string | null
          paid_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          milestone_name: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean | null
          milestone_name?: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_payment_schedules_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_quotation_signatures: {
        Row: {
          id: string
          quotation_id: string | null
          signature_data: string
          signature_role: string
          signature_type: string
          signed_at: string | null
          signed_by: string | null
          signer_name: string
        }
        Insert: {
          id?: string
          quotation_id?: string | null
          signature_data: string
          signature_role: string
          signature_type?: string
          signed_at?: string | null
          signed_by?: string | null
          signer_name: string
        }
        Update: {
          id?: string
          quotation_id?: string | null
          signature_data?: string
          signature_role?: string
          signature_type?: string
          signed_at?: string | null
          signed_by?: string | null
          signer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_quotation_signatures_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_quotations: {
        Row: {
          capacity_kw: number
          charger_capacity_kw: number | null
          charger_price: number | null
          condition: string
          contact_number: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_category_id: string | null
          customer_id: string | null
          customer_name: string
          id: string
          inquiry_id: string | null
          is_active_version: boolean | null
          parent_quotation_id: string | null
          payment_terms: string | null
          quantity: number
          quotation_date: string
          quotation_no: string
          referral_agent_id: string | null
          status: string | null
          terms_and_conditions: Json | null
          total_price: number
          truck_model_id: string | null
          truck_model_name: string
          unit_price: number
          updated_at: string | null
          valid_until: string | null
          version_number: string | null
          year: number
        }
        Insert: {
          capacity_kw: number
          charger_capacity_kw?: number | null
          charger_price?: number | null
          condition: string
          contact_number?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_id?: string | null
          customer_name: string
          id?: string
          inquiry_id?: string | null
          is_active_version?: boolean | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number
          quotation_date?: string
          quotation_no: string
          referral_agent_id?: string | null
          status?: string | null
          terms_and_conditions?: Json | null
          total_price: number
          truck_model_id?: string | null
          truck_model_name: string
          unit_price: number
          updated_at?: string | null
          valid_until?: string | null
          version_number?: string | null
          year: number
        }
        Update: {
          capacity_kw?: number
          charger_capacity_kw?: number | null
          charger_price?: number | null
          condition?: string
          contact_number?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_id?: string | null
          customer_name?: string
          id?: string
          inquiry_id?: string | null
          is_active_version?: boolean | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number
          quotation_date?: string
          quotation_no?: string
          referral_agent_id?: string | null
          status?: string | null
          terms_and_conditions?: Json | null
          total_price?: number
          truck_model_id?: string | null
          truck_model_name?: string
          unit_price?: number
          updated_at?: string | null
          valid_until?: string | null
          version_number?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_quotations_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_quotations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_quotations_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_quotations_truck_model_id_fkey"
            columns: ["truck_model_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_truck_models"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_referral_commission_payments: {
        Row: {
          commission_amount: number | null
          commission_pct: number | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          quotation_id: string | null
          referral_agent_id: string | null
          updated_at: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          quotation_id?: string | null
          referral_agent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          quotation_id?: string | null
          referral_agent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_referral_commission_payments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: true
            referencedRelation: "sinotruck_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sinotruck_referral_commission_payments_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_truck_model_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          truck_model_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          truck_model_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          truck_model_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sinotruck_truck_model_images_truck_model_id_fkey"
            columns: ["truck_model_id"]
            isOneToOne: false
            referencedRelation: "sinotruck_truck_models"
            referencedColumns: ["id"]
          },
        ]
      }
      sinotruck_truck_models: {
        Row: {
          abs_system: boolean | null
          base_price: number
          body_dimensions: string | null
          body_type: string | null
          body_volume: string | null
          cabin_features: string[] | null
          cabin_model: string | null
          cameras: string | null
          capacity_kw: number
          charger_capacity_kw: number | null
          charger_price: number | null
          clutch_type: string | null
          condition: string
          created_at: string | null
          curb_weight: string | null
          displacement: string | null
          drive_configuration: string | null
          driver_seat_type: string | null
          emission_standard: string | null
          engine_model: string | null
          engine_type: string | null
          front_axle_capacity: string | null
          fuel_tank_capacity: string | null
          fuel_type: string | null
          gears: string | null
          gps_tracking: boolean | null
          gradeability: string | null
          gvw_gcw: string | null
          horsepower: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_speed: string | null
          model_name: string
          multimedia_system: string | null
          overall_dimensions: string | null
          payload_capacity: string | null
          rear_axle_capacity: string | null
          rim_type: string | null
          seating_capacity: string | null
          special_features: Json | null
          specifications: Json | null
          suspension_type: string | null
          torque: string | null
          transmission_model: string | null
          transmission_type: string | null
          truck_name: string
          turning_radius: string | null
          tyre_quantity: string | null
          tyre_size: string | null
          updated_at: string | null
          wheelbase: string | null
          year: number
        }
        Insert: {
          abs_system?: boolean | null
          base_price: number
          body_dimensions?: string | null
          body_type?: string | null
          body_volume?: string | null
          cabin_features?: string[] | null
          cabin_model?: string | null
          cameras?: string | null
          capacity_kw: number
          charger_capacity_kw?: number | null
          charger_price?: number | null
          clutch_type?: string | null
          condition?: string
          created_at?: string | null
          curb_weight?: string | null
          displacement?: string | null
          drive_configuration?: string | null
          driver_seat_type?: string | null
          emission_standard?: string | null
          engine_model?: string | null
          engine_type?: string | null
          front_axle_capacity?: string | null
          fuel_tank_capacity?: string | null
          fuel_type?: string | null
          gears?: string | null
          gps_tracking?: boolean | null
          gradeability?: string | null
          gvw_gcw?: string | null
          horsepower?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_speed?: string | null
          model_name: string
          multimedia_system?: string | null
          overall_dimensions?: string | null
          payload_capacity?: string | null
          rear_axle_capacity?: string | null
          rim_type?: string | null
          seating_capacity?: string | null
          special_features?: Json | null
          specifications?: Json | null
          suspension_type?: string | null
          torque?: string | null
          transmission_model?: string | null
          transmission_type?: string | null
          truck_name: string
          turning_radius?: string | null
          tyre_quantity?: string | null
          tyre_size?: string | null
          updated_at?: string | null
          wheelbase?: string | null
          year: number
        }
        Update: {
          abs_system?: boolean | null
          base_price?: number
          body_dimensions?: string | null
          body_type?: string | null
          body_volume?: string | null
          cabin_features?: string[] | null
          cabin_model?: string | null
          cameras?: string | null
          capacity_kw?: number
          charger_capacity_kw?: number | null
          charger_price?: number | null
          clutch_type?: string | null
          condition?: string
          created_at?: string | null
          curb_weight?: string | null
          displacement?: string | null
          drive_configuration?: string | null
          driver_seat_type?: string | null
          emission_standard?: string | null
          engine_model?: string | null
          engine_type?: string | null
          front_axle_capacity?: string | null
          fuel_tank_capacity?: string | null
          fuel_type?: string | null
          gears?: string | null
          gps_tracking?: boolean | null
          gradeability?: string | null
          gvw_gcw?: string | null
          horsepower?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_speed?: string | null
          model_name?: string
          multimedia_system?: string | null
          overall_dimensions?: string | null
          payload_capacity?: string | null
          rear_axle_capacity?: string | null
          rim_type?: string | null
          seating_capacity?: string | null
          special_features?: Json | null
          specifications?: Json | null
          suspension_type?: string | null
          torque?: string | null
          transmission_model?: string | null
          transmission_type?: string | null
          truck_name?: string
          turning_radius?: string | null
          tyre_quantity?: string | null
          tyre_size?: string | null
          updated_at?: string | null
          wheelbase?: string | null
          year?: number
        }
        Relationships: []
      }
      special_hire_advance_details: {
        Row: {
          authorized_by_name: string | null
          authorized_by_signature_data: string | null
          authorized_by_signature_type: string | null
          checked_by_name: string | null
          checked_by_signature_data: string | null
          checked_by_signature_type: string | null
          conductor_contact: string | null
          conductor_meal_allowance: number | null
          conductor_name: string | null
          conductor_salary: number | null
          conductor_signature_data: string | null
          conductor_signature_type: string | null
          created_at: string | null
          created_by: string | null
          driver_contact: string
          driver_highway_charges: number | null
          driver_meal_allowance: number | null
          driver_name: string
          driver_other_charges: number | null
          driver_salary: number | null
          driver_signature_data: string | null
          driver_signature_type: string | null
          drop_location: string
          hire_date: string
          id: string
          notes: string | null
          number_of_days: number
          payment_id: string | null
          pdf_document_data: string | null
          pdf_generated_at: string | null
          pickup_location: string
          prepared_by_name: string
          prepared_by_signature_data: string | null
          prepared_by_signature_type: string | null
          quotation_id: string
          quotation_no: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          authorized_by_name?: string | null
          authorized_by_signature_data?: string | null
          authorized_by_signature_type?: string | null
          checked_by_name?: string | null
          checked_by_signature_data?: string | null
          checked_by_signature_type?: string | null
          conductor_contact?: string | null
          conductor_meal_allowance?: number | null
          conductor_name?: string | null
          conductor_salary?: number | null
          conductor_signature_data?: string | null
          conductor_signature_type?: string | null
          created_at?: string | null
          created_by?: string | null
          driver_contact: string
          driver_highway_charges?: number | null
          driver_meal_allowance?: number | null
          driver_name: string
          driver_other_charges?: number | null
          driver_salary?: number | null
          driver_signature_data?: string | null
          driver_signature_type?: string | null
          drop_location: string
          hire_date: string
          id?: string
          notes?: string | null
          number_of_days: number
          payment_id?: string | null
          pdf_document_data?: string | null
          pdf_generated_at?: string | null
          pickup_location: string
          prepared_by_name: string
          prepared_by_signature_data?: string | null
          prepared_by_signature_type?: string | null
          quotation_id: string
          quotation_no: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          authorized_by_name?: string | null
          authorized_by_signature_data?: string | null
          authorized_by_signature_type?: string | null
          checked_by_name?: string | null
          checked_by_signature_data?: string | null
          checked_by_signature_type?: string | null
          conductor_contact?: string | null
          conductor_meal_allowance?: number | null
          conductor_name?: string | null
          conductor_salary?: number | null
          conductor_signature_data?: string | null
          conductor_signature_type?: string | null
          created_at?: string | null
          created_by?: string | null
          driver_contact?: string
          driver_highway_charges?: number | null
          driver_meal_allowance?: number | null
          driver_name?: string
          driver_other_charges?: number | null
          driver_salary?: number | null
          driver_signature_data?: string | null
          driver_signature_type?: string | null
          drop_location?: string
          hire_date?: string
          id?: string
          notes?: string | null
          number_of_days?: number
          payment_id?: string | null
          pdf_document_data?: string | null
          pdf_generated_at?: string | null
          pickup_location?: string
          prepared_by_name?: string
          prepared_by_signature_data?: string | null
          prepared_by_signature_type?: string | null
          quotation_id?: string
          quotation_no?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_advance_details_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "special_hire_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_advance_details_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_finance_settings: {
        Row: {
          advance_receipt_prefix: string | null
          auto_post_advance_payments: boolean | null
          auto_post_balance_payments: boolean | null
          auto_post_invoices: boolean | null
          commission_expense_account_id: string | null
          company_id: string
          created_at: string | null
          customer_advance_account_id: string | null
          default_bank_account_id: string | null
          discount_expense_account_id: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          quotation_account_name: string | null
          quotation_account_no: string | null
          quotation_bank_name: string | null
          refund_expense_account_id: string | null
          revenue_external_account_id: string | null
          revenue_internal_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string | null
          vat_output_account_id: string | null
          wht_payable_account_id: string | null
        }
        Insert: {
          advance_receipt_prefix?: string | null
          auto_post_advance_payments?: boolean | null
          auto_post_balance_payments?: boolean | null
          auto_post_invoices?: boolean | null
          commission_expense_account_id?: string | null
          company_id: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          quotation_account_name?: string | null
          quotation_account_no?: string | null
          quotation_bank_name?: string | null
          refund_expense_account_id?: string | null
          revenue_external_account_id?: string | null
          revenue_internal_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Update: {
          advance_receipt_prefix?: string | null
          auto_post_advance_payments?: boolean | null
          auto_post_balance_payments?: boolean | null
          auto_post_invoices?: boolean | null
          commission_expense_account_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          quotation_account_name?: string | null
          quotation_account_no?: string | null
          quotation_bank_name?: string | null
          refund_expense_account_id?: string | null
          revenue_external_account_id?: string | null
          revenue_internal_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_finance_settings_commission_expense_account_i_fkey"
            columns: ["commission_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_customer_advance_account_id_fkey"
            columns: ["customer_advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_discount_expense_account_id_fkey"
            columns: ["discount_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_refund_expense_account_id_fkey"
            columns: ["refund_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_revenue_external_account_id_fkey"
            columns: ["revenue_external_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_revenue_internal_account_id_fkey"
            columns: ["revenue_internal_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_vat_output_account_id_fkey"
            columns: ["vat_output_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_finance_settings_wht_payable_account_id_fkey"
            columns: ["wht_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_invoices: {
        Row: {
          adjustment_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_at: string
          generated_by: string | null
          has_adjustments: boolean | null
          id: string
          invoice_no: string
          invoice_type: string
          quotation_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          adjustment_id?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          has_adjustments?: boolean | null
          id?: string
          invoice_no: string
          invoice_type: string
          quotation_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          has_adjustments?: boolean | null
          id?: string
          invoice_no?: string
          invoice_type?: string
          quotation_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_invoices_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "special_hire_trip_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_payments: {
        Row: {
          amount: number
          ar_invoice_id: string | null
          ar_receipt_id: string | null
          created_at: string
          created_by: string | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_at: string
          payment_method: string
          payment_proof_url: string | null
          payment_type: string
          quotation_id: string
          reference_no: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string
        }
        Insert: {
          amount: number
          ar_invoice_id?: string | null
          ar_receipt_id?: string | null
          created_at?: string
          created_by?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_at?: string
          payment_method: string
          payment_proof_url?: string | null
          payment_type: string
          quotation_id: string
          reference_no?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          ar_invoice_id?: string | null
          ar_receipt_id?: string | null
          created_at?: string
          created_by?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_at?: string
          payment_method?: string
          payment_proof_url?: string | null
          payment_type?: string
          quotation_id?: string
          reference_no?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_payments_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_payments_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_payments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_projects: {
        Row: {
          bus_id: string | null
          conductor_id: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          distance_km: number | null
          driver_id: string | null
          drop_location: string
          estimated_price: number | null
          extra_charges: number | null
          hire_type: string | null
          id: string
          net_income: number | null
          notes: string | null
          pickup_datetime: string | null
          pickup_location: string
          project_id: string | null
          status: string | null
          total_expenses: number | null
          updated_at: string
        }
        Insert: {
          bus_id?: string | null
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          distance_km?: number | null
          driver_id?: string | null
          drop_location: string
          estimated_price?: number | null
          extra_charges?: number | null
          hire_type?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          pickup_datetime?: string | null
          pickup_location: string
          project_id?: string | null
          status?: string | null
          total_expenses?: number | null
          updated_at?: string
        }
        Update: {
          bus_id?: string | null
          conductor_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          distance_km?: number | null
          driver_id?: string | null
          drop_location?: string
          estimated_price?: number | null
          extra_charges?: number | null
          hire_type?: string | null
          id?: string
          net_income?: number | null
          notes?: string | null
          pickup_datetime?: string | null
          pickup_location?: string
          project_id?: string | null
          status?: string | null
          total_expenses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_projects_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_projects_conductor_id_fkey"
            columns: ["conductor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_projects_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_quotations: {
        Row: {
          additional_charges: Json | null
          advance_paid: number | null
          approval_comments: string | null
          approval_date: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_by: string | null
          ar_invoice_id: string | null
          assigned_bus_no: string | null
          assigned_conductor_name: string | null
          assigned_driver_name: string | null
          audit_log: Json | null
          balance_due: number | null
          bus_fleet_details: Json | null
          bus_type_id: string | null
          cancellation_reason: string | null
          commission_amount: number | null
          commission_pass_through_amount: number | null
          commission_pass_through_pct: number | null
          commission_pct: number | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_total_with_fuel: number | null
          discount_amount_lkr: number | null
          discount_percentage: number | null
          discount_type: string | null
          driver_charge: number | null
          drop_datetime: string
          drop_lat: number | null
          drop_lng: number | null
          drop_location: string
          edit_reason: string | null
          edit_type: string | null
          exceeding_distance_charge: number | null
          extra_charges: number | null
          finance_customer_id: string | null
          fixed_rate: number | null
          fuel_cost_fuel_only: number | null
          fuel_price_per_liter: number | null
          gross_revenue: number | null
          hire_charge: number | null
          hire_type: string
          id: string
          intermediate_stops: Json | null
          is_active_version: boolean | null
          km_drop_to_parking: number | null
          km_parking_to_pickup: number | null
          km_trip: number | null
          manual_km_drop_to_parking: number | null
          manual_km_parking_to_pickup: number | null
          manual_km_trip: number | null
          net_profit: number | null
          number_of_buses: number
          number_of_passengers: number
          other_expenses: Json | null
          overnight_charge: number | null
          overtime_charge: number | null
          parent_quotation_id: string | null
          parking_location_id: string | null
          payment_account_name: string | null
          payment_account_no: string | null
          payment_bank_name: string | null
          percentage_adjustment: number | null
          pickup_datetime: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          quotation_no: string
          referral_agent_id: string | null
          referral_commission_amount: number | null
          referral_commission_pct: number | null
          refund_amount: number | null
          refund_processed_at: string | null
          refund_processed_by: string | null
          refund_reason: string | null
          refund_status: string | null
          sent_via_whatsapp: boolean | null
          special_request: string | null
          status: string | null
          status_change_reason: string | null
          status_changed_at: string | null
          status_changed_by: string | null
          submission_id: string | null
          total_additional_charges: number | null
          total_expenses: number | null
          total_paid: number | null
          trip_id: string | null
          trip_status: string | null
          updated_at: string | null
          uses_manual_parking_distance: boolean | null
          uses_manual_trip_distance: boolean | null
          uses_multi_parking: boolean | null
          uses_pickup_as_parking: boolean | null
          valid_until: string | null
          version_number: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          additional_charges?: Json | null
          advance_paid?: number | null
          approval_comments?: string | null
          approval_date?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          ar_invoice_id?: string | null
          assigned_bus_no?: string | null
          assigned_conductor_name?: string | null
          assigned_driver_name?: string | null
          audit_log?: Json | null
          balance_due?: number | null
          bus_fleet_details?: Json | null
          bus_type_id?: string | null
          cancellation_reason?: string | null
          commission_amount?: number | null
          commission_pass_through_amount?: number | null
          commission_pass_through_pct?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_total_with_fuel?: number | null
          discount_amount_lkr?: number | null
          discount_percentage?: number | null
          discount_type?: string | null
          driver_charge?: number | null
          drop_datetime: string
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location: string
          edit_reason?: string | null
          edit_type?: string | null
          exceeding_distance_charge?: number | null
          extra_charges?: number | null
          finance_customer_id?: string | null
          fixed_rate?: number | null
          fuel_cost_fuel_only?: number | null
          fuel_price_per_liter?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type: string
          id?: string
          intermediate_stops?: Json | null
          is_active_version?: boolean | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          manual_km_drop_to_parking?: number | null
          manual_km_parking_to_pickup?: number | null
          manual_km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers: number
          other_expenses?: Json | null
          overnight_charge?: number | null
          overtime_charge?: number | null
          parent_quotation_id?: string | null
          parking_location_id?: string | null
          payment_account_name?: string | null
          payment_account_no?: string | null
          payment_bank_name?: string | null
          percentage_adjustment?: number | null
          pickup_datetime: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          quotation_no?: string
          referral_agent_id?: string | null
          referral_commission_amount?: number | null
          referral_commission_pct?: number | null
          refund_amount?: number | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          sent_via_whatsapp?: boolean | null
          special_request?: string | null
          status?: string | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          submission_id?: string | null
          total_additional_charges?: number | null
          total_expenses?: number | null
          total_paid?: number | null
          trip_id?: string | null
          trip_status?: string | null
          updated_at?: string | null
          uses_manual_parking_distance?: boolean | null
          uses_manual_trip_distance?: boolean | null
          uses_multi_parking?: boolean | null
          uses_pickup_as_parking?: boolean | null
          valid_until?: string | null
          version_number?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          additional_charges?: Json | null
          advance_paid?: number | null
          approval_comments?: string | null
          approval_date?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by?: string | null
          ar_invoice_id?: string | null
          assigned_bus_no?: string | null
          assigned_conductor_name?: string | null
          assigned_driver_name?: string | null
          audit_log?: Json | null
          balance_due?: number | null
          bus_fleet_details?: Json | null
          bus_type_id?: string | null
          cancellation_reason?: string | null
          commission_amount?: number | null
          commission_pass_through_amount?: number | null
          commission_pass_through_pct?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_total_with_fuel?: number | null
          discount_amount_lkr?: number | null
          discount_percentage?: number | null
          discount_type?: string | null
          driver_charge?: number | null
          drop_datetime?: string
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location?: string
          edit_reason?: string | null
          edit_type?: string | null
          exceeding_distance_charge?: number | null
          extra_charges?: number | null
          finance_customer_id?: string | null
          fixed_rate?: number | null
          fuel_cost_fuel_only?: number | null
          fuel_price_per_liter?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type?: string
          id?: string
          intermediate_stops?: Json | null
          is_active_version?: boolean | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          manual_km_drop_to_parking?: number | null
          manual_km_parking_to_pickup?: number | null
          manual_km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers?: number
          other_expenses?: Json | null
          overnight_charge?: number | null
          overtime_charge?: number | null
          parent_quotation_id?: string | null
          parking_location_id?: string | null
          payment_account_name?: string | null
          payment_account_no?: string | null
          payment_bank_name?: string | null
          percentage_adjustment?: number | null
          pickup_datetime?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          quotation_no?: string
          referral_agent_id?: string | null
          referral_commission_amount?: number | null
          referral_commission_pct?: number | null
          refund_amount?: number | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_status?: string | null
          sent_via_whatsapp?: boolean | null
          special_request?: string | null
          status?: string | null
          status_change_reason?: string | null
          status_changed_at?: string | null
          status_changed_by?: string | null
          submission_id?: string | null
          total_additional_charges?: number | null
          total_expenses?: number | null
          total_paid?: number | null
          trip_id?: string | null
          trip_status?: string | null
          updated_at?: string | null
          uses_manual_parking_distance?: boolean | null
          uses_manual_trip_distance?: boolean | null
          uses_multi_parking?: boolean | null
          uses_pickup_as_parking?: boolean | null
          valid_until?: string | null
          version_number?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_special_hire_quotations_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "special_hire_quotations_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_bus_type_id_fkey"
            columns: ["bus_type_id"]
            isOneToOne: false
            referencedRelation: "bus_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_finance_customer_id_fkey"
            columns: ["finance_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_parking_location_id_fkey"
            columns: ["parking_location_id"]
            isOneToOne: false
            referencedRelation: "fuel_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_quotations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "special_hire_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_remarks: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          quotation_id: string
          remark_type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          quotation_id: string
          remark_type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          quotation_id?: string
          remark_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_remarks_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_signature_settings: {
        Row: {
          created_at: string | null
          default_user_id: string | null
          id: string
          is_enabled: boolean | null
          signature_role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_user_id?: string | null
          id?: string
          is_enabled?: boolean | null
          signature_role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_user_id?: string | null
          id?: string
          is_enabled?: boolean | null
          signature_role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      special_hire_submissions: {
        Row: {
          company_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          drop_datetime: string
          drop_location: string
          hire_type: string
          id: string
          number_of_buses: number
          number_of_passengers: number
          pickup_datetime: string
          pickup_location: string
          quotation_id: string | null
          selected_at: string | null
          selected_by: string | null
          special_request: string | null
          submission_no: string
          submission_status: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          drop_datetime: string
          drop_location: string
          hire_type?: string
          id?: string
          number_of_buses?: number
          number_of_passengers: number
          pickup_datetime: string
          pickup_location: string
          quotation_id?: string | null
          selected_at?: string | null
          selected_by?: string | null
          special_request?: string | null
          submission_no?: string
          submission_status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          drop_datetime?: string
          drop_location?: string
          hire_type?: string
          id?: string
          number_of_buses?: number
          number_of_passengers?: number
          pickup_datetime?: string
          pickup_location?: string
          quotation_id?: string | null
          selected_at?: string | null
          selected_by?: string | null
          special_request?: string | null
          submission_no?: string
          submission_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_submissions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      special_hire_trip_adjustments: {
        Row: {
          actual_drop_datetime: string | null
          actual_hours: number | null
          actual_km_traveled: number | null
          actual_overnight_charge: number | null
          actual_overtime_charge: number | null
          actual_pickup_datetime: string | null
          additional_expenses: Json | null
          adjusted_at: string | null
          adjusted_by: string | null
          adjustment_amount: number | null
          adjustment_status: string | null
          advance_already_paid: number | null
          balance_due: number | null
          balance_invoice_document_id: string | null
          created_at: string | null
          extra_hours: number | null
          extra_km: number | null
          extra_km_charge_per_km: number | null
          extra_km_total_charge: number | null
          final_trip_amount: number | null
          id: string
          notes: string | null
          original_drop_datetime: string | null
          original_hours: number | null
          original_overnight_charge: number | null
          original_overtime_charge: number | null
          original_pickup_datetime: string | null
          original_quotation_amount: number | null
          original_quoted_km: number | null
          overnight_charge_adjustment: number | null
          overtime_charge_adjustment: number | null
          quotation_id: string
          total_additional_expenses: number | null
          total_time_adjustment: number | null
          updated_at: string | null
        }
        Insert: {
          actual_drop_datetime?: string | null
          actual_hours?: number | null
          actual_km_traveled?: number | null
          actual_overnight_charge?: number | null
          actual_overtime_charge?: number | null
          actual_pickup_datetime?: string | null
          additional_expenses?: Json | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_amount?: number | null
          adjustment_status?: string | null
          advance_already_paid?: number | null
          balance_due?: number | null
          balance_invoice_document_id?: string | null
          created_at?: string | null
          extra_hours?: number | null
          extra_km?: number | null
          extra_km_charge_per_km?: number | null
          extra_km_total_charge?: number | null
          final_trip_amount?: number | null
          id?: string
          notes?: string | null
          original_drop_datetime?: string | null
          original_hours?: number | null
          original_overnight_charge?: number | null
          original_overtime_charge?: number | null
          original_pickup_datetime?: string | null
          original_quotation_amount?: number | null
          original_quoted_km?: number | null
          overnight_charge_adjustment?: number | null
          overtime_charge_adjustment?: number | null
          quotation_id: string
          total_additional_expenses?: number | null
          total_time_adjustment?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_drop_datetime?: string | null
          actual_hours?: number | null
          actual_km_traveled?: number | null
          actual_overnight_charge?: number | null
          actual_overtime_charge?: number | null
          actual_pickup_datetime?: string | null
          additional_expenses?: Json | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_amount?: number | null
          adjustment_status?: string | null
          advance_already_paid?: number | null
          balance_due?: number | null
          balance_invoice_document_id?: string | null
          created_at?: string | null
          extra_hours?: number | null
          extra_km?: number | null
          extra_km_charge_per_km?: number | null
          extra_km_total_charge?: number | null
          final_trip_amount?: number | null
          id?: string
          notes?: string | null
          original_drop_datetime?: string | null
          original_hours?: number | null
          original_overnight_charge?: number | null
          original_overtime_charge?: number | null
          original_pickup_datetime?: string | null
          original_quotation_amount?: number | null
          original_quoted_km?: number | null
          overnight_charge_adjustment?: number | null
          overtime_charge_adjustment?: number | null
          quotation_id?: string
          total_additional_expenses?: number | null
          total_time_adjustment?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_trip_adjustments_balance_invoice_document_id_fkey"
            columns: ["balance_invoice_document_id"]
            isOneToOne: false
            referencedRelation: "document_storage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_hire_trip_adjustments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      sscl_transactions: {
        Row: {
          company_id: string | null
          created_at: string | null
          gross_amount: number
          id: string
          reference_id: string | null
          reference_type: string | null
          remittance_date: string | null
          sscl_amount: number
          sscl_rate: number
          status: string | null
          transaction_date: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          gross_amount: number
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          remittance_date?: string | null
          sscl_amount: number
          sscl_rate: number
          status?: string | null
          transaction_date: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          gross_amount?: number
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          remittance_date?: string | null
          sscl_amount?: number
          sscl_rate?: number
          status?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sscl_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          attendance_date: string
          auto_generated: boolean | null
          auto_synced: boolean | null
          bus_no: string | null
          commission_earned: number | null
          created_at: string
          daily_rate: number | null
          end_time: string | null
          hours_worked: number | null
          id: string
          overtime_hours: number | null
          route: string | null
          salary_type: Database["public"]["Enums"]["salary_type"] | null
          staff_id: string
          staff_name: string
          staff_registry_id: string | null
          start_time: string | null
          status: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          auto_generated?: boolean | null
          auto_synced?: boolean | null
          bus_no?: string | null
          commission_earned?: number | null
          created_at?: string
          daily_rate?: number | null
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          overtime_hours?: number | null
          route?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          staff_id: string
          staff_name: string
          staff_registry_id?: string | null
          start_time?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          auto_generated?: boolean | null
          auto_synced?: boolean | null
          bus_no?: string | null
          commission_earned?: number | null
          created_at?: string
          daily_rate?: number | null
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          overtime_hours?: number | null
          route?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"] | null
          staff_id?: string
          staff_name?: string
          staff_registry_id?: string | null
          start_time?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_registry_id_fkey"
            columns: ["staff_registry_id"]
            isOneToOne: false
            referencedRelation: "staff_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_commissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commission_amount: number
          commission_percent: number
          created_at: string
          excess_revenue: number
          id: string
          notes: string | null
          paid_at: string | null
          route_id: string | null
          route_revenue: number
          staff_id: string
          status: Database["public"]["Enums"]["commission_status"] | null
          target_amount: number
          trip_date: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          excess_revenue?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          route_id?: string | null
          route_revenue?: number
          staff_id: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          target_amount?: number
          trip_date: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          excess_revenue?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          route_id?: string | null
          route_revenue?: number
          staff_id?: string
          status?: Database["public"]["Enums"]["commission_status"] | null
          target_amount?: number
          trip_date?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_commissions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "daily_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance: {
        Row: {
          created_at: string | null
          id: string
          license_number: string | null
          name: string
          phone: string | null
          role: string | null
          staff_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          license_number?: string | null
          name: string
          phone?: string | null
          role?: string | null
          staff_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          license_number?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          staff_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_registry: {
        Row: {
          address: string | null
          blood_group: string | null
          contact_number: string | null
          created_at: string
          daily_rate: number | null
          date_of_birth: string | null
          emergency_contact: string | null
          id: string
          is_active: boolean | null
          joined_date: string | null
          license_expiry: string | null
          license_number: string | null
          license_type: string | null
          monthly_salary: number | null
          nic_number: string | null
          notes: string | null
          profile_id: string | null
          salary_type: Database["public"]["Enums"]["salary_type"]
          staff_name: string
          staff_type: Database["public"]["Enums"]["staff_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          blood_group?: string | null
          contact_number?: string | null
          created_at?: string
          daily_rate?: number | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          id?: string
          is_active?: boolean | null
          joined_date?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          monthly_salary?: number | null
          nic_number?: string | null
          notes?: string | null
          profile_id?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          staff_name: string
          staff_type: Database["public"]["Enums"]["staff_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          blood_group?: string | null
          contact_number?: string | null
          created_at?: string
          daily_rate?: number | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          id?: string
          is_active?: boolean | null
          joined_date?: string | null
          license_expiry?: string | null
          license_number?: string | null
          license_type?: string | null
          monthly_salary?: number | null
          nic_number?: string | null
          notes?: string | null
          profile_id?: string | null
          salary_type?: Database["public"]["Enums"]["salary_type"]
          staff_name?: string
          staff_type?: Database["public"]["Enums"]["staff_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_registry_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_lines: {
        Row: {
          adjustment_id: string | null
          id: string
          item_id: string | null
          physical_quantity: number
          reason: string | null
          system_quantity: number
          unit_cost: number | null
          value_change: number | null
          variance_quantity: number | null
        }
        Insert: {
          adjustment_id?: string | null
          id?: string
          item_id?: string | null
          physical_quantity: number
          reason?: string | null
          system_quantity: number
          unit_cost?: number | null
          value_change?: number | null
          variance_quantity?: number | null
        }
        Update: {
          adjustment_id?: string | null
          id?: string
          item_id?: string | null
          physical_quantity?: number
          reason?: string | null
          system_quantity?: number
          unit_cost?: number | null
          value_change?: number | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_lines_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          reason: string | null
          status: string | null
          total_value_change: number | null
          warehouse_id: string | null
        }
        Insert: {
          adjustment_date: string
          adjustment_number: string
          adjustment_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          reason?: string | null
          status?: string | null
          total_value_change?: number | null
          warehouse_id?: string | null
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          adjustment_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          reason?: string | null
          status?: string | null
          total_value_change?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string | null
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          running_balance: number | null
          serial_number: string | null
          total_cost: number | null
          transaction_date: string
          transaction_type: string
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          serial_number?: string | null
          total_cost?: number | null
          transaction_date: string
          transaction_type: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string | null
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number | null
          serial_number?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type?: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          id: string
          item_id: string | null
          quantity: number
          received_quantity: number | null
          transfer_id: string | null
          unit_cost: number | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          quantity: number
          received_quantity?: number | null
          transfer_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          id?: string
          item_id?: string | null
          quantity?: number
          received_quantity?: number | null
          transfer_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          expected_arrival_date: string | null
          from_bin_id: string | null
          from_warehouse_id: string | null
          id: string
          notes: string | null
          status: string | null
          to_bin_id: string | null
          to_warehouse_id: string | null
          total_items: number | null
          total_value: number | null
          transfer_date: string
          transfer_number: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_arrival_date?: string | null
          from_bin_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          to_bin_id?: string | null
          to_warehouse_id?: string | null
          total_items?: number | null
          total_value?: number | null
          transfer_date: string
          transfer_number: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_arrival_date?: string | null
          from_bin_id?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          to_bin_id?: string | null
          to_warehouse_id?: string | null
          total_items?: number | null
          total_value?: number | null
          transfer_date?: string
          transfer_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      subledger_reconciliations: {
        Row: {
          company_id: string | null
          created_at: string
          details: Json | null
          difference: number | null
          gl_account_id: string | null
          gl_balance: number
          id: string
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          reconciliation_type: string
          status: string
          subledger_total: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          details?: Json | null
          difference?: number | null
          gl_account_id?: string | null
          gl_balance?: number
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          reconciliation_type: string
          status?: string
          subledger_total?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          details?: Json | null
          difference?: number | null
          gl_account_id?: string | null
          gl_balance?: number
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          reconciliation_type?: string
          status?: string
          subledger_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subledger_reconciliations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subledger_reconciliations_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_rules: {
        Row: {
          created_at: string
          description: string
          id: string
          params: Json
          rule_type: Database["public"]["Enums"]["submission_rule_type"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          params?: Json
          rule_type: Database["public"]["Enums"]["submission_rule_type"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          params?: Json
          rule_type?: Database["public"]["Enums"]["submission_rule_type"]
        }
        Relationships: []
      }
      supplier_quotation_lines: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          lead_time_days: number | null
          line_total: number
          quantity: number
          quotation_id: string | null
          rfq_line_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          lead_time_days?: number | null
          line_total: number
          quantity: number
          quotation_id?: string | null
          rfq_line_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          lead_time_days?: number | null
          line_total?: number
          quantity?: number
          quotation_id?: string | null
          rfq_line_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotation_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_lines_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotation_lines_rfq_line_id_fkey"
            columns: ["rfq_line_id"]
            isOneToOne: false
            referencedRelation: "rfq_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotations: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          is_selected: boolean | null
          notes: string | null
          quotation_date: string
          rfq_id: string | null
          sq_number: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
          valid_until: string | null
          vendor_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          quotation_date?: string
          rfq_id?: string | null
          sq_number: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          quotation_date?: string
          rfq_id?: string | null
          sq_number?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          valid_until?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "request_for_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      system_flow_diagrams: {
        Row: {
          created_at: string
          created_by: string | null
          diagram_name: string
          flow_config: Json
          id: string
          is_active: boolean | null
          is_default: boolean | null
          module_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagram_name?: string
          flow_config?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          module_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagram_name?: string
          flow_config?: Json
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          module_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          check_name: string
          check_type: string
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          id: string
          is_test_data: boolean | null
          message: string | null
          metadata: Json | null
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_name: string
          check_type: string
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          id?: string
          is_test_data?: boolean | null
          message?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          status: string
        }
        Update: {
          check_name?: string
          check_type?: string
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          id?: string
          is_test_data?: boolean | null
          message?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      system_issues: {
        Row: {
          assigned_to: string | null
          auto_diagnosis: string | null
          browser_info: string | null
          category: string
          created_at: string | null
          description: string | null
          error_message: string | null
          id: string
          is_auto_diagnosed: boolean | null
          issue_number: number
          notification_sent: boolean | null
          notify_reporter: boolean | null
          page_name: string | null
          page_url: string | null
          priority: string
          reported_by: string | null
          reporter_email: string | null
          reporter_name: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          status: string
          suggested_fix: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          auto_diagnosis?: string | null
          browser_info?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          is_auto_diagnosed?: boolean | null
          issue_number?: number
          notification_sent?: boolean | null
          notify_reporter?: boolean | null
          page_name?: string | null
          page_url?: string | null
          priority?: string
          reported_by?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          suggested_fix?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          auto_diagnosis?: string | null
          browser_info?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          is_auto_diagnosed?: boolean | null
          issue_number?: number
          notification_sent?: boolean | null
          notify_reporter?: boolean | null
          page_name?: string | null
          page_url?: string | null
          priority?: string
          reported_by?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          suggested_fix?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_notifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          module: string | null
          notification_type: string
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          severity: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          module?: string | null
          notification_type: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          module?: string | null
          notification_type?: string
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          severity?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tax_codes: {
        Row: {
          created_at: string | null
          gl_account_id: string | null
          id: string
          is_active: boolean | null
          is_input_tax: boolean | null
          is_output_tax: boolean | null
          rate: number
          tax_code: string
          tax_name: string
          tax_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_input_tax?: boolean | null
          is_output_tax?: boolean | null
          rate: number
          tax_code: string
          tax_name: string
          tax_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_input_tax?: boolean | null
          is_output_tax?: boolean | null
          rate?: number
          tax_code?: string
          tax_name?: string
          tax_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_codes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      temporary_accounts: {
        Row: {
          account_code: string
          auth_user_id: string
          created_at: string
          created_by: string | null
          generated_email: string
          id: string
          last_login_at: string | null
          login_count: number | null
          notes: string | null
          profile_id: string | null
          status: string
          updated_at: string
          valid_until: string
          validity_hours: number
        }
        Insert: {
          account_code: string
          auth_user_id: string
          created_at?: string
          created_by?: string | null
          generated_email: string
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          notes?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
          valid_until: string
          validity_hours?: number
        }
        Update: {
          account_code?: string
          auth_user_id?: string
          created_at?: string
          created_by?: string | null
          generated_email?: string
          id?: string
          last_login_at?: string | null
          login_count?: number | null
          notes?: string | null
          profile_id?: string | null
          status?: string
          updated_at?: string
          valid_until?: string
          validity_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "temporary_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_presets: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_system_preset: boolean | null
          preset_name: string
          preview_image_url: string | null
          theme_config: Json
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_system_preset?: boolean | null
          preset_name: string
          preview_image_url?: string | null
          theme_config: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_system_preset?: boolean | null
          preset_name?: string
          preview_image_url?: string | null
          theme_config?: Json
        }
        Relationships: []
      }
      trip_confirmations: {
        Row: {
          actual_bus_number: string | null
          actual_conductor_id: string | null
          actual_distance_km: number | null
          actual_driver_id: string | null
          actual_fuel_cost: number | null
          bus_type_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          customer_name: string
          drop_datetime: string
          drop_location: string
          id: string
          number_of_buses: number
          number_of_passengers: number
          pickup_datetime: string
          pickup_location: string
          quotation_id: string
          quotation_no: string
          status: string
          trip_completed_at: string | null
          trip_started_at: string | null
          updated_at: string
        }
        Insert: {
          actual_bus_number?: string | null
          actual_conductor_id?: string | null
          actual_distance_km?: number | null
          actual_driver_id?: string | null
          actual_fuel_cost?: number | null
          bus_type_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_name: string
          drop_datetime: string
          drop_location: string
          id?: string
          number_of_buses?: number
          number_of_passengers: number
          pickup_datetime: string
          pickup_location: string
          quotation_id: string
          quotation_no: string
          status?: string
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
        }
        Update: {
          actual_bus_number?: string | null
          actual_conductor_id?: string | null
          actual_distance_km?: number | null
          actual_driver_id?: string | null
          actual_fuel_cost?: number | null
          bus_type_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_name?: string
          drop_datetime?: string
          drop_location?: string
          id?: string
          number_of_buses?: number
          number_of_passengers?: number
          pickup_datetime?: string
          pickup_location?: string
          quotation_id?: string
          quotation_no?: string
          status?: string
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_confirmations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "special_hire_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          created_at: string
          expense_description: string | null
          expense_type: string
          id: string
          is_estimated: boolean | null
          notes: string | null
          trip_confirmation_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          expense_description?: string | null
          expense_type: string
          id?: string
          is_estimated?: boolean | null
          notes?: string | null
          trip_confirmation_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          expense_description?: string | null
          expense_type?: string
          id?: string
          is_estimated?: boolean | null
          notes?: string | null
          trip_confirmation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_expenses_trip_confirmation_id_fkey"
            columns: ["trip_confirmation_id"]
            isOneToOne: false
            referencedRelation: "trip_confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invoices: {
        Row: {
          additional_charges: number | null
          advance_paid: number | null
          balance_due: number | null
          created_at: string
          created_by: string | null
          discount_amount: number | null
          discount_percent: number | null
          due_date: string | null
          final_amount: number
          id: string
          invoice_date: string
          invoice_no: string
          invoice_status: string
          quotation_no: string
          refund_amount: number | null
          total_actual_amount: number
          total_quoted_amount: number
          trip_confirmation_id: string
          updated_at: string
        }
        Insert: {
          additional_charges?: number | null
          advance_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          due_date?: string | null
          final_amount?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          invoice_status?: string
          quotation_no: string
          refund_amount?: number | null
          total_actual_amount?: number
          total_quoted_amount?: number
          trip_confirmation_id: string
          updated_at?: string
        }
        Update: {
          additional_charges?: number | null
          advance_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          due_date?: string | null
          final_amount?: number
          id?: string
          invoice_date?: string
          invoice_no?: string
          invoice_status?: string
          quotation_no?: string
          refund_amount?: number | null
          total_actual_amount?: number
          total_quoted_amount?: number
          trip_confirmation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invoices_trip_confirmation_id_fkey"
            columns: ["trip_confirmation_id"]
            isOneToOne: false
            referencedRelation: "trip_confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string | null
          payment_method: string | null
          payment_proof_filename: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          payment_status: string
          payment_type: string
          quotation_no: string
          received_at: string | null
          received_by: string | null
          rejection_reason: string | null
          rounded_amount: number
          trip_confirmation_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_filename?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_status?: string
          payment_type?: string
          quotation_no: string
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          rounded_amount: number
          trip_confirmation_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_filename?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          payment_status?: string
          payment_type?: string
          quotation_no?: string
          received_at?: string | null
          received_by?: string | null
          rejection_reason?: string | null
          rounded_amount?: number
          trip_confirmation_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_payments_trip_confirmation_id_fkey"
            columns: ["trip_confirmation_id"]
            isOneToOne: false
            referencedRelation: "trip_confirmations"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_brands_catalog: {
        Row: {
          average_cost: number | null
          brand_name: string
          created_at: string | null
          expected_lifespan_km: number | null
          id: string
          is_active: boolean | null
          model_name: string | null
          size: string
          supplier: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          average_cost?: number | null
          brand_name: string
          created_at?: string | null
          expected_lifespan_km?: number | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          size: string
          supplier?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          average_cost?: number | null
          brand_name?: string
          created_at?: string | null
          expected_lifespan_km?: number | null
          id?: string
          is_active?: boolean | null
          model_name?: string | null
          size?: string
          supplier?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tyre_inspection_records: {
        Row: {
          bus_id: string
          condition_status: string | null
          created_at: string | null
          damage_notes: string | null
          id: string
          inspection_date: string
          inspector_id: string | null
          next_inspection_date: string | null
          photos: Json | null
          pressure_psi: number | null
          recommendation: string | null
          tread_depth_mm: number | null
          tyre_id: string | null
          wear_pattern: string | null
        }
        Insert: {
          bus_id: string
          condition_status?: string | null
          created_at?: string | null
          damage_notes?: string | null
          id?: string
          inspection_date: string
          inspector_id?: string | null
          next_inspection_date?: string | null
          photos?: Json | null
          pressure_psi?: number | null
          recommendation?: string | null
          tread_depth_mm?: number | null
          tyre_id?: string | null
          wear_pattern?: string | null
        }
        Update: {
          bus_id?: string
          condition_status?: string | null
          created_at?: string | null
          damage_notes?: string | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          next_inspection_date?: string | null
          photos?: Json | null
          pressure_psi?: number | null
          recommendation?: string | null
          tread_depth_mm?: number | null
          tyre_id?: string | null
          wear_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tyre_inspection_records_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tyre_inspection_records_tyre_id_fkey"
            columns: ["tyre_id"]
            isOneToOne: false
            referencedRelation: "bus_tyres"
            referencedColumns: ["id"]
          },
        ]
      }
      tyre_rotation_history: {
        Row: {
          bus_id: string
          created_at: string | null
          id: string
          km_at_rotation: number | null
          notes: string | null
          performed_by: string | null
          reason: string | null
          rotation_date: string
          rotation_type: string | null
          tyres_moved: Json | null
        }
        Insert: {
          bus_id: string
          created_at?: string | null
          id?: string
          km_at_rotation?: number | null
          notes?: string | null
          performed_by?: string | null
          reason?: string | null
          rotation_date: string
          rotation_type?: string | null
          tyres_moved?: Json | null
        }
        Update: {
          bus_id?: string
          created_at?: string | null
          id?: string
          km_at_rotation?: number | null
          notes?: string | null
          performed_by?: string | null
          reason?: string | null
          rotation_date?: string
          rotation_type?: string | null
          tyres_moved?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tyre_rotation_history_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_of_measures: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          uom_name: string
          uom_symbol: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          uom_name: string
          uom_symbol?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          uom_name?: string
          uom_symbol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_of_measures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      uom_conversions: {
        Row: {
          company_id: string | null
          conversion_factor: number
          created_at: string | null
          from_uom: string
          id: string
          is_active: boolean | null
          item_id: string | null
          to_uom: string
        }
        Insert: {
          company_id?: string | null
          conversion_factor: number
          created_at?: string | null
          from_uom: string
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          to_uom: string
        }
        Update: {
          company_id?: string | null
          conversion_factor?: number
          created_at?: string | null
          from_uom?: string
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          to_uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "uom_conversions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uom_conversions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_rate_limits: {
        Row: {
          created_at: string | null
          form_type: string
          ip_address: string
          submission_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          form_type: string
          ip_address: string
          submission_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          form_type?: string
          ip_address?: string
          submission_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          module: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          record_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          record_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          record_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_company_access: {
        Row: {
          can_edit: boolean | null
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          has_access: boolean
          id: string
          page_identifier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          has_access?: boolean
          id?: string
          page_identifier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          has_access?: boolean
          id?: string
          page_identifier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_school_branch_access: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      vat_returns: {
        Row: {
          adjustments: number | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          final_liability: number | null
          id: string
          input_vat: number | null
          net_vat: number | null
          notes: string | null
          output_vat: number | null
          payment_date: string | null
          payment_reference: string | null
          period_id: string | null
          return_period: string
          status: string | null
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          adjustments?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          final_liability?: number | null
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          period_id?: string | null
          return_period: string
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustments?: number | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          final_liability?: number | null
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          payment_date?: string | null
          payment_reference?: string | null
          period_id?: string | null
          return_period?: string
          status?: string | null
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_returns_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "financial_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inquiries: {
        Row: {
          address: string | null
          assigned_to: string | null
          budget_range: string | null
          company_name: string | null
          converted_at: string | null
          converted_to_quotation_id: string | null
          created_at: string
          customer_class: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          external_ref_id: string | null
          follow_up_date: string | null
          id: string
          inquiry_message: string | null
          inquiry_number: string
          interested_model: string | null
          notes: string | null
          priority: string
          product_type: string
          quantity: number | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          budget_range?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_to_quotation_id?: string | null
          created_at?: string
          customer_class?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          external_ref_id?: string | null
          follow_up_date?: string | null
          id?: string
          inquiry_message?: string | null
          inquiry_number: string
          interested_model?: string | null
          notes?: string | null
          priority?: string
          product_type: string
          quantity?: number | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          budget_range?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_to_quotation_id?: string | null
          created_at?: string
          customer_class?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          external_ref_id?: string | null
          follow_up_date?: string | null
          id?: string
          inquiry_message?: string | null
          inquiry_number?: string
          interested_model?: string | null
          notes?: string | null
          priority?: string
          product_type?: string
          quantity?: number | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_bank_accounts: {
        Row: {
          account_holder_name: string | null
          account_label: string | null
          account_number: string
          bank_branch: string | null
          bank_name: string
          company_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          vendor_id: string
        }
        Insert: {
          account_holder_name?: string | null
          account_label?: string | null
          account_number: string
          bank_branch?: string | null
          bank_name: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          vendor_id: string
        }
        Update: {
          account_holder_name?: string | null
          account_label?: string | null
          account_number?: string
          bank_branch?: string | null
          bank_name?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_bank_accounts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_categories: {
        Row: {
          advance_account_id: string | null
          ap_account_id: string | null
          category_code: string
          category_name: string
          company_id: string | null
          created_at: string | null
          description: string | null
          expense_account_id: string | null
          id: string
          is_active: boolean
          updated_at: string | null
        }
        Insert: {
          advance_account_id?: string | null
          ap_account_id?: string | null
          category_code: string
          category_name: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Update: {
          advance_account_id?: string | null
          ap_account_id?: string | null
          category_code?: string
          category_name?: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_advance_account_id_fkey"
            columns: ["advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_ap_account_id_fkey"
            columns: ["ap_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_performance: {
        Row: {
          calculated_at: string | null
          delivery_score: number | null
          id: string
          late_deliveries: number | null
          notes: string | null
          on_time_deliveries: number | null
          overall_score: number | null
          period_end: string
          period_start: string
          price_competitiveness_score: number | null
          quality_score: number | null
          rejected_deliveries: number | null
          total_order_value: number | null
          total_orders: number | null
          vendor_id: string
        }
        Insert: {
          calculated_at?: string | null
          delivery_score?: number | null
          id?: string
          late_deliveries?: number | null
          notes?: string | null
          on_time_deliveries?: number | null
          overall_score?: number | null
          period_end: string
          period_start: string
          price_competitiveness_score?: number | null
          quality_score?: number | null
          rejected_deliveries?: number | null
          total_order_value?: number | null
          total_orders?: number | null
          vendor_id: string
        }
        Update: {
          calculated_at?: string | null
          delivery_score?: number | null
          id?: string
          late_deliveries?: number | null
          notes?: string | null
          on_time_deliveries?: number | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          price_competitiveness_score?: number | null
          quality_score?: number | null
          rejected_deliveries?: number | null
          total_order_value?: number | null
          total_orders?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_performance_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_portal_access: {
        Row: {
          company_id: string | null
          contact_name: string | null
          created_at: string | null
          email: string
          failed_attempts: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_login_at: string | null
          locked_until: string | null
          otp_code: string | null
          otp_expires_at: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          company_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          email: string
          failed_attempts?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          company_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string
          failed_attempts?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_portal_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_portal_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_portal_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          session_token: string
          user_agent: string | null
          vendor_access_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          session_token: string
          user_agent?: string | null
          vendor_access_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          session_token?: string
          user_agent?: string | null
          vendor_access_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_portal_sessions_vendor_access_id_fkey"
            columns: ["vendor_access_id"]
            isOneToOne: false
            referencedRelation: "vendor_portal_access"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_submitted_invoices: {
        Row: {
          ap_invoice_id: string | null
          attachment_name: string | null
          attachment_url: string | null
          company_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          po_number: string | null
          purchase_order_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          ap_invoice_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          po_number?: string | null
          purchase_order_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          ap_invoice_id?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          company_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          po_number?: string | null
          purchase_order_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_submitted_invoices_ap_invoice_id_fkey"
            columns: ["ap_invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submitted_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submitted_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_submitted_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          ap_account_id: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          business_unit_code: string | null
          company_id: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          id: string
          is_active: boolean | null
          legacy_number: string | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          tax_id: string | null
          updated_at: string | null
          vendor_category_id: string | null
          vendor_code: string
          vendor_name: string
          vendor_type: string | null
          wht_applicable: boolean | null
          wht_rate: number | null
        }
        Insert: {
          address?: string | null
          ap_account_id?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legacy_number?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_category_id?: string | null
          vendor_code: string
          vendor_name: string
          vendor_type?: string | null
          wht_applicable?: boolean | null
          wht_rate?: number | null
        }
        Update: {
          address?: string | null
          ap_account_id?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          business_unit_code?: string | null
          company_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legacy_number?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_category_id?: string | null
          vendor_code?: string
          vendor_name?: string
          vendor_type?: string | null
          wht_applicable?: boolean | null
          wht_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_ap_account_id_fkey"
            columns: ["ap_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_vendor_category_id_fkey"
            columns: ["vendor_category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          phone: string | null
          warehouse_code: string
          warehouse_name: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          phone?: string | null
          warehouse_code: string
          warehouse_name: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          phone?: string | null
          warehouse_code?: string
          warehouse_name?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number | null
          company_id: string | null
          delivered_at: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          request_headers: Json | null
          response_body: string | null
          response_headers: Json | null
          response_status: number | null
          response_time_ms: number | null
          success: boolean | null
          webhook_id: string | null
        }
        Insert: {
          attempt_number?: number | null
          company_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Update: {
          attempt_number?: number | null
          company_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          success?: boolean | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          company_id: string | null
          consecutive_failures: number | null
          created_at: string | null
          created_by: string | null
          disabled_reason: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          secret: string
          success_count: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          company_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          disabled_reason?: string | null
          events: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          secret: string
          success_count?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          company_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          disabled_reason?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          secret?: string
          success_count?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      wht_certificate_details: {
        Row: {
          certificate_id: string | null
          created_at: string | null
          gross_amount: number
          id: string
          invoice_id: string | null
          net_amount: number
          payment_date: string
          payment_id: string | null
          wht_amount: number
        }
        Insert: {
          certificate_id?: string | null
          created_at?: string | null
          gross_amount: number
          id?: string
          invoice_id?: string | null
          net_amount: number
          payment_date: string
          payment_id?: string | null
          wht_amount: number
        }
        Update: {
          certificate_id?: string | null
          created_at?: string | null
          gross_amount?: number
          id?: string
          invoice_id?: string | null
          net_amount?: number
          payment_date?: string
          payment_id?: string | null
          wht_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "wht_certificate_details_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "wht_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificate_details_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "ap_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificate_details_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ap_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      wht_certificates: {
        Row: {
          certificate_date: string
          certificate_number: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          financial_year: string
          id: string
          issued_by: string | null
          issued_date: string | null
          notes: string | null
          quarter: number | null
          status: string | null
          total_gross_amount: number
          total_wht_amount: number
          vendor_id: string
          wht_rate: number
          wht_type: string
        }
        Insert: {
          certificate_date: string
          certificate_number: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          financial_year: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          notes?: string | null
          quarter?: number | null
          status?: string | null
          total_gross_amount: number
          total_wht_amount: number
          vendor_id: string
          wht_rate: number
          wht_type: string
        }
        Update: {
          certificate_date?: string
          certificate_number?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          financial_year?: string
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          notes?: string | null
          quarter?: number | null
          status?: string | null
          total_gross_amount?: number
          total_wht_amount?: number
          vendor_id?: string
          wht_rate?: number
          wht_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wht_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wht_certificates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_execution_log: {
        Row: {
          action_result: Json | null
          company_id: string | null
          error_message: string | null
          executed_at: string | null
          execution_status: string | null
          id: string
          trigger_record_id: string | null
          trigger_record_type: string | null
          workflow_rule_id: string | null
        }
        Insert: {
          action_result?: Json | null
          company_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_status?: string | null
          id?: string
          trigger_record_id?: string | null
          trigger_record_type?: string | null
          workflow_rule_id?: string | null
        }
        Update: {
          action_result?: Json | null
          company_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_status?: string | null
          id?: string
          trigger_record_id?: string | null
          trigger_record_type?: string | null
          workflow_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_execution_log_workflow_rule_id_fkey"
            columns: ["workflow_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action_config: Json
          action_type: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          execution_order: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          rule_name: string
          trigger_conditions: Json | null
          trigger_count: number | null
          trigger_event: string
          trigger_module: string
          updated_at: string | null
        }
        Insert: {
          action_config?: Json
          action_type: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name: string
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event: string
          trigger_module: string
          updated_at?: string | null
        }
        Update: {
          action_config?: Json
          action_type?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          execution_order?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          rule_name?: string
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event?: string
          trigger_module?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      yutong_addons: {
        Row: {
          addon_code: string | null
          addon_name: string
          category: string
          compatible_bus_models: Json | null
          created_at: string
          description: string | null
          id: string
          installation_time_hours: number | null
          is_active: boolean | null
          price: number
          supplier_contact: string | null
          supplier_name: string | null
          updated_at: string
          warranty_months: number | null
        }
        Insert: {
          addon_code?: string | null
          addon_name: string
          category?: string
          compatible_bus_models?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          installation_time_hours?: number | null
          is_active?: boolean | null
          price?: number
          supplier_contact?: string | null
          supplier_name?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Update: {
          addon_code?: string | null
          addon_name?: string
          category?: string
          compatible_bus_models?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          installation_time_hours?: number | null
          is_active?: boolean | null
          price?: number
          supplier_contact?: string | null
          supplier_name?: string | null
          updated_at?: string
          warranty_months?: number | null
        }
        Relationships: []
      }
      yutong_bus_model_images: {
        Row: {
          bus_model_id: string
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          updated_at: string
        }
        Insert: {
          bus_model_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          updated_at?: string
        }
        Update: {
          bus_model_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_bus_model_images_bus_model_id_fkey"
            columns: ["bus_model_id"]
            isOneToOne: false
            referencedRelation: "yutong_bus_models"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_bus_models: {
        Row: {
          audiovisual_system: string | null
          axle: string | null
          base_price: number
          brake_system: string | null
          bus_name: string | null
          capacity: string
          clutch: string | null
          condition: string | null
          cool_box: string | null
          created_at: string
          dimensions: string | null
          emission: string | null
          engine: string | null
          engine_type: string | null
          features: string | null
          front_windshield: string | null
          fuel_tank_capacity_l: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          interior_lights: string | null
          is_active: boolean | null
          luggage_capacity: string | null
          maintenance_free_wheel_edge: string | null
          manufactured_year: number | null
          middle: string | null
          minimum_turning_diameter_m: string | null
          model: string | null
          model_name: string
          overall_dimension_mm: string | null
          rearview_mirror: string | null
          retarder: string | null
          seating_capacity: number | null
          suspension_system: string | null
          tire: string | null
          transmission: string | null
          unit_price: number | null
          updated_at: string
          visibility: string | null
          wheel_base_mm: string | null
        }
        Insert: {
          audiovisual_system?: string | null
          axle?: string | null
          base_price: number
          brake_system?: string | null
          bus_name?: string | null
          capacity: string
          clutch?: string | null
          condition?: string | null
          cool_box?: string | null
          created_at?: string
          dimensions?: string | null
          emission?: string | null
          engine?: string | null
          engine_type?: string | null
          features?: string | null
          front_windshield?: string | null
          fuel_tank_capacity_l?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          interior_lights?: string | null
          is_active?: boolean | null
          luggage_capacity?: string | null
          maintenance_free_wheel_edge?: string | null
          manufactured_year?: number | null
          middle?: string | null
          minimum_turning_diameter_m?: string | null
          model?: string | null
          model_name: string
          overall_dimension_mm?: string | null
          rearview_mirror?: string | null
          retarder?: string | null
          seating_capacity?: number | null
          suspension_system?: string | null
          tire?: string | null
          transmission?: string | null
          unit_price?: number | null
          updated_at?: string
          visibility?: string | null
          wheel_base_mm?: string | null
        }
        Update: {
          audiovisual_system?: string | null
          axle?: string | null
          base_price?: number
          brake_system?: string | null
          bus_name?: string | null
          capacity?: string
          clutch?: string | null
          condition?: string | null
          cool_box?: string | null
          created_at?: string
          dimensions?: string | null
          emission?: string | null
          engine?: string | null
          engine_type?: string | null
          features?: string | null
          front_windshield?: string | null
          fuel_tank_capacity_l?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          interior_lights?: string | null
          is_active?: boolean | null
          luggage_capacity?: string | null
          maintenance_free_wheel_edge?: string | null
          manufactured_year?: number | null
          middle?: string | null
          minimum_turning_diameter_m?: string | null
          model?: string | null
          model_name?: string
          overall_dimension_mm?: string | null
          rearview_mirror?: string | null
          retarder?: string | null
          seating_capacity?: number | null
          suspension_system?: string | null
          tire?: string | null
          transmission?: string | null
          unit_price?: number | null
          updated_at?: string
          visibility?: string | null
          wheel_base_mm?: string | null
        }
        Relationships: []
      }
      yutong_cash_receipts: {
        Row: {
          amount: number
          amount_in_words: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_contact: string | null
          customer_name: string | null
          customer_signature_data: string | null
          customer_signature_type: string | null
          customer_signed_at: string | null
          customer_signer_name: string | null
          finance_signature_data: string | null
          finance_signature_type: string | null
          finance_signed_at: string | null
          finance_signer_name: string | null
          id: string
          order_id: string
          payment_id: string
          payment_method: string
          pdf_url: string | null
          product_description: string | null
          quotation_no: string | null
          receipt_date: string
          receipt_no: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id: string
          payment_id: string
          payment_method: string
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_in_words?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_name?: string | null
          customer_signature_data?: string | null
          customer_signature_type?: string | null
          customer_signed_at?: string | null
          customer_signer_name?: string | null
          finance_signature_data?: string | null
          finance_signature_type?: string | null
          finance_signed_at?: string | null
          finance_signer_name?: string | null
          id?: string
          order_id?: string
          payment_id?: string
          payment_method?: string
          pdf_url?: string | null
          product_description?: string | null
          quotation_no?: string | null
          receipt_date?: string
          receipt_no?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_cash_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_cash_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "yutong_customer_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_compliance_certificates: {
        Row: {
          application_date: string | null
          approval_date: string | null
          certificate_name: string
          certificate_number: string | null
          certificate_status: string | null
          certificate_type: string
          compliance_notes: string | null
          created_at: string | null
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          id: string
          issue_date: string | null
          issuing_authority: string
          order_id: string
          renewal_reminder_days: number | null
          renewal_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          application_date?: string | null
          approval_date?: string | null
          certificate_name: string
          certificate_number?: string | null
          certificate_status?: string | null
          certificate_type: string
          compliance_notes?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority: string
          order_id: string
          renewal_reminder_days?: number | null
          renewal_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          application_date?: string | null
          approval_date?: string | null
          certificate_name?: string
          certificate_number?: string | null
          certificate_status?: string | null
          certificate_type?: string
          compliance_notes?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string
          order_id?: string
          renewal_reminder_days?: number | null
          renewal_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_compliance_certificates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_customer_feedback: {
        Row: {
          areas_for_improvement: string | null
          comments: string | null
          created_at: string | null
          customer_id: string
          customer_service_rating:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          delivery_experience_rating:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          feedback_channel: string | null
          feedback_type: string
          follow_up_completed: boolean | null
          follow_up_required: boolean | null
          id: string
          likelihood_to_recommend: number | null
          order_id: string | null
          overall_rating: Database["public"]["Enums"]["feedback_rating"]
          positive_aspects: string | null
          product_quality_rating:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          responded_to: boolean | null
          response_date: string | null
          response_notes: string | null
          updated_at: string | null
          value_for_money_rating:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          would_purchase_again: boolean | null
        }
        Insert: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          customer_id: string
          customer_service_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          delivery_experience_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          feedback_channel?: string | null
          feedback_type: string
          follow_up_completed?: boolean | null
          follow_up_required?: boolean | null
          id?: string
          likelihood_to_recommend?: number | null
          order_id?: string | null
          overall_rating: Database["public"]["Enums"]["feedback_rating"]
          positive_aspects?: string | null
          product_quality_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          responded_to?: boolean | null
          response_date?: string | null
          response_notes?: string | null
          updated_at?: string | null
          value_for_money_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          would_purchase_again?: boolean | null
        }
        Update: {
          areas_for_improvement?: string | null
          comments?: string | null
          created_at?: string | null
          customer_id?: string
          customer_service_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          delivery_experience_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          feedback_channel?: string | null
          feedback_type?: string
          follow_up_completed?: boolean | null
          follow_up_required?: boolean | null
          id?: string
          likelihood_to_recommend?: number | null
          order_id?: string | null
          overall_rating?: Database["public"]["Enums"]["feedback_rating"]
          positive_aspects?: string | null
          product_quality_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          responded_to?: boolean | null
          response_date?: string | null
          response_notes?: string | null
          updated_at?: string | null
          value_for_money_rating?:
            | Database["public"]["Enums"]["feedback_rating"]
            | null
          would_purchase_again?: boolean | null
        }
        Relationships: []
      }
      yutong_customer_handovers: {
        Row: {
          created_at: string | null
          customer_id: string
          customer_representative_contact: string | null
          customer_representative_name: string | null
          customer_signature: string | null
          documents_provided: Json | null
          handover_date: string
          handover_officer_id: string | null
          handover_officer_name: string
          handover_photos: Json | null
          handover_time: string | null
          id: string
          location: string
          notes: string | null
          officer_signature: string | null
          order_id: string
          status: Database["public"]["Enums"]["handover_status"] | null
          training_duration_hours: number | null
          training_notes: string | null
          training_provided: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          customer_representative_contact?: string | null
          customer_representative_name?: string | null
          customer_signature?: string | null
          documents_provided?: Json | null
          handover_date: string
          handover_officer_id?: string | null
          handover_officer_name: string
          handover_photos?: Json | null
          handover_time?: string | null
          id?: string
          location: string
          notes?: string | null
          officer_signature?: string | null
          order_id: string
          status?: Database["public"]["Enums"]["handover_status"] | null
          training_duration_hours?: number | null
          training_notes?: string | null
          training_provided?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          customer_representative_contact?: string | null
          customer_representative_name?: string | null
          customer_signature?: string | null
          documents_provided?: Json | null
          handover_date?: string
          handover_officer_id?: string | null
          handover_officer_name?: string
          handover_photos?: Json | null
          handover_time?: string | null
          id?: string
          location?: string
          notes?: string | null
          officer_signature?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["handover_status"] | null
          training_duration_hours?: number | null
          training_notes?: string | null
          training_provided?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      yutong_customer_payments: {
        Row: {
          ar_receipt_id: string | null
          bank_account_id: string | null
          bank_name: string | null
          bank_slip_no: string | null
          cheque_no: string | null
          created_at: string
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          order_id: string
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_reference: string | null
          payment_schedule_id: string | null
          payment_slip_url: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id: string
          payment_amount: number
          payment_date: string
          payment_method: string
          payment_reference?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ar_receipt_id?: string | null
          bank_account_id?: string | null
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          order_id?: string
          payment_amount?: number
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          payment_schedule_id?: string | null
          payment_slip_url?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_customer_payments_ar_receipt_id_fkey"
            columns: ["ar_receipt_id"]
            isOneToOne: false
            referencedRelation: "ar_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customer_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customer_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customer_payments_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "yutong_payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_customer_purchases: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          purchase_date: string
          quotation_id: string
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          purchase_date?: string
          quotation_id: string
          status?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          purchase_date?: string
          quotation_id?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "yutong_customer_purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customer_purchases_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_customers: {
        Row: {
          accounting_customer_id: string | null
          address: string | null
          business_registration_no: string | null
          city: string | null
          company_name: string
          contact_person: string | null
          country: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          customer_code: string
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_main_customer: boolean | null
          notes: string | null
          parent_customer_id: string | null
          payment_terms: number | null
          phone: string
          relationship_notes: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          accounting_customer_id?: string | null
          address?: string | null
          business_registration_no?: string | null
          city?: string | null
          company_name: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_code: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_customer?: boolean | null
          notes?: string | null
          parent_customer_id?: string | null
          payment_terms?: number | null
          phone: string
          relationship_notes?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          accounting_customer_id?: string | null
          address?: string | null
          business_registration_no?: string | null
          city?: string | null
          company_name?: string
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          customer_code?: string
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_customer?: boolean | null
          notes?: string | null
          parent_customer_id?: string | null
          payment_terms?: number | null
          phone?: string
          relationship_notes?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_yutong_accounting_customer"
            columns: ["accounting_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_customers_parent_customer_id_fkey"
            columns: ["parent_customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_customization_options: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          option_type: Database["public"]["Enums"]["yutong_customization_type"]
          option_value: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          option_type: Database["public"]["Enums"]["yutong_customization_type"]
          option_value: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          option_type?: Database["public"]["Enums"]["yutong_customization_type"]
          option_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      yutong_customs_declarations: {
        Row: {
          assessment_date: string | null
          cif_value_lkr: number | null
          clearance_date: string | null
          consignee_address: string | null
          consignee_name: string | null
          country_of_origin: string | null
          created_at: string | null
          cusdec_number: string | null
          customs_duty_lkr: number | null
          customs_officer_name: string | null
          customs_status: Database["public"]["Enums"]["customs_status"] | null
          declarant_license_no: string | null
          declarant_name: string | null
          declaration_date: string | null
          duty_rate_percentage: number | null
          excise_duty_lkr: number | null
          freight_cost_usd: number | null
          goods_description: string | null
          hs_code: string | null
          id: string
          insurance_cost_usd: number | null
          invoice_value_usd: number | null
          pal_lkr: number | null
          payment_date: string | null
          payment_receipt_no: string | null
          shipment_id: string
          special_instructions: string | null
          total_duties_lkr: number | null
          updated_at: string | null
          vat_lkr: number | null
        }
        Insert: {
          assessment_date?: string | null
          cif_value_lkr?: number | null
          clearance_date?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          cusdec_number?: string | null
          customs_duty_lkr?: number | null
          customs_officer_name?: string | null
          customs_status?: Database["public"]["Enums"]["customs_status"] | null
          declarant_license_no?: string | null
          declarant_name?: string | null
          declaration_date?: string | null
          duty_rate_percentage?: number | null
          excise_duty_lkr?: number | null
          freight_cost_usd?: number | null
          goods_description?: string | null
          hs_code?: string | null
          id?: string
          insurance_cost_usd?: number | null
          invoice_value_usd?: number | null
          pal_lkr?: number | null
          payment_date?: string | null
          payment_receipt_no?: string | null
          shipment_id: string
          special_instructions?: string | null
          total_duties_lkr?: number | null
          updated_at?: string | null
          vat_lkr?: number | null
        }
        Update: {
          assessment_date?: string | null
          cif_value_lkr?: number | null
          clearance_date?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          cusdec_number?: string | null
          customs_duty_lkr?: number | null
          customs_officer_name?: string | null
          customs_status?: Database["public"]["Enums"]["customs_status"] | null
          declarant_license_no?: string | null
          declarant_name?: string | null
          declaration_date?: string | null
          duty_rate_percentage?: number | null
          excise_duty_lkr?: number | null
          freight_cost_usd?: number | null
          goods_description?: string | null
          hs_code?: string | null
          id?: string
          insurance_cost_usd?: number | null
          invoice_value_usd?: number | null
          pal_lkr?: number | null
          payment_date?: string | null
          payment_receipt_no?: string | null
          shipment_id?: string
          special_instructions?: string | null
          total_duties_lkr?: number | null
          updated_at?: string | null
          vat_lkr?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_customs_declarations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_delivery_confirmations: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          customer_signature: string | null
          delivery_date: string
          delivery_location: string
          delivery_photos: Json | null
          delivery_receipt_url: string | null
          delivery_time: string | null
          driver_contact: string | null
          driver_name: string | null
          id: string
          order_id: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          updated_at: string | null
          vehicle_condition_on_delivery: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_signature?: string | null
          delivery_date: string
          delivery_location: string
          delivery_photos?: Json | null
          delivery_receipt_url?: string | null
          delivery_time?: string | null
          driver_contact?: string | null
          driver_name?: string | null
          id?: string
          order_id: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
          vehicle_condition_on_delivery?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          customer_signature?: string | null
          delivery_date?: string
          delivery_location?: string
          delivery_photos?: Json | null
          delivery_receipt_url?: string | null
          delivery_time?: string | null
          driver_contact?: string | null
          driver_name?: string | null
          id?: string
          order_id?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string | null
          vehicle_condition_on_delivery?: string | null
        }
        Relationships: []
      }
      yutong_delivery_inspections: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checklist_items: Json | null
          created_at: string | null
          defects_found: Json | null
          id: string
          inspection_date: string
          inspector_id: string | null
          inspector_name: string
          notes: string | null
          order_id: string
          overall_rating: number | null
          photos: Json | null
          status: Database["public"]["Enums"]["inspection_status"] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          defects_found?: Json | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          inspector_name: string
          notes?: string | null
          order_id: string
          overall_rating?: number | null
          photos?: Json | null
          status?: Database["public"]["Enums"]["inspection_status"] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checklist_items?: Json | null
          created_at?: string | null
          defects_found?: Json | null
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          inspector_name?: string
          notes?: string | null
          order_id?: string
          overall_rating?: number | null
          photos?: Json | null
          status?: Database["public"]["Enums"]["inspection_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      yutong_delivery_orders: {
        Row: {
          bill_of_lading_no: string | null
          chassis_numbers: Json | null
          collected_by: string | null
          collection_date: string | null
          commercial_invoice_no: string | null
          created_at: string
          created_by: string | null
          currency: string
          do_amount: number
          do_no: string
          engine_numbers: Json | null
          id: string
          issue_date: string | null
          issuing_bank: string
          lc_id: string | null
          notes: string | null
          order_id: string
          packing_list_no: string | null
          release_date: string | null
          status: Database["public"]["Enums"]["yutong_do_status"]
          updated_at: string
          vehicle_count: number
        }
        Insert: {
          bill_of_lading_no?: string | null
          chassis_numbers?: Json | null
          collected_by?: string | null
          collection_date?: string | null
          commercial_invoice_no?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          do_amount: number
          do_no: string
          engine_numbers?: Json | null
          id?: string
          issue_date?: string | null
          issuing_bank: string
          lc_id?: string | null
          notes?: string | null
          order_id: string
          packing_list_no?: string | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["yutong_do_status"]
          updated_at?: string
          vehicle_count?: number
        }
        Update: {
          bill_of_lading_no?: string | null
          chassis_numbers?: Json | null
          collected_by?: string | null
          collection_date?: string | null
          commercial_invoice_no?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          do_amount?: number
          do_no?: string
          engine_numbers?: Json | null
          id?: string
          issue_date?: string | null
          issuing_bank?: string
          lc_id?: string | null
          notes?: string | null
          order_id?: string
          packing_list_no?: string | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["yutong_do_status"]
          updated_at?: string
          vehicle_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "yutong_delivery_orders_lc_id_fkey"
            columns: ["lc_id"]
            isOneToOne: false
            referencedRelation: "yutong_letter_of_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_delivery_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_finance_settings: {
        Row: {
          auto_create_customer: boolean | null
          auto_post_on_verify: boolean | null
          commission_expense_account_id: string | null
          company_id: string
          created_at: string | null
          customer_advance_account_id: string | null
          default_bank_account_id: string | null
          discount_expense_account_id: string | null
          id: string
          invoice_prefix: string | null
          is_active: boolean | null
          lc_bank_account_id: string | null
          receipt_prefix: string | null
          sales_revenue_account_id: string | null
          spare_parts_revenue_account_id: string | null
          trade_receivable_account_id: string | null
          updated_at: string | null
          vat_output_account_id: string | null
          wht_payable_account_id: string | null
        }
        Insert: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Update: {
          auto_create_customer?: boolean | null
          auto_post_on_verify?: boolean | null
          commission_expense_account_id?: string | null
          company_id?: string
          created_at?: string | null
          customer_advance_account_id?: string | null
          default_bank_account_id?: string | null
          discount_expense_account_id?: string | null
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean | null
          lc_bank_account_id?: string | null
          receipt_prefix?: string | null
          sales_revenue_account_id?: string | null
          spare_parts_revenue_account_id?: string | null
          trade_receivable_account_id?: string | null
          updated_at?: string | null
          vat_output_account_id?: string | null
          wht_payable_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_finance_settings_commission_expense_account_id_fkey"
            columns: ["commission_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_customer_advance_account_id_fkey"
            columns: ["customer_advance_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_default_bank_account_id_fkey"
            columns: ["default_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_discount_expense_account_id_fkey"
            columns: ["discount_expense_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_lc_bank_account_id_fkey"
            columns: ["lc_bank_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_sales_revenue_account_id_fkey"
            columns: ["sales_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_spare_parts_revenue_account_id_fkey"
            columns: ["spare_parts_revenue_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_trade_receivable_account_id_fkey"
            columns: ["trade_receivable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_vat_output_account_id_fkey"
            columns: ["vat_output_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_finance_settings_wht_payable_account_id_fkey"
            columns: ["wht_payable_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_invoice_documents: {
        Row: {
          created_at: string
          document_status: string
          file_name: string
          file_path: string
          file_size: number
          generated_at: string
          id: string
          invoice_data: Json
          invoice_record_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_status?: string
          file_name: string
          file_path: string
          file_size: number
          generated_at?: string
          id?: string
          invoice_data: Json
          invoice_record_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_status?: string
          file_name?: string
          file_path?: string
          file_size?: number
          generated_at?: string
          id?: string
          invoice_data?: Json
          invoice_record_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_invoice_documents_invoice_record_id_fkey"
            columns: ["invoice_record_id"]
            isOneToOne: false
            referencedRelation: "yutong_invoice_records"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_invoice_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          finance_company_address: string | null
          finance_company_name: string | null
          generated_at: string
          generated_by: string | null
          id: string
          invoice_amount: number
          invoice_category: string | null
          invoice_date: string
          invoice_no: string
          invoice_type: string
          notes: string | null
          order_id: string
          proforma_amount: number | null
          proforma_amount_percentage: number | null
          proforma_purpose: string | null
          quotation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_amount: number
          invoice_category?: string | null
          invoice_date?: string
          invoice_no: string
          invoice_type?: string
          notes?: string | null
          order_id: string
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          finance_company_address?: string | null
          finance_company_name?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_amount?: number
          invoice_category?: string | null
          invoice_date?: string
          invoice_no?: string
          invoice_type?: string
          notes?: string | null
          order_id?: string
          proforma_amount?: number | null
          proforma_amount_percentage?: number | null
          proforma_purpose?: string | null
          quotation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_invoice_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_invoice_records_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_invoice_signatures: {
        Row: {
          created_at: string
          id: string
          invoice_record_id: string
          signature_data: string
          signature_role: string
          signature_type: string
          signed_at: string
          signed_by: string | null
          signer_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_record_id: string
          signature_data: string
          signature_role: string
          signature_type: string
          signed_at?: string
          signed_by?: string | null
          signer_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_record_id?: string
          signature_data?: string
          signature_role?: string
          signature_type?: string
          signed_at?: string
          signed_by?: string | null
          signer_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      yutong_invoices: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          invoice_no: string
          invoice_type: string
          quotation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_no?: string
          invoice_type?: string
          quotation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_no?: string
          invoice_type?: string
          quotation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      yutong_letter_of_credits: {
        Row: {
          amendment_count: number | null
          amendments: Json | null
          beneficiary_bank: string | null
          created_at: string
          created_by: string | null
          currency: string
          expiry_date: string
          id: string
          issue_date: string
          issuing_bank_branch: string | null
          issuing_bank_contact: string | null
          issuing_bank_name: string
          latest_shipment_date: string | null
          lc_amount: number
          lc_no: string
          lc_type: string
          notes: string | null
          order_id: string
          remaining_amount: number | null
          required_documents: Json | null
          status: Database["public"]["Enums"]["yutong_lc_status"]
          updated_at: string
          utilized_amount: number | null
        }
        Insert: {
          amendment_count?: number | null
          amendments?: Json | null
          beneficiary_bank?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expiry_date: string
          id?: string
          issue_date: string
          issuing_bank_branch?: string | null
          issuing_bank_contact?: string | null
          issuing_bank_name: string
          latest_shipment_date?: string | null
          lc_amount: number
          lc_no: string
          lc_type?: string
          notes?: string | null
          order_id: string
          remaining_amount?: number | null
          required_documents?: Json | null
          status?: Database["public"]["Enums"]["yutong_lc_status"]
          updated_at?: string
          utilized_amount?: number | null
        }
        Update: {
          amendment_count?: number | null
          amendments?: Json | null
          beneficiary_bank?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expiry_date?: string
          id?: string
          issue_date?: string
          issuing_bank_branch?: string | null
          issuing_bank_contact?: string | null
          issuing_bank_name?: string
          latest_shipment_date?: string | null
          lc_amount?: number
          lc_no?: string
          lc_type?: string
          notes?: string | null
          order_id?: string
          remaining_amount?: number | null
          required_documents?: Json | null
          status?: Database["public"]["Enums"]["yutong_lc_status"]
          updated_at?: string
          utilized_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_letter_of_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_old_sales: {
        Row: {
          advance_payment: number | null
          base_price: number | null
          bus_model: string | null
          company_name: string | null
          converted_to_order_id: string | null
          converted_to_quotation_id: string | null
          created_at: string | null
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number | null
          entered_by: string | null
          final_price: number | null
          id: string
          import_batch_id: string | null
          imported_at: string | null
          notes: string | null
          optional_specifications: string | null
          quantity: number | null
          quotation_no: string | null
          quotation_status: string | null
          quoted_date: string | null
          raw_data: Json | null
          row_number: number | null
          sales_person: string | null
          subtotal_price: number | null
          total_before_discount: number | null
          updated_at: string | null
          vat_amount: number | null
        }
        Insert: {
          advance_payment?: number | null
          base_price?: number | null
          bus_model?: string | null
          company_name?: string | null
          converted_to_order_id?: string | null
          converted_to_quotation_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number | null
          entered_by?: string | null
          final_price?: number | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          notes?: string | null
          optional_specifications?: string | null
          quantity?: number | null
          quotation_no?: string | null
          quotation_status?: string | null
          quoted_date?: string | null
          raw_data?: Json | null
          row_number?: number | null
          sales_person?: string | null
          subtotal_price?: number | null
          total_before_discount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Update: {
          advance_payment?: number | null
          base_price?: number | null
          bus_model?: string | null
          company_name?: string | null
          converted_to_order_id?: string | null
          converted_to_quotation_id?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number | null
          entered_by?: string | null
          final_price?: number | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          notes?: string | null
          optional_specifications?: string | null
          quantity?: number | null
          quotation_no?: string | null
          quotation_status?: string | null
          quoted_date?: string | null
          raw_data?: Json | null
          row_number?: number | null
          sales_person?: string | null
          subtotal_price?: number | null
          total_before_discount?: number | null
          updated_at?: string | null
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_old_sales_converted_to_order_id_fkey"
            columns: ["converted_to_order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_old_sales_converted_to_quotation_id_fkey"
            columns: ["converted_to_quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_old_sales_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "yutong_old_sales_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_old_sales_imports: {
        Row: {
          file_name: string
          id: string
          imported_at: string | null
          imported_by: string | null
          status: string | null
          total_records: number | null
        }
        Insert: {
          file_name: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          status?: string | null
          total_records?: number | null
        }
        Update: {
          file_name?: string
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          status?: string | null
          total_records?: number | null
        }
        Relationships: []
      }
      yutong_order_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          order_id: string
          process_type: string
          status: string
          task_id: string
          task_label: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id: string
          process_type: string
          status?: string
          task_id: string
          task_label: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          process_type?: string
          status?: string
          task_id?: string
          task_label?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_order_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_orders: {
        Row: {
          actual_delivery_date: string | null
          ar_invoice_id: string | null
          balance_due: number | null
          bus_model: string
          chassis_number: string | null
          color_scheme: string | null
          country_of_origin: string | null
          created_at: string
          created_by: string | null
          current_phase: Database["public"]["Enums"]["yutong_order_phase"]
          customer_category_id: string | null
          customer_id: string | null
          engine_capacity: number | null
          engine_number: string | null
          engine_type: string | null
          expected_delivery_date: string | null
          finance_customer_id: string | null
          fuel_type: string | null
          gearbox_type: string | null
          id: string
          notes: string | null
          order_date: string
          order_no: string
          payment_mode: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure: Json | null
          progress_percentage: number | null
          quantity: number
          quotation_id: string | null
          seating_capacity: number | null
          special_features: Json | null
          status: string
          total_amount: number
          total_paid: number | null
          unit_price: number
          updated_at: string
          vehicle_condition: string | null
          year_of_manufacture: number | null
        }
        Insert: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          bus_model: string
          chassis_number?: string | null
          color_scheme?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["yutong_order_phase"]
          customer_category_id?: string | null
          customer_id?: string | null
          engine_capacity?: number | null
          engine_number?: string | null
          engine_type?: string | null
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          fuel_type?: string | null
          gearbox_type?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_no: string
          payment_mode?: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number
          quotation_id?: string | null
          seating_capacity?: number | null
          special_features?: Json | null
          status?: string
          total_amount: number
          total_paid?: number | null
          unit_price?: number
          updated_at?: string
          vehicle_condition?: string | null
          year_of_manufacture?: number | null
        }
        Update: {
          actual_delivery_date?: string | null
          ar_invoice_id?: string | null
          balance_due?: number | null
          bus_model?: string
          chassis_number?: string | null
          color_scheme?: string | null
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["yutong_order_phase"]
          customer_category_id?: string | null
          customer_id?: string | null
          engine_capacity?: number | null
          engine_number?: string | null
          engine_type?: string | null
          expected_delivery_date?: string | null
          finance_customer_id?: string | null
          fuel_type?: string | null
          gearbox_type?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_no?: string
          payment_mode?: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number
          quotation_id?: string | null
          seating_capacity?: number | null
          special_features?: Json | null
          status?: string
          total_amount?: number
          total_paid?: number | null
          unit_price?: number
          updated_at?: string
          vehicle_condition?: string | null
          year_of_manufacture?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_orders_ar_invoice_id_fkey"
            columns: ["ar_invoice_id"]
            isOneToOne: false
            referencedRelation: "ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_orders_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_orders_finance_customer_id_fkey"
            columns: ["finance_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_payment_schedules: {
        Row: {
          amount: number
          bank_branch: string | null
          bank_name: string | null
          created_at: string
          due_date: string
          id: string
          is_lc_payment: boolean | null
          milestone_name: string
          notes: string | null
          order_id: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: Database["public"]["Enums"]["yutong_payment_type"]
          sequence_order: number
          status: Database["public"]["Enums"]["yutong_payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          due_date: string
          id?: string
          is_lc_payment?: boolean | null
          milestone_name: string
          notes?: string | null
          order_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type: Database["public"]["Enums"]["yutong_payment_type"]
          sequence_order?: number
          status?: Database["public"]["Enums"]["yutong_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          due_date?: string
          id?: string
          is_lc_payment?: boolean | null
          milestone_name?: string
          notes?: string | null
          order_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: Database["public"]["Enums"]["yutong_payment_type"]
          sequence_order?: number
          status?: Database["public"]["Enums"]["yutong_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_payment_schedules_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_port_operations: {
        Row: {
          assigned_drivers: Json | null
          created_at: string | null
          driver_licenses: Json | null
          entry_time: string | null
          equipment_list: Json | null
          exit_time: string | null
          id: string
          insurance_cover_note: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          operation_date: string | null
          operation_notes: string | null
          operation_status: string | null
          photos_on_arrival: Json | null
          port_pass_number: string | null
          shipment_id: string
          supervisor_name: string | null
          updated_at: string | null
          vehicle_condition_on_arrival: string | null
        }
        Insert: {
          assigned_drivers?: Json | null
          created_at?: string | null
          driver_licenses?: Json | null
          entry_time?: string | null
          equipment_list?: Json | null
          exit_time?: string | null
          id?: string
          insurance_cover_note?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          operation_date?: string | null
          operation_notes?: string | null
          operation_status?: string | null
          photos_on_arrival?: Json | null
          port_pass_number?: string | null
          shipment_id: string
          supervisor_name?: string | null
          updated_at?: string | null
          vehicle_condition_on_arrival?: string | null
        }
        Update: {
          assigned_drivers?: Json | null
          created_at?: string | null
          driver_licenses?: Json | null
          entry_time?: string | null
          equipment_list?: Json | null
          exit_time?: string | null
          id?: string
          insurance_cover_note?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          operation_date?: string | null
          operation_notes?: string | null
          operation_status?: string | null
          photos_on_arrival?: Json | null
          port_pass_number?: string | null
          shipment_id?: string
          supervisor_name?: string | null
          updated_at?: string | null
          vehicle_condition_on_arrival?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_port_operations_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_pre_delivery_inspections: {
        Row: {
          created_at: string | null
          critical_issues: Json | null
          customer_notified: boolean | null
          defects_found: Json | null
          electrical_checks: Json | null
          exterior_checks: Json | null
          id: string
          inspection_date: string | null
          inspection_passed: boolean | null
          inspection_photos: Json | null
          inspector_name: string
          inspector_signature: string | null
          interior_checks: Json | null
          mechanical_checks: Json | null
          overall_condition_rating: number | null
          recommendations: string | null
          reinspection_date: string | null
          reinspection_required: boolean | null
          safety_checks: Json | null
          vehicle_processing_id: string
          yutong_notified: boolean | null
        }
        Insert: {
          created_at?: string | null
          critical_issues?: Json | null
          customer_notified?: boolean | null
          defects_found?: Json | null
          electrical_checks?: Json | null
          exterior_checks?: Json | null
          id?: string
          inspection_date?: string | null
          inspection_passed?: boolean | null
          inspection_photos?: Json | null
          inspector_name: string
          inspector_signature?: string | null
          interior_checks?: Json | null
          mechanical_checks?: Json | null
          overall_condition_rating?: number | null
          recommendations?: string | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          safety_checks?: Json | null
          vehicle_processing_id: string
          yutong_notified?: boolean | null
        }
        Update: {
          created_at?: string | null
          critical_issues?: Json | null
          customer_notified?: boolean | null
          defects_found?: Json | null
          electrical_checks?: Json | null
          exterior_checks?: Json | null
          id?: string
          inspection_date?: string | null
          inspection_passed?: boolean | null
          inspection_photos?: Json | null
          inspector_name?: string
          inspector_signature?: string | null
          interior_checks?: Json | null
          mechanical_checks?: Json | null
          overall_condition_rating?: number | null
          recommendations?: string | null
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          safety_checks?: Json | null
          vehicle_processing_id?: string
          yutong_notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_pre_delivery_inspections_vehicle_processing_id_fkey"
            columns: ["vehicle_processing_id"]
            isOneToOne: false
            referencedRelation: "yutong_vehicle_processing"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_production_updates: {
        Row: {
          created_at: string | null
          estimated_next_milestone_date: string | null
          id: string
          issues_identified: string | null
          milestone: Database["public"]["Enums"]["production_milestone"]
          milestone_completed: boolean | null
          photos: Json | null
          progress_notes: string | null
          quality_check_passed: boolean | null
          supplier_order_id: string
          update_date: string | null
          update_time: string | null
          updated_by: string | null
          videos: Json | null
        }
        Insert: {
          created_at?: string | null
          estimated_next_milestone_date?: string | null
          id?: string
          issues_identified?: string | null
          milestone: Database["public"]["Enums"]["production_milestone"]
          milestone_completed?: boolean | null
          photos?: Json | null
          progress_notes?: string | null
          quality_check_passed?: boolean | null
          supplier_order_id: string
          update_date?: string | null
          update_time?: string | null
          updated_by?: string | null
          videos?: Json | null
        }
        Update: {
          created_at?: string | null
          estimated_next_milestone_date?: string | null
          id?: string
          issues_identified?: string | null
          milestone?: Database["public"]["Enums"]["production_milestone"]
          milestone_completed?: boolean | null
          photos?: Json | null
          progress_notes?: string | null
          quality_check_passed?: boolean | null
          supplier_order_id?: string
          update_date?: string | null
          update_time?: string | null
          updated_by?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_production_updates_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "yutong_supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_quotation_addons: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          is_free_of_charge: boolean | null
          notes: string | null
          quantity: number
          quotation_id: string
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          is_free_of_charge?: boolean | null
          notes?: string | null
          quantity?: number
          quotation_id: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          is_free_of_charge?: boolean | null
          notes?: string | null
          quantity?: number
          quotation_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_quotation_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "yutong_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotation_addons_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_quotation_signatures: {
        Row: {
          created_at: string | null
          id: string
          quotation_id: string
          signature_data: string | null
          signature_role: string
          signature_type: string
          signed_at: string | null
          signed_by: string | null
          signer_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quotation_id: string
          signature_data?: string | null
          signature_role: string
          signature_type: string
          signed_at?: string | null
          signed_by?: string | null
          signer_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quotation_id?: string
          signature_data?: string | null
          signature_role?: string
          signature_type?: string
          signed_at?: string | null
          signed_by?: string | null
          signer_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_quotation_signatures_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_quotations: {
        Row: {
          attention_to: string | null
          body_colour: string | null
          bus_model: string
          bus_model_id: string | null
          business_registration_number: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          curtain_colour: string | null
          customer_address: string | null
          customer_category_id: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          customer_type: string | null
          delivery_timeline: string | null
          designation: string | null
          discount_amount: number | null
          discount_percentage: number | null
          edit_reason: string | null
          edit_type: string | null
          finance_company: string | null
          id: string
          inquiry_id: string | null
          is_active_version: boolean | null
          is_sub_customer: boolean | null
          main_customer_name: string | null
          parent_quotation_id: string | null
          payment_terms: string | null
          quantity: number
          quotation_no: string
          referral_agent_id: string | null
          relationship_notes: string | null
          representative_name: string | null
          responsible_person: string | null
          responsible_person_id: string | null
          seat_colour: string | null
          seat_headrest_logo: string | null
          seating_capacity: string | null
          special_features: string | null
          status: string
          tax_registration_number: string | null
          total_price: number
          unit_price: number
          updated_at: string
          valid_days: number
          valid_until: string
          vehicle_year: number | null
          version_number: string | null
          warranty_terms: string | null
        }
        Insert: {
          attention_to?: string | null
          body_colour?: string | null
          bus_model: string
          bus_model_id?: string | null
          business_registration_number?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          curtain_colour?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          customer_type?: string | null
          delivery_timeline?: string | null
          designation?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          edit_reason?: string | null
          edit_type?: string | null
          finance_company?: string | null
          id?: string
          inquiry_id?: string | null
          is_active_version?: boolean | null
          is_sub_customer?: boolean | null
          main_customer_name?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number
          quotation_no: string
          referral_agent_id?: string | null
          relationship_notes?: string | null
          representative_name?: string | null
          responsible_person?: string | null
          responsible_person_id?: string | null
          seat_colour?: string | null
          seat_headrest_logo?: string | null
          seating_capacity?: string | null
          special_features?: string | null
          status?: string
          tax_registration_number?: string | null
          total_price: number
          unit_price: number
          updated_at?: string
          valid_days?: number
          valid_until: string
          vehicle_year?: number | null
          version_number?: string | null
          warranty_terms?: string | null
        }
        Update: {
          attention_to?: string | null
          body_colour?: string | null
          bus_model?: string
          bus_model_id?: string | null
          business_registration_number?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          curtain_colour?: string | null
          customer_address?: string | null
          customer_category_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_type?: string | null
          delivery_timeline?: string | null
          designation?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          edit_reason?: string | null
          edit_type?: string | null
          finance_company?: string | null
          id?: string
          inquiry_id?: string | null
          is_active_version?: boolean | null
          is_sub_customer?: boolean | null
          main_customer_name?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          quantity?: number
          quotation_no?: string
          referral_agent_id?: string | null
          relationship_notes?: string | null
          representative_name?: string | null
          responsible_person?: string | null
          responsible_person_id?: string | null
          seat_colour?: string | null
          seat_headrest_logo?: string | null
          seating_capacity?: string | null
          special_features?: string | null
          status?: string
          tax_registration_number?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
          valid_days?: number
          valid_until?: string
          vehicle_year?: number | null
          version_number?: string | null
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_quotations_bus_model_id_fkey"
            columns: ["bus_model_id"]
            isOneToOne: false
            referencedRelation: "yutong_bus_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_customer_category_id_fkey"
            columns: ["customer_category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_quotations_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "yutong_responsible_persons"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_referral_commission_payments: {
        Row: {
          commission_amount: number
          commission_pct: number | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          referral_agent_id: string
          updated_at: string | null
          yutong_quotation_id: string
        }
        Insert: {
          commission_amount?: number
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          referral_agent_id: string
          updated_at?: string | null
          yutong_quotation_id: string
        }
        Update: {
          commission_amount?: number
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          referral_agent_id?: string
          updated_at?: string | null
          yutong_quotation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_referral_commission_payments_referral_agent_id_fkey"
            columns: ["referral_agent_id"]
            isOneToOne: false
            referencedRelation: "referral_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_referral_commission_payments_yutong_quotation_id_fkey"
            columns: ["yutong_quotation_id"]
            isOneToOne: false
            referencedRelation: "yutong_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_responsible_persons: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          phone: string
          position: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          phone: string
          position?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          phone?: string
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      yutong_rmv_registrations: {
        Row: {
          additional_documents_required: Json | null
          application_date: string | null
          application_number: string | null
          assigned_rmv_officer: string | null
          assigned_staff_member: string | null
          chassis_number: string
          completion_date: string | null
          cr_print_date: string | null
          created_at: string | null
          documents_submitted: Json | null
          engine_number: string
          id: string
          inspection_date: string | null
          inspection_notes: string | null
          inspection_officer: string | null
          inspection_passed: boolean | null
          model_year: number | null
          number_plate_issued: string | null
          order_id: string
          payment_receipt_number: string | null
          processing_fees_lkr: number | null
          registration_certificate_number: string | null
          registration_fees_lkr: number | null
          registration_number: string | null
          registration_status: Database["public"]["Enums"]["rmv_status"] | null
          rmv_office_location: string | null
          status_notes: string | null
          submission_date: string | null
          total_fees_paid_lkr: number | null
          updated_at: string | null
          vehicle_processing_id: string | null
        }
        Insert: {
          additional_documents_required?: Json | null
          application_date?: string | null
          application_number?: string | null
          assigned_rmv_officer?: string | null
          assigned_staff_member?: string | null
          chassis_number: string
          completion_date?: string | null
          cr_print_date?: string | null
          created_at?: string | null
          documents_submitted?: Json | null
          engine_number: string
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_officer?: string | null
          inspection_passed?: boolean | null
          model_year?: number | null
          number_plate_issued?: string | null
          order_id: string
          payment_receipt_number?: string | null
          processing_fees_lkr?: number | null
          registration_certificate_number?: string | null
          registration_fees_lkr?: number | null
          registration_number?: string | null
          registration_status?: Database["public"]["Enums"]["rmv_status"] | null
          rmv_office_location?: string | null
          status_notes?: string | null
          submission_date?: string | null
          total_fees_paid_lkr?: number | null
          updated_at?: string | null
          vehicle_processing_id?: string | null
        }
        Update: {
          additional_documents_required?: Json | null
          application_date?: string | null
          application_number?: string | null
          assigned_rmv_officer?: string | null
          assigned_staff_member?: string | null
          chassis_number?: string
          completion_date?: string | null
          cr_print_date?: string | null
          created_at?: string | null
          documents_submitted?: Json | null
          engine_number?: string
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_officer?: string | null
          inspection_passed?: boolean | null
          model_year?: number | null
          number_plate_issued?: string | null
          order_id?: string
          payment_receipt_number?: string | null
          processing_fees_lkr?: number | null
          registration_certificate_number?: string | null
          registration_fees_lkr?: number | null
          registration_number?: string | null
          registration_status?: Database["public"]["Enums"]["rmv_status"] | null
          rmv_office_location?: string | null
          status_notes?: string | null
          submission_date?: string | null
          total_fees_paid_lkr?: number | null
          updated_at?: string | null
          vehicle_processing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_rmv_registrations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_rmv_registrations_vehicle_processing_id_fkey"
            columns: ["vehicle_processing_id"]
            isOneToOne: false
            referencedRelation: "yutong_vehicle_processing"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_service_reminders: {
        Row: {
          created_at: string | null
          customer_contacted: boolean | null
          customer_contacted_at: string | null
          due_date: string
          due_mileage_km: number | null
          id: string
          next_reminder_date: string | null
          notes: string | null
          order_id: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          reminder_type: string
          service_booked: boolean | null
          service_booked_at: string | null
          service_completed: boolean | null
          service_completed_at: string | null
          service_description: string | null
          updated_at: string | null
          warranty_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_contacted?: boolean | null
          customer_contacted_at?: string | null
          due_date: string
          due_mileage_km?: number | null
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          order_id: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          reminder_type: string
          service_booked?: boolean | null
          service_booked_at?: string | null
          service_completed?: boolean | null
          service_completed_at?: string | null
          service_description?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_contacted?: boolean | null
          customer_contacted_at?: string | null
          due_date?: string
          due_mileage_km?: number | null
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          order_id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          reminder_type?: string
          service_booked?: boolean | null
          service_booked_at?: string | null
          service_completed?: boolean | null
          service_completed_at?: string | null
          service_description?: string | null
          updated_at?: string | null
          warranty_id?: string | null
        }
        Relationships: []
      }
      yutong_shipment_group_orders: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          order_id: string
          sequence_order: number
          shipment_group_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          order_id: string
          sequence_order?: number
          shipment_group_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          order_id?: string
          sequence_order?: number
          shipment_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_shipment_group_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_shipment_group_orders_shipment_group_id_fkey"
            columns: ["shipment_group_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_shipment_groups: {
        Row: {
          actual_arrival_date: string | null
          actual_departure_date: string | null
          bill_of_lading_no: string | null
          container_numbers: string[] | null
          created_at: string
          created_by: string | null
          current_phase: string | null
          expected_arrival_date: string | null
          expected_departure_date: string | null
          id: string
          notes: string | null
          shipment_name: string
          shipment_no: string
          status: string
          updated_at: string
          vessel_name: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          bill_of_lading_no?: string | null
          container_numbers?: string[] | null
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          id?: string
          notes?: string | null
          shipment_name: string
          shipment_no: string
          status?: string
          updated_at?: string
          vessel_name?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          bill_of_lading_no?: string | null
          container_numbers?: string[] | null
          created_at?: string
          created_by?: string | null
          current_phase?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          id?: string
          notes?: string | null
          shipment_name?: string
          shipment_no?: string
          status?: string
          updated_at?: string
          vessel_name?: string | null
        }
        Relationships: []
      }
      yutong_shipment_orders: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          order_id: string
          sequence_order: number
          shipment_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          order_id: string
          sequence_order?: number
          shipment_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          order_id?: string
          sequence_order?: number
          shipment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_shipment_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_shipment_orders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_shipment_tracking: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_arrival: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          milestone_reached: string | null
          shipment_id: string
          status: string | null
          tracking_date: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_arrival?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          milestone_reached?: string | null
          shipment_id: string
          status?: string | null
          tracking_date?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_arrival?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          milestone_reached?: string | null
          shipment_id?: string
          status?: string | null
          tracking_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_shipment_tracking_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_shipments: {
        Row: {
          actual_arrival_date: string | null
          actual_departure_date: string | null
          arrival_port: string | null
          bill_of_lading_no: string | null
          container_number: string | null
          container_numbers: string[] | null
          created_at: string | null
          created_by: string | null
          current_phase:
            | Database["public"]["Enums"]["yutong_order_phase"]
            | null
          current_status: string | null
          departure_port: string | null
          estimated_arrival_date: string | null
          expected_arrival_date: string | null
          expected_departure_date: string | null
          id: string
          insurance_amount: number | null
          notes: string | null
          order_id: string | null
          scheduled_arrival_date: string | null
          scheduled_departure_date: string | null
          shipment_name: string | null
          shipment_no: string | null
          shipment_reference: string | null
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["yutong_shipment_status"]
          supplier_order_id: string | null
          tracking_number: string | null
          updated_at: string | null
          vessel_name: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          arrival_port?: string | null
          bill_of_lading_no?: string | null
          container_number?: string | null
          container_numbers?: string[] | null
          created_at?: string | null
          created_by?: string | null
          current_phase?:
            | Database["public"]["Enums"]["yutong_order_phase"]
            | null
          current_status?: string | null
          departure_port?: string | null
          estimated_arrival_date?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_id?: string | null
          scheduled_arrival_date?: string | null
          scheduled_departure_date?: string | null
          shipment_name?: string | null
          shipment_no?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["yutong_shipment_status"]
          supplier_order_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          vessel_name?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          arrival_port?: string | null
          bill_of_lading_no?: string | null
          container_number?: string | null
          container_numbers?: string[] | null
          created_at?: string | null
          created_by?: string | null
          current_phase?:
            | Database["public"]["Enums"]["yutong_order_phase"]
            | null
          current_status?: string | null
          departure_port?: string | null
          estimated_arrival_date?: string | null
          expected_arrival_date?: string | null
          expected_departure_date?: string | null
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_id?: string | null
          scheduled_arrival_date?: string | null
          scheduled_departure_date?: string | null
          shipment_name?: string | null
          shipment_no?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["yutong_shipment_status"]
          supplier_order_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          vessel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_shipments_shipping_partner_id_fkey"
            columns: ["shipping_partner_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipping_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_shipments_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "yutong_supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_shipping_documents: {
        Row: {
          created_at: string | null
          document_date: string | null
          document_number: string | null
          document_status: string | null
          document_type: Database["public"]["Enums"]["shipping_document_type"]
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          issued_by: string | null
          notes: string | null
          shipment_id: string
          updated_at: string | null
          verification_date: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_date?: string | null
          document_number?: string | null
          document_status?: string | null
          document_type: Database["public"]["Enums"]["shipping_document_type"]
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          shipment_id: string
          updated_at?: string | null
          verification_date?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_date?: string | null
          document_number?: string | null
          document_status?: string | null
          document_type?: Database["public"]["Enums"]["shipping_document_type"]
          expiry_date?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          shipment_id?: string
          updated_at?: string | null
          verification_date?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_shipping_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_shipping_partners: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          partner_code: string | null
          partner_name: string
          partner_rating: number | null
          supported_shipping_methods:
            | Database["public"]["Enums"]["shipping_method"][]
            | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_code?: string | null
          partner_name: string
          partner_rating?: number | null
          supported_shipping_methods?:
            | Database["public"]["Enums"]["shipping_method"][]
            | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          partner_code?: string | null
          partner_name?: string
          partner_rating?: number | null
          supported_shipping_methods?:
            | Database["public"]["Enums"]["shipping_method"][]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      yutong_supplier_orders: {
        Row: {
          actual_completion_date: string | null
          chassis_number: string | null
          created_at: string | null
          current_milestone:
            | Database["public"]["Enums"]["production_milestone"]
            | null
          engine_number: string | null
          estimated_completion_date: string | null
          id: string
          order_id: string
          production_progress_percentage: number | null
          production_start_date: string | null
          quality_certificates: Json | null
          status: string | null
          supplier_notes: string | null
          supplier_order_date: string | null
          updated_at: string | null
          vin_number: string | null
          yutong_order_reference: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          chassis_number?: string | null
          created_at?: string | null
          current_milestone?:
            | Database["public"]["Enums"]["production_milestone"]
            | null
          engine_number?: string | null
          estimated_completion_date?: string | null
          id?: string
          order_id: string
          production_progress_percentage?: number | null
          production_start_date?: string | null
          quality_certificates?: Json | null
          status?: string | null
          supplier_notes?: string | null
          supplier_order_date?: string | null
          updated_at?: string | null
          vin_number?: string | null
          yutong_order_reference?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          chassis_number?: string | null
          created_at?: string | null
          current_milestone?:
            | Database["public"]["Enums"]["production_milestone"]
            | null
          engine_number?: string | null
          estimated_completion_date?: string | null
          id?: string
          order_id?: string
          production_progress_percentage?: number | null
          production_start_date?: string | null
          quality_certificates?: Json | null
          status?: string | null
          supplier_notes?: string | null
          supplier_order_date?: string | null
          updated_at?: string | null
          vin_number?: string | null
          yutong_order_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_supplier_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_support_tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          attachments: Json | null
          category: string
          closed_at: string | null
          created_at: string | null
          customer_contact_email: string | null
          customer_contact_phone: string | null
          customer_id: string
          customer_notes: string | null
          customer_satisfaction_rating: number | null
          description: string
          escalated: boolean | null
          escalated_at: string | null
          escalated_to: string | null
          id: string
          internal_notes: string | null
          order_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          resolution: string | null
          resolution_time_hours: number | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          ticket_number: string
          updated_at: string | null
          warranty_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: Json | null
          category: string
          closed_at?: string | null
          created_at?: string | null
          customer_contact_email?: string | null
          customer_contact_phone?: string | null
          customer_id: string
          customer_notes?: string | null
          customer_satisfaction_rating?: number | null
          description: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          internal_notes?: string | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolution?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          warranty_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          attachments?: Json | null
          category?: string
          closed_at?: string | null
          created_at?: string | null
          customer_contact_email?: string | null
          customer_contact_phone?: string | null
          customer_id?: string
          customer_notes?: string | null
          customer_satisfaction_rating?: number | null
          description?: string
          escalated?: boolean | null
          escalated_at?: string | null
          escalated_to?: string | null
          id?: string
          internal_notes?: string | null
          order_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          resolution?: string | null
          resolution_time_hours?: number | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          warranty_id?: string | null
        }
        Relationships: []
      }
      yutong_vehicle_data_sheets: {
        Row: {
          column_mapping: Json | null
          created_at: string | null
          file_name: string
          id: string
          matched_vehicles: number | null
          notes: string | null
          pending_vehicles: number | null
          sheet_name: string
          shipment_group_id: string | null
          status: string | null
          total_vehicles: number | null
          updated_at: string | null
          upload_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          column_mapping?: Json | null
          created_at?: string | null
          file_name: string
          id?: string
          matched_vehicles?: number | null
          notes?: string | null
          pending_vehicles?: number | null
          sheet_name: string
          shipment_group_id?: string | null
          status?: string | null
          total_vehicles?: number | null
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          column_mapping?: Json | null
          created_at?: string | null
          file_name?: string
          id?: string
          matched_vehicles?: number | null
          notes?: string | null
          pending_vehicles?: number | null
          sheet_name?: string
          shipment_group_id?: string | null
          status?: string | null
          total_vehicles?: number | null
          updated_at?: string | null
          upload_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_vehicle_data_sheets_shipment_group_id_fkey"
            columns: ["shipment_group_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_vehicle_processing: {
        Row: {
          accessories_installed: Json | null
          accessories_required: Json | null
          arrival_date: string | null
          chassis_number: string | null
          created_at: string | null
          current_stage: Database["public"]["Enums"]["processing_stage"] | null
          defects_identified: Json | null
          defects_resolved: Json | null
          dewaxing_completed_date: string | null
          dewaxing_contractor: string | null
          dewaxing_scheduled_date: string | null
          dvr_sim_installed: boolean | null
          engine_number: string | null
          fuel_added_liters: number | null
          fuel_level_on_arrival: number | null
          id: string
          inspection_completed_date: string | null
          inspection_scheduled_date: string | null
          inspector_name: string | null
          order_id: string
          processing_location: string | null
          processing_supervisor: string | null
          ready_for_delivery: boolean | null
          shipment_id: string
          stage_progress_percentage: number | null
          test_drive_date: string | null
          test_drive_km_reading: number | null
          test_drive_notes: string | null
          updated_at: string | null
          washing_completed_date: string | null
          washing_contractor: string | null
          washing_scheduled_date: string | null
        }
        Insert: {
          accessories_installed?: Json | null
          accessories_required?: Json | null
          arrival_date?: string | null
          chassis_number?: string | null
          created_at?: string | null
          current_stage?: Database["public"]["Enums"]["processing_stage"] | null
          defects_identified?: Json | null
          defects_resolved?: Json | null
          dewaxing_completed_date?: string | null
          dewaxing_contractor?: string | null
          dewaxing_scheduled_date?: string | null
          dvr_sim_installed?: boolean | null
          engine_number?: string | null
          fuel_added_liters?: number | null
          fuel_level_on_arrival?: number | null
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          inspector_name?: string | null
          order_id: string
          processing_location?: string | null
          processing_supervisor?: string | null
          ready_for_delivery?: boolean | null
          shipment_id: string
          stage_progress_percentage?: number | null
          test_drive_date?: string | null
          test_drive_km_reading?: number | null
          test_drive_notes?: string | null
          updated_at?: string | null
          washing_completed_date?: string | null
          washing_contractor?: string | null
          washing_scheduled_date?: string | null
        }
        Update: {
          accessories_installed?: Json | null
          accessories_required?: Json | null
          arrival_date?: string | null
          chassis_number?: string | null
          created_at?: string | null
          current_stage?: Database["public"]["Enums"]["processing_stage"] | null
          defects_identified?: Json | null
          defects_resolved?: Json | null
          dewaxing_completed_date?: string | null
          dewaxing_contractor?: string | null
          dewaxing_scheduled_date?: string | null
          dvr_sim_installed?: boolean | null
          engine_number?: string | null
          fuel_added_liters?: number | null
          fuel_level_on_arrival?: number | null
          id?: string
          inspection_completed_date?: string | null
          inspection_scheduled_date?: string | null
          inspector_name?: string | null
          order_id?: string
          processing_location?: string | null
          processing_supervisor?: string | null
          ready_for_delivery?: boolean | null
          shipment_id?: string
          stage_progress_percentage?: number | null
          test_drive_date?: string | null
          test_drive_km_reading?: number | null
          test_drive_notes?: string | null
          updated_at?: string | null
          washing_completed_date?: string | null
          washing_contractor?: string | null
          washing_scheduled_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_vehicle_processing_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_vehicle_processing_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_vehicle_records: {
        Row: {
          chassis_no: string | null
          color: string | null
          country_of_origin: string | null
          created_at: string | null
          customer_name: string | null
          data_sheet_id: string | null
          engine_capacity: number | null
          engine_no: string | null
          fuel_type: string | null
          id: string
          is_matched: boolean | null
          match_status: string | null
          model: string
          order_id: string | null
          raw_data: Json | null
          seat_config: string | null
          shipment_group_id: string | null
          updated_at: string | null
          vehicle_condition: string | null
          vehicle_no: string | null
          year_of_manufacture: number | null
        }
        Insert: {
          chassis_no?: string | null
          color?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          customer_name?: string | null
          data_sheet_id?: string | null
          engine_capacity?: number | null
          engine_no?: string | null
          fuel_type?: string | null
          id?: string
          is_matched?: boolean | null
          match_status?: string | null
          model: string
          order_id?: string | null
          raw_data?: Json | null
          seat_config?: string | null
          shipment_group_id?: string | null
          updated_at?: string | null
          vehicle_condition?: string | null
          vehicle_no?: string | null
          year_of_manufacture?: number | null
        }
        Update: {
          chassis_no?: string | null
          color?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          customer_name?: string | null
          data_sheet_id?: string | null
          engine_capacity?: number | null
          engine_no?: string | null
          fuel_type?: string | null
          id?: string
          is_matched?: boolean | null
          match_status?: string | null
          model?: string
          order_id?: string | null
          raw_data?: Json | null
          seat_config?: string | null
          shipment_group_id?: string | null
          updated_at?: string | null
          vehicle_condition?: string | null
          vehicle_no?: string | null
          year_of_manufacture?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yutong_vehicle_records_data_sheet_id_fkey"
            columns: ["data_sheet_id"]
            isOneToOne: false
            referencedRelation: "yutong_vehicle_data_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_vehicle_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "yutong_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yutong_vehicle_records_shipment_group_id_fkey"
            columns: ["shipment_group_id"]
            isOneToOne: false
            referencedRelation: "yutong_shipment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      yutong_warranties: {
        Row: {
          claim_process: string | null
          contact_information: Json | null
          coverage_details: string | null
          created_at: string | null
          duration_months: number
          end_date: string
          exclusions: string | null
          id: string
          mileage_limit_km: number | null
          order_id: string
          service_provider: string | null
          start_date: string
          status: Database["public"]["Enums"]["warranty_status"] | null
          terms_and_conditions: string | null
          updated_at: string | null
          warranty_certificate_url: string | null
          warranty_number: string
          warranty_type: string
        }
        Insert: {
          claim_process?: string | null
          contact_information?: Json | null
          coverage_details?: string | null
          created_at?: string | null
          duration_months: number
          end_date: string
          exclusions?: string | null
          id?: string
          mileage_limit_km?: number | null
          order_id: string
          service_provider?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["warranty_status"] | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          warranty_certificate_url?: string | null
          warranty_number: string
          warranty_type: string
        }
        Update: {
          claim_process?: string | null
          contact_information?: Json | null
          coverage_details?: string | null
          created_at?: string | null
          duration_months?: number
          end_date?: string
          exclusions?: string | null
          id?: string
          mileage_limit_km?: number | null
          order_id?: string
          service_provider?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["warranty_status"] | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          warranty_certificate_url?: string | null
          warranty_number?: string
          warranty_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_payment_to_invoices: {
        Args: {
          p_payment_amount: number
          p_payment_id: string
          p_student_id: string
        }
        Returns: number
      }
      calculate_expenses_from_details: {
        Args: { details: Json }
        Returns: number
      }
      calculate_income_from_details: {
        Args: { details: Json }
        Returns: number
      }
      calculate_sla_due_date: {
        Args: { p_business_hours?: number; p_start_date: string }
        Returns: string
      }
      calculate_tyre_condition: { Args: { p_tyre_id: string }; Returns: number }
      can_access_school_branch: {
        Args: { _branch_id: string }
        Returns: boolean
      }
      can_access_tenant_record: {
        Args: {
          target_business_unit_code?: string
          target_company_id: string
          target_document_number?: string
          target_source_module?: string
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_admin_user: { Args: never; Returns: undefined }
      create_or_get_sph_customer: {
        Args: {
          p_company_id: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
        }
        Returns: string
      }
      expire_temporary_accounts: { Args: never; Returns: number }
      force_delete_coa_for_company: {
        Args: { p_company_id: string }
        Returns: Json
      }
      generate_budget_code: { Args: { p_fiscal_year: number }; Returns: string }
      generate_customer_code: { Args: never; Returns: string }
      generate_employee_id: { Args: never; Returns: string }
      generate_entity_number: {
        Args: { p_company_id?: string; p_entity_type: string }
        Returns: string
      }
      generate_inquiry_number: { Args: never; Returns: string }
      generate_journal_entry_number: { Args: never; Returns: string }
      generate_lightvehicle_invoice_no: { Args: never; Returns: string }
      generate_lightvehicle_order_number: { Args: never; Returns: string }
      generate_lightvehicle_quotation_number: { Args: never; Returns: string }
      generate_lightvehicle_receipt_no: { Args: never; Returns: string }
      generate_lightvehicle_shipment_number: { Args: never; Returns: string }
      generate_next_lightvehicle_version_number: {
        Args: { p_parent_id: string }
        Returns: string
      }
      generate_next_version_number: {
        Args: { p_parent_id: string }
        Returns: string
      }
      generate_next_yutong_version_number: {
        Args: { p_parent_id: string }
        Returns: string
      }
      generate_petty_cash_voucher_number: { Args: never; Returns: string }
      generate_sbs_batch_number: { Args: never; Returns: string }
      generate_sbs_invoice_number: {
        Args: { p_prefix?: string }
        Returns: string
      }
      generate_sinotruck_customer_code: { Args: never; Returns: string }
      generate_sinotruck_invoice_no: { Args: never; Returns: string }
      generate_sinotruck_order_no: { Args: never; Returns: string }
      generate_sinotruck_quotation_no: { Args: never; Returns: string }
      generate_sinotruck_receipt_no: { Args: never; Returns: string }
      generate_sph_ar_invoice_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_sph_ar_receipt_number: {
        Args: { p_company_id: string }
        Returns: string
      }
      generate_stock_adjustment_number: { Args: never; Returns: string }
      generate_submission_code: { Args: never; Returns: string }
      generate_temp_account_code: { Args: never; Returns: string }
      generate_yutong_invoice_no: { Args: never; Returns: string }
      generate_yutong_order_no: { Args: never; Returns: string }
      generate_yutong_quotation_no:
        | { Args: never; Returns: string }
        | { Args: { quotation_date?: string }; Returns: string }
      generate_yutong_shipment_group_no: { Args: never; Returns: string }
      generate_yutong_shipment_no: { Args: never; Returns: string }
      generate_yutong_ticket_number: { Args: never; Returns: string }
      generate_yutong_warranty_number: { Args: never; Returns: string }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_liability_account_setting: {
        Args: { p_setting_id: string }
        Returns: string
      }
      get_next_cheque_number: {
        Args: { p_bank_account_id: string }
        Returns: Json
      }
      get_user_page_permissions: {
        Args: { _user_id: string }
        Returns: {
          has_access: boolean
          page_identifier: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_page_access: {
        Args: { _page_identifier: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_name_suggestion: {
        Args: { p_name: string }
        Returns: undefined
      }
      post_pending_gl_entry: { Args: { p_pending_id: string }; Returns: string }
      process_gl_posting: {
        Args: {
          p_amount: number
          p_company_id: string
          p_description?: string
          p_source_record_id: string
          p_source_table: string
          p_transaction_date: string
        }
        Returns: string
      }
      storage_apply_conservative_policies: { Args: never; Returns: undefined }
      sync_all_tyre_conditions: { Args: never; Returns: undefined }
      update_active_seasonal_themes: { Args: never; Returns: undefined }
      update_all_tyre_conditions: { Args: never; Returns: undefined }
      update_liability_account_setting: {
        Args: { p_account_id: string; p_setting_id: string }
        Returns: undefined
      }
      update_trip_status_with_adjustments: {
        Args: {
          p_changed_by?: string
          p_new_status: string
          p_quotation_id: string
          p_reason?: string
          p_refund_amount?: number
          p_refund_status?: string
        }
        Returns: Json
      }
      validate_invite_token: { Args: { p_token: string }; Returns: Json }
      verify_admission_number: {
        Args: { p_admission_no: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_role:
        | "super_admin"
        | "admin"
        | "supervisor"
        | "driver"
        | "conductor"
        | "mechanic"
        | "staff"
        | "finance"
        | "governance_admin"
        | "governance_manager"
        | "governance_viewer"
      approval_status: "pending" | "approved" | "rejected"
      ar_ap_status: "unpaid" | "partial" | "paid" | "overdue"
      commission_status: "pending" | "approved" | "paid"
      conductor_submission_status:
        | "pending"
        | "processing"
        | "reviewed"
        | "approved"
        | "rejected"
        | "applied"
      customs_status:
        | "draft"
        | "submitted"
        | "under_assessment"
        | "duty_calculated"
        | "payment_pending"
        | "payment_completed"
        | "cleared"
        | "held"
        | "rejected"
      data_source_type: "manual" | "ocr" | "conductor_portal" | "import"
      delivery_status:
        | "pending"
        | "scheduled"
        | "in_transit"
        | "delivered"
        | "cancelled"
      feedback_rating: "1" | "2" | "3" | "4" | "5"
      fleet_status: "active" | "maintenance" | "idle" | "retired"
      frequency_rule_type:
        | "DAILY"
        | "WEEKLY_BY_WEEKDAY"
        | "BIWEEKLY_BY_WEEKDAY"
        | "MONTHLY_BY_DAY"
        | "MONTHLY_NTH_WEEKDAY"
        | "MONTH_END"
        | "RELATIVE_WINDOW"
        | "ADHOC"
      governance_item_status:
        | "Planned"
        | "Due"
        | "Submitted"
        | "Completed"
        | "Skipped"
        | "N/A"
      governance_item_type: "REPORT" | "EVENT"
      handover_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      inspection_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "failed"
        | "approved"
      journal_status: "draft" | "posted" | "void" | "reversed"
      late_entry_status: "pending" | "approved" | "rejected"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
      notification_status: "pending" | "sent" | "failed"
      notification_type: "REMINDER_3_DAY" | "REMINDER_TODAY" | "OVERDUE"
      payment_status:
        | "pending_operations"
        | "pending_finance"
        | "approved"
        | "rejected"
      permit_status: "valid" | "expired" | "suspended" | "cancelled"
      processing_stage:
        | "arrived"
        | "dewaxing_scheduled"
        | "dewaxing_completed"
        | "washing_scheduled"
        | "washing_completed"
        | "inspection_scheduled"
        | "inspection_in_progress"
        | "inspection_completed"
        | "accessories_pending"
        | "accessories_completed"
        | "test_drive_pending"
        | "test_drive_completed"
        | "ready_for_registration"
      production_milestone:
        | "order_received"
        | "production_started"
        | "chassis_assembly"
        | "body_assembly"
        | "interior_installation"
        | "quality_inspection"
        | "final_testing"
        | "ready_for_shipment"
      rmv_status:
        | "documents_preparing"
        | "application_submitted"
        | "under_review"
        | "additional_documents_required"
        | "approved"
        | "cr_print_ready"
        | "cr_print_collected"
        | "registration_completed"
        | "rejected"
      salary_type: "monthly" | "daily"
      shipping_document_type:
        | "commercial_invoice"
        | "packing_list"
        | "bill_of_lading"
        | "certificate_of_origin"
        | "insurance_certificate"
        | "customs_declaration"
      shipping_method: "roro" | "container"
      staff_type: "driver" | "conductor"
      submission_rule_type:
        | "SAME_AS_FREQUENCY"
        | "FIXED_DAY_EACH_MONTH"
        | "SAME_WEEKDAY"
        | "FOLLOWING_MONTH_DAY_N"
        | "INCLUDED_IN_OTHER"
        | "NONE"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "pending_customer"
        | "resolved"
        | "closed"
      trip_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      user_status: "active" | "inactive" | "suspended"
      warranty_status: "active" | "expired" | "claimed" | "void"
      yutong_customization_type:
        | "seat_colour"
        | "curtain_colour"
        | "body_colour"
        | "headrest_logo"
      yutong_do_status: "pending" | "issued" | "released" | "utilized"
      yutong_lc_status:
        | "pending"
        | "issued"
        | "amended"
        | "utilized"
        | "closed"
        | "cancelled"
      yutong_order_phase:
        | "order_confirmation"
        | "lc_issuance"
        | "production_order"
        | "manufacturing"
        | "shipping_booking"
        | "customs_clearance"
        | "port_operations"
        | "vehicle_processing"
        | "rmv_registration"
        | "final_inspection"
        | "delivery"
      yutong_payment_mode: "cash" | "lease"
      yutong_payment_status: "pending" | "paid" | "overdue" | "cancelled"
      yutong_payment_type: "advance" | "interim" | "balance" | "full"
      yutong_shipment_status:
        | "planning"
        | "confirmed"
        | "in_transit"
        | "customs"
        | "delivered"
        | "cancelled"
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
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: [
        "super_admin",
        "admin",
        "supervisor",
        "driver",
        "conductor",
        "mechanic",
        "staff",
        "finance",
        "governance_admin",
        "governance_manager",
        "governance_viewer",
      ],
      approval_status: ["pending", "approved", "rejected"],
      ar_ap_status: ["unpaid", "partial", "paid", "overdue"],
      commission_status: ["pending", "approved", "paid"],
      conductor_submission_status: [
        "pending",
        "processing",
        "reviewed",
        "approved",
        "rejected",
        "applied",
      ],
      customs_status: [
        "draft",
        "submitted",
        "under_assessment",
        "duty_calculated",
        "payment_pending",
        "payment_completed",
        "cleared",
        "held",
        "rejected",
      ],
      data_source_type: ["manual", "ocr", "conductor_portal", "import"],
      delivery_status: [
        "pending",
        "scheduled",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      feedback_rating: ["1", "2", "3", "4", "5"],
      fleet_status: ["active", "maintenance", "idle", "retired"],
      frequency_rule_type: [
        "DAILY",
        "WEEKLY_BY_WEEKDAY",
        "BIWEEKLY_BY_WEEKDAY",
        "MONTHLY_BY_DAY",
        "MONTHLY_NTH_WEEKDAY",
        "MONTH_END",
        "RELATIVE_WINDOW",
        "ADHOC",
      ],
      governance_item_status: [
        "Planned",
        "Due",
        "Submitted",
        "Completed",
        "Skipped",
        "N/A",
      ],
      governance_item_type: ["REPORT", "EVENT"],
      handover_status: ["scheduled", "in_progress", "completed", "cancelled"],
      inspection_status: [
        "pending",
        "in_progress",
        "completed",
        "failed",
        "approved",
      ],
      journal_status: ["draft", "posted", "void", "reversed"],
      late_entry_status: ["pending", "approved", "rejected"],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
      notification_status: ["pending", "sent", "failed"],
      notification_type: ["REMINDER_3_DAY", "REMINDER_TODAY", "OVERDUE"],
      payment_status: [
        "pending_operations",
        "pending_finance",
        "approved",
        "rejected",
      ],
      permit_status: ["valid", "expired", "suspended", "cancelled"],
      processing_stage: [
        "arrived",
        "dewaxing_scheduled",
        "dewaxing_completed",
        "washing_scheduled",
        "washing_completed",
        "inspection_scheduled",
        "inspection_in_progress",
        "inspection_completed",
        "accessories_pending",
        "accessories_completed",
        "test_drive_pending",
        "test_drive_completed",
        "ready_for_registration",
      ],
      production_milestone: [
        "order_received",
        "production_started",
        "chassis_assembly",
        "body_assembly",
        "interior_installation",
        "quality_inspection",
        "final_testing",
        "ready_for_shipment",
      ],
      rmv_status: [
        "documents_preparing",
        "application_submitted",
        "under_review",
        "additional_documents_required",
        "approved",
        "cr_print_ready",
        "cr_print_collected",
        "registration_completed",
        "rejected",
      ],
      salary_type: ["monthly", "daily"],
      shipping_document_type: [
        "commercial_invoice",
        "packing_list",
        "bill_of_lading",
        "certificate_of_origin",
        "insurance_certificate",
        "customs_declaration",
      ],
      shipping_method: ["roro", "container"],
      staff_type: ["driver", "conductor"],
      submission_rule_type: [
        "SAME_AS_FREQUENCY",
        "FIXED_DAY_EACH_MONTH",
        "SAME_WEEKDAY",
        "FOLLOWING_MONTH_DAY_N",
        "INCLUDED_IN_OTHER",
        "NONE",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "pending_customer",
        "resolved",
        "closed",
      ],
      trip_status: ["scheduled", "ongoing", "completed", "cancelled"],
      user_status: ["active", "inactive", "suspended"],
      warranty_status: ["active", "expired", "claimed", "void"],
      yutong_customization_type: [
        "seat_colour",
        "curtain_colour",
        "body_colour",
        "headrest_logo",
      ],
      yutong_do_status: ["pending", "issued", "released", "utilized"],
      yutong_lc_status: [
        "pending",
        "issued",
        "amended",
        "utilized",
        "closed",
        "cancelled",
      ],
      yutong_order_phase: [
        "order_confirmation",
        "lc_issuance",
        "production_order",
        "manufacturing",
        "shipping_booking",
        "customs_clearance",
        "port_operations",
        "vehicle_processing",
        "rmv_registration",
        "final_inspection",
        "delivery",
      ],
      yutong_payment_mode: ["cash", "lease"],
      yutong_payment_status: ["pending", "paid", "overdue", "cancelled"],
      yutong_payment_type: ["advance", "interim", "balance", "full"],
      yutong_shipment_status: [
        "planning",
        "confirmed",
        "in_transit",
        "customs",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
