import LandingPage from "@/components/landing/landing-page"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function Home() {
  const cookieStore = await cookies()
  const hasToken = cookieStore.get("sb-access-token")

  if (!hasToken) {
    return <LandingPage />
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
    if (profile?.role === "coach") redirect("/coach/dashboard")
    redirect("/dashboard")
  }

  return <LandingPage />
}
