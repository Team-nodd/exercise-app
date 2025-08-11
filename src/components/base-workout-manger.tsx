/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Dumbbell, Clock, Copy, Loader2, RefreshCw, CheckCircle, Plus, Edit } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { WorkoutWithDetails, ProgramWithDetails } from "@/types"
import { SharedCalendar } from "./ui/shared-calendar"
import { CreateWorkoutDialog } from "./coach/create-workout-dialog"
import { EditWorkoutDialog } from "@/components/coach/edit-workout-dialog"

type StatFilter = "all" | "completed" | "pending"

interface BaseWorkoutManagerProps {
  // Data
  initialWorkouts?: WorkoutWithDetails[]
  userId: string
  programId?: number

  // UI Configuration
  header: ReactNode
  showCreateButton?: boolean
  createButtonText?: string
  onCreateWorkout?: () => void

  // Filtering
  workoutFilter?: (workouts: WorkoutWithDetails[]) => WorkoutWithDetails[]

  // Callbacks
  onWorkoutUpdate?: (workouts: WorkoutWithDetails[]) => void
  onError?: (error: string) => void

  // Create Dialog
  createDialogProgram?: ProgramWithDetails | null
  onCreateDialogClose?: () => void

  // Control
  openCreateWhenProgramProvided?: boolean
}

