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

  console.log("✅ COACH DASHBOARD PAGE: Rendering coach dashboard")
  return <CoachDashboard coach={profile} />
}
