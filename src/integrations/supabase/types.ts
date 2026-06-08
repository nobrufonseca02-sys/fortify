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
      account_daily_snapshots: {
        Row: {
          balance: number | null
          created_at: string
          daily_pnl: number | null
          date: string
          drawdown: number | null
          equity: number | null
          floating_pnl: number | null
          id: string
          max_balance: number | null
          trading_account_id: string
          used_daily_loss_pct: number | null
          used_total_loss_pct: number | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          daily_pnl?: number | null
          date: string
          drawdown?: number | null
          equity?: number | null
          floating_pnl?: number | null
          id?: string
          max_balance?: number | null
          trading_account_id: string
          used_daily_loss_pct?: number | null
          used_total_loss_pct?: number | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          daily_pnl?: number | null
          date?: string
          drawdown?: number | null
          equity?: number | null
          floating_pnl?: number | null
          id?: string
          max_balance?: number | null
          trading_account_id?: string
          used_daily_loss_pct?: number | null
          used_total_loss_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_daily_snapshots_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_account_snapshots: {
        Row: {
          balance: number
          connection_id: string
          created_at: string
          daily_pnl: number
          date: string
          drawdown: number
          equity: number
          floating_pnl: number
          id: string
          max_balance: number
        }
        Insert: {
          balance?: number
          connection_id: string
          created_at?: string
          daily_pnl?: number
          date: string
          drawdown?: number
          equity?: number
          floating_pnl?: number
          id?: string
          max_balance?: number
        }
        Update: {
          balance?: number
          connection_id?: string
          created_at?: string
          daily_pnl?: number
          date?: string
          drawdown?: number
          equity?: number
          floating_pnl?: number
          id?: string
          max_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_account_snapshots_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "mt5_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_connections: {
        Row: {
          account_name: string
          account_type: string
          api_mode: string
          broker_name: string
          connection_status: Database["public"]["Enums"]["mt5_connection_status"]
          created_at: string
          id: string
          last_sync_at: string | null
          mt5_login: string
          mt5_server: string
          prop_firm: string | null
          provider: string
          provider_account_id: string | null
          sync_error: string | null
          sync_status: string
          trading_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_type?: string
          api_mode?: string
          broker_name: string
          connection_status?: Database["public"]["Enums"]["mt5_connection_status"]
          created_at?: string
          id?: string
          last_sync_at?: string | null
          mt5_login: string
          mt5_server: string
          prop_firm?: string | null
          provider?: string
          provider_account_id?: string | null
          sync_error?: string | null
          sync_status?: string
          trading_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string
          api_mode?: string
          broker_name?: string
          connection_status?: Database["public"]["Enums"]["mt5_connection_status"]
          created_at?: string
          id?: string
          last_sync_at?: string | null
          mt5_login?: string
          mt5_server?: string
          prop_firm?: string | null
          provider?: string
          provider_account_id?: string | null
          sync_error?: string | null
          sync_status?: string
          trading_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_positions: {
        Row: {
          connection_id: string
          current_price: number
          floating_pnl: number
          id: string
          open_price: number
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          ticket: number
          updated_at: string
          volume: number
        }
        Insert: {
          connection_id: string
          current_price?: number
          floating_pnl?: number
          id?: string
          open_price?: number
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          ticket: number
          updated_at?: string
          volume?: number
        }
        Update: {
          connection_id?: string
          current_price?: number
          floating_pnl?: number
          id?: string
          open_price?: number
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          ticket?: number
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_positions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "mt5_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_trades: {
        Row: {
          close_price: number | null
          close_time: string | null
          commission: number
          connection_id: string
          created_at: string
          id: string
          open_price: number
          open_time: string
          profit: number
          side: string
          stop_loss: number | null
          swap: number
          symbol: string
          take_profit: number | null
          ticket: number
          volume: number
        }
        Insert: {
          close_price?: number | null
          close_time?: string | null
          commission?: number
          connection_id: string
          created_at?: string
          id?: string
          open_price?: number
          open_time: string
          profit?: number
          side: string
          stop_loss?: number | null
          swap?: number
          symbol: string
          take_profit?: number | null
          ticket: number
          volume?: number
        }
        Update: {
          close_price?: number | null
          close_time?: string | null
          commission?: number
          connection_id?: string
          created_at?: string
          id?: string
          open_price?: number
          open_time?: string
          profit?: number
          side?: string
          stop_loss?: number | null
          swap?: number
          symbol?: string
          take_profit?: number | null
          ticket?: number
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_trades_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "mt5_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      post_session_reviews: {
        Row: {
          comment: string | null
          created_at: string
          date: string
          emotional_error: string | null
          id: string
          operational_error: string | null
          plan_adherence: string | null
          result: number | null
          session_plan_id: string | null
          session_rating: number | null
          trading_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          date?: string
          emotional_error?: string | null
          id?: string
          operational_error?: string | null
          plan_adherence?: string | null
          result?: number | null
          session_plan_id?: string | null
          session_rating?: number | null
          trading_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          date?: string
          emotional_error?: string | null
          id?: string
          operational_error?: string | null
          plan_adherence?: string | null
          result?: number | null
          session_plan_id?: string | null
          session_rating?: number | null
          trading_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_session_reviews_session_plan_id_fkey"
            columns: ["session_plan_id"]
            isOneToOne: false
            referencedRelation: "session_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_session_reviews_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      session_plans: {
        Row: {
          conservative_target: number | null
          created_at: string
          date: string
          id: string
          max_risk_today: number | null
          max_trades: number | null
          notes: string | null
          personal_daily_stop: number | null
          risk_per_trade: number | null
          trading_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conservative_target?: number | null
          created_at?: string
          date?: string
          id?: string
          max_risk_today?: number | null
          max_trades?: number | null
          notes?: string | null
          personal_daily_stop?: number | null
          risk_per_trade?: number | null
          trading_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conservative_target?: number | null
          created_at?: string
          date?: string
          id?: string
          max_risk_today?: number | null
          max_trades?: number | null
          notes?: string | null
          personal_daily_stop?: number | null
          risk_per_trade?: number | null
          trading_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_plans_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_type: string | null
          base_currency: string
          broker: string | null
          created_at: string
          current_balance: number
          current_equity: number
          daily_loss_limit: number
          daily_loss_reset_date: string | null
          daily_loss_used: number
          highest_equity: number
          id: string
          last_trading_date: string | null
          min_trading_days: number
          mt5_connection_status: string | null
          mt5_last_sync_at: string | null
          mt5_login: string | null
          mt5_server: string | null
          mt5_sync_error: string | null
          nickname: string
          phase: string | null
          profit_target: number
          program: string | null
          prop_firm: string | null
          rule_set_id: string | null
          start_balance: number
          status: string
          total_loss_limit: number
          total_loss_used: number
          trading_days_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          base_currency?: string
          broker?: string | null
          created_at?: string
          current_balance?: number
          current_equity?: number
          daily_loss_limit?: number
          daily_loss_reset_date?: string | null
          daily_loss_used?: number
          highest_equity?: number
          id?: string
          last_trading_date?: string | null
          min_trading_days?: number
          mt5_connection_status?: string | null
          mt5_last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          mt5_sync_error?: string | null
          nickname: string
          phase?: string | null
          profit_target?: number
          program?: string | null
          prop_firm?: string | null
          rule_set_id?: string | null
          start_balance?: number
          status?: string
          total_loss_limit?: number
          total_loss_used?: number
          trading_days_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          base_currency?: string
          broker?: string | null
          created_at?: string
          current_balance?: number
          current_equity?: number
          daily_loss_limit?: number
          daily_loss_reset_date?: string | null
          daily_loss_used?: number
          highest_equity?: number
          id?: string
          last_trading_date?: string | null
          min_trading_days?: number
          mt5_connection_status?: string | null
          mt5_last_sync_at?: string | null
          mt5_login?: string | null
          mt5_server?: string | null
          mt5_sync_error?: string | null
          nickname?: string
          phase?: string | null
          profit_target?: number
          program?: string | null
          prop_firm?: string | null
          rule_set_id?: string | null
          start_balance?: number
          status?: string
          total_loss_limit?: number
          total_loss_used?: number
          trading_days_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      mt5_connection_status:
        | "disconnected"
        | "connecting"
        | "connected"
        | "auth_error"
        | "syncing"
      prop_firm_category: "forex" | "futures" | "multi_asset"
      prop_firm_status: "active" | "inactive" | "pending"
      rule_definition_key:
        | "max_daily_loss"
        | "daily_loss_percent"
        | "daily_loss_fixed"
        | "max_total_loss"
        | "total_loss_percent"
        | "total_loss_fixed"
        | "trailing_drawdown"
        | "floating_loss_limit"
        | "profit_target"
        | "profit_target_percent"
        | "profit_target_fixed"
        | "min_trading_days"
        | "profitable_days"
        | "min_profitable_days"
        | "consistency_best_day_cap"
        | "consistency_percent"
        | "inactivity_limit"
        | "inactivity_limit_days"
        | "news_restriction"
        | "news_trading_block"
        | "scalping_restriction"
        | "weekend_holding"
        | "weekend_holding_block"
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
      app_role: ["admin", "moderator", "user"],
      mt5_connection_status: [
        "disconnected",
        "connecting",
        "connected",
        "auth_error",
        "syncing",
      ],
      prop_firm_category: ["forex", "futures", "multi_asset"],
      prop_firm_status: ["active", "inactive", "pending"],
      rule_definition_key: [
        "max_daily_loss",
        "daily_loss_percent",
        "daily_loss_fixed",
        "max_total_loss",
        "total_loss_percent",
        "total_loss_fixed",
        "trailing_drawdown",
        "floating_loss_limit",
        "profit_target",
        "profit_target_percent",
        "profit_target_fixed",
        "min_trading_days",
        "profitable_days",
        "min_profitable_days",
        "consistency_best_day_cap",
        "consistency_percent",
        "inactivity_limit",
        "inactivity_limit_days",
        "news_restriction",
        "news_trading_block",
        "scalping_restriction",
        "weekend_holding",
        "weekend_holding_block",
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
