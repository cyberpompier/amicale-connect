// Types de la base de données Supabase
// À remplacer par les types générés via `supabase gen types typescript`

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
export type TransactionType = 'income' | 'expense'
export type CotisationStatus = 'paid' | 'pending' | 'overdue'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      associations: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          postal_code: string | null
          phone: string | null
          email: string | null
          logo_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: SubscriptionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: SubscriptionStatus
        }
        Update: {
          name?: string
          address?: string | null
          city?: string | null
          postal_code?: string | null
          phone?: string | null
          email?: string | null
          logo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: SubscriptionStatus
        }
      }
      association_members: {
        Row: {
          id: string
          user_id: string
          association_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          association_id: string
          role?: UserRole
        }
        Update: {
          role?: UserRole
        }
      }
      amicalistes: {
        Row: {
          id: string
          association_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          grade: string | null
          status: string
          join_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          association_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          grade?: string | null
          status?: string
          join_date?: string
          notes?: string | null
        }
        Update: {
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          grade?: string | null
          status?: string
          join_date?: string
          notes?: string | null
        }
      }
      cotisations: {
        Row: {
          id: string
          association_id: string
          amicaliste_id: string
          year: number
          amount: number
          status: CotisationStatus
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          association_id: string
          amicaliste_id: string
          year: number
          amount: number
          status?: CotisationStatus
          paid_at?: string | null
        }
        Update: {
          amicaliste_id?: string
          year?: number
          amount?: number
          status?: CotisationStatus
          paid_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          association_id: string
          name: string
          type: TransactionType
          created_at: string
        }
        Insert: {
          id?: string
          association_id: string
          name: string
          type: TransactionType
        }
        Update: {
          name?: string
          type?: TransactionType
        }
      }
      transactions: {
        Row: {
          id: string
          association_id: string
          category_id: string | null
          type: TransactionType
          amount: number
          description: string
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          association_id: string
          category_id?: string | null
          type: TransactionType
          amount: number
          description: string
          date: string
        }
        Update: {
          category_id?: string | null
          type?: TransactionType
          amount?: number
          description?: string
          date?: string
        }
      }
      bureau_positions: {
        Row: {
          id: string
          association_id: string
          amicaliste_id: string
          position: string
          start_date: string
          end_date: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          association_id: string
          amicaliste_id: string
          position: string
          start_date: string
          end_date?: string | null
          is_current?: boolean
        }
        Update: {
          amicaliste_id?: string
          position?: string
          start_date?: string
          end_date?: string | null
          is_current?: boolean
        }
      }
      evenements: {
        Row: {
          id: string
          association_id: string
          title: string
          description: string | null
          location: string | null
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          association_id: string
          title: string
          description?: string | null
          location?: string | null
          start_date: string
          end_date?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          location?: string | null
          start_date?: string
          end_date?: string | null
        }
      }
      evenement_participants: {
        Row: {
          id: string
          evenement_id: string
          amicaliste_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          evenement_id: string
          amicaliste_id: string
          status?: string
        }
        Update: {
          status?: string
        }
      }
    }
    Functions: {
      get_user_association_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
  }
}
