import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { EditProgramForm } from "@/components/coach/edit-program-form"

interface EditProgramPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditProgramPage({ params }: EditProgramPageProps) {
  const supabase = await createServerClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify coach role and program ownership
  const { data: program } = await supabase
    .from("programs")
    .select(`
      *,
      coach:users!programs_coach_id_fkey(*),
      user:users!programs_user_id_fkey(*)
    `)
    .eq("id", id)
    .eq("coach_id", user.id)
    .single()

  if (!program) {
    notFound()
  }

  return <EditProgramForm program={program} />
}
