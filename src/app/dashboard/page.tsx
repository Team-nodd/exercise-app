import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserDashboard } from "@/components/dashboard/user-dashboard"

export default async function DashboardPage() {
  console.log("🔄 DASHBOARD PAGE: Loading...")

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("👤 DASHBOARD PAGE: User:", user?.id || "No user")

  if (!user) {
    console.log("🚫 DASHBOARD PAGE: No user, redirecting to login")
    redirect("/auth/login")
  }

  // Get user profile
  console.log("🔄 DASHBOARD PAGE: Fetching profile...")
  const { data: profile, error } = await supabase.from("users").select("*").eq("id", user.id).single()

  console.log("👤 DASHBOARD PAGE: Profile:", profile?.name || "No profile", "Error:", error?.message || "None")

  if (!profile) {
    console.log("🚫 DASHBOARD PAGE: No profile, redirecting to login")
    redirect("/auth/login")
  }

  if (profile.role === "coach") {
    console.log("🔄 DASHBOARD PAGE: Coach user, redirecting to coach dashboard")
    redirect("/coach/dashboard")
  }

  console.log("✅ DASHBOARD PAGE: Rendering user dashboard")
  return <UserDashboard user={profile} />
}
