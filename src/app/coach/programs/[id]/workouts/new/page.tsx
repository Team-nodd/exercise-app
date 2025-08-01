import { CreateWorkoutForm } from "@/components/coach/create-workout-form"
import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
// import { CreateWorkoutForm } from "@/components/coach/create-workout-form"

interface NewWorkoutPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function NewWorkoutPage({ params }: NewWorkoutPageProps) {
  const supabase = await createServerClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify program exists and coach owns it
  const { data: program } = await supabase
    .from("programs")
    .select(`
      *,
      user:users!programs_user_id_fkey(*)
    `)
    .eq("id", id)
    .eq("coach_id", user.id)
    .single()

  if (!program) {
    notFound()
  }

  return <CreateWorkoutForm program={program} />
}
