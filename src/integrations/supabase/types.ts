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
    PostgrestVersion: "13.0.4"
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
      bus_loan_payments: {
        Row: {
          actual_payment_date: string | null
          balance_remaining: number
          created_at: string
          id: string
          interest_amount: number
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
          balance_remaining: number
          created_at?: string
          id?: string
          interest_amount: number
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
          balance_remaining?: number
          created_at?: string
          id?: string
          interest_amount?: number
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
          created_at: string
          created_by: string | null
          end_date: string
          id: string
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
        }
        Insert: {
          bus_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
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
        }
        Update: {
          bus_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "bus_loans_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
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
      buses: {
        Row: {
          bus_no: string
          capacity: number
          chassis_number: string | null
          created_at: string
          current_mileage: number | null
          engine_number: string | null
          expected_km_per_liter: number | null
          id: string
          insurance_expiry: string | null
          last_service_date: string | null
          last_service_mileage: number | null
          model: string
          next_service_date: string | null
          next_service_mileage: number | null
          owner_address: string | null
          owner_name: string | null
          owner_nic: string | null
          registration_number: string | null
          revenue_license_expiry: string | null
          route: string | null
          service_interval_km: number | null
          status: Database["public"]["Enums"]["fleet_status"] | null
          type: string
          updated_at: string
          year: number
        }
        Insert: {
          bus_no: string
          capacity: number
          chassis_number?: string | null
          created_at?: string
          current_mileage?: number | null
          engine_number?: string | null
          expected_km_per_liter?: number | null
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          model: string
          next_service_date?: string | null
          next_service_mileage?: number | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nic?: string | null
          registration_number?: string | null
          revenue_license_expiry?: string | null
          route?: string | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["fleet_status"] | null
          type: string
          updated_at?: string
          year: number
        }
        Update: {
          bus_no?: string
          capacity?: number
          chassis_number?: string | null
          created_at?: string
          current_mileage?: number | null
          engine_number?: string | null
          expected_km_per_liter?: number | null
          id?: string
          insurance_expiry?: string | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          model?: string
          next_service_date?: string | null
          next_service_mileage?: number | null
          owner_address?: string | null
          owner_name?: string | null
          owner_nic?: string | null
          registration_number?: string | null
          revenue_license_expiry?: string | null
          route?: string | null
          service_interval_km?: number | null
          status?: Database["public"]["Enums"]["fleet_status"] | null
          type?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      daily_trips: {
        Row: {
          audit_log: Json | null
          bus_id: string
          conductor_id: string | null
          created_at: string
          created_by: string | null
          diesel_price_per_liter: number | null
          distance_km: number | null
          driver_id: string | null
          end_time: string | null
          fuel_cost: number | null
          fuel_liters: number | null
          id: string
          income: number | null
          km_per_liter: number | null
          net_income: number | null
          notes: string | null
          odometer_end: number | null
          odometer_start: number | null
          other_expenses: number | null
          other_expenses_details: Json | null
          performance_score: number | null
          route_id: string | null
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
          diesel_price_per_liter?: number | null
          distance_km?: number | null
          driver_id?: string | null
          end_time?: string | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          id?: string
          income?: number | null
          km_per_liter?: number | null
          net_income?: number | null
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          other_expenses?: number | null
          other_expenses_details?: Json | null
          performance_score?: number | null
          route_id?: string | null
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
          diesel_price_per_liter?: number | null
          distance_km?: number | null
          driver_id?: string | null
          end_time?: string | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          id?: string
          income?: number | null
          km_per_liter?: number | null
          net_income?: number | null
          notes?: string | null
          odometer_end?: number | null
          odometer_start?: number | null
          other_expenses?: number | null
          other_expenses_details?: Json | null
          performance_score?: number | null
          route_id?: string | null
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
            foreignKeyName: "daily_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      document_approvals: {
        Row: {
          approval_date: string
          approval_type: string
          approver_name: string
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
          created_at?: string
          document_id?: string | null
          id?: string
          signature_data?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
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
          file_name: string
          file_size: number | null
          generated_at: string
          generated_by: string | null
          id: string
          payment_id: string | null
          payment_type: string
          quotation_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_data: string
          document_status?: string
          document_type: string
          file_name: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          payment_id?: string | null
          payment_type: string
          quotation_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          document_data?: string
          document_status?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          payment_id?: string | null
          payment_type?: string
          quotation_id?: string
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
          created_at: string | null
          holiday_date: string
          holiday_name: string
          id: string
          is_recurring: boolean | null
        }
        Insert: {
          created_at?: string | null
          holiday_date: string
          holiday_name: string
          id?: string
          is_recurring?: boolean | null
        }
        Update: {
          created_at?: string | null
          holiday_date?: string
          holiday_name?: string
          id?: string
          is_recurring?: boolean | null
        }
        Relationships: []
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
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          alerts: Json | null
          battery_voltage: number | null
          bus_id: string
          bus_no: string
          created_at: string
          current_location: string | null
          driver_id: string | null
          driver_name: string | null
          engine_health: string | null
          engine_temperature: number | null
          fuel_level: number | null
          gps_coordinates: Json | null
          id: string
          last_update: string
          odometer_reading: number | null
          oil_pressure: number | null
          route_id: string | null
          route_name: string | null
          speed_kmh: number | null
          status: string
          tire_pressure: Json | null
          updated_at: string
        }
        Insert: {
          alerts?: Json | null
          battery_voltage?: number | null
          bus_id: string
          bus_no: string
          created_at?: string
          current_location?: string | null
          driver_id?: string | null
          driver_name?: string | null
          engine_health?: string | null
          engine_temperature?: number | null
          fuel_level?: number | null
          gps_coordinates?: Json | null
          id?: string
          last_update?: string
          odometer_reading?: number | null
          oil_pressure?: number | null
          route_id?: string | null
          route_name?: string | null
          speed_kmh?: number | null
          status?: string
          tire_pressure?: Json | null
          updated_at?: string
        }
        Update: {
          alerts?: Json | null
          battery_voltage?: number | null
          bus_id?: string
          bus_no?: string
          created_at?: string
          current_location?: string | null
          driver_id?: string | null
          driver_name?: string | null
          engine_health?: string | null
          engine_temperature?: number | null
          fuel_level?: number | null
          gps_coordinates?: Json | null
          id?: string
          last_update?: string
          odometer_reading?: number | null
          oil_pressure?: number | null
          route_id?: string | null
          route_name?: string | null
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
      route_expenses: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_category: string | null
          expense_date: string
          expense_type: string
          id: string
          receipt_url: string | null
          route_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_category?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          receipt_url?: string | null
          route_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_category?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          receipt_url?: string | null
          route_id?: string
          updated_at?: string
        }
        Relationships: []
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
      routes: {
        Row: {
          created_at: string
          distance_km: number | null
          end_location: string
          estimated_duration_minutes: number | null
          fare_amount: number | null
          id: string
          is_active: boolean | null
          route_name: string
          route_no: string
          start_location: string
          updated_at: string
          via_locations: string[] | null
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          end_location: string
          estimated_duration_minutes?: number | null
          fare_amount?: number | null
          id?: string
          is_active?: boolean | null
          route_name: string
          route_no: string
          start_location: string
          updated_at?: string
          via_locations?: string[] | null
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          end_location?: string
          estimated_duration_minutes?: number | null
          fare_amount?: number | null
          id?: string
          is_active?: boolean | null
          route_name?: string
          route_no?: string
          start_location?: string
          updated_at?: string
          via_locations?: string[] | null
        }
        Relationships: []
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
          driver_contact_no: string | null
          driver_name: string | null
          dropoff_point: string | null
          email_id: string | null
          father_contact_no: string | null
          grade: string | null
          id: string
          is_active: boolean | null
          last_payment_date: string | null
          mother_contact_no: string | null
          parent_name: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          pickup_point: string | null
          pickup_point_cord: string | null
          pickup_point_definition: string | null
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
          driver_contact_no?: string | null
          driver_name?: string | null
          dropoff_point?: string | null
          email_id?: string | null
          father_contact_no?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          mother_contact_no?: string | null
          parent_name?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          pickup_point?: string | null
          pickup_point_cord?: string | null
          pickup_point_definition?: string | null
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
          driver_contact_no?: string | null
          driver_name?: string | null
          dropoff_point?: string | null
          email_id?: string | null
          father_contact_no?: string | null
          grade?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          mother_contact_no?: string | null
          parent_name?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          pickup_point?: string | null
          pickup_point_cord?: string | null
          pickup_point_definition?: string | null
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
      special_hire_invoices: {
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
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_no: string
          invoice_type: string
          quotation_id: string
          status?: string | null
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
          status?: string | null
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          created_by: string | null
          finance_approved_at: string | null
          finance_approved_by: string | null
          id: string
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
          created_at?: string
          created_by?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
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
          created_at?: string
          created_by?: string | null
          finance_approved_at?: string | null
          finance_approved_by?: string | null
          id?: string
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
          assigned_bus_no: string | null
          assigned_conductor_name: string | null
          assigned_driver_name: string | null
          audit_log: Json | null
          balance_due: number | null
          bus_type_id: string | null
          cancellation_reason: string | null
          commission_amount: number | null
          commission_pass_through_amount: number | null
          commission_pass_through_pct: number | null
          commission_pct: number | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
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
          extra_charges: number | null
          fuel_cost_fuel_only: number | null
          gross_revenue: number | null
          hire_charge: number | null
          hire_type: string
          id: string
          intermediate_stops: Json | null
          is_active_version: boolean | null
          km_drop_to_parking: number | null
          km_parking_to_pickup: number | null
          km_trip: number | null
          net_profit: number | null
          number_of_buses: number
          number_of_passengers: number
          other_expenses: Json | null
          parent_quotation_id: string | null
          parking_location_id: string | null
          percentage_adjustment: number | null
          pickup_datetime: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          quotation_no: string
          refund_amount: number | null
          refund_processed_at: string | null
          refund_processed_by: string | null
          refund_reason: string | null
          refund_status: string | null
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
          uses_multi_parking: boolean | null
          valid_until: string | null
          version_number: string | null
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
          assigned_bus_no?: string | null
          assigned_conductor_name?: string | null
          assigned_driver_name?: string | null
          audit_log?: Json | null
          balance_due?: number | null
          bus_type_id?: string | null
          cancellation_reason?: string | null
          commission_amount?: number | null
          commission_pass_through_amount?: number | null
          commission_pass_through_pct?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
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
          extra_charges?: number | null
          fuel_cost_fuel_only?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type: string
          id?: string
          intermediate_stops?: Json | null
          is_active_version?: boolean | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers: number
          other_expenses?: Json | null
          parent_quotation_id?: string | null
          parking_location_id?: string | null
          percentage_adjustment?: number | null
          pickup_datetime: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          quotation_no?: string
          refund_amount?: number | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_status?: string | null
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
          uses_multi_parking?: boolean | null
          valid_until?: string | null
          version_number?: string | null
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
          assigned_bus_no?: string | null
          assigned_conductor_name?: string | null
          assigned_driver_name?: string | null
          audit_log?: Json | null
          balance_due?: number | null
          bus_type_id?: string | null
          cancellation_reason?: string | null
          commission_amount?: number | null
          commission_pass_through_amount?: number | null
          commission_pass_through_pct?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
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
          extra_charges?: number | null
          fuel_cost_fuel_only?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type?: string
          id?: string
          intermediate_stops?: Json | null
          is_active_version?: boolean | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers?: number
          other_expenses?: Json | null
          parent_quotation_id?: string | null
          parking_location_id?: string | null
          percentage_adjustment?: number | null
          pickup_datetime?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          quotation_no?: string
          refund_amount?: number | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_status?: string | null
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
          uses_multi_parking?: boolean | null
          valid_until?: string | null
          version_number?: string | null
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
            foreignKeyName: "special_hire_quotations_bus_type_id_fkey"
            columns: ["bus_type_id"]
            isOneToOne: false
            referencedRelation: "bus_types"
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
            foreignKeyName: "special_hire_quotations_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "special_hire_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      staff_attendance: {
        Row: {
          attendance_date: string
          auto_generated: boolean | null
          bus_no: string | null
          created_at: string
          end_time: string | null
          hours_worked: number | null
          id: string
          overtime_hours: number | null
          route: string | null
          staff_id: string
          staff_name: string
          start_time: string | null
          status: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          auto_generated?: boolean | null
          bus_no?: string | null
          created_at?: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          overtime_hours?: number | null
          route?: string | null
          staff_id: string
          staff_name: string
          start_time?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          auto_generated?: boolean | null
          bus_no?: string | null
          created_at?: string
          end_time?: string | null
          hours_worked?: number | null
          id?: string
          overtime_hours?: number | null
          route?: string | null
          staff_id?: string
          staff_name?: string
          start_time?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          wheel_base_mm?: string | null
        }
        Relationships: []
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
          bank_name: string | null
          bank_slip_no: string | null
          cheque_no: string | null
          created_at: string
          created_by: string | null
          id: string
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
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
          bank_name?: string | null
          bank_slip_no?: string | null
          cheque_no?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
          notes: string | null
          payment_terms: number | null
          phone: string
          tax_number: string | null
          updated_at: string
        }
        Insert: {
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
          notes?: string | null
          payment_terms?: number | null
          phone: string
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
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
          notes?: string | null
          payment_terms?: number | null
          phone?: string
          tax_number?: string | null
          updated_at?: string
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
      yutong_orders: {
        Row: {
          actual_delivery_date: string | null
          balance_due: number | null
          bus_model: string
          color_scheme: string | null
          created_at: string
          created_by: string | null
          current_phase: Database["public"]["Enums"]["yutong_order_phase"]
          customer_id: string | null
          engine_type: string | null
          expected_delivery_date: string | null
          gearbox_type: string | null
          id: string
          notes: string | null
          order_date: string
          order_no: string
          payment_mode: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure: Json | null
          progress_percentage: number | null
          quantity: number
          quotation_id: string
          seating_capacity: number | null
          special_features: Json | null
          status: string
          total_amount: number
          total_paid: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          balance_due?: number | null
          bus_model: string
          color_scheme?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["yutong_order_phase"]
          customer_id?: string | null
          engine_type?: string | null
          expected_delivery_date?: string | null
          gearbox_type?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_no: string
          payment_mode?: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number
          quotation_id: string
          seating_capacity?: number | null
          special_features?: Json | null
          status?: string
          total_amount: number
          total_paid?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          balance_due?: number | null
          bus_model?: string
          color_scheme?: string | null
          created_at?: string
          created_by?: string | null
          current_phase?: Database["public"]["Enums"]["yutong_order_phase"]
          customer_id?: string | null
          engine_type?: string | null
          expected_delivery_date?: string | null
          gearbox_type?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_no?: string
          payment_mode?: Database["public"]["Enums"]["yutong_payment_mode"]
          payment_structure?: Json | null
          progress_percentage?: number | null
          quantity?: number
          quotation_id?: string
          seating_capacity?: number | null
          special_features?: Json | null
          status?: string
          total_amount?: number
          total_paid?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yutong_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
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
      yutong_quotations: {
        Row: {
          bus_model: string
          bus_model_id: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_timeline: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          payment_terms: string | null
          quantity: number
          quotation_no: string
          responsible_person: string | null
          responsible_person_id: string | null
          special_features: string | null
          status: string
          total_price: number
          unit_price: number
          updated_at: string
          valid_days: number
          valid_until: string
          warranty_terms: string | null
        }
        Insert: {
          bus_model: string
          bus_model_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_timeline?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          payment_terms?: string | null
          quantity?: number
          quotation_no: string
          responsible_person?: string | null
          responsible_person_id?: string | null
          special_features?: string | null
          status?: string
          total_price: number
          unit_price: number
          updated_at?: string
          valid_days?: number
          valid_until: string
          warranty_terms?: string | null
        }
        Update: {
          bus_model?: string
          bus_model_id?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_timeline?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          payment_terms?: string | null
          quantity?: number
          quotation_no?: string
          responsible_person?: string | null
          responsible_person_id?: string | null
          special_features?: string | null
          status?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          valid_days?: number
          valid_until?: string
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
            foreignKeyName: "yutong_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "yutong_customers"
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
          container_number: string | null
          created_at: string | null
          current_status: string | null
          departure_port: string | null
          estimated_arrival_date: string | null
          id: string
          insurance_amount: number | null
          order_id: string
          scheduled_arrival_date: string | null
          scheduled_departure_date: string | null
          shipment_reference: string | null
          shipping_cost: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id: string | null
          special_instructions: string | null
          supplier_order_id: string | null
          tracking_number: string | null
          updated_at: string | null
          vessel_name: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          arrival_port?: string | null
          container_number?: string | null
          created_at?: string | null
          current_status?: string | null
          departure_port?: string | null
          estimated_arrival_date?: string | null
          id?: string
          insurance_amount?: number | null
          order_id: string
          scheduled_arrival_date?: string | null
          scheduled_departure_date?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id?: string | null
          special_instructions?: string | null
          supplier_order_id?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          vessel_name?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          arrival_port?: string | null
          container_number?: string | null
          created_at?: string | null
          current_status?: string | null
          departure_port?: string | null
          estimated_arrival_date?: string | null
          id?: string
          insurance_amount?: number | null
          order_id?: string
          scheduled_arrival_date?: string | null
          scheduled_departure_date?: string | null
          shipment_reference?: string | null
          shipping_cost?: number | null
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          shipping_partner_id?: string | null
          special_instructions?: string | null
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
      calculate_sla_due_date: {
        Args: { p_business_hours?: number; p_start_date: string }
        Returns: string
      }
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_customer_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_employee_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_next_version_number: {
        Args: { p_parent_id: string }
        Returns: string
      }
      generate_yutong_order_no: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_yutong_quotation_no: {
        Args: Record<PropertyKey, never> | { quotation_date?: string }
        Returns: string
      }
      generate_yutong_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_yutong_warranty_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "supervisor"
        | "driver"
        | "conductor"
        | "mechanic"
        | "staff"
        | "finance"
      approval_status: "pending" | "approved" | "rejected"
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
      delivery_status:
        | "pending"
        | "scheduled"
        | "in_transit"
        | "delivered"
        | "cancelled"
      feedback_rating: "1" | "2" | "3" | "4" | "5"
      fleet_status: "active" | "maintenance" | "idle" | "retired"
      handover_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      inspection_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "failed"
        | "approved"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      shipping_document_type:
        | "commercial_invoice"
        | "packing_list"
        | "bill_of_lading"
        | "certificate_of_origin"
        | "insurance_certificate"
        | "customs_declaration"
      shipping_method: "roro" | "container"
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
      app_role: [
        "super_admin",
        "admin",
        "supervisor",
        "driver",
        "conductor",
        "mechanic",
        "staff",
        "finance",
      ],
      approval_status: ["pending", "approved", "rejected"],
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
      delivery_status: [
        "pending",
        "scheduled",
        "in_transit",
        "delivered",
        "cancelled",
      ],
      feedback_rating: ["1", "2", "3", "4", "5"],
      fleet_status: ["active", "maintenance", "idle", "retired"],
      handover_status: ["scheduled", "in_progress", "completed", "cancelled"],
      inspection_status: [
        "pending",
        "in_progress",
        "completed",
        "failed",
        "approved",
      ],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
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
      shipping_document_type: [
        "commercial_invoice",
        "packing_list",
        "bill_of_lading",
        "certificate_of_origin",
        "insurance_certificate",
        "customs_declaration",
      ],
      shipping_method: ["roro", "container"],
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
    },
  },
} as const
