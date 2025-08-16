export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cash_flow_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_name: string
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_name: string
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_name?: string
          transaction_date?: string
          type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          archived: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cost_simulations: {
        Row: {
          cost_options: Json
          created_at: string | null
          description: string | null
          id: string
          name: string
          results: Json | null
          simulation_data: Json
          simulation_type: string
          updated_at: string | null
        }
        Insert: {
          cost_options?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          results?: Json | null
          simulation_data?: Json
          simulation_type: string
          updated_at?: string | null
        }
        Update: {
          cost_options?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          results?: Json | null
          simulation_data?: Json
          simulation_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_units: {
        Row: {
          created_at: string | null
          id: string
          unit_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          unit_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          unit_name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          archived: boolean | null
          contact: string | null
          created_at: string | null
          document: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          contact?: string | null
          created_at?: string | null
          document?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          contact?: string | null
          created_at?: string | null
          document?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      defective_tire_sales: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          quantity: number
          sale_date: string
          sale_value: number
          tire_name: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number
          sale_date?: string
          sale_value: number
          tire_name: string
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number
          sale_date?: string
          sale_value?: number
          tire_name?: string
          unit_price?: number
        }
        Relationships: []
      }
      employees: {
        Row: {
          archived: boolean | null
          commission: number | null
          created_at: string | null
          hire_date: string
          id: string
          labor_charges: Json | null
          name: string
          position: string
          salary: number
          updated_at: string | null
          workdays_per_week: number | null
        }
        Insert: {
          archived?: boolean | null
          commission?: number | null
          created_at?: string | null
          hire_date: string
          id?: string
          labor_charges?: Json | null
          name: string
          position: string
          salary: number
          updated_at?: string | null
          workdays_per_week?: number | null
        }
        Update: {
          archived?: boolean | null
          commission?: number | null
          created_at?: string | null
          hire_date?: string
          id?: string
          labor_charges?: Json | null
          name?: string
          position?: string
          salary?: number
          updated_at?: string | null
          workdays_per_week?: number | null
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          amount: number
          archived: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      production_entries: {
        Row: {
          created_at: string | null
          id: string
          material_loss: Json | null
          materials_consumed: Json
          product_name: string
          production_date: string
          production_loss: number | null
          quantity_produced: number
          recipe_id: string | null
          warranty_loss: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_loss?: Json | null
          materials_consumed: Json
          product_name: string
          production_date: string
          production_loss?: number | null
          quantity_produced: number
          recipe_id?: string | null
          warranty_loss?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_loss?: Json | null
          materials_consumed?: Json
          product_name?: string
          production_date?: string
          production_loss?: number | null
          quantity_produced?: number
          recipe_id?: string | null
          warranty_loss?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "production_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_recipes: {
        Row: {
          archived: boolean | null
          created_at: string | null
          id: string
          materials: Json
          product_name: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          materials: Json
          product_name: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          materials?: Json
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          archived: boolean | null
          created_at: string | null
          id: string
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_materials: {
        Row: {
          archived: boolean | null
          created_at: string | null
          id: string
          name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resale_products: {
        Row: {
          archived: boolean | null
          barcode: string | null
          category: string | null
          created_at: string | null
          current_stock: number | null
          description: string | null
          id: string
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          profit_margin: number
          purchase_price: number
          sale_price: number
          sku: string | null
          supplier_id: string | null
          supplier_name: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          profit_margin?: number
          purchase_price?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          supplier_name: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          barcode?: string | null
          category?: string | null
          created_at?: string | null
          current_stock?: number | null
          description?: string | null
          id?: string
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          profit_margin?: number
          purchase_price?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          supplier_name?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_resale_products_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          customer_name: string
          description: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_date: string
          salesperson_id: string | null
          salesperson_name: string
          total_value: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          description?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_date?: string
          salesperson_id?: string | null
          salesperson_name: string
          total_value: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          description?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_date?: string
          salesperson_id?: string | null
          salesperson_name?: string
          total_value?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespeople"
            referencedColumns: ["id"]
          },
        ]
      }
      salespeople: {
        Row: {
          archived: boolean | null
          commission_rate: number
          contact: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          commission_rate?: number
          contact?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          commission_rate?: number
          contact?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_name: string
          item_type: string
          last_updated: string | null
          max_level: number | null
          min_level: number | null
          quantity: number
          total_value: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_name: string
          item_type: string
          last_updated?: string | null
          max_level?: number | null
          min_level?: number | null
          quantity?: number
          total_value?: number
          unit: string
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          item_type?: string
          last_updated?: string | null
          max_level?: number | null
          min_level?: number | null
          quantity?: number
          total_value?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          archived: boolean | null
          contact: string | null
          created_at: string | null
          document: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          contact?: string | null
          created_at?: string | null
          document?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          contact?: string | null
          created_at?: string | null
          document?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          image: string | null
          name: string | null
          token_identifier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          image?: string | null
          name?: string | null
          token_identifier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          image?: string | null
          name?: string | null
          token_identifier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      variable_costs: {
        Row: {
          amount: number
          archived: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          archived?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      warranty_entries: {
        Row: {
          created_at: string | null
          customer_id: string
          customer_name: string
          description: string | null
          id: string
          product_name: string
          quantity: number
          salesperson_name: string
          warranty_date: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          customer_name: string
          description?: string | null
          id?: string
          product_name: string
          quantity?: number
          salesperson_name: string
          warranty_date: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          customer_name?: string
          description?: string | null
          id?: string
          product_name?: string
          quantity?: number
          salesperson_name?: string
          warranty_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_warranty_entries_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
