/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Calendar,
  Dumbbell,
  Clock,
  ArrowLeft,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  ChevronDown,
  Edit,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
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
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithProgram | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<WorkoutWithProgram | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set())

  const supabase = createClient()

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
        toast("Failed to create duplicate workout")
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
      await refreshWorkouts()

      toast("Workout duplicated successfully!")
      console.log("✅ Workout duplication completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error during workout duplication:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  const refreshWorkouts = async () => {
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
  }

  const saveWorkout = async () => {
    if (!editingWorkout) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("workouts")
        .update({
          name: editingWorkout.name,
          scheduled_date: editingWorkout.scheduled_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWorkout.id)

      if (error) {
        console.error("Error updating workout:", error)
        toast("Failed to update workout")
        return
      }

      // Update the local state
      setWorkouts((prev) => prev.map((w) => (w.id === editingWorkout.id ? { ...w, ...editingWorkout } : w)))

      setSelectedWorkout(editingWorkout)
      setEditingWorkout(null)
      toast("Workout updated successfully!")
    } catch (error) {
      console.error("Error saving workout:", error)
      toast("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getWorkoutsForDate = (date: Date) => {
    return workouts.filter((workout) => {
      if (!workout.scheduled_date) return false
      const workoutDate = new Date(workout.scheduled_date)
      return workoutDate.toDateString() === date.toDateString()
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }

  const toggleWorkoutExpansion = (workoutId: number) => {
    setExpandedWorkouts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId)
      } else {
        newSet.add(workoutId)
      }
      return newSet
    })
  }

  const handleDayClick = (date: Date, dayWorkouts: WorkoutWithProgram[]) => {
    if (dayWorkouts.length === 1) {
      setSelectedWorkout(dayWorkouts[0])
    } else if (dayWorkouts.length > 1) {
      setSelectedDate(date)
    }
  }

  const totalWorkouts = workouts.length
  const completedWorkouts = workouts.filter((w) => w.completed).length
  const pendingWorkouts = totalWorkouts - completedWorkouts
  const unscheduledWorkouts = workouts.filter((w) => !w.scheduled_date)

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading calendar...</div>
        </div>
      </div>
    )
  }

  const calendarDays = getCalendarDays()
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate) : []

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8">
        <Link href="/coach/clients" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{client.name}s Calendar</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
              View and manage all workouts for this client
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <Dumbbell className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{totalWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{completedWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{pendingWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Unscheduled</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">{unscheduledWorkouts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <h2 className="text-lg sm:text-2xl font-bold">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full sm:w-48">
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
        <CardContent className="p-2 sm:p-6">
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-4">
            {weekDays.map((day) => (
              <div key={day} className="p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm text-muted-foreground">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={index} className="h-16 sm:h-24 p-1"></div>
              }

              const dayWorkouts = getWorkoutsForDate(date)
              const isToday = date.toDateString() === new Date().toDateString()

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "h-16 sm:h-24 p-1 border border-border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                    isToday && "bg-primary/5 border-primary/20",
                    dayWorkouts.length > 0 && "hover:bg-primary/5",
                  )}
                  onClick={() => handleDayClick(date, dayWorkouts)}
                >
                  <div
                    className={cn(
                      "text-xs sm:text-sm font-medium mb-1",
                      isToday ? "text-primary font-bold" : "text-foreground",
                    )}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayWorkouts.slice(0, 2).map((workout) => (
                      <div
                        key={workout.id}
                        className="text-xs p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate"
                      >
                        <div className="flex items-center gap-1">
                          {workout.workout_type === "gym" ? (
                            <Dumbbell className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                          ) : (
                            <Clock className="h-2 w-2 sm:h-3 sm:w-3 flex-shrink-0" />
                          )}
                          <span className="truncate text-xs">{workout.name}</span>
                        </div>
                      </div>
                    ))}
                    {dayWorkouts.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayWorkouts.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unscheduled Workouts */}
      {unscheduledWorkouts.length > 0 && (
        <Card className="mt-4 sm:mt-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Unscheduled Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unscheduledWorkouts.map((workout) => (
                <Collapsible key={workout.id}>
                  <div className="border rounded-lg bg-background">
                    <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {workout.workout_type === "gym" ? (
                            <Dumbbell className="h-4 w-4 text-primary" />
                          ) : (
                            <Clock className="h-4 w-4 text-primary" />
                          )}
                          <div className="text-left">
                            <h4 className="font-semibold text-sm sm:text-base">{workout.name}</h4>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span>{workout.program.name}</span>
                              <Badge variant={workout.completed ? "default" : "secondary"} className="text-xs">
                                {workout.completed ? "Completed" : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Type:</span>
                            <span className="ml-2 capitalize">{workout.workout_type}</span>
                          </div>
                          {workout.duration_minutes && (
                            <div>
                              <span className="font-medium text-muted-foreground">Duration:</span>
                              <span className="ml-2">{workout.duration_minutes} min</span>
                            </div>
                          )}
                          {workout.intensity_type && (
                            <div>
                              <span className="font-medium text-muted-foreground">Intensity:</span>
                              <span className="ml-2 capitalize">{workout.intensity_type}</span>
                            </div>
                          )}
                          {workout.notes && (
                            <div className="sm:col-span-2">
                              <span className="font-medium text-muted-foreground">Notes:</span>
                              <p className="mt-1 text-sm">{workout.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" onClick={() => setSelectedWorkout(workout)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateWorkout(workout.id)}
                            disabled={duplicatingWorkout === workout.id}
                          >
                            {duplicatingWorkout === workout.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate?.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDateWorkouts.map((workout) => (
              <Collapsible key={workout.id}>
                <div className="border rounded-lg bg-background">
                  <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {workout.workout_type === "gym" ? (
                          <Dumbbell className="h-4 w-4 text-primary" />
                        ) : (
                          <Clock className="h-4 w-4 text-primary" />
                        )}
                        <div className="text-left">
                          <h4 className="font-semibold">{workout.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{workout.program.name}</span>
                            <Badge variant={workout.completed ? "default" : "secondary"} className="text-xs">
                              {workout.completed ? "Completed" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 border-t bg-muted/20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Type:</span>
                          <span className="ml-2 capitalize">{workout.workout_type}</span>
                        </div>
                        {workout.duration_minutes && (
                          <div>
                            <span className="font-medium text-muted-foreground">Duration:</span>
                            <span className="ml-2">{workout.duration_minutes} min</span>
                          </div>
                        )}
                        {workout.intensity_type && (
                          <div>
                            <span className="font-medium text-muted-foreground">Intensity:</span>
                            <span className="ml-2 capitalize">{workout.intensity_type}</span>
                          </div>
                        )}
                        {workout.notes && (
                          <div className="sm:col-span-2">
                            <span className="font-medium text-muted-foreground">Notes:</span>
                            <p className="mt-1 text-sm">{workout.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDate(null)
                            setSelectedWorkout(workout)
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateWorkout(workout.id)}
                          disabled={duplicatingWorkout === workout.id}
                        >
                          {duplicatingWorkout === workout.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/coach/programs/${workout.program_id}/workouts/${workout.id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Full Edit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Workout Edit Dialog */}
      <Dialog
        open={!!selectedWorkout}
        onOpenChange={() => {
          setSelectedWorkout(null)
          setEditingWorkout(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWorkout?.workout_type === "gym" ? (
                <Dumbbell className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              {editingWorkout ? "Edit Workout" : selectedWorkout?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedWorkout && (
            <div className="space-y-4">
              {editingWorkout ? (
                // Edit mode - simplified
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workout-name">Workout Name</Label>
                    <Input
                      id="workout-name"
                      value={editingWorkout.name}
                      onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="scheduled-date">Scheduled Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={formatDateForInput(editingWorkout.scheduled_date)}
                      onChange={(e) =>
                        setEditingWorkout({
                          ...editingWorkout,
                          scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveWorkout} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingWorkout(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Program</label>
                      <p className="text-sm">{selectedWorkout.program.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div>
                        <Badge variant={selectedWorkout.completed ? "default" : "secondary"}>
                          {selectedWorkout.completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scheduled Date</label>
                      <p className="text-sm">
                        {selectedWorkout.scheduled_date
                          ? new Date(selectedWorkout.scheduled_date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button variant="outline" onClick={() => setEditingWorkout({ ...selectedWorkout })}>
                      <Edit className="h-4 w-4 mr-2" />
                      Quick Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => duplicateWorkout(selectedWorkout.id)}
                      disabled={duplicatingWorkout === selectedWorkout.id}
                    >
                      {duplicatingWorkout === selectedWorkout.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {duplicatingWorkout === selectedWorkout.id ? "Duplicating..." : "Duplicate"}
                    </Button>
                    <Button asChild>
                      <Link href={`/coach/programs/${selectedWorkout.program_id}/workouts/${selectedWorkout.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Full Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
