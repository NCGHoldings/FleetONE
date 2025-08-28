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
          reported_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by_name: string | null
          staff_group: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
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
          reported_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          staff_group?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
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
          reported_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by_name?: string | null
          staff_group?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
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
          flat_fee_lkr: number | null
          from_km: number
          hire_type: string
          id: string
          is_active: boolean | null
          rate_per_km_lkr: number | null
          to_km: number | null
          updated_at: string | null
        }
        Insert: {
          bus_type_id?: string | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          flat_fee_lkr?: number | null
          from_km?: number
          hire_type: string
          id?: string
          is_active?: boolean | null
          rate_per_km_lkr?: number | null
          to_km?: number | null
          updated_at?: string | null
        }
        Update: {
          bus_type_id?: string | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          flat_fee_lkr?: number | null
          from_km?: number
          hire_type?: string
          id?: string
          is_active?: boolean | null
          rate_per_km_lkr?: number | null
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
      insurance_records: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          bus_id: string
          coverage_amount: number | null
          created_at: string
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
      route_permits: {
        Row: {
          annual_fee: number | null
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
          annual_fee?: number | null
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
          annual_fee?: number | null
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
          bus_type_id: string | null
          commission_amount: number | null
          commission_pct: number | null
          company_name: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          driver_charge: number | null
          drop_datetime: string
          drop_lat: number | null
          drop_lng: number | null
          drop_location: string
          extra_charges: number | null
          fuel_cost_fuel_only: number | null
          gross_revenue: number | null
          hire_charge: number | null
          hire_type: string
          id: string
          intermediate_stops: Json | null
          km_drop_to_parking: number | null
          km_parking_to_pickup: number | null
          km_trip: number | null
          net_profit: number | null
          number_of_buses: number
          number_of_passengers: number
          other_expenses: Json | null
          pickup_datetime: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_location: string
          quotation_no: string
          special_request: string | null
          status: string | null
          total_expenses: number | null
          trip_id: string | null
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          bus_type_id?: string | null
          commission_amount?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          driver_charge?: number | null
          drop_datetime: string
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location: string
          extra_charges?: number | null
          fuel_cost_fuel_only?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type: string
          id?: string
          intermediate_stops?: Json | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers: number
          other_expenses?: Json | null
          pickup_datetime: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location: string
          quotation_no?: string
          special_request?: string | null
          status?: string | null
          total_expenses?: number | null
          trip_id?: string | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          bus_type_id?: string | null
          commission_amount?: number | null
          commission_pct?: number | null
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          driver_charge?: number | null
          drop_datetime?: string
          drop_lat?: number | null
          drop_lng?: number | null
          drop_location?: string
          extra_charges?: number | null
          fuel_cost_fuel_only?: number | null
          gross_revenue?: number | null
          hire_charge?: number | null
          hire_type?: string
          id?: string
          intermediate_stops?: Json | null
          km_drop_to_parking?: number | null
          km_parking_to_pickup?: number | null
          km_trip?: number | null
          net_profit?: number | null
          number_of_buses?: number
          number_of_passengers?: number
          other_expenses?: Json | null
          pickup_datetime?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_location?: string
          quotation_no?: string
          special_request?: string | null
          status?: string | null
          total_expenses?: number | null
          trip_id?: string | null
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_hire_quotations_bus_type_id_fkey"
            columns: ["bus_type_id"]
            isOneToOne: false
            referencedRelation: "bus_types"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      fleet_status: "active" | "maintenance" | "idle" | "retired"
      maintenance_status: "pending" | "in_progress" | "completed" | "cancelled"
      permit_status: "valid" | "expired" | "suspended" | "cancelled"
      trip_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      user_status: "active" | "inactive" | "suspended"
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
      ],
      fleet_status: ["active", "maintenance", "idle", "retired"],
      maintenance_status: ["pending", "in_progress", "completed", "cancelled"],
      permit_status: ["valid", "expired", "suspended", "cancelled"],
      trip_status: ["scheduled", "ongoing", "completed", "cancelled"],
      user_status: ["active", "inactive", "suspended"],
    },
  },
} as const
