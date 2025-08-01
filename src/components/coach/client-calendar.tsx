/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Dumbbell, Clock, ArrowLeft, Copy, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { User, WorkoutWithDetails, Program } from "@/types"

interface ClientCalendarProps {
  client: User
}

interface WorkoutWithProgram extends WorkoutWithDetails {
  program: Program
}

export function ClientCalendar({ client }: ClientCalendarProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithProgram[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const supabase = createClient()
  // const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch programs for this client
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("*")
          .eq("user_id", client.id)
          .order("created_at", { ascending: false })

        if (programsError) {
          console.error("Error fetching programs:", programsError)
          return
        }

        setPrograms(programsData || [])

        // Fetch workouts for this client
        let workoutsQuery = supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("user_id", client.id)
          .order("scheduled_date", { ascending: true, nullsFirst: false })

        if (selectedProgram !== "all") {
          workoutsQuery = workoutsQuery.eq("program_id", selectedProgram)
        }

        const { data: workoutsData, error: workoutsError } = await workoutsQuery

        if (workoutsError) {
          console.error("Error fetching workouts:", workoutsError)
          return
        }

        setWorkouts(workoutsData as WorkoutWithProgram[])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [client.id, selectedProgram, supabase])

  const duplicateWorkout = async (workoutId: number) => {
    setDuplicatingWorkout(workoutId)

    try {
      console.log("🔄 Starting workout duplication for workout:", workoutId)

      // Get the original workout with its exercises
      const { data: originalWorkout, error: workoutError } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_exercises(*)
        `)
        .eq("id", workoutId)
        .single()

      if (workoutError) {
        console.error("❌ Error fetching original workout:", workoutError)
        toast("Failed to fetch workout data")
        return
      }

      console.log("✅ Original workout fetched:", originalWorkout)

      // Create the duplicate workout
      const duplicateWorkoutData = {
        program_id: originalWorkout.program_id,
        user_id: originalWorkout.user_id,
        name: `${originalWorkout.name} (Copy)`,
        workout_type: originalWorkout.workout_type,
        scheduled_date: null, // Don't copy the scheduled date
        notes: originalWorkout.notes,
        intensity_type: originalWorkout.intensity_type,
        duration_minutes: originalWorkout.duration_minutes,
        target_tss: originalWorkout.target_tss,
        target_ftp: originalWorkout.target_ftp,
        completed: false, // New workout should not be completed
        completed_at: null,
        order_in_program: workouts.length + 1, // Add to the end
      }

      const { data: newWorkout, error: createError } = await supabase
        .from("workouts")
        .insert(duplicateWorkoutData)
        .select()
        .single()

      if (createError) {
        console.error("❌ Error creating duplicate workout:", createError)
        toast( "Failed to create duplicate workout")
        return
      }

      console.log("✅ Duplicate workout created:", newWorkout)

      // If it's a gym workout, duplicate the exercises
      if (originalWorkout.workout_type === "gym" && originalWorkout.workout_exercises?.length > 0) {
        console.log("🔄 Duplicating workout exercises...")

        const duplicateExercises = originalWorkout.workout_exercises.map((exercise: any) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.exercise_id,
          order_in_workout: exercise.order_in_workout,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_seconds: exercise.rest_seconds,
          volume_level: exercise.volume_level,
          completed: false, // New exercises should not be completed
          completed_at: null,
        }))

        const { error: exercisesError } = await supabase.from("workout_exercises").insert(duplicateExercises)

        if (exercisesError) {
          console.error("❌ Error duplicating workout exercises:", exercisesError)
          toast("Workout duplicated but failed to copy exercises")
        } else {
          console.log("✅ Workout exercises duplicated successfully")
        }
      }

      // Refresh the workouts list
      let workoutsQuery = supabase
        .from("workouts")
        .select(`
          *,
          program:programs(*)
        `)
        .eq("user_id", client.id)
        .order("scheduled_date", { ascending: true, nullsFirst: false })

      if (selectedProgram !== "all") {
        workoutsQuery = workoutsQuery.eq("program_id", selectedProgram)
      }

      const { data: updatedWorkouts, error: refreshError } = await workoutsQuery

      if (!refreshError) {
        setWorkouts(updatedWorkouts as WorkoutWithProgram[])
      }

      toast( "Workout duplicated successfully!")

      console.log("✅ Workout duplication completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error during workout duplication:", error)
      toast( "An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  // Group workouts by date
  const groupedWorkouts = workouts.reduce(
    (groups, workout) => {
      const date = workout.scheduled_date ? new Date(workout.scheduled_date).toDateString() : "Unscheduled"

      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(workout)
      return groups
    },
    {} as Record<string, WorkoutWithProgram[]>,
  )

  // Sort dates (unscheduled last)
  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => {
    if (a === "Unscheduled") return 1
    if (b === "Unscheduled") return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  const totalWorkouts = workouts.length
  const completedWorkouts = workouts.filter((w) => w.completed).length
  const pendingWorkouts = totalWorkouts - completedWorkouts

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading calendar...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href="/coach/clients" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{client.name}s Calendar</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">View and manage all workouts for this client</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingWorkouts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workout Calendar</CardTitle>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id.toString()}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts found</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {selectedProgram === "all"
                  ? "This client doesn't have any workouts yet."
                  : "No workouts found for the selected program."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    {date === "Unscheduled"
                      ? "Unscheduled Workouts"
                      : new Date(date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                  </h3>
                  <div className="space-y-3">
                    {groupedWorkouts[date].map((workout) => (
                      <div
                        key={workout.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {workout.workout_type === "gym" ? (
                              <Dumbbell className="h-5 w-5 text-primary" />
                            ) : (
                              <Clock className="h-5 w-5 text-primary" />
                            )}
                            <div>
                              <h4 className="font-semibold">{workout.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{workout.program.name}</span>
                                <span>{workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}</span>
                                {workout.duration_minutes && <span>{workout.duration_minutes} min</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={workout.completed ? "default" : "secondary"}>
                            {workout.completed ? "Completed" : "Pending"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateWorkout(workout.id)}
                            disabled={duplicatingWorkout === workout.id}
                          >
                            {duplicatingWorkout === workout.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4 mr-1" />
                            )}
                            {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/coach/programs/${workout.program_id}/workouts/${workout.id}`}>Edit</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
