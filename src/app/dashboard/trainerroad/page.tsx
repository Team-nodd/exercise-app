import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TrainerRoadDashboard } from "@/components/trainerroad/dashboard"

export default async function TrainerRoadPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  // Only allow users (not coaches) to access TrainerRoad
  if (profile?.role !== "user") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            TrainerRoad Integration
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Connect your TrainerRoad account to sync your training activities
          </p>
        </div>
        
        <TrainerRoadDashboard />
      </div>
    </div>
  )
}
