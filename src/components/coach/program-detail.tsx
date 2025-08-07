/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Calendar, User, Plus, Dumbbell, Clock, ArrowLeft, Copy, Loader2, RefreshCw } from 'lucide-react'
import { toast } from "sonner"
import Link from "next/link"
import type { ProgramWithDetails, WorkoutWithDetails } from "@/types"
import { cn } from "@/lib/utils"
import { SharedCalendar } from "../ui/shared-calendar"


interface ProgramDetailProps {
  program: ProgramWithDetails
}

export function ProgramDetail({ program }: ProgramDetailProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [duplicatingWorkout, setDuplicatingWorkout] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(program.name)
  const [titleSaving, setTitleSaving] = useState(false)

  const supabase = createClient()

  const fetchWorkouts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("workouts")
        .select(`
          *,
          program:programs(*)
        `)
        .eq("program_id", program.id)
        .order("scheduled_date", { ascending: true, nullsFirst: false })

      if (fetchError) {
        console.error("Error fetching workouts:", fetchError)
        setError("Failed to load workouts. Please try again.")
        return
      }

      setWorkouts(data as WorkoutWithDetails[])
    } catch (err) {
      console.error("Error fetching workouts:", err)
      setError("An unexpected error occurred while fetching workouts.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [program.id, supabase])

  const duplicateWorkout = async (workoutId: number, targetDate?: Date) => {
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
          completed: false,
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
      await fetchWorkouts()
      toast(`Workout duplicated successfully${targetDate ? ` and scheduled for ${targetDate.toLocaleDateString()}` : ''}!`)
      console.log("✅ Workout duplication completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error during workout duplication:", error)
      toast("An unexpected error occurred")
    } finally {
      setDuplicatingWorkout(null)
    }
  }

  // Inline edit save handler
  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== program.name) {
      setTitleSaving(true)
      const { error } = await supabase.from("programs").update({ name: titleValue.trim() }).eq("id", program.id)
      setTitleSaving(false)
      if (!error) {
        program.name = titleValue.trim()
        toast("Program title updated")
        setEditingTitle(false)
      } else {
        toast("Failed to update title")
      }
    } else {
      setEditingTitle(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No date set"
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const handleWorkoutUpdate = (updatedWorkouts: WorkoutWithDetails[]) => {
    setWorkouts(updatedWorkouts)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>
          {/* Program Info Skeleton */}
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    <div className="space-y-1 flex-1">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Program</h3>
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/coach/programs"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Programs
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTitleSave()
                  } else if (e.key === "Escape") {
                    setEditingTitle(false)
                    setTitleValue(program.name)
                  }
                }}
                disabled={titleSaving}
                autoFocus
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 px-2 py-1"
              />
            ) : (
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:underline"
                onClick={() => setEditingTitle(true)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(true)
                }}
              >
                {titleValue}
              </h1>
            )}
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">{program.description}</p>
          </div>
          <div className="flex gap-3">
            <Badge className={getStatusColor(program.status)}>
              {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
            </Badge>
            <Button size="sm" href={`/coach/programs/${program.id}/edit`}>
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Program Info */}
      <Card className="mb-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl font-semibold text-blue-800 dark:text-blue-200">
            Program Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Client</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">{program.user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Start Date</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {program.start_date ? new Date(program.start_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">End Date</p>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {program.end_date ? new Date(program.end_date).toLocaleDateString() : "Not set"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar View</span>
            <span className="sm:hidden">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Workouts</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <SharedCalendar
            workouts={workouts}
            onWorkoutUpdate={handleWorkoutUpdate}
            userRole="coach"
            programId={program.id}
            userId={program.user.id}
          />
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4">
          {/* Workouts Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Workouts</CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                    Manage the workouts in this program
                  </CardDescription>
                </div>
                <Button href={`/coach/programs/${program.id}/workouts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workouts.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <Dumbbell className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No workouts yet</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
                      Start building this program by adding workouts.
                    </p>
                    <Button href={`/coach/programs/${program.id}/workouts/new`} className="mt-6">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Workout
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {workouts.map((workout, index) => (
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
                          href={`/coach/programs/${program.id}/workouts/${workout.id}`}
                          className="w-full xs:w-auto bg-transparent"
                        >
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
    </div>
  )
}
