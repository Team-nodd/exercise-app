import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CoachDashboard } from "@/components/coach/coach-dashboard"

export default async function CoachDashboardPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify coach role
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (profile?.role !== "coach") {
    redirect("/dashboard")
  }

  return <CoachDashboard coach={profile} />
}
