import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserDashboard } from "@/components/dashboard/user-dashboard"

export default async function DashboardPage() {
  console.log("=== DASHBOARD PAGE DEBUG ===")

  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("User in dashboard page:", user?.id)

  if (!user) {
    console.log("No user in dashboard page, redirecting to login")
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile, error } = await supabase.from("users").select("*").eq("id", user.id).single()

  console.log("Profile in dashboard page:", { profile, error })

  if (!profile) {
    console.log("No profile found, redirecting to login")
    redirect("/auth/login")
  }

  if (profile.role === "coach") {
    console.log("Coach user, redirecting to coach dashboard")
    redirect("/coach/dashboard")
  }

  console.log("=== DASHBOARD PAGE END ===")
  return <UserDashboard user={profile} />
}
