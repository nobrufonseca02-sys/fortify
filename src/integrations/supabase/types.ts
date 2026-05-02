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
      accountDailySnapshots: {
        Row: {
          balance: number | null
          createdAt: string
          dailyPnl: number | null
          date: string
          drawdown: number | null
          equity: number | null
          floatingPnl: number | null
          id: string
          maxBalance: number | null
          tradingAccountId: string
          usedDailyLossPct: number | null
          usedTotalLossPct: number | null
          userId: string
        }
        Insert: {
          balance?: number | null
          createdAt?: string
          dailyPnl?: number | null
          date: string
          drawdown?: number | null
          equity?: number | null
          floatingPnl?: number | null
          id?: string
          maxBalance?: number | null
          tradingAccountId: string
          usedDailyLossPct?: number | null
          usedTotalLossPct?: number | null
          userId: string
        }
        Update: {
          balance?: number | null
          createdAt?: string
          dailyPnl?: number | null
          date?: string
          drawdown?: number | null
          equity?: number | null
          floatingPnl?: number | null
          id?: string
          maxBalance?: number | null
          tradingAccountId?: string
          usedDailyLossPct?: number | null
          usedTotalLossPct?: number | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_daily_snapshots_trading_account_id_fkey"
            columns: ["tradingAccountId"]
            isOneToOne: false
            referencedRelation: "tradingAccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5AccountSnapshots: {
        Row: {
          balance: number
          connectionId: string
          createdAt: string
          dailyPnl: number
          date: string
          drawdown: number
          equity: number
          floatingPnl: number
          id: string
          maxBalance: number
        }
        Insert: {
          balance?: number
          connectionId: string
          createdAt?: string
          dailyPnl?: number
          date: string
          drawdown?: number
          equity?: number
          floatingPnl?: number
          id?: string
          maxBalance?: number
        }
        Update: {
          balance?: number
          connectionId?: string
          createdAt?: string
          dailyPnl?: number
          date?: string
          drawdown?: number
          equity?: number
          floatingPnl?: number
          id?: string
          maxBalance?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_account_snapshots_connection_id_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "mt5Connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5Connections: {
        Row: {
          accountName: string
          accountType: string
          brokerName: string
          connectionStatus: Database["public"]["Enums"]["mt5_connection_status"]
          createdAt: string
          id: string
          lastSyncAt: string | null
          mt5Login: string
          mt5PasswordEnc: string | null
          mt5PasswordLast4: string | null
          mt5Server: string
          propFirm: string | null
          syncError: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accountName: string
          accountType?: string
          brokerName: string
          connectionStatus?: Database["public"]["Enums"]["mt5_connection_status"]
          createdAt?: string
          id?: string
          lastSyncAt?: string | null
          mt5Login: string
          mt5PasswordEnc?: string | null
          mt5PasswordLast4?: string | null
          mt5Server: string
          propFirm?: string | null
          syncError?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          accountName?: string
          accountType?: string
          brokerName?: string
          connectionStatus?: Database["public"]["Enums"]["mt5_connection_status"]
          createdAt?: string
          id?: string
          lastSyncAt?: string | null
          mt5Login?: string
          mt5PasswordEnc?: string | null
          mt5PasswordLast4?: string | null
          mt5Server?: string
          propFirm?: string | null
          syncError?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      mt5Positions: {
        Row: {
          connectionId: string
          currentPrice: number
          floatingPnl: number
          id: string
          openPrice: number
          stopLoss: number | null
          symbol: string
          takeProfit: number | null
          ticket: number
          updatedAt: string
          volume: number
        }
        Insert: {
          connectionId: string
          currentPrice?: number
          floatingPnl?: number
          id?: string
          openPrice?: number
          stopLoss?: number | null
          symbol: string
          takeProfit?: number | null
          ticket: number
          updatedAt?: string
          volume: number
        }
        Update: {
          connectionId?: string
          currentPrice?: number
          floatingPnl?: number
          id?: string
          openPrice?: number
          stopLoss?: number | null
          symbol?: string
          takeProfit?: number | null
          ticket?: number
          updatedAt?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_positions_connection_id_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "mt5Connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5Trades: {
        Row: {
          closePrice: number | null
          closeTime: string | null
          commission: number
          connectionId: string
          createdAt: string
          id: string
          openPrice: number
          openTime: string
          profit: number
          side: string
          stopLoss: number | null
          swap: number
          symbol: string
          takeProfit: number | null
          ticket: number
          volume: number
        }
        Insert: {
          closePrice?: number | null
          closeTime?: string | null
          commission?: number
          connectionId: string
          createdAt?: string
          id?: string
          openPrice?: number
          openTime: string
          profit?: number
          side: string
          stopLoss?: number | null
          swap?: number
          symbol: string
          takeProfit?: number | null
          ticket: number
          volume?: number
        }
        Update: {
          closePrice?: number | null
          closeTime?: string | null
          commission?: number
          connectionId?: string
          createdAt?: string
          id?: string
          openPrice?: number
          openTime?: string
          profit?: number
          side?: string
          stopLoss?: number | null
          swap?: number
          symbol?: string
          takeProfit?: number | null
          ticket?: number
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "mt5_trades_connection_id_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "mt5Connections"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5SyncRuns: {
        Row: {
          id: string
          createdAt: string
          userId: string
          connectionId: string | null
          runType: string
          status: string
          requestId: string | null
          startedAt: string | null
          finishedAt: string | null
          errorMessage: string | null
          meta: Json
        }
        Insert: {
          id?: string
          createdAt?: string
          userId: string
          connectionId?: string | null
          runType: string
          status: string
          requestId?: string | null
          startedAt?: string | null
          finishedAt?: string | null
          errorMessage?: string | null
          meta?: Json
        }
        Update: {
          id?: string
          createdAt?: string
          userId?: string
          connectionId?: string | null
          runType?: string
          status?: string
          requestId?: string | null
          startedAt?: string | null
          finishedAt?: string | null
          errorMessage?: string | null
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mt5SyncRunsConnectionIdFkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "mt5Connections"
            referencedColumns: ["id"]
          },
        ]
      }
      postSessionReviews: {
        Row: {
          comment: string | null
          createdAt: string
          date: string
          emotionalError: string | null
          id: string
          operationalError: string | null
          planAdherence: string | null
          result: number | null
          sessionPlanId: string | null
          sessionRating: number | null
          tradingAccountId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          comment?: string | null
          createdAt?: string
          date?: string
          emotionalError?: string | null
          id?: string
          operationalError?: string | null
          planAdherence?: string | null
          result?: number | null
          sessionPlanId?: string | null
          sessionRating?: number | null
          tradingAccountId?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          comment?: string | null
          createdAt?: string
          date?: string
          emotionalError?: string | null
          id?: string
          operationalError?: string | null
          planAdherence?: string | null
          result?: number | null
          sessionPlanId?: string | null
          sessionRating?: number | null
          tradingAccountId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_session_reviews_session_plan_id_fkey"
            columns: ["sessionPlanId"]
            isOneToOne: false
            referencedRelation: "sessionPlans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_session_reviews_trading_account_id_fkey"
            columns: ["tradingAccountId"]
            isOneToOne: false
            referencedRelation: "tradingAccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          accountType: string
          createdAt: string
          id: string
          marketType: string
          name: string
          notes: string | null
          propFirmId: string
        }
        Insert: {
          accountType: string
          createdAt?: string
          id?: string
          marketType?: string
          name: string
          notes?: string | null
          propFirmId: string
        }
        Update: {
          accountType?: string
          createdAt?: string
          id?: string
          marketType?: string
          name?: string
          notes?: string | null
          propFirmId?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_prop_firm_id_fkey"
            columns: ["propFirmId"]
            isOneToOne: false
            referencedRelation: "propFirms"
            referencedColumns: ["id"]
          },
        ]
      }
      propFirms: {
        Row: {
          category: Database["public"]["Enums"]["prop_firm_category"]
          color: string | null
          createdAt: string
          id: string
          logoUrl: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["prop_firm_status"]
          website: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["prop_firm_category"]
          color?: string | null
          createdAt?: string
          id?: string
          logoUrl?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["prop_firm_status"]
          website?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["prop_firm_category"]
          color?: string | null
          createdAt?: string
          id?: string
          logoUrl?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["prop_firm_status"]
          website?: string | null
        }
        Relationships: []
      }
      ruleDefinitions: {
        Row: {
          category: string
          createdAt: string
          description: string | null
          id: string
          key: Database["public"]["Enums"]["rule_definition_key"]
          name: string
        }
        Insert: {
          category?: string
          createdAt?: string
          description?: string | null
          id?: string
          key: Database["public"]["Enums"]["rule_definition_key"]
          name: string
        }
        Update: {
          category?: string
          createdAt?: string
          description?: string | null
          id?: string
          key?: Database["public"]["Enums"]["rule_definition_key"]
          name?: string
        }
        Relationships: []
      }
      ruleInstances: {
        Row: {
          baseCalculation: string | null
          createdAt: string
          dailyReset: boolean
          enabled: boolean
          id: string
          includesFloating: boolean
          limitValue: number
          mode: Database["public"]["Enums"]["rule_mode"]
          params: Json | null
          ruleDefinitionId: string
          ruleSetVersionId: string
          severity: string
        }
        Insert: {
          baseCalculation?: string | null
          createdAt?: string
          dailyReset?: boolean
          enabled?: boolean
          id?: string
          includesFloating?: boolean
          limitValue?: number
          mode?: Database["public"]["Enums"]["rule_mode"]
          params?: Json | null
          ruleDefinitionId: string
          ruleSetVersionId: string
          severity?: string
        }
        Update: {
          baseCalculation?: string | null
          createdAt?: string
          dailyReset?: boolean
          enabled?: boolean
          id?: string
          includesFloating?: boolean
          limitValue?: number
          mode?: Database["public"]["Enums"]["rule_mode"]
          params?: Json | null
          ruleDefinitionId?: string
          ruleSetVersionId?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_instances_rule_definition_id_fkey"
            columns: ["ruleDefinitionId"]
            isOneToOne: false
            referencedRelation: "ruleDefinitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_instances_rule_set_version_id_fkey"
            columns: ["ruleSetVersionId"]
            isOneToOne: false
            referencedRelation: "ruleSetVersions"
            referencedColumns: ["id"]
          },
        ]
      }
      ruleSetVersions: {
        Row: {
          createdAt: string
          endDate: string | null
          id: string
          name: string
          programId: string
          sourceUrl: string | null
          startDate: string | null
          status: Database["public"]["Enums"]["rule_set_status"]
        }
        Insert: {
          createdAt?: string
          endDate?: string | null
          id?: string
          name: string
          programId: string
          sourceUrl?: string | null
          startDate?: string | null
          status?: Database["public"]["Enums"]["rule_set_status"]
        }
        Update: {
          createdAt?: string
          endDate?: string | null
          id?: string
          name?: string
          programId?: string
          sourceUrl?: string | null
          startDate?: string | null
          status?: Database["public"]["Enums"]["rule_set_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rule_set_versions_program_id_fkey"
            columns: ["programId"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      sessionPlans: {
        Row: {
          conservativeTarget: number | null
          createdAt: string
          date: string
          id: string
          maxRiskToday: number | null
          maxTrades: number | null
          notes: string | null
          personalDailyStop: number | null
          riskPerTrade: number | null
          tradingAccountId: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          conservativeTarget?: number | null
          createdAt?: string
          date?: string
          id?: string
          maxRiskToday?: number | null
          maxTrades?: number | null
          notes?: string | null
          personalDailyStop?: number | null
          riskPerTrade?: number | null
          tradingAccountId?: string | null
          updatedAt?: string
          userId: string
        }
        Update: {
          conservativeTarget?: number | null
          createdAt?: string
          date?: string
          id?: string
          maxRiskToday?: number | null
          maxTrades?: number | null
          notes?: string | null
          personalDailyStop?: number | null
          riskPerTrade?: number | null
          tradingAccountId?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_plans_trading_account_id_fkey"
            columns: ["tradingAccountId"]
            isOneToOne: false
            referencedRelation: "tradingAccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tradingAccounts: {
        Row: {
          accountType: string | null
          baseCurrency: string
          broker: string | null
          createdAt: string
          currentBalance: number
          currentEquity: number
          dailyLossLimit: number
          dailyLossResetDate: string | null
          dailyLossUsed: number
          highestEquity: number
          id: string
          lastTradingDate: string | null
          minTradingDays: number
          mt5ConnectionStatus: string | null
          mt5LastSyncAt: string | null
          mt5Login: string | null
          mt5Server: string | null
          mt5SyncError: string | null
          nickname: string
          phase: string | null
          profitTarget: number
          program: string | null
          propFirm: string | null
          ruleSetId: string | null
          startBalance: number
          status: string
          totalLossLimit: number
          totalLossUsed: number
          tradingDaysCount: number
          updatedAt: string
          userId: string
        }
        Insert: {
          accountType?: string | null
          baseCurrency?: string
          broker?: string | null
          createdAt?: string
          currentBalance?: number
          currentEquity?: number
          dailyLossLimit?: number
          dailyLossResetDate?: string | null
          dailyLossUsed?: number
          highestEquity?: number
          id?: string
          lastTradingDate?: string | null
          minTradingDays?: number
          mt5ConnectionStatus?: string | null
          mt5LastSyncAt?: string | null
          mt5Login?: string | null
          mt5Server?: string | null
          mt5SyncError?: string | null
          nickname: string
          phase?: string | null
          profitTarget?: number
          program?: string | null
          propFirm?: string | null
          ruleSetId?: string | null
          startBalance?: number
          status?: string
          totalLossLimit?: number
          totalLossUsed?: number
          tradingDaysCount?: number
          updatedAt?: string
          userId: string
        }
        Update: {
          accountType?: string | null
          baseCurrency?: string
          broker?: string | null
          createdAt?: string
          currentBalance?: number
          currentEquity?: number
          dailyLossLimit?: number
          dailyLossResetDate?: string | null
          dailyLossUsed?: number
          highestEquity?: number
          id?: string
          lastTradingDate?: string | null
          minTradingDays?: number
          mt5ConnectionStatus?: string | null
          mt5LastSyncAt?: string | null
          mt5Login?: string | null
          mt5Server?: string | null
          mt5SyncError?: string | null
          nickname?: string
          phase?: string | null
          profitTarget?: number
          program?: string | null
          propFirm?: string | null
          ruleSetId?: string | null
          startBalance?: number
          status?: string
          totalLossLimit?: number
          totalLossUsed?: number
          tradingDaysCount?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: []
      }
      userRoles: {
        Row: {
          createdAt: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          userId?: string
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
