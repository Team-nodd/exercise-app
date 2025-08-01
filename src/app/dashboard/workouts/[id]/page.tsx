import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { WorkoutDetail } from "@/components/workouts/workout-detail"

interface WorkoutPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const supabase = await createServerClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <WorkoutDetail workoutId={id} userId={user.id} />
}
