export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: "coach" | "user"
          created_at: string
          updated_at: string
          // Notification settings
          workout_completed_email: boolean
          program_assigned_email: boolean
          weekly_progress_email: boolean
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: "coach" | "user"
          created_at?: string
          updated_at?: string
          // Notification settings
          workout_completed_email?: boolean
          program_assigned_email?: boolean
          weekly_progress_email?: boolean
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: "coach" | "user"
          created_at?: string
          updated_at?: string
          // Notification settings
          workout_completed_email?: boolean
          program_assigned_email?: boolean
          weekly_progress_email?: boolean
        }
      }
      exercises: {
        Row: {
          id: number
          name: string
          category: string | null
          muscle_groups: string[] // Array of muscle group names
          equipment: string | null
          instructions: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          category?: string | null
          equipment?: string | null
          instructions?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          category?: string | null
          equipment?: string | null
          instructions?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cardio_exercises: {
        Row: {
          id: number
          name: string
          intensity_type: string | null
          duration_minutes: number | null
          target_tss: number | null
          target_ftp: number | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          intensity_type?: string | null
          duration_minutes?: number | null
          target_tss?: number | null
          target_ftp?: number | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          intensity_type?: string | null
          duration_minutes?: number | null
          target_tss?: number | null
          target_ftp?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: number
          name: string
          description: string | null
          coach_id: string
          user_id: string
          start_date: string | null
          end_date: string | null
          status: "draft" | "active" | "completed" | "paused"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          coach_id: string
          user_id: string
          start_date?: string | null
          end_date?: string | null
          status?: "draft" | "active" | "completed" | "paused"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          coach_id?: string
          user_id?: string
          start_date?: string | null
          end_date?: string | null
          status?: "draft" | "active" | "completed" | "paused"
          created_at?: string
          updated_at?: string
        }
      }
      workouts: {
        Row: {
          id: number
          program_id: number
          user_id: string
          name: string
          workout_type: "gym" | "cardio"
          scheduled_date: string | null
          order_in_program: number
          intensity_type: string | null
          duration_minutes: number | null
          target_tss: number | null
          target_ftp: number | null
          notes: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          program_id: number
          user_id: string
          name: string
          workout_type: "gym" | "cardio"
          scheduled_date?: string | null
          order_in_program?: number
          intensity_type?: string | null
          duration_minutes?: number | null
          target_tss?: number | null
          target_ftp?: number | null
          notes?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          program_id?: number
          user_id?: string
          name?: string
          workout_type?: "gym" | "cardio"
          scheduled_date?: string | null
          order_in_program?: number
          intensity_type?: string | null
          duration_minutes?: number | null
          target_tss?: number | null
          target_ftp?: number | null
          notes?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workout_exercises: {
        Row: {
          id: number
          workout_id: number
          exercise_id: number
          order_in_workout: number
          sets: number
          reps: number
          weight: string | null
          rest_seconds: number
          volume_level: "low" | "moderate" | "high"
          completed: boolean
          actual_sets: number | null
          actual_reps: number | null
          actual_weight: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          workout_id: number
          exercise_id: number
          order_in_workout?: number
          sets: number
          reps: number
          weight?: string | null
          rest_seconds?: number
          volume_level?: "low" | "moderate" | "high"
          completed?: boolean
          actual_sets?: number | null
          actual_reps?: number | null
          actual_weight?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          workout_id?: number
          exercise_id?: number
          order_in_workout?: number
          sets?: number
          reps?: number
          weight?: string | null
          rest_seconds?: number
          volume_level?: "low" | "moderate" | "high"
          completed?: boolean
          actual_sets?: number | null
          actual_reps?: number | null
          actual_weight?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: string
          related_id: string | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: string
          related_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string | null
          type?: string
          related_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: number
          user_id: string
          workout_id: number | null
          workout_exercise_id: number | null
          comment_text: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          workout_id?: number | null
          workout_exercise_id?: number | null
          comment_text: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          workout_id?: number | null
          workout_exercise_id?: number | null
          comment_text?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
