"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Dumbbell, Clock, ArrowLeft, Edit, Trash2, Plus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { User, WorkoutWithDetails, ProgramWithDetails } from "@/types"

interface ClientCalendarProps {
  client: User
  coachId: string
}

export function ClientCalendar({ client, coachId }: ClientCalendarProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const supabase = createClient()
  // const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch programs for this client by this coach
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("*")
          .eq("coach_id", coachId)
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

        // Filter by program if selected
        if (selectedProgram !== "all") {
          workoutsQuery = workoutsQuery.eq("program_id", selectedProgram)
        }

        const { data: workoutsData, error: workoutsError } = await workoutsQuery.order("scheduled_date", {
          ascending: true,
        })

        if (workoutsError) {
          console.error("Error fetching workouts:", workoutsError)
          return
        }

        setWorkouts(workoutsData as WorkoutWithDetails[])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [coachId, client.id, selectedProgram, supabase])

  const handleDeleteWorkout = async (workoutId: number) => {
    if (!confirm("Are you sure you want to delete this workout?")) {
      return
    }

    try {
      const { error } = await supabase.from("workouts").delete().eq("id", workoutId)

      if (error) {
        console.error("Error deleting workout:", error)
        toast(
           "Failed to delete workout",
        
        )
        return
      }

      // Remove from local state
      setWorkouts(workouts.filter((w) => w.id !== workoutId))

      toast( "Workout deleted successfully")
    } catch (error) {
      console.error("Error deleting workout:", error)
      toast( "An unexpected error occurred")
    }
  }

  // Group workouts by date
  const groupedWorkouts = workouts.reduce(
    (groups, workout) => {
      const date = workout.scheduled_date || "unscheduled"
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(workout)
      return groups
    },
    {} as Record<string, WorkoutWithDetails[]>,
  )

  // Sort dates
  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => {
    if (a === "unscheduled") return 1
    if (b === "unscheduled") return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">Loading calendar...</div>
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
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage workouts and schedule</p>
          </div>
          <div className="flex items-center gap-4">
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
            {programs.length > 0 && (
              <Button asChild>
                <Link href={`/coach/programs/${programs[0].id}/workouts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workout
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Client Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{programs.length}</div>
            <p className="text-sm text-muted-foreground">Total Programs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{workouts.length}</div>
            <p className="text-sm text-muted-foreground">Total Workouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{workouts.filter((w) => w.completed).length}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{workouts.filter((w) => !w.completed).length}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Calendar</CardTitle>
          <CardDescription>All scheduled and unscheduled workouts</CardDescription>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts found</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {selectedProgram === "all"
                  ? "This client doesn't have any workouts yet."
                  : "No workouts found for the selected program."}
              </p>
              {programs.length > 0 && (
                <Button asChild>
                  <Link href={`/coach/programs/${programs[0].id}/workouts/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Workout
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {date === "unscheduled"
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
                      <div key={workout.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                                <span>{workout.program?.name}</span>
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
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/coach/programs/${workout.program_id}/workouts/${workout.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWorkout(workout.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