export function BaseWorkoutManager({
  initialWorkouts = [],
  userId,
  programId,
  header,
  showCreateButton = true,
  createButtonText = "Add Workout",
  onCreateWorkout,
  workoutFilter,
  onWorkoutUpdate,
  onError,
  createDialogProgram,
  onCreateDialogClose,
  openCreateWhenProgramProvided = false,
}: BaseWorkoutManagerProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>(initialWorkouts)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ programId: number; workoutId: number } | null>(null)

  const supabase = createClient()

  // Open when parent provides program (e.g., after clicking Add in parent)
  useEffect(() => {
    if (openCreateWhenProgramProvided && createDialogProgram) {
      setCreateOpen(true)
    }
  }, [openCreateWhenProgramProvided, createDialogProgram])

  // Fetch workouts
  const fetchWorkouts = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from("workouts")
        .select(`*, program:programs(*)`)
        .eq("user_id", userId)
        .order("scheduled_date", { ascending: true, nullsFirst: false })

      if (programId) {
        query = query.eq("program_id", programId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error("Error fetching workouts:", fetchError)
        const errorMsg = "Failed to load workouts. Please try again."
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      const fetchedWorkouts = data as WorkoutWithDetails[]
      setWorkouts(fetchedWorkouts)
      onWorkoutUpdate?.(fetchedWorkouts)
    } catch (err) {
      console.error("Error fetching workouts:", err)
      const errorMsg = "An unexpected error occurred while fetching workouts."
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialWorkouts.length > 0) {
      setWorkouts(initialWorkouts)
      setLoading(false)
    } else {
      fetchWorkouts()
    }
  }, [userId, programId])

  // Apply custom filter if provided, then stat filter
  const filteredWorkouts = useMemo(() => {
    const filtered = workoutFilter ? workoutFilter(workouts) : workouts

    switch (activeStatFilter) {
      case "completed":
        return filtered.filter((w) => w.completed)
      case "pending":
        return filtered.filter((w) => !w.completed)
      default:
        return filtered
    }
  }, [workouts, workoutFilter, activeStatFilter])

  // Calculate stats (use workoutFilter if provided, but not stat filter)
  const stats = useMemo(() => {
    const baseWorkouts = workoutFilter ? workoutFilter(workouts) : workouts
    const total = baseWorkouts.length
    const completed = baseWorkouts.filter((w) => w.completed).length
    const pending = total - completed
    return { total, completed, pending }
  }, [workouts, workoutFilter])

  const duplicateWorkout = async (workoutId: number, targetDate?: Date) => {
    setDuplicatingWorkout(workoutId)
    try {
      const { data: originalWorkout, error: workoutError } = await supabase
        .from("workouts")
        .select(`*, workout_exercises(*)`)
        .eq("id", workoutId)
        .single()
  
      if (workoutError || !originalWorkout) {
        toast("Failed to fetch workout data")
        return
      }
  
      const duplicateWorkoutData = {
        program_id: originalWorkout.program_id,
        user_id: originalWorkout.user_id,
        name: `${originalWorkout.name} (Copy)`,
        workout_type: originalWorkout.workout_type,
        scheduled_date: targetDate ? targetDate.toISOString() : null,
        notes: originalWorkout.notes,
        intensity_type: originalWorkout.intensity_type,
        duration_minutes: originalWorkout.duration_minutes,
        target_tss: originalWorkout.target_tss,
        target_ftp: originalWorkout.target_ftp,
        completed: false,
        completed_at: null,
        order_in_program: workouts.length + 1,
      }
  
      const { data: newWorkout, error: createError } = await supabase
        .from("workouts")
        .insert(duplicateWorkoutData)
        .select()
        .single()
  
      if (createError || !newWorkout) {
        toast("Failed to create duplicate workout")
        return
      }
  
      if (originalWorkout.workout_type === "gym" && originalWorkout.workout_exercises?.length > 0) {
        const duplicateExercises = originalWorkout.workout_exercises.map((exercise: any) => ({
          workout_id: newWorkout.id,
          exercise_id: exercise.exercise_id,
          order_in_workout: exercise.order_in_workout,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          rest_seconds: exercise.rest_seconds,
          volume_level: exercise.volume_level,
          completed: false,
        }))
  
        const { error: exercisesError } = await supabase.from("workout_exercises").insert(duplicateExercises)
        if (exercisesError) {
          toast("Workout duplicated but failed to copy exercises")
        }
      }
  
      await fetchWorkouts()
      toast(
        `Workout duplicated successfully${targetDate ? ` and scheduled for ${targetDate.toLocaleDateString()}` : ""}!`,
      )
    } catch (error) {
      console.error("Unexpected error during workout duplication:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  const handleStatCardClick = (filter: StatFilter) => {
    setActiveStatFilter(filter)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date set"
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const handleCreateWorkout = () => {
    if (onCreateWorkout) {
      onCreateWorkout()
    } else {
      setCreateOpen(true)
    }
  }

  const handleEditWorkout = (w: WorkoutWithDetails) => {
    const pid = Number((w as any).program_id ?? (w as any).program?.id)
    if (!pid) return
    setEditTarget({ programId: pid, workoutId: w.id })
    setEditOpen(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Calendar Skeleton */}
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Data</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={fetchWorkouts} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
      {/* Custom Header */}
      {header}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
        <Card
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
            activeStatFilter === "all"
              ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-800"
              : "border-blue-200 dark:border-blue-800 hover:border-blue-300",
          )}
          onClick={() => handleStatCardClick("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</CardTitle>
            <Dumbbell className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{stats.total}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
              {programId ? "In this program" : "All workouts"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
            activeStatFilter === "completed"
              ? "border-2 border-green-500 shadow-md ring-2 ring-green-200 dark:ring-green-800"
              : "border-green-200 dark:border-green-800 hover:border-green-300",
          )}
          onClick={() => handleStatCardClick("completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-600 dark:text-green-400">Completed</CardTitle>
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-green-800 dark:text-green-200">{stats.completed}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% complete` : "No workouts"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
            activeStatFilter === "pending"
              ? "border-2 border-orange-500 shadow-md ring-2 ring-orange-200 dark:ring-orange-800"
              : "border-orange-200 dark:border-orange-800 hover:border-orange-300",
          )}
          onClick={() => handleStatCardClick("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-orange-600 dark:text-orange-400">Pending</CardTitle>
            <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-orange-800 dark:text-orange-200">{stats.pending}</div>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
              {stats.total > 0 ? `${Math.round((stats.pending / stats.total) * 100)}% remaining` : "No workouts"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {activeStatFilter !== "all" && (
        <div className="mb-4 flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium">
              Showing {filteredWorkouts.length} {activeStatFilter} workout{filteredWorkouts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleStatCardClick("all")} className="text-xs">
            Clear filter
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2 cursor-pointer">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2 cursor-pointer">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Workouts</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <SharedCalendar
            workouts={filteredWorkouts}
            onWorkoutUpdate={(updated) => {
              const map = new Map(workouts.map((w) => [w.id, w]))
              for (const w of updated) {
                const existing = map.get(w.id)
                map.set(w.id, existing ? { ...existing, ...w } : w)
              }
              const newWorkouts = Array.from(map.values())
              setWorkouts(newWorkouts)
              onWorkoutUpdate?.(newWorkouts)
            }}
            userRole="coach"
            programId={programId}
            userId={userId}
            onEditWorkout={handleEditWorkout}
            onCreateWorkout={handleCreateWorkout}
          />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Workouts
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                    Manage the workouts in this program
                  </CardDescription>
                </div>
                {showCreateButton && (
                  <Button
                    onClick={handleCreateWorkout}
                    disabled={!programId}
                    title={!programId ? "First choose a program please" : undefined}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createButtonText}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredWorkouts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Dumbbell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {activeStatFilter === "all" ? "No workouts yet" : `No ${activeStatFilter} workouts`}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
                      {activeStatFilter === "all"
                        ? "Start building this program by adding workouts."
                        : `No ${activeStatFilter} workouts found. Try changing the filter.`}
                    </p>
                    {showCreateButton && activeStatFilter === "all" && (
                      <Button
                        onClick={handleCreateWorkout}
                        className="mt-6"
                        disabled={!programId}
                        title={!programId ? "First choose a program please" : undefined}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Workout
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredWorkouts.map((workout, index) => (
                    <div
                      key={workout.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-2 sm:gap-0 hover:shadow-md transition-all duration-200 border-l-4",
                        workout.completed
                          ? "border-l-green-500 bg-green-50/30 dark:bg-green-900/5"
                          : "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
                      )}
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                            {workout.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              {workout.workout_type === "gym" ? (
                                <Dumbbell className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
                            </span>
                            {workout.scheduled_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(workout.scheduled_date)}
                              </span>
                            )}
                            {workout.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {workout.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col xs:flex-row flex-wrap gap-2 w-full sm:w-auto sm:flex-row sm:justify-end sm:items-center mt-2 sm:mt-0">
                        <Badge
                          variant={workout.completed ? "default" : "secondary"}
                          className={cn(
                            "xs:w-auto text-center",
                            workout.completed
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                          )}
                        >
                          {workout.completed ? "Completed" : "Pending"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full xs:w-auto bg-transparent"
                          onClick={() => duplicateWorkout(workout.id)}
                          disabled={duplicatingWorkout === workout.id}
                        >
                          {duplicatingWorkout === workout.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          {duplicatingWorkout === workout.id ? "Duplicating..." : "Duplicate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkout(workout)}
                          className="w-full xs:w-auto bg-transparent"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Workout Dialog */}
      {createDialogProgram && (
        <CreateWorkoutDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) {
              onCreateDialogClose?.()
            }
          }}
          program={createDialogProgram}
          onCreated={fetchWorkouts}
        />
      )}
      {editTarget && (
        <EditWorkoutDialog
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setEditTarget(null) }}
          programId={editTarget.programId}
          workoutId={editTarget.workoutId}
          onUpdated={fetchWorkouts}
        />
      )}
    </div>
  )
}
