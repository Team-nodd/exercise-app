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

export function ClientCalendar({ client, initialProgramId }: ClientCalendarProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithProgram[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>(initialProgramId ? String(initialProgramId) : "all")
  const [dialogProgram, setDialogProgram] = useState<ProgramWithDetails | null>(null)

  const supabase = createClient()

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

  const openCreateForSelected = async () => {
    if (!selectedProgramObj) return
    const { data } = await supabase
      .from("programs")
      .select(`*, coach:users!programs_coach_id_fkey(*), user:users!programs_user_id_fkey(*)`)
      .eq("id", selectedProgramObj.id)
      .single()

    if (data) {
      setDialogProgram(data as ProgramWithDetails)
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
      showCreateButton={!!selectedProgramObj}
      openCreateWhenProgramProvided={true}
    />
  )
}
