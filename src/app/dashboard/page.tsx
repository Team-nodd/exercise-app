/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserDashboard } from "@/components/dashboard/user-dashboard"

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
  if (!profile) redirect("/auth/login")
  if (profile.role === "coach") redirect("/coach/dashboard")

  // Prefetch workouts once, compute stats here
  const { data: all } = await supabase
    .from("workouts")
    .select(`
      id, name, completed, scheduled_date, workout_type, duration_minutes, notes,
      program:programs(id, name, status, user_id)
    `)
    .eq("program.user_id", user.id)
    .order("scheduled_date", { ascending: true, nullsFirst: false })

  const workouts = (all ?? []) as any[]
  const programMap = new Map<number, { id: number; status?: string }>()
  for (const w of workouts) if (w.program) programMap.set(w.program.id, w.program)
  const totalPrograms = programMap.size
  const activePrograms = [...programMap.values()].filter(p => p.status === "active").length
  const completedWorkouts = workouts.filter(w => w.completed).length
  const today = new Date(); today.setHours(0,0,0,0)
  const upcomingWorkouts = workouts.filter(w => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= today).length
  const initialStats = { totalPrograms, activePrograms, completedWorkouts, upcomingWorkouts, totalClients: 0 }

  return <UserDashboard user={profile} initialStats={initialStats} initialWorkouts={workouts} />
}
