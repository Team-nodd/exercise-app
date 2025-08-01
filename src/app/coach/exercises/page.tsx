import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ExerciseLibrary } from "@/components/exercises/exercise-library"

export default async function ExerciseLibraryPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <ExerciseLibrary />
}
