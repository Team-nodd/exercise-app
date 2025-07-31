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
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: "coach" | "user"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: "coach" | "user"
          created_at?: string
          updated_at?: string
        }
      }
      exercises: {
        Row: {
          id: number
          name: string
          category: string | null
          equipment: string | null
          instructions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          category?: string | null
          equipment?: string | null
          instructions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          category?: string | null
          equipment?: string | null
          instructions?: string | null
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
