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
    PostgrestVersion: "14.18"
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
      app_users: {
        Row: {
          branch_id: string | null
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          pin_hash: string
          role: string
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          pin_hash: string
          role: string
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          pin_hash?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          branch: string
          created_at: string
          date: string
          id: string
          notes: string | null
          overtime_hours: number
          staff_name: string
          status: string
          time_in: string | null
          time_out: string | null
        }
        Insert: {
          branch?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          overtime_hours?: number
          staff_name: string
          status?: string
          time_in?: string | null
          time_out?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          overtime_hours?: number
          staff_name?: string
          status?: string
          time_in?: string | null
          time_out?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          branch_id: string | null
          entity_id: string
          entity_name: string
          id: string
          impersonated_by: string | null
          ip_address: string | null
          new_state: Json | null
          previous_state: Json | null
          role: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: string
          branch_id?: string | null
          entity_id: string
          entity_name: string
          id?: string
          impersonated_by?: string | null
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          role?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: string
          branch_id?: string | null
          entity_id?: string
          entity_name?: string
          id?: string
          impersonated_by?: string | null
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          role?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          contact_number: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          address: string
          contact_number?: string | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          address?: string
          contact_number?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          contact_number: string | null
          created_at: string
          credit_limit: number
          email: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          balance?: number
          contact_number?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          balance?: number
          contact_number?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch: string | null
          category: string
          created_at: string
          date: string
          description: string
          id: string
          payment_method: string
          reference_no: string | null
        }
        Insert: {
          amount?: number
          branch?: string | null
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          payment_method?: string
          reference_no?: string | null
        }
        Update: {
          amount?: number
          branch?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          payment_method?: string
          reference_no?: string | null
        }
        Relationships: []
      }
      inventory_stock: {
        Row: {
          branch_id: string
          id: string
          last_updated: string | null
          product_id: string
          quantity_on_hand: number
          reorder_level: number
        }
        Insert: {
          branch_id: string
          id?: string
          last_updated?: string | null
          product_id: string
          quantity_on_hand?: number
          reorder_level?: number
        }
        Update: {
          branch_id?: string
          id?: string
          last_updated?: string | null
          product_id?: string
          quantity_on_hand?: number
          reorder_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_and_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          artwork_url: string | null
          assigned_worker_id: string | null
          created_at: string
          deadline: string | null
          id: string
          job_number: string
          production_area: string | null
          sales_order_id: string | null
          stage_status: string
        }
        Insert: {
          artwork_url?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          job_number: string
          production_area?: string | null
          sales_order_id?: string | null
          stage_status?: string
        }
        Update: {
          artwork_url?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          job_number?: string
          production_area?: string | null
          sales_order_id?: string | null
          stage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          branch: string
          created_at: string
          daily_rate: number
          days_worked: number
          deductions: number
          id: string
          overtime_hours: number
          overtime_rate: number
          pay_period_end: string | null
          pay_period_start: string | null
          payment_date: string | null
          payment_method: string
          role: string
          staff_name: string
          status: string
          total_net_pay: number
        }
        Insert: {
          branch?: string
          created_at?: string
          daily_rate?: number
          days_worked?: number
          deductions?: number
          id?: string
          overtime_hours?: number
          overtime_rate?: number
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_date?: string | null
          payment_method?: string
          role?: string
          staff_name: string
          status?: string
          total_net_pay?: number
        }
        Update: {
          branch?: string
          created_at?: string
          daily_rate?: number
          days_worked?: number
          deductions?: number
          id?: string
          overtime_hours?: number
          overtime_rate?: number
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_date?: string | null
          payment_method?: string
          role?: string
          staff_name?: string
          status?: string
          total_net_pay?: number
        }
        Relationships: []
      }
      products_and_inventory: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          id: string
          item_name: string
          reorder_level: number
          sku: string
          stock_quantity: number
          unit_price: number
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          item_name: string
          reorder_level?: number
          sku: string
          stock_quantity?: number
          unit_price?: number
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          id?: string
          item_name?: string
          reorder_level?: number
          sku?: string
          stock_quantity?: number
          unit_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch: string | null
          created_at: string
          full_name: string | null
          id: string
          primary_branch_id: string | null
          role: string
        }
        Insert: {
          branch?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          primary_branch_id?: string | null
          role?: string
        }
        Update: {
          branch?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          primary_branch_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_branch_id_fkey"
            columns: ["primary_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          branch: string | null
          created_at: string
          customer_id: string | null
          id: string
          order_number: string
          order_status: string
          payment_status: string
          total_amount: number
        }
        Insert: {
          branch?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          order_number: string
          order_status?: string
          payment_status?: string
          total_amount?: number
        }
        Update: {
          branch?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          order_number?: string
          order_status?: string
          payment_status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          product_id: string
          quantity_received: number | null
          quantity_sent: number
          transfer_id: string
          variance_reason: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity_received?: number | null
          quantity_sent: number
          transfer_id: string
          variance_reason?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity_received?: number | null
          quantity_sent?: number
          transfer_id?: string
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_and_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string | null
          destination_branch_id: string
          dispatched_at: string | null
          dispatched_by: string | null
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          source_branch_id: string
          status: string
          transfer_number: string
        }
        Insert: {
          created_at?: string | null
          destination_branch_id: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          source_branch_id: string
          status?: string
          transfer_number: string
        }
        Update: {
          created_at?: string | null
          destination_branch_id?: string
          dispatched_at?: string | null
          dispatched_by?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          source_branch_id?: string
          status?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_destination_branch_id_fkey"
            columns: ["destination_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_source_branch_id_fkey"
            columns: ["source_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_app_user: {
        Args: { p_full_name: string; p_pin: string; p_role: string }
        Returns: string
      }
      dispatch_stock_transfer: {
        Args: { p_transfer_id: string; p_user_id: string }
        Returns: Json
      }
      get_users_by_role: {
        Args: { p_role: string }
        Returns: {
          full_name: string
          id: string
          role: string
        }[]
      }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_branch_id: string
          p_entity_id: string
          p_entity_name: string
          p_new_state?: Json
          p_previous_state?: Json
          p_role: string
          p_user_id: string
          p_user_name: string
        }
        Returns: string
      }
      receive_stock_transfer: {
        Args: { p_items: Json; p_transfer_id: string; p_user_id: string }
        Returns: Json
      }
      verify_user_pin: {
        Args: { p_pin: string; p_user_id: string }
        Returns: {
          full_name: string
          message: string
          role: string
          success: boolean
          user_id: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
