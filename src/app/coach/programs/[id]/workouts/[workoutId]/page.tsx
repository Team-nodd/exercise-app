import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { EditWorkoutForm } from "@/components/coach/edit-workout-form"

interface EditWorkoutPageProps {
  params: Promise<{
    id: string
    workoutId: string
  }>
}

export default async function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const supabase = await createServerClient()
  const { id, workoutId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify program exists and coach owns it
  const { data: program } = await supabase
    .from("programs")
    .select(`
      *,
      user:users!programs_user_id_fkey(*)
    `)
    .eq("id", id)
    .eq("coach_id", user.id)
    .single()

  if (!program) {
    notFound()
  }

  // Get workout with exercises
  const { data: workout } = await supabase
    .from("workouts")
    .select(`
      *,
      program:programs(*)
    `)
    .eq("id", workoutId)
    .eq("program_id", id)
    .single()

  if (!workout) {
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

  return <EditWorkoutForm program={program} workout={workout} initialExercises={workoutExercises || []} />
}
