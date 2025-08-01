import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"

export default async function Home() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Get user role and redirect accordingly
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

      if (profile?.role === "coach") {
        redirect("/coach/dashboard")
      } else {
        redirect("/dashboard")
      }
    }
  } catch (error) {
    console.error("Error checking auth:", error)
    // Continue to show landing page if there's an error
  }

  return <LandingPage />
}
