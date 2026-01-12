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
      ad_view_attempts: {
        Row: {
          attempted_at: string
          granted_access: boolean | null
          id: string
          sure_odd_id: string
          user_email: string
        }
        Insert: {
          attempted_at?: string
          granted_access?: boolean | null
          id?: string
          sure_odd_id: string
          user_email: string
        }
        Update: {
          attempted_at?: string
          granted_access?: boolean | null
          id?: string
          sure_odd_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_view_attempts_sure_odd_id_fkey"
            columns: ["sure_odd_id"]
            isOneToOne: false
            referencedRelation: "sure_odds"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_taps: {
        Row: {
          created_at: string
          earnings: number | null
          id: string
          tap_count: number | null
          tap_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earnings?: number | null
          id?: string
          tap_count?: number | null
          tap_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          earnings?: number | null
          id?: string
          tap_count?: number | null
          tap_date?: string
          user_id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          screenshot_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          screenshot_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      global_ad_zones: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          placement: string
          updated_at: string | null
          zone_id: string
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          placement: string
          updated_at?: string | null
          zone_id: string
          zone_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          placement?: string
          updated_at?: string | null
          zone_id?: string
          zone_name?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_odds: number
          away_team: string
          away_team_logo: string | null
          bet_code: string
          created_at: string | null
          home_odds: number
          home_team: string
          home_team_logo: string | null
          id: string
          match_time: string
          price: number
          status: string
          updated_at: string | null
        }
        Insert: {
          away_odds: number
          away_team: string
          away_team_logo?: string | null
          bet_code: string
          created_at?: string | null
          home_odds: number
          home_team: string
          home_team_logo?: string | null
          id?: string
          match_time: string
          price?: number
          status: string
          updated_at?: string | null
        }
        Update: {
          away_odds?: number
          away_team?: string
          away_team_logo?: string | null
          bet_code?: string
          created_at?: string | null
          home_odds?: number
          home_team?: string
          home_team_logo?: string | null
          id?: string
          match_time?: string
          price?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          item_id: string | null
          item_type: string | null
          screenshot_url: string | null
          status: string
          sure_odd_id: string
          updated_at: string | null
          user_email: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_type?: string | null
          screenshot_url?: string | null
          status?: string
          sure_odd_id: string
          updated_at?: string | null
          user_email: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          item_id?: string | null
          item_type?: string | null
          screenshot_url?: string | null
          status?: string
          sure_odd_id?: string
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          total_earned: number | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_earned?: number | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          total_earned?: number | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_email: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_email: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_email?: string
        }
        Relationships: []
      }
      sure_odds: {
        Row: {
          ad_enabled: boolean | null
          ad_zone_id: string | null
          away_team: string
          away_team_logo: string | null
          bet_code: string
          confidence: string
          created_at: string | null
          home_team: string
          home_team_logo: string | null
          id: string
          match_count: number
          odds: number
          payout: number | null
          prediction: string
          price: number
          scheduled_time: string | null
          stake: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          ad_enabled?: boolean | null
          ad_zone_id?: string | null
          away_team: string
          away_team_logo?: string | null
          bet_code: string
          confidence: string
          created_at?: string | null
          home_team: string
          home_team_logo?: string | null
          id?: string
          match_count?: number
          odds: number
          payout?: number | null
          prediction: string
          price?: number
          scheduled_time?: string | null
          stake?: number | null
          status: string
          updated_at?: string | null
        }
        Update: {
          ad_enabled?: boolean | null
          ad_zone_id?: string | null
          away_team?: string
          away_team_logo?: string | null
          bet_code?: string
          confidence?: string
          created_at?: string | null
          home_team?: string
          home_team_logo?: string | null
          id?: string
          match_count?: number
          odds?: number
          payout?: number | null
          prediction?: string
          price?: number
          scheduled_time?: string | null
          stake?: number | null
          status?: string
          updated_at?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wallets: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          total_deposited: number | null
          total_withdrawn: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          total_deposited?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          total_deposited?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_details: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_details: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_details?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tap_earnings: {
        Args: { _amount: number; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
