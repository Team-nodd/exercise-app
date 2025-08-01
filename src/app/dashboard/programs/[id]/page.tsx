import { UserProgramDetail } from "@/components/programs/user-program-detail"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
// import { UserProgramDetail } from "@/components/programs/user-program-detail"

export default async function UserProgramDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createServerClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Get program with details
  const { data: program, error } = await supabase
    .from("programs")
    .select(`
      *,
      coach:users!programs_coach_id_fkey(*),
      user:users!programs_user_id_fkey(*),
      workouts(
        *,
        workout_exercises(
          *,
          exercise:exercises(*)
        )
      )
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !program) {
    redirect("/dashboard/programs")
  }

  return <UserProgramDetail program={program} />
}
