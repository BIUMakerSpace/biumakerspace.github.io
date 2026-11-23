export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_name: string;
          content: string;
          cover_image_url: string | null;
          created_at: string;
          id: string;
          slug: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name?: string;
          content: string;
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          slug: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          content?: string;
          cover_image_url?: string | null;
          created_at?: string;
          id?: string;
          slug?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      catalog_item_sources: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          quantity: number;
          source_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          quantity?: number;
          source_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          quantity?: number;
          source_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catalog_item_sources_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catalog_item_sources_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "item_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_items: {
        Row: {
          archived_at: string | null;
          category: string;
          created_at: string;
          description: string | null;
          general_category: string;
          id: string;
          image_url: string | null;
          name: string;
          quantity_available: number;
          quantity_total: number;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          general_category?: string;
          id?: string;
          image_url?: string | null;
          name: string;
          quantity_available?: number;
          quantity_total?: number;
        };
        Update: {
          archived_at?: string | null;
          category?: string;
          created_at?: string;
          description?: string | null;
          general_category?: string;
          id?: string;
          image_url?: string | null;
          name?: string;
          quantity_available?: number;
          quantity_total?: number;
        };
        Relationships: [];
      };
      email_templates: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          key: string;
          label: string;
          subject: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          key: string;
          label: string;
          subject?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          key?: string;
          label?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      filament_colors: {
        Row: {
          created_at: string;
          hex: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hex?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hex?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      forum_questions: {
        Row: {
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name?: string;
          body: string;
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      forum_replies: {
        Row: {
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          question_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_name?: string;
          body: string;
          created_at?: string;
          id?: string;
          question_id: string;
          user_id: string;
        };
        Update: {
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forum_replies_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "forum_questions";
            referencedColumns: ["id"];
          },
        ];
      };
      item_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          description: string | null;
          id: string;
          item_name: string;
          reference_link: string | null;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          item_name: string;
          reference_link?: string | null;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          item_name?: string;
          reference_link?: string | null;
          requester_email?: string;
          requester_name?: string;
          requester_phone?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      item_sources: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      lend_request_item_sources: {
        Row: {
          created_at: string;
          id: string;
          lend_request_item_id: string;
          quantity: number;
          source_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          lend_request_item_id: string;
          quantity: number;
          source_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lend_request_item_id?: string;
          quantity?: number;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lend_request_item_sources_lend_request_item_id_fkey";
            columns: ["lend_request_item_id"];
            isOneToOne: false;
            referencedRelation: "lend_request_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lend_request_item_sources_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "item_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      lend_request_items: {
        Row: {
          id: string;
          item_id: string;
          quantity: number;
          request_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          item_id: string;
          quantity?: number;
          request_id: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          quantity?: number;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lend_request_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lend_request_items_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "lend_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      lend_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          delivered_at: string | null;
          id: string;
          notes: string | null;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          returned_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          notes?: string | null;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          returned_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          notes?: string | null;
          requester_email?: string;
          requester_name?: string;
          requester_phone?: string;
          returned_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      lockers: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          number: number;
          occupant_email: string | null;
          occupant_name: string | null;
          occupied_at: string | null;
          occupied_by: string | null;
          pin_code: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          number: number;
          occupant_email?: string | null;
          occupant_name?: string | null;
          occupied_at?: string | null;
          occupied_by?: string | null;
          pin_code?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          number?: number;
          occupant_email?: string | null;
          occupant_name?: string | null;
          occupied_at?: string | null;
          occupied_by?: string | null;
          pin_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      print_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string;
          filament_color: string;
          id: string;
          purpose: string;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          status: string;
          stl_file_name: string;
          stl_file_path: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          admin_notes?: string | null;
          created_at?: string;
          filament_color: string;
          id?: string;
          purpose: string;
          requester_email: string;
          requester_name: string;
          requester_phone: string;
          status?: string;
          stl_file_name: string;
          stl_file_path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string;
          filament_color?: string;
          id?: string;
          purpose?: string;
          requester_email?: string;
          requester_name?: string;
          requester_phone?: string;
          status?: string;
          stl_file_name?: string;
          stl_file_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          estimated_cost: number | null;
          id: string;
          link: string | null;
          name: string;
          quantity_pref: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          link?: string | null;
          name: string;
          quantity_pref?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          link?: string | null;
          name?: string;
          quantity_pref?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      lockers_status: {
        Row: {
          id: string | null;
          is_occupied: boolean | null;
          label: string | null;
          number: number | null;
          occupied_at: string | null;
          occupied_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          id?: string | null;
          is_occupied?: never;
          label?: string | null;
          number?: number | null;
          occupied_at?: string | null;
          occupied_by?: string | null;
        };
        Update: {
          id?: string | null;
          is_occupied?: never;
          label?: string | null;
          number?: number | null;
          occupied_at?: string | null;
          occupied_by?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _insert_lend_request: {
        Args: {
          p_items: Json;
          p_notes: string;
          p_requester_email: string;
          p_requester_name: string;
          p_requester_phone: string;
          p_status: string;
          p_user_id: string;
        };
        Returns: string;
      };
      admin_add_catalog_items: { Args: { p_items: Json }; Returns: string[] };
      admin_create_lend_request: {
        Args: { p_items: Json; p_notes: string; p_user_id: string };
        Returns: string;
      };
      admin_list_lockers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          label: string | null;
          number: number;
          occupant_email: string | null;
          occupant_name: string | null;
          occupied_at: string | null;
          occupied_by: string | null;
          pin_code: string | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "lockers";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_locker: {
        Args: { p_number: number; p_pin: string };
        Returns: {
          created_at: string;
          id: string;
          label: string | null;
          number: number;
          occupant_email: string | null;
          occupant_name: string | null;
          occupied_at: string | null;
          occupied_by: string | null;
          pin_code: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "lockers";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_lend_request: {
        Args: {
          p_items: Json;
          p_notes: string;
          p_requester_email: string;
          p_requester_name: string;
          p_requester_phone: string;
        };
        Returns: string;
      };
      deliver_lend_request: { Args: { p_items: Json; p_request_id: string }; Returns: undefined };
      ensure_item_source: { Args: { p_name: string }; Returns: string };
      general_category_for: { Args: { p_category: string }; Returns: string };
      get_my_locker: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          label: string | null;
          number: number;
          occupant_email: string | null;
          occupant_name: string | null;
          occupied_at: string | null;
          occupied_by: string | null;
          pin_code: string | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "lockers";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string };
        Returns: boolean;
      };
      is_api_role: { Args: Record<PropertyKey, never>; Returns: boolean };
      recompute_catalog_item_quantities: { Args: { p_item_id: string }; Returns: undefined };
      return_lend_request: {
        Args: { p_overrides?: Json; p_request_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
