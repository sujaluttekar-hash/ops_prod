export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          location: string | null
          status: 'occupied' | 'partial' | 'vacant'
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          status?: 'occupied' | 'partial' | 'vacant'
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          status?: 'occupied' | 'partial' | 'vacant'
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string
          role: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
          squad: string | null
          property_id: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          name?: string | null
          email: string
          role?: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
          squad?: string | null
          property_id?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          role?: 'super_admin' | 'ops_manager' | 'butler' | 'trainer'
          squad?: string | null
          property_id?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }
      guest_delights: {
        Row: {
          id: string
          your_name: string
          squad: string | null
          booking_date: string
          booking_id: string | null
          villa_name: string
          booking_type: string
          status: 'pending' | 'completed' | 'overdue'
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          your_name: string
          squad?: string | null
          booking_date: string
          booking_id?: string | null
          villa_name: string
          booking_type: string
          status?: 'pending' | 'completed' | 'overdue'
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          your_name?: string
          squad?: string | null
          booking_date?: string
          booking_id?: string | null
          villa_name?: string
          booking_type?: string
          status?: 'pending' | 'completed' | 'overdue'
          notes?: string | null
          created_by?: string | null
        }
      }
      delight_photos: {
        Row: {
          id: string
          delight_id: string
          pointer_key: string
          storage_path: string
          public_url: string | null
          captured_at: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          delight_id: string
          pointer_key: string
          storage_path: string
          public_url?: string | null
          captured_at?: string | null
          uploaded_at?: string
        }
        Update: {
          public_url?: string | null
          captured_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          type: string
          property_id: string | null
          butler_id: string | null
          status: 'pending' | 'completed' | 'delayed'
          due_time: string | null
          completed_at: string | null
          photo_path: string | null
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          type: string
          property_id?: string | null
          butler_id?: string | null
          status?: 'pending' | 'completed' | 'delayed'
          due_time?: string | null
          completed_at?: string | null
          photo_path?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          type?: string
          property_id?: string | null
          butler_id?: string | null
          status?: 'pending' | 'completed' | 'delayed'
          due_time?: string | null
          completed_at?: string | null
          photo_path?: string | null
          notes?: string | null
          updated_at?: string | null
        }
      }
      huddles: {
        Row: {
          id: string
          team: string
          huddle_date: string
          time: string | null
          participants_expected: number
          status: 'scheduled' | 'tbc' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team: string
          huddle_date: string
          time?: string | null
          participants_expected?: number
          status?: 'scheduled' | 'tbc' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          team?: string
          huddle_date?: string
          time?: string | null
          status?: 'scheduled' | 'tbc' | 'completed' | 'cancelled'
          notes?: string | null
        }
      }
      trainings: {
        Row: {
          id: string
          name: string
          training_date: string | null
          type: 'Functional' | 'Mandatory'
          total_seats: number
          status: 'planned' | 'upcoming' | 'completed'
          has_quiz: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          training_date?: string | null
          type?: 'Functional' | 'Mandatory'
          total_seats?: number
          status?: 'planned' | 'upcoming' | 'completed'
          has_quiz?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          training_date?: string | null
          type?: 'Functional' | 'Mandatory'
          total_seats?: number
          status?: 'planned' | 'upcoming' | 'completed'
          has_quiz?: boolean
        }
      }
      quizzes: {
        Row: {
          id: string
          training_id: string
          title: string
          created_at: string
        }
        Insert: {
          id?: string
          training_id: string
          title: string
          created_at?: string
        }
        Update: {
          title?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_id: string
          question: string
          type: 'mcq' | 'true_false' | 'short'
          options: Json | null
          correct_answer: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question: string
          type: 'mcq' | 'true_false' | 'short'
          options?: Json | null
          correct_answer: string
          created_at?: string
        }
        Update: {
          question?: string
          options?: Json | null
          correct_answer?: string
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          butler_id: string
          quiz_id: string
          score: number
          passed: boolean
          attempted_at: string
        }
        Insert: {
          id?: string
          butler_id: string
          quiz_id: string
          score: number
          passed: boolean
          attempted_at?: string
        }
        Update: {
          score?: number
          passed?: boolean
        }
      }
      rosters: {
        Row: {
          id: string
          butler_id: string
          date: string
          shift: 'morning' | 'afternoon' | 'evening' | 'night'
          assigned_property: string | null
          status: 'scheduled' | 'completed' | 'absent'
          created_at: string
        }
        Insert: {
          id?: string
          butler_id: string
          date: string
          shift: 'morning' | 'afternoon' | 'evening' | 'night'
          assigned_property?: string | null
          status?: 'scheduled' | 'completed' | 'absent'
          created_at?: string
        }
        Update: {
          assigned_property?: string | null
          status?: 'scheduled' | 'completed' | 'absent'
        }
      }
      shift_swaps: {
        Row: {
          id: string
          requested_by: string
          swap_with: string
          original_date: string
          swap_date: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          requested_by: string
          swap_with: string
          original_date: string
          swap_date: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
        }
      }
      credentials: {
        Row: {
          id: string
          name: string
          type: string
          property: string
          value: string
          expiry: string | null
          expiry_warning: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          property: string
          value: string
          expiry?: string | null
          expiry_warning?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          type?: string
          property?: string
          value?: string
          expiry?: string | null
          expiry_warning?: boolean
        }
      }
      credential_access_log: {
        Row: {
          id: string
          credential_id: string
          accessed_by: string
          action: 'view' | 'copy'
          accessed_at: string
        }
        Insert: {
          id?: string
          credential_id: string
          accessed_by: string
          action: 'view' | 'copy'
          accessed_at?: string
        }
        Update: {}
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'success' | 'error'
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'warning' | 'success' | 'error'
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {}
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
