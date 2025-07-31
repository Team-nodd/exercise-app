import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing/landing-page"

export default async function Home() {
  const supabase = await getSupabaseServerClient()

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

  return <LandingPage />
}
