export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          id_first_four: string | null
          mobile: string | null
          role: 'student' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          id_first_four?: string | null
          mobile?: string | null
          role?: 'student' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          id_first_four?: string | null
          mobile?: string | null
          role?: 'student' | 'admin'
          updated_at?: string
        }
      }
      token_packages: {
        Row: {
          id: string
          name: string
          description: string
          token_count: number
          price: number
          validity_days: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          token_count: number
          price: number
          validity_days: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          token_count?: number
          price?: number
          validity_days?: number
          is_active?: boolean
        }
      }
      user_tokens: {
        Row: {
          id: string
          user_id: string
          remaining_tokens: number
          total_tokens: number
          expiry_date: string
          purchase_date: string
          order_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          remaining_tokens: number
          total_tokens: number
          expiry_date: string
          purchase_date?: string
          order_id?: string | null
          created_at?: string
        }
        Update: {
          remaining_tokens?: number
          expiry_date?: string
        }
      }
      coupons: {
        Row: {
          id: string
          code: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          quantity: number
          used_count: number
          valid_from: string
          valid_until: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: 'percentage' | 'fixed'
          discount_value: number
          quantity: number
          used_count?: number
          valid_from: string
          valid_until: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          is_active?: boolean
          used_count?: number
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          package_id: string
          quantity: number
          subtotal: number
          discount: number
          total: number
          coupon_id: string | null
          payment_status: 'pending' | 'paid' | 'failed' | 'not_required'
          payment_method: 'credit_card' | 'fps' | 'cash'
          payment_slip_url: string | null
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          quantity?: number
          subtotal: number
          discount?: number
          total: number
          coupon_id?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'not_required'
          payment_method: 'credit_card' | 'fps' | 'cash'
          payment_slip_url?: string | null
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          payment_status?: 'pending' | 'paid' | 'failed' | 'not_required'
          paid_at?: string | null
        }
      }
      trial_lessons: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          price?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          price?: number
          is_active?: boolean
        }
      }
      trial_applications: {
        Row: {
          id: string
          user_id: string
          trial_lesson_id: string
          status: 'pending' | 'approved' | 'rejected'
          payment_status: 'pending' | 'paid' | 'failed' | 'not_required'
          approved_by: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          trial_lesson_id: string
          status?: 'pending' | 'approved' | 'rejected'
          payment_status?: 'pending' | 'paid' | 'failed' | 'not_required'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          payment_status?: 'pending' | 'paid' | 'failed' | 'not_required'
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          description: string
          instructor: string
          start_time: string
          end_time: string
          capacity: number
          enrolled_count: number
          is_internal: boolean
          is_cancelled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          instructor?: string
          start_time: string
          end_time: string
          capacity: number
          enrolled_count?: number
          is_internal?: boolean
          is_cancelled?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          description?: string
          instructor?: string
          start_time?: string
          end_time?: string
          capacity?: number
          enrolled_count?: number
          is_cancelled?: boolean
        }
      }
      class_enrollments: {
        Row: {
          id: string
          class_id: string
          user_id: string
          user_token_id: string | null
          status: 'enrolled' | 'attended' | 'absent' | 'sick_leave'
          check_in_time: string | null
          check_out_time: string | null
          sick_leave_document_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          class_id: string
          user_id: string
          user_token_id?: string | null
          status?: 'enrolled' | 'attended' | 'absent' | 'sick_leave'
          check_in_time?: string | null
          check_out_time?: string | null
          sick_leave_document_url?: string | null
          created_at?: string
        }
        Update: {
          status?: 'enrolled' | 'attended' | 'absent' | 'sick_leave'
          check_in_time?: string | null
          check_out_time?: string | null
          sick_leave_document_url?: string | null
        }
      }
      extension_requests: {
        Row: {
          id: string
          user_id: string
          user_token_id: string
          reason: string
          status: 'pending' | 'approved' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_token_id: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
        }
      }
      news_posts: {
        Row: {
          id: string
          title: string
          content: string
          image_url: string | null
          published: boolean
          published_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          title?: string
          content?: string
          image_url?: string | null
          published?: boolean
          published_at?: string | null
        }
      }
      site_content: {
        Row: {
          id: string
          page_key: string
          title: string
          content: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          page_key: string
          title: string
          content: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          title?: string
          content?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      holidays: {
        Row: {
          id: string
          name: string
          date: string
          description: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          date: string
          description?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          name?: string
          date?: string
          description?: string | null
        }
      }
    }
  }
}
