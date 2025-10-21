export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      admin_users: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_users: {
        Row: {
          admin_notes: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          registration_data: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          registration_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          registration_data?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          contact_email: string
          contact_phone: string
          created_at: string
          deleted_at: string | null
          id: string
          location: string
          logo_url: string | null
          name: string
          regional_settings: Json
          status: string
          subscription_plan_id: string | null
          updated_at: string
        }
        Insert: {
          contact_email: string
          contact_phone: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location: string
          logo_url?: string | null
          name: string
          regional_settings?: Json
          status?: string
          subscription_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string
          contact_phone?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string
          logo_url?: string | null
          name?: string
          regional_settings?: Json
          status?: string
          subscription_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      residences: {
        Row: {
          created_at: string
          floor_area: number
          id: string
          lot_area: number | null
          max_occupancy: number
          tenant_id: string
          type: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor_area: number
          id?: string
          lot_area?: number | null
          max_occupancy: number
          tenant_id: string
          type: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor_area?: number
          id?: string
          lot_area?: number | null
          max_occupancy?: number
          tenant_id?: string
          type?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      gates: {
        Row: {
          created_at: string
          description: string | null
          hardware_settings: Json
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          operating_hours: Json
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hardware_settings?: Json
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          operating_hours?: Json
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hardware_settings?: Json
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          operating_hours?: Json
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          max_admins: number
          max_gates: number
          max_residences: number
          name: string
          price_monthly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          max_admins: number
          max_gates: number
          max_residences: number
          name: string
          price_monthly: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          max_admins: number
          max_gates: number
          max_residences: number
          name?: string
          price_monthly: number
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown | null
          superadmin_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown | null
          superadmin_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          superadmin_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      community_stats: {
        Row: {
          breakdown: Json | null
          count: number | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_users_with_email: {
        Args: { p_tenant_id: string }
        Returns: {
          id: string
          tenant_id: string
          email: string
          role: string
          status: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }[]
      }
      get_admin_user_with_email: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          tenant_id: string
          email: string
          role: string
          status: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }[]
      }
      suspend_community: {
        Args: { community_id: string }
        Returns: void
      }
      reactivate_community: {
        Args: { community_id: string }
        Returns: void
      }
      soft_delete_community: {
        Args: { community_id: string }
        Returns: void
      }
    }
  }
}
