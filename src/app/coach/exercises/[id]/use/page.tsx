import { Suspense } from "react"
import { UseExerciseForm } from "@/components/coach/use-exercise-form"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function UseExercisePage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get the user profile to check if they're a coach
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "coach") {
    redirect("/dashboard")
  }

  // Get the exercise details
  const { data: exercise } = await supabase.from("exercises").select("*").eq("id", params.id).single()

  if (!exercise) {
    redirect("/coach/exercises")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Use Exercise in Program</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Select a program and workout to add this exercise to</p>
        </div>

        <Suspense fallback={<div>Loading programs...</div>}>
          <UseExerciseForm
            coachId={user.id}
            exercise={exercise}
          />
        </Suspense>
      </div>
    </div>
  )
}
