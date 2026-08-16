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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          body: string
          created_at: string
          from_admin: boolean
          id: string
          project_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          from_admin?: boolean
          id?: string
          project_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          project_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          avatar_url: string | null
          bio: string | null
          color: string
          created_at: string
          created_by: string | null
          id: string
          moods: Json
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          moods?: Json
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          moods?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          color: string
          coming_soon: boolean
          cover_url: string | null
          created_at: string
          emoji: string
          highlights: Json
          id: string
          is_paid: boolean
          order_index: number
          price: number
          slug: string
          status: Database["public"]["Enums"]["lesson_status"]
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          coming_soon?: boolean
          cover_url?: string | null
          created_at?: string
          emoji?: string
          highlights?: Json
          id?: string
          is_paid?: boolean
          order_index?: number
          price?: number
          slug: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          coming_soon?: boolean
          cover_url?: string | null
          created_at?: string
          emoji?: string
          highlights?: Json
          id?: string
          is_paid?: boolean
          order_index?: number
          price?: number
          slug?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_threads: {
        Row: {
          attachments: Json
          author_id: string
          body: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          id: string
          investor_id: string
          project_id: string
          share_pct: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investor_id: string
          project_id: string
          share_pct?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investor_id?: string
          project_id?: string
          share_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_steps: {
        Row: {
          admin_note: string | null
          character_id: string | null
          content: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["step_kind"]
          lesson_id: string
          media_url: string | null
          mood: string
          options: Json | null
          order_index: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          character_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["step_kind"]
          lesson_id: string
          media_url?: string | null
          mood?: string
          options?: Json | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          character_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["step_kind"]
          lesson_id?: string
          media_url?: string | null
          mood?: string
          options?: Json | null
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_steps_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          intro_text: string | null
          objectives: Json
          order_index: number
          status: Database["public"]["Enums"]["lesson_status"]
          summary_points: Json
          title: string
          unit: number
          updated_at: string
          xp_reward: number
        }
        Insert: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intro_text?: string | null
          objectives?: Json
          order_index?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          summary_points?: Json
          title: string
          unit?: number
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intro_text?: string | null
          objectives?: Json
          order_index?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          summary_points?: Json
          title?: string
          unit?: number
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          gems: number
          hearts: number
          hearts_updated_at: string
          id: string
          last_active_date: string | null
          status: Database["public"]["Enums"]["account_status"]
          status_reason: string | null
          streak: number
          streak_freeze: number
          suspended_until: string | null
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gems?: number
          hearts?: number
          hearts_updated_at?: string
          id: string
          last_active_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          status_reason?: string | null
          streak?: number
          streak_freeze?: number
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gems?: number
          hearts?: number
          hearts_updated_at?: string
          id?: string
          last_active_date?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          status_reason?: string | null
          streak?: number
          streak_freeze?: number
          suspended_until?: string | null
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          created_at: string
          file_url: string
          filename: string | null
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          filename?: string | null
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          filename?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_inquiries: {
        Row: {
          body: string
          created_at: string
          id: string
          project_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          project_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          project_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_inquiries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_investments: {
        Row: {
          amount: number
          created_at: string
          id: string
          investor_id: string
          project_id: string
          share_pct: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investor_id: string
          project_id: string
          share_pct?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investor_id?: string
          project_id?: string
          share_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          attachments: Json
          body: string
          channel: Database["public"]["Enums"]["project_channel"]
          created_at: string
          id: string
          project_id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          channel?: Database["public"]["Enums"]["project_channel"]
          created_at?: string
          id?: string
          project_id: string
          sender_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          channel?: Database["public"]["Enums"]["project_channel"]
          created_at?: string
          id?: string
          project_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string
          id: string
          owner_id: string
          owner_share: number
          platform_share: number
          public_slug: string | null
          raised_amount: number
          stage: Database["public"]["Enums"]["project_stage"]
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description: string
          id?: string
          owner_id: string
          owner_share?: number
          platform_share?: number
          public_slug?: string | null
          raised_amount?: number
          stage?: Database["public"]["Enums"]["project_stage"]
          target_amount?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          owner_id?: string
          owner_share?: number
          platform_share?: number
          public_slug?: string | null
          raised_amount?: number
          stage?: Database["public"]["Enums"]["project_stage"]
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          color: string
          course_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          emoji: string
          id: string
          name: string
          number: number
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          name: string
          number: number
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          name?: string
          number?: number
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      account_status: "active" | "suspended" | "banned"
      app_role: "admin" | "user"
      lesson_status: "draft" | "published" | "archived"
      project_channel: "team" | "parents" | "admin"
      project_stage: "idea" | "review" | "funding" | "funded" | "rejected"
      step_kind: "text" | "image" | "video" | "question"
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
      account_status: ["active", "suspended", "banned"],
      app_role: ["admin", "user"],
      lesson_status: ["draft", "published", "archived"],
      project_channel: ["team", "parents", "admin"],
      project_stage: ["idea", "review", "funding", "funded", "rejected"],
      step_kind: ["text", "image", "video", "question"],
    },
  },
} as const
