import { ClientList } from "@/components/coach/client-list"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
// import { ClientList } from "@/components/coach/client-list"

export default async function ClientsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify coach role
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "coach") {
    redirect("/dashboard")
  }

  return <ClientList coachId={user.id} />
}
