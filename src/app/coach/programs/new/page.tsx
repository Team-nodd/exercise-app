import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CreateProgramForm } from "@/components/coach/create-program-form"

export default async function NewProgramPage() {
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

  return <CreateProgramForm coachId={user.id} />
}
