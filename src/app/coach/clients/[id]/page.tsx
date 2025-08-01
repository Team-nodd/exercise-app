import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { ClientCalendar } from "@/components/coach/client-calendar"

interface ClientPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ClientPage({ params }: ClientPageProps) {
  const supabase = await createServerClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verify coach role
  const { data: coach } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!coach || coach.role !== "coach") {
    redirect("/dashboard")
  }

  // Get client details
  const { data: client } = await supabase.from("users").select("*").eq("id", id).single()

  if (!client) {
    notFound()
  }

  // Verify coach has programs with this client
  const { data: programs } = await supabase
    .from("programs")
    .select("id")
    .eq("coach_id", user.id)
    .eq("user_id", id)
    .limit(1)

  if (!programs || programs.length === 0) {
    notFound()
  }

  return <ClientCalendar client={client} coachId={user.id} />
}
