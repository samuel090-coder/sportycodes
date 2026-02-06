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
      announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          bg_color: string | null
          content: string
          created_at: string
          created_by: string | null
          display_type: string
          end_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_dismissible: boolean | null
          link_text: string | null
          link_url: string | null
          priority: number | null
          show_once: boolean | null
          start_at: string | null
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          display_type?: string
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_text?: string | null
          link_url?: string | null
          priority?: number | null
          show_once?: boolean | null
          start_at?: string | null
          text_color?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          display_type?: string
          end_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_dismissible?: boolean | null
          link_text?: string | null
          link_url?: string | null
          priority?: number | null
          show_once?: boolean | null
          start_at?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      betting_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_winner: boolean | null
          payout: number | null
          pool_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_winner?: boolean | null
          payout?: number | null
          pool_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_winner?: boolean | null
          payout?: number | null
          pool_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "betting_entries_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "betting_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "betting_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "betting_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      betting_pools: {
        Row: {
          closes_at: string
          created_at: string
          creator_deposit: number
          creator_id: string
          description: string | null
          entry_fee: number
          id: string
          match_details: Json
          options: Json
          prize_pool: number
          settled_at: string | null
          status: string
          title: string
          updated_at: string
          winning_option: number | null
        }
        Insert: {
          closes_at: string
          created_at?: string
          creator_deposit?: number
          creator_id: string
          description?: string | null
          entry_fee?: number
          id?: string
          match_details?: Json
          options?: Json
          prize_pool?: number
          settled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          winning_option?: number | null
        }
        Update: {
          closes_at?: string
          created_at?: string
          creator_deposit?: number
          creator_id?: string
          description?: string | null
          entry_fee?: number
          id?: string
          match_details?: Json
          options?: Json
          prize_pool?: number
          settled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          winning_option?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "betting_pools_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "betting_pools_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
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
      house_earnings: {
        Row: {
          amount: number
          betting_pool_id: string | null
          created_at: string
          description: string | null
          id: string
          percentage: number
        }
        Insert: {
          amount: number
          betting_pool_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          percentage?: number
        }
        Update: {
          amount?: number
          betting_pool_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "house_earnings_betting_pool_id_fkey"
            columns: ["betting_pool_id"]
            isOneToOne: false
            referencedRelation: "betting_pools"
            referencedColumns: ["id"]
          },
        ]
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
      notification_preferences: {
        Row: {
          created_at: string | null
          daily_tap_reminder: boolean | null
          deposit_approved: boolean | null
          id: string
          new_follower: boolean | null
          post_comments: boolean | null
          post_likes: boolean | null
          referral_signup: boolean | null
          streak_reminder: boolean | null
          updated_at: string | null
          user_id: string
          withdrawal_completed: boolean | null
        }
        Insert: {
          created_at?: string | null
          daily_tap_reminder?: boolean | null
          deposit_approved?: boolean | null
          id?: string
          new_follower?: boolean | null
          post_comments?: boolean | null
          post_likes?: boolean | null
          referral_signup?: boolean | null
          streak_reminder?: boolean | null
          updated_at?: string | null
          user_id: string
          withdrawal_completed?: boolean | null
        }
        Update: {
          created_at?: string | null
          daily_tap_reminder?: boolean | null
          deposit_approved?: boolean | null
          id?: string
          new_follower?: boolean | null
          post_comments?: boolean | null
          post_likes?: boolean | null
          referral_signup?: boolean | null
          streak_reminder?: boolean | null
          updated_at?: string | null
          user_id?: string
          withdrawal_completed?: boolean | null
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
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          short_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          short_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          short_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          followers_count: number | null
          following_count: number | null
          id: string
          phone: string | null
          posts_count: number | null
          referral_code: string | null
          referral_earnings: number | null
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
          followers_count?: number | null
          following_count?: number | null
          id: string
          phone?: string | null
          posts_count?: number | null
          referral_code?: string | null
          referral_earnings?: number | null
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
          followers_count?: number | null
          following_count?: number | null
          id?: string
          phone?: string | null
          posts_count?: number | null
          referral_code?: string | null
          referral_earnings?: number | null
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
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
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
      referrals: {
        Row: {
          bonus_amount: number | null
          completed_at: string | null
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          bonus_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          bonus_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      shorts: {
        Row: {
          comments_count: number | null
          content: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          poll_options: Json | null
          shares_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          poll_options?: Json | null
          shares_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          poll_options?: Json | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shorts_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          short_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          short_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          short_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shorts_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shorts_comments_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_likes: {
        Row: {
          created_at: string | null
          id: string
          short_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          short_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          short_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_likes_short_id_fkey"
            columns: ["short_id"]
            isOneToOne: false
            referencedRelation: "shorts"
            referencedColumns: ["id"]
          },
        ]
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
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_tap_date: string | null
          longest_streak: number | null
          streak_multiplier: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_tap_date?: string | null
          longest_streak?: number | null
          streak_multiplier?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_tap_date?: string | null
          longest_streak?: number | null
          streak_multiplier?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          payment_reference: string | null
          payment_screenshot_url: string | null
          price: number
          starts_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          payment_screenshot_url?: string | null
          price?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          payment_screenshot_url?: string | null
          price?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
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
      leaderboard: {
        Row: {
          avatar_url: string | null
          current_streak: number | null
          display_name: string | null
          followers_count: number | null
          id: string | null
          longest_streak: number | null
          referral_earnings: number | null
          total_earned: number | null
          username: string | null
          weekly_earnings: number | null
          weekly_taps: number | null
        }
        Relationships: []
      }
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
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      update_user_streak: { Args: { _user_id: string }; Returns: Json }
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
