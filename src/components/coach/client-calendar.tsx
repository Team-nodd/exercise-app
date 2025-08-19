"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calendar } from "lucide-react"
import type { User, WorkoutWithDetails, Program, ProgramWithDetails } from "@/types"
import { AppLink } from "../ui/app-link"
import { BaseWorkoutManager } from "../base-workout-manger"
// import { BaseWorkoutManager } from "./base-workout-manager"

interface ClientCalendarProps {
  client: User
  initialProgramId?: number
}

interface WorkoutWithProgram extends WorkoutWithDetails {
  program: Program
}

export function ClientDetails({ client, initialProgramId }: ClientCalendarProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithProgram[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>(initialProgramId ? String(initialProgramId) : "all")
  const [dialogProgram, setDialogProgram] = useState<ProgramWithDetails | null>(null)

  const supabase = createClient()

  // Listen for cross-tab/device broadcast updates
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('workouts')
      bc.onmessage = (event) => {
        const msg = event.data as any
        if (!msg || msg.type !== 'updated') return
        // If filtered by program, ensure it belongs to current selection
        if (selectedProgram !== 'all' && Number(selectedProgram) !== Number(msg.programId)) return
        setWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...msg.changes } as any : w)))
      }
    } catch {
      const handler = (e: StorageEvent) => {
        if (e.key !== 'workout-updated' || !e.newValue) return
        try {
          const msg = JSON.parse(e.newValue)
          if (!msg || msg.type !== 'updated') return
          if (selectedProgram !== 'all' && Number(selectedProgram) !== Number(msg.programId)) return
          setWorkouts((prev) => prev.map((w) => (w.id === msg.workoutId ? { ...w, ...msg.changes } as any : w)))
        } catch {}
      }
      if (typeof window !== 'undefined') window.addEventListener('storage', handler)
      return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', handler) }
    }
    return () => { try { bc && bc.close() } catch {} }
  }, [selectedProgram])

  // Fetch programs and workouts
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch programs
        const { data: programsData } = await supabase
          .from("programs")
          .select("*")
          .eq("user_id", client.id)
          .order("created_at", { ascending: false })

        setPrograms(programsData || [])

        // Fetch workouts
        const { data: workoutsData } = await supabase
          .from("workouts")
          .select(`*, program:programs(*)`)
          .eq("user_id", client.id)
          .order("scheduled_date", { ascending: true, nullsFirst: false })

        setWorkouts(workoutsData as WorkoutWithProgram[])
      } catch (err) {
        console.error("Error fetching data:", err)
      }
    }

    fetchData()
  }, [client.id, supabase])



  // Get selected program object
  const selectedProgramObj = useMemo(
    () => (selectedProgram === "all" ? null : (programs.find((p) => p.id === Number(selectedProgram)) ?? null)),
    [selectedProgram, programs],
  )

  // Filter workouts by selected program
  const workoutFilter = useMemo(() => {
    return (workouts: WorkoutWithDetails[]) => {
      return selectedProgram === "all"
        ? workouts
        : workouts.filter((workout) => (workout as WorkoutWithProgram).program?.id === Number(selectedProgram))
    }
  }, [selectedProgram])

  const formatProgramDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return "Not set"
    const month = d.toLocaleString("en-US", { month: "short" })
    const day = d.toLocaleString("en-US", { day: "2-digit" })
    const year = d.getFullYear()
    return `${month}, ${day}, ${year}`
  }

  const openCreateForSelected = async (scheduledDate?: Date) => {
    console.log('openCreateForSelected called with scheduledDate:', scheduledDate)
    if (!selectedProgramObj) {
      // Show program selection alert when no program is selected
      // This will be handled by the SharedCalendar component
      return
    }
    const { data } = await supabase
      .from("programs")
      .select(`*, coach:users!programs_coach_id_fkey(*), user:users!programs_user_id_fkey(*)`)
      .eq("id", selectedProgramObj.id)
      .single()

    if (data) {
      setDialogProgram(data as ProgramWithDetails)
      // The BaseWorkoutManager will handle opening the dialog when createDialogProgram is set
    }
  }

  const header = (
    <div className="mb-4 sm:mb-8">
      <AppLink
        href="/coach/clients"
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Clients
      </AppLink>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 items-start">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {client.name}
            <span className="mx-2">·</span>
            {selectedProgramObj ? selectedProgramObj.name : "All Programs"}
          </h1>
          {selectedProgramObj?.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
              {selectedProgramObj.description}
            </p>
          )}
          {selectedProgramObj && (
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatProgramDate(selectedProgramObj.start_date)}</span>
              </div>
              <div>→</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatProgramDate(selectedProgramObj.end_date)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-full sm:w-56 self-start">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  return (
    <BaseWorkoutManager
      initialWorkouts={workouts}
      userId={client.id}
      programId={selectedProgram === "all" ? undefined : Number(selectedProgram)}
      header={header}
      workoutFilter={workoutFilter}
      onWorkoutUpdate={setWorkouts}
      createDialogProgram={dialogProgram}
      onCreateDialogClose={() => setDialogProgram(null)}
      onCreateWorkout={openCreateForSelected}
      showCreateButton={true}
      openCreateWhenProgramProvided={true}
    />
  )
}
