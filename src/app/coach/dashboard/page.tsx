import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CoachDashboard } from "@/components/coach/coach-dashboard"

export default async function CoachDashboardPage() {
  console.log("🔄 COACH DASHBOARD PAGE: Loading...")

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("👤 COACH DASHBOARD PAGE: User:", user?.id || "No user")

  if (!user) {
    console.log("🚫 COACH DASHBOARD PAGE: No user, redirecting to login")
    redirect("/auth/login")
  }

  // Get user profile
  console.log("🔄 COACH DASHBOARD PAGE: Fetching profile...")
  const { data: profile, error } = await supabase.from("users").select("*").eq("id", user.id).single()

  console.log("👤 COACH DASHBOARD PAGE: Profile:", profile?.name || "No profile", "Error:", error?.message || "None")

  if (!profile) {
    console.log("🚫 COACH DASHBOARD PAGE: No profile, redirecting to login")
    redirect("/auth/login")
  }

  if (profile.role === "user") {
    console.log("🔄 COACH DASHBOARD PAGE: User account, redirecting to user dashboard")
    redirect("/dashboard")
  }

  // Prefetch workouts once, compute stats here
  const { data: programs } = await supabase
    .from("programs")
    .select(`id, status, user_id, workouts(id, completed, scheduled_date)`)
    .eq("coach_id", user.id)

  const totalPrograms = programs?.length ?? 0
  const activePrograms = (programs ?? []).filter(p => p.status === "active").length
  const totalClients = new Set((programs ?? []).map(p => p.user_id)).size
  const allWorkouts = (programs ?? []).flatMap(p => p.workouts || [])
  const completedWorkouts = allWorkouts.filter(w => w.completed).length
  const today = new Date()
  const upcomingWorkouts = allWorkouts.filter(w => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today).length
  const initialStats = { totalPrograms, activePrograms, completedWorkouts, upcomingWorkouts, totalClients }

  // Optionally fetch recent clients
  let initialRecentClients = []
  const clientIds = [...new Set((programs ?? []).map(p => p.user_id))].slice(0, 5)
  if (clientIds.length) {
    const { data } = await supabase.from("users").select("*").in("id", clientIds).limit(5)
    initialRecentClients = data ?? []
  }

  console.log("✅ COACH DASHBOARD PAGE: Rendering coach dashboard")
  return <CoachDashboard coach={profile} initialStats={initialStats} initialRecentClients={initialRecentClients} />
}
