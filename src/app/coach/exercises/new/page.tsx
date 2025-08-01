import { createServerClient } from "@/lib/supabase/server"
import { CreateExerciseForm } from "@/components/coach/create-exercise-form"
import { redirect } from "next/navigation"

export default async function CreateExercisePage() {
  const supabase = await createServerClient()

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: user } = await supabase.from("users").select("*").eq("id", session.user.id).single()

  if (!user || user.role !== "coach") {
    redirect("/dashboard")
  }

  return <CreateExerciseForm />
}
