import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { EditWorkoutForm } from "@/components/coach/edit-workout-form"

interface CoachWorkoutPageProps {
  params: Promise<{
    workoutId: string
  }>
}

export default async function CoachWorkoutPage({ params }: CoachWorkoutPageProps) {
  const supabase = await createServerClient()
  const { workoutId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get workout with program details
  const { data: workout } = await supabase
    .from("workouts")
    .select(`
      *,
      program:programs(
        *,
        user:users!programs_user_id_fkey(*)
      )
    `)
    .eq("id", workoutId)
    .single()

  if (!workout) {
    notFound()
  }

  // Verify coach owns the program
  if (workout.program.coach_id !== user.id) {
    notFound()
  }

  // Get workout exercises
  const { data: workoutExercises } = await supabase
    .from("workout_exercises")
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq("workout_id", workoutId)
    .order("order_in_workout", { ascending: true })

  return <EditWorkoutForm program={workout.program} workout={workout} initialExercises={workoutExercises || []} />
} 