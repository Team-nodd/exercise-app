import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ProgramDetail } from "@/components/coach/program-detail"

interface ProgramPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProgramPage({ params }: ProgramPageProps) {
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

  return <ProgramDetail program={program} />
}
