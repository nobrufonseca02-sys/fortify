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
  public: {
    Tables: {
      programs: {
        Row: {
          account_type: string
          created_at: string
          id: string
          market_type: string
          name: string
          notes: string | null
          prop_firm_id: string
        }
        Insert: {
          account_type: string
          created_at?: string
          id?: string
          market_type?: string
          name: string
          notes?: string | null
          prop_firm_id: string
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          market_type?: string
          name?: string
          notes?: string | null
          prop_firm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_prop_firm_id_fkey"
            columns: ["prop_firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_firms: {
        Row: {
          category: Database["public"]["Enums"]["prop_firm_category"]
          color: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["prop_firm_status"]
          website: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["prop_firm_category"]
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["prop_firm_status"]
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["prop_firm_category"]
          color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["prop_firm_status"]
          website?: string | null
        }
        Relationships: []
      }
      rule_definitions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: Database["public"]["Enums"]["rule_definition_key"]
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: Database["public"]["Enums"]["rule_definition_key"]
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: Database["public"]["Enums"]["rule_definition_key"]
          name?: string
        }
        Relationships: []
      }
      rule_instances: {
        Row: {
          base_calculation: string | null
          created_at: string
          daily_reset: boolean
          enabled: boolean
          id: string
          includes_floating: boolean
          limit_value: number
          mode: Database["public"]["Enums"]["rule_mode"]
          params: Json | null
          rule_definition_id: string
          rule_set_version_id: string
          severity: string
        }
        Insert: {
          base_calculation?: string | null
          created_at?: string
          daily_reset?: boolean
          enabled?: boolean
          id?: string
          includes_floating?: boolean
          limit_value?: number
          mode?: Database["public"]["Enums"]["rule_mode"]
          params?: Json | null
          rule_definition_id: string
          rule_set_version_id: string
          severity?: string
        }
        Update: {
          base_calculation?: string | null
          created_at?: string
          daily_reset?: boolean
          enabled?: boolean
          id?: string
          includes_floating?: boolean
          limit_value?: number
          mode?: Database["public"]["Enums"]["rule_mode"]
          params?: Json | null
          rule_definition_id?: string
          rule_set_version_id?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_instances_rule_definition_id_fkey"
            columns: ["rule_definition_id"]
            isOneToOne: false
            referencedRelation: "rule_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_instances_rule_set_version_id_fkey"
            columns: ["rule_set_version_id"]
            isOneToOne: false
            referencedRelation: "rule_set_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_set_versions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          program_id: string
          source_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["rule_set_status"]
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          program_id: string
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["rule_set_status"]
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          program_id?: string
          source_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["rule_set_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rule_set_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      prop_firm_category: "forex" | "futures" | "multi_asset"
      prop_firm_status: "active" | "inactive" | "pending"
      rule_definition_key:
        | "max_daily_loss"
        | "max_total_loss"
        | "trailing_drawdown"
        | "floating_loss_limit"
        | "profit_target"
        | "min_trading_days"
        | "profitable_days"
        | "consistency_best_day_cap"
        | "inactivity_limit"
        | "news_restriction"
        | "scalping_restriction"
        | "weekend_holding"
        | "payout_eligibility"
        | "profit_split"
        | "payout_frequency"
        | "leverage_limit"
      rule_mode: "percent" | "value"
      rule_set_status: "active" | "archived" | "draft"
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
      prop_firm_category: ["forex", "futures", "multi_asset"],
      prop_firm_status: ["active", "inactive", "pending"],
      rule_definition_key: [
        "max_daily_loss",
        "max_total_loss",
        "trailing_drawdown",
        "floating_loss_limit",
        "profit_target",
        "min_trading_days",
        "profitable_days",
        "consistency_best_day_cap",
        "inactivity_limit",
        "news_restriction",
        "scalping_restriction",
        "weekend_holding",
        "payout_eligibility",
        "profit_split",
        "payout_frequency",
        "leverage_limit",
      ],
      rule_mode: ["percent", "value"],
      rule_set_status: ["active", "archived", "draft"],
    },
  },
} as const
