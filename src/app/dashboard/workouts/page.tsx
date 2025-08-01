import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserWorkouts } from "@/components/workouts/user-workouts"

export default async function UserWorkoutsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <UserWorkouts userId={user.id} />
}
