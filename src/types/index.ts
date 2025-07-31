import type { Database } from "./database"

export type User = Database["public"]["Tables"]["users"]["Row"]
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"]
export type Program = Database["public"]["Tables"]["programs"]["Row"]
export type Workout = Database["public"]["Tables"]["workouts"]["Row"]
export type WorkoutExercise = Database["public"]["Tables"]["workout_exercises"]["Row"]

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
}
