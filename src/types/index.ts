import type { Database } from "./database"

export type User = Database["public"]["Tables"]["users"]["Row"]
export interface Exercise {
  id: number
  name: string
  category: string | null
  muscle_groups: string[]
  equipment: string | null
  instructions: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}
export type Program = Database["public"]["Tables"]["programs"]["Row"]
export type Workout = Database["public"]["Tables"]["workouts"]["Row"]
export type WorkoutExercise = Database["public"]["Tables"]["workout_exercises"]["Row"]
export type CardioExercise = Database["public"]["Tables"]["cardio_exercises"]["Row"]

export interface ProgramWithDetails extends Program {
  coach: User
  user: User
  workouts?: WorkoutWithDetails[]
}

export interface WorkoutWithDetails extends Workout {
  program: Program
  exercises?: WorkoutExerciseWithDetails[]
}

export interface WorkoutExerciseWithDetails extends WorkoutExercise {
  exercise: Exercise
}

export interface DashboardStats {
  totalPrograms: number
  activePrograms: number
  completedWorkouts: number
  upcomingWorkouts: number
  totalClients: number
}

export interface Comment {
  id: number
  user_id: string
  workout_id: number | null
  workout_exercise_id: number | null
  comment_text: string
  created_at: string
  user?: {
    id: string
    name: string
    role: "coach" | "user"
  }
}
