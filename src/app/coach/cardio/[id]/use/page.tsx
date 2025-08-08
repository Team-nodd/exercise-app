import { Suspense } from "react"
import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { UseCardioForm } from "@/components/coach/use-cardio-form"

interface UseCardioPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function UseCardioPage({ params }: UseCardioPageProps) {
  const supabase = await createServerClient()
  const { id } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Ensure coach
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile || profile.role !== "coach") {
    redirect("/dashboard")
  }

  // Fetch cardio template
  const { data: cardio } = await supabase.from("cardio_exercises").select("*").eq("id", id).single()
  if (!cardio) {
    notFound()
  }

  return (
    <Suspense fallback={<div>Loading cardio type...</div>}>
      <UseCardioForm cardio={cardio} coachId={user.id} />
    </Suspense>
  )
}

