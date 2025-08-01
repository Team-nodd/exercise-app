import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CoachPrograms } from "@/components/coach/coach-programs"

export default async function CoachProgramsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <CoachPrograms coachId={user.id} />
}
